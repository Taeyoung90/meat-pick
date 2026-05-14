const imageInput = document.querySelector("#imageInput");
const analyzeButton = document.querySelector("#analyzeButton");
const resetButton = document.querySelector("#resetButton");
const candidateGrid = document.querySelector("#candidateGrid");
const candidateCount = document.querySelector("#candidateCount");
const inputHint = document.querySelector("#inputHint");
const resultSection = document.querySelector("#resultSection");
const recommendationCard = document.querySelector("#recommendationCard");
const rankingList = document.querySelector("#rankingList");
const confidenceBadge = document.querySelector("#confidenceBadge");

const state = {
  candidates: [],
  serverStatus: null,
};

fetchServerStatus();

candidateGrid.addEventListener("input", (event) => {
  const input = event.target.closest("[data-candidate-field]");
  if (!input) return;

  const candidate = state.candidates.find((item) => item.id === input.dataset.candidateId);
  if (!candidate) return;

  candidate.purchase[input.dataset.candidateField] = input.value;
  updatePricePer100g(candidate);
});

imageInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []).slice(0, 5);
  state.candidates = await Promise.all(files.map(createCandidate));
  renderCandidates();
  resultSection.classList.add("hidden");
});

analyzeButton.addEventListener("click", async () => {
  const preference = document.querySelector("input[name='preference']:checked").value;
  setAnalyzing(true);

  try {
    const result = await analyzeCandidatesWithLlm(state.candidates, preference);
    renderResult(result);
  } catch (error) {
    console.warn("Live analysis failed. Falling back to local analysis.", error);
    const result = analyzeCandidates(state.candidates, preference);
    result.source = "local-fallback";
    result.fallbackMessage = error.message;
    renderResult(result);
  } finally {
    setAnalyzing(false);
  }
});

resetButton.addEventListener("click", () => {
  state.candidates.forEach((candidate) => URL.revokeObjectURL(candidate.url));
  state.candidates = [];
  imageInput.value = "";
  renderCandidates();
  resultSection.classList.add("hidden");
});

async function createCandidate(file, index) {
  const url = URL.createObjectURL(file);
  const metrics = await readImageMetrics(url);

  return {
    id: `candidate-${index + 1}`,
    label: `${index + 1}번 후보`,
    fileName: file.name,
    url,
    metrics,
    purchase: {
      price: "",
      weightGram: "",
      grade: "",
      origin: "",
      pricePer100g: null,
    },
  };
}

function renderCandidates() {
  candidateCount.textContent = `${state.candidates.length} / 5`;
  analyzeButton.disabled = state.candidates.length < 2;

  if (state.candidates.length === 0) {
    candidateGrid.className = "candidate-grid empty-state";
    candidateGrid.innerHTML = "<p>아직 후보 사진이 없습니다.</p>";
    inputHint.textContent = "고기 전체가 보이고 비닐 반사가 적을수록 좋아요.";
    return;
  }

  candidateGrid.className = "candidate-grid";
  inputHint.textContent =
    state.candidates.length < 2
      ? "비교하려면 후보 사진을 1장 더 올려주세요."
      : "좋아요. 이제 분석하기를 눌러 후보를 비교할 수 있어요.";

  candidateGrid.innerHTML = state.candidates
    .map((candidate) => {
      const { colorScore, fatScore, balanceScore } = candidate.metrics.scores;
      return `
        <article class="candidate-card">
          <img src="${candidate.url}" alt="${candidate.label} 사진" />
          <div class="candidate-body">
            <div class="candidate-title">
              <span>${candidate.label}</span>
            </div>
            <ul class="metric-list">
              ${metricRow("색 안정감", colorScore)}
              ${metricRow("지방감", fatScore)}
              ${metricRow("사진 품질", balanceScore)}
            </ul>
            ${purchaseInputs(candidate)}
          </div>
        </article>
      `;
    })
    .join("");
}

function purchaseInputs(candidate) {
  return `
    <div class="purchase-fields" aria-label="${candidate.label} 구매 정보">
      <label>
        <span>가격</span>
        <input data-candidate-id="${candidate.id}" data-candidate-field="price" inputmode="numeric" placeholder="예: 18000" value="${escapeHtml(candidate.purchase.price)}" />
      </label>
      <label>
        <span>중량(g)</span>
        <input data-candidate-id="${candidate.id}" data-candidate-field="weightGram" inputmode="numeric" placeholder="예: 320" value="${escapeHtml(candidate.purchase.weightGram)}" />
      </label>
      <label>
        <span>등급</span>
        <input data-candidate-id="${candidate.id}" data-candidate-field="grade" placeholder="예: 1+" value="${escapeHtml(candidate.purchase.grade)}" />
      </label>
      <label>
        <span>원산지</span>
        <input data-candidate-id="${candidate.id}" data-candidate-field="origin" placeholder="예: 한우" value="${escapeHtml(candidate.purchase.origin)}" />
      </label>
      <p id="${candidate.id}-price-per-100g" class="price-per-100g">${formatPricePer100g(candidate)}</p>
    </div>
  `;
}

function updatePricePer100g(candidate) {
  const price = toPositiveNumber(candidate.purchase.price);
  const weight = toPositiveNumber(candidate.purchase.weightGram);
  candidate.purchase.pricePer100g = price && weight ? Math.round((price / weight) * 100) : null;

  const element = document.querySelector(`#${candidate.id}-price-per-100g`);
  if (element) {
    element.textContent = formatPricePer100g(candidate);
  }
}

function formatPricePer100g(candidate) {
  return candidate.purchase.pricePer100g
    ? `100g당 ${candidate.purchase.pricePer100g.toLocaleString("ko-KR")}원`
    : "가격과 중량을 넣으면 100g당 가격을 계산합니다.";
}

async function fetchServerStatus() {
  try {
    const response = await fetch("/api/status");
    state.serverStatus = await response.json();
    updateLiveHint();
  } catch {
    state.serverStatus = null;
  }
}

function updateLiveHint() {
  if (!state.serverStatus) return;

  const remaining = Math.max(0, state.serverStatus.maxDailyLiveCalls - state.serverStatus.dailyCalls);
  inputHint.textContent = state.serverStatus.apiKeyConfigured
    ? `실제 LLM 분석이 켜져 있습니다. 오늘 남은 호출: ${remaining}회, 1회 최대 ${state.serverStatus.maxImagesPerAnalysis}장.`
    : "API key가 없어 임시 분석만 사용할 수 있습니다.";
}

function setAnalyzing(isAnalyzing) {
  analyzeButton.disabled = isAnalyzing || state.candidates.length < 2;
  analyzeButton.textContent = isAnalyzing ? "분석 중..." : "분석하기";
}

function metricRow(label, value) {
  const percent = Math.round(value);
  return `
    <li class="metric-row">
      <span>${label}</span>
      <span class="bar"><span style="width: ${percent}%"></span></span>
      <strong>${percent}</strong>
    </li>
  `;
}

function analyzeCandidates(candidates, preference) {
  const ranked = candidates
    .map((candidate) => {
      const score = scoreCandidate(candidate.metrics.scores, preference);
      return {
        ...candidate,
        score,
        reason: buildReason(candidate.metrics, preference),
        analysis: buildAnalysis(candidate.metrics),
        warnings: buildWarnings(candidate.metrics),
      };
    })
    .sort((a, b) => b.score - a.score);

  const averageConfidence =
    ranked.reduce((sum, candidate) => sum + candidate.metrics.scores.confidence, 0) / ranked.length;

  return {
    preference,
    ranked,
    winner: ranked[0],
    tasteWinner: ranked[0],
    valueWinner: chooseLocalValueWinner(ranked),
    tasteSummary: `${ranked[0].label}가 사진상 품질 기준으로 가장 좋아 보입니다.`,
    valueSummary: buildLocalValueSummary(chooseLocalValueWinner(ranked)),
    confidenceLabel: confidenceLabel(averageConfidence),
    source: "local",
  };
}

function chooseLocalValueWinner(ranked) {
  const scored = ranked.map((candidate) => {
    const pricePer100g = toPositiveNumber(candidate.purchase?.pricePer100g);
    const valueBonus = pricePer100g ? Math.max(0, 30 - pricePer100g / 1000) : 0;
    return {
      candidate,
      valueScore: candidate.score + valueBonus,
    };
  });

  scored.sort((a, b) => b.valueScore - a.valueScore);
  return scored[0]?.candidate || ranked[0];
}

function buildLocalValueSummary(candidate) {
  if (!candidate?.purchase?.pricePer100g) {
    return "가격과 중량 정보가 부족해 사진상 품질 위주로 추천했습니다.";
  }

  return `${candidate.label}가 100g당 ${candidate.purchase.pricePer100g.toLocaleString("ko-KR")}원 기준으로 가격 대비 균형이 좋아 보입니다.`;
}

async function analyzeCandidatesWithLlm(candidates, preference) {
  const maxImages = state.serverStatus?.maxImagesPerAnalysis || 3;
  const liveCandidates = candidates.slice(0, maxImages);

  if (candidates.length > maxImages) {
    inputHint.textContent = `비용 제한 때문에 실제 LLM 분석에는 앞의 ${maxImages}장만 보냅니다.`;
  }

  const payloadCandidates = await Promise.all(
    liveCandidates.map(async (candidate) => ({
      id: candidate.id,
      purchase: normalizePurchase(candidate.purchase),
      imageDataUrl: await resizeImageForApi(candidate.url),
    })),
  );

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      preference,
      candidates: payloadCandidates,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(readableAnalyzeError(payload));
  }

  if (payload.limits) {
    state.serverStatus = {
      ...(state.serverStatus || {}),
      dailyCalls: payload.limits.dailyCalls,
      maxDailyLiveCalls: payload.limits.maxDailyLiveCalls,
      maxImagesPerAnalysis: payload.limits.maxImagesPerAnalysis,
      apiKeyConfigured: true,
    };
    updateLiveHint();
  }

  return normalizeLlmResult(payload, liveCandidates, preference);
}

function normalizeLlmResult(payload, candidates, preference) {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const ranked = payload.ranking
    .map((item) => {
      const candidate = candidateById.get(item.candidateId);
      return {
        ...candidate,
        score: item.score,
        reason: item.reason,
        analysis: item.analysis,
        warnings: item.warnings || [],
      };
    })
    .filter((candidate) => candidate.id);

  const winner = ranked.find((candidate) => candidate.id === payload.recommendedCandidateId) || ranked[0];
  const tasteWinner = ranked.find((candidate) => candidate.id === payload.tasteRecommendationId) || winner;
  const valueWinner = ranked.find((candidate) => candidate.id === payload.valueRecommendationId) || ranked[0];

  return {
    preference,
    ranked,
    winner,
    tasteWinner,
    valueWinner,
    summary: payload.summary,
    tasteSummary: payload.tasteSummary,
    valueSummary: payload.valueSummary,
    confidenceLabel: confidenceLabelFromLlm(payload.confidence),
    notices: payload.notices || [],
    source: "openai",
    model: payload.model,
  };
}

function readableAnalyzeError(payload) {
  const error = payload?.error;
  if (error === "OPENAI_QUOTA_EXCEEDED") {
    return "OpenAI API 쿼터 또는 결제 한도 때문에 실제 LLM 분석을 실행하지 못했습니다.";
  }
  if (error === "OPENAI_AUTH_FAILED") {
    return "OpenAI API key 인증에 실패했습니다.";
  }
  if (error === "DAILY_LIMIT_REACHED") {
    return "오늘의 실제 LLM 분석 횟수 제한에 도달했습니다.";
  }
  if (error === "TOO_MANY_IMAGES") {
    return payload.message || "한 번에 보낼 수 있는 이미지 수를 초과했습니다.";
  }
  return payload?.message || payload?.error || "LLM 분석에 실패했습니다.";
}

function scoreCandidate(scores, preference) {
  const weights = {
    balanced: { colorScore: 0.28, fatScore: 0.24, marblingScore: 0.22, balanceScore: 0.26 },
    lean: { colorScore: 0.3, fatScore: 0.12, marblingScore: 0.16, balanceScore: 0.42 },
    rich: { colorScore: 0.24, fatScore: 0.34, marblingScore: 0.28, balanceScore: 0.14 },
    tender: { colorScore: 0.22, fatScore: 0.25, marblingScore: 0.36, balanceScore: 0.17 },
    value: { colorScore: 0.26, fatScore: 0.18, marblingScore: 0.2, balanceScore: 0.36 },
  }[preference];

  const raw =
    scores.colorScore * weights.colorScore +
    scores.fatScore * weights.fatScore +
    scores.marblingScore * weights.marblingScore +
    scores.balanceScore * weights.balanceScore;

  return Math.max(1, Math.min(99, Math.round(raw)));
}

function buildReason(metrics, preference) {
  const scores = metrics.scores;
  const preferenceText = {
    balanced: "균형 기준으로 볼 때",
    lean: "담백한 취향 기준으로 볼 때",
    rich: "고소한 지방감 기준으로 볼 때",
    tender: "부드러운 식감 기준으로 볼 때",
    value: "가성비 기준으로 볼 때",
  }[preference];

  const details = [];

  if (scores.colorScore >= 70) details.push("색감이 비교적 안정적으로 보입니다");
  if (scores.fatScore >= 65) details.push("지방감이 충분해 보입니다");
  if (scores.marblingScore >= 65) details.push("밝은 지방 영역이 고르게 분포한 편입니다");
  if (scores.balanceScore >= 70) details.push("사진상 반사나 어두운 영역이 적습니다");

  if (details.length === 0) {
    details.push("눈에 띄는 강점은 크지 않지만 다른 후보 대비 점수가 높습니다");
  }

  return `${preferenceText} ${details.slice(0, 2).join(", ")}.`;
}

function buildAnalysis(metrics) {
  const { scores, redRatio, whiteRatio, glareRatio, darkRatio, averageBrightness, averageWarmth } = metrics;
  const fatAmount = describeFatAmount(whiteRatio, scores.fatScore);
  const fatDistribution = describeFatDistribution(redRatio, whiteRatio, glareRatio, darkRatio);
  const colorTone = describeColorTone(scores.colorScore, averageWarmth, averageBrightness, darkRatio);
  const surfaceSignal = describeSurfaceSignal(scores.balanceScore, glareRatio, darkRatio);
  const overall = describeOverall(scores);

  return {
    fatAmount,
    fatDistribution,
    colorTone,
    surfaceSignal,
    overall,
  };
}

function describeFatAmount(whiteRatio, fatScore) {
  if (fatScore >= 72 && whiteRatio >= 0.18) {
    return "밝은 지방 영역이 충분히 보여 고소한 지방감이 기대되는 편입니다.";
  }
  if (fatScore >= 55) {
    return "지방감은 중간 정도로 보여 과하게 기름지거나 지나치게 담백해 보이지 않습니다.";
  }
  return "사진 기준으로는 밝은 지방 영역이 적어 비교적 담백한 후보처럼 보입니다.";
}

function describeFatDistribution(redRatio, whiteRatio, glareRatio, darkRatio) {
  if (glareRatio > 0.14) {
    return "포장 반사가 있어 지방 분포가 고른지 판단하기에는 신뢰도가 조금 낮습니다.";
  }
  if (whiteRatio < 0.08) {
    return "눈에 띄는 지방 영역이 적어 마블링 분포보다는 살코기 비중이 더 크게 보입니다.";
  }
  if (redRatio >= 0.18 && whiteRatio >= 0.12 && darkRatio < 0.22) {
    return "살코기와 밝은 지방 영역이 함께 잡혀, 지방이 한쪽에 크게 쏠린 사진은 아닌 것으로 보입니다.";
  }
  return "지방이 고르게 퍼졌다고 보기에는 정보가 부족해, 실제로는 사진 각도와 포장 반사를 함께 확인하는 편이 좋습니다.";
}

function describeColorTone(colorScore, averageWarmth, averageBrightness, darkRatio) {
  if (darkRatio > 0.28 || averageBrightness < 80) {
    return "사진이 어두워 고기 색이 실제보다 탁하게 보일 수 있습니다.";
  }
  if (colorScore >= 74 && averageWarmth > 10) {
    return "붉은 계열 색감이 비교적 안정적으로 잡혀 사진상 색 상태는 좋아 보입니다.";
  }
  if (colorScore >= 55) {
    return "색상은 무난한 편이지만, 조명이나 포장 비닐 영향이 있을 수 있습니다.";
  }
  return "붉은 색 정보가 적거나 색이 균일하지 않아 사진 기준 색 안정감은 낮게 잡혔습니다.";
}

function describeSurfaceSignal(balanceScore, glareRatio, darkRatio) {
  if (glareRatio > 0.14) {
    return "표면에 강한 반사가 있어 수분감이나 지방선을 정확히 보기 어렵습니다.";
  }
  if (darkRatio > 0.26) {
    return "어두운 영역이 많아 표면 상태를 판단하기 어렵습니다.";
  }
  if (balanceScore >= 72) {
    return "사진 품질은 비교적 안정적이라 표면과 색을 읽기 좋은 편입니다.";
  }
  return "사진 품질은 보통 수준이라 최종 구매 전 고기 표면과 포장 상태를 직접 확인해 주세요.";
}

function describeOverall(scores) {
  const strongSignals = [
    scores.colorScore >= 70,
    scores.fatScore >= 65,
    scores.marblingScore >= 65,
    scores.balanceScore >= 70,
  ].filter(Boolean).length;

  if (strongSignals >= 3) {
    return "전반적으로 색, 지방감, 사진 품질의 균형이 좋아 구이용 후보로 꽤 좋아 보입니다.";
  }
  if (strongSignals >= 2) {
    return "전반 평가는 무난한 편이며, 취향 기준에 따라 선택 후보가 될 수 있습니다.";
  }
  return "사진 기준 강점은 크지 않아 다른 후보와 비교해서 신중히 고르는 편이 좋습니다.";
}

function buildWarnings(metrics) {
  const warnings = [];

  if (metrics.glareRatio > 0.12) warnings.push("포장 반사가 있어 색 판단 신뢰도가 낮을 수 있음");
  if (metrics.darkRatio > 0.25) warnings.push("사진이 어두워 실제 색과 다르게 보일 수 있음");
  if (metrics.redRatio < 0.1) warnings.push("고기 영역이 작거나 색 정보가 부족할 수 있음");

  return warnings;
}

function renderResult(result) {
  const { winner, ranked, confidenceLabel: label } = result;
  const sourceLabel = result.source === "openai" ? "LLM" : result.source === "local-fallback" ? "임시 분석" : "로컬";
  confidenceBadge.textContent = `${sourceLabel} 신뢰도 ${label}`;
  const tasteWinner = result.tasteWinner || winner;
  const valueWinner = result.valueWinner || winner;

  recommendationCard.innerHTML = `
    <div class="recommendation-grid">
      <div>
        <span class="recommendation-kicker">맛 우선</span>
        <h3>${tasteWinner.label} 추천</h3>
        <p>${result.tasteSummary || result.summary || `${tasteWinner.label}가 사진상 품질 기준으로 좋아 보입니다.`}</p>
      </div>
      <div>
        <span class="recommendation-kicker">가성비</span>
        <h3>${valueWinner.label} 추천</h3>
        <p>${result.valueSummary || "가격과 중량 정보가 충분하면 가성비 추천에 함께 반영합니다."}</p>
      </div>
    </div>
    ${result.fallbackMessage ? `<p class="fallback-copy">LLM 호출 실패로 임시 분석을 표시합니다: ${result.fallbackMessage}</p>` : ""}
  `;

  rankingList.innerHTML = ranked
    .map((candidate, index) => {
      const warnings =
        candidate.warnings.length > 0
          ? `주의: ${candidate.warnings.join(", ")}`
          : "특별한 사진 품질 주의 신호는 적습니다.";

      return `
        <article class="rank-card">
          <div class="rank-number">${index + 1}</div>
          <img class="rank-image" src="${candidate.url}" alt="${candidate.label} 원본 사진" />
          <div class="rank-content">
            <h3>${candidate.label}</h3>
            <p class="purchase-summary">${purchaseSummary(candidate.purchase)}</p>
            <p>${candidate.reason} ${warnings}</p>
            <div class="analysis-block">
              <h4>고기 분석</h4>
              <ul>
                <li><strong>지방량</strong>${candidate.analysis.fatAmount}</li>
                <li><strong>지방 분포</strong>${candidate.analysis.fatDistribution}</li>
                <li><strong>색상</strong>${candidate.analysis.colorTone}</li>
                <li><strong>표면/사진</strong>${candidate.analysis.surfaceSignal}</li>
                <li><strong>종합</strong>${candidate.analysis.overall}</li>
              </ul>
            </div>
          </div>
          <div class="score">${candidate.score}점</div>
        </article>
      `;
    })
    .join("");

  const noticeBox = document.querySelector(".notice-box");
  if (noticeBox) {
    const notices = result.notices?.length
      ? result.notices
      : ["사진 기준 참고용 분석입니다.", "실제 품질은 보관 상태, 유통기한, 냄새, 포장 상태에 따라 달라질 수 있습니다."];
    noticeBox.textContent = notices.join(" ");
  }

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function normalizePurchase(purchase) {
  return {
    price: toPositiveNumber(purchase.price),
    weightGram: toPositiveNumber(purchase.weightGram),
    pricePer100g: toPositiveNumber(purchase.pricePer100g),
    grade: purchase.grade || "",
    origin: purchase.origin || "",
  };
}

function purchaseSummary(purchase) {
  const normalized = normalizePurchase(purchase || {});
  const parts = [];
  if (normalized.price) parts.push(`${normalized.price.toLocaleString("ko-KR")}원`);
  if (normalized.weightGram) parts.push(`${normalized.weightGram.toLocaleString("ko-KR")}g`);
  if (normalized.pricePer100g) parts.push(`100g당 ${normalized.pricePer100g.toLocaleString("ko-KR")}원`);
  if (normalized.grade) parts.push(`등급 ${escapeHtml(normalized.grade)}`);
  if (normalized.origin) parts.push(escapeHtml(normalized.origin));
  return parts.length ? parts.join(" · ") : "구매 정보 미입력";
}

function toPositiveNumber(value) {
  const number = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function confidenceLabel(value) {
  if (value >= 75) return "높음";
  if (value >= 55) return "보통";
  return "낮음";
}

function confidenceLabelFromLlm(value) {
  if (value === "high") return "높음";
  if (value === "low") return "낮음";
  return "보통";
}

function resizeImageForApi(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 768;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    image.onerror = reject;
    image.src = url;
  });
}

function readImageMetrics(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 180;
      const ratio = image.width / image.height || 1;

      canvas.width = ratio >= 1 ? size : Math.round(size * ratio);
      canvas.height = ratio >= 1 ? Math.round(size / ratio) : size;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      resolve(computeMetrics(pixels));
    };
    image.onerror = reject;
    image.src = url;
  });
}

function computeMetrics(pixels) {
  let redPixels = 0;
  let whitePixels = 0;
  let glarePixels = 0;
  let darkPixels = 0;
  let brightnessTotal = 0;
  let warmTotal = 0;
  let sampled = 0;

  for (let index = 0; index < pixels.length; index += 16) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const brightness = (r + g + b) / 3;
    const warm = r - (g + b) / 2;

    sampled += 1;
    brightnessTotal += brightness;
    warmTotal += warm;

    if (r > 95 && r > g * 1.08 && r > b * 1.12) redPixels += 1;
    if (r > 165 && g > 145 && b > 125 && Math.abs(r - g) < 55) whitePixels += 1;
    if (r > 235 && g > 225 && b > 215) glarePixels += 1;
    if (brightness < 55) darkPixels += 1;
  }

  const redRatio = redPixels / sampled;
  const whiteRatio = whitePixels / sampled;
  const glareRatio = glarePixels / sampled;
  const darkRatio = darkPixels / sampled;
  const averageBrightness = brightnessTotal / sampled;
  const averageWarmth = warmTotal / sampled;

  const colorScore = clamp(42 + redRatio * 150 + averageWarmth * 0.35 - darkRatio * 35 - glareRatio * 25);
  const fatScore = clamp(35 + whiteRatio * 170 - glareRatio * 70);
  const marblingScore = clamp(40 + Math.min(redRatio, 0.42) * 80 + Math.min(whiteRatio, 0.32) * 95);
  const balanceScore = clamp(85 - glareRatio * 170 - darkRatio * 130 - Math.abs(averageBrightness - 135) * 0.18);
  const confidence = clamp(72 + redRatio * 30 - glareRatio * 90 - darkRatio * 75);

  return {
    redRatio,
    whiteRatio,
    glareRatio,
    darkRatio,
    averageBrightness,
    averageWarmth,
    scores: {
      colorScore,
      fatScore,
      marblingScore,
      balanceScore,
      confidence,
    },
  };
}

function clamp(value) {
  return Math.max(1, Math.min(99, Math.round(value)));
}
