import { getProfile, updateProfile, uploadProfilePhoto, type Profile } from "./api";
import { absoluteAvatarUrl, avatarSrc, isIllustratedAvatar } from "./avatars";
import { reencodeImage } from "./image";
import { CONTRACT } from "./contract";

export type AvatarResult = { ok: true; profile: Profile | null; method: "field" | "photo" } | { ok: false; reason: "has-photos" | "error"; message: string };

/**
 * Store an illustrated avatar against the student's real profile.
 * 1. Try PATCH /api/profile { avatar: url } and re-read the profile to confirm it stuck.
 * 2. Otherwise, if (and only if) the student has no real photos, upload the illustration
 *    through the confirmed photo endpoint so it becomes their profile picture.
 * A real uploaded photo is never replaced without the student removing it themselves.
 */
export async function applyIllustratedAvatar(id: string, current: Profile | null): Promise<AvatarResult> {
  const url = absoluteAvatarUrl(id);
  try {
    await updateProfile({ [CONTRACT.avatarPatchField]: url });
    const p = await getProfile();
    if (p?.avatar === url) return { ok: true, profile: p, method: "field" };
  } catch {
    /* field not accepted: fall through to the photo path */
  }
  const realPhotos = (current?.photos ?? []).filter((p) => !isIllustratedAvatar(p) && !/campusdrop-avatar-/.test(p));
  if (realPhotos.length > 0) {
    return {
      ok: false,
      reason: "has-photos",
      message: "Your uploaded photo stays as your profile picture. To use an illustrated avatar instead, remove that photo first.",
    };
  }
  try {
    const src = await fetch(avatarSrc(id)).then((r) => r.blob());
    const { blob } = await reencodeImage(src, { maxSide: 640, quality: 0.92 });
    await uploadProfilePhoto(blob, 0, `campusdrop-avatar-${id}.jpg`);
    return { ok: true, profile: await getProfile(), method: "photo" };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Couldn’t save your avatar." };
  }
}

/** Upload a student's own photo (metadata stripped) and make it their picture where possible. */
export async function applyOwnPhoto(file: File, current: Profile | null) {
  const { blob } = await reencodeImage(file, { maxSide: 1600, quality: 0.88 });
  const order = current?.photos.length ?? 0;
  const res = await uploadProfilePhoto(blob, order, "profile-photo.jpg");
  // If an illustrated avatar is set via the avatar field, point it at the new photo (best effort).
  if (current && isIllustratedAvatar(current.avatar)) {
    const url = findUrl(res);
    if (url) await updateProfile({ avatar: url }).catch(() => undefined);
  }
  return getProfile();
}

function findUrl(o: unknown): string | null {
  if (!o || typeof o !== "object") return null;
  for (const v of Object.values(o as Record<string, unknown>)) {
    if (typeof v === "string" && /^https?:\/\/|^\//.test(v) && /\.(jpe?g|png|webp)|\/photos?\//i.test(v)) return v;
    const nested = findUrl(v);
    if (nested) return nested;
  }
  return null;
}
