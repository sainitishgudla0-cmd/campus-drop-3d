import Link from "next/link";

/**
 * CampusDrop mark: an open campus circle (the community) with this week's drop card
 * falling into it. The card carries two overlapping heads: two students meeting.
 */
export function LogoMark({ className = "mark" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <circle cx="18" cy="22" r="12.5" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeDasharray="60 18.5" transform="rotate(-62 18 22)" />
      <g transform="rotate(16 29 11)">
        <rect x="22.5" y="3" width="13" height="15.5" rx="3" fill="var(--mark-card, #cff27a)" stroke="var(--mark-edge, #17141f)" strokeWidth="1.6" />
        <circle cx="27.4" cy="10.4" r="2.6" fill="var(--mark-edge, #17141f)" />
        <circle cx="31" cy="11.4" r="2.6" fill="#ff5a36" stroke="var(--mark-card, #cff27a)" strokeWidth="1" />
        <rect x="25.2" y="14.2" width="7.6" height="1.8" rx="0.9" fill="var(--mark-edge, #17141f)" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="CampusDrop home">
      <LogoMark />
      <span className="logo__word">
        campus<span className="logo__drop">drop</span>
      </span>
    </Link>
  );
}

/** Superlist-style round arrow badge used inside pills. */
export function Arrow({ down = false, back = false }: { down?: boolean; back?: boolean }) {
  return (
    <span className={`arrow${down ? " arrow--down" : ""}${back ? " arrow--back" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}
