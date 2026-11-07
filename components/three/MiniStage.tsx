"use client";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { easing } from "maath";
import { Bubble, DropEnvelope, PALETTE, ProfileCard } from "./objects";

/** Small, pointer-reactive 3D vignette for the auth screens. */
function Scene({ avatars, reduced }: { avatars: [string, string]; reduced: boolean }) {
  const root = useRef<THREE.Group>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (root.current && !reduced) easing.dampE(root.current.rotation, [state.pointer.y * -0.18, state.pointer.x * 0.3, 0], 0.4, dt);
    if (reduced) return;
    items.current.forEach((g, i) => {
      if (!g) return;
      g.position.y = g.userData.y + Math.sin(t * 0.9 + i * 1.7) * 0.12;
      g.rotation.z = g.userData.rz + Math.sin(t * 0.6 + i) * 0.06;
    });
  });
  const place = (i: number, p: [number, number, number], rz: number, s: number) => ({
    ref: (el: THREE.Group | null) => {
      items.current[i] = el;
      if (el) {
        el.userData = { y: p[1], rz };
      }
    },
    position: p,
    rotation: [0.1, 0, rz] as [number, number, number],
    scale: s,
  });
  return (
    <group ref={root}>
      <group {...place(0, [0.1, -0.2, 0.8], -0.15, 1.15)}>
        <DropEnvelope />
      </group>
      <group {...place(1, [-1.35, 0.55, -0.2], 0.16, 1)}>
        <ProfileCard avatar={avatars[0]} />
      </group>
      <group {...place(2, [1.4, 0.75, -0.6], -0.14, 0.9)}>
        <ProfileCard avatar={avatars[1]} accent={PALETTE.sky} />
      </group>
      <group {...place(3, [1.25, -1.15, 0.2], 0.08, 0.7)}>
        <Bubble color={PALETTE.cream} />
      </group>
    </group>
  );
}

export default function MiniStage({ avatars, reduced }: { avatars: [string, string]; reduced: boolean }) {
  return (
    <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 7.5], fov: 35 }} frameloop={reduced ? "demand" : "always"} aria-hidden="true">
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 5]} intensity={1.5} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#a8dcff" position={[5, -1, 2]} scale={[2, 8, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Scene avatars={avatars} reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
