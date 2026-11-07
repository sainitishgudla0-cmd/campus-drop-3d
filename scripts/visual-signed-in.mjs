// VISUAL QA HARNESS ONLY — intercepts /api/* inside the test browser so signed-in screens can be
// screenshotted without a real account. Nothing here ships in the app.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require("C:/Users/saini/Downloads/campus-drop-anime/node_modules/playwright"); }
const [base, out, w = "1440", h = "900"] = process.argv.slice(2);
const fixture = {
  id: "qa", name: "Test Student", age: 20, college: "Sample University", program: "B.Sc Design", year: 2,
  avatar: "", photos: [], photoIds: [], bio: "Fixture text for layout testing.", interests: ["Film photography", "Chess", "Hiking", "Podcasts"],
  hometown: "Somewhere", mbti: "", zodiac: "", verified: true, completionPct: 64, insightsReviewed: false,
  lookingFor: "friends", connectionPreferenceGenders: [], favoritePlaces: [],
};
const b = await pw.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
await ctx.addCookies([{ name: "campus-drop-session", value: "qa-harness", url: base }]);
await ctx.route("**/api/profile", (r) => r.fulfill({ json: { profile: fixture } }));
await ctx.route("**/api/auth/me", (r) => r.fulfill({ json: { user: { email: "qa@example.edu" } } }));
await ctx.route("**/api/profile/id-card", (r) => r.fulfill({ json: { status: "none" } }));
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const shot = async (path, name) => { await p.goto(base + path, { waitUntil: "networkidle" }); await p.waitForTimeout(1400); await p.screenshot({ path: `${out}/${name}.png` }); };
await shot("/onboarding/profile", "si-onboarding");
await p.getByRole("button", { name: /choose a picture/i }).click();
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/si-picker.png` });
await p.keyboard.press("Escape");
await shot("/profile", "si-profile");
await shot("/verify/id-card?next=%2Fonboarding%2Fprofile", "si-idcard");
console.log(errs.length ? errs : "no page errors");
await b.close();
