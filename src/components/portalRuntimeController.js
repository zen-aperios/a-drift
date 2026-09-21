import { clamp } from "./traceMath.js";

export function createPortalRuntimeController({ state, gsap }) {
  function setPortalReveal(item, target) {
    target = clamp(target, 0, 1);
    if (Math.abs(item.reveal.target - target) < 0.01) return;
    if (item.reveal.target === target) return;
    item.reveal.target = target;
    gsap.killTweensOf(item.reveal);
    gsap.to(item.reveal, {
      progress: target,
      duration: state.portalRevealDuration,
      ease: "power4.out",
      overwrite: true,
    });
  }

  function syncPortalMaterial(item, width, height, progress, timeOffset = 0) {
    const cache = item.portalUniformCache || (item.portalUniformCache = {});
    if (cache.progress !== progress) {
      item.material.uniforms.uProgress.value = progress;
      cache.progress = progress;
    }
    if (cache.intensity !== state.portalShaderIntensity) {
      item.material.uniforms.uIntensity.value = state.portalShaderIntensity;
      cache.intensity = state.portalShaderIntensity;
    }
    item.material.uniforms.uTime.value = state.heroWarpPhase + timeOffset;
    const staticUniforms = [
      ["uNoiseScale", "portalShaderNoiseScale"],
      ["uNoiseSpeed", "portalShaderNoiseSpeed"],
      ["uSoftness", "portalShaderSoftness"],
      ["uNoiseAmount", "portalShaderNoiseAmount"],
      ["uFlowX", "portalShaderFlowX"],
      ["uFlowY", "portalShaderFlowY"],
      ["uFlowNoiseY", "portalShaderFlowNoiseY"],
      ["uZoom", "portalShaderZoom"],
    ];
    staticUniforms.forEach(([uniformName, stateKey]) => {
      const value = state[stateKey];
      if (cache[stateKey] === value) return;
      item.material.uniforms[uniformName].value = value;
      cache[stateKey] = value;
    });
    const resolutionKey = `${width}|${height}`;
    if (cache.resolutionKey !== resolutionKey) {
      item.material.uniforms.uCanvasResolution.value.set(width, height);
      cache.resolutionKey = resolutionKey;
    }
  }

  function getDocumentY(screenY) {
    return screenY + state.rawScrollY;
  }

  function getThreeDocumentY(documentY) {
    const surfaceHeight = state.mediaCanvasHeight || state.renderHeight;
    const surfaceTop = state.mediaCanvasTop || 0;
    return surfaceHeight - (documentY - surfaceTop);
  }

  function getPortalItemDocumentFrame(item) {
    return {
      x: item.x,
      y: item.y + state.height * 0.18,
      width: item.width,
      height: item.height,
    };
  }

  function getPortalVisibleFrame(frame, item) {
    const imageAspect = Math.max(0.1, item?.aspect || 1);
    const frameAspect = frame.width / Math.max(1, frame.height);
    let width = frame.width;
    let height = frame.height;
    if (frameAspect > imageAspect) width = height * imageAspect;
    else height = width / imageAspect;
    return {
      x: frame.x,
      y: frame.y,
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }

  function triggerAnchorReveal(index) {
    const reveal = state.anchorReveals[index];
    if (!reveal || reveal.active) return;
    reveal.active = true;
    gsap.killTweensOf(reveal);
    gsap.to(reveal, {
      opacity: 1,
      depth: 0,
      progress: 1,
      duration: 0.8,
      ease: "power4.out",
      overwrite: true,
    });
  }

  return {
    setPortalReveal,
    syncPortalMaterial,
    getDocumentY,
    getThreeDocumentY,
    getPortalItemDocumentFrame,
    getPortalVisibleFrame,
    triggerAnchorReveal,
  };
}
