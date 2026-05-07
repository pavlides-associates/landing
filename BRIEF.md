# Pavlides Associates — Landing Page Build Brief

> Single-page, mobile-first landing for **Pavlides Associates S.A.** (ΓΡΑΦΕΙΟ ΠΑΥΛΙΔΗ Α.Τ.Ε.Μ.) — an architecture firm. Deployed to a subdomain. Reached primarily via QR code at a networking event. One section embeds an existing IFC/Fragment viewer that's already implemented in the repo.

This document is the source of truth. Read it end to end before writing any code.

---

## 0. What you're building, in one paragraph

A short, dense, architecturally-restrained landing page that loads on someone's phone three seconds after they scan a QR. Hero → philosophy → selected projects → methodology → **interactive 3D model showcase (the existing IFC viewer)** → contact. No CMS, no auth, no backend. Static site, deployed anywhere that can serve files. The whole page should feel like a printed monograph that happens to run in a browser.

---

## 1. Stack — pinned, non-negotiable

| Tool                | Version constraint           | Why                                                                                          |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| **Node**            | `>=22.12.0`                  | Astro 6 dropped Node 18/20.                                                                  |
| **Astro**           | `^6.0.0`                     | Latest stable. Use the v6 patterns, not v5 ones.                                             |
| **TypeScript**      | `^5.6`                       | Strict mode on (`"strict": true` in tsconfig).                                               |
| **Output**          | `output: 'static'`           | No SSR. Pure static site. No adapter needed.                                                 |
| **Styling**         | Hand-rolled CSS + tokens     | No Tailwind, no CSS-in-JS. CSS custom properties + scoped `<style>` in `.astro` files only.  |
| **UI framework**    | **None.**                    | The page is content + a vanilla-TS viewer. Do not pull in React/Vue/Svelte.                  |
| **Package manager** | npm                          | Match what the existing viewer uses.                                                         |

### Astro 6 things to remember (these are easy to get wrong if you reach for stale habits)

- `Astro.glob()` is **removed**. Use `import.meta.glob()` for any local file collection needs (you almost certainly won't need this — the page is small).
- The legacy content collections API is gone. If you use content collections at all (probably overkill for this page), use the loader API and import Zod from `astro/zod`, not `astro:content`.
- Astro 6's `<script>` tag in `.astro` files supports TypeScript natively and bundles imports — that is exactly how we'll bootstrap the viewer.
- Default output is static. Do not add `output: 'server'` or any adapter — this site has no runtime.
- Files in `public/` are served at `/` untouched. **This is where the viewer's `models/` directory must live.** See section 5.
- Enable CSP only if you have time at the end (`csp: true`). If you do, remember the viewer instantiates a Web Worker — the worker URL must be allowed.

---

## 2. Brand & design language

### 2.1 Color tokens (derived from the firm's logo)

The logo is a **brick-red square mark** to the left of black wordmarks on white. The palette below extends that into a usable system. Use these as CSS custom properties on `:root`. **Do not invent additional colors** — restraint is part of the brand.

```css
:root {
  /* Surfaces */
  --paper:      #F7F5F0;  /* page background — warm cream, like drafting paper */
  --bone:       #EDEAE3;  /* secondary surface, card backgrounds */
  --silver:     #D7D3CB;  /* hairline dividers */

  /* Ink */
  --ink:        #111111;  /* primary text, headings */
  --graphite:   #3A3A38;  /* body copy */
  --concrete:   #767470;  /* meta, captions, labels */

  /* Accent — the firm red, used SPARINGLY */
  --accent:     #B23C2E;  /* the logo red (verify by sampling the logo if you have it) */
  --accent-ink: #8C2E22;  /* hover/pressed state for the accent */

  /* Dark surface — only inside the viewer showcase section */
  --shadow:     #1A1A1A;  /* matches the viewer's existing background */
  --shadow-2:   #242424;  /* one step lighter, for cards inside the dark section */
}
```

**Accent usage rule:** The red appears at most 3–4 times on the entire page. Examples: a 1px underline on the active nav link, a small square mark in the logo lockup, a hairline next to the section number, the contact email link on hover. Anywhere else, use ink/graphite/concrete. If you're tempted to color a CTA red, resist — make the CTA black, with the red reserved for *marks*, not surfaces.

### 2.2 Typography

Pair a **transitional serif for display** with a **neutral grotesque for body & UI**. Both are free, on Google Fonts, and self-host friendly.

- **Display**: `Fraunces` (variable). Used for the hero, section headings, project titles.
- **Body / UI**: `Inter` (variable). Used for everything else.
- **Mono** (only for technical micro-labels like project metadata: floor count, GFA, year): `JetBrains Mono` — optional, only if you use technical metadata strips.

**Self-host the fonts** via `@fontsource-variable/fraunces` and `@fontsource-variable/inter`. Do not load from `fonts.googleapis.com` at runtime — it adds DNS + a render block. The repo has a known download budget already from the viewer; we don't get to spend more on font CDNs.

```css
:root {
  --font-display: "Fraunces Variable", Georgia, serif;
  --font-sans:    "Inter Variable", system-ui, -apple-system, sans-serif;
  --font-mono:    "JetBrains Mono Variable", ui-monospace, monospace;
}
```

Suggested type scale (modular, ratio ~1.25, mobile-first — bump up at `>=768px`):

| Token        | Mobile | Desktop | Use                              |
| ------------ | ------ | ------- | -------------------------------- |
| `--fs-hero`  | 56px   | 96px    | Hero headline (Fraunces, 350wt)  |
| `--fs-h1`    | 36px   | 56px    | Section openers                  |
| `--fs-h2`    | 24px   | 32px    | Sub-sections                     |
| `--fs-lead`  | 18px   | 22px    | Lead paragraphs                  |
| `--fs-body`  | 16px   | 17px    | Body                             |
| `--fs-small` | 13px   | 13px    | Captions, meta                   |
| `--fs-micro` | 11px   | 11px    | Section numbers, eyebrow labels  |

Headings in Fraunces should use a moderate optical size and a weight in the 350–450 range — not bold. Architectural typography is not loud.

### 2.3 Spacing, grid, and rhythm

- Page max-width: **1280px**, centered with 24px gutter on mobile, 64px on desktop.
- Vertical rhythm: every section pads `clamp(96px, 12vw, 160px)` top and bottom. Generous. The page should breathe.
- Use CSS Grid with **12 columns**, 24px column gap. On mobile collapse to 4 columns, 16px gap.
- Hairlines are **1px solid `var(--silver)`** — never thicker. Borders define content; they don't decorate it.
- Corner radius: **0**. No rounded corners anywhere. (Architectural drawings don't have rounded corners.) The single exception is the IFC viewer's existing UI, which lives inside its own scoped section.

### 2.4 Motion

- Subtle, purposeful. **No bouncy springs, no scroll-jacking, no parallax.**
- One pattern: fade + 8px translateY on enter, 400ms `cubic-bezier(0.2, 0.6, 0.2, 1)`, triggered by `IntersectionObserver` once.
- Respect `prefers-reduced-motion: reduce` — set transitions to `0ms` when the user has it on.
- Hero can have one subtle continuous element (e.g. a slow-rotating axonometric line drawing, or just a static SVG). No autoplay video.

### 2.5 Imagery

- Project photography in **black and white** (or near-mono — desaturated, slightly warm). The accent red and color in photos compete; pick a lane.
- Use Astro's `<Image />` component (`astro:assets`) for all imagery in `src/`. Pre-format AVIF + WebP, serve responsive `srcset`. Never use a raw `<img>` from `src/`.
- Logo of the firm: keep as inline SVG if possible. If only a PNG is available, place it in `public/brand/` and reference as `/brand/logo.svg` (or `.png`).

---

## 3. Information architecture

The page is a single scroll. Sections in order:

```
1. <Header>           — Sticky-ish, transparent at top, solid (paper bg) after 80vh.
                        Contains: logo lockup (left), in-page nav (right, desktop only).

2. <Hero>             — Full viewport on mobile, ~85vh on desktop.
                        - Eyebrow: "PAVLIDES ASSOCIATES — Α.Τ.Ε.Μ." (mono, micro)
                        - Headline: a one-line statement of practice (1 line, Fraunces, hero size)
                        - Sub: a 2-sentence positioning paragraph
                        - Subtle scroll affordance at bottom (e.g. "↓ Selected work")

3. <Philosophy>       — 2-column on desktop, stacked on mobile.
                        Section number "01" + label "PHILOSOPHY" in mono micro.
                        Heading + 1–2 body paragraphs. Quiet.

4. <Projects>         — A grid of 4–6 selected projects.
                        Each project: B&W image, project name (Fraunces), location & year (mono small),
                        one-line description.
                        Layout: asymmetric — vary the column spans (e.g. 7/5, 5/7, 6/6, 8/4) so the grid
                        feels editorial rather than templated. NO modal/lightbox; if a project needs
                        more depth it's just a longer copy block underneath the image.

5. <Methodology>      — How the firm works. 3–4 numbered steps.
                        Tabular layout: number (mono, large) | title (Fraunces) | description (sans body).
                        Hairline rules between rows. This should look like a printed table of contents.

6. <ViewerShowcase>   — THE 3D MODEL SECTION. Dark background (--shadow). See section 4 for full integration spec.
                        Section number "04" + label "PROJECT IN DEPTH — <project name>"
                        One paragraph of context above the viewer.
                        Viewer takes a fixed pixel height (e.g. 720px desktop, 560px mobile) — NOT 100vh.
                        Below the viewer: a small caption explaining the disciplines toggle (one sentence).

7. <Contact>          — Address, phone, email. Plain. Email link is the one place the accent red appears
                        (on hover, underline becomes accent).
                        Office hours, optional.
                        Map: NOT embedded. Link out to Google Maps with the office coordinates.

8. <Footer>           — Logo (small, monochrome), © year, Greek tax ID / corporate ID if the firm wants it,
                        a single line of credits if appropriate.
```

### Copy rule

Use placeholder copy clearly marked `[TODO: confirm with firm]`. Do not invent project names, locations, or technical specs. Real copy will be supplied. Greek language fallback is **not** in scope for v1 but design with it in mind — keep line lengths comfortable for both English and Greek (Greek words tend longer).

---

## 4. The IFC viewer integration — read this section twice

There is an existing, working IFC viewer in this repo (separate folder, vanilla TS + Vite, see the project summary the user provided). **Do not rewrite it. Do not port it to Astro components. Do not replace its rendering loop with anything else.** Your job is to glue.

### 4.1 What the viewer needs from its host page

The viewer's entry point (`src/main.ts` in the viewer's source tree) attaches to four DOM nodes by ID:

```html
<div id="viewer"></div>            <!-- canvas mount point -->
<aside id="sidebar"></aside>       <!-- discipline opacity controls -->
<button id="sidebar-toggle"></button>
<div id="loading">Loading…</div>   <!-- overlay, .hidden when ready -->
```

These IDs are hardcoded in the viewer source. Do not rename them.

### 4.2 What the viewer expects to find at runtime

- `GET /models/index.json` → an array of `.frag` filenames.
- `GET /models/<name>.frag` for each entry → binary fragments file.
- A worker chunk that Vite splits out automatically — Astro/Vite will bundle this; just make sure the build doesn't strip it.

### 4.3 Where files go in the Astro project

```
project-root/
├─ public/
│  └─ models/                       ← copy the converter's output here
│     ├─ index.json
│     ├─ 01 Structural.frag
│     ├─ 02 MEP.frag
│     └─ 03 ARCHITECTURAL.frag
├─ src/
│  ├─ viewer/                       ← copy the viewer's src/ contents here, verbatim
│  │  ├─ main.ts
│  │  ├─ viewer.ts
│  │  ├─ loader.ts
│  │  ├─ disciplines.ts
│  │  ├─ ui.ts
│  │  └─ style.css                  ← MUST be edited, see 4.5
│  ├─ components/
│  │  └─ ViewerShowcase.astro       ← Astro component that hosts the viewer
│  └─ pages/
│     └─ index.astro
└─ ifc/                             ← optional: source IFCs, gitignored, NOT shipped
```

Do **not** copy the viewer's `index.html`, `vite.config.ts`, or `package.json`. Merge its dependencies into the root `package.json` instead (see 4.6).

### 4.4 The Astro component that mounts the viewer

```astro
---
// src/components/ViewerShowcase.astro
---
<section class="viewer-showcase" aria-labelledby="viewer-heading">
  <div class="container">
    <p class="eyebrow">04 — PROJECT IN DEPTH</p>
    <h2 id="viewer-heading">[Project name]</h2>
    <p class="lead">[One paragraph of context. What is this building, where, when, what's special about it.]</p>
  </div>

  <!-- Viewer host: relative-positioned, fixed height. The viewer's CSS must respect this scope. -->
  <div class="viewer-host">
    <div id="viewer"></div>
    <button id="sidebar-toggle" type="button" aria-label="Toggle discipline controls" aria-expanded="false">
      <!-- inline SVGs from the original ui.ts; keep them inline to avoid an extra request -->
    </button>
    <aside id="sidebar" aria-hidden="true"></aside>
    <div id="loading">Loading model…</div>
  </div>

  <p class="container caption">Use the panel to fade individual disciplines and read the building in layers.</p>
</section>

<script>
  // Astro processes this script: TypeScript, bundling, deduping. The viewer module
  // self-bootstraps on import (it calls main() at module top-level in its current form,
  // OR exposes a main() — confirm against the actual source and adjust).
  import "../viewer/main.ts";
</script>

<style>
  .viewer-showcase {
    background: var(--shadow);
    color: var(--paper);
    padding-block: clamp(96px, 12vw, 160px);
  }
  .viewer-host {
    /* CRITICAL: confines the viewer to this section. The viewer's internal CSS
       uses position:fixed; inset:0 by default — that has been changed to absolute. */
    position: relative;
    width: 100%;
    height: clamp(560px, 70vh, 720px);
    margin-block: 32px;
    overflow: hidden;
    background: var(--shadow);
  }
  /* Section copy uses container; viewer host is intentionally edge-to-edge or container'd
     depending on aesthetic — try edge-to-edge first, it usually reads better. */
</style>
```

Notes on the script block:

- The original viewer entry runs `main()` at module load. If that's the case, `import "../viewer/main.ts"` is enough. If `main` is exported, call it: `import { main } from "../viewer/main.ts"; main();`. Inspect the actual file before deciding.
- Astro's `<script>` (no attributes) gets bundled and is type-module by default. Imports are followed and bundled. This works for the viewer's deep import graph (`@thatopen/components`, `@thatopen/fragments`, `three`, `web-ifc`, `camera-controls`).

### 4.5 Edits required to the viewer's `style.css`

The viewer's CSS makes the canvas take the entire viewport (`#viewer { position: fixed; inset: 0; }`). That's wrong for an embedded section. Change:

- `#viewer`: `position: fixed; inset: 0;` → `position: absolute; inset: 0;`
- `#sidebar`: keep `position: absolute`, but its anchor is now the `.viewer-host`, not the body. Already correct as long as `.viewer-host` is `position: relative`.
- `#sidebar-toggle`: same — anchored to `.viewer-host`.
- `#loading`: same — anchored to `.viewer-host`.

Strip any `body { ... }` or `html { ... }` global resets from the viewer's stylesheet. They will fight Astro's page-level styles. Move what's still needed into `.viewer-host { ... }` and its children.

### 4.6 Dependencies to add to root `package.json`

From the viewer's existing pinned versions (do **not** change these — That Open Company's API churns between minors):

```json
{
  "dependencies": {
    "@thatopen/components": "3.4.5",
    "@thatopen/fragments":  "3.4.5",
    "three":                "0.184.0",
    "web-ifc":              "0.0.77",
    "camera-controls":      "^3.1.2"
  },
  "devDependencies": {
    "@types/three": "^0.184.0",
    "@types/node":  "^25.6.0",
    "tsx":          "^4.19.2"
  }
}
```

Plus Astro 6 itself, fontsource packages, etc. Vite will pull through transitively from Astro — do not pin Vite directly.

### 4.7 The IFC → .frag conversion step

The repo already has `scripts/convert-ifc.ts`. **Keep it as a developer-side, one-off step.** It is not part of the deploy. Document one line in the README:

```bash
npm run convert    # run when source IFCs change; outputs to public/models/
```

Wire `"convert": "tsx scripts/convert-ifc.ts"` into root `package.json`. If the converter currently writes to a different path, change its output target to `public/models/` so it lands where Astro's static asset pipeline will pick it up.

### 4.8 Performance — non-trivial considerations

The viewer ships ~6MB of JS (raw) plus ~16MB of `.frag` files. On a 4G phone in a hotel ballroom, that's a noticeable hit. Two mitigations, in priority order:

1. **Defer viewer init until the section is in view.** Wrap the viewer bootstrap in an `IntersectionObserver`:
   ```ts
   // in a small inline <script> in ViewerShowcase.astro, BEFORE the import
   const host = document.querySelector(".viewer-host")!;
   const io = new IntersectionObserver(async (entries) => {
     if (entries.some(e => e.isIntersecting)) {
       io.disconnect();
       await import("../viewer/main.ts");   // dynamic import — splits the chunk
     }
   }, { rootMargin: "200px 0px" });
   io.observe(host);
   ```
   This keeps the viewer's 6MB out of the critical path. The page renders, the user reads, and the viewer is fetched as they approach.

2. **Preconnect / preload models early but lazily.** Once the user has scrolled past the projects section, fire a `<link rel="prefetch" href="/models/index.json">` so the manifest is warm by the time `IntersectionObserver` fires. Optional polish.

Don't bother with code-splitting beyond what Vite already does. The worker chunk is already separate.

### 4.9 Things the viewer summary flagged that you must respect

- `public/` files are not visible to `import.meta.glob`. The viewer reads `index.json` via `fetch`, not via a Vite-graph import. Do not "improve" this.
- Opacity is set via direct three.js material flags (`transparent`, `opacity`, `depthWrite`), **not** via `model.setOpacity`. Do not change this.
- LOD tiles arrive late — the viewer subscribes to `model.onViewUpdated` to re-apply opacity. Keep this.
- Filenames carry meaning (they become discipline labels). Don't rename `.frag` files post-conversion.

---

## 5. Build, deploy, file structure

### 5.1 Final project layout

```
project-root/
├─ public/
│  ├─ models/                     # generated, gitignored, copied from converter output
│  │  ├─ index.json
│  │  └─ *.frag
│  ├─ brand/
│  │  └─ logo.svg                 # firm logo, monochrome SVG preferred
│  ├─ images/                     # any photography that doesn't need optimization
│  └─ favicon.svg
├─ src/
│  ├─ assets/                     # images that DO need optimization (use astro:assets)
│  │  └─ projects/*.jpg
│  ├─ components/
│  │  ├─ Header.astro
│  │  ├─ Hero.astro
│  │  ├─ Philosophy.astro
│  │  ├─ Projects.astro
│  │  ├─ Methodology.astro
│  │  ├─ ViewerShowcase.astro
│  │  ├─ Contact.astro
│  │  └─ Footer.astro
│  ├─ data/
│  │  └─ projects.ts              # typed array of project entries (Title, year, location, image, copy)
│  ├─ layouts/
│  │  └─ Base.astro               # html/head/body shell, font links, CSS reset, global tokens
│  ├─ styles/
│  │  ├─ tokens.css               # the :root custom properties
│  │  ├─ reset.css                # minimal modern reset
│  │  └─ global.css               # base typography, body styles
│  ├─ viewer/                     # vanilla-TS viewer source, copied in
│  │  ├─ main.ts
│  │  ├─ viewer.ts
│  │  ├─ loader.ts
│  │  ├─ disciplines.ts
│  │  ├─ ui.ts
│  │  └─ style.css
│  └─ pages/
│     └─ index.astro              # imports Base, composes the section components
├─ scripts/
│  └─ convert-ifc.ts              # IFC → .frag converter (developer-only)
├─ ifc/                           # source IFCs (gitignored, not shipped)
├─ astro.config.mjs
├─ tsconfig.json
├─ package.json
└─ README.md
```

### 5.2 `astro.config.mjs`

Keep it minimal:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  // TODO(subdomain): the user has not chosen the subdomain yet.
  // Before running a production build, ASK the user what subdomain to use
  // (e.g. "showcase.example.gr", "studio.example.gr", etc.) and set it here.
  // Until then, leave this commented out — Astro builds fine without `site`.
  // site: 'https://<TODO-subdomain>',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',   // small CSS gets inlined; large CSS stays external
  },
  vite: {
    // The viewer pulls in web-ifc which has a wasm asset path expectation in Node.
    // In the browser build this should be transparent, but if the build chokes:
    // optimizeDeps.exclude: ['web-ifc'] is the usual workaround.
  },
});
```

If you set a subpath base later, remember to update viewer's `fetch("/models/index.json")` to use the base. Easiest: keep the subdomain as a clean root and avoid `base` entirely.

### 5.3 `tsconfig.json`

Extend `astro/tsconfigs/strict` (or `strictest` if you want maximum rigour). Add a path alias `@/*` → `src/*` if you find the import paths getting long.

### 5.4 Build & deploy

- `npm run build` produces `dist/`. Upload `dist/` to any static host (Cloudflare Pages, Netlify, Vercel static, S3+CloudFront, plain nginx).
- The deploy host **never** runs `npm run convert`. The `.frag` files are checked into `public/models/` (or built by a CI step that runs locally before push, **not** on the host).
- MIME types: `.wasm` → `application/wasm`, `.frag` → `application/octet-stream`. Most modern static hosts handle these correctly out of the box.
- Cache headers: hashed asset paths under `_astro/` are safe for `Cache-Control: public, max-age=31536000, immutable`. The `.frag` files are not hashed; give them a shorter TTL (e.g. 1 hour) so updates propagate quickly when the firm refreshes the model.

---

## 6. Accessibility & quality bar

- All interactive elements keyboard-reachable. The viewer's sidebar toggle is a `<button>`, not a `<div>` — keep it that way.
- Focus styles visible. Use a 2px outline in `--accent`, offset 2px. Same on the sliders.
- Contrast: body text on paper passes AAA. The dark viewer section should pass AA on `--paper` over `--shadow`.
- Skip-link to main content at the top.
- All images have `alt` text. Decorative images get `alt=""`.
- Heading order: one `<h1>` (in Hero), then `<h2>` per section. Don't skip levels.
- `prefers-reduced-motion: reduce` disables all transitions and the IntersectionObserver-driven entrance animations.
- Lighthouse target on a moderate phone (iPhone 12-class): **Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.** The viewer chunk will pull Performance down if it's in the critical path — that's why section 4.8 exists.

### Meta / SEO basics

- Title: `Pavlides Associates — Architecture` (or the firm's preferred phrasing)
- Description: a single sentence about the practice
- Open Graph: a single OG image (1200×630, monochrome with the logo) under `public/og.jpg`
- Favicon: monochrome SVG of the logo's red square mark

---

## 7. Out of scope (do not build these)

- No CMS integration.
- No i18n / language switcher (design copy to be reasonably translatable, but no `astro-i18n` setup).
- No analytics beyond an optional single privacy-respecting script (Plausible or similar, only if the firm asks — leave a comment placeholder).
- No contact form. Email link is `mailto:`.
- No newsletter signup.
- No blog / news section.
- No tests, no Storybook, no Playwright, no CI config.
- No Docker, no devcontainer.
- No state management library, no router (Astro routes the page).
- No icon library — inline SVGs only, max ~6 across the whole site.
- No drag-and-drop, file picker, upload UI, auth, or property panel inside the viewer (those were already explicitly out of scope for the viewer itself).

---

## 8. Acceptance checklist

Before considering the build done, verify all of these:

- [ ] `npm run dev` starts cleanly on Node 22+. No warnings from Astro about deprecated APIs.
- [ ] Page renders end to end on a 375px-wide viewport without horizontal scroll.
- [ ] Page renders end to end on a 1440px-wide viewport with the layout breathing properly.
- [ ] Every section has its content + section-number eyebrow + heading.
- [ ] Header transitions from transparent to solid as the user scrolls past the hero.
- [ ] All entrance animations respect `prefers-reduced-motion`.
- [ ] `public/models/index.json` and the `.frag` files are present (use the actual ones from `npm run convert`, or commit a small placeholder set if the IFCs aren't ready).
- [ ] The viewer section renders the model at the configured fixed height (no full-viewport takeover).
- [ ] Sidebar toggle works inside the section, sliders fade individual disciplines, sliders re-apply opacity after camera moves close (LOD tiles).
- [ ] The viewer's `<aside>`, toggle, and loading overlay are positioned **inside** `.viewer-host` and do not escape into page chrome.
- [ ] Viewer JS is loaded lazily — confirm via DevTools Network panel that the worker chunk and That Open Company libraries do not download until the user scrolls toward the showcase section.
- [ ] `npm run build` produces a `dist/` folder. `npm run preview` serves it. The full page (including viewer) works from the preview build, not just dev.
- [ ] Lighthouse on the preview build hits the targets in section 6.
- [ ] No console errors or warnings on initial load or after interacting with the viewer.
- [ ] The accent red appears at most 4 times on the page.
- [ ] Greek wordmark in the header (`ΓΡΑΦΕΙΟ ΠΑΥΛΙΔΗ Α.Τ.Ε.Μ.`) renders correctly — Inter and Fraunces both ship Greek glyphs; verify.
- [ ] `mailto:` link in Contact section opens the user's mail client.
- [ ] OG image and favicon present.
- [ ] README updated with: prerequisites (Node 22+), `npm install`, `npm run convert` (note: developer-only, requires source IFCs in `ifc/`), `npm run dev`, `npm run build`, `npm run preview`, deploy notes (upload `dist/`).

---

## 9. Working order — suggested phases

1. **Scaffold.** `npm create astro@latest` → empty/minimal template. Set Node engines, install fonts, set up tokens/reset/global CSS, add the type alias.
2. **Build the static skeleton.** All section components with placeholder copy and dummy images, no viewer yet. Get the typography, spacing, and grid right *first* — these are the hardest things to retrofit.
3. **Hook up entrance animations.** IntersectionObserver, reduced-motion guard.
4. **Integrate the viewer.** Copy `src/viewer/`, edit its `style.css` per 4.5, copy `scripts/convert-ifc.ts`, wire `npm run convert`, add the `.frag` files to `public/models/`, build `ViewerShowcase.astro` per 4.4, lazy-load per 4.8.
5. **Polish.** Header scroll behavior, focus styles, OG + favicon, README.
6. **Verify against the acceptance checklist.**

Stop and ask the user before deviating from any of: the color palette, the section order, the type pairing, the viewer's pinned versions, or section 7's "do not build" list.

**One thing you must proactively ask the user about, not assume**: the subdomain. The user has explicitly said it isn't chosen yet. When you reach phase 5 (Polish) — or sooner if you're about to set the `site` field, generate canonical URLs, build the OG image, write the README's deploy section, or output a sitemap — pause and ask: *"What subdomain should I use for `site` in `astro.config.mjs`? (Examples: `studio.example.gr`, `showcase.example.gr`.)"* Do not guess, do not pick a placeholder that looks real, and do not invent a domain. Until the user answers, keep `site` commented out in the config and use relative URLs everywhere.

---

## 10. Quick reference — files the user must (or may) supply

| File / asset                | Required? | Note                                                                              |
| --------------------------- | --------- | --------------------------------------------------------------------------------- |
| Source IFCs in `ifc/`       | Yes (eventually) | Needed to run `npm run convert`. v1 can ship with placeholder `.frag` files. |
| Firm logo SVG               | Yes       | Place in `public/brand/logo.svg`. PNG fallback ok but SVG strongly preferred.     |
| Project photography         | Yes       | 4–6 images. Place in `src/assets/projects/`. Will be optimized by `astro:assets`. |
| Real copy                   | Yes       | Hero line, philosophy, project descriptions, methodology steps, contact details.  |
| Subdomain                   | Deferred  | Not chosen yet. **Ask the user before producing a production build.** Until supplied, leave `site` commented out in `astro.config.mjs` — dev/preview/build all work without it. |
| OG image                    | Optional  | Will be generated as a fallback (monochrome logo on paper) if not supplied.       |

End of brief.
