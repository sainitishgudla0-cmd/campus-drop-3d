"use client";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { easing } from "maath";
import { story } from "@/lib/scroll";
import { BookStack, Bubble, CalendarCard, CoffeeCup, DropEnvelope, Football, Headphones, HouseKey, LocationPin, Note, PALETTE, ProfileCard, Ticket } from "./objects";

/* ────────────────────────────────────────────────────────────────────────────
   Choreography
   Each actor has a pose per story beat. Positions are in normalised viewport units
   (x,y ∈ −1…1 at the z=0 plane) so compositions adapt to any aspect ratio.
   story.t blends between beats; motion is damped per frame for a fluid, physical feel.
   ──────────────────────────────────────────────────────────────────────────── */

type V3 = [number, number, number];
interface Pose {
  p: V3;
  r?: V3;
  s?: number;
  /** mobile override */
  m?: { p?: V3; s?: number; r?: V3 };
}
interface Ctx {
  /** phone scale: smaller on short / narrow screens */
  mscale: number;
  vw: number;
  vh: number;
  mobile: boolean;
  time: number;
  tabF: number;
  how: number;
}
type PoseFn = (c: Ctx) => Pose & { world?: boolean };
type Beat = "hero" | "e1" | "e2" | "e3" | "comm" | "how" | "cta";
type Poses = Partial<Record<Beat, Pose | PoseFn>>;

// beat anchors on the story timeline (holds are created by repeating a beat)
const ANCHORS: [Beat | "scatter", number][] = [
  ["hero", 0],
  ["scatter", 0.92],
  ["e1", 1.3],
  ["e1", 1.85],
  ["e2", 2.35],
  ["e2", 2.85],
  ["e3", 3.3],
  ["e3", 3.95],
  ["comm", 4.4],
  ["comm", 4.9],
  ["how", 5.35],
  ["how", 5.95],
  ["cta", 6.45],
];

const HIDE = (p: V3 = [0, 0, -6]): Pose => ({ p, s: 0 });

function resolve(poses: Poses, beat: Beat | "scatter", c: Ctx): Pose & { world?: boolean } {
  if (beat === "scatter") {
    const h = resolve(poses, "hero", c);
    const r = h.r ?? [0, 0, 0];
    return { p: [h.p[0] * 2.1, h.p[1] * 2.1 + 0.15, h.p[2] + 3.2], r: [r[0] + 0.9, r[1] + 1.4, r[2] + 0.5], s: (h.s ?? 1) * 1.1, world: h.world };
  }
  const v = poses[beat];
  if (!v) return HIDE();
  const pose = typeof v === "function" ? v(c) : v;
  if (c.mobile && pose.m) return { ...pose, p: pose.m.p ?? pose.p, s: pose.m.s ?? pose.s, r: pose.m.r ?? pose.r };
  return pose;
}

const ease = (x: number) => x * x * (3 - 2 * x);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function toWorld(pose: Pose & { world?: boolean }, c: Ctx, out: THREE.Vector3) {
  if (pose.world) return out.set(pose.p[0], pose.p[1], pose.p[2]);
  return out.set((pose.p[0] * c.vw) / 2, (pose.p[1] * c.vh) / 2, pose.p[2]);
}

const ctxRef: { current: Ctx } = { current: { mscale: 0.62, vw: 1, vh: 1, mobile: false, time: 0, tabF: 0, how: 0 } };

function Actor({ poses, children, float = 1, phase = 0 }: { poses: Poses; children: ReactNode; float?: number; phase?: number }) {
  const ref = useRef<THREE.Group>(null);
  const first = useRef(true);
  const targetP = useRef(new THREE.Vector3());
  const targetR = useRef(new THREE.Euler());
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const c = ctxRef.current;
    const t = story.t;
    let i = 0;
    while (i < ANCHORS.length - 1 && t > ANCHORS[i + 1][1]) i++;
    const [ka, ta] = ANCHORS[i];
    const [kb, tb] = ANCHORS[Math.min(i + 1, ANCHORS.length - 1)];
    const k = tb > ta ? ease(Math.min(1, Math.max(0, (t - ta) / (tb - ta)))) : 0;
    const A = resolve(poses, ka, c);
    const B = resolve(poses, kb, c);
    toWorld(A, c, tmpA);
    toWorld(B, c, tmpB);
    targetP.current.lerpVectors(tmpA, tmpB, k);
    const ra = A.r ?? [0, 0, 0];
    const rb = B.r ?? [0, 0, 0];
    targetR.current.set(ra[0] + (rb[0] - ra[0]) * k, ra[1] + (rb[1] - ra[1]) * k, ra[2] + (rb[2] - ra[2]) * k);
    let s = (A.s ?? 1) + ((B.s ?? 1) - (A.s ?? 1)) * k;
    if (c.mobile) s *= c.mscale;

    if (!story.reduced) {
      const w = c.time * 0.9 + phase;
      targetP.current.y += Math.sin(w) * 0.07 * float;
      targetP.current.x += Math.cos(w * 0.7) * 0.035 * float;
      targetR.current.x += Math.sin(w * 0.8) * 0.06 * float;
      targetR.current.y += Math.cos(w * 0.6) * 0.08 * float;
    }

    if (first.current || story.reduced) {
      g.position.copy(targetP.current);
      g.rotation.copy(targetR.current);
      g.scale.setScalar(Math.max(s, 0.0001));
      first.current = false;
    } else {
      easing.damp3(g.position, targetP.current, 0.28, dt);
      easing.dampE(g.rotation, targetR.current, 0.32, dt);
      const cur = g.scale.x;
      g.scale.setScalar(Math.max(cur + (s - cur) * (1 - Math.exp(-dt / 0.2)), 0.0001));
    }
    g.visible = g.scale.x > 0.002;
  });
  return <group ref={ref}>{children}</group>;
}

/* community carousel: five experience objects on a ring; the active one comes forward */
const carousel =
  (i: number): PoseFn =>
  (c) => {
    const a = (i - c.tabF) * ((Math.PI * 2) / 5);
    const R = c.mobile ? 1.55 : 2.3;
    const cx = c.mobile ? 0 : (0.12 * c.vw) / 2;
    const cy = c.mobile ? (0.3 * c.vh) / 2 : (-0.12 * c.vh) / 2;
    const front = Math.max(0, Math.cos(a));
    return {
      world: true,
      p: [cx + Math.sin(a) * R, cy + (Math.cos(a) - 1) * 0.25, -1.6 + Math.cos(a) * R * 0.75],
      r: [0.15, a * 0.6 + (story.reduced ? 0 : c.time * 0.25), 0],
      s: 0.5 + front * front * 0.48,
    };
  };

/* how-it-works: five nodes on a gentle S-path */
const HOW_D: [number, number][] = [
  [-0.02, 0.5],
  [0.3, 0.3],
  [0.12, 0.0],
  [0.44, -0.24],
  [0.72, -0.48],
];
const HOW_M: [number, number][] = [
  [-0.64, 0.2],
  [-0.32, 0.32],
  [0, 0.2],
  [0.32, 0.32],
  [0.64, 0.2],
];
function howPoint(c: Ctx, f: number): [number, number] {
  const pts = c.mobile ? HOW_M : HOW_D;
  const x = Math.min(3.999, Math.max(0, f * 4));
  const i = Math.floor(x);
  const k = ease(x - i);
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
}

/* CTA: everyone orbits the closing headline */
const orbit =
  (i: number, n: number, radius = 1): PoseFn =>
  (c) => {
    const a = (i / n) * Math.PI * 2 + (story.reduced ? 0 : c.time * 0.11);
    const rx = (c.mobile ? 0.86 : 0.88) * radius;
    const ry = (c.mobile ? 0.8 : 0.74) * radius;
    return { p: [Math.cos(a) * rx, Math.sin(a) * ry, Math.sin(a) * 1.1 - 1.4], r: [0.1, -Math.cos(a) * 0.6, Math.sin(a) * 0.2], s: 0.66 };
  };

const N_ORBIT = 11;

const OFF: Pose = { p: [0, -1.2, -4], s: 0 };
/** shorthand: hidden on phones for this beat */
const mOff = { s: 0 };
/** orbit slot that is hidden on phones (keeps the mobile CTA uncluttered) */
const orbitDesk =
  (i: number, r = 1, s?: number): PoseFn =>
  (c) => ({ ...orbit(i, N_ORBIT, r)(c), ...(s !== undefined ? { s } : {}), ...(c.mobile ? { s: 0 } : {}) });

/** desktop orbit; on phones a fixed spot in the top band (or hidden) so the CTA stays clear */
const orbitM =
  (i: number, mp: V3 | null, ms = 0.95): PoseFn =>
  (c) => ({ ...orbit(i, N_ORBIT)(c), m: mp ? { p: mp, s: ms, r: [0.1, 0, 0] as V3 } : { s: 0 } });

function Cast() {
  return (
    <>
      {/* This week's drop: an envelope with a profile card sliding out (the protagonist) */}
      <Actor
        float={0.7}
        poses={{
          hero: { p: [0.8, -0.4, 1.0], r: [0.25, -0.35, -0.12], s: 0.74, m: { p: [0.02, -0.8, 0.6], s: 1.05 } },
          e1: { p: [-0.42, 0.24, 1.6], r: [0.35, 0.3, -0.12], s: 0.5, m: { p: [0, 0.44, 1.6], s: 0.75 } },
          e2: { p: [-0.34, -0.36, 0.8], r: [0.3, 0.6, 0.05], s: 0.45, m: { p: [0, -0.04, 0.8], s: 0.7 } },
          e3: { p: [-0.62, -0.52, 1.0], r: [0.3, 0.5, 0.1], s: 0.4, m: { s: 0 } },
          comm: carousel(0),
          how: (c) => {
            const [x, y] = howPoint(c, c.how);
            return { p: [x, y, 1.2], r: [0.25, c.how * 4, 0], s: 0.5 };
          },
          cta: { p: [0, 0.7, -0.4], r: [0.25, 0, 0], s: 0.6, m: { p: [0, 0.78, -0.4], s: 0.85 } },
        }}
      >
        <DropEnvelope />
      </Actor>

      {/* Student profile cards */}
      <Actor
        phase={1}
        poses={{
          hero: { p: [-0.66, 0.2, -0.4], r: [0.1, 0.35, 0.2], m: { p: [-0.64, -0.74, 0], r: [0.1, 0.4, 0.16] } },
          e1: { p: [-0.42, 0.0, 0.2], r: [0, 0.2, 0.12], m: { p: [0, 0.18, 0.2] } },
          e2: { p: [-0.62, 0.02, 0], r: [0, 0.5, 0.08], m: { p: [-0.5, 0.2, 0] } },
          e3: { p: [-0.7, 0.04, -0.2], r: [0, 0.45, 0.06], m: { p: [-0.5, 0.28, -0.3] } },
          how: HIDE([-1.5, 0, -3]),
          cta: orbitM(0, [-0.64, 0.56, -0.6]),
        }}
      >
        <ProfileCard avatar="cd-a01" />
      </Actor>
      <Actor
        phase={2.2}
        poses={{
          hero: { p: [0.94, 0.02, -2.6], r: [-0.1, -0.5, -0.18], s: 0.9, m: mOff },
          e1: { p: [-0.4, 0.02, 0.0], r: [0, 0.1, -0.1], m: { p: [0.02, 0.2, 0] } },
          e2: { p: [-0.06, 0.02, 0], r: [0, -0.5, -0.08], m: { p: [0.5, 0.2, 0] } },
          e3: { p: [-0.02, 0.06, -0.2], r: [0, -0.45, -0.06], m: { s: 0 } },
          how: HIDE([1.5, 0, -3]),
          cta: orbitM(2, null),
        }}
      >
        <ProfileCard avatar="cd-b04" accent={PALETTE.sky} />
      </Actor>
      <Actor
        phase={3.1}
        poses={{
          hero: { p: [-0.42, -0.6, 0.6], r: [0.2, 0.3, -0.25], s: 0.8, m: mOff },
          e1: { p: [-0.38, -0.02, -0.2], r: [0, 0.3, 0.24], m: { p: [-0.02, 0.18, -0.2] } },
          e2: HIDE([-0.4, -1, -2]),
          how: HIDE(),
          cta: orbitM(4, null),
        }}
      >
        <ProfileCard avatar="cd-a07" accent={PALETTE.lime} />
      </Actor>
      <Actor
        phase={4.4}
        poses={{
          hero: { p: [0.44, 0.62, -1.4], r: [0.1, -0.3, 0.14], s: 0.85, m: { p: [0.64, -0.72, -0.3], r: [0.1, -0.4, -0.14], s: 1 } },
          e1: { p: [-0.44, 0.04, -0.4], r: [0, 0.0, -0.22], m: { p: [0.0, 0.22, -0.4] } },
          e2: HIDE([0.4, 1, -2]),
          how: HIDE(),
          cta: orbitM(6, [0.64, 0.58, -0.6]),
        }}
      >
        <ProfileCard avatar="cd-b11" accent={PALETTE.lilac} />
      </Actor>

      {/* Message bubbles: coordinate the plan */}
      <Actor
        phase={0.6}
        poses={{
          hero: { p: [0.74, 0.5, 0.4], r: [0.2, -0.4, 0.1], s: 0.75, m: mOff },
          e3: { p: [-0.5, 0.44, 0.9], r: [0.1, 0.3, 0.05], s: 0.66, m: { p: [-0.16, 0.62, 0.9], s: 0.55 } },
          comm: carousel(2),
          how: HIDE([1, 1, -3]),
          cta: orbitM(1, null),
        }}
      >
        <Bubble color={PALETTE.sky} />
      </Actor>
      <Actor
        phase={5}
        poses={{
          hero: { p: [-0.78, -0.3, -0.2], r: [0.1, 0.5, -0.1], s: 0.65, m: mOff },
          e3: { p: [-0.18, 0.32, 0.7], r: [0.1, -0.3, 0], s: 0.6, m: mOff },
          how: HIDE([-1, 1, -3]),
          cta: orbitDesk(3),
        }}
      >
        <Bubble color={PALETTE.cream} flip />
      </Actor>

      {/* Location pin: where the plan happens */}
      <Actor
        phase={1.7}
        poses={{
          hero: { p: [-0.5, 0.64, -0.9], r: [0.2, 0.4, 0.1], s: 0.72, m: mOff },
          e3: { p: [-0.24, -0.02, 1.0], r: [0.1, 0.5, 0], s: 0.5, m: { p: [0.58, 0.58, 1.0], s: 0.42 } },
          how: HIDE(),
          cta: orbitDesk(5),
        }}
      >
        <LocationPin />
      </Actor>

      {/* Calendar: create or join a campus plan */}
      <Actor
        phase={2.5}
        poses={{
          hero: { p: [0.18, 0.86, -3.2], r: [0.2, -0.3, 0.12], s: 0.6, m: mOff },
          e3: { p: [-0.38, 0.0, 0.3], r: [0.12, 0.25, -0.05], s: 0.75, m: { p: [0.42, 0.26, 0.3], s: 0.72 } },
          comm: carousel(1),
          how: HIDE(),
          cta: orbitDesk(7),
        }}
      >
        <CalendarCard />
      </Actor>

      {/* Event ticket */}
      <Actor phase={2.8} poses={{ hero: { p: [0.56, -0.7, 0.5], r: [0.3, -0.5, 0.3], s: 0.72, m: mOff }, how: HIDE(), cta: orbitDesk(8) }}>
        <Ticket />
      </Actor>

      {/* Anonymous note (confessions) and house + key (roommates): community carousel */}
      <Actor phase={3.6} poses={{ hero: OFF, comm: carousel(4), how: HIDE(), cta: orbitDesk(9) }}>
        <Note />
      </Actor>
      <Actor phase={4.9} poses={{ hero: { p: [-0.92, -0.86, -2.6], r: [0.2, 0.6, 0], s: 0.6, m: mOff }, comm: carousel(3), how: HIDE(), cta: orbitDesk(10) }}>
        <HouseKey />
      </Actor>

      {/* Student activities = shared interests */}
      {(
        [
          ["coffee", [-0.3, -0.88, 1.2], 0, [-0.08, -0.4, 1.1], { p: [-0.36, -0.7, -1.4] as V3, s: 0.45 }],
          ["books", [0.3, -0.9, 1.4], 1, [-0.68, -0.5, 0.8], mOff],
          ["headphones", [-0.86, 0.66, -0.6], 2, null, mOff],
          ["football", [0.96, -0.4, -1.0], 3, null, mOff],
        ] as [string, V3, number, V3 | null, Pose["m"]][]
      ).map(([kind, hp, idx, e3p, mHero]) => (
        <Actor
          key={kind}
          phase={idx * 1.3}
          float={1.2}
          poses={{
            hero: { p: hp, r: [0.3, 0.4 + idx, 0.1], s: 0.55, m: mHero },
            e2: (c) => {
              const a = (story.reduced ? 0 : c.time * 0.7) + idx * 1.57;
              const cx = c.mobile ? 0 : -0.34;
              const cy = c.mobile ? 0.22 : 0.04;
              return { p: [cx + Math.cos(a) * (c.mobile ? 0.42 : 0.2), cy + Math.sin(a) * 0.32, 1.0 + Math.sin(a) * 0.5], r: [0.3, a, 0.1], s: c.mobile ? 0.6 : 0.42 };
            },
            e3: e3p ? { p: e3p, r: [0.3, 0.5, 0.1], s: 0.4, m: mOff } : OFF,
            comm: HIDE([0, 0, -4]),
            how: HIDE(),
            cta: orbitDesk(10.5 - idx * 0.7, 1.12, 0.5),
          }}
        >
          {kind === "coffee" ? <CoffeeCup /> : kind === "books" ? <BookStack /> : kind === "headphones" ? <Headphones /> : <Football />}
        </Actor>
      ))}

      <HowNodes />
    </>
  );
}

const DOTS = 44;
/* how-it-works path nodes (appear only during that beat) */
function HowNodes() {
  const group = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((_, dt) => {
    const c = ctxRef.current;
    const t = story.t;
    const w = Math.min(1, Math.max(0, (t - 5.0) / 0.3)) * (1 - Math.min(1, Math.max(0, (t - 6.0) / 0.3)));
    const pts = c.mobile ? HOW_M : HOW_D;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.position.set((pts[i][0] * c.vw) / 2, (pts[i][1] * c.vh) / 2, 0.6);
      const reached = c.how * 4 >= i - 0.15;
      const target = w * (reached ? 1 : 0.55) * (c.mobile ? 0.7 : 1);
      const s = story.reduced ? target : m.scale.x + (target - m.scale.x) * (1 - Math.exp(-dt / 0.18));
      m.scale.setScalar(Math.max(s, 0.0001));
      m.visible = s > 0.01;
      (m.material as THREE.MeshPhysicalMaterial).color.set(reached ? PALETTE.lime : PALETTE.sky);
    });
  });
  const dots = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  useFrame(() => {
    const c = ctxRef.current;
    const im = dots.current;
    if (!im) return;
    const t = story.t;
    const w = Math.min(1, Math.max(0, (t - 5.0) / 0.3)) * (1 - Math.min(1, Math.max(0, (t - 6.0) / 0.3)));
    for (let k = 0; k < DOTS; k++) {
      const f = k / (DOTS - 1);
      const [x, y] = howPoint(c, f);
      dummy.current.position.set((x * c.vw) / 2, (y * c.vh) / 2, 0.5);
      dummy.current.scale.setScalar(Math.max(0.0001, w * (f <= c.how + 0.01 ? 1 : 0.55) * (c.mobile ? 0.7 : 1)));
      dummy.current.updateMatrix();
      im.setMatrixAt(k, dummy.current.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    im.visible = w > 0.01;
  });
  return (
    <group ref={group}>
      <instancedMesh ref={dots} args={[undefined, undefined, DOTS]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial color={PALETTE.cream} transparent opacity={0.7} />
      </instancedMesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          scale={0.0001}
        >
          <sphereGeometry args={[0.24, 32, 32]} />
          <meshPhysicalMaterial color={PALETTE.sky} roughness={0.2} clearcoat={1} />
        </mesh>
      ))}
    </group>
  );
}

/* world context + camera + pointer parallax */
function Rig({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { viewport, camera, size, invalidate } = useThree();
  const tabF = useRef(0);
  useEffect(() => {
    story.mobile = size.width / size.height < 0.85 || size.width < 700;
  }, [size]);
  useEffect(() => {
    if (!story.reduced) return;
    let last = -1;
    const id = window.setInterval(() => {
      if (story.version !== last) {
        last = story.version;
        invalidate();
      }
    }, 60);
    return () => window.clearInterval(id);
  }, [invalidate]);
  useFrame((state, dt) => {
    const vp = viewport.getCurrentViewport(camera, [0, 0, 0]);
    tabF.current = story.reduced ? story.tab : tabF.current + (story.tab - tabF.current) * (1 - Math.exp(-dt / 0.35));
    ctxRef.current = { mscale: 0.62 * Math.min(1, Math.max(0.78, size.height / 844)) * Math.min(1, Math.max(0.85, size.width / 390)), vw: vp.width, vh: vp.height, mobile: story.mobile, time: state.clock.elapsedTime, tabF: tabF.current, how: story.how };
    if (group.current && !story.reduced && !story.mobile) {
      easing.dampE(group.current.rotation, [story.pointer.y * -0.06, story.pointer.x * 0.1, 0], 0.5, dt);
    }
  });
  return <group ref={group}>{children}</group>;
}

export default function Stage({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      className="stage__canvas"
      dpr={[1, typeof window !== "undefined" && window.innerWidth < 700 ? 1.5 : 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 10], fov: 35, near: 0.1, far: 60 }}
      frameloop={story.reduced ? "demand" : "always"}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        onReady?.();
      }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 6]} intensity={1.6} />
      <directionalLight position={[-6, -2, 3]} intensity={0.5} color="#ffd9c9" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffb59f" position={[-5, 0, 2]} scale={[2, 8, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#a8dcff" position={[5, -1, 2]} scale={[2, 8, 1]} />
        <Lightformer form="circle" intensity={2} position={[0, -5, 3]} scale={4} />
      </Environment>
      <Suspense fallback={null}>
        <Rig>
          <Cast />
        </Rig>
      </Suspense>
    </Canvas>
  );
}
