import { isIllustratedAvatar } from "@/lib/avatars";
import { initials, type Profile } from "@/lib/profile";

/** Profile photo, illustrated avatar, or initials. Illustrations can carry a visible label. */
export function ProfilePic({ profile, size = 56, label = false, className = "" }: { profile: Pick<Profile, "avatar" | "name"> | null; size?: number; label?: boolean; className?: string }) {
  const src = profile?.avatar;
  const style = { "--size": `${size}px` } as React.CSSProperties;
  if (!src)
    return (
      <span className={`avatar avatar--initials ${className}`} style={style} aria-hidden="true">
        {initials(profile?.name || "C D")}
      </span>
    );
  return (
    <span className={`avatar ${className}`} style={style}>
      <img src={src} alt={profile?.name ? `${profile.name}’s profile picture` : "Profile picture"} width={size} height={size} />
      {label && isIllustratedAvatar(src) && <span className="badge-illustrative avatar__badge">Illustrated</span>}
    </span>
  );
}
