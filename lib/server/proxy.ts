/**
 * Same-origin bridge to the existing CampusDrop platform (the source of truth).
 *
 * Why a proxy instead of calling https://campusdrop.social directly from the browser:
 * the platform authenticates with a host-only, HttpOnly cookie (`campus-drop-session`).
 * Forwarding through this origin lets that cookie live first-party here, so the new
 * frontend uses the *real* session, the *real* OTP flow and the *real* data — no second
 * auth system, no duplicate users.
 *
 * Privacy: request and response bodies are never logged or stored here.
 */
import type { NextRequest } from "next/server";

export const UPSTREAM = (process.env.CAMPUSDROP_UPSTREAM || "https://campusdrop.social").replace(/\/$/, "");

/** Prefix under which the existing app's own static assets are re-mounted. */
export const LEGACY_PREFIX = "/cd-legacy";

const HOP_BY_HOP_REQUEST = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-connection",
]);

const DROP_RESPONSE = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "set-cookie",
  "strict-transport-security",
  "x-vercel-id",
  "x-vercel-cache",
  "x-matched-path",
  "server",
]);

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/** Rewrites a Set-Cookie value so it is valid on this origin. */
function adaptCookie(cookie: string, req: NextRequest): string {
  let c = cookie.replace(/;\s*Domain=[^;]*/gi, "");
  const isLocalHttp = req.nextUrl.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(req.nextUrl.hostname);
  if (isLocalHttp) c = c.replace(/;\s*Secure/gi, ""); // Safari refuses Secure cookies on http://localhost
  return c;
}

export interface ProxyOptions {
  /** Path + search on the upstream, e.g. "/api/profile?x=1". */
  upstreamPath: string;
  /** Rewrite `/_next/` references in HTML/JS/CSS so legacy pages load their own assets. */
  rewriteAssets?: boolean;
}

export async function proxy(req: NextRequest, { upstreamPath, rewriteAssets = false }: ProxyOptions): Promise<Response> {
  const target = UPSTREAM + upstreamPath;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_REQUEST.has(key.toLowerCase())) headers.set(key, value);
  });
  // The upstream should see its own origin; the real client IP is passed along for rate limiting.
  headers.set("origin", UPSTREAM);
  headers.delete("referer");
  const ip = clientIp(req);
  if (ip) {
    headers.set("x-forwarded-for", ip);
    headers.set("x-real-ip", ip);
  }

  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "CampusDrop is temporarily unreachable. Please try again in a moment.", code: "upstream_unreachable" },
      { status: 502 },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.has(key.toLowerCase())) out.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", adaptCookie(cookie, req));

  // Keep redirects on this origin (e.g. upstream middleware → /login?next=...).
  const location = upstream.headers.get("location");
  if (location) {
    const here = req.nextUrl.origin;
    out.set("location", location.startsWith(UPSTREAM) ? here + location.slice(UPSTREAM.length) : location);
  }

  const type = upstream.headers.get("content-type") || "";
  const textual = /text\/html|javascript|text\/css|text\/x-component/.test(type);
  if (rewriteAssets && textual && upstream.body) {
    let body = await upstream.text();
    body = body
      .replace(/(["'(`])\/_next\//g, `$1${LEGACY_PREFIX}/_next/`)
      .replace(/url\(\/_next\//g, `url(${LEGACY_PREFIX}/_next/`)
      .replaceAll(UPSTREAM, "");
    return new Response(body, { status: upstream.status, headers: out });
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
