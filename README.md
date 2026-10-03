# A Drift

A Drift is an experimental audiovisual web composition built around traced letterforms,
scroll-driven motion, portal-like media reveals, generated typography, and a live
multi-track sequencer.

This repository is the canonical reference build prepared for review and Creative Hub
integration. It is a self-contained static Vite application: there is no backend,
database, authentication layer, or required environment configuration.

## Experience

The page is designed as one continuous composition rather than a collection of routes.
It moves through:

- a line-field loading screen;
- the animated `A DRIFT` hero and opt-in sound control;
- the large traced `APERIOS` sequence;
- layered image portals rendered with Three.js;
- the `NO-ONE / SHOTS` video and ghost treatment;
- an interactive alphabet and custom text generator;
- a footer composition with collaboration marks, directories, time, and sequencer access.

Audio begins muted. Selecting `UNMUTE` unlocks the browser audio context and starts the
scroll-linked composition. The footer `SEQUENCER` control opens the track editor, where
patterns, pages, pitch variation, levels, and per-track effects are reflected in the
live sequence.

## Technology

| Area | Implementation |
| --- | --- |
| Application | React 18 and Vite 6 |
| Motion | GSAP and Lenis |
| Portal rendering | Three.js and custom shaders |
| Drawing | Canvas 2D and SVG |
| Audio | Web Audio API with WAV samples and synthesized voices |
| Animation assets | Lottie Web |
| Tests | Node's built-in test runner |

## Run Locally

Use a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

Sound must be unlocked by a user gesture because browsers do not permit automatic Web
Audio playback. Use the `UNMUTE` control after the page loads.

## Commands

```bash
npm run dev      # Start the Vite development server
npm test         # Run sequencer and transport tests
npm run build    # Create the production build in dist/
npm run preview  # Serve the production build locally
```

The expected pre-handoff verification is:

```bash
npm test
npm run build
git diff --check
```

## Repository Map

```text
.
|-- ARCHITECTURE.md          Current runtime and lifecycle architecture
|-- SOUND_CONTROLS.md        Sequencer controls, ranges, and audio behavior
|-- index.html               Critical boot cover and application mount point
|-- src/
|   |-- assets/
|   |   |-- animation/       Hero and footer Lottie JSON
|   |   |-- audio/           727, 808, Korg, percussion, and extra samples
|   |   |-- brand/           Brand marks
|   |   |-- images/portal/   Portal source images and production WebP files
|   |   |-- textures/        Fixed screen-noise texture
|   |   `-- video/           Bottom composition video
|   |-- audio/
|   |   |-- engine/          Effects, samples, transport, voices, and track state
|   |   `-- patterns/        Startup, autoplay, visibility, and bass patterns
|   |-- components/
|   |   |-- footer/          Footer line field, clock, Lottie, and text composer
|   |   |-- hero/            Top bar and sound control
|   |   |-- loader/          Three-second React loader
|   |   |-- sequencer/       Sequencer interface and track selection
|   |   |-- TraceDream.jsx   Composition markup and runtime assembly
|   |   `-- *Controller.js   Imperative trace, portal, layout, and lifecycle units
|   |-- App.jsx              Shared Lenis/GSAP clock and top-level layers
|   |-- main.jsx             Boot-cover handoff and React mount
|   `-- styles.css           Primary visual and responsive cascade
`-- test/
    `-- sequencer.test.js    Dependency-free sequencer behavior tests
```

## How It Fits Together

`src/main.jsx` waits until the stylesheet and React loader are ready before removing
the static boot cover in `index.html`. This prevents native sliders or unstyled controls
from flashing during startup.

`src/App.jsx` owns the shared Lenis/GSAP frame clock and renders the loader, fixed noise
layer, and `TraceDream` composition. `TraceDream.jsx` provides the stable DOM and canvas
surfaces, then composes dedicated controllers for layout, scrolling, lifecycle,
rendering, portal assets, editing, and the final video section.

React state is reserved for visible interface state. Per-frame values such as scroll
position, portal reveals, responsive geometry, and shader uniforms live in mutable
trace state outside React to avoid rerendering the component tree every frame.

The sequencer communicates with `rhodesChordEngine.js`, which acts as the public audio
facade. Its internal engine modules own transport timing, sample playback, synthesized
voices, effects routing, and track settings. Default and autoplay patterns remain
separate so the visible sequencer always represents the active musical state.

Read [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete runtime model and
[SOUND_CONTROLS.md](./SOUND_CONTROLS.md) for the audio control model.

## Important Configuration

These are the primary files to inspect before changing behavior:

- `src/components/traceConfig.js`: letters, responsive thresholds, bottom video, and
  initial portal placement.
- `src/components/traceState.js`: mutable visual runtime state and defaults.
- `src/audio/patterns/defaultPattern.js`: startup and autoplay rhythm definitions.
- `src/audio/patterns/bassPatterns.js`: bass pattern presets and pitch movement.
- `src/audio/engine/trackState.js`: default per-track levels and effects.
- `src/audio/engine/sampleRegistry.js`: selectable sample libraries and source URLs.
- `src/styles.css`: visual composition, controls, footer, and responsive behavior.

## Assets

All browser assets live under `src/assets` and are processed by Vite. Portal WebP files
and the 727/808 sample libraries are discovered with `import.meta.glob`; moving or
renaming those directories requires updating the glob paths.

The larger footer Lottie animation and player are dynamically imported when the footer
approaches the viewport. The video, audio, images, SVG, and texture are emitted with
production-safe URLs during `npm run build`.

PNG portal files are retained as source references. The runtime selects their WebP
counterparts, so the PNG files are not shipped unless explicitly imported.

## Browser Behavior

- Chrome and other Chromium browsers use the primary Three.js portal path.
- Firefox uses a DOM-media fallback while preserving the same placement data.
- The trace scheduler is capped at 40 fps and pauses when the document is hidden.
- Creativity and bottom-ghost work are gated when sufficiently far offscreen.
- Responsive layout changes at the key 500 px, 820 px, and 1220 px thresholds.

When reviewing a change, check desktop, tablet, and mobile widths. Also verify sound
both before and after scrolling, sequencer paging, footer wrapping, the bottom video,
and the browser console during reload and unmount.

## Deployment

The project can be imported directly into Vercel from its Git repository. Vercel
detects Vite automatically and uses:

```text
Build command: npm run build
Output directory: dist
```

No environment variables are required. The deployed page can remain a dedicated
reference URL and be linked from the Creative Hub. Any conventional static host can
also serve the generated `dist/` directory.

## Attribution and Crawling

Website crafted by Robert Aperios for Aperios Design, with supplementary development
assistance from OpenAI Codex. All visual and audio assets belong to Aperios Design.

`public/robots.txt` asks identified AI training, AI search, and agent-retrieval crawlers
not to access the deployed site while leaving conventional search indexing available.
Robots directives are advisory and cannot prevent a non-compliant client from fetching
public files. Repository visibility and host-level access controls must be used when
content needs to be genuinely private.

## Guidance for Maintainers and AI Assistants

Preserve the current behavior while working in this repository:

1. Read `ARCHITECTURE.md` and `SOUND_CONTROLS.md` before changing runtime or audio code.
2. Keep existing DOM order and class names during structural extraction.
3. Give every listener, animation frame, observer, GSAP timeline, audio node, texture,
   and renderer one clear cleanup path.
4. Do not move high-frequency animation state into React state.
5. Do not merge startup and autoplay patterns or alter track defaults incidentally.
6. Preserve the Firefox media path until both rendering branches have been verified.
7. Treat CSS cascade order as behavior; verify computed results before reorganizing it.
8. Run tests and a production build after every architectural or asset-path change.

There is intentionally no license declaration in this repository. Do not assume that
the source or included media may be redistributed outside its intended review context.
