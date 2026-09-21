import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import {
  THREE,
  createMediaRenderer,
  createNoiseTexture,
} from "./portalMedia.js";
import { clamp, seededRandom } from "./traceMath.js";
import { createBottomGhostRenderer } from "./bottomGhostRenderer.js";
import { createDiagonalGhostRenderer } from "./diagonalGhostRenderer.js";
import { createBottomVideoRenderer } from "./bottomVideoRenderer.js";
import { createPortalRenderer } from "./portalRenderer.js";
import { createMainTraceRenderer } from "./mainTraceRenderer.js";
import { createPortalInteractionController } from "./portalInteractionController.js";
import { createPlacementLayout } from "./placementLayout.js";
import { createPathEditorController } from "./pathEditorController.js";
import { createGlyphRenderer } from "./glyphRenderer.js";
import { AlphabetGenerator } from "./AlphabetGenerator.jsx";
import { createTraceScheduler } from "./traceScheduler.js";
import { createBottomSectionController } from "./bottomSectionController.js";
import { createPortalEditorController } from "./portalEditorController.js";
import { createTraceSurfaceController } from "./traceSurfaceController.js";
import { createHeroLayoutController } from "./heroLayoutController.js";
import { createPortalAssetController } from "./portalAssetController.js";
import { createScrollController } from "./scrollController.js";
import { createLayoutController } from "./layoutController.js";
import { createCreativityPathController } from "./creativityPathController.js";
import {
  LETTERS,
  PLACEMENT_GRID_COLUMNS,
  PLACEMENT_GRID_ROWS,
} from "./traceConfig.js";

const TRACE_DPR_CAP = 1.25;
export default function TraceDream() {
  const canvasRef = useRef(null);
  const bottomCanvasRef = useRef(null);
  const bottomGhostCanvasRef = useRef(null);
  const mediaBackCanvasRef = useRef(null);
  const mediaFrontCanvasRef = useRef(null);
  const mediaDomBackLayerRef = useRef(null);
  const mediaDomFrontLayerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bottomCanvas = bottomCanvasRef.current;
    const bottomGhostCanvas = bottomGhostCanvasRef.current;
    const mediaBackCanvas = mediaBackCanvasRef.current;
    const mediaFrontCanvas = mediaFrontCanvasRef.current;
    const mediaDomBackLayer = mediaDomBackLayerRef.current;
    const mediaDomFrontLayer = mediaDomFrontLayerRef.current;
    if (!canvas || !bottomCanvas || !bottomGhostCanvas || !mediaBackCanvas || !mediaFrontCanvas || !mediaDomBackLayer || !mediaDomFrontLayer) return undefined;

    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";
    window.scrollTo({ top: 0, behavior: "instant" });
    const useDomPortalImages = navigator.userAgent.toLowerCase().includes("firefox");

    const ctx = canvas.getContext("2d");
    const bottomCtx = bottomCanvas.getContext("2d");
    const bottomGhostCtx = bottomGhostCanvas.getContext("2d");
    const mediaBackRenderer = createMediaRenderer(mediaBackCanvas);
    const mediaFrontRenderer = createMediaRenderer(mediaFrontCanvas);
    const mediaBackScene = new THREE.Scene();
    const mediaFrontScene = new THREE.Scene();
    const mediaCamera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
    const noiseTexture = createNoiseTexture(seededRandom);
    const stage = canvas.closest(".trace-stage");
    const q = (selector) => stage.querySelector(selector);
    let cancelled = false;
    const state = {
      width: 0,
      height: 0,
      renderHeight: 0,
      dpr: 1,
      fontSize: 160,
      rowGapVh: 90,
      sampleDistance: 10,
      maxTrail: 1200,
      curvePull: 700,
      ghostOpacity: 1,
      ghostLineWidth: 1,
      ghostColor: "#8b8b8b",
      fillColor: "#ffffff",
      bgColor: "#000000",
      warpEnabled: true,
      warpAmount: 14,
      warpFrequency: 1.05,
      rotateEnabled: false,
      rotateSpeed: 0.35,
      anchors: [],
      ghosts: [],
      segments: [],
      heroChars: [],
      portalImages: [],
      bottomGhostGrid: [],
      bottomGhostSegments: [],
      bottomGhostPathLength: 0,
      creativityStamps: [],
      creativitySegments: [],
      creativitySectionStart: 0,
      creativitySectionHeight: 0,
      creativityBaseHeight: 0,
      creativitySceneMinY: 0,
      creativitySceneSpanY: 1,
      creativityGapVh: 10,
      creativityStampOverrides: [],
      creativityPath: {
        start: { x: 0.1, y: 0.088 },
        controlA: { x: 0.9, y: 0.02 },
        controlB: { x: 0.1, y: 0.37472544731858093 },
        end: { x: 0.9, y: 0.45258333333333334 },
      },
      bottomVideo: null,
      bottomGhostCanvasTop: 0,
      bottomGhostCanvasHeight: 0,
      bottomSectionStart: 0,
      bottomSectionHeight: 0,
      landedAnchors: [],
      anchorReveals: [],
      totalHeight: 0,
      drawProgress: 0,
      scrollY: 0,
      rawScrollY: 0,
      portalRevealStart: 93,
      portalRevealDistance: 55,
      portalRevealDuration: 1.3,
      portalShaderIntensity: 0.24,
      portalShaderNoiseScale: 0.75,
      portalShaderNoiseX: 0.07,
      portalShaderNoiseY: -0.11,
      portalShaderNoiseSpeed: 5,
      portalShaderSoftness: 0.02,
      portalShaderNoiseAmount: 0.28,
      portalShaderFlowX: 0,
      portalShaderFlowY: 0,
      portalShaderFlowNoiseY: 2,
      portalShaderZoom: 0,
      portalDrift: 90,
      portalParallax: 0.2,
      bottomLineStagger: 0.3,
      hidePlacementGrid: true,
      hasScrolled: false,
      heroDismiss: 0,
      heroWarpPhase: 0,
      heroWarpSpeed: 0.0012,
      editorWasVisible: false,
    };
    const bottomAnimation = {
      progress: 0,
      started: false,
    };
    const bottomSectionController = createBottomSectionController({
      state,
      animation: bottomAnimation,
    });
    const {
      getVideoBaseScreenY,
      getVideoBaseRawScreenY,
      startAnimation: startBottomAnimation,
    } = bottomSectionController;
    const scrollCue = {
      exit: 0,
    };
    const heroDismissEase = gsap.parseEase("power4.out");
    const glyphRenderer = createGlyphRenderer({
      ctx,
      state,
      heroDismissEase,
      scrollCue,
      getTopGhostPoint,
    });
    const bottomVideoRenderer = createBottomVideoRenderer({
      ctx,
      state,
      bottomAnimation,
      heroDismissEase,
      useDomPortalImages,
      mediaDomBackLayer,
      getBottomVideoBaseScreenY: getVideoBaseScreenY,
      getBottomVideoBaseRawScreenY: getVideoBaseRawScreenY,
      getDocumentY,
      getThreeDocumentY,
      startAnimation: startBottomAnimation,
      setPortalReveal,
      syncPortalMaterial,
    });
    const bottomGhostRenderer = createBottomGhostRenderer({
      ctx: bottomGhostCtx,
      state,
      heroDismissEase,
      getWarpPhase,
      getFrame: bottomVideoRenderer.getFrame,
      getProgress: () => bottomAnimation.progress,
      getDrawOffsetY: () => state.bottomGhostCanvasTop,
    });
    const portalRenderer = createPortalRenderer({
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
      drawBottomVideo: bottomVideoRenderer.draw,
    });
    const mainTraceRenderer = createMainTraceRenderer({
      state,
      gsap,
      heroDismissEase,
      getTopGhostOffsets,
      getHeroWarpOptions,
      drawStamp: glyphRenderer.drawStamp,
      drawAnimatedGhostStack: glyphRenderer.drawAnimatedGhostStack,
      drawScrollCue: glyphRenderer.drawScrollCue,
      triggerAnchorReveal,
      drawBetweenGhostsAndStamps: () => {
        portalRenderer.draw();
        drawPlacementGrid();
        bottomVideoRenderer.drawShade();
      },
    });
    const diagonalGhostRenderer = createDiagonalGhostRenderer({
      ctx,
      state,
      heroDismissEase,
      getWarpPhase,
    });

    const portalConfigExport = null;
    const pathEditor = q("#creativityPathEditor");
    const pathGuidesToggle = q("#creativityGuidesToggle");
    const pathExportBtn = q("#creativityPathExportBtn");
    const pathExportOutput = q("#creativityPathExport");
    const pathPresetButtons = Array.from(stage.querySelectorAll("[data-path-preset]"));
    const traceViewport = q(".trace-viewport");
    let letters = LETTERS.slice();
    const portalInteractionState = {
      activePortalDrag: null,
      hoveredPortalCorner: null,
      selectedPortalItem: null,
    };
    let portalEditorController;
    let portalAssetController;
    let surfaceController;
    let heroLayoutController;
    let scrollController;
    let layoutController;
    let creativityPathController;

    function syncRenderSurfaces() {
      surfaceController?.syncRenderSurfaces();
    }

    function syncTraceSpacerHeight() {
      surfaceController?.syncTraceSpacerHeight();
    }

    function updateScrollTargets(immediate = false) {
      scrollController?.updateTargets(immediate);
    }

    function onScroll() {
      scrollController?.onScroll();
    }

    function rebuildLayout() {
      layoutController?.rebuildLayout();
    }

    function sampleCurve(start, end, bendIndex) {
      return layoutController?.sampleCurve(start, end, bendIndex) || [];
    }

    function syncCreativitySceneMetrics(nextStart) {
      creativityPathController?.syncSceneMetrics(nextStart);
    }

    function rebuildCreativityPath() {
      creativityPathController?.rebuildPath();
    }

    function queueCreativityPathRebuild(updateEditor = false) {
      creativityPathController?.queuePathRebuild(updateEditor);
    }

    function getCreativityWorldY(y) {
      return creativityPathController?.getWorldY(y) || 0;
    }

    function getCreativityRawY(worldY) {
      return creativityPathController?.getRawY(worldY) || 0.02;
    }

    function getWarpPhase(x, y) {
      return heroLayoutController?.getWarpPhase(x, y) || 0;
    }

    function getRotation(x, y) {
      return heroLayoutController?.getRotation(x, y) || 0;
    }

    function createStamp(x, y, letter, solid = false) {
      return heroLayoutController?.createStamp(x, y, letter, solid);
    }

    function buildHeroChars() {
      return heroLayoutController?.buildHeroChars() || [];
    }

    function buildAnchors() {
      return heroLayoutController?.buildAnchors() || [];
    }

    function getTopGhostOffsets() {
      return heroLayoutController?.getTopGhostOffsets() || [];
    }

    function getTopGhostPoint(offsets, age) {
      return heroLayoutController?.getTopGhostPoint(offsets, age) || { x: 0, y: 0 };
    }

    surfaceController = createTraceSurfaceController({
      state,
      canvas,
      bottomCanvas,
      bottomGhostCanvas,
      ctx,
      bottomCtx,
      bottomGhostCtx,
      mediaBackRenderer,
      mediaFrontRenderer,
      mediaCamera,
      pathEditor,
      traceViewport,
      getCreativityWorldY,
    });
    scrollController = createScrollController({ state, gsap, scrollCue, traceViewport });
    heroLayoutController = createHeroLayoutController({
      state,
      ctx,
      glyphRenderer,
      getLetters: () => letters,
      syncCreativitySceneMetrics,
    });
    layoutController = createLayoutController({
      state,
      getLetters: () => letters,
      createStamp,
      buildAnchors,
      buildHeroChars,
      glyphRenderer,
      bottomGhostRenderer,
      diagonalGhostRenderer,
      rebuildCreativityPath,
      buildPortalLayout,
      updateScrollTargets,
    });

    function syncPortalConfigExport() {
      portalEditorController?.syncConfigExport();
    }

    function drawPlacementGrid() {
      portalEditorController?.drawPlacementGrid();
    }

    function drawPortalResizeHandles() {
      portalEditorController?.drawResizeHandles();
    }

    function buildPortalLayout() {
      portalAssetController?.buildPortalLayout();
    }
    const placementLayout = createPlacementLayout({
      state,
      columns: PLACEMENT_GRID_COLUMNS,
      rows: PLACEMENT_GRID_ROWS,
      getPortalItemDocumentFrame,
    });
    const {
      getPlacementGridCells,
      getNearestPlacementCellInGap,
      getPlacementBlock,
      getPortalFrameForBlock,
      framesOverlap,
      getPlacedPortalFrames,
      blockIsAvailable,
      getNearestAvailablePlacementBlock,
    } = placementLayout;
    portalAssetController = createPortalAssetController({
      state,
      cancelled: () => cancelled,
      useDomPortalImages,
      mediaBackRenderer,
      mediaBackScene,
      mediaDomBackLayer,
      mediaDomFrontLayer,
      noiseTexture,
      getPlacementGridCells,
      getPlacementBlock,
      getPortalFrameForBlock,
      framesOverlap,
      getNearestAvailablePlacementBlock,
      syncPortalConfigExport,
    });
    const portalInteraction = createPortalInteractionController({
      state,
      traceViewport,
      interaction: portalInteractionState,
      placementColumns: PLACEMENT_GRID_COLUMNS,
      placementRows: PLACEMENT_GRID_ROWS,
      getPortalItemDocumentFrame,
      getPortalVisibleFrame,
      getNearestAvailablePlacementBlock,
      getNearestPlacementCellInGap,
      getPlacementGridCells,
      getPlacementBlock,
      getPortalFrameForBlock,
      blockIsAvailable,
      getPlacedPortalFrames,
      syncPortalConfigExport,
    });
    const pathEditorController = createPathEditorController({
      state,
      pathEditor,
      pathGuidesToggle,
      pathExportOutput,
      getCreativityWorldY,
      getCreativityRawY,
      rebuildLayout,
      queueCreativityPathRebuild,
    });
    creativityPathController = createCreativityPathController({
      state,
      diagonalGhostRenderer,
      pathEditorController,
      syncTraceSpacerHeight,
      isCancelled: () => cancelled,
    });
    const {
      getPortalItemInteractiveFrame,
      getPortalFrameCorners,
      getPortalLayerToggleRect,
    } = portalInteraction;
    portalEditorController = createPortalEditorController({
      state,
      ctx,
      bottomCtx,
      interaction: portalInteractionState,
      getPortalItemInteractiveFrame,
      getPortalFrameCorners,
      getPortalLayerToggleRect,
      portalConfigExport,
    });

    function resize() {
      state.dpr = Math.min(window.devicePixelRatio || 1, TRACE_DPR_CAP);
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      state.renderHeight = Math.max(state.renderHeight, state.height * 2);
      syncRenderSurfaces();
      rebuildLayout();
    }

    function getHeroWarpOptions() {
      return {
        warpFrequency: state.warpFrequency,
      };
    }

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
      item.material.uniforms.uProgress.value = progress;
      item.material.uniforms.uIntensity.value = state.portalShaderIntensity;
      item.material.uniforms.uTime.value = state.heroWarpPhase + timeOffset;
      item.material.uniforms.uNoiseScale.value = state.portalShaderNoiseScale;
      item.material.uniforms.uNoiseSpeed.value = state.portalShaderNoiseSpeed;
      item.material.uniforms.uSoftness.value = state.portalShaderSoftness;
      item.material.uniforms.uNoiseAmount.value = state.portalShaderNoiseAmount;
      item.material.uniforms.uFlowX.value = state.portalShaderFlowX;
      item.material.uniforms.uFlowY.value = state.portalShaderFlowY;
      item.material.uniforms.uFlowNoiseY.value = state.portalShaderFlowNoiseY;
      item.material.uniforms.uZoom.value = state.portalShaderZoom;
      item.material.uniforms.uCanvasResolution.value.set(width, height);
    }

    function getDocumentY(screenY) {
      return screenY + state.rawScrollY;
    }

    function getThreeDocumentY(documentY) {
      return state.renderHeight - documentY;
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

    function render(dt) {
      state.heroWarpPhase += dt * state.heroWarpSpeed;
      bottomSectionController.update();
      mediaBackRenderer.clear();
      mediaFrontRenderer.clear();
      const clearY = Math.max(0, state.rawScrollY - state.height * 0.75);
      const clearHeight = state.height * 2.5;
      ctx.clearRect(0, clearY, state.width, clearHeight);
      // Editor-only canvas work is disabled while its panel/grid is hidden.
      const editorIsActive = !state.hidePlacementGrid || Boolean(
        portalInteractionState.activePortalDrag || portalInteractionState.hoveredPortalCorner || portalInteractionState.selectedPortalItem
      );
      if (editorIsActive || state.editorWasVisible) {
        bottomCtx.clearRect(0, clearY, state.width, clearHeight);
      }
      state.editorWasVisible = editorIsActive;
      const bottomGhostScreenTop = state.bottomGhostCanvasTop - state.rawScrollY;
      const bottomGhostScreenBottom = bottomGhostScreenTop + (state.bottomGhostCanvasHeight || state.height);
      const bottomGhostIsNear = bottomGhostScreenBottom > -state.height * 1.5 && bottomGhostScreenTop < state.height * 2.5;
      // The bottom ghost canvas is local to its section, so it need not clear
      // or redraw while that section is far outside the viewport.
      const drawBottomGhost = bottomGhostIsNear;
      if (drawBottomGhost) {
        bottomGhostCtx.clearRect(0, 0, state.width, state.bottomGhostCanvasHeight || state.height);
      }
      pathEditorController.update();
      if (!mainTraceRenderer.draw()) return;
      if (drawBottomGhost) bottomGhostRenderer.draw();
      const creativityScreenTop = state.creativitySectionStart - state.scrollY + state.height * 0.18;
      const creativityScreenBottom = creativityScreenTop + state.creativitySectionHeight;
      const creativityIsNear = creativityScreenBottom > -state.height && creativityScreenTop < state.height * 2;
      // IN-CREATIVITY keeps its exact draw behavior whenever it is nearby,
      // but contributes no per-frame work while it is far offscreen.
      if (creativityIsNear) diagonalGhostRenderer.draw();
      drawPortalResizeHandles();
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

    const traceScheduler = createTraceScheduler({ onFrame: render });

    syncPortalConfigExport();
    portalAssetController.loadPortalImages();
    portalAssetController.loadBottomVideo();
    traceScheduler.start();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    traceViewport?.addEventListener("pointerdown", portalInteraction.onPointerDown);
    window.addEventListener("pointermove", portalInteraction.onPointerMove);
    window.addEventListener("pointerup", portalInteraction.onPointerUp);
    pathEditor?.addEventListener("pointerdown", pathEditorController.onPointerDown);
    window.addEventListener("pointermove", pathEditorController.onPointerMove);
    window.addEventListener("pointerup", pathEditorController.onPointerUp);
    pathGuidesToggle?.addEventListener("input", pathEditorController.update);
    pathExportBtn?.addEventListener("click", pathEditorController.syncExport);
    pathPresetButtons.forEach((button) => button.addEventListener("click", pathEditorController.onPresetClick));
    resize();
    render(0);

    return () => {
      cancelled = true;
      traceScheduler.stop();
      gsap.killTweensOf(state);
      gsap.killTweensOf(bottomAnimation);
      traceViewport?.removeEventListener("pointerdown", portalInteraction.onPointerDown);
      window.removeEventListener("pointermove", portalInteraction.onPointerMove);
      window.removeEventListener("pointerup", portalInteraction.onPointerUp);
      state.portalImages.forEach((item) => gsap.killTweensOf(item.reveal));
      if (state.bottomVideo) gsap.killTweensOf(state.bottomVideo.reveal);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      pathEditor?.removeEventListener("pointerdown", pathEditorController.onPointerDown);
      window.removeEventListener("pointermove", pathEditorController.onPointerMove);
      window.removeEventListener("pointerup", pathEditorController.onPointerUp);
      pathGuidesToggle?.removeEventListener("input", pathEditorController.update);
      pathExportBtn?.removeEventListener("click", pathEditorController.syncExport);
      pathPresetButtons.forEach((button) => button.removeEventListener("click", pathEditorController.onPresetClick));
      glyphRenderer.clearCache();
      bottomGhostRenderer.clearCache();
      diagonalGhostRenderer.clearCache();
      portalAssetController.dispose();
      noiseTexture.dispose();
      mediaBackRenderer.dispose();
      mediaFrontRenderer.dispose();
      document.body.style.overflowX = "";
      document.body.style.overflowY = "";
    };
  }, []);

  return (
    <section className="trace-stage">
      <div className="trace-scroll-shell">
        <div className="trace-viewport">
          <canvas ref={mediaBackCanvasRef} className="trace-media-canvas trace-media-canvas--back" />
          <div ref={mediaDomBackLayerRef} className="trace-dom-media-layer trace-dom-media-layer--back" />
          <canvas ref={canvasRef} className="trace-canvas" />
          <div ref={mediaDomFrontLayerRef} className="trace-dom-media-layer trace-dom-media-layer--front" />
          <canvas ref={mediaFrontCanvasRef} className="trace-media-canvas trace-media-canvas--front" />
          <canvas ref={bottomGhostCanvasRef} className="bottom-ghost-canvas" />
          <canvas ref={bottomCanvasRef} className="bottom-ui-canvas" />
          <svg
            id="creativityPathEditor"
            className="path-editor"
            aria-hidden="false"
          >
            <path data-path-line d="" />
            <line data-handle-a x1="0" y1="0" x2="0" y2="0" />
            <line data-handle-b x1="0" y1="0" x2="0" y2="0" />
            <g data-stamp-points />
            <circle data-path-point="start" r="9" />
            <circle data-path-point="controlA" r="7" />
            <circle data-path-point="controlB" r="7" />
            <circle data-path-point="end" r="9" />
          </svg>
        </div>
        <AlphabetGenerator />
      </div>
    </section>
  );
}
