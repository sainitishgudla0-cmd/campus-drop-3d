"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { smooth, story } from "@/lib/scroll";
import { avatarSrc } from "@/lib/avatars";

const Stage = dynamic(() => import("./Stage"), { ssr: false });

/** Diagonal colour wipes: each layer reveals with a slanted edge as the story advances. */
const LAYERS: { cls: string; from: number; to: number }[] = [
  { cls: "bd--night", from: 0.5, to: 1.0 },
  { cls: "bd--cream", from: 3.95, to: 4.4 },
  { cls: "bd--night", from: 4.95, to: 5.35 },
  { cls: "bd--coral", from: 5.95, to: 6.45 },
];

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function StageHost() {
  const [mode, setMode] = useState<"pending" | "3d" | "static">("pending");
  const [ready, setReady] = useState(false);
  const layers = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    story.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    story.mobile = window.innerWidth < 700 || window.innerWidth / window.innerHeight < 0.85;
    setMode(hasWebGL() ? "3d" : "static");

    let last = -1;
    const tick = () => {
      if (story.t === last) return;
      last = story.t;
      LAYERS.forEach((l, i) => {
        const el = layers.current[i];
        if (!el) return;
        const r = smooth((story.t - l.from) / (l.to - l.from));
        const y = (1 - r) * 125 - 12;
        el.style.clipPath = `polygon(0% ${y + 12}%, 100% ${y - 12}%, 100% 100%, 0% 100%)`;
      });
      document.documentElement.dataset.tone = story.t < 0.75 ? "coral" : story.t < 4.2 ? "night" : story.t < 5.15 ? "cream" : story.t < 6.2 ? "night" : "coral";
    };
    tick();
    gsap.ticker.add(tick);
    const onMove = (e: PointerEvent) => {
      story.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      story.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="stage" aria-hidden="true">
      <div className="bd bd--coral bd--base" />
      {LAYERS.map((l, i) => (
        <div
          key={i}
          className={`bd ${l.cls}`}
          ref={(el) => {
            layers.current[i] = el;
          }}
          style={{ clipPath: "polygon(0% 125%, 100% 101%, 100% 100%, 0% 100%)" }}
        />
      ))}
      {mode === "3d" && (
        <div className={`stage__gl${ready ? " is-ready" : ""}`}>
          <Stage onReady={() => requestAnimationFrame(() => setReady(true))} />
        </div>
      )}
      {mode === "static" && (
        <div className="stage__static">
          {["cd-a01", "cd-b04", "cd-a07", "cd-b11", "cd-a05"].map((id, i) => (
            <img key={id} src={avatarSrc(id)} alt="" className={`stage__static-card s${i}`} width={160} height={160} />
          ))}
        </div>
      )}
    </div>
  );
}
