"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Arrow, Logo } from "@/components/ui/Brand";
import { getSession } from "@/lib/api";

const LINKS = [
  { href: "#experience", label: "Experience" },
  { href: "#community", label: "Community" },
  { href: "#how", label: "How it works" },
];

export function SiteNav() {
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    getSession().then((s) => setAuthed(!!s.authenticated));
  }, []);
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k);
    return () => {
      window.__lenis?.start();
      document.removeEventListener("keydown", k);
    };
  }, [open]);
  return (
    <header className={`nav${open ? " is-open" : ""}`}>
      <Logo />
      <nav className="nav__links" aria-label="Sections">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="nav__right">
        {authed ? (
          <>
            <Link href="/profile" className="nav__login">
              Profile
            </Link>
            <a href="/home" className="pill pill--ink pill--sm">
              Open app <Arrow />
            </a>
          </>
        ) : (
          <>
            <Link href="/login" className="nav__login">
              Log in
            </Link>
            <Link href="/signup" className="pill pill--ink pill--sm">
              Join <Arrow />
            </Link>
          </>
        )}
        <button className="nav__menu" aria-expanded={open} aria-controls="nav-sheet" onClick={() => setOpen((o) => !o)}>
          <span />
          <span />
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
      <div id="nav-sheet" className="nav__sheet" hidden={!open}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <Link href={authed ? "/profile" : "/login"} onClick={() => setOpen(false)}>
          {authed ? "Profile" : "Log in"}
        </Link>
      </div>
    </header>
  );
}
