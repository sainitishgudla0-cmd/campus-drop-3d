/** Routes rendered by this (new) frontend. Everything else is the existing app via the bridge. */
const OWN = [/^\/$/, /^\/login(\/|$|\?)/, /^\/signup(\/|$|\?)/, /^\/onboarding(\/|$|\?)/, /^\/profile(\/|$|\?)/, /^\/verify(\/|$|\?)/];

export const isOwnRoute = (path: string) => OWN.some((r) => r.test(path));

/** Navigate: client-side for our routes, full page load for the existing app's routes. */
export function go(path: string, router: { push: (p: string) => void; replace: (p: string) => void }, replace = true) {
  if (isOwnRoute(path)) return replace ? router.replace(path) : router.push(path);
  if (replace) window.location.replace(path);
  else window.location.assign(path);
}
