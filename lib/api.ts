/**
 * Typed client for the existing CampusDrop backend.
 *
 * Every endpoint, payload and response field below was taken from the live
 * campusdrop.social client bundles (Nov 2026). Calls go to this origin's /api/*,
 * which forwards to the real backend (lib/server/proxy.ts) — there is no mock layer.
 * Anything not verifiable from the public bundles is isolated in lib/contract.ts.
 */
import { CONTRACT } from "./contract";
import { normalizeProfile, type Profile, type ProfilePatch } from "./profile";

export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;
  code?: string;
  /** Field-level validation messages, when the backend returns `{ error: { field: [msg] } }`. */
  fields?: Record<string, string>;

  constructor(status: number, message: string, opts: { retryAfterSeconds?: number; code?: string; fields?: Record<string, string> } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    Object.assign(this, opts);
  }
}

function parseError(status: number, body: unknown): ApiError {
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const raw = obj?.error;
  let message = `Something went wrong (HTTP ${status}).`;
  let fields: Record<string, string> | undefined;
  if (typeof raw === "string") message = raw;
  else if (raw && typeof raw === "object") {
    fields = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const msg = Array.isArray(v) ? v.filter(Boolean).join(" ") : String(v ?? "");
      if (msg) fields[k] = msg;
    }
    message = Object.values(fields)[0] || message;
  }
  if (status === 429 && typeof raw !== "string") message = "Too many attempts. Please wait a moment and try again.";
  return new ApiError(status, message, {
    retryAfterSeconds: typeof obj?.retryAfterSeconds === "number" ? obj.retryAfterSeconds : undefined,
    code: typeof obj?.code === "string" ? obj.code : undefined,
    fields,
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: isForm ? init.headers : { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError(0, "You appear to be offline. Check your connection and try again.");
  }
  let body: unknown = null;
  if (res.status !== 204) body = await res.json().catch(() => null);
  if (!res.ok) throw parseError(res.status, body);
  return body as T;
}

const get = <T>(p: string) => request<T>(p);
const post = <T>(p: string, data?: unknown) => request<T>(p, { method: "POST", body: JSON.stringify(data ?? {}) });
const patch = <T>(p: string, data: unknown) => request<T>(p, { method: "PATCH", body: JSON.stringify(data) });

/* ───────────────────────── Public ───────────────────────── */

export interface PlatformStats {
  totalUsers: number;
  verifiedStudents: number;
  supportedUniversities: number;
  campusConnections: number;
  dropEligibleStudents: number;
}
export const getPlatformStats = () => get<PlatformStats>("/api/platform/stats");

export interface University {
  id: string;
  name: string;
  campus: string | null;
  slug: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  domains: string[];
  allowPublicEmailLogin: boolean;
}
export const getUniversities = () =>
  get<{ universities?: University[]; countries?: string[] }>("/api/universities").then((r) => r.universities ?? []);

export interface UniversityRequest {
  universityName: string;
  city: string;
  state: string;
  country: string;
  domain: string;
  email: string;
  note: string;
}
export const requestUniversity = (body: UniversityRequest) => post<unknown>("/api/university-requests", body);

export type SupportCategory = "login_otp" | "university_not_listed" | "profile" | "match" | "safety" | "housing" | "other";
export const sendSupportRequest = (body: { category: SupportCategory; subject: string; message: string; email?: string; anonymous: boolean }) =>
  post<unknown>("/api/support/requests", body);

/* ───────────────────────── Auth (passwordless email OTP) ───────────────────────── */

export type AuthMode = "login" | "signup";

export const getSession = () => get<{ authenticated: boolean }>("/api/auth/session").catch(() => ({ authenticated: false }));

export const sendOtp = (email: string, mode: AuthMode, universityId?: string) =>
  post<{ expiresInSeconds?: number }>("/api/auth/send-otp", { email, ...(universityId ? { universityId } : {}), mode });

export interface VerifyOtpResult {
  isNewUser?: boolean;
  requiresIdCard?: boolean;
}
export const verifyOtp = (email: string, code: string, mode: AuthMode, universityId?: string) =>
  post<VerifyOtpResult>("/api/auth/verify-otp", { email, code, universityId, mode });

export const logout = () => post<unknown>("/api/auth/logout", {}).catch(() => undefined);

export const getMe = () => get<{ user?: { email?: string } }>("/api/auth/me");

/** Mirrors the platform's referral hand-off after a successful OTP. */
export async function claimPendingReferral(params: URLSearchParams) {
  try {
    const ref = params.get("ref") ?? window.localStorage.getItem("cd_pending_ref");
    if (!ref) return;
    const source = params.get("source") ?? window.localStorage.getItem("cd_pending_ref_source") ?? "PROFILE_LINK";
    await post("/api/referral", { referrerId: ref, source });
    window.localStorage.removeItem("cd_pending_ref");
    window.localStorage.removeItem("cd_pending_ref_source");
  } catch {
    /* referral is best-effort, exactly like the existing app */
  }
}

/* ───────────────────────── Profile ───────────────────────── */

export const getProfile = () => get<{ profile: Record<string, unknown> | null }>("/api/profile").then((r) => (r.profile ? normalizeProfile(r.profile) : null));

export const updateProfile = (data: ProfilePatch) => patch<{ profile?: Record<string, unknown> }>("/api/profile", data);

export async function uploadProfilePhoto(file: Blob, order: number, filename = "photo.jpg") {
  const fd = new FormData();
  fd.append("file", file, filename);
  fd.append("order", String(order));
  return request<Record<string, unknown>>("/api/profile/photos", { method: "POST", body: fd });
}

export const deleteProfilePhoto = (id: string) => request<unknown>(`/api/profile/photos/${encodeURIComponent(id)}`, { method: "DELETE" });

/* ───────────────────────── Student ID verification ───────────────────────── */

export type IdCardState = "not_submitted" | "pending" | "approved" | "rejected" | "unknown";
export interface IdCardStatus {
  state: IdCardState;
  reason?: string;
  submittedAt?: string;
  rawStatus?: string;
}

function readStatus(body: unknown): IdCardStatus {
  const o = (body && typeof body === "object" ? body : {}) as Record<string, any>;
  const node = o.idCard ?? o.verification ?? o.submission ?? o;
  const raw: string | undefined = [node?.status, node?.state, o.status, o.verificationStatus, o.idCardStatus].find(
    (v) => typeof v === "string" && v,
  );
  const reason: string | undefined = [node?.reason, node?.rejectionReason, node?.reviewNote, node?.note, o.reason].find(
    (v) => typeof v === "string" && v,
  );
  const submittedAt: string | undefined = [node?.submittedAt, node?.createdAt, node?.uploadedAt].find((v) => typeof v === "string");
  let state: IdCardState = raw ? "unknown" : o.submitted ? "pending" : "not_submitted";
  const s = (raw || "").toLowerCase();
  if (/none|not_submitted|missing|required/.test(s)) state = "not_submitted";
  else if (/pend|review|submitted|queue|waiting/.test(s)) state = "pending";
  else if (/approv|verif|accept/.test(s)) state = "approved";
  else if (/reject|denied|declin|fail|invalid/.test(s)) state = "rejected";
  if (o.verified === true || o.approved === true) state = "approved";
  return { state, reason, submittedAt, rawStatus: raw };
}

export const getIdCardStatus = () =>
  get<unknown>(CONTRACT.idCard.endpoint)
    .then(readStatus)
    .catch((e) => {
      if (e instanceof ApiError && e.status === 404) return { state: "not_submitted" as const };
      throw e;
    });

export async function uploadIdCard(file: Blob, filename = "student-id.jpg") {
  const fd = new FormData();
  fd.append(CONTRACT.idCard.fileField, file, filename);
  const body = await request<unknown>(CONTRACT.idCard.endpoint, { method: "POST", body: fd });
  return readStatus(body);
}

export type { Profile };
