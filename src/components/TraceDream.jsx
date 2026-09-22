import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import footerAnimation from "../../runman01.json";
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
import { createTraceState } from "./traceState.js";
import { createTraceRuntimeController } from "./traceRuntimeController.js";
import { createTraceLifecycleController } from "./traceLifecycleController.js";
import { createPortalRuntimeController } from "./portalRuntimeController.js";
import { createTraceCompositionController } from "./traceCompositionController.js";
import { createRhodesChordEngine } from "./rhodesChordEngine.js";
import {
  LETTERS,
  PLACEMENT_GRID_COLUMNS,
  PLACEMENT_GRID_ROWS,
} from "./traceConfig.js";

const TRACE_DPR_CAP = 1.25;

function FooterClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    let currentTime = new Date();

    fetch("https://worldtimeapi.org/api/timezone/Europe/Lisbon")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (active && data.datetime) currentTime = new Date(data.datetime);
      })
      .catch(() => {});

    const timer = window.setInterval(() => {
      currentTime = new Date(currentTime.getTime() + 1000);
      if (active) setTime(currentTime);
    }, 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <time dateTime={time.toISOString()}>
      {new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Lisbon",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(time)}
    </time>
  );
}

function FooterLottie() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let disposed = false;
    let animation;

    import("lottie-web/build/player/lottie_light").then(({ default: lottie }) => {
      if (disposed || !containerRef.current) return;
      animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: footerAnimation,
      });
    });

    return () => {
      disposed = true;
      animation?.destroy();
    };
  }, []);

  return <div ref={containerRef} className="site-footer__lottie" aria-label="Animated mark" />;
}

function FooterLineField() {
  return (
    <span className="site-footer__line-cell" aria-hidden="true">
      <span className="site-footer__line-field">
        {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
      </span>
    </span>
  );
}

export default function TraceDream() {
  const canvasRef = useRef(null);
  const rhodesEngineRef = useRef(null);
  const soundEnabledRef = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
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

    const canvasContextOptions = useDomPortalImages ? { desynchronized: true } : undefined;
    const ctx = canvas.getContext("2d", canvasContextOptions);
    const bottomCtx = bottomCanvas.getContext("2d", canvasContextOptions);
    const bottomGhostCtx = bottomGhostCanvas.getContext("2d", canvasContextOptions);
    const mediaBackRenderer = createMediaRenderer(mediaBackCanvas);
    const mediaFrontRenderer = createMediaRenderer(mediaFrontCanvas);
    const mediaBackScene = new THREE.Scene();
    const mediaFrontScene = new THREE.Scene();
    const mediaCamera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
    const noiseTexture = createNoiseTexture(seededRandom);
    const stage = canvas.closest(".trace-stage");
    const q = (selector) => stage.querySelector(selector);
    let cancelled = false;
    let audioScrollStarted = false;
    const startScrollAudio = () => {
      if (audioScrollStarted || !soundEnabledRef.current) return;
      audioScrollStarted = true;
      rhodesChordEngine.startScrollGroove();
    };
    const stopScrollAudio = () => {
      if (!audioScrollStarted) return;
      audioScrollStarted = false;
      rhodesChordEngine.stopScrollGroove();
    };
    const startAudioFromWheel = (event) => {
      if (event.deltaY > 0) startScrollAudio();
    };
    window.addEventListener("wheel", startAudioFromWheel, { passive: true });
    const state = createTraceState();
    const rhodesChordEngine = createRhodesChordEngine();
    rhodesEngineRef.current = rhodesChordEngine;
    const unlockRhodesAudio = (event) => {
      rhodesChordEngine.unlock();
      if (event?.type === "wheel" && event.deltaY > 0) startScrollAudio();
    };
    const audioUnlockEvents = ["pointerdown", "touchstart", "wheel", "keydown"];
    audioUnlockEvents.forEach((eventName) => window.addEventListener(eventName, unlockRhodesAudio, { passive: true }));
    const portalRuntimeController = createPortalRuntimeController({ state, gsap });
    const compositionController = createTraceCompositionController();
    const {
      syncRenderSurfaces,
      syncTraceSpacerHeight,
      updateScrollTargets,
      onScroll,
      rebuildLayout,
      sampleCurve,
      syncCreativitySceneMetrics,
      rebuildCreativityPath,
      queueCreativityPathRebuild,
      getCreativityWorldY,
      getCreativityRawY,
      getWarpPhase,
      getRotation,
      createStamp,
      buildHeroChars,
      buildAnchors,
      getTopGhostOffsets,
      getTopGhostPoint,
    } = compositionController;
    const {
      setPortalReveal,
      syncPortalMaterial,
      getDocumentY,
      getThreeDocumentY,
      getPortalItemDocumentFrame,
      getPortalVisibleFrame,
      triggerAnchorReveal,
    } = portalRuntimeController;
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
      useDomPortalImages,
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
      onStampLand: (index) => {
        if (soundEnabledRef.current) rhodesChordEngine.playStampChord(index);
        if (index === state.anchors.length - 1) rhodesChordEngine.enablePostStampKeys?.();
      },
      onStampLeave: () => {
        rhodesChordEngine.disablePostStampKeys?.();
      },
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
    let scrollController;
    let layoutController;
    let surfaceController;
    let heroLayoutController;
    let creativityPathController;

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
    compositionController.setControllers({
      surfaceController,
      scrollController,
      layoutController,
      heroLayoutController,
      creativityPathController,
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

    const traceRuntimeController = createTraceRuntimeController({
      state,
      ctx,
      bottomCtx,
      bottomGhostCtx,
      mediaBackRenderer,
      mediaFrontRenderer,
      bottomSectionController,
      portalInteractionState,
      pathEditorController,
      mainTraceRenderer,
      bottomGhostRenderer,
      diagonalGhostRenderer,
      drawPortalResizeHandles,
      syncTraceCanvasWindow: () => surfaceController?.syncTraceCanvasWindow(),
      syncEditorCanvasWindow: () => surfaceController?.syncEditorCanvasWindow(),
      useDomPortalImages,
    });

    const traceScheduler = createTraceScheduler({ onFrame: traceRuntimeController.render });
    const traceLifecycleController = createTraceLifecycleController({
      traceScheduler,
      portalAssetController,
      syncPortalConfigExport,
      onScroll: () => {
        rhodesChordEngine.unlock();
        if (soundEnabledRef.current) {
          if (!audioScrollStarted) startScrollAudio();
          else rhodesChordEngine.startScrollGroove();
        }
        onScroll();
      },
      resize,
      traceViewport,
      portalInteraction,
      pathEditor,
      pathEditorController,
      pathGuidesToggle,
      pathExportBtn,
      pathPresetButtons,
      renderInitialFrame: () => traceRuntimeController.render(0),
    });
    traceLifecycleController.start();

    return () => {
      cancelled = true;
      traceLifecycleController.cleanup();
      gsap.killTweensOf(state);
      gsap.killTweensOf(bottomAnimation);
      state.portalImages.forEach((item) => gsap.killTweensOf(item.reveal));
      if (state.bottomVideo) gsap.killTweensOf(state.bottomVideo.reveal);
      glyphRenderer.clearCache();
      bottomGhostRenderer.clearCache();
      diagonalGhostRenderer.clearCache();
      portalAssetController.dispose();
      rhodesChordEngine.dispose();
      rhodesEngineRef.current = null;
      window.removeEventListener("wheel", startAudioFromWheel);
      audioUnlockEvents.forEach((eventName) => window.removeEventListener(eventName, unlockRhodesAudio));
      noiseTexture.dispose();
      mediaBackRenderer.dispose();
      mediaFrontRenderer.dispose();
      document.body.style.overflowX = "";
      document.body.style.overflowY = "";
    };
  }, []);

  return (
    <section className="trace-stage">
      <button
        className="rhodes-audio-button"
        type="button"
        aria-label="Play Rhodes sound"
        title="Play Rhodes sound"
        onClick={async () => {
          const engine = rhodesEngineRef.current;
          if (engine) await engine.unlock();
          const nextEnabled = !soundEnabledRef.current;
          soundEnabledRef.current = nextEnabled;
          setSoundEnabled(nextEnabled);
          if (engine && nextEnabled) {
            // The button arms audio; the next scroll is the playback trigger.
          } else if (engine) {
            engine.stopScrollGroove();
          }
        }}
      >
        {soundEnabled ? "Sound on" : "Sound off"}
      </button>
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
      <footer className="site-footer" aria-label="Footer grid">
        <div className="site-footer__grid">
          <span className="site-footer__lottie-cell"><FooterLottie /></span>
          <FooterLineField />
          <span className="site-footer__back-to-top-cell">
            <button
              className="site-footer__back-to-top"
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Back to top
            </button>
          </span>
          <span className="site-footer__label">RunRobRun.ltd</span>
          <span aria-hidden="true" />
          <span className="site-footer__time"><FooterClock /></span>
        </div>
      </footer>
    </section>
  );
}
