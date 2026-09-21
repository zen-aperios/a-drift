import gsap from "gsap";

// Owns bottom ghost/video section coordinates and its reveal timing state.
export function createBottomSectionController({ state, animation }) {
  function getVideoBaseScreenY() {
    return state.bottomSectionStart + state.height * 0.54 - state.scrollY + state.height * 0.18;
  }

  function getVideoBaseRawScreenY() {
    return state.bottomSectionStart + state.height * 0.54 - state.rawScrollY + state.height * 0.18;
  }

  function startAnimation() {
    if (animation.started) return;
    animation.started = true;
    gsap.killTweensOf(animation);
    gsap.fromTo(
      animation,
      { progress: 0 },
      {
        progress: 1,
        duration: 4.4,
        ease: "none",
        overwrite: "auto",
      }
    );
  }

  function update() {
    const videoScreenY = getVideoBaseRawScreenY();
    const shouldStart = videoScreenY < state.height * 0.9 && videoScreenY > -state.height * 0.35;
    const shouldReset = videoScreenY > state.height * 1.08;

    if (shouldReset && animation.started) {
      animation.started = false;
      gsap.killTweensOf(animation);
      animation.progress = 0;
      return;
    }

    if (shouldStart && !animation.started) startAnimation();
  }

  return {
    getVideoBaseScreenY,
    getVideoBaseRawScreenY,
    startAnimation,
    update,
  };
}
