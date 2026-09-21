import gsap from "gsap";

// Owns the shared frame clock so renderers only receive work when a frame is due.
export function createTraceScheduler({ onFrame, fps = 40 }) {
  const minFrameMs = 1000 / fps;
  let lastFrameTime = 0;
  let lastRenderTime = 0;

  function tick() {
    if (document.hidden) {
      lastFrameTime = 0;
      return;
    }

    const now = performance.now();
    if (lastRenderTime && now - lastRenderTime < minFrameMs) return;
    lastRenderTime = now;
    if (!lastFrameTime) lastFrameTime = now;

    const dt = now - lastFrameTime;
    lastFrameTime = now;
    onFrame(dt, now);
  }

  return {
    start() {
      gsap.ticker.add(tick);
    },
    stop() {
      gsap.ticker.remove(tick);
      lastFrameTime = 0;
      lastRenderTime = 0;
    },
  };
}
