// Drives the signup UI against the real university list without sending any code to a real inbox.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch { pw = require("C:/Users/saini/Downloads/campus-drop-anime/node_modules/playwright"); }
const [base, out] = process.argv.slice(2);
const b = await pw.chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(base + "/signup", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await p.screenshot({ path: out + "/signup-view.png" });
await p.getByRole("combobox").fill("monash");
await p.waitForTimeout(400);
const opts = await p.getByRole("option").allTextContents();
console.log("options:", opts.slice(0, 3));
await p.keyboard.press("Enter");
await p.waitForTimeout(400);
console.log("campus card:", await p.locator(".campus-card__name").textContent());
await p.locator('input[type=email]').fill("someone@gmail.com");
await p.locator('input[type=email]').blur();
await p.waitForTimeout(200);
console.log("domain error:", await p.locator("#email-help").textContent());
await p.getByText("Don’t have access to your university email?").click();
await p.waitForTimeout(300);
console.log("noemail panel:", (await p.locator(".noemail__body").textContent()).slice(0, 140));
await p.screenshot({ path: out + "/signup-filled.png", fullPage: true });
console.log(errs.length ? errs : "no page errors");
await b.close();
