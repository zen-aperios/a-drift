# A Drift Refactor and Startup Audit

Date: 2026-09-30

## Purpose

This document separates the work needed to stop native slider flashes, reduce startup cost, remove verified leftovers, and split the largest files without changing the current visual, audio, scroll, or sequencer behavior.

The order matters. First lock down first paint and capture the current behavior. Then remove code that has no runtime owner. Only after that should the large components and engines be split.

## Current Baseline

| Area | Current size or behavior |
| --- | --- |
| `src/components/TraceDream.jsx` | 1,458 lines, about 51 KB source |
| `src/components/rhodesChordEngine.js` | 1,337 lines, about 52 KB source |
| `src/styles.css` | 2,368 lines, about 48 KB source |
| Built CSS | About 845 KB because the dust SVG is inlined into CSS |
| Main JavaScript chunk | About 1.33 MB minified, about 271 KB gzip |
| Lottie player chunk | About 169 KB minified, about 48 KB gzip |
| Lottie JSON imported into main graph | About 520 KB source across two files |
| Bottom video | About 5.7 MB |
| Loader lines | 28 in both boot HTML and React loader |
| Native range inputs | 2 alphabet controls and 3 conditional sequencer controls |

The production build passes. The current Vite warning is the main JavaScript chunk exceeding 500 KB.

## Slider Flash Trace

### Where the sliders come from

There are only five range input declarations in the application:

1. `AlphabetGenerator.jsx`: Ghost Direction.
2. `AlphabetGenerator.jsx`: Warp Chaos.
3. `TraceDream.jsx`: sequencer Level.
4. `TraceDream.jsx`: sequencer Reverb.
5. `TraceDream.jsx`: sequencer Decay.

The three sequencer sliders are conditionally mounted only when both the sequencer and Settings are open. The two alphabet sliders are always mounted lower in the document.

This means a screen full of native sliders is not a separate hidden control system. It is existing range markup being painted while its authored CSS is absent or being replaced.

### Current startup chain

1. `index.html` paints an inline black `#boot-loader` at the maximum z-index.
2. Vite loads `main.jsx` and `styles.css` through the JavaScript module graph in development.
3. React schedules `<PageLoader />` and the full `<TraceDream />` tree together.
4. `main.jsx` checks stylesheet links.
5. In development there may be no stylesheet link because Vite injects a style element.
6. The boot loader is removed after two animation frames.
7. The React loader animates for about three seconds and then unmounts.

### Weak point 1: no painted-loader handshake

The boot loader is removed based on stylesheet state and two frames. It does not receive confirmation that the React loader has committed and painted.

This usually works, but it is scheduling by assumption. A slow module evaluation, interrupted development refresh, browser main-thread stall, or React remount can create a frame where the boot loader is gone and the React cover is not dependable.

### Weak point 2: CSS hot updates bypass the boot loader

The HTML boot loader exists only on a full navigation. During Vite hot updates, the page is already mounted and the boot loader is gone. Replacing the one large stylesheet can expose native form controls for a frame.

This is the strongest explanation when the flash is seen while actively editing rather than on a clean production navigation.

### Weak point 3: the stylesheet is unusually expensive to replace

`styles.css` imports `dust-layer.css`. That file contains a very large percent-encoded SVG made from many tiny rectangles. The authored CSS is around 48 KB, but the built CSS becomes about 845 KB.

That large style payload increases parsing, injection, and hot replacement work. It widens the window in which native range controls can be visible during development.

### Weak point 4: remote font import is inside the main stylesheet

The first CSS line imports Google Fonts over the network. The font request can fail, stall, or behave differently between development and production. It should not own any part of the critical styling path.

### What the capture showed

A hard-load capture at the start of the page showed the black cover and no sliders. That does not prove every device is safe, but it supports the conclusion that the common flash is caused by handoff timing or CSS hot replacement rather than the initial HTML itself.

## Recommended Flash Fix

### Step 1: explicit React paint handshake

Keep the HTML boot loader until `<PageLoader />` confirms it is mounted and a paint has occurred.

Recommended contract:

1. `PageLoader` runs a layout effect.
2. It schedules one `requestAnimationFrame`.
3. That frame dispatches `a-drift:loader-painted` or calls a supplied callback.
4. `main.jsx` removes `#boot-loader` only after both CSS readiness and that painted signal.
5. Add a defensive timeout only as an error fallback, not as the primary path.

This removes the timing assumption without changing the loader animation.

### Step 2: inline a minimal range-control reset

Place a tiny critical rule in `index.html`:

```css
input[type="range"] {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
}
```

This is a fallback for development CSS replacement. Even if the main stylesheet disappears briefly, the browser will not show the large platform-default sliders.

The rule does not define the final look. Existing component styles continue to provide the track and thumb.

### Step 3: split critical controls CSS from visual CSS

Create a small stylesheet that contains:

- box sizing and black page background
- loader styles
- range reset
- mini sequencer hidden state
- basic canvas stacking

Load it before the main application stylesheet and do not hot-replace it during ordinary visual edits.

### Step 4: move the dust texture out of CSS

Replace the 800 KB encoded SVG with one of these:

1. A small external WebP/PNG tile matching the existing appearance.
2. A much smaller procedural SVG using only `feTurbulence` if the browser result is acceptable.
3. A generated static texture loaded as a normal asset.

The first option is the most predictable and fastest to parse.

### Step 5: test both flash paths

Test these separately:

1. Empty-cache production navigation under CPU and network throttling.
2. Vite CSS hot updates while the sequencer Settings panel is open.
3. Vite component hot updates while scrolled near the alphabet controls.
4. Mobile Safari reload and return from background.
5. Firefox reload with the remote font request blocked.

## Verified Removal Candidates

These have no matching runtime references in the current source search. Remove them in a dedicated cleanup commit and verify screenshots before and after.

### Unreferenced module

- `src/components/portalLayout.js`

`applyPortalLayout` is not imported or called anywhere. The active placement system uses `placementLayout.js` and the portal controllers.

### Obsolete Rhodes panel CSS

The old `.rhodes-sound-panel*` and `.rhodes-sequencer-panel*` blocks begin near line 108 of `styles.css`. There is no matching JSX or generated DOM for these classes.

Estimated removal: more than 400 CSS lines including the old responsive rules.

Do not remove `.rhodes-audio-button` or `.rhodes-audio-control`; those classes are active in the top bar.

### Obsolete footer filing UI CSS

The following selectors have no current markup owner:

- `.site-footer__line-tab*`
- `.site-footer__line-panel*`
- `.site-footer__back-to-top*`
- `.site-footer__line-field i.is-open`
- line hover spacing intended for the removed filing cards

The live footer now uses a static line field, collaboration content, directories, sequencer toggle, and clock.

### Hidden sequencer export feature

The `EXP` button is still rendered and `exportSequence()` is still created on every sequencer render, but CSS forces the button to `display: none`.

If export is intentionally retired, remove:

- `exportSequence()`
- the hidden button markup
- every `.mini-sequencer__export*` selector

If export may return soon, keep it in a separate optional component rather than hidden live markup.

### Empty hidden footer cell

`site-footer__lottie-cell` is rendered as an empty span and is permanently hidden. It has no visible or semantic behavior.

### Unused source assets

The portal loader imports only `portal-images/*.webp`. The parallel PNG files are not included in the current build and have no direct references.

The four `extra/Chord Synth *.wav` files are not in either audio glob and have no source references.

Removing these files reduces repository and transfer/archive size, but it will not materially change the current browser payload because they are already excluded from the build.

### Unnecessary time API request

`FooterClock` requests `worldtimeapi.org`, then formats the result with `Intl.DateTimeFormat` for `Europe/Lisbon`. The request has already produced CORS failures and is unnecessary for a display clock.

Use `new Date()` plus the existing `timeZone: "Europe/Lisbon"` formatter. This removes an external request and console noise without changing the displayed timezone.

## Code That Looks Suspicious but Is Not Yet Safe to Remove

### DOM media path

`.trace-dom-media` is currently hidden in the main CSS, but the Firefox media path and portal controllers still contain DOM-media behavior. Do not remove it until Chrome and Firefox runtime branches are traced end to end.

### Audio sample libraries

The 727 and 808 libraries are eagerly converted into URL manifests at module evaluation. The browser generally does not download every WAV until fetched, but the complete registry is included in startup JavaScript and every asset is emitted by the build.

Do not reduce this list without confirming every dropdown option and imported sequence can still resolve.

### Path editor

The path editor has hidden-state CSS and many event handlers. It may look like authoring-only code, but it currently participates in layout and trace configuration. Separate it behind a development flag before considering removal.

### Strict Mode

React Strict Mode intentionally runs effect setup and cleanup twice in development. It can expose lifecycle bugs, but removing it would hide those bugs rather than fix them. Keep it until every controller has idempotent setup and cleanup.

## Safe CSS Consolidation

The stylesheet contains many repeated selectors because later rules override earlier iterations. Examples include:

- `.site-footer__line-field` defined three times
- `.mini-sequencer` defined three times
- range track and thumb rules repeated for the white and inverted panel states
- `.mini-sequencer__arrow`, step, tab, pager, and export states repeated
- footer time and bottom-row rules repeated

Do not run an automatic deduplicator. The cascade order currently carries behavior.

Use this process instead:

1. Capture desktop, tablet, and mobile screenshots.
2. Record computed styles for representative controls.
3. Move final declarations into one component section without changing selector specificity.
4. Delete only the overridden declaration after computed styles match.
5. Repeat one component family at a time.

## Proposed File Split

### React components

```text
src/
  app/
    App.jsx
    StartupGate.jsx
  components/
    loader/
      PageLoader.jsx
      loaderLines.js
    hero/
      HeroTopBar.jsx
      AudioControl.jsx
    sequencer/
      MiniSequencer.jsx
      MiniTrackDropdown.jsx
      SequencerHeader.jsx
      SequencerSettings.jsx
      SequencerPager.jsx
    footer/
      SiteFooter.jsx
      FooterClock.jsx
      FooterLottie.jsx
      FooterLineField.jsx
      FooterTypeComposer.jsx
    trace/
      TraceDream.jsx
      useTraceRuntime.js
```

The first split should be mechanical. Move code without changing props, state ownership, effects, or DOM order.

### Audio engine

```text
src/audio/
  engine/
    createRhodesChordEngine.js
    audioContext.js
    sampleRegistry.js
    samplePreview.js
    synthVoices.js
    effectsGraph.js
    sequencerTransport.js
    sequencerState.js
    sequenceExport.js
  patterns/
    defaultPattern.js
    autoPlayPattern.js
    instrumentDefaults.js
```

Keep one public facade so React does not learn the internal audio graph. Existing public method names should remain stable during the split.

### CSS

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

`critical.css` should stay small and stable. The dust texture should be an asset, not embedded source text.

## Performance Work After Cleanup

### Split heavy startup modules

Three.js is statically imported through `portalMedia.js`, so the Three runtime joins the initial application graph. The footer Lottie player is dynamically imported, but both Lottie JSON files are statically imported by `TraceDream.jsx`.

Candidates:

1. Dynamically import the portal/WebGL runtime behind the loader.
2. Dynamically import `runman02.json` only when the lazy footer animation approaches view.
3. Keep the top-bar Lottie data eager only if it must appear immediately.
4. Load the bottom video metadata near its section rather than during initial trace setup.

### Reduce full-document rendering cost

The existing `PERFORMANCE.md` correctly identifies full-document canvas and WebGL surfaces as the largest long-term runtime cost. That migration is higher risk and should follow the startup and dead-code cleanup.

### Avoid duplicate clocks and frame loops

Lenis and trace rendering already share GSAP in part, but the app still has multiple timers, requestAnimationFrame users, observers, and audio scheduling intervals. Keep audio scheduling independent, but inventory visual frame work so hidden or offscreen systems do not continue writing styles or clearing canvases.

## Refactor Phases

### Phase 0: behavior capture

- Record desktop at 1440 x 900.
- Record tablet at 1024 x 768.
- Record mobile at 390 x 844.
- Capture loader at start, midpoint, and handoff.
- Capture hero, portal sequence, One Shots, alphabet, footer, and open sequencer settings.
- Export the current sequence config.
- Record the default audio pattern and autoplay transition.

Exit condition: screenshots, interaction notes, and audio configuration are available for comparison.

### Phase 1: eliminate slider flash

- Add the React loader painted handshake.
- Add the inline range reset.
- Keep the boot cover until CSS and React are both ready.
- Verify hard navigation and Vite hot updates.

Exit condition: no native range controls appear under throttled hard load or CSS hot replacement.

### Phase 2: remove verified leftovers

- Remove `portalLayout.js`.
- Remove obsolete Rhodes panel CSS.
- Remove obsolete footer filing CSS.
- Remove the hidden export feature if confirmed retired.
- Remove the empty footer Lottie cell.
- Remove the world-time request.
- Optionally remove unused PNG and `extra/` audio source files.

Exit condition: identical visual captures and sequence export before and after.

### Phase 3: reduce CSS startup cost

- Replace the encoded dust SVG with an external tile.
- Move Google Fonts out of `@import` or self-host the exact used weights.
- Split critical and component CSS.
- Consolidate duplicated selectors one family at a time.

Exit condition: computed control styles match and built CSS drops substantially from 845 KB.

### Phase 4: mechanical component split

- Extract loader, footer, sequencer, and hero components.
- Keep DOM order and class names unchanged.
- Keep state in its current owner until extraction is stable.
- Add focused tests for sequencer page, track, level, reverb, decay, and pitch state.

Exit condition: no behavior changes and `TraceDream.jsx` becomes an orchestration component.

### Phase 5: audio engine split

- Move constants and patterns first.
- Move sample registry second.
- Move effect graph and synth voices third.
- Move transport last.
- Preserve the existing facade throughout.

Exit condition: startup pattern, autoplay pattern, previews, sound toggle, and per-track settings match the baseline.

### Phase 6: runtime code splitting

- Lazy-load footer Lottie data.
- Evaluate lazy-loading Three.js and portal runtime.
- Defer below-fold media work.
- Measure rather than guessing at chunk boundaries.

Exit condition: smaller initial JavaScript with no later interaction hitch.

### Phase 7: viewport-sized render surfaces

- Follow `PERFORMANCE.md`.
- Migrate one canvas at a time.
- Preserve scroll coordinates and portal placement contracts.

Exit condition: lower GPU memory and frame cost with identical composition.

## Verification Checklist

Run after every phase:

```bash
git diff --check
npm run build
```

Browser checks:

- No white frame before loader.
- No native slider frame.
- Loader remains about three seconds.
- Loader line order and darkening remain intact.
- Sound can be enabled before and after scrolling.
- Sequencer Settings opens and closes without layout jumps.
- Manual page arrows override autoplay page movement.
- Track patterns and pitch markers remain visible.
- Footer Lottie loads near view.
- Footer links and collaboration layout wrap correctly on mobile.
- No console exceptions or failed time API request.

## Recommended First Implementation Batch

The first code batch should be deliberately small:

1. Add the loader-painted handshake.
2. Add the critical inline range reset.
3. Remove the unnecessary time API request.
4. Replace the encoded dust layer with a small external texture.
5. Verify hard load and Vite hot reload.

This batch directly addresses the observed flash and removes the largest CSS parsing burden before any structural refactor begins.
