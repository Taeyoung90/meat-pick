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
const maxDailyOcrCalls = Number(process.env.MAX_DAILY_OCR_CALLS || 15);
const maxRequestBytes = Number(process.env.MAX_ANALYZE_BODY_BYTES || 4_500_000);
const usageStatePath = join(root, "usage-state.json");
const serverLogPath = join(root, "server.log");
let usageQueue = Promise.resolve();

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

  if (request.method === "POST" && url.pathname === "/api/ocr-label") {
    await handleOcrLabel(request, response);
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
    maxDailyOcrCalls,
    dailyCalls: usage.dailyCalls,
    dailyOcrCalls: usage.dailyOcrCalls,
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
    const productMode = normalizeProductMode(payload.productMode);
    const productModeLabel = productModeLabelFor(productMode);
    logStage("analyze:payload-parsed", {
      requestId,
      productMode,
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

    const usageReservation = await reserveUsage("analysis", maxDailyLiveCalls);
    if (!usageReservation.ok) {
      logStage("analyze:rejected", {
        requestId,
        reason: "DAILY_LIMIT_REACHED",
        dailyCalls: usageReservation.usage.dailyCalls,
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
      await releaseUsage("analysis");
      logStage("analyze:rejected", { requestId, reason: "OPENAI_API_KEY_MISSING" });
      writeJson(response, 500, { error: "OPENAI_API_KEY_MISSING" });
      return;
    }

    logStage("openai:request-start", {
      requestId,
      model: openaiModel,
      candidateCount: normalizedCandidates.length,
      dailyCallsBefore: usageReservation.previousDailyCalls,
    });
    const result = await callOpenAi({ apiKey, productMode, productModeLabel, preference, candidates: normalizedCandidates, requestId });
    await updateUsageMeta({
      lastCallAt: new Date().toISOString(),
      lastModel: openaiModel,
      lastImageCount: candidates.length,
    });
    logStage("analyze:response-ready", {
      requestId,
      tasteRecommendationId: result.tasteRecommendationId,
      valueRecommendationId: result.valueRecommendationId,
      confidence: result.confidence,
      dailyCallsAfter: usageReservation.nextDailyCalls,
    });

    writeJson(response, 200, {
      ...result,
      productMode,
      productModeLabel,
      source: "openai",
      model: openaiModel,
      limits: {
        dailyCalls: usageReservation.nextDailyCalls,
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

async function handleOcrLabel(request, response) {
  const requestId = createRequestId();
  try {
    logStage("ocr:request-received", { requestId });
    const bodyText = await readRequestBody(request, maxRequestBytes);
    const payload = JSON.parse(bodyText);
    const candidateId = String(payload.candidateId || "");
    const imageDataUrl = String(payload.imageDataUrl || "");

    logStage("ocr:payload-parsed", {
      requestId,
      candidateId,
      bodyBytes: Buffer.byteLength(bodyText),
    });

    if (!candidateId || !isValidImageDataUrl(imageDataUrl)) {
      logStage("ocr:rejected", { requestId, reason: "INVALID_LABEL_IMAGE" });
      writeJson(response, 400, { error: "INVALID_LABEL_IMAGE" });
      return;
    }

    const usageReservation = await reserveUsage("ocr", maxDailyOcrCalls);
    if (!usageReservation.ok) {
      logStage("ocr:rejected", {
        requestId,
        reason: "DAILY_OCR_LIMIT_REACHED",
        dailyOcrCalls: usageReservation.usage.dailyOcrCalls,
        maxDailyOcrCalls,
      });
      writeJson(response, 429, {
        error: "DAILY_OCR_LIMIT_REACHED",
        message: `Daily OCR limit reached: ${maxDailyOcrCalls}`,
      });
      return;
    }

    const apiKey = await readOpenAiKey();
    if (!apiKey) {
      await releaseUsage("ocr");
      logStage("ocr:rejected", { requestId, reason: "OPENAI_API_KEY_MISSING" });
      writeJson(response, 500, { error: "OPENAI_API_KEY_MISSING" });
      return;
    }

    logStage("openai:ocr-request-start", {
      requestId,
      candidateId,
      model: openaiModel,
      dailyOcrCallsBefore: usageReservation.previousDailyOcrCalls,
      imageBytesApprox: Math.round((imageDataUrl.length * 3) / 4),
    });

    const result = await callOpenAiForLabel({ apiKey, candidateId, imageDataUrl, requestId });
    await updateUsageMeta({
      lastOcrCallAt: new Date().toISOString(),
      lastOcrModel: openaiModel,
    });

    logStage("ocr:response-ready", {
      requestId,
      candidateId,
      confidence: result.confidence,
      extracted: safeLabelLog(result),
      dailyOcrCallsAfter: usageReservation.nextDailyOcrCalls,
    });

    writeJson(response, 200, {
      ...result,
      source: "openai",
      model: openaiModel,
      limits: {
        dailyOcrCalls: usageReservation.nextDailyOcrCalls,
        maxDailyOcrCalls,
      },
    });
  } catch (error) {
    const status = error.code === "REQUEST_TOO_LARGE" ? 413 : 500;
    logStage("ocr:error", {
      requestId,
      code: error.code || "OCR_FAILED",
      message: error.message || "OCR failed.",
    });
    writeJson(response, status, {
      error: error.code || "OCR_FAILED",
      message: error.message || "OCR failed.",
    });
  }
}

async function callOpenAi({ apiKey, productMode, productModeLabel, preference, candidates, requestId }) {
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
              "You are a Korean fresh-food shopping assistant for a prototype app. Compare only visible photo cues for meat or produce. Do not claim food safety, freshness guarantee, official grade, or that an item is definitely safe. Return strict JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildAnalysisPrompt({ productMode, productModeLabel, preference, candidates }),
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
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      logStage("openai:json-parse-failed", {
        requestId,
        preview: String(content || "").slice(0, 420),
      });
      throw error;
    }
    logStage("openai:json-parsed", {
      requestId,
      recommendedCandidateId: parsed.recommendedCandidateId,
      tasteRecommendationId: parsed.tasteRecommendationId,
      valueRecommendationId: parsed.valueRecommendationId,
      confidence: parsed.confidence,
    });
    return sanitizeLlmResult(parsed, candidates, productMode);
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiForLabel({ apiKey, candidateId, imageDataUrl, requestId }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

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
        temperature: 0,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract Korean supermarket fresh-food price label information. Return strict JSON only. If a field is unclear, return null and add a warning. Do not infer values that are not visible.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildLabelOcrPrompt(candidateId),
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                  detail: "low",
                },
              },
            ],
          },
        ],
      }),
    });

    const body = await response.json();
    logStage("openai:ocr-response-received", {
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

    const parsed = JSON.parse(body?.choices?.[0]?.message?.content || "{}");
    const result = sanitizeLabelResult(parsed);
    logStage("openai:ocr-json-parsed", {
      requestId,
      candidateId,
      confidence: result.confidence,
      extracted: safeLabelLog(result),
    });
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function buildLabelOcrPrompt(candidateId) {
  return `
신선식품 가격표/라벨 사진에서 구매 정보를 추출해 주세요.

candidateId: ${candidateId}

반드시 아래 JSON 형식으로만 답하세요.
{
  "candidateId": "${candidateId}",
  "price": 18500,
  "weightGram": 320,
  "pricePer100g": 5780,
  "grade": "1+",
  "origin": "한우",
  "cut": "등심",
  "expiryDate": "2026-05-18",
  "packagedDate": "2026-05-15",
  "discount": "20%",
  "confidence": "high | medium | low",
  "warnings": ["라벨 일부가 반사되어 가격 확인 신뢰도가 낮습니다."]
}

원칙:
- 보이지 않거나 확실하지 않은 값은 null로 주세요.
- 숫자는 쉼표 없이 number로 주세요.
- 날짜는 가능하면 YYYY-MM-DD로 주세요. 불확실하면 원문 문자열 대신 null로 주세요.
- 가격, 중량, 100g당 가격 중 일부만 보이면 보이는 값만 채우세요.
- 공식 품질 판정이나 식품 안전 판정은 하지 마세요.
`.trim();
}

function buildAnalysisPrompt({ productMode, productModeLabel, preference, candidates }) {
  const guidance = analysisGuidanceFor(productMode);
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
        `부위/품목: ${meta.cut || "미입력"}`,
        `할인: ${meta.discount || "미입력"}`,
        `포장일: ${meta.packagedDate || "미입력"}`,
        `소비기한/표시일: ${meta.expiryDate || "미입력"}`,
        `사진 품질 경고: ${(candidate.qualityWarnings || []).join(", ") || "없음"}`,
      ].join(" ");
    })
    .join("\n");

  return `
${productModeLabel} 후보 ${candidates.length}장을 비교해 주세요.

사용자 취향 기준: ${preferenceLabel(preference)}

분석 기준:
${guidance.criteria.map((item) => `- ${item}`).join("\n")}

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
  "comparisonSummary": "1순위와 다른 후보의 핵심 차이를 2~3문장으로 요약",
  "ranking": [
    {
      "candidateId": "candidate-1",
      "rank": 1,
      "score": 86,
      "reason": "짧은 추천 이유",
      "strengths": ["구매 판단에 도움이 되는 장점"],
      "weaknesses": ["사진 기준 아쉬운 점"],
      "tags": ${JSON.stringify(guidance.tags)},
      "bestUse": "이 후보가 특히 어울리는 구매 상황이나 취향",
      "analysis": {
        "primarySignal": "${guidance.fields.primarySignal}",
        "distributionSignal": "${guidance.fields.distributionSignal}",
        "colorTone": "${guidance.fields.colorTone}",
        "surfaceSignal": "${guidance.fields.surfaceSignal}",
        "overall": "${guidance.fields.overall}"
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
- tasteRecommendationId는 ${guidance.tasteRule}
- 가성비 추천은 사진상 품질과 100g당 가격을 함께 고려하세요. 가격/중량 정보가 부족하면 그 한계를 valueSummary에 적으세요.
- tags는 후보당 최대 3개만 주세요. 단정하지 말고 사진 기준 표현을 사용하세요.
- strengths와 weaknesses는 각각 최대 3개만 주세요.
- "상하지 않았다", "안전하다", "신선도가 보장된다", "무조건 맛있다", "공식 등급"이라고 말하지 마세요.
- 사진 품질이 낮거나 반사가 있으면 confidence를 낮추고 warnings에 적으세요.
`.trim();
}

function sanitizeLlmResult(result, candidates, productMode = "beef-grill") {
  const fallback = analysisGuidanceFor(productMode).fallback;
  const validIds = new Set(candidates.map((candidate) => candidate.id));
  const ranking = Array.isArray(result.ranking)
    ? result.ranking
        .filter((item) => validIds.has(item.candidateId))
        .map((item, index) => ({
          candidateId: item.candidateId,
          rank: Number(item.rank || index + 1),
          score: clampScore(item.score),
          reason: String(item.reason || "사진 기준으로 비교한 결과입니다."),
          strengths: Array.isArray(item.strengths) ? item.strengths.map(String).slice(0, 3) : [],
          weaknesses: Array.isArray(item.weaknesses) ? item.weaknesses.map(String).slice(0, 3) : [],
          tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 3) : [],
          bestUse: optionalString(item.bestUse, 80),
          analysis: normalizeAnalysisResult(item.analysis, fallback),
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
          analysis: normalizeAnalysisResult({}, fallback),
          warnings: ["LLM 응답에 일부 후보 분석이 누락되었습니다."],
        });
      }
    });
  }

  ranking.sort((a, b) => a.rank - b.rank);

  return {
    productMode,
    productModeLabel: productModeLabelFor(productMode),
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
    comparisonSummary: optionalString(result.comparisonSummary, 260),
    ranking,
    notices: Array.isArray(result.notices)
      ? result.notices.map(String).slice(0, 3)
      : ["사진 기준 참고용 분석입니다.", "유통기한, 냄새, 포장 팽창 여부는 직접 확인해 주세요."],
  };
}

function normalizeAnalysisResult(analysis = {}, fallback = {}) {
  const primarySignal = String(analysis.primarySignal || analysis.fatAmount || fallback.primarySignal || fallback.fatAmount || "");
  const distributionSignal = String(
    analysis.distributionSignal || analysis.fatDistribution || fallback.distributionSignal || fallback.fatDistribution || "",
  );

  return {
    primarySignal,
    distributionSignal,
    fatAmount: primarySignal,
    fatDistribution: distributionSignal,
    colorTone: String(analysis.colorTone || fallback.colorTone || ""),
    surfaceSignal: String(analysis.surfaceSignal || fallback.surfaceSignal || ""),
    overall: String(analysis.overall || fallback.overall || ""),
  };
}

function sanitizeLabelResult(result) {
  return {
    candidateId: String(result.candidateId || ""),
    price: toPositiveNumber(result.price),
    weightGram: toPositiveNumber(result.weightGram),
    pricePer100g: toPositiveNumber(result.pricePer100g),
    grade: optionalString(result.grade, 30),
    origin: optionalString(result.origin, 30),
    cut: optionalString(result.cut, 40),
    expiryDate: optionalString(result.expiryDate, 30),
    packagedDate: optionalString(result.packagedDate, 30),
    discount: optionalString(result.discount, 30),
    confidence: ["high", "medium", "low"].includes(result.confidence) ? result.confidence : "medium",
    warnings: Array.isArray(result.warnings) ? result.warnings.map(String).slice(0, 4) : [],
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
    qualityWarnings: Array.isArray(candidate.qualityWarnings) ? candidate.qualityWarnings.map(String).slice(0, 5) : [],
    purchase: {
      price,
      weightGram,
      pricePer100g,
      grade: String(purchase.grade || "").slice(0, 30),
      origin: String(purchase.origin || "").slice(0, 30),
      cut: String(purchase.cut || "").slice(0, 40),
      discount: String(purchase.discount || "").slice(0, 30),
      expiryDate: String(purchase.expiryDate || "").slice(0, 30),
      packagedDate: String(purchase.packagedDate || "").slice(0, 30),
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
    return { date: today, dailyCalls: 0, dailyOcrCalls: 0, totalCalls: 0, totalOcrCalls: 0 };
  }

  try {
    const usage = JSON.parse(await readFile(usageStatePath, "utf8"));
    if (usage.date !== today) {
      return { ...usage, date: today, dailyCalls: 0, dailyOcrCalls: 0 };
    }
    return {
      date: today,
      dailyCalls: Number(usage.dailyCalls || 0),
      dailyOcrCalls: Number(usage.dailyOcrCalls || 0),
      totalCalls: Number(usage.totalCalls || 0),
      totalOcrCalls: Number(usage.totalOcrCalls || 0),
      lastCallAt: usage.lastCallAt,
      lastModel: usage.lastModel,
      lastImageCount: usage.lastImageCount,
      lastOcrCallAt: usage.lastOcrCallAt,
      lastOcrModel: usage.lastOcrModel,
    };
  } catch {
    return { date: today, dailyCalls: 0, dailyOcrCalls: 0, totalCalls: 0, totalOcrCalls: 0 };
  }
}

async function writeUsageState(usage) {
  await writeFile(usageStatePath, JSON.stringify(usage, null, 2), "utf8");
}

function withUsageLock(task) {
  const run = usageQueue.then(task, task);
  usageQueue = run.catch(() => {});
  return run;
}

async function reserveUsage(kind, maxDaily) {
  return await withUsageLock(async () => {
    const usage = await readUsageState();
    if (kind === "analysis") {
      if (usage.dailyCalls >= maxDaily) return { ok: false, usage };
      const next = {
        ...usage,
        dailyCalls: usage.dailyCalls + 1,
        totalCalls: usage.totalCalls + 1,
      };
      await writeUsageState(next);
      return {
        ok: true,
        usage: next,
        previousDailyCalls: usage.dailyCalls,
        nextDailyCalls: next.dailyCalls,
      };
    }

    if (usage.dailyOcrCalls >= maxDaily) return { ok: false, usage };
    const next = {
      ...usage,
      dailyOcrCalls: usage.dailyOcrCalls + 1,
      totalOcrCalls: usage.totalOcrCalls + 1,
    };
    await writeUsageState(next);
    return {
      ok: true,
      usage: next,
      previousDailyOcrCalls: usage.dailyOcrCalls,
      nextDailyOcrCalls: next.dailyOcrCalls,
    };
  });
}

async function releaseUsage(kind) {
  await withUsageLock(async () => {
    const usage = await readUsageState();
    if (kind === "analysis") {
      await writeUsageState({
        ...usage,
        dailyCalls: Math.max(0, usage.dailyCalls - 1),
        totalCalls: Math.max(0, usage.totalCalls - 1),
      });
      return;
    }

    await writeUsageState({
      ...usage,
      dailyOcrCalls: Math.max(0, usage.dailyOcrCalls - 1),
      totalOcrCalls: Math.max(0, usage.totalOcrCalls - 1),
    });
  });
}

async function updateUsageMeta(meta) {
  await withUsageLock(async () => {
    const usage = await readUsageState();
    await writeUsageState({
      ...usage,
      ...meta,
    });
  });
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
      vivid: "색 선명도",
      crisp: "싱싱함",
      firm: "탄탄함",
      clean: "상처 적음",
      value: "가성비",
    }[preference] || "균형"
  );
}

function normalizeProductMode(value) {
  return ["beef-grill", "leafy-greens", "tomato"].includes(value) ? value : "beef-grill";
}

function productModeLabelFor(mode) {
  return (
    {
      "beef-grill": "소고기 구이용",
      "leafy-greens": "잎채소",
      tomato: "토마토",
    }[mode] || "신선식품"
  );
}

function analysisGuidanceFor(mode) {
  if (mode === "leafy-greens") {
    return {
      criteria: ["잎의 생기와 색 선명도", "시든 부분 또는 마른 가장자리", "상처/변색/무름 의심 신호", "전체 형태와 크기 균일성", "가격표 정보가 있으면 가성비"],
      tasteRule: "사진상 색, 생기, 상처가 적은 정도, 바로 먹기 좋은 상태를 우선하세요.",
      tags: ["색 선명한 편", "생기 있어 보임", "상태 확인 필요"],
      fields: {
        primarySignal: "잎의 생기와 탄력감 평가",
        distributionSignal: "색상과 형태가 균일한지, 일부가 시들거나 한쪽으로 무너져 보이는지",
        colorTone: "초록색 선명도와 누렇게 뜬 부분 여부",
        surfaceSignal: "상처, 변색, 마른 부분, 포장 반사 등 사진상 주의 신호",
        overall: "전반적인 구매 후보 적합도",
      },
      fallback: {
        primarySignal: "사진 기준 잎의 생기 판단 정보가 부족합니다.",
        distributionSignal: "색상과 형태 균일도 판단 정보가 부족합니다.",
        colorTone: "색상 판단 정보가 부족합니다.",
        surfaceSignal: "상처/시듦 판단 정보가 부족합니다.",
        overall: "다른 후보와 함께 비교해 구매 후보를 판단하는 편이 좋습니다.",
      },
    };
  }

  if (mode === "tomato") {
    return {
      criteria: ["붉은 색 균일도", "표면 상처/눌림/무름 의심 신호", "크기와 형태 균형", "꼭지나 주변 색상 단서가 보이면 참고", "가격표 정보가 있으면 가성비"],
      tasteRule: "사진상 색 균일도, 표면 안정감, 상처가 적은 정도, 구매 후보 적합도를 우선하세요.",
      tags: ["색 균일한 편", "표면 안정적", "표면 확인 필요"],
      fields: {
        primarySignal: "색과 익은 정도 평가",
        distributionSignal: "크기와 형태 균일도",
        colorTone: "붉은 색 선명도와 색상 균일도",
        surfaceSignal: "상처, 눌림, 무름 의심, 포장 반사 등 사진상 주의 신호",
        overall: "전반적인 구매 후보 적합도",
      },
      fallback: {
        primarySignal: "사진 기준 색과 익은 정도 판단 정보가 부족합니다.",
        distributionSignal: "크기와 형태 균일도 판단 정보가 부족합니다.",
        colorTone: "색상 판단 정보가 부족합니다.",
        surfaceSignal: "표면/상처 판단 정보가 부족합니다.",
        overall: "다른 후보와 함께 비교해 구매 후보를 판단하는 편이 좋습니다.",
      },
    };
  }

  return {
    criteria: ["지방 분포와 지방량", "붉은 색 안정감", "표면 상태와 포장 반사", "구이용 적합도", "가격표 정보가 있으면 가성비"],
    tasteRule: "사진상 품질, 지방 분포, 색상, 구이용 적합도를 우선하세요.",
    tags: ["지방 고른 편", "색상 안정적", "반사 주의"],
    fields: {
      primarySignal: "지방량 평가",
      distributionSignal: "지방이 골고루 퍼졌는지, 한쪽에 쏠렸는지, 거의 없는지",
      colorTone: "색상 평가",
      surfaceSignal: "표면, 수분, 핏물, 포장 반사 등 사진상 주의 신호",
      overall: "전반적인 구이용 적합도",
    },
    fallback: {
      primarySignal: "사진 기준 지방량 판단 정보가 부족합니다.",
      distributionSignal: "지방 분포 판단 정보가 부족합니다.",
      colorTone: "색상 판단 정보가 부족합니다.",
      surfaceSignal: "표면 상태 판단 정보가 부족합니다.",
      overall: "다른 후보와 함께 비교해 판단하는 편이 좋습니다.",
    },
  };
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

function safeLabelLog(result) {
  return {
    price: result.price,
    weightGram: result.weightGram,
    pricePer100g: result.pricePer100g,
    grade: result.grade,
    origin: result.origin,
    cut: result.cut,
    expiryDate: result.expiryDate,
    packagedDate: result.packagedDate,
    discount: result.discount,
  };
}

function optionalString(value, maxLength) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value).slice(0, maxLength);
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
