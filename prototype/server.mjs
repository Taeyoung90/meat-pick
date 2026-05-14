import { createReadStream, existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = normalize(join(root, ".."));
const port = Number(process.env.PORT || 4173);
const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const maxImagesPerAnalysis = Number(process.env.MAX_IMAGES_PER_ANALYSIS || 3);
const maxDailyLiveCalls = Number(process.env.MAX_DAILY_LIVE_CALLS || 10);
const maxRequestBytes = Number(process.env.MAX_ANALYZE_BODY_BYTES || 4_500_000);
const usageStatePath = join(root, "usage-state.json");
const serverLogPath = join(root, "server.log");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/status") {
    await handleStatus(response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/analyze") {
    await handleAnalyze(request, response);
    return;
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = normalize(join(root, pathname));

  if (!target.startsWith(root) || !existsSync(target)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes[extname(target)] || "application/octet-stream",
  });
  createReadStream(target).pipe(response);
}).listen(port, "127.0.0.1", () => {
  logStage("server:start", { url: `http://127.0.0.1:${port}/`, model: openaiModel });
});

async function handleStatus(response) {
  const usage = await readUsageState();
  writeJson(response, 200, {
    mode: "live",
    model: openaiModel,
    maxImagesPerAnalysis,
    maxDailyLiveCalls,
    dailyCalls: usage.dailyCalls,
    apiKeyConfigured: Boolean(await readOpenAiKey()),
  });
}

async function handleAnalyze(request, response) {
  const requestId = createRequestId();
  try {
    logStage("analyze:request-received", { requestId });
    const bodyText = await readRequestBody(request, maxRequestBytes);
    const payload = JSON.parse(bodyText);
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    const preference = String(payload.preference || "balanced");
    logStage("analyze:payload-parsed", {
      requestId,
      preference,
      candidateCount: candidates.length,
      bodyBytes: Buffer.byteLength(bodyText),
    });

    if (candidates.length < 2) {
      logStage("analyze:rejected", { requestId, reason: "MINIMUM_TWO_IMAGES_REQUIRED" });
      writeJson(response, 400, { error: "MINIMUM_TWO_IMAGES_REQUIRED" });
      return;
    }

    if (candidates.length > maxImagesPerAnalysis) {
      logStage("analyze:rejected", { requestId, reason: "TOO_MANY_IMAGES", maxImagesPerAnalysis });
      writeJson(response, 400, {
        error: "TOO_MANY_IMAGES",
        message: `Live analysis allows up to ${maxImagesPerAnalysis} images per request.`,
      });
      return;
    }

    if (candidates.some((candidate) => !isValidImageDataUrl(candidate.imageDataUrl))) {
      logStage("analyze:rejected", { requestId, reason: "INVALID_IMAGE_DATA" });
      writeJson(response, 400, { error: "INVALID_IMAGE_DATA" });
      return;
    }

    const normalizedCandidates = candidates.map(normalizeCandidatePayload);
    logStage("analyze:candidates-normalized", {
      requestId,
      candidates: normalizedCandidates.map(safeCandidateLog),
    });

    const usage = await readUsageState();
    if (usage.dailyCalls >= maxDailyLiveCalls) {
      logStage("analyze:rejected", {
        requestId,
        reason: "DAILY_LIMIT_REACHED",
        dailyCalls: usage.dailyCalls,
        maxDailyLiveCalls,
      });
      writeJson(response, 429, {
        error: "DAILY_LIMIT_REACHED",
        message: `Daily live analysis limit reached: ${maxDailyLiveCalls}`,
      });
      return;
    }

    const apiKey = await readOpenAiKey();
    if (!apiKey) {
      logStage("analyze:rejected", { requestId, reason: "OPENAI_API_KEY_MISSING" });
      writeJson(response, 500, { error: "OPENAI_API_KEY_MISSING" });
      return;
    }

    logStage("openai:request-start", {
      requestId,
      model: openaiModel,
      candidateCount: normalizedCandidates.length,
      dailyCallsBefore: usage.dailyCalls,
    });
    const result = await callOpenAi({ apiKey, preference, candidates: normalizedCandidates, requestId });
    await writeUsageState({
      ...usage,
      dailyCalls: usage.dailyCalls + 1,
      totalCalls: usage.totalCalls + 1,
      lastCallAt: new Date().toISOString(),
      lastModel: openaiModel,
      lastImageCount: candidates.length,
    });
    logStage("analyze:response-ready", {
      requestId,
      tasteRecommendationId: result.tasteRecommendationId,
      valueRecommendationId: result.valueRecommendationId,
      confidence: result.confidence,
      dailyCallsAfter: usage.dailyCalls + 1,
    });

    writeJson(response, 200, {
      ...result,
      source: "openai",
      model: openaiModel,
      limits: {
        dailyCalls: usage.dailyCalls + 1,
        maxDailyLiveCalls,
        maxImagesPerAnalysis,
      },
    });
  } catch (error) {
    const status = error.code === "REQUEST_TOO_LARGE" ? 413 : 500;
    logStage("analyze:error", {
      requestId,
      code: error.code || "ANALYSIS_FAILED",
      message: error.message || "Analysis failed.",
    });
    writeJson(response, status, {
      error: error.code || "ANALYSIS_FAILED",
      message: error.message || "Analysis failed.",
    });
  }
}

async function callOpenAi({ apiKey, preference, candidates, requestId }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: openaiModel,
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a Korean beef shopping assistant for a prototype app. Compare only visible photo cues. Do not claim food safety, freshness guarantee, official grade, or that meat is definitely safe. Return strict JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildAnalysisPrompt(preference, candidates),
              },
              ...candidates.flatMap((candidate, index) => [
                {
                  type: "text",
                  text: `${index + 1}번 후보 (${candidate.id})`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: candidate.imageDataUrl,
                    detail: "low",
                  },
                },
              ]),
            ],
          },
        ],
      }),
    });

    const body = await response.json();
    logStage("openai:response-received", {
      requestId,
      status: response.status,
      usage: body?.usage
        ? {
            prompt_tokens: body.usage.prompt_tokens,
            completion_tokens: body.usage.completion_tokens,
            total_tokens: body.usage.total_tokens,
          }
        : null,
    });
    if (!response.ok) {
      const message = body?.error?.message || `OpenAI API error: ${response.status}`;
      const error = new Error(message);
      error.code = mapOpenAiErrorCode(body?.error?.code, message);
      throw error;
    }

    const content = body?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    logStage("openai:json-parsed", {
      requestId,
      recommendedCandidateId: parsed.recommendedCandidateId,
      tasteRecommendationId: parsed.tasteRecommendationId,
      valueRecommendationId: parsed.valueRecommendationId,
      confidence: parsed.confidence,
    });
    return sanitizeLlmResult(parsed, candidates);
  } finally {
    clearTimeout(timeout);
  }
}

function buildAnalysisPrompt(preference, candidates) {
  const purchaseInfo = candidates
    .map((candidate, index) => {
      const meta = candidate.purchase || {};
      return [
        `${index + 1}번 후보 (${candidate.id}) 구매 정보:`,
        `가격: ${formatOptionalNumber(meta.price)}원`,
        `중량: ${formatOptionalNumber(meta.weightGram)}g`,
        `100g당 가격: ${formatOptionalNumber(meta.pricePer100g)}원`,
        `등급: ${meta.grade || "미입력"}`,
        `원산지: ${meta.origin || "미입력"}`,
      ].join(" ");
    })
    .join("\n");

  return `
소고기 구이용 후보 ${candidates.length}장을 비교해 주세요.

사용자 취향 기준: ${preferenceLabel(preference)}

구매 정보:
${purchaseInfo}

반드시 아래 JSON 형식으로만 답하세요.
{
  "recommendedCandidateId": "candidate-1",
  "tasteRecommendationId": "candidate-1",
  "valueRecommendationId": "candidate-2",
  "confidence": "high | medium | low",
  "summary": "사진 기준으로는 ...",
  "tasteSummary": "맛 우선 추천 이유",
  "valueSummary": "가격/중량 정보까지 반영한 가성비 추천 이유",
  "ranking": [
    {
      "candidateId": "candidate-1",
      "rank": 1,
      "score": 86,
      "reason": "짧은 추천 이유",
      "analysis": {
        "fatAmount": "지방량 평가",
        "fatDistribution": "지방이 골고루 퍼졌는지, 한쪽에 쏠렸는지, 거의 없는지",
        "colorTone": "색상 평가",
        "surfaceSignal": "표면, 수분, 핏물, 포장 반사 등 사진상 주의 신호",
        "overall": "전반적인 구이용 적합도"
      },
      "warnings": ["사진 기준 주의 신호"]
    }
  ],
  "notices": ["사진 기준 참고용 분석입니다.", "유통기한, 냄새, 포장 팽창 여부는 직접 확인해 주세요."]
}

원칙:
- candidateId는 제공된 후보 id만 사용하세요.
- 모든 후보를 ranking에 포함하세요.
- 점수는 1~99 사이 정수로 주세요.
- 맛 우선 추천은 사진상 품질, 지방 분포, 색상, 구이용 적합도를 우선하세요.
- 가성비 추천은 사진상 품질과 100g당 가격을 함께 고려하세요. 가격/중량 정보가 부족하면 그 한계를 valueSummary에 적으세요.
- "상하지 않았다", "안전하다", "신선도가 보장된다", "무조건 맛있다", "공식 등급"이라고 말하지 마세요.
- 사진 품질이 낮거나 반사가 있으면 confidence를 낮추고 warnings에 적으세요.
`.trim();
}

function sanitizeLlmResult(result, candidates) {
  const validIds = new Set(candidates.map((candidate) => candidate.id));
  const ranking = Array.isArray(result.ranking)
    ? result.ranking
        .filter((item) => validIds.has(item.candidateId))
        .map((item, index) => ({
          candidateId: item.candidateId,
          rank: Number(item.rank || index + 1),
          score: clampScore(item.score),
          reason: String(item.reason || "사진 기준으로 비교한 결과입니다."),
          analysis: {
            fatAmount: String(item.analysis?.fatAmount || "사진 기준 지방량 판단 정보가 부족합니다."),
            fatDistribution: String(item.analysis?.fatDistribution || "지방 분포 판단 정보가 부족합니다."),
            colorTone: String(item.analysis?.colorTone || "색상 판단 정보가 부족합니다."),
            surfaceSignal: String(item.analysis?.surfaceSignal || "표면 상태 판단 정보가 부족합니다."),
            overall: String(item.analysis?.overall || "다른 후보와 함께 비교해 판단하는 편이 좋습니다."),
          },
          warnings: Array.isArray(item.warnings) ? item.warnings.map(String).slice(0, 4) : [],
        }))
    : [];

  if (ranking.length !== candidates.length) {
    const existingIds = new Set(ranking.map((item) => item.candidateId));
    candidates.forEach((candidate) => {
      if (!existingIds.has(candidate.id)) {
        ranking.push({
          candidateId: candidate.id,
          rank: ranking.length + 1,
          score: 50,
          reason: "이 후보에 대한 상세 비교 정보가 부족합니다.",
          analysis: {
            fatAmount: "사진 기준 지방량 판단 정보가 부족합니다.",
            fatDistribution: "지방 분포 판단 정보가 부족합니다.",
            colorTone: "색상 판단 정보가 부족합니다.",
            surfaceSignal: "표면 상태 판단 정보가 부족합니다.",
            overall: "다른 후보와 함께 비교해 판단하는 편이 좋습니다.",
          },
          warnings: ["LLM 응답에 일부 후보 분석이 누락되었습니다."],
        });
      }
    });
  }

  ranking.sort((a, b) => a.rank - b.rank);

  return {
    recommendedCandidateId: validIds.has(result.recommendedCandidateId)
      ? result.recommendedCandidateId
      : ranking[0]?.candidateId,
    tasteRecommendationId: validIds.has(result.tasteRecommendationId)
      ? result.tasteRecommendationId
      : validIds.has(result.recommendedCandidateId)
        ? result.recommendedCandidateId
        : ranking[0]?.candidateId,
    valueRecommendationId: validIds.has(result.valueRecommendationId)
      ? result.valueRecommendationId
      : ranking[0]?.candidateId,
    confidence: ["high", "medium", "low"].includes(result.confidence) ? result.confidence : "medium",
    summary: String(result.summary || "사진 기준으로 후보를 비교했습니다."),
    tasteSummary: String(result.tasteSummary || result.summary || "사진상 품질을 기준으로 추천했습니다."),
    valueSummary: String(result.valueSummary || "가격/중량 정보가 충분하면 가성비 추천에 함께 반영합니다."),
    ranking,
    notices: Array.isArray(result.notices)
      ? result.notices.map(String).slice(0, 3)
      : ["사진 기준 참고용 분석입니다.", "유통기한, 냄새, 포장 팽창 여부는 직접 확인해 주세요."],
  };
}

function normalizeCandidatePayload(candidate) {
  const purchase = candidate.purchase || {};
  const price = toPositiveNumber(purchase.price);
  const weightGram = toPositiveNumber(purchase.weightGram);
  const pricePer100g = price && weightGram ? Math.round((price / weightGram) * 100) : toPositiveNumber(purchase.pricePer100g);

  return {
    id: String(candidate.id || ""),
    imageDataUrl: candidate.imageDataUrl,
    purchase: {
      price,
      weightGram,
      pricePer100g,
      grade: String(purchase.grade || "").slice(0, 30),
      origin: String(purchase.origin || "").slice(0, 30),
    },
  };
}

async function readRequestBody(request, maxBytes) {
  return await new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        const error = new Error("Request body is too large.");
        error.code = "REQUEST_TOO_LARGE";
        request.destroy(error);
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readOpenAiKey() {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY.trim();
  }

  const keyPath = join(projectRoot, "openai_api_key.txt");
  if (!existsSync(keyPath)) {
    return "";
  }

  const raw = await readFile(keyPath, "utf8");
  const line = raw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find(Boolean);

  if (!line) {
    return "";
  }

  return line.includes("=") ? line.split("=").slice(1).join("=").trim() : line;
}

async function readUsageState() {
  const today = new Date().toISOString().slice(0, 10);
  if (!existsSync(usageStatePath)) {
    return { date: today, dailyCalls: 0, totalCalls: 0 };
  }

  try {
    const usage = JSON.parse(await readFile(usageStatePath, "utf8"));
    if (usage.date !== today) {
      return { ...usage, date: today, dailyCalls: 0 };
    }
    return {
      date: today,
      dailyCalls: Number(usage.dailyCalls || 0),
      totalCalls: Number(usage.totalCalls || 0),
      lastCallAt: usage.lastCallAt,
      lastModel: usage.lastModel,
      lastImageCount: usage.lastImageCount,
    };
  } catch {
    return { date: today, dailyCalls: 0, totalCalls: 0 };
  }
}

async function writeUsageState(usage) {
  await writeFile(usageStatePath, JSON.stringify(usage, null, 2), "utf8");
}

function isValidImageDataUrl(value) {
  return (
    typeof value === "string" &&
    value.length < 1_200_000 &&
    /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)
  );
}

function writeJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function mapOpenAiErrorCode(code, message) {
  if (code === "insufficient_quota" || /quota|billing/i.test(message)) {
    return "OPENAI_QUOTA_EXCEEDED";
  }
  if (code === "invalid_api_key" || /api key/i.test(message)) {
    return "OPENAI_AUTH_FAILED";
  }
  return "OPENAI_API_ERROR";
}

function preferenceLabel(preference) {
  return (
    {
      balanced: "균형",
      lean: "담백함",
      rich: "고소한 지방감",
      tender: "부드러운 식감",
      value: "가성비",
    }[preference] || "균형"
  );
}

function clampScore(value) {
  return Math.max(1, Math.min(99, Math.round(Number(value) || 50)));
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatOptionalNumber(value) {
  return value ? Number(value).toLocaleString("ko-KR") : "미입력";
}

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeCandidateLog(candidate) {
  return {
    id: candidate.id,
    imageBytesApprox: Math.round((candidate.imageDataUrl.length * 3) / 4),
    purchase: candidate.purchase,
  };
}

function logStage(stage, details = {}) {
  const entry = {
    time: new Date().toISOString(),
    stage,
    ...details,
  };
  const line = JSON.stringify(entry);
  console.log(line);
  appendFile(serverLogPath, `${line}\n`, "utf8").catch(() => {});
}
