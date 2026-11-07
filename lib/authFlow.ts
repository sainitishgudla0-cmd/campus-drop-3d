import { claimPendingReferral, type VerifyOtpResult } from "./api";
import { safeNext } from "./redirect";
import { go } from "./nav";

/** Same post-OTP routing as the existing app. */
export async function routeAfterVerify(
  result: VerifyOtpResult,
  params: URLSearchParams,
  router: { push: (p: string) => void; replace: (p: string) => void },
) {
  const fallback = result.isNewUser ? "/onboarding/profile" : "/home";
  const dest = safeNext(params.get("next") ?? fallback, "/home");
  if (result.requiresIdCard) {
    go(`/verify/id-card?next=${encodeURIComponent(result.isNewUser ? "/onboarding/profile" : dest)}`, router);
    return;
  }
  await claimPendingReferral(params);
  go(result.isNewUser ? "/onboarding/profile" : dest, router);
}

/** Remember ?ref= across the signup hop, like the existing app. */
export function rememberReferral(params: URLSearchParams) {
  try {
    const ref = params.get("ref");
    if (ref) {
      window.localStorage.setItem("cd_pending_ref", ref);
      const src = params.get("source");
      if (src) window.localStorage.setItem("cd_pending_ref_source", src);
    }
  } catch {
    /* storage unavailable: referral is best-effort */
  }
}
