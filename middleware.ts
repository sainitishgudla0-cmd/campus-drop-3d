import { NextResponse, type NextRequest } from "next/server";
import { isOwnRoute } from "@/lib/nav";

const PROTECTED = [/^\/onboarding(\/|$)/, /^\/profile(\/|$)/, /^\/verify\/id-card$/];

/**
 * 1. Cross-app navigation: when a page of the existing app (served through the bridge)
 *    client-navigates to one of this app's routes, its router asks for an RSC payload that
 *    belongs to a different build. Answering with a non-RSC response makes Next.js fall
 *    back to a clean full-page navigation instead of loading foreign chunks.
 * 2. Signed-in pages: a light gate that only checks the platform's session cookie exists;
 *    the backend validates it on every API call (401 → back to login).
 */
export function middleware(req: NextRequest) {
  // Next.js strips its own RSC headers before middleware, so detect router fetches by the
  // browser-controlled Fetch Metadata instead: real page loads are "document", router fetches "empty".
  const isRouterFetch = req.method === "GET" && req.headers.get("sec-fetch-dest") === "empty";
  if (isRouterFetch) {
    const ref = req.headers.get("referer");
    let refPath: string | null = null;
    try {
      refPath = ref ? new URL(ref).pathname : null;
    } catch {
      refPath = null;
    }
    if (refPath && !isOwnRoute(refPath)) {
      return new NextResponse("", { status: 200, headers: { "content-type": "text/plain", "cache-control": "no-store" } });
    }
  }

  const path = req.nextUrl.pathname;
  if (PROTECTED.some((r) => r.test(path)) && !req.cookies.get("campus-drop-session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/onboarding/:path*", "/profile/:path*", "/verify/:path*"],
};
