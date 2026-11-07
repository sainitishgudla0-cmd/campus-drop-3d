"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let done = false;
export function registerGsap() {
  if (!done && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    done = true;
  }
  return gsap;
}
export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export { gsap, ScrollTrigger, SplitText };
