"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlatformStats, type PlatformStats } from "@/lib/api";
import { story } from "@/lib/scroll";
import { triggers } from "@/lib/triggers";
import { Arrow, LogoMark } from "@/components/ui/Brand";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

/* ─────────────── 1 · Hero ─────────────── */
export function Hero() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  useEffect(() => {
    getPlatformStats().then(setStats).catch(() => setStats(null));
  }, []);
  return (
    <section className="hero" id="top" data-sec="hero" aria-labelledby="hero-title">
      <div className="hero__inner">
        <div className="hero__stickers" aria-hidden="true">
          <span className="sticker sticker--sky" data-hero="sticker">
            Weekly drops
          </span>
          <span className="sticker sticker--lime" data-hero="sticker">
            Campus plans
          </span>
        </div>
        <h1 id="hero-title" className="brush hero__title" aria-label="Your campus. Your people.">
          <span className="hero__line" aria-hidden="true">
            <span data-hero="word">Your</span> <span data-hero="word">campus.</span>
          </span>
          <span className="hero__line hero__line--2" aria-hidden="true">
            <span data-hero="word">Your</span> <span data-hero="word">people.</span>
          </span>
        </h1>
        <p className="hero__sub" data-hero="fade">
          Meet students who share your interests. Get a weekly drop of new friends, and join campus plans like a 5 PM library session or an evening walk.
        </p>
        <div className="hero__ctas" data-hero="fade">
          <Link href="/signup" className="pill pill--cream">
            Join CampusDrop <Arrow />
          </Link>
          <a href="#how" className="pill pill--line">
            Discover how it works
          </a>
        </div>
      </div>
      <p className="hero__stats" data-hero="fade" aria-live="polite">
        {stats ? (
          <>
            <b>{fmt(stats.verifiedStudents)}</b> verified students · <b>{fmt(stats.supportedUniversities)}</b> campuses
          </>
        ) : (
          "Campus-only · verified students"
        )}
      </p>
      <a href="#experience" className="hero__cue" aria-label="Scroll to the CampusDrop experience" data-hero="fade">
        <Arrow down />
      </a>
    </section>
  );
}

/* ─────────────── 2 · The experience ─────────────── */
const BEATS = [
  { n: "01", t: "A weekly drop of new friends", d: "Each week you get a few thoughtful people from your own campus. No endless swiping, just people worth meeting." },
  { n: "02", t: "Matched by what you share", d: "Music, sports, study habits, coffee spots. Every drop shows the interests you have in common." },
  { n: "03", t: "Make plans together", d: "Start a plan (library at 5, an evening walk, Sunday football) or join one. Everyone who joins can chat and coordinate." },
];

export function Experience() {
  return (
    <section className="exp" id="experience" data-sec="exp" aria-labelledby="exp-title">
      <div className="exp__pin" data-pin="exp">
        <div className="exp__head">
          <span className="sticker sticker--coral">The CampusDrop experience</span>
          <h2 id="exp-title" className="brush exp__title" data-split>
            One drop. Every week.
          </h2>
        </div>
        <ol className="exp__beats">
          {BEATS.map((b, i) => (
            <li key={b.n} className="exp__beat" data-beat={i}>
              <span className="label">{b.n}</span>
              <h3 className="display-sm">{b.t}</h3>
              <p>{b.d}</p>
            </li>
          ))}
        </ol>
        <div className="exp__ticks" aria-hidden="true">
          {BEATS.map((b, i) => (
            <span key={b.n} data-tick={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 3 · Community ─────────────── */
const EXPERIENCES = [
  { t: "Weekly drops", d: "A small, thoughtful set of students from your campus every week, chosen by shared interests and vibe. Friendship first.", href: "/signup", cta: "Get your first drop" },
  { t: "Campus events", d: "Create a plan or join one: a 5 PM library session, an evening walk, a pickup match. See who’s going before you go.", href: "/campus-activities", cta: "Browse events" },
  { t: "Plan & chat", d: "Everyone who joins a plan can message each other to sort out the when and where. You choose who you talk to.", href: "/signup", cta: "Start planning" },
  { t: "Roommate discovery", d: "Find someone who gets your 7 a.m. alarm, your quiet hours and your plant collection.", href: "/roommates", cta: "Find roommates" },
  { t: "Anonymous confessions", d: "Say the thing without the name tag. A campus-only board for the stories everyone’s thinking.", href: "/confessions", cta: "Read confessions" },
];

export function Community() {
  const [tab, setTab] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setTab((e as CustomEvent<number>).detail);
    window.addEventListener("cd:tab", on);
    return () => window.removeEventListener("cd:tab", on);
  }, []);

  const choose = (i: number) => {
    const st = triggers.comm;
    if (st && st.pin) {
      const y = st.start + ((i + 0.5) / EXPERIENCES.length) * (st.end - st.start);
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 0.9 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      story.tab = i;
      story.version++;
      setTab(i);
    }
  };

  const x = EXPERIENCES[tab];
  return (
    <section className="comm" id="community" data-sec="comm" aria-labelledby="comm-title">
      <div className="comm__pin" data-pin="comm">
        <h2 id="comm-title" className="display comm__title" data-split>
          Discover your campus community
        </h2>
        <div className="comm__tabs" role="tablist" aria-label="CampusDrop experiences">
          {EXPERIENCES.map((e, i) => (
            <button key={e.t} role="tab" id={`tab-${i}`} aria-selected={tab === i} aria-controls="comm-panel" className="comm__tab" onClick={() => choose(i)}>
              <span className="label">0{i + 1}</span>
              {e.t}
            </button>
          ))}
        </div>
        <div className="comm__panel" id="comm-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} aria-live="polite">
          <p key={tab} className="comm__desc">
            {x.d}
          </p>
          <a href={x.href} className="pill pill--ink">
            {x.cta} <Arrow />
          </a>
          <span className="label comm__count">
            0{tab + 1} / 0{EXPERIENCES.length}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── 4 · How it works ─────────────── */
const STEPS = [
  { t: "Verify your university", d: "A one-time code to your campus email, or your student ID where your campus allows it." },
  { t: "Create your profile", d: "A photo or an illustrated avatar, plus your course and interests." },
  { t: "Get your weekly drop", d: "New people from your campus who share your interests." },
  { t: "Create or join a plan", d: "Study sessions, walks, games: anything you’d enjoy doing together." },
  { t: "Chat and meet up", d: "Coordinate with the people who joined, then go do the thing." },
];

export function HowItWorks() {
  return (
    <section className="how" id="how" data-sec="how" aria-labelledby="how-title">
      <div className="how__pin" data-pin="how">
        <h2 id="how-title" className="brush how__title" data-split>
          How it works
        </h2>
        <ol className="how__steps">
          {STEPS.map((s, i) => (
            <li key={s.t} className="how__step" data-step={i}>
              <span className="how__n brush" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3 className="display-sm">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.t}
                </h3>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─────────────── 5 · Final CTA (+ compact footer) ─────────────── */
export function FinalCta() {
  return (
    <section className="cta" id="join" data-sec="cta" aria-labelledby="cta-title">
      <div className="cta__inner">
        <h2 id="cta-title" className="brush cta__title" data-split>
          Your people are out there.
        </h2>
        <div className="cta__actions">
          <Link href="/signup" className="pill pill--cream pill--lg" data-magnetic>
            Join CampusDrop <Arrow />
          </Link>
          <Link href="/login" className="pill pill--line">
            I already have an account
          </Link>
        </div>
      </div>
      <footer className="foot">
        <span className="foot__brand">
          <LogoMark />
          <span className="logo__word">
            campus<span className="logo__drop">drop</span>
          </span>
        </span>
        <nav aria-label="Footer" className="foot__links">
          <a href="/safety">Safety</a>
          <a href="/community-guidelines">Guidelines</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="mailto:support@campusdrop.social">Support</a>
          <a href="https://instagram.com/campusdrop.official" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        </nav>
        <span className="foot__fine">© {new Date().getFullYear()} CampusDrop · Avatars are AI-generated illustrations of fictional people.</span>
      </footer>
    </section>
  );
}
