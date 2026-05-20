const imageInput = document.querySelector("#imageInput");
const analyzeButton = document.querySelector("#analyzeButton");
const resetButton = document.querySelector("#resetButton");
const candidateGrid = document.querySelector("#candidateGrid");
const candidateCount = document.querySelector("#candidateCount");
const inputHint = document.querySelector("#inputHint");
const liveStatus = document.querySelector("#liveStatus");
const resultSection = document.querySelector("#resultSection");
const recommendationCard = document.querySelector("#recommendationCard");
const rankingList = document.querySelector("#rankingList");
const confidenceBadge = document.querySelector("#confidenceBadge");
const cropModal = document.querySelector("#cropModal");
const cropStage = document.querySelector("#cropStage");
const cropImage = document.querySelector("#cropImage");
const cropBox = document.querySelector("#cropBox");
const cropEyebrow = document.querySelector("#cropEyebrow");
const cropTitle = document.querySelector("#cropTitle");
const cropCloseButton = document.querySelector("#cropCloseButton");
const cropResetButton = document.querySelector("#cropResetButton");
const cropReadButton = document.querySelector("#cropReadButton");

const state = {
  candidates: [],
  serverStatus: null,
  crop: {
    candidateId: "",
    mode: "label",
    sequence: false,
    rect: { x: 0.22, y: 0.22, width: 0.56, height: 0.28 },
    drag: null,
  },
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

candidateGrid.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-label-input]");
  if (!input) return;

  const candidate = state.candidates.find((item) => item.id === input.dataset.candidateId);
  const file = input.files?.[0];
  if (!candidate || !file) return;

  if (candidate.labelImageUrl) {
    URL.revokeObjectURL(candidate.labelImageUrl);
  }

  candidate.labelFile = file;
  candidate.labelImageUrl = URL.createObjectURL(file);
  candidate.ocrStatus = "라벨 사진 선택됨";
  renderCandidates();
});

candidateGrid.addEventListener("click", async (event) => {
  const noLabelButton = event.target.closest("[data-no-label]");
  if (noLabelButton) {
    const candidate = state.candidates.find((item) => item.id === noLabelButton.dataset.candidateId);
    if (!candidate) return;
    markNoLabel(candidate);
    renderCandidates();
    return;
  }

  const cropButton = event.target.closest("[data-crop-label]");
  if (cropButton) {
    const candidate = state.candidates.find((item) => item.id === cropButton.dataset.candidateId);
    if (!candidate) return;
    openCropModal(candidate, "label");
    return;
  }

  const productCropButton = event.target.closest("[data-crop-product]");
  if (productCropButton) {
    const candidate = state.candidates.find((item) => item.id === productCropButton.dataset.candidateId);
    if (!candidate) return;
    openCropModal(candidate, "product", false);
    return;
  }

  const button = event.target.closest("[data-read-label]");
  if (!button) return;

  const candidate = state.candidates.find((item) => item.id === button.dataset.candidateId);
  if (!candidate) return;
  await readLabelForCandidate(candidate);
});

cropCloseButton.addEventListener("click", closeCropModal);
cropResetButton.addEventListener("click", () => resetCropRect());
cropReadButton.addEventListener("click", async () => {
  const candidate = state.candidates.find((item) => item.id === state.crop.candidateId);
  if (!candidate) return;

  if (state.crop.mode === "product") {
    confirmProductRect(candidate);
    return;
  }

  const imageDataUrl = await cropCurrentLabelImage();
  closeCropModal();
  await readLabelForCandidate(candidate, imageDataUrl);
});

cropBox.addEventListener("pointerdown", (event) => {
  if (cropModal.classList.contains("hidden")) return;
  const handle = event.target.dataset.cropHandle;

  event.preventDefault();
  cropBox.setPointerCapture(event.pointerId);
  state.crop.drag = {
    mode: handle || "move",
    startX: event.clientX,
    startY: event.clientY,
    startRect: { ...state.crop.rect },
  };
});

cropBox.addEventListener("pointermove", (event) => {
  if (!state.crop.drag) return;

  const imageRect = cropImage.getBoundingClientRect();
  const dx = (event.clientX - state.crop.drag.startX) / imageRect.width;
  const dy = (event.clientY - state.crop.drag.startY) / imageRect.height;
  updateCropRectFromDrag(dx, dy);
});

cropBox.addEventListener("pointerup", () => {
  state.crop.drag = null;
});

imageInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []).slice(0, 5);
  state.candidates = await Promise.all(files.map(createCandidate));
  renderCandidates();
  resultSection.classList.add("hidden");
  openNextUnconfirmedProductCrop();
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
  const { url, orientation } = await createDisplayImageUrl(file);
  const productRect = await detectProductRect(url);
  const metrics = await readImageMetrics(url);

  return {
    id: `candidate-${index + 1}`,
    label: `${index + 1}번 후보`,
    fileName: file.name,
    url,
    orientation,
    productRect,
    productConfirmed: false,
    metrics,
    purchase: {
      price: "",
      weightGram: "",
      grade: "",
      origin: "",
      cut: "",
      expiryDate: "",
      packagedDate: "",
      discount: "",
      pricePer100g: null,
      hasLabel: true,
    },
    labelFile: null,
    labelImageUrl: "",
    ocrStatus: "",
  };
}

function renderCandidates() {
  candidateCount.textContent = `${state.candidates.length} / 5`;
  analyzeButton.disabled = !canAnalyze();

  if (state.candidates.length === 0) {
    candidateGrid.className = "candidate-grid empty-state";
    candidateGrid.innerHTML = "<p>사진을 올리면 이곳에서 후보별 제품 영역과 라벨 정보를 확인합니다.</p>";
    inputHint.textContent = "고기 전체가 보이고 비닐 반사가 적을수록 좋아요.";
    return;
  }

  candidateGrid.className = "candidate-grid";
  inputHint.textContent =
    state.candidates.length < 2
      ? "비교하려면 후보 사진을 1장 더 올려주세요."
      : canAnalyze()
        ? "좋아요. 이제 분석하기를 눌러 후보를 비교할 수 있어요."
        : "분석 전에 각 후보의 제품 영역을 확인해 주세요.";

  candidateGrid.innerHTML = state.candidates
    .map((candidate) => {
      const { colorScore, fatScore, balanceScore } = candidate.metrics.scores;
      return `
        <article class="candidate-card">
          <div class="candidate-image-wrap">
            <img src="${candidate.url}" alt="${candidate.label} 사진" />
            ${productSelectionOverlay(candidate)}
          </div>
          <div class="candidate-body">
            <div class="candidate-title">
              <span>${candidate.label}</span>
              <small>${candidate.productConfirmed ? "제품 영역 확인됨" : "제품 영역 확인 필요"}</small>
              <button data-crop-product data-candidate-id="${candidate.id}" class="tiny-button" type="button">제품 영역 조정</button>
            </div>
            <ul class="metric-list">
              ${metricRow("색 안정감", colorScore)}
              ${metricRow("지방감", fatScore)}
              ${metricRow("사진 품질", balanceScore)}
            </ul>
            ${purchaseInputs(candidate)}
            ${labelOcrControls(candidate)}
          </div>
        </article>
      `;
    })
    .join("");
}

function productSelectionOverlay(candidate) {
  const rect = candidate.productRect || defaultProductRect();
  const label = candidate.productConfirmed ? "분석 영역" : "확인 필요";
  return `
    <div class="product-selection-box" style="left:${rect.x * 100}%; top:${rect.y * 100}%; width:${rect.width * 100}%; height:${rect.height * 100}%;">
      <span>${label}</span>
    </div>
  `;
}

function canAnalyze() {
  return state.candidates.length >= 2 && state.candidates.every((candidate) => candidate.productConfirmed);
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
      <label>
        <span>부위</span>
        <input data-candidate-id="${candidate.id}" data-candidate-field="cut" placeholder="예: 등심" value="${escapeHtml(candidate.purchase.cut)}" />
      </label>
      <label>
        <span>할인</span>
        <input data-candidate-id="${candidate.id}" data-candidate-field="discount" placeholder="예: 20%" value="${escapeHtml(candidate.purchase.discount)}" />
      </label>
      <p id="${candidate.id}-price-per-100g" class="price-per-100g">${formatPricePer100g(candidate)}</p>
    </div>
  `;
}

function labelOcrControls(candidate) {
  const preview = candidate.labelImageUrl
    ? `<img class="label-preview" src="${candidate.labelImageUrl}" alt="${candidate.label} 라벨 사진" />`
    : `<div class="label-placeholder">${candidate.purchase.hasLabel ? "라벨 사진 없음" : "가격표 없음으로 표시됨"}</div>`;

  return `
    <div class="label-ocr-box">
      <div class="label-ocr-header">
        <strong>가격표/라벨</strong>
        <span id="${candidate.id}-ocr-status">${escapeHtml(candidate.ocrStatus || "라벨을 추가하면 자동 입력할 수 있어요.")}</span>
      </div>
      ${preview}
      <div class="label-actions">
        <button data-crop-label data-candidate-id="${candidate.id}" type="button">영역 지정</button>
        <label class="mini-file-button">
          라벨 사진 선택
          <input data-label-input data-candidate-id="${candidate.id}" type="file" accept="image/*" />
        </label>
        <button data-read-label data-candidate-id="${candidate.id}" type="button" ${candidate.labelFile ? "" : "disabled"}>라벨 읽기</button>
        <button data-no-label data-candidate-id="${candidate.id}" class="ghost-button" type="button">가격표 없음</button>
      </div>
    </div>
  `;
}

function defaultProductRect() {
  return { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
}

function markNoLabel(candidate) {
  candidate.purchase.hasLabel = false;
  candidate.labelFile = null;
  if (candidate.labelImageUrl) {
    URL.revokeObjectURL(candidate.labelImageUrl);
  }
  candidate.labelImageUrl = "";
  candidate.ocrStatus = "가격표 없음으로 표시했습니다. 가격 정보 없이 분석합니다.";
  ["price", "weightGram", "grade", "origin", "cut", "expiryDate", "packagedDate", "discount"].forEach((field) => {
    candidate.purchase[field] = "";
  });
  candidate.purchase.pricePer100g = null;
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

async function readLabelForCandidate(candidate, providedImageDataUrl = "") {
  if (!candidate.labelImageUrl && !providedImageDataUrl) return;

  setCandidateOcrStatus(candidate, "라벨 읽는 중...");

  try {
    const imageDataUrl = providedImageDataUrl || (await resizeImageForApi(candidate.labelImageUrl));
    const response = await fetch("/api/ocr-label", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        candidateId: candidate.id,
        imageDataUrl,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(readableOcrError(payload));
    }

    applyOcrResult(candidate, payload);
    if (payload.limits && state.serverStatus) {
      state.serverStatus.dailyOcrCalls = payload.limits.dailyOcrCalls;
      state.serverStatus.maxDailyOcrCalls = payload.limits.maxDailyOcrCalls;
      updateLiveHint();
    }
    renderCandidates();
  } catch (error) {
    console.warn("Label OCR failed.", error);
    setCandidateOcrStatus(candidate, error.message || "라벨 읽기에 실패했습니다.");
  }
}

function applyOcrResult(candidate, payload) {
  const fields = ["price", "weightGram", "grade", "origin", "cut", "expiryDate", "packagedDate", "discount"];
  fields.forEach((field) => {
    if (payload[field] !== null && payload[field] !== undefined && payload[field] !== "") {
      candidate.purchase[field] = String(payload[field]);
    }
  });

  updatePricePer100g(candidate);
  candidate.purchase.hasLabel = true;
  candidate.ocrStatus = confidenceText(payload.confidence, payload.warnings);
}

function setCandidateOcrStatus(candidate, message) {
  candidate.ocrStatus = message;
  const element = document.querySelector(`#${candidate.id}-ocr-status`);
  if (element) {
    element.textContent = message;
  }
}

function confidenceText(confidence, warnings = []) {
  const label = confidenceLabelFromLlm(confidence);
  const warningText = warnings?.length ? ` · ${warnings.join(", ")}` : "";
  return `라벨 읽기 완료: 신뢰도 ${label}${warningText}`;
}

function readableOcrError(payload) {
  const error = payload?.error;
  if (error === "OPENAI_QUOTA_EXCEEDED") {
    return "OpenAI API 쿼터 또는 결제 한도 때문에 라벨을 읽지 못했습니다.";
  }
  if (error === "OPENAI_AUTH_FAILED") {
    return "OpenAI API key 인증에 실패했습니다.";
  }
  if (error === "DAILY_OCR_LIMIT_REACHED") {
    return "오늘의 라벨 읽기 횟수 제한에 도달했습니다.";
  }
  return payload?.message || payload?.error || "라벨 읽기에 실패했습니다.";
}

function openCropModal(candidate, mode, sequence = false) {
  state.crop.candidateId = candidate.id;
  state.crop.mode = mode;
  state.crop.sequence = sequence;
  state.crop.rect = mode === "product" ? { ...(candidate.productRect || defaultProductRect()) } : { x: 0.22, y: 0.22, width: 0.56, height: 0.28 };
  cropEyebrow.textContent = mode === "product" ? "제품 영역 지정" : "라벨 영역 지정";
  cropTitle.textContent =
    mode === "product"
      ? `${candidate.label}에서 분석할 고기 제품 영역을 맞춰주세요`
      : "가격표가 보이는 영역을 맞춰주세요";
  cropReadButton.textContent = mode === "product" ? "이 영역으로 지정" : "이 영역으로 라벨 읽기";
  cropImage.src = candidate.url;
  cropModal.classList.remove("hidden");
  cropImage.onload = () => requestAnimationFrame(renderCropBox);
  requestAnimationFrame(renderCropBox);
}

function closeCropModal() {
  cropModal.classList.add("hidden");
  state.crop.drag = null;
}

function resetCropRect() {
  state.crop.rect = state.crop.mode === "product" ? defaultProductRect() : { x: 0.22, y: 0.22, width: 0.56, height: 0.28 };
  renderCropBox();
}

function confirmProductRect(candidate) {
  candidate.productRect = { ...state.crop.rect };
  candidate.productConfirmed = true;
  closeCropModal();
  renderCandidates();

  if (state.crop.sequence) {
    openNextUnconfirmedProductCrop();
  }
}

function openNextUnconfirmedProductCrop() {
  const nextCandidate = state.candidates.find((candidate) => !candidate.productConfirmed);
  if (!nextCandidate) return;
  openCropModal(nextCandidate, "product", true);
}

function renderCropBox() {
  const { x, y, width, height } = state.crop.rect;
  const stageRect = cropStage.getBoundingClientRect();
  const imageRect = cropImage.getBoundingClientRect();
  const offsetX = imageRect.left - stageRect.left;
  const offsetY = imageRect.top - stageRect.top;

  cropBox.style.left = `${offsetX + x * imageRect.width}px`;
  cropBox.style.top = `${offsetY + y * imageRect.height}px`;
  cropBox.style.width = `${width * imageRect.width}px`;
  cropBox.style.height = `${height * imageRect.height}px`;
}

function updateCropRectFromDrag(dx, dy) {
  const { mode, startRect } = state.crop.drag;
  const minSize = 0.08;
  let next = { ...startRect };

  if (mode === "move") {
    next.x = startRect.x + dx;
    next.y = startRect.y + dy;
  }

  if (mode.includes("e")) {
    next.width = startRect.width + dx;
  }
  if (mode.includes("s")) {
    next.height = startRect.height + dy;
  }
  if (mode.includes("w")) {
    next.x = startRect.x + dx;
    next.width = startRect.width - dx;
  }
  if (mode.includes("n")) {
    next.y = startRect.y + dy;
    next.height = startRect.height - dy;
  }

  if (next.width < minSize) {
    next.width = minSize;
  }
  if (next.height < minSize) {
    next.height = minSize;
  }

  next.x = Math.max(0, Math.min(1 - next.width, next.x));
  next.y = Math.max(0, Math.min(1 - next.height, next.y));
  next.width = Math.min(next.width, 1 - next.x);
  next.height = Math.min(next.height, 1 - next.y);

  state.crop.rect = next;
  renderCropBox();
}

function cropCurrentLabelImage() {
  return cropImageForApi(cropImage.src, state.crop.rect, 0.78);
}

function cropImageForApi(url, rect, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const { x, y, width, height } = rect;
      const sourceX = Math.round(image.naturalWidth * x);
      const sourceY = Math.round(image.naturalHeight * y);
      const sourceW = Math.round(image.naturalWidth * width);
      const sourceH = Math.round(image.naturalHeight * height);
      const maxSide = 768;
      const scale = Math.min(1, maxSide / Math.max(sourceW, sourceH));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceW * scale));
      canvas.height = Math.max(1, Math.round(sourceH * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = reject;
    image.src = url;
  });
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
  const ocrRemaining = Math.max(0, (state.serverStatus.maxDailyOcrCalls || 0) - (state.serverStatus.dailyOcrCalls || 0));
  inputHint.textContent = state.serverStatus.apiKeyConfigured
    ? `실제 LLM 분석이 켜져 있습니다. 분석 ${remaining}회, 라벨 읽기 ${ocrRemaining}회 남음.`
    : "API key가 없어 임시 분석만 사용할 수 있습니다.";
  if (liveStatus) {
    liveStatus.textContent = state.serverStatus.apiKeyConfigured
      ? `LLM ON · 분석 ${remaining}회 · OCR ${ocrRemaining}회`
      : "로컬 임시 분석 모드";
  }
}

function setAnalyzing(isAnalyzing) {
  analyzeButton.disabled = isAnalyzing || !canAnalyze();
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
      imageDataUrl: await cropImageForApi(candidate.url, candidate.productRect || defaultProductRect()),
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
    cut: purchase.cut || "",
    expiryDate: purchase.expiryDate || "",
    packagedDate: purchase.packagedDate || "",
    discount: purchase.discount || "",
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
  if (normalized.cut) parts.push(escapeHtml(normalized.cut));
  if (normalized.discount) parts.push(`할인 ${escapeHtml(normalized.discount)}`);
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

async function createDisplayImageUrl(file) {
  const orientation = await readExifOrientation(file);
  const sourceUrl = URL.createObjectURL(file);

  try {
    if (orientation === 1) {
      return { url: sourceUrl, orientation };
    }

    const correctedUrl = await drawOrientedImage(sourceUrl, orientation);
    URL.revokeObjectURL(sourceUrl);
    return { url: correctedUrl, orientation };
  } catch {
    return { url: sourceUrl, orientation: 1 };
  }
}

function detectProductRect(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const size = 220;
      const ratio = image.naturalWidth / image.naturalHeight || 1;
      const canvas = document.createElement("canvas");
      canvas.width = ratio >= 1 ? size : Math.round(size * ratio);
      canvas.height = ratio >= 1 ? Math.round(size / ratio) : size;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const bounds = detectContentBounds(pixels, canvas.width, canvas.height);
      resolve(bounds || defaultProductRect());
    };
    image.onerror = () => resolve(defaultProductRect());
    image.src = url;
  });
}

function detectContentBounds(pixels, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hits = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const brightness = (r + g + b) / 3;
      const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      const meatLike = r > 80 && r > g * 1.04 && r > b * 1.08;
      const labelLike = brightness > 135 && saturation < 0.28;
      const edgeLike = brightness < 80 || saturation > 0.22;

      if (meatLike || labelLike || edgeLike) {
        hits += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const hitRatio = hits / ((width * height) / 4);
  if (hits < 40 || hitRatio < 0.02) return null;

  const paddingX = width * 0.05;
  const paddingY = height * 0.05;
  const x = clampUnit((minX - paddingX) / width);
  const y = clampUnit((minY - paddingY) / height);
  const right = clampUnit((maxX + paddingX) / width);
  const bottom = clampUnit((maxY + paddingY) / height);
  const rect = {
    x,
    y,
    width: Math.max(0.18, right - x),
    height: Math.max(0.18, bottom - y),
  };

  if (rect.width > 0.96 && rect.height > 0.96) {
    return defaultProductRect();
  }

  rect.width = Math.min(rect.width, 1 - rect.x);
  rect.height = Math.min(rect.height, 1 - rect.y);
  return rect;
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
}

function drawOrientedImage(url, orientation) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const swapsSize = [5, 6, 7, 8].includes(orientation);
      const canvas = document.createElement("canvas");
      canvas.width = swapsSize ? image.naturalHeight : image.naturalWidth;
      canvas.height = swapsSize ? image.naturalWidth : image.naturalHeight;
      const context = canvas.getContext("2d");
      applyOrientationTransform(context, orientation, image.naturalWidth, image.naturalHeight);
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    image.onerror = reject;
    image.src = url;
  });
}

function applyOrientationTransform(context, orientation, width, height) {
  switch (orientation) {
    case 2:
      context.translate(width, 0);
      context.scale(-1, 1);
      break;
    case 3:
      context.translate(width, height);
      context.rotate(Math.PI);
      break;
    case 4:
      context.translate(0, height);
      context.scale(1, -1);
      break;
    case 5:
      context.rotate(0.5 * Math.PI);
      context.scale(1, -1);
      break;
    case 6:
      context.translate(height, 0);
      context.rotate(0.5 * Math.PI);
      break;
    case 7:
      context.translate(height, width);
      context.rotate(0.5 * Math.PI);
      context.scale(-1, 1);
      break;
    case 8:
      context.translate(0, width);
      context.rotate(-0.5 * Math.PI);
      break;
  }
}

async function readExifOrientation(file) {
  const buffer = await file.slice(0, 64 * 1024).arrayBuffer();
  const view = new DataView(buffer);

  if (view.getUint16(0, false) !== 0xffd8) return 1;

  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    if (marker === 0xffe1) {
      const length = view.getUint16(offset, false);
      const exifStart = offset + 2;
      if (getAscii(view, exifStart, 4) !== "Exif") return 1;

      const tiffStart = exifStart + 6;
      const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
      const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
      const ifdStart = tiffStart + firstIfdOffset;
      const entries = view.getUint16(ifdStart, littleEndian);

      for (let index = 0; index < entries; index += 1) {
        const entryOffset = ifdStart + 2 + index * 12;
        const tag = view.getUint16(entryOffset, littleEndian);
        if (tag === 0x0112) {
          return view.getUint16(entryOffset + 8, littleEndian) || 1;
        }
      }

      return 1;
    }

    if ((marker & 0xff00) !== 0xff00) break;
    offset += view.getUint16(offset, false);
  }

  return 1;
}

function getAscii(view, offset, length) {
  let text = "";
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(view.getUint8(offset + index));
  }
  return text;
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
