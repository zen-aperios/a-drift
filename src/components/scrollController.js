import { clamp } from "./traceMath.js";

// Owns document-scroll mapping and the hero/reveal handoff easing.
export function createScrollController({ state, gsap, scrollCue, traceViewport }) {
  function updateTargets(immediate = false) {
    const pageScroll = window.scrollY || window.pageYOffset || 0;
    const traceTop = traceViewport?.offsetTop || 0;
    const localPageScroll = Math.max(0, pageScroll - traceTop);
    const maxTraceScroll = Math.max(1, (state.renderHeight || state.totalHeight || state.height) - state.height);
    const targetScroll = clamp(localPageScroll, 0, maxTraceScroll);
    const progress = clamp(targetScroll / maxTraceScroll, 0, 1);
    const isReturningToHero = localPageScroll <= 2 && state.heroDismiss > 0.001;
    state.rawScrollY = targetScroll;
    if (localPageScroll > 2) state.hasScrolled = true;

    if (immediate) {
      gsap.set(state, {
        scrollY: targetScroll,
        rawScrollY: targetScroll,
        drawProgress: progress,
        heroDismiss: localPageScroll > 2 ? 1 : 0,
      });
      gsap.set(scrollCue, { exit: localPageScroll > 2 ? 1 : 0 });
      return;
    }

    gsap.killTweensOf(state, "scrollY,drawProgress");
    gsap.set(state, { scrollY: targetScroll, drawProgress: progress });
    gsap.to(state, {
      heroDismiss: localPageScroll > 2 ? 1 : 0,
      duration: isReturningToHero ? 2.1 : 2.15,
      ease: isReturningToHero ? "power2.out" : "power4.out",
      overwrite: "auto",
      onComplete: () => {
        const currentLocalScroll = Math.max(0, (window.scrollY || window.pageYOffset || 0) - (traceViewport?.offsetTop || 0));
        if (currentLocalScroll <= 2 && state.heroDismiss <= 0.001) state.hasScrolled = false;
      },
    });
    gsap.to(scrollCue, {
      exit: localPageScroll > 2 ? 1 : 0,
      duration: localPageScroll > 2 ? 0.6 : 0.45,
      ease: localPageScroll > 2 ? "power4.out" : "power2.out",
      overwrite: true,
    });
  }

  return { updateTargets, onScroll: () => updateTargets() };
}
