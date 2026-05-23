import { readFile } from "node:fs/promises";

const [html, app, server] = await Promise.all([
  readFile(new URL("./index.html", import.meta.url), "utf8"),
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./server.mjs", import.meta.url), "utf8"),
]);

const requiredSnippets = [
  ["PRODUCT_MODES", app],
  ["guideSignals", app],
  ['id="signalChips"', html],
  ['capture="environment"', html],
  ["scoreMetricsForMode", app],
  ["resultComparisonPanel", app],
  ["comparisonBar", app],
  ["normalizeAnalysisFields", app],
  ["primarySignal", app],
  ["restoreHistoryResult", app],
  ["ocrInsightPanel", app],
  ["ocrResult", app],
  ["USER_PREFS_KEY", app],
  ["savePreferenceForMode", app],
  ['id="demoButton"', html],
  ["createDemoCandidates", app],
  ["createDemoCandidateImage", app],
  ["demo-result-banner", app],
  ["normalizeProductMode", server],
  ["analysisGuidanceFor", server],
  ["normalizeAnalysisResult", server],
  ["reserveUsage", server],
];

const missing = requiredSnippets.filter(([snippet, source]) => !source.includes(snippet)).map(([snippet]) => snippet);
const expectedModes = ["beef-grill", "leafy-greens", "tomato", "cucumber", "apple"];
const modeCoverage = expectedModes.map((mode) => ({
  mode,
  html: html.includes(`name="productMode" value="${mode}"`),
  app: app.includes(`${["tomato", "cucumber", "apple"].includes(mode) ? `${mode}:` : `"${mode}"`}`),
  server: server.includes(mode),
}));
const missingModes = modeCoverage.filter((item) => !item.html || !item.app || !item.server);

const leafyBlock = extractObjectBlock(app, '"leafy-greens"');
const tomatoBlock = extractObjectBlock(app, "tomato:");
const cucumberBlock = extractObjectBlock(app, "cucumber:");
const appleBlock = extractObjectBlock(app, "apple:");
const serverLeafyBlock = extractModeGuidanceBlock(server, 'mode === "leafy-greens"');
const serverTomatoBlock = extractModeGuidanceBlock(server, 'mode === "tomato"');
const serverCucumberBlock = extractModeGuidanceBlock(server, 'mode === "cucumber"');
const serverAppleBlock = extractModeGuidanceBlock(server, 'mode === "apple"');
const produceForbidden = ["지방감", "마블링", "구이용", "고소함", "부드러움"];
const produceLeaks = produceForbidden.filter(
  (word) =>
    leafyBlock.includes(word) ||
    tomatoBlock.includes(word) ||
    cucumberBlock.includes(word) ||
    appleBlock.includes(word) ||
    serverLeafyBlock.includes(word) ||
    serverTomatoBlock.includes(word) ||
    serverCucumberBlock.includes(word) ||
    serverAppleBlock.includes(word),
);
const genericAnalysisFields = ["primarySignal", "distributionSignal", "colorTone", "surfaceSignal", "overall"];
const missingGenericFields = genericAnalysisFields.filter((field) => !app.includes(field) || !server.includes(field));

if (missing.length || missingModes.length || produceLeaks.length || missingGenericFields.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missing,
        missingModes,
        produceLeaks,
        missingGenericFields,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: requiredSnippets.length,
      modeCoverage,
      genericFields: genericAnalysisFields,
      modes: expectedModes,
    },
    null,
    2,
  ),
);

function extractObjectBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) return "";

  const braceStart = source.indexOf("{", start);
  if (braceStart === -1) return "";

  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(braceStart, index + 1);
  }

  return "";
}

function extractModeGuidanceBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) return "";

  const end = source.indexOf("\n  if (mode ===", start + marker.length);
  if (end === -1) {
    const fallbackEnd = source.indexOf("\n  return {", start + marker.length);
    return fallbackEnd === -1 ? source.slice(start) : source.slice(start, fallbackEnd);
  }

  return source.slice(start, end);
}
