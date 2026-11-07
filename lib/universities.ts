import type { University } from "./api";

/** "Name · Campus", as the existing app displays it. */
export const uniTitle = (u: University) => (u.campus ? `${u.name} · ${u.campus}` : u.name);

export const uniPlace = (u: University) => {
  const parts = [u.city, u.state].filter(Boolean) as string[];
  if (u.country && u.country !== "India") parts.push(u.country);
  return parts.join(", ");
};

/** Hint shown under the email field, e.g. "@srmist.edu.in". Null when any email is accepted. */
export function domainHint(u: University): string | null {
  if (u.allowPublicEmailLogin || u.domains.length === 0) return null;
  return u.domains.length === 1 ? `@${u.domains[0]}` : `@${u.domains.join(" or @")}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

/** Mirrors the existing client-side domain rule; the backend re-checks everything. */
export function emailProblem(email: string, u: University | null): string {
  const v = email.trim().toLowerCase();
  if (!v) return "";
  if (!isEmail(v)) return "Enter a valid email address.";
  if (!u || u.allowPublicEmailLogin || u.domains.length === 0) return "";
  const domain = v.split("@")[1];
  const ok = u.domains.some((d) => domain === d.toLowerCase() || domain.endsWith("." + d.toLowerCase()));
  if (ok) return "";
  const list = u.domains.map((d) => "@" + d).join(u.domains.length === 2 ? " or " : ", ");
  return `Use your ${uniTitle(u)} email (${list}).`;
}

export function searchUniversities(list: University[], q: string, limit = 8): University[] {
  const s = q.trim().toLowerCase();
  if (!s) return list.slice(0, limit);
  const scored: [number, University][] = [];
  for (const u of list) {
    const hay = `${u.name} ${u.campus ?? ""} ${u.city ?? ""} ${u.state ?? ""} ${u.domains.join(" ")}`.toLowerCase();
    const i = hay.indexOf(s);
    if (i === -1) continue;
    scored.push([(u.name.toLowerCase().startsWith(s) ? 0 : 10) + i / 100, u]);
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);
}
