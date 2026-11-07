// Scroll-walk screenshots with WebGL (SwiftShader) enabled.
// Usage: node scripts/walk.mjs <url> <outPrefix> [width] [height] [reduced] [stepFactor]
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require("C:/Users/saini/Downloads/campus-drop-anime/node_modules/playwright"); }
const [url, out, w = "1440", h = "900", reduced, stepF = "0.6"] = process.argv.slice(2);
const b = await pw.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, reducedMotion: reduced === "reduced" ? "reduce" : "no-preference" });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text()));
await p.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForTimeout(3500);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = 0; y < total; y += +h * +stepF) {
  await p.evaluate((y) => window.scrollTo(0, y), y);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}-${String(i++).padStart(2, "0")}.png` });
  if (i > 40) break;
}
const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log("height", total, "shots", i, "h-overflow", overflow);
console.log(errs.length ? [...new Set(errs)].slice(0, 8).join("\n") : "no console errors");
await b.close();
