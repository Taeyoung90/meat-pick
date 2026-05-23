import { readFile } from "node:fs/promises";

const [html, app, server] = await Promise.all([
  readFile(new URL("./index.html", import.meta.url), "utf8"),
  readFile(new URL("./app.js", import.meta.url), "utf8"),
  readFile(new URL("./server.mjs", import.meta.url), "utf8"),
]);

const requiredSnippets = [
  ['input type="radio" name="productMode" value="beef-grill"', html],
  ['input type="radio" name="productMode" value="leafy-greens"', html],
  ['input type="radio" name="productMode" value="tomato"', html],
  ["PRODUCT_MODES", app],
  ["scoreMetricsForMode", app],
  ["normalizeAnalysisFields", app],
  ["primarySignal", app],
  ["restoreHistoryResult", app],
  ["normalizeProductMode", server],
  ["analysisGuidanceFor", server],
  ["normalizeAnalysisResult", server],
  ["reserveUsage", server],
];

const missing = requiredSnippets.filter(([snippet, source]) => !source.includes(snippet)).map(([snippet]) => snippet);

const leafyBlock = extractObjectBlock(app, '"leafy-greens"');
const tomatoBlock = extractObjectBlock(app, "tomato:");
const produceForbidden = ["지방감", "마블링", "구이용", "고소함", "부드러움"];
const produceLeaks = produceForbidden.filter((word) => leafyBlock.includes(word) || tomatoBlock.includes(word));

if (missing.length || produceLeaks.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missing,
        produceLeaks,
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
      modes: ["beef-grill", "leafy-greens", "tomato"],
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
