import { clamp } from "./traceMath.js";

// Owns bottom-video reveal/playback output. Animation state and scroll geometry
// stay in TraceDream so the video keeps the existing timing contract.
export function createBottomVideoRenderer({
  ctx,
  state,
  bottomAnimation,
  heroDismissEase,
  useDomPortalImages,
  mediaDomBackLayer,
  getBottomVideoBaseScreenY,
  getBottomVideoBaseRawScreenY,
  getDocumentY,
  getThreeDocumentY,
  startAnimation,
  setPortalReveal,
  syncPortalMaterial,
}) {
  function getFrame() {
    const item = state.bottomVideo;
    const videoReveal = item?.reveal?.progress ?? 0;
    const videoEased = heroDismissEase(clamp(videoReveal, 0, 1));
    const width = state.width * 0.95;
    const height = width / Math.max(0.1, item?.aspect || 16 / 9);
    const baseScreenY = getBottomVideoBaseRawScreenY();
    return {
      x: state.width * 0.5,
      y: baseScreenY,
      screenY: baseScreenY,
      documentY: getDocumentY(baseScreenY),
      width,
      height,
      reveal: videoEased,
    };
  }

  function draw() {
    const item = state.bottomVideo;
    if (!item) return false;

    const rawScreenY = getBottomVideoBaseScreenY();
    // Firefox uses the DOM fallback; avoid touching its media element when it
    // is far away while leaving the shader path unchanged in other browsers.
    const isFarOffscreen = rawScreenY < -state.height * 1.5 || rawScreenY > state.height * 2.5;
    if (useDomPortalImages && isFarOffscreen) {
      setPortalReveal(item, 0);
      if (item.domStyle.display !== "none") {
        item.domStyle.display = "none";
        item.video.style.display = "none";
      }
      if (item.mesh) item.mesh.visible = false;
      return false;
    }
    const revealStartY = state.height * (state.portalRevealStart / 100);
    const revealDistance = state.height * (state.portalRevealDistance / 100);
    const revealTarget = clamp((revealStartY - rawScreenY) / Math.max(1, revealDistance), 0, 1);
    if (revealTarget > 0.02) startAnimation();
    setPortalReveal(item, revealTarget);
    const progress = clamp(item.reveal.progress, 0, 1);
    const eased = heroDismissEase(progress);
    const frame = getFrame();

    if (useDomPortalImages) {
      const style = item.domStyle;
      const setStyle = (key, value) => {
        if (style[key] === value) return;
        style[key] = value;
        item.video.style[key] = value;
      };
      setStyle("display", progress > 0.001 ? "block" : "none");
      if (progress <= 0.001) return false;
      if (item.video.paused && performance.now() - item.lastPlayAttempt > 1000) {
        item.lastPlayAttempt = performance.now();
        item.video.play().catch(() => {});
      }
      setStyle("width", `${Math.round(frame.width)}px`);
      setStyle("height", `${Math.round(frame.height)}px`);
      setStyle("opacity", eased >= 0.995 ? "1" : eased.toFixed(3));
      setStyle("clipPath", eased >= 0.995 ? "none" : `inset(${((1 - eased) * 100).toFixed(2)}% 0 0 0)`);
      setStyle("transform", `translate3d(${(frame.x - frame.width * 0.5).toFixed(2)}px, ${(frame.documentY - frame.height * 0.5).toFixed(2)}px, 0)`);
      return true;
    }

    if (!item.mesh || !item.material) return false;
    item.mesh.visible = progress > 0.001;
    if (!item.mesh.visible) return false;
    item.mesh.position.set(frame.x, getThreeDocumentY(frame.documentY), 0);
    item.mesh.scale.set(frame.width, frame.height, 1);
    syncPortalMaterial(item, frame.width, frame.height, eased, 1.7);
    const videoWidth = item.video.videoWidth || 16;
    const videoHeight = item.video.videoHeight || 9;
    const resolutionKey = `${videoWidth}|${videoHeight}`;
    if (item.videoResolutionKey !== resolutionKey) {
      item.material.uniforms.uImageResolution.value.set(videoWidth, videoHeight);
      item.videoResolutionKey = resolutionKey;
    }
    return true;
  }

  function drawShade() {
    const progress = bottomAnimation.progress;
    if (progress <= 0.001) return;
    const frame = getFrame();
    const trailProgress = clamp(progress / 0.82, 0, 1);
    const opacity = 0.28 * frame.reveal * heroDismissEase(clamp(trailProgress, 0, 1));
    if (opacity <= 0.001) return;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(frame.x - frame.width * 0.5, frame.documentY - frame.height * 0.5, frame.width, frame.height);
    ctx.restore();
  }

  return { draw, drawShade, getFrame };
}
