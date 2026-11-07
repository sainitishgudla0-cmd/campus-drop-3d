import type { NextRequest } from "next/server";
import { LEGACY_PREFIX, proxy } from "@/lib/server/proxy";

export const dynamic = "force-dynamic";

/**
 * Mounts the existing CampusDrop app for every route this frontend does not redesign
 * (home feed, matches, messages, confessions, events, roommates, settings, legal pages…).
 * Routes defined in this project always win over this catch-all.
 * The legacy app's static assets are served under /cd-legacy/_next/* so they never
 * collide with this app's own /_next/* files.
 */
async function handler(req: NextRequest) {
  let path = req.nextUrl.pathname;
  const isAsset = path.startsWith(LEGACY_PREFIX + "/");
  if (isAsset) path = path.slice(LEGACY_PREFIX.length);
  return proxy(req, { upstreamPath: path + req.nextUrl.search, rewriteAssets: true });
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE, handler as HEAD };
