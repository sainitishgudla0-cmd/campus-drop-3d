/**
 * Backend details that could NOT be confirmed from the public campusdrop.social bundles,
 * because the screens that use them sit behind login. Everything here is isolated so it
 * can be confirmed against the backend source (or one logged-in request) and changed in
 * one place. Validation errors from the backend are surfaced in the UI field-by-field,
 * so a mismatch shows up as a readable message, never a silent failure.
 *
 * Verified (from live bundles): all endpoints in lib/api.ts, OTP payloads, profile shape,
 * photo upload (multipart `file` + `order`), university list & domain rules, cookie session.
 */
export const CONTRACT = {
  idCard: {
    /** Confirmed to exist (401 when signed out). */
    endpoint: "/api/profile/id-card",
    /** UNVERIFIED: multipart field name. Mirrors the confirmed photo upload, which uses "file". */
    fileField: "file",
    /** UNVERIFIED: limits. Kept conservative; the server remains the authority. */
    maxBytes: 8 * 1024 * 1024,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
  },

  /**
   * UNVERIFIED: values for `profile.lookingFor`. The live landing page offers
   * "friend drop, date drop, or both"; the exact stored strings are only in the
   * onboarding screen. Labels in the UI are CampusDrop's language, values are sent as-is.
   */
  lookingFor: [
    { value: "friends", label: "Friendship drops", hint: "New friends on your campus. This is the default." },
    { value: "both", label: "Friends + Connection drops", hint: "Friendship drops, plus an optional connection drop when you’re open to it." },
    { value: "date", label: "Connection drops only", hint: "Only optional connection drops." },
  ],

  /** UNVERIFIED: values for `profile.gender` / `connectionPreferenceGenders`. */
  genders: [
    { value: "woman", label: "Woman" },
    { value: "man", label: "Man" },
    { value: "non_binary", label: "Non-binary" },
  ],

  /**
   * UNVERIFIED: whether PATCH /api/profile accepts `avatar` as a URL. The avatar picker
   * tries it, re-reads the profile to confirm it stuck, and otherwise falls back to the
   * confirmed photo-upload endpoint (only when the student has no real photo).
   */
  avatarPatchField: "avatar",
} as const;

export type LookingFor = (typeof CONTRACT.lookingFor)[number]["value"];
