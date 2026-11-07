"use client";
/**
 * The CampusDrop 3D object family. Every object is procedural (no model downloads),
 * shares one palette of glossy materials, and is sized to sit together in one scene.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox, useTexture } from "@react-three/drei";
import { avatarSrc } from "@/lib/avatars";

export const PALETTE = {
  coral: "#ff5a36",
  cream: "#fff1d6",
  ink: "#17141f",
  sky: "#9fd8ff",
  lime: "#cff27a",
  lilac: "#cdbbff",
};

const cache = new Map<string, THREE.Material>();
export function mat(color: string, kind: "gloss" | "soft" | "gem" = "gloss") {
  const key = color + kind;
  let m = cache.get(key);
  if (!m) {
    m =
      kind === "gem"
        ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.55, iridescenceIOR: 1.5, sheen: 0.4, sheenColor: new THREE.Color("#ffd1c2") })
        : kind === "soft"
          ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 })
          : new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 });
    cache.set(key, m);
  }
  return m;
}

/* ── Profile card with an illustrated avatar ── */
export function ProfileCard({ avatar, accent = PALETTE.coral }: { avatar: string; accent?: string }) {
  const tex = useTexture(avatarSrc(avatar));
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <group>
      <RoundedBox args={[1.15, 1.5, 0.1]} radius={0.07} smoothness={4} material={mat(PALETTE.cream, "soft")} />
      <mesh position={[0, 0.22, 0.056]}>
        <circleGeometry args={[0.36, 48]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.22, 0.054]}>
        <ringGeometry args={[0.36, 0.41, 48]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <RoundedBox args={[0.72, 0.09, 0.03]} radius={0.04} position={[0, -0.34, 0.06]} material={mat(PALETTE.ink)} />
      <RoundedBox args={[0.46, 0.08, 0.03]} radius={0.04} position={[-0.13, -0.5, 0.06]} material={mat(accent, "soft")} />
      <mesh position={[0.43, 0.6, 0.07]} material={mat(accent)}>
        <sphereGeometry args={[0.055, 20, 20]} />
      </mesh>
    </group>
  );
}

/* ── Message bubble ── */
export function Bubble({ color = PALETTE.sky, flip = false }: { color?: string; flip?: boolean }) {
  return (
    <group scale={[flip ? -1 : 1, 1, 1]}>
      <RoundedBox args={[1.3, 0.82, 0.34]} radius={0.17} smoothness={4} material={mat(color)} />
      <mesh position={[-0.42, -0.48, 0]} rotation={[0, 0, 0.5]} material={mat(color)}>
        <coneGeometry args={[0.15, 0.34, 24]} />
      </mesh>
      {[-0.28, 0, 0.28].map((x) => (
        <mesh key={x} position={[x, 0, 0.18]} material={mat(PALETTE.ink)}>
          <sphereGeometry args={[0.075, 20, 20]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Event ticket ── */
export function Ticket() {
  const geo = useMemo(() => {
    const w = 1.6, h = 0.86, r = 0.14;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2);
    s.lineTo(w / 2, -h / 2);
    s.lineTo(w / 2, -r);
    s.absarc(w / 2, 0, r, -Math.PI / 2, Math.PI / 2, true);
    s.lineTo(w / 2, h / 2);
    s.lineTo(-w / 2, h / 2);
    s.lineTo(-w / 2, r);
    s.absarc(-w / 2, 0, r, Math.PI / 2, -Math.PI / 2, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 24 });
    g.center();
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo} material={mat(PALETTE.lime)} />
      <mesh position={[0.36, 0, 0.09]} material={mat(PALETTE.ink)}>
        <boxGeometry args={[0.03, 0.62, 0.02]} />
      </mesh>
      <RoundedBox args={[0.6, 0.12, 0.03]} radius={0.05} position={[-0.25, 0.16, 0.09]} material={mat(PALETTE.ink)} />
      <RoundedBox args={[0.4, 0.1, 0.03]} radius={0.04} position={[-0.35, -0.08, 0.09]} material={mat(PALETTE.coral, "soft")} />
    </group>
  );
}

/* ── Folded anonymous note (confessions) ── */
export function Note() {
  return (
    <group>
      <group position={[-0.02, 0, 0]} rotation={[0, 0.32, 0]}>
        <RoundedBox args={[0.9, 1.1, 0.03]} radius={0.015} position={[-0.45, 0, 0]} material={mat(PALETTE.lilac, "soft")} />
      </group>
      <group position={[0.02, 0, 0]} rotation={[0, -0.32, 0]}>
        <RoundedBox args={[0.9, 1.1, 0.03]} radius={0.015} position={[0.45, 0, 0]} material={mat(PALETTE.lilac, "soft")} />
      </group>
      <mesh position={[0, -0.1, 0.18]} material={mat(PALETTE.coral)}>
        <sphereGeometry args={[0.15, 28, 28]} />
      </mesh>
    </group>
  );
}

/* ── Roommates: a little house with a key ── */
export function HouseKey() {
  return (
    <group>
      <RoundedBox args={[0.9, 0.7, 0.8]} radius={0.05} position={[0, -0.25, 0]} material={mat(PALETTE.cream, "soft")} />
      <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(PALETTE.coral)}>
        <cylinderGeometry args={[0.58, 0.58, 0.9, 3]} />
      </mesh>
      <RoundedBox args={[0.24, 0.38, 0.04]} radius={0.03} position={[0, -0.41, 0.41]} material={mat(PALETTE.ink)} />
      <group position={[0.78, 0.12, 0.3]} rotation={[0, 0, -0.6]}>
        <mesh material={mat(PALETTE.sky)}>
          <torusGeometry args={[0.16, 0.06, 16, 36]} />
        </mesh>
        <mesh position={[0, -0.42, 0]} material={mat(PALETTE.sky)}>
          <boxGeometry args={[0.08, 0.55, 0.08]} />
        </mesh>
        <mesh position={[0.08, -0.6, 0]} material={mat(PALETTE.sky)}>
          <boxGeometry args={[0.12, 0.06, 0.08]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Weekly drop envelope: this week's drop, a profile card sliding out ── */
export function DropEnvelope() {
  const flap = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.75, 0);
    sh.lineTo(0.75, 0);
    sh.lineTo(0, -0.52);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 2 });
    return g;
  }, []);
  return (
    <group>
      {/* card peeking out */}
      <group position={[0, 0.36, -0.02]} rotation={[0, 0, 0.04]}>
        <RoundedBox args={[1.22, 0.9, 0.04]} radius={0.03} material={mat(PALETTE.cream, "soft")} />
        <mesh position={[-0.36, 0.14, 0.03]} material={mat(PALETTE.sky)}>
          <circleGeometry args={[0.15, 32]} />
        </mesh>
        <RoundedBox args={[0.5, 0.07, 0.02]} radius={0.03} position={[0.12, 0.2, 0.03]} material={mat(PALETTE.ink)} />
        <RoundedBox args={[0.36, 0.07, 0.02]} radius={0.03} position={[0.05, 0.06, 0.03]} material={mat(PALETTE.lime, "soft")} />
      </group>
      {/* envelope body */}
      <RoundedBox args={[1.5, 0.98, 0.16]} radius={0.06} smoothness={4} position={[0, -0.05, 0.04]} material={mat(PALETTE.coral)} />
      {/* folded front lines */}
      <mesh position={[-0.37, -0.2, 0.13]} rotation={[0, 0, 0.62]} material={mat("#e8431f", "soft")}>
        <boxGeometry args={[0.92, 0.035, 0.02]} />
      </mesh>
      <mesh position={[0.37, -0.2, 0.13]} rotation={[0, 0, -0.62]} material={mat("#e8431f", "soft")}>
        <boxGeometry args={[0.92, 0.035, 0.02]} />
      </mesh>
      {/* open flap */}
      <mesh geometry={flap} position={[0, 0.44, 0.02]} rotation={[-2.6, 0, 0]} material={mat(PALETTE.coral)} />
      {/* seal */}
      <mesh position={[0, -0.02, 0.14]} material={mat(PALETTE.lime)}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 32]} />
      </mesh>
      <mesh position={[0, -0.02, 0.14]} rotation={[Math.PI / 2, 0, 0]} material={mat(PALETTE.lime)}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 32]} />
      </mesh>
    </group>
  );
}

/* ── Calendar: create & join campus plans ── */
export function CalendarCard() {
  return (
    <group>
      <RoundedBox args={[1.1, 1.18, 0.12]} radius={0.06} smoothness={4} material={mat(PALETTE.cream, "soft")} />
      <RoundedBox args={[1.1, 0.32, 0.14]} radius={0.06} position={[0, 0.43, 0.01]} material={mat(PALETTE.coral)} />
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.6, 0.04]} rotation={[0, Math.PI / 2, 0]} material={mat(PALETTE.ink)}>
          <torusGeometry args={[0.07, 0.025, 12, 24]} />
        </mesh>
      ))}
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <RoundedBox
            key={`${r}${c}`}
            args={[0.22, 0.17, 0.03]}
            radius={0.03}
            position={[-0.3 + c * 0.3, 0.1 - r * 0.24, 0.07]}
            material={r === 1 && c === 2 ? mat(PALETTE.lime) : mat("#e6d6b4", "soft")}
          />
        )),
      )}
    </group>
  );
}

/* ── Location pin: where the plan happens ── */
export function LocationPin({ color = PALETTE.coral }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} material={mat(color)}>
        <sphereGeometry args={[0.38, 40, 40]} />
      </mesh>
      <mesh position={[0, -0.22, 0]} rotation={[Math.PI, 0, 0]} material={mat(color)}>
        <coneGeometry args={[0.31, 0.62, 40]} />
      </mesh>
      <mesh position={[0, 0.27, 0.34]} material={mat(PALETTE.cream, "soft")}>
        <sphereGeometry args={[0.15, 28, 28]} />
      </mesh>
    </group>
  );
}

/* ── Coffee cup: library sessions & café meetups ── */
export function CoffeeCup() {
  return (
    <group>
      <mesh material={mat(PALETTE.cream, "soft")}>
        <cylinderGeometry args={[0.33, 0.25, 0.8, 40]} />
      </mesh>
      <mesh position={[0, -0.02, 0]} material={mat(PALETTE.coral, "soft")}>
        <cylinderGeometry args={[0.32, 0.29, 0.26, 40]} />
      </mesh>
      <mesh position={[0, 0.44, 0]} material={mat(PALETTE.ink)}>
        <cylinderGeometry args={[0.36, 0.36, 0.1, 40]} />
      </mesh>
      <mesh position={[0, 0.52, 0]} material={mat(PALETTE.ink)}>
        <cylinderGeometry args={[0.24, 0.3, 0.07, 40]} />
      </mesh>
    </group>
  );
}

/* ── Book stack: study together ── */
export function BookStack() {
  const books: [string, number, number][] = [
    [PALETTE.sky, -0.24, 0.08],
    [PALETTE.lime, 0, -0.1],
    [PALETTE.lilac, 0.24, 0.14],
  ];
  return (
    <group>
      {books.map(([c, y, r]) => (
        <group key={c} position={[0, y, 0]} rotation={[0, r, 0]}>
          <RoundedBox args={[1.0, 0.22, 0.72]} radius={0.04} material={mat(c)} />
          <mesh position={[0.02, 0, 0.37]} material={mat(PALETTE.cream, "soft")}>
            <boxGeometry args={[0.9, 0.15, 0.02]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Headphones: shared music taste ── */
export function Headphones() {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} material={mat(PALETTE.ink)}>
        <torusGeometry args={[0.5, 0.07, 16, 48, Math.PI]} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <group key={x} position={[x, -0.06, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mat(PALETTE.coral)}>
            <cylinderGeometry args={[0.22, 0.22, 0.2, 36]} />
          </mesh>
          <mesh position={[x > 0 ? -0.11 : 0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(PALETTE.cream, "soft")}>
            <cylinderGeometry args={[0.16, 0.16, 0.05, 36]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Football: campus sports ── */
const ICO = new THREE.IcosahedronGeometry(1, 0);
const ICO_V: THREE.Vector3[] = (() => {
  const pos = ICO.getAttribute("position");
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    if (!out.some((o) => o.distanceTo(v) < 0.01)) out.push(v);
  }
  return out;
})();
export function Football() {
  return (
    <group>
      <mesh material={mat(PALETTE.cream, "soft")}>
        <sphereGeometry args={[0.38, 40, 40]} />
      </mesh>
      {ICO_V.map((v, i) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v);
        return (
          <mesh key={i} position={v.clone().multiplyScalar(0.372)} quaternion={q} material={mat(PALETTE.ink)}>
            <circleGeometry args={[0.1, 5]} />
          </mesh>
        );
      })}
    </group>
  );
}
