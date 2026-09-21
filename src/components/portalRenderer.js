import { clamp } from "./traceMath.js";

// Owns portal image placement and media-layer output. Reveal targets and
// layout values are supplied by TraceDream to preserve the current behavior.
export function createPortalRenderer({
  state,
  heroDismissEase,
  useDomPortalImages,
  mediaDomBackLayer,
  mediaDomFrontLayer,
  mediaBackScene,
  mediaFrontScene,
  mediaCamera,
  mediaBackRenderer,
  mediaFrontRenderer,
  getDocumentY,
  getThreeDocumentY,
  getPortalVisibleFrame,
  setPortalReveal,
  syncPortalMaterial,
  drawBottomVideo,
}) {
  function draw() {
    let hasVisibleBackPortal = false;
    let hasVisibleFrontPortal = false;
    state.portalImages.forEach((item) => {
      if (item.mesh) item.mesh.visible = false;
      if (item.domNode) item.domNode.style.display = "none";
      item.renderFrame = null;
      item.visibleRenderFrame = null;
    });

    state.portalImages.forEach((item) => {
      const rawScreenY = item.y - state.rawScrollY + state.height * 0.18;
      // Only the Firefox DOM fallback is gated here. Keep shader image work
      // unchanged in Chrome/Brave, where it is part of the visual effect.
      const isFarOffscreen = rawScreenY < -state.height * 1.5 - item.height || rawScreenY > state.height * 2.5 + item.height;
      if (useDomPortalImages && isFarOffscreen) {
        setPortalReveal(item, 0);
        return;
      }
      const revealStartY = state.height * (state.portalRevealStart / 100);
      const revealDistance = state.height * (state.portalRevealDistance / 100);
      const enterProgress = clamp((revealStartY - rawScreenY) / Math.max(1, revealDistance), 0, 1);
      const revealTarget = rawScreenY < -item.height * 1.6 ? 0 : enterProgress;
      setPortalReveal(item, revealTarget);
      const progress = clamp(item.reveal.progress, 0, 1);
      if (progress <= 0.001) return;

      const eased = heroDismissEase(progress);
      const width = item.width;
      const height = item.height;
      const slideY = (1 - eased) * 64;
      const slowScrollDrift = Math.sin(state.rawScrollY * 0.002 + item.index * 0.67) * state.portalDrift;
      const parallaxDrift = (rawScreenY - state.height * 0.5) * state.portalParallax;
      const screenY = rawScreenY + slowScrollDrift + parallaxDrift;
      const documentY = getDocumentY(screenY + slideY);
      item.renderFrame = { x: item.x, y: documentY, width, height };
      item.visibleRenderFrame = getPortalVisibleFrame(item.renderFrame, item);

      if (useDomPortalImages && item.domNode) {
        const targetLayer = item.layer === "front" ? mediaDomFrontLayer : mediaDomBackLayer;
        if (item.domNode.parentNode !== targetLayer) targetLayer.appendChild(item.domNode);
        if (item.layer === "front") hasVisibleFrontPortal = true;
        else hasVisibleBackPortal = true;
        item.domNode.style.display = "block";
        item.domNode.style.width = `${width}px`;
        item.domNode.style.height = `${height}px`;
        item.domNode.style.opacity = `${eased}`;
        item.domNode.style.clipPath = `inset(${(1 - eased) * 100}% 0 0 0)`;
        item.domNode.style.transform = `translate3d(${item.x - width * 0.5}px, ${documentY - height * 0.5}px, 0)`;
        return;
      }

      if (!item.mesh || !item.material) return;
      const targetScene = item.layer === "front" ? mediaFrontScene : mediaBackScene;
      if (item.mesh.parent !== targetScene) {
        item.mesh.parent?.remove(item.mesh);
        targetScene.add(item.mesh);
      }
      if (item.layer === "front") hasVisibleFrontPortal = true;
      else hasVisibleBackPortal = true;
      item.mesh.visible = true;
      item.mesh.position.set(item.x, getThreeDocumentY(documentY), 0);
      item.mesh.scale.set(width, height, 1);
      syncPortalMaterial(item, width, height, eased, item.index * 0.35);
    });

    const hasBottomVideo = drawBottomVideo();
    if (hasVisibleBackPortal || hasBottomVideo) mediaBackRenderer.render(mediaBackScene, mediaCamera);
    if (hasVisibleFrontPortal) mediaFrontRenderer.render(mediaFrontScene, mediaCamera);
  }

  return { draw };
}
