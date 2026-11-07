import { redirect } from "next/navigation";

/** The existing app (and its emails/links) use /verify; route to the redesigned screens. */
export default async function VerifyRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "mode") qs.set(k, v);
  const q = qs.toString();
  redirect(`${sp.mode === "login" ? "/login" : "/signup"}${q ? `?${q}` : ""}`);
}
