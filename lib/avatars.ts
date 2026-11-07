import manifest from "./avatars.json";

/**
 * CampusDrop illustrated avatar collection: AI-generated 3D-clay portraits of fictional
 * people (scripts/build-avatars.py). They never represent real students.
 */
export interface AvatarOption {
  id: string;
  bg: string;
}
export const AVATARS = manifest as AvatarOption[];
export const avatarSrc = (id: string) => `/avatars/${id}.webp`;
export const isIllustratedAvatar = (url: string | undefined | null) => !!url && /\/avatars\/cd-[ab]\d{2}\.webp/.test(url);
export function absoluteAvatarUrl(id: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return base + avatarSrc(id);
}
