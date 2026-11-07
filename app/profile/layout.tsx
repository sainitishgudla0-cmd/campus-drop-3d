import type { Metadata } from "next";
export const metadata: Metadata = { title: "Your profile", robots: { index: false } };
export default function L({ children }: { children: React.ReactNode }) {
  return <div className="app-surface">{children}</div>;
}
