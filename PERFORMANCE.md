# Performance Notes

## Main Bottleneck

The trace currently keeps the document in normal flow while sizing several canvas and WebGL surfaces to the full document height. At retina device-pixel ratios, this creates a large amount of GPU memory and clearing work as the page grows.

The highest-impact long-term optimization is to keep the document flow unchanged but render only viewport-sized canvas windows, translating the visible section into each canvas. This is behavior-sensitive and should be measured and migrated in small steps so the current ghost timing, media placement, and scroll handoff remain unchanged.

## Current Safeguards

- Main rendering is capped at 40fps.
- Rendering pauses while the tab is hidden.
- The creativity renderer pauses when it is far outside the viewport.
- Bottom ghost rendering is gated when its section is far outside the viewport.
- Glyph canvases are cached after creation.
- Portal images use WebP assets.
- Lenis and trace rendering share the GSAP ticker.
- Portal shader uniforms and image layout inputs are cached when unchanged.
- Firefox DOM media style writes are cached, and Firefox 2D contexts use desynchronized mode.
- Firefox pauses the native video decoder while the video is far outside the viewport.
- Firefox skips the unused WebGL media clear/render pass while using DOM media.
- Firefox uses lighter two-pixel slices for the `NO-ONE / SHOTS` ghost renderer.

## Recommended Optimization Order

1. ~~Remove unused source assets and dead CSS.~~
2. ~~Cache portal layout and shader values that do not change every frame.~~
3. ~~Share the Lenis and GSAP frame clocks.~~
4. Profile Chrome and Firefox with the current build.
5. Migrate full-document render surfaces to viewport-sized windows.

The viewport-sized canvas migration is the largest remaining performance opportunity, but it should only be attempted after the current implementation is captured as a restore point.
