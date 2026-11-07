"use client";
import { useEffect } from "react";
import { gsap, registerGsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { story } from "@/lib/scroll";
import { triggers } from "@/lib/triggers";

/**
 * Maps page scroll onto the 3D story timeline (story.t) and drives the HTML reveals.
 *   hero 0→1 · experience 1→4 (pinned) · community 4→5 (pinned on desktop) · how 5→6 (pinned) · CTA 6→6.45
 * Desktop pins are longer; mobile pins are short so the page stays compact.
 */
export function HomeMotion() {
  useEffect(() => {
    registerGsap();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    story.reduced = reduced;
    const splits: SplitText[] = [];
    const mm = gsap.matchMedia();

    const setT = (v: number) => {
      story.t = v;
      story.version++;
    };
    /** links a trigger's progress to a span of the story timeline */
    const span = (a: number, b: number) => ({
      onUpdate: (self: ScrollTrigger) => setT(a + (b - a) * self.progress),
      onLeave: () => setT(b),
      onLeaveBack: () => setT(a),
    });

    const setBeat = (p: number) => {
      const i = Math.min(2, Math.floor(p * 3));
      document.querySelectorAll<HTMLElement>("[data-beat]").forEach((el) => el.classList.toggle("is-on", Number(el.dataset.beat) === i));
      document.querySelectorAll<HTMLElement>("[data-tick]").forEach((el) => el.classList.toggle("is-on", Number(el.dataset.tick) <= i));
    };
    const setTab = (i: number) => {
      if (story.tab === i) return;
      story.tab = i;
      story.version++;
      window.dispatchEvent(new CustomEvent("cd:tab", { detail: i }));
    };
    const setStep = (p: number) => {
      story.how = p;
      story.version++;
      const i = Math.min(4, Math.floor(p * 5 - 0.0001 + 0.2));
      document.querySelectorAll<HTMLElement>("[data-step]").forEach((el) => el.classList.toggle("is-on", Number(el.dataset.step) <= Math.max(0, i)));
    };

    const ctx = gsap.context(() => {
      setBeat(0);
      setStep(0);

      mm.add({ desktop: "(min-width: 900px)", mobile: "(max-width: 899px)" }, (c) => {
        const desktop = !!c.conditions?.desktop;
        const pinLen = (d: number, m: number) => `+=${(desktop ? d : m) * 100}%`;

        ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", ...span(0, 1) });

        ScrollTrigger.create({
          trigger: ".exp",
          start: "top top",
          end: pinLen(2.1, 1.6),
          pin: "[data-pin='exp']",
          anticipatePin: 1,
          ...span(1, 4),
          onUpdate: (self) => {
            setT(1 + 3 * self.progress);
            setBeat(self.progress);
          },
        });

        ScrollTrigger.create({ trigger: ".comm", start: "top bottom", end: "top top", ...span(4, 4.4) });
        triggers.comm = ScrollTrigger.create({
          trigger: ".comm",
          start: "top top",
          end: desktop ? pinLen(1.6, 0) : "bottom 40%",
          pin: desktop ? "[data-pin='comm']" : false,
          anticipatePin: 1,
          ...span(4.4, 4.95),
          onUpdate: (self) => {
            setT(4.4 + 0.55 * self.progress);
            if (desktop) setTab(Math.min(4, Math.floor(self.progress * 5)));
          },
        });

        ScrollTrigger.create({ trigger: ".how", start: "top bottom", end: "top top", ...span(4.95, 5.35) });
        ScrollTrigger.create({
          trigger: ".how",
          start: "top top",
          end: pinLen(1.1, 0.9),
          pin: "[data-pin='how']",
          anticipatePin: 1,
          ...span(5.35, 5.95),
          onUpdate: (self) => {
            setT(5.35 + 0.6 * self.progress);
            setStep(self.progress);
          },
        });

        ScrollTrigger.create({ trigger: ".cta", start: "top bottom", end: "top top", ...span(5.95, 6.45) });

        if (reduced) return;

        // each beat's text clears out as the next colour field arrives
        ([
          [".exp__pin", ".comm"],
          [".comm__pin", ".how"],
          [".how__pin", ".cta"],
        ] as const).forEach(([el, next]) =>
          gsap.fromTo(el, { autoAlpha: 1 }, { autoAlpha: 0, ease: "none", immediateRender: false, scrollTrigger: { trigger: next, start: "top 95%", end: "top 50%", scrub: true } }),
        );

        // hero leaves: type lifts away as the 3D scatters
        gsap.to(".hero__inner, .hero__stats", { yPercent: -18, autoAlpha: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "70% top", scrub: true } });
      });

      if (reduced) return;

      // hero entrance
      const intro = gsap.timeline({ delay: 0.15, defaults: { ease: "expo.out" } });
      intro
        .from("[data-hero='sticker']", { yPercent: -160, rotate: (i) => (i ? 18 : -18), autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: "back.out(1.7)" })
        .from("[data-hero='word']", { yPercent: 110, rotate: 6, autoAlpha: 0, duration: 1.2, stagger: 0.08 }, 0.15)
        .from("[data-hero='fade']", { y: 24, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.6);

      // headline reveals: masked lines, brush titles rise with a slight tilt
      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
        const brush = el.classList.contains("brush");
        const split = SplitText.create(el, { type: brush ? "words" : "lines", mask: brush ? "words" : "lines", wordsClass: "split-word", linesClass: "split-line", aria: "auto" });
        splits.push(split);
        gsap.from(brush ? split.words : split.lines, {
          yPercent: 115,
          rotate: brush ? 7 : 0,
          duration: 1.1,
          stagger: 0.07,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
      });

      // magnetic CTA
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
        el.addEventListener("pointermove", (e) => {
          if (e.pointerType !== "mouse") return;
          const r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.3);
          yTo((e.clientY - r.top - r.height / 2) * 0.4);
        });
        el.addEventListener("pointerleave", () => {
          xTo(0);
          yTo(0);
        });
      });
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      ctx.revert();
      mm.revert();
      splits.forEach((s) => s.revert());
      triggers.comm = undefined;
    };
  }, []);
  return null;
}
