# Pavlides Associates — Landing

Single-page, mobile-first landing site for **Pavlides Associates S.A.**
(ΓΡΑΦΕΙΟ ΠΑΥΛΙΔΗ Α.Τ.Ε.Μ.). Static Astro 6 build with one section that
embeds an IFC/Fragments 3D viewer (That Open Components).

The full build spec lives in [`BRIEF.md`](./BRIEF.md) — read it before
making non-trivial changes.

## Prerequisites

- **Node ≥ 22.12** (Astro 6 requires it; Node 18/20 will not work)
- **npm**

## Quickstart

```bash
npm install
npm run dev          # http://localhost:4321
```

## Scripts

```bash
npm run dev          # Astro dev server with HMR
npm run build        # type-check + static build → dist/
npm run preview      # serve the production build locally
npm run convert      # IFC → .frag converter (developer-only, see below)
```

## The IFC viewer (developer-only conversion step)

The viewer in the **Project in Depth** section reads pre-converted Fragments
(`.frag`) files from `public/models/`. Conversion happens locally — never on
the deploy host.

```bash
# 1. drop source IFCs into ifc/
# 2. run the converter; outputs .frag + index.json into public/models/
npm run convert
```

Filenames carry meaning — they become the discipline labels in the viewer
sidebar (numeric/dash prefixes are stripped: `01 Structural.ifc` →
"Structural"). Don't rename `.frag` files post-conversion.

The viewer source lives in `src/viewer/` and is loaded lazily via
`IntersectionObserver` from `src/components/ViewerShowcase.astro` — its
~6 MB JS bundle is kept off the critical path.

## Project layout

```
public/
  models/          # generated .frag files + index.json (gitignored, served at /models/)
  brand/logo.svg   # firm logo (placeholder until supplied)
  favicon.svg
src/
  assets/          # images that need optimization (use astro:assets)
  components/      # Header, Hero, Philosophy, Projects, Methodology,
                   # ViewerShowcase, Contact, Footer
  data/projects.ts # typed list of selected projects (placeholders until supplied)
  layouts/Base.astro
  pages/index.astro
  styles/          # tokens.css, reset.css, global.css
  viewer/          # vanilla-TS IFC viewer (do not rewrite — see BRIEF §4)
scripts/
  convert-ifc.ts   # IFC → .frag batch converter
ifc/               # source IFCs (gitignored, not shipped)
astro.config.mjs
```

## Stack — pinned

| Tool                  | Version |
| --------------------- | ------- |
| Astro                 | ^6.0.0  |
| TypeScript            | ^5.6    |
| @thatopen/components  | 3.4.5   |
| @thatopen/fragments   | 3.4.5   |
| three                 | 0.184.0 |
| web-ifc               | 0.0.77  |
| camera-controls       | ^3.1.2  |

That Open Company's API churns between minor versions — do not bump those
five packages without re-checking
[`docs.thatopen.com`](https://docs.thatopen.com/intro).

## Deployment

```bash
npm run build
# upload contents of dist/ to any static host
# (Cloudflare Pages, Netlify, Vercel static, S3+CloudFront, plain nginx — all fine)
```

Cache headers: hashed assets under `_astro/` are safe for `max-age=31536000,
immutable`. The `.frag` files in `models/` are not hashed; give them a short
TTL (e.g. 1 hour) so model updates propagate quickly.

> **Subdomain not yet chosen.** Until it is, leave `site:` commented out in
> `astro.config.mjs`. When the firm settles on one, set it there and update
> any canonical URLs / OG image references accordingly.

## What still needs the firm

Tracked as `[TODO: confirm with firm]` markers in the source:

- Hero headline + positioning paragraph
- Philosophy section copy
- Project list (`src/data/projects.ts`) — real titles, locations, years, descriptions
- Methodology step copy
- ViewerShowcase context paragraph + chosen project name
- Contact details (address, phone, email, hours)
- Tax / corporate ID line in the footer
- Logo SVG (`public/brand/logo.svg`)
- Project photography (`src/assets/projects/`)
- Subdomain (for `site` in `astro.config.mjs` + OG metadata)
