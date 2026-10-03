# A Drift Architecture

## Overview

A Drift is a single-page audiovisual composition built with React and Vite. React
owns the document structure and visible controls. Imperative controllers own the
canvas, WebGL, scrolling, animation, and Web Audio work that runs outside React's
render cycle.

The page combines:

- a three-second startup loader and fixed noise texture;
- a scroll-driven trace-letter composition;
- Three.js portal media reveals with a Firefox DOM fallback;
- generated alphabet and footer typography;
- a multi-track sequencer and scroll-synchronized audio engine;
- a line-field footer with lazily loaded Lottie content.

## Runtime Flow

```text
index.html boot cover
  -> src/main.jsx waits for CSS and the React loader to paint
  -> src/App.jsx starts the shared Lenis/GSAP clock
  -> PageLoader covers application startup
  -> TraceDrift mounts the visual and audio composition
  -> trace lifecycle starts layout, input, asset, and render controllers
  -> footer animation code and data load only near the viewport
```

The boot cover is removed only after the stylesheet readiness flag and
`a-drift:loader-painted` event have resolved, with a timeout fallback. This prevents
native controls or unstyled content appearing before the React loader.

## Source Layout

```text
src/
  assets/
    animation/       Lottie JSON
    audio/           727, 808, Korg, percussion, and extra samples
    brand/           logos
    images/portal/   portal source images
    textures/        fixed noise texture
    video/           bottom composition video
  audio/
    engine/          Web Audio graph, playback, transport, voices, track state
    patterns/        default, bass, and visibility pattern data
  components/
    footer/          clock, line field, footer Lottie, type composer
    hero/            top bar and sound control
    loader/          startup loader
    sequencer/       sequencer panel, track dropdown, view-state helpers
    TraceDrift.jsx   composition markup and runtime assembly
    *Controller.js   imperative feature and lifecycle controllers
    *Renderer.js     canvas and WebGL rendering units
  App.jsx            global smooth-scroll clock and top-level composition
  main.jsx           startup handoff and React mount
  styles.css         primary application styles
  dust-layer.css     fixed texture layer styles
test/
  sequencer.test.js  dependency-free audio/sequencer behavior tests
```

## Application Shell

`src/main.jsx` mounts React and coordinates the static boot cover with the React
loader. `src/App.jsx` creates one Lenis instance and advances it from GSAP's ticker,
so smooth scrolling does not introduce a second independent animation loop.

`App` renders three top-level layers in order:

1. `PageLoader` for startup coverage.
2. `NoiseLayer` as a fixed, pointer-transparent texture.
3. `TraceDrift` as the interactive composition.

The Lenis instance and GSAP ticker callback are both cleaned up when `App` unmounts.

## Trace Composition

`TraceDrift.jsx` owns the stable DOM surfaces, React interface state, and assembly of
the imperative runtime. Its React state is limited to visible controls such as sound,
sequencer visibility, instrument options, and the placement grid.

High-frequency render state lives in `traceState.js`, outside React. This includes
scroll position, responsive geometry, portal reveal values, shader inputs, and
animation progress. Keeping it mutable avoids a React render on every animation
frame.

### Canvas and media stack

The trace viewport contains, back to front:

1. back portal canvas or Firefox DOM media layer;
2. main trace canvas;
3. front Firefox DOM media layer or portal canvas;
4. bottom ghost canvas;
5. bottom interface canvas;
6. the SVG creativity path editor.

The canvas and DOM layers use the same placement data. Firefox uses DOM images for
portal media while the default path renders portal planes through Three.js.

### Controller ownership

Controllers are small factories composed by `TraceDrift`:

- `traceCompositionController` coordinates layout-related callbacks.
- `traceLifecycleController` owns startup, browser listeners, resize, and cleanup.
- `traceRuntimeController` renders a frame from the current trace state.
- `traceScheduler` caps rendering at 40 fps and pauses in hidden tabs.
- `traceSurfaceController` sizes and synchronizes canvas surfaces.
- `layoutController` calculates responsive trace geometry.
- `scrollController` maps document scroll to composition progress.
- `portalRuntimeController` manages portal reveal animation state.
- `portalAssetController` loads and disposes portal assets.
- `portalInteractionController` and `portalEditorController` own portal editing input.
- `pathEditorController` and `creativityPathController` own the editable SVG path.
- `bottomSectionController` coordinates the final composition section.

Renderers consume state but do not own the application lifecycle. Every scheduler,
listener, texture, renderer, animation, cache, and audio node created during setup is
released by the effect cleanup path.

## Portal Rendering

`portalMedia.js` provides the shared Three.js primitives and lazily addressable WebP
asset map. `portalRenderer.js` draws the front and back media scenes, while
`placementLayout.js` resolves image frames against the placement grid.

Portal images are selected from `src/assets/images/portal/*.webp` through Vite's
`import.meta.glob`. PNG counterparts remain source references but are not included in
the production bundle unless imported.

The portal shader combines each image with a generated canvas noise texture. Layout
and uniform values are cached where possible to avoid repeating unchanged work per
frame.

## Typography

`AlphabetGenerator` renders the interactive alphabet grid. `AlphabetGlyph` and
`glyphRenderer` share the trace-letter drawing language used by the hero and footer
type composer. Glyph canvases are cached after generation.

`FooterTypeComposer` accepts a single line of user input and renders the generated
letter treatment within its responsive wrapper. The footer's collaboration lockup,
directories, line field, clock, and sequencer trigger are rendered by the footer
components and `TraceDrift` footer markup.

## Sequencer and Audio

`MiniSequencer` is the control-panel view. It owns interface concerns such as selected
track, page, settings visibility, step editing, and track replacement. It communicates
with the engine facade rather than manipulating Web Audio nodes directly.

`rhodesChordEngine.js` is the public audio facade used by `TraceDrift` and the
sequencer. Internally it composes:

- `effectsGraph.js` for per-track processing and reverb routing;
- `samplePlayer.js` for decoded sample playback and previews;
- `sampleRegistry.js` for typed sample URLs and library discovery;
- `sequencerTransport.js` for timing, swing, scheduling, and cancellation;
- `synthVoices.js` for bass, stamp, and synthesized voices;
- `trackState.js` for track settings and subscriptions;
- `audio/patterns/*` for startup, autoplay, bass, and visible-grid patterns.

The engine is created when the trace runtime mounts and disposed with it. The sound
control unlocks Web Audio from a user gesture, then starts or stops the scroll groove
without gating playback on the current scroll position.

Detailed control ranges and defaults live in `SOUND_CONTROLS.md`.

## Footer Loading

The hero/footer marks use separate Lottie files. The small footer mark imports its
animation directly. The larger footer content animation uses an intersection observer
and dynamically imports both `lottie_light` and `runman02.json` near the viewport.

`FooterClock` formats local browser time without an external time API, so the footer
does not depend on a network clock service.

## Assets and Bundling

Runtime assets are grouped under `src/assets` and imported through Vite. Imported
audio, images, video, SVG, and JSON receive production URLs during the build.
`import.meta.glob` is used where an entire selectable library must remain addressable.

The footer Lottie player and its larger JSON payload are separate lazy chunks. Three.js
currently remains in the main application chunk because the portal runtime is created
during trace setup.

## Styling

`styles.css` owns the current visual cascade and responsive rules. `dust-layer.css`
contains the fixed noise overlay. The main breakpoints used by layout code are:

- 500 px for narrow portal/media behavior;
- 820 px for narrow trace layout;
- 1220 px for the wider Aperios composition transition.

Several selectors rely on cascade order, so styles should be moved or consolidated
only with desktop, tablet, and mobile visual comparison.

## Performance Model

Current safeguards include:

- a 40 fps trace render cap;
- rendering paused while the tab is hidden;
- offscreen gating for creativity and bottom ghost work;
- cached glyph canvases, portal layout, and shader inputs;
- WebP portal assets in production;
- one shared Lenis/GSAP frame clock;
- reduced Firefox work for DOM media and the bottom video.

The primary remaining constraint is that several canvas and WebGL surfaces follow the
full document height. Migrating them to viewport-sized windows could reduce GPU memory
and clearing work, but it must preserve document-space coordinates, media placement,
ghost timing, and scroll handoffs.

## Verification

Run the repository checks after architectural changes:

```bash
npm test
npm run build
git diff --check
```

Browser verification should cover startup without unstyled controls, sound before and
after scrolling, sequencer paging and settings, portal placement, responsive typography,
the bottom video transition, footer wrapping, and console cleanup during hot reload.
