// Hovers footer links + outline pills and reports text/background contrast in the hover state.
// Usage: node scripts/hover-test.mjs <baseUrl> <screenshot.png> [width] [height]
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = require("C:/Users/saini/Downloads/campus-drop-anime/node_modules/playwright");
}
const [base, out, w = "1440", h = "900"] = process.argv.slice(2);
const b = await pw.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, reducedMotion: "reduce" })).newPage();
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(1500);

function lum(c) {
  const [r, g, bl] = c.match(/[\d.]+/g).map(Number).slice(0, 3).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}
function ratio(a, c) {
  const [l1, l2] = [lum(a), lum(c)].sort((x, y) => y - x);
  return ((l1 + 0.05) / (l2 + 0.05)).toFixed(2);
}

const targets = await p.$$(".foot__links a, .cta .pill--line");
for (const t of targets) {
  await t.hover();
  await p.waitForTimeout(350);
  const r = await t.evaluate((el) => {
    const s = getComputedStyle(el);
    let bg = s.backgroundColor;
    if (bg === "transparent" || bg === "rgba(0, 0, 0, 0)") bg = "rgb(255, 90, 54)"; // coral field behind
    return { text: el.textContent.trim(), fg: s.color, bg };
  });
  console.log(`${r.text.padEnd(28)} fg ${r.fg}  bg ${r.bg}  contrast ${ratio(r.fg, r.bg)}:1`);
}
if (targets[1]) {
  await targets[1].hover();
  await p.waitForTimeout(300);
}
await p.screenshot({ path: out, clip: { x: 0, y: +h - 120, width: +w, height: 120 } });
await b.close();
