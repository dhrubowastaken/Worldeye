# World Eye

World Eye is a professional-grade global intelligence surface built with Next.js,
MapLibre, and a modular live-data pipeline for air, maritime, and orbital traffic.
It is designed to be cloneable, extensible, and safe to evolve as new providers
and render overlays are added.

## Why this project exists

- Show a polished real-time globe product instead of a one-file prototype
- Keep the rendering pipeline modular so future datapoints do not destabilize the app
- Reduce unnecessary work by syncing and rendering only what matters to the current viewport
- Surface provider degradation gracefully instead of blanking the UI when an upstream service breaks

## Quick start

```bash
git clone https://github.com/dhrubowastaken/World-Eye.git
cd World-Eye
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and fill in whichever providers you want to enable:

```bash
NEXT_PUBLIC_AISSTREAM_API_KEY=
NEXT_PUBLIC_SPACE_TRACK_USERNAME=
NEXT_PUBLIC_SPACE_TRACK_PASSWORD=
NEXT_PUBLIC_N2YO_API_KEY=
```

Notes:

- Air traffic works through the ADS-B proxy rewrite configured in `next.config.ts`.
- Maritime traffic requires `NEXT_PUBLIC_AISSTREAM_API_KEY`.
- Orbital tracking works with public CelesTrak feeds out of the box and uses the
  committed satellite name cache in `public/data/satellite-names.json`.

## Engineering workflow

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run check
```

`npm run check` is the main pre-merge verification command.

## Project structure

```text
src/
  app/                      App Router entrypoints and recovery boundaries
  features/globe/           Map styling, viewport math, scheduler, rendering
  features/traffic/         Provider contracts, classification, scene store
  features/world-eye/       Product shell, panels, controller hook
public/data/                Committed runtime catalogs served directly to the client
scripts/                    Optional catalog refresh utilities
tests/
  unit/                     Domain and provider tests
  components/               UI surface tests
  e2e/                      Playwright smoke coverage
```

## Architecture

### Viewport-aware scheduling

`ViewportQueryScheduler` suppresses redundant refreshes until either:

- the viewport meaningfully changes, or
- the per-detail TTL expires.

This prevents broad re-fetches during tiny camera movements.

### Provider registry

All live domains implement a shared `DataProvider` contract with:

- provider identity and capabilities
- viewport-driven snapshot fetching
- structured health reporting
- explicit teardown support

The registry isolates failures so one bad upstream does not take down the whole app.

### Scene store

The `SceneStore` normalizes tracked entities and indexes them for viewport-based visibility.
The UI consumes filtered visible slices instead of rebuilding the full scene every render.

### Render intents

Providers and entities request overlays through `RenderIntent` contracts like:

- `marker`
- `label`
- `orbit`
- `trail`

That gives future datapoints a stable way to ask for rendering without editing the core map component.

## Optional data maintenance

The app already ships with committed runtime data, so extra setup is not required.

If you want to rebuild the orbital name catalog:

```bash
npm run build:satellites
```

The refresh scripts write only to `public/data/`.

## CI

GitHub Actions runs:

- lint
- typecheck
- unit/component tests
- production build
- Playwright smoke coverage

The workflow lives in `.github/workflows/ci.yml`.

## Extending the system

### Add a provider

1. Create a new provider under `src/features/traffic/providers/`.
2. Implement the shared `DataProvider` contract.
3. Normalize upstream payloads into `TrackedEntity`.
4. Register the provider in `useWorldEyeController`.
5. Add provider-specific tests before shipping.

### Add a new overlay

1. Extend entity `renderables` or produce new `RenderIntent` values.
2. Materialize the new overlay in `src/features/globe/components/WorldMap.tsx`.
3. Add tests for intent generation and visibility behavior.

## Current tradeoffs

- The orbital provider intentionally caps the loaded live catalog to keep client-side propagation responsive.
- Maritime traffic is degraded when AIS credentials are missing, but the rest of the app remains usable.
- Playwright smoke tests mock provider traffic so CI verifies the product shell deterministically.
