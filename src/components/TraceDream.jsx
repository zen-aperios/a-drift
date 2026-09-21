import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  THREE,
  createMediaRenderer,
  createNoiseTexture,
} from "./portalMedia.js";
import { clamp, cubicPoint, lerp, seededRandom } from "./traceMath.js";
import { createBottomGhostRenderer } from "./bottomGhostRenderer.js";
import { createDiagonalGhostRenderer } from "./diagonalGhostRenderer.js";
import { createBottomVideoRenderer } from "./bottomVideoRenderer.js";
import { createPortalRenderer } from "./portalRenderer.js";
import { createMainTraceRenderer } from "./mainTraceRenderer.js";
import { createTraceControls } from "./traceControls.js";
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
  const [controlsOpen, setControlsOpen] = useState(false);
  const [pathControlsOpen, setPathControlsOpen] = useState(false);

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

    const controls = createTraceControls({ root: stage, state, lettersFallback: LETTERS });
    const {
      rebuildBtn,
      portalConfigExportBtn,
      portalConfigExport,
    } = controls.elements;
    const pathEditor = q("#creativityPathEditor");
    const pathGuidesToggle = q("#creativityGuidesToggle");
    const creativityGapRange = q("#creativityGapRange");
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

    function syncRenderSurfaces() {
      surfaceController?.syncRenderSurfaces();
    }

    function syncTraceSpacerHeight() {
      surfaceController?.syncTraceSpacerHeight();
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
    heroLayoutController = createHeroLayoutController({
      state,
      ctx,
      glyphRenderer,
      getLetters: () => letters,
      syncCreativitySceneMetrics,
    });

    function syncPortalConfigExport() {
      portalEditorController?.syncConfigExport();
    }

    function copyPortalConfig() {
      return portalEditorController?.copyConfig();
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
    let pendingCreativityRebuild = 0;
    let pendingCreativityEditorUpdate = false;
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

    function syncControls() {
      letters = controls.syncControls();
    }

    function getCreativityNodeYBounds() {
      const values = [
        state.creativityPath.start.y,
        state.creativityPath.controlA.y,
        state.creativityPath.controlB.y,
        state.creativityPath.end.y,
        ...state.creativityStampOverrides.filter(Boolean).map((point) => point.y),
      ];
      const min = clamp(Math.min(...values), 0.02, 0.98);
      const max = clamp(Math.max(...values), 0.02, 0.98);
      return {
        min,
        span: Math.max(0.08, max - min),
      };
    }

    function syncCreativitySceneMetrics(nextStart = state.creativitySectionStart) {
      const nodeBounds = getCreativityNodeYBounds();
      const baseHeight = state.height * (state.creativityGapVh / 100) * Math.max(1, "IN-CREATIVITY".length - 1) + state.height * 0.72;
      state.creativityBaseHeight = baseHeight;
      state.creativitySceneMinY = nodeBounds.min;
      state.creativitySceneSpanY = nodeBounds.span;
      state.creativitySectionStart = nextStart;
      state.creativitySectionHeight = Math.max(state.height * 0.38, baseHeight * nodeBounds.span + state.height * 0.24);
    }

    function rebuildCreativityPath() {
      syncCreativitySceneMetrics();
      diagonalGhostRenderer.clearCache();
      const creativityGrid = diagonalGhostRenderer.build();
      state.creativityStamps = creativityGrid.stamps;
      state.creativitySegments = creativityGrid.segments;
      syncTraceSpacerHeight();
      pathEditorController.syncExport();
    }

    function queueCreativityPathRebuild(updateEditor = false) {
      pendingCreativityEditorUpdate = pendingCreativityEditorUpdate || updateEditor;
      if (pendingCreativityRebuild) return;
      pendingCreativityRebuild = requestAnimationFrame(() => {
        pendingCreativityRebuild = 0;
        if (cancelled) return;
        rebuildCreativityPath();
        if (pendingCreativityEditorUpdate) pathEditorController.update();
        pendingCreativityEditorUpdate = false;
      });
    }

    function getCreativityWorldY(y) {
      const normalizedY = (y - state.creativitySceneMinY) / Math.max(0.001, state.creativitySceneSpanY);
      return state.creativitySectionStart + state.creativitySectionHeight * clamp(normalizedY, 0, 1);
    }

    function getCreativityRawY(worldY) {
      return clamp((worldY - state.creativitySectionStart) / Math.max(1, state.creativityBaseHeight), 0.02, 0.98);
    }

    function sampleCurve(start, end, bendIndex) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const sign = bendIndex % 2 === 0 ? 1 : -1;
      const p0 = { x: start.x, y: start.y };
      const p3 = { x: end.x, y: end.y };
      const p1 = { x: start.x + dx * 0.18, y: lerp(start.y, end.y, 0.28) - state.curvePull * sign };
      const p2 = { x: end.x - dx * 0.18, y: lerp(start.y, end.y, 0.72) + state.curvePull * sign };
      const effectiveStep = Math.max(1, state.sampleDistance || 1);
      const approx = Math.max(8, Math.ceil(Math.hypot(dx, dy) / effectiveStep));
      const points = [];
      for (let i = 0; i <= approx; i += 1) points.push(cubicPoint(p0, p1, p2, p3, i / approx));
      return points;
    }

    function updateScrollTargets(immediate = false) {
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
      gsap.set(state, {
        scrollY: targetScroll,
        drawProgress: progress,
      });

      gsap.to(state, {
        heroDismiss: localPageScroll > 2 ? 1 : 0,
        duration: isReturningToHero ? 2.1 : 2.15,
        ease: isReturningToHero ? "power2.out" : "power4.out",
        overwrite: "auto",
        onComplete: () => {
          const currentLocalScroll = Math.max(0, (window.scrollY || window.pageYOffset || 0) - (traceViewport?.offsetTop || 0));
          if (currentLocalScroll <= 2 && state.heroDismiss <= 0.001) {
            state.hasScrolled = false;
          }
        },
      });

      gsap.to(scrollCue, {
        exit: localPageScroll > 2 ? 1 : 0,
        duration: localPageScroll > 2 ? 0.6 : 0.45,
        ease: localPageScroll > 2 ? "power4.out" : "power2.out",
        overwrite: true,
      });
    }

    function rebuildLayout() {
      glyphRenderer.clearCache();
      bottomGhostRenderer.clearCache();
      diagonalGhostRenderer.clearCache();
      state.anchors = buildAnchors();
      state.heroChars = buildHeroChars();
      const bottomGrid = bottomGhostRenderer.build();
      state.bottomGhostGrid = bottomGrid.stamps;
      state.bottomGhostSegments = bottomGrid.segments;
      state.bottomGhostPathLength = bottomGrid.pathLength;
      rebuildCreativityPath();
      state.landedAnchors = state.anchors.map((_, index) => index === 0);
      state.anchorReveals = state.anchors.map((_, index) => ({
        opacity: index === 0 ? 1 : 0,
        depth: index === 0 ? 0 : -1,
        progress: index === 0 ? 1 : 0,
        active: index === 0,
      }));
      const rawSegments = [];
      for (let i = 0; i < state.anchors.length - 1; i += 1) {
        const segment = sampleCurve(state.anchors[i], state.anchors[i + 1], i);
        if (i > 0) segment.shift();
        rawSegments.push({
          fromIndex: i,
          toIndex: i + 1,
          fromLetter: letters[i] || letters[i + 1],
          toLetter: letters[i + 1] || letters[i],
          points: segment,
        });
      }

      const totalPoints = rawSegments.reduce((sum, segment) => sum + segment.points.length, 0);
      const segments = rawSegments.map((segment) => {
        const segmentShare = totalPoints > 0 ? segment.points.length / totalPoints : 0;
        const ghostTotal = clamp(Math.round(state.maxTrail * segmentShare), 1, segment.points.length);
        const ghosts = [];
        for (let i = 0; i < ghostTotal; i += 1) {
          const t = ghostTotal === 1 ? 0 : i / (ghostTotal - 1);
          const point = segment.points[Math.round(t * (segment.points.length - 1))];
          const letter = t >= 0.5 ? segment.toLetter : segment.fromLetter;
          ghosts.push(createStamp(point.x, point.y, letter, false));
        }
        return {
          ...segment,
          ghosts,
        };
      });

      state.segments = segments;
      state.ghosts = segments.flatMap((segment) => segment.ghosts);
      buildPortalLayout();
      updateScrollTargets(true);
    }

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

    function onScroll() {
      updateScrollTargets();
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

    function rebuildFromControls() {
      syncControls();
      rebuildLayout();
    }

    function rebuildCreativityFromControls() {
      state.creativityGapVh = parseFloat(creativityGapRange.value);
      controls.syncLabels();
      queueCreativityPathRebuild(true);
    }

    const inputs = controls.inputs;
    const traceScheduler = createTraceScheduler({ onFrame: render });

    inputs.forEach((input) => input.addEventListener("input", rebuildFromControls));
    creativityGapRange?.addEventListener("input", rebuildCreativityFromControls);
    rebuildBtn.addEventListener("click", rebuildLayout);
    portalConfigExportBtn?.addEventListener("click", copyPortalConfig);
    syncControls();
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
      inputs.forEach((input) => input.removeEventListener("input", rebuildFromControls));
      creativityGapRange?.removeEventListener("input", rebuildCreativityFromControls);
      if (pendingCreativityRebuild) cancelAnimationFrame(pendingCreativityRebuild);
      rebuildBtn.removeEventListener("click", rebuildLayout);
      portalConfigExportBtn?.removeEventListener("click", copyPortalConfig);
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
        <div className="trace-tools">
          <button
            className="controls-toggle"
            type="button"
            aria-label={controlsOpen ? "Hide controls" : "Show controls"}
            aria-expanded={controlsOpen}
            onClick={() => setControlsOpen((open) => !open)}
          >
            {controlsOpen ? "‹" : "›"}
          </button>
          <button
            className="path-controls-toggle"
            type="button"
            aria-label={pathControlsOpen ? "Hide path controls" : "Show path controls"}
            aria-expanded={pathControlsOpen}
            onClick={() => setPathControlsOpen((open) => !open)}
          >
            {pathControlsOpen ? "›" : "‹"}
          </button>
          <aside className={`controls controls--trace${controlsOpen ? "" : " is-hidden"}`}>
        <div className="controls__block">
          <p className="eyebrow">Pen Reference Build</p>
          <h1>Trace Letters Lines</h1>
          <p className="status">A sparse four-ghost idle trace fades from light to dark, then hands off to the full scroll reveal.</p>
        </div>
        <div className="controls__block">
          <label htmlFor="lettersInput">Letters</label>
          <textarea id="lettersInput" rows="3" defaultValue="APERIOS" />
          <label htmlFor="fontSizeRange">Font Size <span id="fontSizeVal" /></label>
          <input id="fontSizeRange" type="range" min="48" max="160" step="1" defaultValue="160" />
          <label htmlFor="rowGapRange">Row Gap <span id="rowGapVal" /></label>
          <input id="rowGapRange" type="range" min="20" max="120" step="1" defaultValue="90" />
        </div>
        <div className="controls__block">
          <label htmlFor="sampleDistanceRange">Stagger Offset <span id="sampleDistanceVal" /></label>
          <input id="sampleDistanceRange" type="range" min="0" max="120" step="1" defaultValue="10" />
          <label htmlFor="maxTrailRange">Ghost Count <span id="maxTrailVal" /></label>
          <input id="maxTrailRange" type="range" min="4" max="1200" step="1" defaultValue="1200" />
          <label htmlFor="curvePullRange">Curve Pull <span id="curvePullVal" /></label>
          <input id="curvePullRange" type="range" min="0" max="700" step="1" defaultValue="700" />
        </div>
        <div className="controls__block">
          <label htmlFor="ghostOpacityRange">Ghost Opacity <span id="ghostOpacityVal" /></label>
          <input id="ghostOpacityRange" type="range" min="0.05" max="1" step="0.01" defaultValue="1" />
          <label htmlFor="ghostLineWidthRange">Ghost Line Width <span id="ghostLineWidthVal" /></label>
          <input id="ghostLineWidthRange" type="range" min="0.4" max="4" step="0.1" defaultValue="1" />
          <label className="toggle-row" htmlFor="warpToggle">
            <span>Warp Letters</span>
            <input id="warpToggle" type="checkbox" defaultChecked />
          </label>
          <label htmlFor="warpAmountRange">Warp Amount <span id="warpAmountVal" /></label>
          <input id="warpAmountRange" type="range" min="0" max="48" step="1" defaultValue="14" />
          <label htmlFor="warpFrequencyRange">Warp Frequency <span id="warpFrequencyVal" /></label>
          <input id="warpFrequencyRange" type="range" min="0.2" max="3" step="0.05" defaultValue="1.05" />
          <label className="toggle-row" htmlFor="rotateToggle">
            <span>Rotate Letters</span>
            <input id="rotateToggle" type="checkbox" />
          </label>
          <label htmlFor="rotateSpeedRange">Rotate Amount <span id="rotateSpeedVal" /></label>
          <input id="rotateSpeedRange" type="range" min="0" max="4" step="0.05" defaultValue="0.35" />
        </div>
        <div className="controls__block">
          <label htmlFor="fillColorInput">Solid Fill</label>
          <input id="fillColorInput" type="color" defaultValue="#ffffff" />
          <label htmlFor="ghostColorInput">Ghost Color</label>
          <input id="ghostColorInput" type="color" defaultValue="#8b8b8b" />
          <label htmlFor="bgColorInput">Background</label>
          <input id="bgColorInput" type="color" defaultValue="#000000" />
        </div>
        <div className="controls__block">
          <button id="traceRebuildBtn" type="button">Rebuild Layout</button>
        </div>
          </aside>
          <aside className={`controls controls--shader${controlsOpen ? "" : " is-hidden"}`}>
        <div className="controls__block">
          <p className="eyebrow">Portal Shader</p>
          <h1>Media Reveal</h1>
          <p className="status">Controls the Three.js reveal layer only.</p>
        </div>
        <div className="controls__block">
          <label htmlFor="portalRevealStartRange">Reveal Start <span id="portalRevealStartVal" /></label>
          <input id="portalRevealStartRange" type="range" min="45" max="115" step="1" defaultValue="93" />
          <label htmlFor="portalRevealDistanceRange">Reveal Distance <span id="portalRevealDistanceVal" /></label>
          <input id="portalRevealDistanceRange" type="range" min="15" max="90" step="1" defaultValue="55" />
          <label htmlFor="portalRevealDurationRange">Reveal Ease <span id="portalRevealDurationVal" /></label>
          <input id="portalRevealDurationRange" type="range" min="0.05" max="2" step="0.05" defaultValue="1.3" />
        </div>
        <div className="controls__block">
          <label htmlFor="portalShaderIntensityRange">Distortion <span id="portalShaderIntensityVal" /></label>
          <input id="portalShaderIntensityRange" type="range" min="0" max="0.35" step="0.005" defaultValue="0.24" />
          <label htmlFor="portalShaderZoomRange">Zoom <span id="portalShaderZoomVal" /></label>
          <input id="portalShaderZoomRange" type="range" min="0" max="0.2" step="0.005" defaultValue="0" />
          <label htmlFor="portalShaderSoftnessRange">Reveal Softness <span id="portalShaderSoftnessVal" /></label>
          <input id="portalShaderSoftnessRange" type="range" min="0.02" max="0.6" step="0.01" defaultValue="0.02" />
          <label htmlFor="portalShaderNoiseAmountRange">Edge Noise <span id="portalShaderNoiseAmountVal" /></label>
          <input id="portalShaderNoiseAmountRange" type="range" min="0" max="0.5" step="0.01" defaultValue="0.28" />
        </div>
        <div className="controls__block">
          <label htmlFor="portalShaderNoiseScaleRange">Noise Scale <span id="portalShaderNoiseScaleVal" /></label>
          <input id="portalShaderNoiseScaleRange" type="range" min="0.1" max="3" step="0.05" defaultValue="0.75" />
          <label htmlFor="portalShaderNoiseSpeedRange">Noise Speed <span id="portalShaderNoiseSpeedVal" /></label>
          <input id="portalShaderNoiseSpeedRange" type="range" min="0" max="5" step="0.05" defaultValue="5" />
          <label htmlFor="portalShaderFlowXRange">Flow X <span id="portalShaderFlowXVal" /></label>
          <input id="portalShaderFlowXRange" type="range" min="-2" max="2" step="0.05" defaultValue="0" />
          <label htmlFor="portalShaderFlowYRange">Flow Y <span id="portalShaderFlowYVal" /></label>
          <input id="portalShaderFlowYRange" type="range" min="-2" max="2" step="0.05" defaultValue="0" />
          <label htmlFor="portalShaderFlowNoiseYRange">Flow Noise Y <span id="portalShaderFlowNoiseYVal" /></label>
          <input id="portalShaderFlowNoiseYRange" type="range" min="-2" max="2" step="0.05" defaultValue="2" />
        </div>
        <div className="controls__block">
          <label htmlFor="portalDriftRange">Scroll Drift <span id="portalDriftVal" /></label>
          <input id="portalDriftRange" type="range" min="0" max="90" step="1" defaultValue="90" />
          <label htmlFor="portalParallaxRange">Parallax <span id="portalParallaxVal" /></label>
          <input id="portalParallaxRange" type="range" min="-0.2" max="0.2" step="0.005" defaultValue="0.2" />
          <label htmlFor="bottomLineStaggerRange">Bottom Line Stagger <span id="bottomLineStaggerVal" /></label>
          <input id="bottomLineStaggerRange" type="range" min="0" max="1.5" step="0.05" defaultValue="0.3" />
        </div>
        <div className="controls__block">
          <label className="toggle-row" htmlFor="hidePlacementGridToggle">
            <span>Hide Grid</span>
            <input id="hidePlacementGridToggle" type="checkbox" defaultChecked />
          </label>
          <button id="portalConfigExportBtn" type="button">Copy Media Config</button>
          <label htmlFor="portalConfigExport">Media Config</label>
          <textarea id="portalConfigExport" rows="10" readOnly />
        </div>
          </aside>
          <aside className={`controls controls--path${pathControlsOpen ? "" : " is-hidden"}`}>
        <div className="controls__block">
          <p className="eyebrow">Path Editor</p>
          <h1>IN-CREATIVITY</h1>
          <p className="status">Drag the four points to bend the letter path. Export stores the normalized curve.</p>
        </div>
        <div className="controls__block">
          <label className="toggle-row" htmlFor="creativityGuidesToggle">
            <span>Show Points</span>
            <input id="creativityGuidesToggle" type="checkbox" defaultChecked />
          </label>
          <div className="preset-row" aria-label="Path presets">
            <button type="button" data-path-preset="c">C</button>
            <button type="button" data-path-preset="s">S</button>
            <button type="button" data-path-preset="spiral">Spiral</button>
            <button type="button" data-path-preset="circle">Circle</button>
            <button type="button" data-path-preset="diagonal">Diagonal</button>
            <button type="button" data-path-preset="straight">Straight</button>
          </div>
          <label htmlFor="creativityGapRange">Letter Gap <span id="creativityGapVal" /></label>
          <input id="creativityGapRange" type="range" min="10" max="40" step="1" defaultValue="10" />
          <button id="creativityPathExportBtn" type="button">Update Export</button>
          <label htmlFor="creativityPathExport">Path Export</label>
          <textarea id="creativityPathExport" rows="11" readOnly />
        </div>
          </aside>
        </div>
        <AlphabetGenerator />
      </div>
    </section>
  );
}
