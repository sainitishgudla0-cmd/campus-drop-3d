"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Brand";
import { avatarSrc } from "@/lib/avatars";

const MiniStage = dynamic(() => import("@/components/three/MiniStage"), { ssr: false });

type Variant = "login" | "signup" | "verify" | "onboarding";
const ART: Record<Variant, { line1: string; line2: string; avatars: [string, string]; sticker: string }> = {
  login: { line1: "Good to see", line2: "you again.", avatars: ["cd-a05", "cd-b02"], sticker: "Welcome back" },
  signup: { line1: "Your people", line2: "are waiting.", avatars: ["cd-a02", "cd-b07"], sticker: "Verified university students" },
  verify: { line1: "Real students.", line2: "Real campus.", avatars: ["cd-a08", "cd-b10"], sticker: "Student verification" },
  onboarding: { line1: "Make it", line2: "yours.", avatars: ["cd-a10", "cd-b05"], sticker: "Your profile" },
};

/** Split screen: coral 3D art panel + cream form. On phones it becomes a compact band. */
export function AuthShell({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  const art = ART[variant];
  const [gl, setGl] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const wide = window.matchMedia("(min-width: 900px)");
    const check = () => {
      let ok = false;
      try {
        const c = document.createElement("canvas");
        ok = !!(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {}
      setGl(ok && wide.matches);
    };
    check();
    wide.addEventListener("change", check);
    return () => wide.removeEventListener("change", check);
  }, []);

  return (
    <div className="auth">
      <aside className="auth__art">
        <div className="auth__art-top">
          <Logo />
          <Link href="/" className="auth__home label">
            ← Home
          </Link>
        </div>
        <div className="auth__stage" aria-hidden="true">
          {gl ? (
            <MiniStage avatars={art.avatars} reduced={reduced} />
          ) : (
            <div className="auth__faces">
              {[art.avatars[0], art.avatars[1], "cd-a03"].map((id) => (
                <img key={id} src={avatarSrc(id)} alt="" width={96} height={96} />
              ))}
            </div>
          )}
        </div>
        <div className="auth__art-copy">
          <span className="sticker sticker--sky">{art.sticker}</span>
          <p className="brush auth__quote">
            {art.line1}
            <br />
            {art.line2}
          </p>
          <p className="auth__fine">Avatars are AI-generated illustrations of fictional people.</p>
        </div>
      </aside>
      <main id="main" className="auth__main">
        <div className="auth__panel">{children}</div>
        <footer className="auth__foot">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="mailto:support@campusdrop.social">Support</a>
        </footer>
      </main>
    </div>
  );
}

export function JourneyRail({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  const steps = ["Account", "Verify", "Profile", "Experience", "Review"];
  return (
    <ol className="rail" aria-label={`Sign-up progress: step ${current} of 5`}>
      {steps.map((s, i) => {
        const n = i + 1;
        const st = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li key={s} className={`rail__step rail__step--${st}`} aria-current={st === "current" ? "step" : undefined}>
            <span className="label">0{n}</span>
            <span className="rail__label">{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
