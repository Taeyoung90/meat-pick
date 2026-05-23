const imageInput = document.querySelector("#imageInput");
const analyzeButton = document.querySelector("#analyzeButton");
const resetButton = document.querySelector("#resetButton");
const demoButton = document.querySelector("#demoButton");
const candidateGrid = document.querySelector("#candidateGrid");
const candidateCount = document.querySelector("#candidateCount");
const inputHint = document.querySelector("#inputHint");
const liveStatus = document.querySelector("#liveStatus");
const heroEyebrow = document.querySelector("#heroEyebrow");
const heroTitle = document.querySelector("#heroTitle");
const heroCopy = document.querySelector("#heroCopy");
const modeTitle = document.querySelector("#modeTitle");
const modeDescription = document.querySelector("#modeDescription");
const preferenceTitle = document.querySelector("#preferenceTitle");
const preferenceGrid = document.querySelector("#preferenceGrid");
const signalChips = document.querySelector("#signalChips");
const dropCopy = document.querySelector("#dropCopy");
const candidateHeading = document.querySelector("#candidateHeading");
const historySection = document.querySelector("#historySection");
const historyList = document.querySelector("#historyList");
const clearHistoryButton = document.querySelector("#clearHistoryButton");
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

const SCAN_STAGES = [
  "제품 영역 스캔 중",
  "색상과 표면 단서 확인 중",
  "사진 품질 비교 중",
  "라벨 정보 반영 중",
  "최종 후보 정렬 중",
];
const HISTORY_KEY = "fresh-pick-analysis-history";
const LEGACY_HISTORY_KEY = "meat-pick-analysis-history";
const USER_PREFS_KEY = "fresh-pick-user-preferences";
const MAX_HISTORY_ITEMS = 8;
const PRODUCT_MODES = {
  "beef-grill": {
    label: "소고기 구이용",
    itemLabel: "고기",
    heroEyebrow: "신선식품 선택 MVP",
    heroTitle: "지금 진열대에서 고를 신선식품을 비교해보세요",
    heroCopy: "고기나 야채 후보 사진을 2장 이상 올리면 상품 영역을 먼저 확인하고, 사진상 가장 좋아 보이는 후보와 이유를 정리합니다.",
    description: "구이용 식감, 지방 분포, 색 안정감, 포장 반사를 우선으로 봅니다.",
    scanStages: ["상품 영역 스캔 중", "지방 분포 확인 중", "색상 안정성 비교 중", "라벨 정보 반영 중", "최종 후보 정렬 중"],
    dropCopy: "2~5장의 소고기 후보 사진을 올려주세요.",
    emptyText: "사진을 올리면 후보별 상품 영역과 라벨 정보를 확인합니다.",
    hint: "고기 전체가 보이고 비닐 반사가 적을수록 좋아요.",
    candidateHeading: "업로드한 고기",
    productCropTitle: "분석할 고기 상품 영역을 맞춰주세요",
    resultDetailTitle: "고기 분석",
    primaryRecommendationLabel: "맛 우선",
    primaryFallback: "사진상 품질과 구이용 적합도를 우선해 추천했습니다.",
    guideSignals: ["색 안정감", "지방 분포", "포장 반사", "가성비"],
    metrics: ["색 안정감", "지방감", "사진 품질"],
    analysisLabels: {
      primarySignal: "지방량",
      distributionSignal: "지방 분포",
      colorTone: "색상",
      surfaceSignal: "표면/사진",
      overall: "종합",
    },
    preferences: [
      ["balanced", "균형"],
      ["lean", "담백함"],
      ["rich", "고소함"],
      ["tender", "부드러움"],
      ["value", "가성비"],
    ],
  },
  "leafy-greens": {
    label: "잎채소",
    itemLabel: "야채",
    heroEyebrow: "신선식품 선택 MVP",
    heroTitle: "싱싱해 보이는 야채를 사진으로 비교해보세요",
    heroCopy: "잎채소 후보 사진을 올리면 색 선명도, 시든 부분, 상처/변색 신호를 기준으로 구매 후보를 정리합니다.",
    description: "잎의 생기, 색상 균일도, 시든 정도, 상처/변색을 우선으로 봅니다.",
    scanStages: ["상품 영역 스캔 중", "잎의 생기 확인 중", "상처/변색 신호 비교 중", "라벨 정보 반영 중", "최종 후보 정렬 중"],
    dropCopy: "2~5장의 잎채소 후보 사진을 올려주세요.",
    emptyText: "사진을 올리면 잎채소 후보별 상품 영역과 라벨 정보를 확인합니다.",
    hint: "잎 전체가 보이고 누렇게 뜬 부분이나 물러 보이는 부분이 잘 보이면 좋아요.",
    candidateHeading: "업로드한 잎채소",
    productCropTitle: "분석할 야채 상품 영역을 맞춰주세요",
    resultDetailTitle: "야채 분석",
    primaryRecommendationLabel: "신선도 우선",
    primaryFallback: "사진상 색과 생기, 상처가 적은 정도를 우선해 추천했습니다.",
    guideSignals: ["색 선명도", "잎의 생기", "변색/시듦", "가성비"],
    metrics: ["색 선명도", "생기감", "사진 품질"],
    analysisLabels: {
      primarySignal: "생기",
      distributionSignal: "형태/균일도",
      colorTone: "색상",
      surfaceSignal: "상처/시듦",
      overall: "종합",
    },
    preferences: [
      ["balanced", "균형"],
      ["vivid", "색 선명도"],
      ["crisp", "싱싱함"],
      ["clean", "상처 적음"],
      ["value", "가성비"],
    ],
  },
  tomato: {
    label: "토마토",
    itemLabel: "야채",
    heroEyebrow: "신선식품 선택 MVP",
    heroTitle: "색과 표면이 좋아 보이는 토마토를 비교해보세요",
    heroCopy: "토마토 후보 사진을 올리면 색 균일도, 표면 상처, 무름 의심 신호를 기준으로 구매 후보를 정리합니다.",
    description: "붉은 색 균일도, 표면 탄탄함, 상처/무름 신호, 크기 균형을 우선으로 봅니다.",
    scanStages: ["상품 영역 스캔 중", "색 균일도 확인 중", "표면 상처 신호 비교 중", "라벨 정보 반영 중", "최종 후보 정렬 중"],
    dropCopy: "2~5장의 토마토 후보 사진을 올려주세요.",
    emptyText: "사진을 올리면 토마토 후보별 상품 영역과 라벨 정보를 확인합니다.",
    hint: "토마토 표면 전체가 보이고 눌림이나 상처 부분이 가려지지 않게 찍어주세요.",
    candidateHeading: "업로드한 토마토",
    productCropTitle: "분석할 토마토 상품 영역을 맞춰주세요",
    resultDetailTitle: "토마토 분석",
    primaryRecommendationLabel: "상태 우선",
    primaryFallback: "사진상 색 균일도와 표면 안정감을 우선해 추천했습니다.",
    guideSignals: ["색 균일도", "표면 상처", "눌림/무름", "가성비"],
    metrics: ["색 균일도", "표면 안정감", "사진 품질"],
    analysisLabels: {
      primarySignal: "색/숙도",
      distributionSignal: "크기/형태",
      colorTone: "색상",
      surfaceSignal: "표면/상처",
      overall: "종합",
    },
    preferences: [
      ["balanced", "균형"],
      ["vivid", "색 균일도"],
      ["firm", "탄탄함"],
      ["clean", "상처 적음"],
      ["value", "가성비"],
    ],
  },
  cucumber: {
    label: "오이",
    itemLabel: "야채",
    heroEyebrow: "신선식품 선택 MVP",
    heroTitle: "단단하고 싱싱해 보이는 오이를 비교해보세요",
    heroCopy: "오이 후보 사진을 올리면 초록색 선명도, 표면 주름, 눌림/상처 신호를 기준으로 구매 후보를 정리합니다.",
    description: "초록색 선명도, 표면 탄탄함, 주름/상처/무름 의심 신호를 우선으로 봅니다.",
    scanStages: ["상품 영역 스캔 중", "초록색 선명도 확인 중", "표면 주름/상처 비교 중", "라벨 정보 반영 중", "최종 후보 정렬 중"],
    dropCopy: "2~5장의 오이 후보 사진을 올려주세요.",
    emptyText: "사진을 올리면 오이 후보별 상품 영역과 라벨 정보를 확인합니다.",
    hint: "오이 전체 길이와 표면 돌기, 눌린 부분이 가려지지 않게 찍어주세요.",
    candidateHeading: "업로드한 오이",
    productCropTitle: "분석할 오이 상품 영역을 맞춰주세요",
    resultDetailTitle: "오이 분석",
    primaryRecommendationLabel: "신선도 우선",
    primaryFallback: "사진상 색 선명도와 표면 안정감을 우선해 추천했습니다.",
    guideSignals: ["초록색 선명도", "표면 탄탄함", "주름/상처", "가성비"],
    metrics: ["색 선명도", "표면 안정감", "사진 품질"],
    analysisLabels: {
      primarySignal: "생기/탄탄함",
      distributionSignal: "형태/균일도",
      colorTone: "색상",
      surfaceSignal: "표면/상처",
      overall: "종합",
    },
    preferences: [
      ["balanced", "균형"],
      ["vivid", "색 선명도"],
      ["firm", "탄탄함"],
      ["clean", "상처 적음"],
      ["value", "가성비"],
    ],
  },
  apple: {
    label: "사과",
    itemLabel: "과일",
    heroEyebrow: "신선식품 선택 MVP",
    heroTitle: "색과 표면이 좋아 보이는 사과를 비교해보세요",
    heroCopy: "사과 후보 사진을 올리면 색 균일도, 표면 멍/상처, 윤기와 눌림 의심 신호를 기준으로 구매 후보를 정리합니다.",
    description: "색 균일도, 표면 상처/멍, 눌림 의심 신호, 윤기와 반사를 우선으로 봅니다.",
    scanStages: ["상품 영역 스캔 중", "색 균일도 확인 중", "멍/상처 신호 비교 중", "라벨 정보 반영 중", "최종 후보 정렬 중"],
    dropCopy: "2~5장의 사과 후보 사진을 올려주세요.",
    emptyText: "사진을 올리면 사과 후보별 상품 영역과 라벨 정보를 확인합니다.",
    hint: "사과 표면 전체가 보이고 멍, 흠집, 눌린 부분이 가려지지 않게 찍어주세요.",
    candidateHeading: "업로드한 사과",
    productCropTitle: "분석할 사과 상품 영역을 맞춰주세요",
    resultDetailTitle: "사과 분석",
    primaryRecommendationLabel: "상태 우선",
    primaryFallback: "사진상 색 균일도와 표면 안정감을 우선해 추천했습니다.",
    guideSignals: ["색 균일도", "표면 멍/상처", "눌림 신호", "가성비"],
    metrics: ["색 균일도", "표면 안정감", "사진 품질"],
    analysisLabels: {
      primarySignal: "색/숙도",
      distributionSignal: "형태/균일도",
      colorTone: "색상",
      surfaceSignal: "표면/상처",
      overall: "종합",
    },
    preferences: [
      ["balanced", "균형"],
      ["vivid", "색 균일도"],
      ["firm", "탄탄함"],
      ["clean", "상처 적음"],
      ["value", "가성비"],
    ],
  },
};

const state = {
  productMode: readUserPreferences().lastProductMode || "beef-grill",
  candidates: [],
  serverStatus: null,
  isAnalyzing: false,
  scanStageIndex: 0,
  scanTimer: null,
  crop: {
    candidateId: "",
    mode: "label",
    sequence: false,
    rect: { x: 0.22, y: 0.22, width: 0.56, height: 0.28 },
    drag: null,
  },
};

fetchServerStatus();
applyModeConfig();
renderHistory();

document.querySelectorAll("input[name='productMode']").forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    changeProductMode(input.value);
  });
});

preferenceGrid?.addEventListener("change", (event) => {
  const input = event.target.closest("input[name='preference']");
  if (!input?.checked) return;
  savePreferenceForMode(state.productMode, input.value);
});

clearHistoryButton?.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(LEGACY_HISTORY_KEY);
  renderHistory();
});

historyList?.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-history]");
  if (deleteButton) {
    const history = readHistory().filter((item) => item.id !== deleteButton.dataset.deleteHistory);
    writeHistory(history);
    renderHistory();
    return;
  }

  const restoreButton = event.target.closest("[data-restore-history]");
  if (restoreButton) {
    restoreHistoryResult(restoreButton.dataset.restoreHistory);
  }
});

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

demoButton?.addEventListener("click", async () => {
  setAnalyzing(false);
  state.candidates.forEach((candidate) => URL.revokeObjectURL(candidate.url));
  state.candidates = await createDemoCandidates(state.productMode);
  imageInput.value = "";
  renderCandidates();
  const preference = document.querySelector("input[name='preference']:checked")?.value || "balanced";
  const result = analyzeCandidates(state.candidates, preference);
  result.source = "local";
  result.isDemo = true;
  result.notices = ["샘플 분석은 화면 검증용 가상 이미지 기반 결과입니다.", "실제 구매 판단에는 직접 촬영한 후보 사진을 사용해 주세요."];
  renderResult(result);
});

function currentMode() {
  return PRODUCT_MODES[state.productMode] || PRODUCT_MODES["beef-grill"];
}

function changeProductMode(mode) {
  if (!PRODUCT_MODES[mode] || state.productMode === mode) return;
  state.productMode = mode;
  saveLastProductMode(mode);
  state.candidates.forEach((candidate) => URL.revokeObjectURL(candidate.url));
  state.candidates = [];
  imageInput.value = "";
  resultSection.classList.add("hidden");
  applyModeConfig();
  renderCandidates();
}

function applyModeConfig() {
  const config = currentMode();
  const prefs = readUserPreferences();
  document.querySelectorAll("input[name='productMode']").forEach((input) => {
    input.checked = input.value === state.productMode;
  });
  heroEyebrow.textContent = config.heroEyebrow;
  heroTitle.textContent = config.heroTitle;
  heroCopy.textContent = config.heroCopy;
  modeTitle.textContent = config.label;
  modeDescription.textContent = config.description;
  dropCopy.textContent = config.dropCopy;
  inputHint.textContent = config.hint;
  candidateHeading.textContent = config.candidateHeading;
  preferenceTitle.textContent = `${config.label} 기준`;
  const savedPreference = prefs.byMode?.[state.productMode] || config.preferences[0]?.[0] || "balanced";
  preferenceGrid.innerHTML = config.preferences
    .map(
      ([value, label], index) => `
        <label>
          <input type="radio" name="preference" value="${value}" ${value === savedPreference || (!config.preferences.some(([candidate]) => candidate === savedPreference) && index === 0) ? "checked" : ""} />
          <span>${label}</span>
        </label>
      `,
    )
    .join("");
  if (signalChips) {
    signalChips.innerHTML = (config.guideSignals || [])
      .map((signal) => `<span>${escapeHtml(signal)}</span>`)
      .join("");
  }
}

function readUserPreferences() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_PREFS_KEY) || "{}");
    return {
      lastProductMode: PRODUCT_MODES[parsed.lastProductMode] ? parsed.lastProductMode : "",
      byMode: parsed.byMode && typeof parsed.byMode === "object" ? parsed.byMode : {},
    };
  } catch {
    return { lastProductMode: "", byMode: {} };
  }
}

function writeUserPreferences(next) {
  localStorage.setItem(USER_PREFS_KEY, JSON.stringify(next));
}

function saveLastProductMode(mode) {
  const prefs = readUserPreferences();
  writeUserPreferences({ ...prefs, lastProductMode: PRODUCT_MODES[mode] ? mode : "beef-grill" });
}

function savePreferenceForMode(mode, preference) {
  const prefs = readUserPreferences();
  writeUserPreferences({
    ...prefs,
    lastProductMode: PRODUCT_MODES[mode] ? mode : prefs.lastProductMode,
    byMode: {
      ...(prefs.byMode || {}),
      [mode]: preference,
    },
  });
}

async function createCandidate(file, index) {
  const { url, orientation } = await createDisplayImageUrl(file);
  const productRect = await detectProductRect(url, state.productMode);
  const metrics = await readImageMetrics(url);
  metrics.scores = scoreMetricsForMode(metrics, state.productMode);

  return {
    id: `candidate-${index + 1}`,
    label: `${index + 1}번 후보`,
    fileName: file.name,
    productMode: state.productMode,
    url,
    orientation,
    productRect,
    productConfirmed: false,
    metrics,
    qualityWarnings: buildQualityWarnings(metrics, productRect),
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
    ocrResult: null,
  };
}

async function createDemoCandidates(mode) {
  const samples = [0, 1, 2].map((index) => createDemoCandidateImage(mode, index));
  return await Promise.all(
    samples.map(async (sample, index) => {
      const metrics = await readImageMetrics(sample.url);
      metrics.scores = scoreMetricsForMode(metrics, mode);
      const candidate = {
        id: `candidate-${index + 1}`,
        label: `${index + 1}번 후보`,
        fileName: `demo-${mode}-${index + 1}.png`,
        productMode: mode,
        url: sample.url,
        orientation: 1,
        productRect: sample.productRect,
        productConfirmed: true,
        isDemo: true,
        metrics,
        qualityWarnings: buildQualityWarnings(metrics, sample.productRect),
        purchase: {
          price: sample.price,
          weightGram: sample.weightGram,
          grade: sample.grade || "",
          origin: sample.origin,
          cut: sample.cut,
          expiryDate: sample.expiryDate,
          packagedDate: sample.packagedDate,
          discount: sample.discount || "",
          pricePer100g: null,
          hasLabel: true,
        },
        labelFile: null,
        labelImageUrl: "",
        ocrStatus: "샘플 라벨 정보 적용됨",
        ocrResult: { confidence: "medium", warnings: ["샘플 데이터입니다."] },
      };
      updatePricePer100g(candidate);
      return candidate;
    }),
  );
}

function createDemoCandidateImage(mode, index) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  const quality = [0.92, 0.74, 0.58][index] || 0.6;
  const glare = index === 1 ? 0.16 : index === 2 ? 0.08 : 0.03;
  const bruise = index === 2 ? 0.22 : index === 1 ? 0.1 : 0.03;

  context.fillStyle = "#f8fbf4";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  roundRect(context, 78, 60, 804, 560, 34);
  context.fill();
  context.strokeStyle = "#dcebdd";
  context.lineWidth = 5;
  context.stroke();

  if (mode === "beef-grill") {
    drawDemoMeat(context, quality, glare, bruise);
  } else if (mode === "tomato") {
    drawDemoRoundProduce(context, "#d84435", "#f07c61", quality, glare, bruise);
  } else if (mode === "apple") {
    drawDemoRoundProduce(context, "#d63f32", "#f2b84b", quality, glare, bruise);
  } else if (mode === "cucumber") {
    drawDemoCucumber(context, quality, glare, bruise);
  } else {
    drawDemoLeafy(context, quality, glare, bruise);
  }

  drawDemoLabel(context, index);

  return {
    url: canvas.toDataURL("image/png"),
    productRect: { x: 0.08, y: 0.08, width: 0.84, height: 0.78 },
    price: String([9800, 7600, 6900][index]),
    weightGram: String([420, 380, 360][index]),
    origin: index === 0 ? "국내산" : "매장 표시",
    cut: currentMode().label,
    packagedDate: "2026-05-24",
    expiryDate: "2026-05-27",
    discount: index === 2 ? "10%" : "",
  };
}

function drawDemoMeat(context, quality, glare, bruise) {
  context.save();
  roundRect(context, 160, 125, 560, 330, 26);
  context.clip();
  context.fillStyle = `rgb(${Math.round(175 * quality)}, ${Math.round(54 + 35 * quality)}, ${Math.round(48 + 35 * quality)})`;
  context.fillRect(160, 125, 560, 330);
  context.strokeStyle = "rgba(255, 232, 215, 0.78)";
  context.lineWidth = 16;
  for (let index = 0; index < 7; index += 1) {
    context.beginPath();
    context.moveTo(140, 150 + index * 48);
    context.bezierCurveTo(280, 110 + index * 52, 420, 220 + index * 24, 740, 150 + index * 44);
    context.stroke();
  }
  drawDemoBruise(context, 540, 330, 90 * bruise, "rgba(90, 35, 32, 0.38)");
  context.restore();
  drawDemoGlare(context, glare);
}

function drawDemoLeafy(context, quality, glare, bruise) {
  for (let index = 0; index < 9; index += 1) {
    context.save();
    context.translate(430 + Math.cos(index) * 110, 300 + Math.sin(index * 1.2) * 92);
    context.rotate((index - 4) * 0.22);
    context.fillStyle = `rgb(${Math.round(34 + 30 * quality)}, ${Math.round(118 + 82 * quality)}, ${Math.round(58 + 30 * quality)})`;
    context.beginPath();
    context.ellipse(0, 0, 70, 170, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.34)";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, -130);
    context.lineTo(0, 130);
    context.stroke();
    context.restore();
  }
  drawDemoBruise(context, 585, 392, 110 * bruise, "rgba(125, 92, 29, 0.38)");
  drawDemoGlare(context, glare);
}

function drawDemoRoundProduce(context, colorA, colorB, quality, glare, bruise) {
  const centers = [
    [325, 265],
    [500, 275],
    [420, 430],
  ];
  centers.forEach(([x, y], itemIndex) => {
    const gradient = context.createRadialGradient(x - 34, y - 42, 20, x, y, 118);
    gradient.addColorStop(0, colorB);
    gradient.addColorStop(1, colorA);
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, 112, 104, itemIndex * 0.12, 0, Math.PI * 2);
    context.fill();
  });
  drawDemoBruise(context, 565, 382, 118 * bruise, "rgba(78, 55, 34, 0.42)");
  drawDemoGlare(context, glare + (1 - quality) * 0.04);
}

function drawDemoCucumber(context, quality, glare, bruise) {
  context.save();
  context.translate(430, 325);
  context.rotate(-0.12);
  for (let index = 0; index < 3; index += 1) {
    context.fillStyle = `rgb(${Math.round(36 + 20 * quality)}, ${Math.round(126 + 76 * quality)}, ${Math.round(62 + 24 * quality)})`;
    roundRect(context, -285 + index * 22, -95 + index * 72, 570, 82, 40);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.22)";
    context.lineWidth = 4;
    context.stroke();
  }
  context.restore();
  drawDemoBruise(context, 585, 350, 100 * bruise, "rgba(105, 88, 35, 0.38)");
  drawDemoGlare(context, glare);
}

function drawDemoLabel(context, index) {
  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  roundRect(context, 610, 465, 190, 105, 12);
  context.fill();
  context.strokeStyle = "#dcebdd";
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = "#1f2a23";
  context.font = "700 24px Arial";
  context.fillText(`${[9800, 7600, 6900][index].toLocaleString("ko-KR")}원`, 632, 508);
  context.font = "600 16px Arial";
  context.fillText(`${[420, 380, 360][index]}g`, 634, 538);
}

function drawDemoBruise(context, x, y, radius, color) {
  if (radius <= 4) return;
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(x, y, radius, radius * 0.72, -0.4, 0, Math.PI * 2);
  context.fill();
}

function drawDemoGlare(context, amount) {
  if (amount <= 0.04) return;
  context.fillStyle = `rgba(255, 255, 255, ${Math.min(0.56, amount * 2.4)})`;
  context.beginPath();
  context.ellipse(385, 210, 185, 42, -0.34, 0, Math.PI * 2);
  context.fill();
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function renderCandidates() {
  const config = currentMode();
  candidateCount.textContent = `${state.candidates.length} / 5`;
  analyzeButton.disabled = state.isAnalyzing || !canAnalyze();

  if (state.candidates.length === 0) {
    candidateGrid.className = "candidate-grid empty-state";
    candidateGrid.innerHTML = `<p>${config.emptyText}</p>`;
    inputHint.textContent = config.hint;
    return;
  }

  candidateGrid.className = "candidate-grid";
  const scanStages = config.scanStages || SCAN_STAGES;
  inputHint.textContent = state.isAnalyzing
    ? scanStages[state.scanStageIndex % scanStages.length]
    : state.candidates.length < 2
      ? "비교하려면 후보 사진을 1장 더 올려주세요."
      : canAnalyze()
        ? "좋아요. 이제 분석하기를 눌러 후보를 비교할 수 있어요."
        : "분석 전에 각 후보의 제품 영역을 확인해 주세요.";

  candidateGrid.innerHTML = state.candidates
    .map((candidate) => {
      const { colorScore, fatScore, balanceScore } = candidate.metrics.scores;
      const [firstMetric, secondMetric, thirdMetric] = config.metrics;
      return `
        <article class="candidate-card ${state.isAnalyzing ? "is-scanning" : ""}">
          <div class="candidate-image-wrap">
            <img src="${candidate.url}" alt="${candidate.label} 사진" />
            ${productSelectionOverlay(candidate)}
            ${scanOverlay(candidate)}
          </div>
          <div class="candidate-body">
            <div class="candidate-title">
              <span>${candidate.label}</span>
              <small>${candidate.isDemo ? "샘플 후보" : candidate.productConfirmed ? "제품 영역 확인됨" : "제품 영역 확인 필요"}</small>
              <button data-crop-product data-candidate-id="${candidate.id}" class="tiny-button" type="button">제품 영역 조정</button>
            </div>
            <ul class="metric-list">
              ${metricRow(firstMetric, colorScore)}
              ${metricRow(secondMetric, fatScore)}
              ${metricRow(thirdMetric, balanceScore)}
            </ul>
            ${qualityWarningBox(candidate)}
            ${purchaseInputs(candidate)}
            ${labelOcrControls(candidate)}
          </div>
        </article>
      `;
    })
    .join("");
}

function qualityWarningBox(candidate) {
  if (!candidate.qualityWarnings?.length) return "";
  return `
    <div class="quality-warning-box">
      <strong>사진 품질 확인</strong>
      <span>${candidate.qualityWarnings.map(escapeHtml).join(" · ")} 경고가 있어 결과 신뢰도가 낮아질 수 있어요.</span>
    </div>
  `;
}

function scanOverlay(candidate) {
  if (!state.isAnalyzing) return "";
  const stages = currentMode().scanStages || SCAN_STAGES;
  const stage = stages[state.scanStageIndex % stages.length];
  return `
    <div class="scan-overlay" aria-label="${candidate.label} 분석 중">
      <div class="scan-line"></div>
      <div class="scan-status">
        <span class="scan-pulse" aria-hidden="true"></span>
        <strong>${stage}</strong>
      </div>
    </div>
  `;
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
      <label>
        <span>포장일</span>
        <input data-candidate-id="${candidate.id}" data-candidate-field="packagedDate" placeholder="예: 2026-05-15" value="${escapeHtml(candidate.purchase.packagedDate)}" />
      </label>
      <label>
        <span>소비기한/표시일</span>
        <input data-candidate-id="${candidate.id}" data-candidate-field="expiryDate" placeholder="예: 2026-05-18" value="${escapeHtml(candidate.purchase.expiryDate)}" />
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
      ${ocrInsightPanel(candidate)}
      <div class="label-actions">
        <button data-crop-label data-candidate-id="${candidate.id}" type="button">영역 지정</button>
        <label class="mini-file-button">
          라벨 사진 선택
          <input data-label-input data-candidate-id="${candidate.id}" type="file" accept="image/*" capture="environment" />
        </label>
        <button data-read-label data-candidate-id="${candidate.id}" type="button" ${candidate.labelFile ? "" : "disabled"}>라벨 읽기</button>
        <button data-no-label data-candidate-id="${candidate.id}" class="ghost-button" type="button">가격표 없음</button>
      </div>
    </div>
  `;
}

function ocrInsightPanel(candidate) {
  const result = candidate.ocrResult;

  if (!candidate.purchase.hasLabel) {
    return `
      <div class="ocr-insight is-muted">
        <strong>가격표 없음</strong>
        <span>이 후보는 사진 정보 위주로만 비교합니다.</span>
      </div>
    `;
  }

  if (!result) return "";

  const filledFields = [
    ["가격", candidate.purchase.price],
    ["중량", candidate.purchase.weightGram ? `${candidate.purchase.weightGram}g` : ""],
    ["100g당", candidate.purchase.pricePer100g ? `${candidate.purchase.pricePer100g.toLocaleString("ko-KR")}원` : ""],
    ["원산지", candidate.purchase.origin],
    ["품목/부위", candidate.purchase.cut],
    ["포장일", candidate.purchase.packagedDate],
    ["소비기한", candidate.purchase.expiryDate],
  ].filter(([, value]) => value);
  const confidence = confidenceLabelFromLlm(result.confidence);
  const warningList = result.warnings?.length
    ? result.warnings.slice(0, 3)
    : ["읽은 값은 실제 가격표와 한 번 더 대조해 주세요."];

  return `
    <div class="ocr-insight">
      <div class="ocr-insight-head">
        <strong>OCR 신뢰도 ${confidence}</strong>
        <span>${filledFields.length}개 항목 반영</span>
      </div>
      ${
        filledFields.length
          ? `<div class="ocr-field-chips">${filledFields.map(([label, value]) => `<span>${escapeHtml(label)} · ${escapeHtml(String(value))}</span>`).join("")}</div>`
          : `<p>확실하게 읽은 구매 정보가 없습니다.</p>`
      }
      <ul>
        ${warningList.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
      </ul>
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
  candidate.ocrResult = null;
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
  candidate.ocrResult = {
    confidence: payload.confidence,
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
  };
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
  const config = currentMode();
  state.crop.candidateId = candidate.id;
  state.crop.mode = mode;
  state.crop.sequence = sequence;
  state.crop.rect = mode === "product" ? { ...(candidate.productRect || defaultProductRect()) } : { x: 0.22, y: 0.22, width: 0.56, height: 0.28 };
  cropEyebrow.textContent = mode === "product" ? "제품 영역 지정" : "라벨 영역 지정";
  cropTitle.textContent =
    mode === "product"
      ? `${candidate.label}에서 ${config.productCropTitle}`
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
  state.isAnalyzing = isAnalyzing;
  analyzeButton.disabled = isAnalyzing || !canAnalyze();
  resetButton.disabled = isAnalyzing;
  imageInput.disabled = isAnalyzing;
  analyzeButton.textContent = isAnalyzing ? "분석 중..." : "분석하기";

  if (isAnalyzing) {
    startScanExperience();
  } else {
    stopScanExperience();
  }
  renderCandidates();
}

function startScanExperience() {
  const stages = currentMode().scanStages || SCAN_STAGES;
  stopScanExperience();
  state.scanStageIndex = 0;
  inputHint.textContent = stages[0];
  state.scanTimer = window.setInterval(() => {
    state.scanStageIndex = (state.scanStageIndex + 1) % stages.length;
    inputHint.textContent = stages[state.scanStageIndex];
    renderCandidates();
  }, 1400);
}

function stopScanExperience() {
  if (state.scanTimer) {
    window.clearInterval(state.scanTimer);
    state.scanTimer = null;
  }
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
        reason: buildReason(candidate.metrics, preference, candidate.productMode || state.productMode),
        analysis: buildAnalysis(candidate.metrics, candidate.productMode || state.productMode),
        warnings: buildCandidateWarnings(candidate),
      };
    })
    .sort((a, b) => b.score - a.score);

  const averageConfidence =
    ranked.reduce((sum, candidate) => sum + candidate.metrics.scores.confidence, 0) / ranked.length;

  return {
    productMode: state.productMode,
    preference,
    ranked,
    winner: ranked[0],
    tasteWinner: ranked[0],
    valueWinner: chooseLocalValueWinner(ranked),
    tasteSummary: `${ranked[0].label}가 ${currentMode().label} 기준에서 사진상 가장 좋아 보입니다.`,
    valueSummary: buildLocalValueSummary(chooseLocalValueWinner(ranked)),
    comparisonSummary: buildComparisonSummary(ranked),
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
      qualityWarnings: candidate.qualityWarnings || [],
      imageDataUrl: await cropImageForApi(candidate.url, candidate.productRect || defaultProductRect()),
    })),
  );

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      productMode: state.productMode,
      productModeLabel: currentMode().label,
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
        warnings: uniqueStrings([...(item.warnings || []), ...(candidate.qualityWarnings || [])]).slice(0, 5),
        strengths: item.strengths || [],
        weaknesses: item.weaknesses || [],
        tags: item.tags || [],
        bestUse: item.bestUse || "",
      };
    })
    .filter((candidate) => candidate.id);

  const winner = ranked.find((candidate) => candidate.id === payload.recommendedCandidateId) || ranked[0];
  const tasteWinner = ranked.find((candidate) => candidate.id === payload.tasteRecommendationId) || winner;
  const valueWinner = ranked.find((candidate) => candidate.id === payload.valueRecommendationId) || ranked[0];

  return {
    productMode: payload.productMode || state.productMode,
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
    comparisonSummary: payload.comparisonSummary || buildComparisonSummary(ranked),
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
    vivid: { colorScore: 0.44, fatScore: 0.18, marblingScore: 0.16, balanceScore: 0.22 },
    crisp: { colorScore: 0.25, fatScore: 0.4, marblingScore: 0.16, balanceScore: 0.19 },
    firm: { colorScore: 0.28, fatScore: 0.32, marblingScore: 0.2, balanceScore: 0.2 },
    clean: { colorScore: 0.22, fatScore: 0.2, marblingScore: 0.18, balanceScore: 0.4 },
    value: { colorScore: 0.26, fatScore: 0.18, marblingScore: 0.2, balanceScore: 0.36 },
  }[preference] || { colorScore: 0.28, fatScore: 0.24, marblingScore: 0.22, balanceScore: 0.26 };

  const raw =
    scores.colorScore * weights.colorScore +
    scores.fatScore * weights.fatScore +
    scores.marblingScore * weights.marblingScore +
    scores.balanceScore * weights.balanceScore;

  return Math.max(1, Math.min(99, Math.round(raw)));
}

function scoreMetricsForMode(metrics, mode) {
  if (mode === "leafy-greens") {
    const colorScore = clamp(34 + metrics.greenRatio * 210 + metrics.averageSaturation * 0.32 - metrics.brownRatio * 120 - metrics.darkRatio * 42);
    const fatScore = clamp(48 + metrics.greenRatio * 120 - metrics.brownRatio * 170 - metrics.darkRatio * 64 - metrics.glareRatio * 45);
    const marblingScore = clamp(74 - metrics.brownRatio * 190 - metrics.darkRatio * 85 - metrics.glareRatio * 60);
    const balanceScore = clamp(84 - metrics.glareRatio * 140 - metrics.darkRatio * 115 - Math.abs(metrics.averageBrightness - 132) * 0.16);
    const confidence = clamp(70 + metrics.greenRatio * 34 - metrics.glareRatio * 85 - metrics.darkRatio * 70);
    return { colorScore, fatScore, marblingScore, balanceScore, confidence };
  }

  if (mode === "cucumber") {
    const colorScore = clamp(36 + metrics.greenRatio * 190 + metrics.averageSaturation * 0.28 - metrics.brownRatio * 120 - metrics.darkRatio * 36);
    const fatScore = clamp(54 + metrics.greenRatio * 105 - metrics.brownRatio * 145 - metrics.darkRatio * 55 - metrics.glareRatio * 36);
    const marblingScore = clamp(78 - metrics.brownRatio * 175 - metrics.darkRatio * 72 - metrics.glareRatio * 44);
    const balanceScore = clamp(84 - metrics.glareRatio * 130 - metrics.darkRatio * 105 - Math.abs(metrics.averageBrightness - 128) * 0.13);
    const confidence = clamp(70 + metrics.greenRatio * 30 - metrics.glareRatio * 78 - metrics.darkRatio * 64);
    return { colorScore, fatScore, marblingScore, balanceScore, confidence };
  }

  if (mode === "tomato") {
    const colorScore = clamp(38 + metrics.redRatio * 185 + metrics.averageSaturation * 0.25 - metrics.brownRatio * 90 - metrics.darkRatio * 34);
    const fatScore = clamp(58 + metrics.redRatio * 92 - metrics.brownRatio * 140 - metrics.darkRatio * 58 - metrics.glareRatio * 38);
    const marblingScore = clamp(72 - metrics.brownRatio * 170 - metrics.darkRatio * 76 - metrics.glareRatio * 45);
    const balanceScore = clamp(83 - metrics.glareRatio * 135 - metrics.darkRatio * 112 - Math.abs(metrics.averageBrightness - 130) * 0.14);
    const confidence = clamp(70 + metrics.redRatio * 30 - metrics.glareRatio * 82 - metrics.darkRatio * 70);
    return { colorScore, fatScore, marblingScore, balanceScore, confidence };
  }

  if (mode === "apple") {
    const fruitColorSignal = metrics.redRatio + Math.min(metrics.averageWarmth / 140, 0.2);
    const colorScore = clamp(40 + fruitColorSignal * 170 + metrics.averageSaturation * 0.2 - metrics.brownRatio * 120 - metrics.darkRatio * 36);
    const fatScore = clamp(60 + fruitColorSignal * 80 - metrics.brownRatio * 150 - metrics.darkRatio * 62 - metrics.glareRatio * 34);
    const marblingScore = clamp(74 - metrics.brownRatio * 185 - metrics.darkRatio * 78 - metrics.glareRatio * 42);
    const balanceScore = clamp(84 - metrics.glareRatio * 125 - metrics.darkRatio * 105 - Math.abs(metrics.averageBrightness - 136) * 0.12);
    const confidence = clamp(70 + fruitColorSignal * 28 - metrics.glareRatio * 76 - metrics.darkRatio * 68);
    return { colorScore, fatScore, marblingScore, balanceScore, confidence };
  }

  return metrics.scores;
}

function buildReason(metrics, preference, mode = "beef-grill") {
  const scores = metrics.scores;
  const preferenceText = {
    balanced: "균형 기준으로 볼 때",
    lean: "담백한 취향 기준으로 볼 때",
    rich: "고소한 지방감 기준으로 볼 때",
    tender: "부드러운 식감 기준으로 볼 때",
    vivid: "색 선명도 기준으로 볼 때",
    crisp: "싱싱함 기준으로 볼 때",
    firm: "탄탄함 기준으로 볼 때",
    clean: "상처가 적은 후보 기준으로 볼 때",
    value: "가성비 기준으로 볼 때",
  }[preference] || "균형 기준으로 볼 때";

  const details = [];

  if (scores.colorScore >= 70) details.push("색감이 비교적 안정적으로 보입니다");
  if (mode === "leafy-greens") {
    if (scores.fatScore >= 65) details.push("잎의 생기가 있어 보입니다");
    if (scores.marblingScore >= 65) details.push("상처나 변색 의심 신호가 적은 편입니다");
  } else if (mode === "tomato" || mode === "cucumber" || mode === "apple") {
    if (scores.fatScore >= 65) details.push("표면이 비교적 안정적으로 보입니다");
    if (scores.marblingScore >= 65) details.push("상처나 무름 의심 신호가 적은 편입니다");
  } else {
    if (scores.fatScore >= 65) details.push("지방감이 충분해 보입니다");
    if (scores.marblingScore >= 65) details.push("밝은 지방 영역이 고르게 분포한 편입니다");
  }
  if (scores.balanceScore >= 70) details.push("사진상 반사나 어두운 영역이 적습니다");

  if (details.length === 0) {
    details.push("눈에 띄는 강점은 크지 않지만 다른 후보 대비 점수가 높습니다");
  }

  return `${preferenceText} ${details.slice(0, 2).join(", ")}.`;
}

function buildAnalysis(metrics, mode = "beef-grill") {
  if (mode === "leafy-greens") {
    return buildLeafyAnalysis(metrics);
  }
  if (mode === "tomato") {
    return buildTomatoAnalysis(metrics);
  }
  if (mode === "cucumber") {
    return buildCucumberAnalysis(metrics);
  }
  if (mode === "apple") {
    return buildAppleAnalysis(metrics);
  }

  const { scores, redRatio, whiteRatio, glareRatio, darkRatio, averageBrightness, averageWarmth } = metrics;
  const primarySignal = describeFatAmount(whiteRatio, scores.fatScore);
  const distributionSignal = describeFatDistribution(redRatio, whiteRatio, glareRatio, darkRatio);
  const colorTone = describeColorTone(scores.colorScore, averageWarmth, averageBrightness, darkRatio);
  const surfaceSignal = describeSurfaceSignal(scores.balanceScore, glareRatio, darkRatio);
  const overall = describeOverall(scores);

  return normalizeAnalysisFields({ primarySignal, distributionSignal, colorTone, surfaceSignal, overall });
}

function buildLeafyAnalysis(metrics) {
  const { scores, greenRatio, brownRatio, glareRatio, darkRatio, averageBrightness } = metrics;
  return normalizeAnalysisFields({
    primarySignal:
      scores.fatScore >= 70
        ? "잎의 초록색 비중과 밝기가 비교적 안정적이라 사진상 생기가 있어 보입니다."
        : "잎의 생기 판단은 보통 수준이며, 누렇게 뜬 부분이나 마른 가장자리를 직접 확인해 주세요.",
    distributionSignal:
      greenRatio > 0.22 && brownRatio < 0.08
        ? "색이 한쪽에 크게 무너지지 않고 비교적 균일하게 보입니다."
        : "색 균일도 판단이 제한적이거나 일부 변색 의심 영역이 있을 수 있습니다.",
    colorTone:
      scores.colorScore >= 68
        ? "초록색 계열이 비교적 선명하게 보여 잎채소 후보로 무난해 보입니다."
        : "사진상 색이 탁하거나 조명 영향이 있어 실제 색을 한 번 더 확인하는 편이 좋습니다.",
    surfaceSignal:
      glareRatio > 0.14 || darkRatio > 0.26
        ? "반사나 어두운 영역 때문에 시든 정도와 상처 판단 신뢰도가 낮을 수 있습니다."
        : "큰 반사나 어두운 영역은 적어 표면 상태를 비교하기 좋은 편입니다.",
    overall:
      scores.confidence >= 68 && averageBrightness > 82
        ? "사진상으로는 색과 생기가 비교적 안정적이라 구매 후보로 검토할 만합니다."
        : "사진 조건 또는 색 정보가 부족해 실제 잎의 탄력과 시든 부분을 직접 확인해 주세요.",
  });
}

function buildTomatoAnalysis(metrics) {
  const { scores, redRatio, brownRatio, glareRatio, darkRatio } = metrics;
  return normalizeAnalysisFields({
    primarySignal:
      redRatio > 0.18 && scores.colorScore >= 65
        ? "붉은 색이 비교적 잘 잡혀 사진상 익은 정도가 안정적으로 보입니다."
        : "붉은 색 정보가 적거나 조명 영향이 있어 익은 정도 판단은 제한적입니다.",
    distributionSignal:
      scores.marblingScore >= 65
        ? "전체적인 형태와 색 분포가 비교적 무난하게 보입니다."
        : "색이나 형태가 균일하다고 보기에는 정보가 부족해 직접 확인이 필요합니다.",
    colorTone:
      scores.colorScore >= 70
        ? "색이 비교적 선명하고 균일하게 보여 토마토 후보로 무난해 보입니다."
        : "색이 탁하거나 부분적으로 어둡게 보여 실제 표면 색을 확인해 주세요.",
    surfaceSignal:
      brownRatio > 0.06 || darkRatio > 0.25 || glareRatio > 0.14
        ? "상처, 무름, 반사로 보일 수 있는 영역이 있어 표면을 직접 확인하는 편이 좋습니다."
        : "사진상 큰 상처나 강한 반사 신호는 적어 보입니다.",
    overall:
      scores.confidence >= 68
        ? "사진상 색과 표면 단서가 비교적 안정적이라 구매 후보로 검토할 만합니다."
        : "사진 조건이 제한적이라 실제 단단함과 표면 상처를 함께 확인해 주세요.",
  });
}

function buildCucumberAnalysis(metrics) {
  const { scores, greenRatio, brownRatio, glareRatio, darkRatio } = metrics;
  return normalizeAnalysisFields({
    primarySignal:
      greenRatio > 0.16 && scores.fatScore >= 64
        ? "초록색 정보와 밝기가 비교적 안정적이라 사진상 생기와 탄탄함이 있어 보입니다."
        : "색 정보나 밝기가 제한적이라 오이의 탄탄함 판단은 보통 수준입니다.",
    distributionSignal:
      scores.marblingScore >= 66
        ? "전체 길이와 색 분포가 비교적 무난해 한쪽이 크게 무너진 신호는 적어 보입니다."
        : "형태나 색 균일도 판단이 제한적이어서 휘어짐, 눌림, 마른 부분을 직접 확인해 주세요.",
    colorTone:
      scores.colorScore >= 68
        ? "초록색이 비교적 선명하게 잡혀 사진상 오이 후보로 무난해 보입니다."
        : "색이 탁하거나 조명 영향이 있어 실제 초록색 선명도를 확인하는 편이 좋습니다.",
    surfaceSignal:
      brownRatio > 0.06 || darkRatio > 0.24 || glareRatio > 0.14
        ? "상처, 마른 부분, 반사로 보일 수 있는 영역이 있어 표면을 직접 확인해 주세요."
        : "사진상 큰 상처나 강한 반사 신호는 적어 보입니다.",
    overall:
      scores.confidence >= 68
        ? "사진상 색과 표면 단서가 비교적 안정적이라 구매 후보로 검토할 만합니다."
        : "사진 조건이 제한적이라 실제 단단함과 표면 상처를 함께 확인해 주세요.",
  });
}

function buildAppleAnalysis(metrics) {
  const { scores, redRatio, brownRatio, glareRatio, darkRatio, averageWarmth } = metrics;
  return normalizeAnalysisFields({
    primarySignal:
      (redRatio > 0.12 || averageWarmth > 18) && scores.colorScore >= 64
        ? "붉은색 또는 따뜻한 색 정보가 비교적 안정적이라 사진상 익은 정도가 무난해 보입니다."
        : "색 정보가 제한적이거나 조명 영향이 있어 익은 정도 판단은 보통 수준입니다.",
    distributionSignal:
      scores.marblingScore >= 66
        ? "형태와 색 분포가 비교적 무난해 한쪽에 큰 멍이나 어두운 신호가 두드러지지는 않습니다."
        : "색이나 형태가 균일하다고 보기에는 정보가 부족해 멍, 눌림, 흠집을 직접 확인해 주세요.",
    colorTone:
      scores.colorScore >= 68
        ? "색이 비교적 선명하고 균일하게 보여 사과 후보로 무난해 보입니다."
        : "색이 탁하거나 부분적으로 어둡게 보여 실제 표면 색을 확인해 주세요.",
    surfaceSignal:
      brownRatio > 0.06 || darkRatio > 0.24 || glareRatio > 0.15
        ? "멍, 상처, 눌림 또는 반사로 보일 수 있는 영역이 있어 표면을 직접 확인하는 편이 좋습니다."
        : "사진상 큰 멍이나 강한 반사 신호는 적어 보입니다.",
    overall:
      scores.confidence >= 68
        ? "사진상 색과 표면 단서가 비교적 안정적이라 구매 후보로 검토할 만합니다."
        : "사진 조건이 제한적이라 실제 단단함과 표면 상처를 함께 확인해 주세요.",
  });
}

function normalizeAnalysisFields(analysis = {}) {
  const primarySignal = analysis.primarySignal || analysis.fatAmount || "";
  const distributionSignal = analysis.distributionSignal || analysis.fatDistribution || "";
  return {
    primarySignal,
    distributionSignal,
    fatAmount: primarySignal,
    fatDistribution: distributionSignal,
    colorTone: analysis.colorTone || "",
    surfaceSignal: analysis.surfaceSignal || "",
    overall: analysis.overall || "",
  };
}

function analysisValue(analysis, key) {
  const normalized = normalizeAnalysisFields(analysis);
  return normalized[key] || "";
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

function buildWarnings(metrics, mode = "beef-grill") {
  const warnings = [];

  if (metrics.glareRatio > 0.12) warnings.push("포장 반사가 있어 색 판단 신뢰도가 낮을 수 있음");
  if (metrics.darkRatio > 0.25) warnings.push("사진이 어두워 실제 색과 다르게 보일 수 있음");
  if (mode === "leafy-greens") {
    if (metrics.greenRatio < 0.1) warnings.push("야채 영역이 작거나 초록색 정보가 부족할 수 있음");
    if (metrics.brownRatio > 0.08) warnings.push("변색 또는 마른 부분처럼 보이는 영역이 있을 수 있음");
  } else if (mode === "tomato") {
    if (metrics.redRatio < 0.1) warnings.push("토마토 영역이 작거나 붉은 색 정보가 부족할 수 있음");
    if (metrics.brownRatio > 0.07) warnings.push("상처 또는 무름처럼 보이는 영역이 있을 수 있음");
  } else if (mode === "cucumber") {
    if (metrics.greenRatio < 0.1) warnings.push("오이 영역이 작거나 초록색 정보가 부족할 수 있음");
    if (metrics.brownRatio > 0.07) warnings.push("상처 또는 마른 부분처럼 보이는 영역이 있을 수 있음");
  } else if (mode === "apple") {
    if (metrics.redRatio < 0.08 && metrics.averageWarmth < 12) warnings.push("사과 영역이 작거나 색 정보가 부족할 수 있음");
    if (metrics.brownRatio > 0.07) warnings.push("멍 또는 상처처럼 보이는 영역이 있을 수 있음");
  } else if (metrics.redRatio < 0.1) {
    warnings.push("고기 영역이 작거나 색 정보가 부족할 수 있음");
  }

  return warnings;
}

function renderResult(result) {
  const config = PRODUCT_MODES[result.productMode || state.productMode] || currentMode();
  const { winner, ranked, confidenceLabel: label } = result;
  const sourceLabel = result.source === "openai" ? "LLM" : result.source === "local-fallback" ? "임시 분석" : "로컬";
  confidenceBadge.textContent = `${sourceLabel} 신뢰도 ${label}`;
  const tasteWinner = result.tasteWinner || winner;
  const valueWinner = result.valueWinner || winner;
  const bestTags = analysisTags(tasteWinner).slice(0, 3);
  const bestWarnings = (tasteWinner.warnings || []).slice(0, 2);

  recommendationCard.innerHTML = `
    <div class="best-pick-layout">
      <div class="best-pick-image">
        <img src="${tasteWinner.url}" alt="${tasteWinner.label} 추천 후보 사진" />
        <div class="result-image-tags">
          ${bestTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${productSelectionOverlay(tasteWinner)}
      </div>
      <div class="best-pick-content">
        ${result.isDemo ? `<span class="demo-result-banner">샘플 분석 · API 비용 없이 화면 확인 중</span>` : ""}
        <span class="recommendation-kicker">BEST PICK · 사진상 가장 좋아 보이는 후보</span>
        <h3>${tasteWinner.label} 추천</h3>
        <p>${result.tasteSummary || result.summary || `${tasteWinner.label}가 사진상 품질 기준으로 좋아 보입니다.`}</p>
        <div class="best-pick-meta">
          <span>사진 기반 참고 점수 ${tasteWinner.score}점</span>
          <span>${sourceLabel} 신뢰도 ${label}</span>
          <span>${purchaseSummary(tasteWinner.purchase)}</span>
        </div>
        ${label === "낮음" ? `<p class="low-confidence-copy">사진 조건 때문에 임시 추천에 가깝습니다. 가능하면 반사가 적고 밝은 사진으로 다시 비교해보세요.</p>` : ""}
        <div class="best-pick-notes">
          <div>
            <strong>추천 이유</strong>
            <p>${tasteWinner.analysis?.overall || tasteWinner.reason}</p>
          </div>
          <div>
            <strong>주의할 점</strong>
            <p>${bestWarnings.length ? bestWarnings.map(escapeHtml).join(" · ") : "사진 기준 큰 주의 신호는 적습니다."}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="recommendation-split">
      <div>
        <span class="recommendation-kicker">${config.primaryRecommendationLabel}</span>
        <strong>${tasteWinner.label}</strong>
        <p>${result.tasteSummary || config.primaryFallback}</p>
      </div>
      <div>
        <span class="recommendation-kicker">가성비</span>
        <strong>${valueWinner.label}</strong>
        <p>${result.valueSummary || "가격과 중량 정보가 충분하면 가성비 추천에 함께 반영합니다."}</p>
        <small>OCR/가격표 정보는 실제 라벨과 한 번 더 확인해 주세요.</small>
      </div>
    </div>
    ${resultComparisonPanel(ranked, config)}
    <div class="comparison-summary">
      <span class="recommendation-kicker">후보 간 핵심 차이</span>
      <p>${result.comparisonSummary || buildComparisonSummary(ranked)}</p>
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
          <div class="rank-image-wrap">
            <img class="rank-image" src="${candidate.url}" alt="${candidate.label} 원본 사진" />
            <div class="result-image-tags compact">
              ${analysisTags(candidate)
                .slice(0, 3)
                .map((tag) => `<span>${escapeHtml(tag)}</span>`)
                .join("")}
            </div>
            ${productSelectionOverlay(candidate)}
          </div>
          <div class="rank-content">
            <h3>${candidate.label}</h3>
            <p class="purchase-summary">${purchaseSummary(candidate.purchase)}</p>
            <p>${candidate.reason} ${warnings}</p>
            ${candidate.bestUse ? `<p class="best-use">추천 상황: ${escapeHtml(candidate.bestUse)}</p>` : ""}
            <div class="analysis-block">
              <h4>${config.resultDetailTitle}</h4>
              <ul>
                <li><strong>${config.analysisLabels.primarySignal}</strong>${analysisValue(candidate.analysis, "primarySignal")}</li>
                <li><strong>${config.analysisLabels.distributionSignal}</strong>${analysisValue(candidate.analysis, "distributionSignal")}</li>
                <li><strong>${config.analysisLabels.colorTone}</strong>${candidate.analysis.colorTone}</li>
                <li><strong>${config.analysisLabels.surfaceSignal}</strong>${candidate.analysis.surfaceSignal}</li>
                <li><strong>${config.analysisLabels.overall}</strong>${candidate.analysis.overall}</li>
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
  saveAnalysisHistory(result);
}

function resultComparisonPanel(ranked, config) {
  if (!ranked?.length) return "";
  const [firstMetric, secondMetric, thirdMetric] = config.metrics;

  return `
    <div class="comparison-board" aria-label="후보 비교 요약">
      <div class="comparison-board-head">
        <span class="recommendation-kicker">COMPARE · 후보별 강점</span>
        <strong>사진 기준 점수와 핵심 신호</strong>
      </div>
      <div class="comparison-board-list">
        ${ranked
          .map((candidate, index) => {
            const scores = candidate.metrics?.scores || {};
            const tags = analysisTags(candidate).slice(0, 3);
            return `
              <article class="comparison-row ${index === 0 ? "is-best" : ""}">
                <div class="comparison-row-title">
                  <span>${index + 1}</span>
                  <div>
                    <strong>${escapeHtml(candidate.label)}</strong>
                    <small>${escapeHtml(purchaseSummary(candidate.purchase))}</small>
                  </div>
                </div>
                <div class="comparison-bars">
                  ${comparisonBar(firstMetric, scores.colorScore)}
                  ${comparisonBar(secondMetric, scores.fatScore)}
                  ${comparisonBar(thirdMetric, scores.balanceScore)}
                </div>
                <div class="comparison-tags">
                  ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") || "<span>사진 기준 비교</span>"}
                </div>
                <strong class="comparison-score">${Number(candidate.score || 0)}점</strong>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function comparisonBar(label, value = 0) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return `
    <div class="comparison-bar">
      <span>${escapeHtml(label)}</span>
      <div><i style="width: ${percent}%"></i></div>
      <strong>${percent}</strong>
    </div>
  `;
}

function analysisTags(candidate) {
  const tags = [];
  const analysis = candidate.analysis || {};
  const warnings = candidate.warnings || [];
  const mode = candidate.productMode || state.productMode;

  if (Array.isArray(candidate.tags)) {
    tags.push(...candidate.tags);
  }
  if (mode === "leafy-greens") {
    if (candidate.metrics?.scores?.colorScore >= 65) tags.push("색 선명한 편");
    if (candidate.metrics?.scores?.fatScore >= 65) tags.push("생기 있어 보임");
    if (warnings.some((warning) => /변색|어두|상처|작음/.test(warning))) tags.push("상태 확인 필요");
    if (candidate.metrics?.scores?.balanceScore >= 70) tags.push("사진 품질 양호");
    return uniqueStrings(tags.map((tag) => String(tag).trim()).filter(Boolean)).slice(0, 3);
  }

  if (mode === "tomato") {
    if (candidate.metrics?.scores?.colorScore >= 65) tags.push("색 균일한 편");
    if (candidate.metrics?.scores?.fatScore >= 65) tags.push("표면 안정적");
    if (warnings.some((warning) => /무름|상처|어두|반사/.test(warning))) tags.push("표면 확인 필요");
    if (candidate.metrics?.scores?.balanceScore >= 70) tags.push("사진 품질 양호");
    return uniqueStrings(tags.map((tag) => String(tag).trim()).filter(Boolean)).slice(0, 3);
  }

  if (mode === "cucumber") {
    if (candidate.metrics?.scores?.colorScore >= 65) tags.push("색 선명한 편");
    if (candidate.metrics?.scores?.fatScore >= 65) tags.push("표면 안정적");
    if (warnings.some((warning) => /마른|상처|어두|반사|작음/.test(warning))) tags.push("표면 확인 필요");
    if (candidate.metrics?.scores?.balanceScore >= 70) tags.push("사진 품질 양호");
    return uniqueStrings(tags.map((tag) => String(tag).trim()).filter(Boolean)).slice(0, 3);
  }

  if (mode === "apple") {
    if (candidate.metrics?.scores?.colorScore >= 65) tags.push("색 균일한 편");
    if (candidate.metrics?.scores?.fatScore >= 65) tags.push("표면 안정적");
    if (warnings.some((warning) => /멍|상처|어두|반사|작음/.test(warning))) tags.push("표면 확인 필요");
    if (candidate.metrics?.scores?.balanceScore >= 70) tags.push("사진 품질 양호");
    return uniqueStrings(tags.map((tag) => String(tag).trim()).filter(Boolean)).slice(0, 3);
  }

  if (candidate.metrics?.scores?.fatScore >= 65 || /고르게|충분|지방감/.test(analysisValue(analysis, "distributionSignal") || analysisValue(analysis, "primarySignal"))) {
    tags.push("지방 고른 편");
  }
  if (candidate.metrics?.scores?.colorScore >= 68 || /붉|선명|안정/.test(analysis.colorTone || "")) {
    tags.push("색상 안정적");
  }
  if (warnings.some((warning) => /반사/.test(warning))) {
    tags.push("반사 주의");
  } else if (candidate.metrics?.scores?.balanceScore >= 70) {
    tags.push("사진 품질 양호");
  }
  if (warnings.some((warning) => /어두/.test(warning))) {
    tags.push("조명 영향 가능");
  }

  return uniqueStrings(tags.map((tag) => String(tag).trim()).filter(Boolean)).slice(0, 3);
}

function buildComparisonSummary(ranked) {
  if (!ranked?.length) return "후보별 사진 정보가 부족해 차이를 요약하기 어렵습니다.";
  const first = ranked[0];
  const second = ranked[1];
  if (!second) {
    return `${first.label}는 ${first.analysis?.overall || first.reason || "사진상 비교 가능한 단서가 있습니다."}`;
  }

  const firstTags = analysisTags(first).slice(0, 2).join(", ") || "사진상 강점";
  const secondWarnings = (second.warnings || []).slice(0, 1).join(", ");
  const gap = Math.abs((first.score || 0) - (second.score || 0));
  const scorePhrase = gap >= 12 ? "점수 차이가 비교적 뚜렷합니다" : "점수 차이는 크지 않아 취향과 가격을 함께 보면 좋습니다";
  const warningPhrase = secondWarnings ? ` ${second.label}는 ${secondWarnings} 점을 확인해 주세요.` : "";

  return `${first.label}는 ${firstTags} 측면에서 앞서 보입니다. ${second.label}와는 ${scorePhrase}.${warningPhrase}`.slice(0, 220);
}

function buildQualityWarnings(metrics, productRect) {
  const warnings = [];
  if (metrics.glareRatio > 0.12) warnings.push("반사 심함");
  if (metrics.darkRatio > 0.25 || metrics.averageBrightness < 78) warnings.push("사진 어두움");
  if (state.productMode === "leafy-greens") {
    if (metrics.greenRatio < 0.1) warnings.push("야채 영역 작음");
    if (metrics.brownRatio > 0.08) warnings.push("변색 의심");
  } else if (state.productMode === "tomato") {
    if (metrics.redRatio < 0.1) warnings.push("토마토 영역 작음");
    if (metrics.brownRatio > 0.07) warnings.push("상처/무름 의심");
  } else if (state.productMode === "cucumber") {
    if (metrics.greenRatio < 0.1) warnings.push("오이 영역 작음");
    if (metrics.brownRatio > 0.07) warnings.push("상처/마름 의심");
  } else if (state.productMode === "apple") {
    if (metrics.redRatio < 0.08 && metrics.averageWarmth < 12) warnings.push("사과 영역 작음");
    if (metrics.brownRatio > 0.07) warnings.push("멍/상처 의심");
  } else if (metrics.redRatio < 0.1) {
    warnings.push("고기 영역 작음");
  }
  if (productRect && (productRect.x < 0.02 || productRect.y < 0.02 || productRect.x + productRect.width > 0.98 || productRect.y + productRect.height > 0.98)) {
    warnings.push("제품 잘림 가능");
  }
  return warnings;
}

function buildCandidateWarnings(candidate) {
  return uniqueStrings([...buildWarnings(candidate.metrics, candidate.productMode || state.productMode), ...(candidate.qualityWarnings || [])]).slice(0, 5);
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

async function saveAnalysisHistory(result) {
  try {
    const tasteWinner = result.tasteWinner || result.winner || result.ranked?.[0];
    const valueWinner = result.valueWinner || tasteWinner;
    if (!tasteWinner) return;

    const thumbnail = await createHistoryThumbnail(tasteWinner.url);
    const item = {
      id: `history-${Date.now()}`,
      createdAt: new Date().toISOString(),
      thumbnail,
      source: result.source,
      productMode: result.productMode || state.productMode,
      productModeLabel: (PRODUCT_MODES[result.productMode || state.productMode] || currentMode()).label,
      confidenceLabel: result.confidenceLabel,
      tasteLabel: tasteWinner.label,
      valueLabel: valueWinner.label,
      summary: result.tasteSummary || result.summary || tasteWinner.reason || "",
      purchase: purchaseSummary(tasteWinner.purchase),
      candidateCount: result.ranked?.length || 0,
      snapshot: buildHistorySnapshot(result, thumbnail),
    };
    const next = [item, ...readHistory()].slice(0, MAX_HISTORY_ITEMS);
    writeHistory(next);
    renderHistory();
  } catch (error) {
    console.warn("Failed to save analysis history.", error);
  }
}

function buildHistorySnapshot(result, thumbnail) {
  const productMode = result.productMode || state.productMode;
  const config = PRODUCT_MODES[productMode] || currentMode();
  const ranked = (result.ranked || []).slice(0, 5).map((candidate, index) => ({
    label: candidate.label,
    score: candidate.score,
    reason: candidate.reason,
    purchase: purchaseSummary(candidate.purchase),
    warnings: (candidate.warnings || []).slice(0, 3),
    tags: analysisTags(candidate).slice(0, 3),
    analysis: normalizeAnalysisFields(candidate.analysis),
    bestUse: candidate.bestUse || "",
    rank: index + 1,
  }));

  return {
    version: 1,
    productMode,
    productModeLabel: config.label,
    thumbnail,
    source: result.source,
    confidenceLabel: result.confidenceLabel,
    tasteLabel: result.tasteWinner?.label || result.winner?.label || ranked[0]?.label || "",
    valueLabel: result.valueWinner?.label || ranked[0]?.label || "",
    tasteSummary: result.tasteSummary || result.summary || "",
    valueSummary: result.valueSummary || "",
    comparisonSummary: result.comparisonSummary || buildComparisonSummary(result.ranked || []),
    fallbackMessage: result.fallbackMessage || "",
    notices: result.notices || [],
    ranked,
  };
}

function restoreHistoryResult(historyId) {
  const item = readHistory().find((entry) => entry.id === historyId);
  if (!item?.snapshot) return;

  const snapshot = item.snapshot;
  const config = PRODUCT_MODES[snapshot.productMode] || currentMode();
  const sourceLabel = snapshot.source === "openai" ? "LLM" : snapshot.source === "local-fallback" ? "임시 분석" : "로컬";
  confidenceBadge.textContent = `${sourceLabel} 신뢰도 ${snapshot.confidenceLabel || "보통"}`;

  recommendationCard.innerHTML = `
    <div class="best-pick-layout history-result">
      <div class="best-pick-image">
        <img src="${snapshot.thumbnail}" alt="${escapeHtml(snapshot.tasteLabel)} 기록 썸네일" />
      </div>
      <div class="best-pick-content">
        <span class="recommendation-kicker">SAVED PICK · ${escapeHtml(snapshot.productModeLabel || config.label)}</span>
        <h3>${escapeHtml(snapshot.tasteLabel || "저장된 추천")}</h3>
        <p>${escapeHtml(snapshot.tasteSummary || "사진 기반 참고 결과입니다.")}</p>
        <div class="best-pick-meta">
          <span>${sourceLabel} 신뢰도 ${escapeHtml(snapshot.confidenceLabel || "보통")}</span>
          <span>저장된 분석 기록</span>
        </div>
      </div>
    </div>
    <div class="recommendation-split">
      <div>
        <span class="recommendation-kicker">${config.primaryRecommendationLabel}</span>
        <strong>${escapeHtml(snapshot.tasteLabel || "추천 후보")}</strong>
        <p>${escapeHtml(snapshot.tasteSummary || config.primaryFallback)}</p>
      </div>
      <div>
        <span class="recommendation-kicker">가성비</span>
        <strong>${escapeHtml(snapshot.valueLabel || snapshot.tasteLabel || "추천 후보")}</strong>
        <p>${escapeHtml(snapshot.valueSummary || "저장 당시 가격 정보 기준의 참고 결과입니다.")}</p>
      </div>
    </div>
    <div class="comparison-summary">
      <span class="recommendation-kicker">후보 간 핵심 차이</span>
      <p>${escapeHtml(snapshot.comparisonSummary || "저장된 비교 요약이 없습니다.")}</p>
    </div>
  `;

  rankingList.innerHTML = (snapshot.ranked || [])
    .map(
      (candidate) => `
        <article class="rank-card compact-history">
          <div class="rank-number">${candidate.rank}</div>
          <div class="rank-content">
            <h3>${escapeHtml(candidate.label)}</h3>
            <p class="purchase-summary">${escapeHtml(candidate.purchase || "구매 정보 미입력")}</p>
            <p>${escapeHtml(candidate.reason || "사진 기반 참고 결과입니다.")}</p>
            <div class="analysis-block">
              <h4>${escapeHtml(config.resultDetailTitle)}</h4>
              <ul>
                <li><strong>${escapeHtml(config.analysisLabels.primarySignal)}</strong>${escapeHtml(analysisValue(candidate.analysis, "primarySignal"))}</li>
                <li><strong>${escapeHtml(config.analysisLabels.distributionSignal)}</strong>${escapeHtml(analysisValue(candidate.analysis, "distributionSignal"))}</li>
                <li><strong>${escapeHtml(config.analysisLabels.colorTone)}</strong>${escapeHtml(candidate.analysis?.colorTone || "")}</li>
                <li><strong>${escapeHtml(config.analysisLabels.surfaceSignal)}</strong>${escapeHtml(candidate.analysis?.surfaceSignal || "")}</li>
                <li><strong>${escapeHtml(config.analysisLabels.overall)}</strong>${escapeHtml(candidate.analysis?.overall || "")}</li>
              </ul>
            </div>
          </div>
          <div class="score">${Number(candidate.score || 0)}점</div>
        </article>
      `,
    )
    .join("");

  const noticeBox = document.querySelector(".notice-box");
  if (noticeBox) {
    noticeBox.textContent = (snapshot.notices?.length ? snapshot.notices : ["저장된 사진 기반 참고 결과입니다."]).join(" ");
  }

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
  localStorage.removeItem(LEGACY_HISTORY_KEY);
}

function renderHistory() {
  if (!historySection || !historyList) return;
  const history = readHistory();
  historySection.classList.toggle("hidden", history.length === 0);
  historyList.innerHTML = history
    .map(
      (item) => `
        <article class="history-card">
          <img src="${item.thumbnail}" alt="${escapeHtml(item.tasteLabel)} 기록 썸네일" />
          <div>
            <strong>${escapeHtml(item.tasteLabel)} 추천</strong>
            <span>${escapeHtml(item.productModeLabel || "신선식품")} · ${formatHistoryDate(item.createdAt)} · 후보 ${item.candidateCount}개 · ${escapeHtml(item.confidenceLabel || "신뢰도 보통")}</span>
            <p>${escapeHtml(item.summary || "사진상 품질 기준으로 추천했습니다.")}</p>
            <small>가성비: ${escapeHtml(item.valueLabel || item.tasteLabel)} · ${escapeHtml(item.purchase || "구매 정보 미입력")}</small>
          </div>
          <div class="history-actions">
            <button data-restore-history="${escapeHtml(item.id)}" class="tiny-button" type="button">다시 보기</button>
            <button data-delete-history="${escapeHtml(item.id)}" class="tiny-button ghost-history-button" type="button">삭제</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createHistoryThumbnail(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 180;
      canvas.height = 135;
      const context = canvas.getContext("2d");
      context.fillStyle = "#171311";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.62));
    };
    image.onerror = reject;
    image.src = url;
  });
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

function detectProductRect(url, mode = "beef-grill") {
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
      const bounds = detectContentBounds(pixels, canvas.width, canvas.height, mode);
      resolve(bounds || defaultProductRect());
    };
    image.onerror = () => resolve(defaultProductRect());
    image.src = url;
  });
}

function detectContentBounds(pixels, width, height, mode = "beef-grill") {
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
      const leafyLike = g > 70 && g > r * 0.92 && g > b * 1.02;
      const tomatoLike = r > 85 && r > g * 1.02 && r > b * 1.08;
      const appleLike = r > 85 && r > b * 1.04 && (r > g * 0.94 || g > 70);
      const labelLike = brightness > 135 && saturation < 0.28;
      const edgeLike = brightness < 80 || saturation > 0.22;

      const itemLike =
        mode === "leafy-greens" || mode === "cucumber"
          ? leafyLike
          : mode === "tomato"
            ? tomatoLike
            : mode === "apple"
              ? appleLike
              : meatLike;

      if (itemLike || labelLike || edgeLike) {
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
  let greenPixels = 0;
  let whitePixels = 0;
  let brownPixels = 0;
  let glarePixels = 0;
  let darkPixels = 0;
  let brightnessTotal = 0;
  let warmTotal = 0;
  let saturationTotal = 0;
  let sampled = 0;

  for (let index = 0; index < pixels.length; index += 16) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const brightness = (r + g + b) / 3;
    const warm = r - (g + b) / 2;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);

    sampled += 1;
    brightnessTotal += brightness;
    warmTotal += warm;
    saturationTotal += saturation;

    if (r > 95 && r > g * 1.08 && r > b * 1.12) redPixels += 1;
    if (g > 80 && g > r * 1.05 && g > b * 1.04) greenPixels += 1;
    if (r > 165 && g > 145 && b > 125 && Math.abs(r - g) < 55) whitePixels += 1;
    if (r > 72 && g > 44 && b < 72 && r > b * 1.18 && g > b * 1.05 && brightness < 150) brownPixels += 1;
    if (r > 235 && g > 225 && b > 215) glarePixels += 1;
    if (brightness < 55) darkPixels += 1;
  }

  const redRatio = redPixels / sampled;
  const greenRatio = greenPixels / sampled;
  const whiteRatio = whitePixels / sampled;
  const brownRatio = brownPixels / sampled;
  const glareRatio = glarePixels / sampled;
  const darkRatio = darkPixels / sampled;
  const averageBrightness = brightnessTotal / sampled;
  const averageWarmth = warmTotal / sampled;
  const averageSaturation = saturationTotal / sampled;

  const colorScore = clamp(42 + redRatio * 150 + averageWarmth * 0.35 - darkRatio * 35 - glareRatio * 25);
  const fatScore = clamp(35 + whiteRatio * 170 - glareRatio * 70);
  const marblingScore = clamp(40 + Math.min(redRatio, 0.42) * 80 + Math.min(whiteRatio, 0.32) * 95);
  const balanceScore = clamp(85 - glareRatio * 170 - darkRatio * 130 - Math.abs(averageBrightness - 135) * 0.18);
  const confidence = clamp(72 + redRatio * 30 - glareRatio * 90 - darkRatio * 75);

  return {
    redRatio,
    greenRatio,
    whiteRatio,
    brownRatio,
    glareRatio,
    darkRatio,
    averageBrightness,
    averageWarmth,
    averageSaturation,
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
