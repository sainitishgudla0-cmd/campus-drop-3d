import type { NextRequest } from "next/server";
import { proxy } from "@/lib/server/proxy";

export const dynamic = "force-dynamic";

/** Forwards every /api/* call to the existing CampusDrop backend (see lib/server/proxy.ts). */
async function handler(req: NextRequest) {
  return proxy(req, { upstreamPath: req.nextUrl.pathname + req.nextUrl.search });
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
