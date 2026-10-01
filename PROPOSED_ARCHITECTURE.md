# A Drift Proposed Architecture

Date: 2026-10-01
Status: In progress

## Vision

A Drift should remain one continuous audiovisual composition, but its implementation should be divided into systems with clear ownership:

- The application shell owns startup and global services.
- The trace composition owns visual orchestration and scrolling.
- The portal system owns media placement and WebGL rendering.
- The typography system owns glyph rendering and interactive text.
- The sequencer owns its interface and view state.
- The audio engine owns synthesis, samples, transport, patterns, and effects.
- The footer owns its presentation and lazy media.

The user experience stays continuous. The code does not need to be one continuous component.

## Design Principles

### One owner for each lifecycle

Every timer, animation frame, observer, event listener, audio node, WebGL resource, and GSAP timeline must have one owner and one cleanup path.

### Stable public contracts

React components should call small public APIs. They should not reach into renderer internals, audio nodes, or mutable trace state.

### Render only what is needed

Heavy systems should initialize according to when they are needed:

- Loader and hero: immediate.
- Main trace: immediate after startup cover is secure.
- Portal media: before its first reveal.
- Alphabet: close to viewport.
- Footer animation: close to viewport.
- Sequencer settings: only when opened.

### Visual structure and runtime logic stay separate

React owns markup and controls. Controllers own imperative canvas, WebGL, audio, and animation work.

### Behavior is migrated before it is redesigned

File splitting should preserve DOM order, class names, timing, coordinates, patterns, and audio settings. Improvements come after the ownership boundaries are stable.

## Top-Level Shape

```text
src/
  app/
    App.jsx
    StartupGate.jsx
    AppProviders.jsx
    appEvents.js

  features/
    loader/
    hero/
    trace/
    portal/
    typography/
    sequencer/
    footer/

  audio/
    engine/
    patterns/
    samples/

  shared/
    animation/
    browser/
    math/
    media/
    styles/

  assets/
    animation/
    audio/
    images/
    textures/

  main.jsx
```

## Application Shell

### Responsibilities

- Mount React.
- Keep the critical HTML cover visible until React confirms a painted loader.
- Create global scrolling and animation services.
- Expose reduced-motion and visibility state.
- Contain top-level error handling.

### Proposed components

```text
app/
  App.jsx
  StartupGate.jsx
  AppProviders.jsx
  AppErrorBoundary.jsx
  appEvents.js
```

### Startup contract

`StartupGate` should expose these states:

```js
const startup = {
  cssReady: false,
  reactLoaderMounted: false,
  reactLoaderPainted: false,
  appMounted: false,
};
```

The HTML boot cover may be removed only when:

```text
cssReady && reactLoaderPainted
```

The React loader can finish its own animation independently. This creates a reliable handoff instead of assuming that two animation frames are enough.

### Global service ownership

`AppProviders` should own:

- One GSAP ticker integration.
- One Lenis instance.
- Document visibility state.
- Reduced-motion preference.
- Optional performance mode derived from device capability.

Feature controllers receive these services rather than creating competing global loops.

## Loader Feature

```text
features/loader/
  PageLoader.jsx
  LoaderLines.jsx
  loaderConfig.js
  loader.css
```

### Responsibilities

- Render the 28-line field.
- Apply the opacity progression.
- Animate the three shadow masses.
- Signal that the React loader has painted.
- Dismiss itself after the established duration.

### Public interface

```jsx
<PageLoader
  duration={3}
  onPaint={startup.markReactLoaderPainted}
  onComplete={startup.markLoaderComplete}
/>
```

The line alpha list belongs in `loaderConfig.js`, giving the HTML boot loader and React loader one generated source during the build process.

## Hero Feature

```text
features/hero/
  Hero.jsx
  HeroTopBar.jsx
  SoundControl.jsx
  HeroMark.jsx
  hero.css
```

### Responsibilities

- Render the main A Drift composition container.
- Own the top bar layout.
- Display the primary Lottie mark.
- Expose sound state without owning the audio graph.

`SoundControl` should receive a small audio facade:

```js
{
  enabled,
  enable,
  disable,
  toggle,
}
```

It should not directly stop and restart scroll-groove internals.

## Trace Composition

```text
features/trace/
  TraceComposition.jsx
  useTraceComposition.js
  createTraceRuntime.js
  traceState.js
  traceConfig.js
  trace.css

  renderers/
    mainTraceRenderer.js
    diagonalGhostRenderer.js
    bottomGhostRenderer.js
    bottomVideoRenderer.js
    glyphRenderer.js

  controllers/
    layoutController.js
    scrollController.js
    surfaceController.js
    lifecycleController.js
    scheduler.js
```

### React responsibility

`TraceComposition.jsx` renders stable surfaces and passes refs to one hook.

It should contain little more than:

- Canvas markup.
- DOM media layers.
- Optional editing overlay.
- Section boundaries.
- Feature components in document order.

### Runtime responsibility

`createTraceRuntime()` composes the controllers and returns one interface:

```js
{
  start(),
  stop(),
  resize(),
  destroy(),
  setPlacementGridVisible(visible),
  getSnapshot(),
}
```

No controller should attach global listeners on its own unless the runtime delegates that ownership to it explicitly.

### State model

Keep high-frequency mutable render state outside React. Use React state only for visible interface state.

```text
React state:
  sound enabled
  sequencer open
  settings open
  placement grid visible

Runtime state:
  scroll position
  active segment
  canvas dimensions
  portal positions
  shader uniforms
  pointer coordinates
```

This prevents React renders from becoming part of the frame loop.

## Portal Feature

```text
features/portal/
  portalConfig.js
  portalAssets.js
  portalLayout.js
  portalRenderer.js
  portalInteraction.js
  portalRuntime.js
  portal.css
```

### Responsibilities

- Resolve the selected WebP assets.
- Decode images near first use.
- Create and dispose Three.js resources.
- Calculate responsive placement.
- Handle editing interactions.
- Render front and back layers.

### Loading boundary

Three.js should be imported from the portal feature, not from the main composition module. This allows the portal runtime to become its own chunk.

```js
const { createPortalRuntime } = await import("../portal/portalRuntime.js");
```

Preload it shortly before the first portal section rather than waiting for the user to arrive at the exact boundary.

### Media contract

```js
const portalItem = {
  id,
  src,
  width,
  height,
  aspect,
  x,
  y,
  layer,
  placement,
};
```

All render paths should consume the same item structure. Browser-specific rendering differences should be adapters, not separate layout systems.

## Typography Feature

```text
features/typography/
  AlphabetGenerator.jsx
  AlphabetGlyph.jsx
  FooterTypeComposer.jsx
  glyphMetrics.js
  glyphAnimation.js
  typography.css
```

### Responsibilities

- Render reusable glyph canvases.
- Cache glyph geometry and measured advances.
- Own hover animation.
- Own Ghost Direction and Warp Chaos controls.
- Render user-entered footer text.

### Shared glyph interface

```jsx
<AlphabetGlyph
  letter="A"
  ghostDirection={290}
  warpChaos={0.62}
  size="display"
/>
```

Named sizes should replace scattered container-specific canvas dimensions once the current computed sizes are captured.

## Sequencer Feature

```text
features/sequencer/
  MiniSequencer.jsx
  SequencerHeader.jsx
  SequencerTrackTabs.jsx
  SequencerSettings.jsx
  SequencerPager.jsx
  SequencerStepGrid.jsx
  TrackDropdown.jsx
  useSequencerView.js
  sequencer.css
```

### Responsibilities

- Display engine state.
- Own selected track, editing step, page, and settings visibility.
- Translate user actions into audio-engine commands.
- Subscribe to playback position.

### Render policy

The closed panel can remain mounted for its slide animation, but heavy settings controls should mount only when Settings is open.

```text
Panel closed:
  shell only, non-interactive

Panel open, settings closed:
  header and step grid

Settings open:
  track controls, effects, dropdowns
```

### Engine interface

```js
const sequencer = {
  subscribe(listener),
  getPattern(),
  getTracks(),
  getTrackSettings(trackId),
  setTrackSetting(trackId, key, value),
  toggleStep(step, trackId),
  setStepPitch(step, trackId, delta),
  setPageOverride(trackId, page),
  replaceTrack(previousId, nextId),
};
```

The UI should not need to know how Web Audio nodes are connected.

## Audio Architecture

```text
audio/
  engine/
    createAudioEngine.js
    audioContext.js
    masterBus.js
    transport.js
    scheduler.js
    sampleRegistry.js
    sampleLoader.js
    previewPlayer.js
    trackState.js
    effectsGraph.js
    synthVoice.js
    stampVoice.js

  patterns/
    defaultPattern.js
    autoPlayPattern.js
    patternTransforms.js
    patternSchema.js

  samples/
    manifest727.js
    manifest808.js
```

### Public facade

React receives one engine object. Internal modules remain private.

```js
const audio = {
  unlock(),
  enable(),
  disable(),
  startScrollGroove(),
  stopScrollGroove(),
  previewInstrument(id),
  sequencer,
  destroy(),
};
```

### Pattern model

Default and autoplay patterns should remain separate data sets with an explicit transition:

```js
audio.sequencer.usePattern("default");
audio.sequencer.usePattern("autoplay");
```

Startup-only and autoplay-only layers should be represented in the schema, not inferred across unrelated functions.

### Track settings

All per-track settings should live together:

```js
const trackSettings = {
  level: 1,
  reverb: 0,
  decay: 0,
  cutoff: 1,
  resonance: 0,
  attack: 0,
  release: 0,
  pan: 0,
  velocity: 1,
  probability: 1,
  humanize: 0,
};
```

Defaults belong to one schema. The UI, export format, and engine should all read that schema.

## Footer Feature

```text
features/footer/
  SiteFooter.jsx
  FooterLineField.jsx
  FooterCollaboration.jsx
  FooterDirectories.jsx
  FooterClock.jsx
  FooterLottie.jsx
  footer.css
```

### Responsibilities

- Render the line field and moving shadow masses.
- Render collaboration marks.
- Render the 5-DAYS composition and tagline.
- Render external directories.
- Lazy-load the footer Lottie data and player.
- Render the bottom sequencer/time row.

### Lazy animation contract

The footer Lottie component should import both its player and JSON only when near view.

```js
const [{ default: lottie }, { default: animationData }] = await Promise.all([
  import("lottie-web/build/player/lottie_light"),
  import("../../assets/animation/runman-footer.json"),
]);
```

### Clock contract

The clock should use the browser's current time and format it for Lisbon with `Intl.DateTimeFormat`. It should not depend on an external API.

## Styling Architecture

```text
shared/styles/
  critical.css
  tokens.css
  base.css
  utilities.css

features/*/
  feature-name.css
```

### Cascade order

```css
@layer reset, tokens, base, components, responsive, overrides;
```

Use layers to make order explicit while preserving the current final computed styles.

### Critical CSS

`critical.css` should contain only:

- black document background
- box sizing
- boot loader
- range appearance reset
- root stacking rules
- hidden initial sequencer state

It should be small enough to inline in `index.html`.

### Component CSS

Each feature owns its selectors. Avoid one later global block that silently reverses an earlier component block.

### Responsive policy

Keep breakpoints named in JavaScript and documented in CSS:

```text
mobile: 500px
tablet: 820px
wide tablet: 1220px
desktop: above 1220px
```

Shared breakpoint values should be CSS custom properties where possible and exported constants where JavaScript calculations require them.

## Asset Architecture

```text
assets/
  animation/
    runman-hero.json
    runman-footer.json
  audio/
    727/
    808/
    korg/
    percussion/
  images/
    portal/
  textures/
    dust.webp
  video/
    logofolio-web.mp4
```

### Rules

- Ship one production format per portal image.
- Keep editable originals outside the runtime asset tree.
- Use manifests for selectable audio samples.
- Lazy-load below-fold animation data.
- Keep generated textures external and cacheable.

## Event Contracts

Replace scattered string literals with exported names:

```js
export const APP_EVENTS = {
  LOADER_PAINTED: "a-drift:loader-painted",
  PLACEMENT_GRID_CHANGED: "a-drift:placement-grid-changed",
  SOUND_CHANGED: "a-drift:sound-changed",
};
```

Prefer direct function calls or subscriptions inside one feature. Use document events only when two independently mounted systems genuinely need to communicate.

## Error Boundaries

Use boundaries around independently recoverable systems:

- Portal/WebGL boundary: preserve the rest of the page if WebGL fails.
- Footer animation boundary: render static logos if Lottie fails.
- Audio initialization boundary: preserve silent browsing if audio fails.

The loader must always have a timeout-based escape route if application initialization throws.

## Testing Shape

The dependency-free Node suite currently covers sequencer paging, pattern visibility,
track settings, transport timing, and transport cancellation in `test/sequencer.test.js`.
Browser coverage can grow into this structure:

```text
tests/
  startup/
    loader-handoff.spec.js
    no-native-slider-flash.spec.js
  sequencer/
    patterns.spec.js
    paging.spec.js
    track-settings.spec.js
    sound-toggle.spec.js
  visual/
    hero.spec.js
    portal.spec.js
    alphabet.spec.js
    footer.spec.js
```

### Required startup assertion

At every captured frame before the React loader completes, one of these must cover the viewport:

```text
#boot-loader
.page-loader
```

There must never be a frame where both are absent before application reveal.

## Remaining Migration Sequence

### Stage 1: component extraction

- Move the imperative trace setup into a dedicated runtime hook after documenting its inputs and cleanup.
- Keep DOM and CSS selectors unchanged.

### Stage 2: CSS ownership

- Create critical CSS.
- Move feature blocks without altering declarations.
- Capture computed styles.
- Consolidate duplicate rules only after ownership is clear.

### Stage 3: deferred systems

- Split portal/Three.js runtime.
- Defer below-fold media decoding.

### Stage 4: rendering optimization

- Move full-document canvases to viewport windows one at a time.
- Preserve current world coordinates through translation adapters.

## Completion Criteria

The remaining architecture migration is complete when:

- `TraceDream.jsx` primarily composes features.
- The audio engine exposes one documented facade.
- Every global listener and frame loop has a clear owner.
- Three.js can be separated from the earliest startup path.
- Visual captures match desktop, tablet, and mobile baselines.
- Existing sequencer patterns, autoplay transitions, and track settings remain unchanged.
