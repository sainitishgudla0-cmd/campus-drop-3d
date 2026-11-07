"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Brand";
import { Icon } from "@/components/ui/Icon";
import { ProfilePic } from "./ProfilePic";
import { logout, type Profile } from "@/lib/api";

/** Sections of the existing platform (served through the same-origin bridge). */
const SECTIONS = [
  { href: "/home", label: "Home" },
  { href: "/campus-activities", label: "Events" },
  { href: "/confessions", label: "Confessions" },
  { href: "/roommates", label: "Roommates" },
  { href: "/matches", label: "Matches" },
  { href: "/messages", label: "Messages" },
];

export function AppHeader({ profile, minimal = false }: { profile: Profile | null; minimal?: boolean }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setLeaving(true);
    await logout();
    window.location.replace("/login");
  }

  return (
    <header className="app-header">
      <div className="app-header__bar">
        <Logo href={minimal ? "/" : "/home"} />
        {!minimal && (
          <nav className="app-header__nav" aria-label="CampusDrop">
            {SECTIONS.map((s) => (
              <a key={s.href} href={s.href} className="app-header__link">
                {s.label}
              </a>
            ))}
          </nav>
        )}
        <div className="app-header__me" ref={menuRef}>
          <button className="app-header__avatar" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <ProfilePic profile={profile} size={40} />
            <span className="sr-only">Account menu</span>
          </button>
          {open && (
            <div className="app-menu" role="menu">
              <p className="app-menu__who">
                <strong>{profile?.name || "Your account"}</strong>
                {profile?.college && <span>{profile.college}</span>}
              </p>
              <a role="menuitem" href="/profile" aria-current={pathname === "/profile" ? "page" : undefined}>
                <Icon name="user" size={18} /> Profile
              </a>
              <a role="menuitem" href="/settings">
                <Icon name="sliders" size={18} /> Settings & privacy
              </a>
              <a role="menuitem" href="mailto:support@campusdrop.social">
                <Icon name="message" size={18} /> Support
              </a>
              <button role="menuitem" onClick={signOut} disabled={leaving}>
                <Icon name="logout" size={18} /> {leaving ? "Logging out…" : "Log out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
