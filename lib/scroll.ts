/**
 * Per-frame scroll/pointer state shared between the HTML (GSAP ScrollTrigger) and the
 * WebGL stage. Plain mutable values — read inside useFrame, never React state — so
 * scrolling never triggers React re-renders.
 *
 * `t` is the story timeline: 0 hero · 1–4 experience · 4–5 community · 5–6 how · 6–7 CTA.
 */
export const story = {
  t: 0,
  /** community: active experience index (0–4) */
  tab: 0,
  /** how-it-works: 0–1 progress along the five steps */
  how: 0,
  pointer: { x: 0, y: 0 },
  reduced: false,
  mobile: false,
  /** bumps when something the stage depends on changes (used in reduced-motion demand mode) */
  version: 0,
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
