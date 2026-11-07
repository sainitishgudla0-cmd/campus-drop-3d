# CampusDrop: 3D experience frontend

This is a complete redesign of the CampusDrop frontend.
- **Typography** follows Festivent's system.
- **3D scroll storytelling** follows Superlist.
- **Data** comes from the real CampusDrop backend at `campusdrop.social`, with no mock data.

```bash
npm install
npm run dev      # http://localhost:3300
npm run build && npm start
npm run typecheck
```

## Reference study

### Festivent (festivent.ca)

I inspected the live CSS and DOM.

- The hero title "Festivent" is **custom hand-lettered SVG artwork** (an 18-path SVG). It is not a font, so there's nothing to license and nothing exact to copy.
- **Metro Sans Bold** (commercial) is used for uppercase display headlines, with line-height 1.05, letter-spacing 0, and sizes from 64px up to 10rem.
- **Futura PT Condensed 800** (Adobe Fonts) is used for the tilted date stickers, with letter-spacing −0.01em.

### Fonts chosen

All three are under the SIL Open Font License and self-hosted through `next/font`.

| Festivent | CampusDrop | Notes |
|---|---|---|
| Custom brush SVG lettering | **Caveat Brush**, tuned | Chosen after a side-by-side test against 8 OFL brush faces. Tuned in CSS with a −9° slant, `scaleY(1.06)` and a 0.032em stroke to match the original's weight and lean (`.brush` in `app/globals.css`). |
| Metro Sans Bold, uppercase | **Outfit 700**, uppercase | `.display` |
| Futura PT Condensed 800 | **Barlow Condensed 800** | `.label` and `.sticker`, used for the tilted labels |

### Superlist (superlist.craftedbygc.com)

I scrolled through it at desktop and mobile widths. What I took from it:
- one WebGL stage behind everything
- a saturated hero field with an object cluster around centred type
- a pinned dark section where one object morphs per beat
- diagonal wipes between dark and light
- a short page: about 7,800px on desktop

## Homepage: five beats on one 3D stage

**Positioning:** CampusDrop is friendship first. **Weekly Drops** and **Campus Events** are the two lead experiences. Connection Drops still works in the product (onboarding and profile) but is left out of the landing-page story.

| # | Section | 3D story |
|---|---|---|
| 1 | Hero, coral: *Your campus. Your people.* | Campus-life objects around the type: this week's drop envelope, student profile cards, chat bubbles, a location pin, a calendar, an event ticket, coffee, books, headphones and a football |
| 2 | Experience, dark, pinned | **A weekly drop of new friends:** the envelope sits on the card stack. **Matched by what you share:** coffee, books, headphones and a football orbit between two students. **Make plans together:** a calendar, pin and chat bubbles |
| 3 | Community, cream | A carousel of Weekly drops (envelope), Campus events (calendar), Plan & chat (bubble), Roommates (house and key) and Confessions (note) |
| 4 | How it works, dark | The envelope travels the path: verify, create profile, get your drop, create or join a plan, chat and meet up |
| 5 | CTA, coral: *YOUR PEOPLE ARE OUT THERE.* | Everything regroups into an orbit. On phones, a calm fixed top band |

### Mobile composition

Phones have their own poses; the desktop layout isn't just scaled down.
- **Hero:** the content sits under the nav, and at most four objects stay in a reserved bottom band.
- **Sizing:** objects scale with screen height and width (`mscale` in `Stage.tsx`).
- **Short phones** (720px tall or less) get tighter type and step titles only.
- **Nav at 360px or narrower** hides the Join pill.

Tested at 320×568, 375×667, 390×844, 430×932, 768×1024, 1024×768, 1280×800 and 1920×1080, with no horizontal overflow at any size.

## Brand

The mark is an open **campus circle** (the community) with **this week's drop card** falling into it. The card shows two overlapping heads: two students meeting.
- The wordmark pairs a solid sans "campus" with the brush "drop" (`components/ui/Brand.tsx`, `public/icon.svg`).
- It deliberately avoids a water drop, an age badge and generic social-app icons.

### How the 3D works

- `components/three/Stage.tsx` holds the choreography. `objects.tsx` holds the procedural campus objects. Each actor has a pose for each story beat, in normalised viewport units, so compositions adapt to any aspect ratio. Mobile has its own poses and scale.
- **The story timeline.** `story.t` runs from 0 to 7 and is driven by GSAP ScrollTrigger in `HomeMotion.tsx`. It lives in a mutable store (`lib/scroll.ts`), so scrolling never re-renders React.
- **Motion** is damped every frame with `maath` for physical easing.
- **Background colour** is a fixed backdrop with slanted clip-path wipes driven by the same timeline (`StageHost.tsx`).
- **The objects** are all procedural (`components/three/objects.tsx`), so there are no model files to download. They share one material palette, and the profile cards use the avatar collection as textures.
- **Loading.** The canvas is lazy-loaded, about 200 KB gzipped, after the HTML. There's no loading screen, and the canvas fades in when ready.
- **Fallbacks.**
  - Without WebGL, a static avatar composition is shown.
  - With **reduced motion**: render-on-demand, no idle float, no Lenis, and no intro animations.
- **Device budget.** DPR is capped at 1.5 on phones. Environment lighting uses Lightformers, so there's no HDR download.

## Backend integration

This is unchanged from the previous build, and still verified against the live platform.

- `/api/*` is proxied to `campusdrop.social` (`lib/server/proxy.ts`), so the `campus-drop-session` cookie is first-party here.
- Routes this app doesn't redesign (`/home`, `/matches`, `/messages`, `/confessions`, `/campus-activities`, `/roommates`, `/settings`, legal pages) are mounted from the existing app with the same session (`app/[...legacy]/route.ts`).
- Login and signup use the platform's passwordless email OTP. **There is no password, so there's no password-recovery flow.** The UI says this explicitly.
- Student-ID verification uses the existing backend flow:
  - `requiresIdCard` sends the student to `/verify/id-card`.
  - The image is re-encoded on the device to strip EXIF and GPS data.
  - The page shows the pending, approved and rejected states.
- Onboarding and profile read and write `/api/profile`. Photos use `/api/profile/photos`.
- Middleware gates `/profile`, `/onboarding/*` and `/verify/id-card`.
- `lib/contract.ts` lists the few fields that can't be verified from public bundles and must be confirmed against the backend before launch: the `lookingFor` and gender values, the ID upload field name, and whether the avatar field can be patched.

## Avatars

There are **24 original 3D-clay portraits** of fictional students in one consistent style.
- They were generated with the Figma image model; the source file is *CampusDrop Art — Avatar Collection*.
- `scripts/build-avatars.py` crops them to WebP, about 240 KB in total.
- They're always labelled as illustrations, and choosing one is optional.
- A real uploaded photo is never replaced without the student's consent (`lib/avatarSave.ts`).

## QA scripts

```bash
node scripts/walk.mjs http://localhost:3300/ out/d 1440 900          # scroll-walk with WebGL
node scripts/walk.mjs http://localhost:3300/ out/m 390 844           # mobile
node scripts/walk.mjs http://localhost:3300/ out/r 1440 900 reduced  # reduced motion
node scripts/signup-test.mjs http://localhost:3300 out               # live campus picker + domain rules (sends no codes)
node scripts/visual-signed-in.mjs http://localhost:3300 out          # signed-in screens with test-only API stubs
```
