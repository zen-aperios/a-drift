# A Drift Remaining Refactor Plan

Date: 2026-09-30

## Purpose

This document tracks only unfinished cleanup, architecture, and performance work. Every change should preserve the current visual composition, audio behavior, scroll behavior, sequencer patterns, and responsive layout.

## Current Baseline

| Area | Current size or behavior |
| --- | --- |
| `src/components/TraceDream.jsx` | Trace composition and page orchestration |
| `src/components/rhodesChordEngine.js` | 1,337 lines, about 52 KB source |
| `src/styles.css` | 1,848 lines, about 37 KB source |
| Built CSS | About 30 KB |
| Main JavaScript chunk | About 1.33 MB minified, about 272 KB gzip |
| Lottie player chunk | About 169 KB minified, about 48 KB gzip |
| Bottom video | About 5.7 MB |

The production build passes. The main remaining build warning is the initial JavaScript chunk exceeding 500 KB.

## Guardrails

- Preserve DOM order and existing class names during mechanical extraction.
- Keep one owner and cleanup path for every timer, listener, observer, animation frame, GSAP timeline, audio node, and WebGL resource.
- Preserve the current audio-engine facade while its internals are split.
- Do not automatically deduplicate CSS; cascade order currently carries behavior.
- Verify desktop, tablet, and mobile after every visual or lifecycle change.

## Remaining Cleanup Candidates

### Hidden sequencer export feature

The `EXP` button and `exportSequence()` remain in the sequencer while CSS hides the button. Keep them if export is returning soon. Otherwise move export into an optional component or remove both markup and styles together.

### Empty footer cell

Confirm whether `site-footer__lottie-cell` still renders without content. Remove its markup and selectors together if it has no owner.

### Unused source assets

Confirm these against the runtime manifests before deletion:

- Parallel portal PNG files when only WebP files are imported.
- `extra/Chord Synth *.wav` files if they remain outside every audio manifest.

Removing unreferenced source assets reduces repository size but does not improve browser payload when Vite already excludes them.

### Browser-specific DOM media path

The Firefox DOM-media path is still active even though `.trace-dom-media` may appear hidden in the default browser path. Trace both branches before removing anything.

### Path editor

The editor participates in trace configuration and layout. Put it behind an explicit development boundary before considering removal.

## Next Component Extraction

### Trace runtime hook

Move the large imperative setup effect from `TraceDream.jsx` into `useTraceRuntime.js` only after its complete input and cleanup contract is documented. Keep React responsible for markup and controllers responsible for canvas, WebGL, scroll, and animation work.

## Audio Engine Split

Split `rhodesChordEngine.js` behind its existing public API in this order:

1. Move constants and default/autoplay pattern data.
2. Move sample manifests and lookup helpers.
3. Move track state and effects graph.
4. Move synthesis and sample voices.
5. Move transport and scheduling last.

Required behavior checks:

- Startup and autoplay patterns remain distinct.
- Manual sequencer pages still override autoplay page movement.
- Instrument previews remain gain-limited.
- Sound can be enabled before or after scrolling.
- Per-track level, reverb, decay, and pitch values remain unchanged.

## CSS Ownership

Split styles one feature at a time:

```text
src/styles/
  critical.css
  base.css
  hero.css
  trace.css
  alphabet.css
  sequencer.css
  footer.css
  responsive.css
```

For each feature:

1. Capture representative desktop, tablet, and mobile states.
2. Record computed styles for interactive controls.
3. Move declarations without changing order or specificity.
4. Build and compare.
5. Consolidate duplicates only after computed styles match.

## Runtime Code Splitting

- Lazy-load the footer Lottie JSON together with its player near the viewport.
- Evaluate loading Three.js and the portal runtime after the startup cover is secure.
- Defer below-fold media decoding without delaying the first reveal.
- Measure each boundary to avoid replacing startup savings with interaction hitches.

## Rendering Work

Full-document canvas and WebGL surfaces remain the highest-risk performance work. Follow `PERFORMANCE.md` and migrate one surface at a time while preserving document-space coordinates through translation adapters.

## Verification Checklist

Run after every batch:

```bash
git diff --check
npm run build
```

Browser checks:

- No white frame or native controls during startup or hot updates.
- Loader remains approximately three seconds.
- Sound works before and after scrolling.
- Sequencer opens from bottom center with unchanged timing.
- Settings, track replacement, pitch editing, and page arrows work.
- Current patterns and autoplay transitions remain visible in the grid.
- Footer links, collaboration marks, and generated text wrap correctly.
- No console exceptions or failed network requests.

## Recommended Next Batch

1. Move audio pattern constants into dedicated modules.
2. Add focused tests for sequencer paging, pattern transitions, and track settings.
3. Lazy-load footer animation data.
4. Document the trace runtime inputs and cleanup contract.
