import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  THREE,
  createImageCanvasTexture,
  createMediaRenderer,
  createNoiseTexture,
  createPortalMaterial,
  createPortalMesh,
  loadPortalImageUrls,
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
import { AlphabetGlyph } from "./AlphabetGlyph.jsx";
import {
  ALPHABET_LETTERS,
  BOTTOM_VIDEO_URL,
  INITIAL_PORTAL_IMAGE_LAYOUT,
  LETTERS,
  PLACEMENT_GRID_COLUMNS,
  PLACEMENT_GRID_ROWS,
} from "./traceConfig.js";

const TRACE_DPR_CAP = 1.25;
const TRACE_RENDER_FPS = 40;

function hexToRgba(hex, alpha) {
  const safe = hex.replace("#", "");
  const normalized = safe.length === 3 ? safe.split("").map((char) => char + char).join("") : safe;
  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TraceDream() {
  const canvasRef = useRef(null);
  const bottomCanvasRef = useRef(null);
  const bottomGhostCanvasRef = useRef(null);
  const mediaBackCanvasRef = useRef(null);
  const mediaFrontCanvasRef = useRef(null);
  const mediaDomBackLayerRef = useRef(null);
  const mediaDomFrontLayerRef = useRef(null);
  const alphabetSectionRef = useRef(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [pathControlsOpen, setPathControlsOpen] = useState(false);
  const pathControlsOpenRef = useRef(pathControlsOpen);
  const [alphabetGhostDirection, setAlphabetGhostDirection] = useState(148);
  const [alphabetWarpChaos, setAlphabetWarpChaos] = useState(0.62);
  const [alphabetActive, setAlphabetActive] = useState(false);

  useEffect(() => {
    pathControlsOpenRef.current = pathControlsOpen;
  }, [pathControlsOpen]);

  useEffect(() => {
    const section = alphabetSectionRef.current;
    if (!section) return undefined;
    let hasRevealed = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isNear = entry.isIntersecting;
        setAlphabetActive(isNear);
        if (!isNear || hasRevealed) return;
        hasRevealed = true;
        gsap.fromTo(
          section.querySelectorAll(".alphabet-cell"),
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.025,
            overwrite: true,
          }
        );
      },
      {
        root: null,
        rootMargin: "360px 0px 360px 0px",
        threshold: 0.01,
      }
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      gsap.killTweensOf(section.querySelectorAll(".alphabet-cell"));
    };
  }, []);

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
    const glyphCache = new Map();
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
      portalRevealDistance: 68,
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
      lastFrameTime: 0,
      lastRenderTime: 0,
      editorWasVisible: false,
    };
    const bottomAnimation = {
      progress: 0,
      started: false,
    };
    const scrollCue = {
      exit: 0,
    };
    const heroDismissEase = gsap.parseEase("power4.out");
    const bottomVideoRenderer = createBottomVideoRenderer({
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
      drawStamp,
      drawAnimatedGhostStack,
      drawScrollCue,
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
    let activePathPoint = null;
    const portalInteractionState = {
      activePortalDrag: null,
      hoveredPortalCorner: null,
      selectedPortalItem: null,
    };
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
    const {
      getPortalItemInteractiveFrame,
      getPortalFrameCorners,
      getPortalLayerToggleRect,
    } = portalInteraction;

    function syncControls() {
      letters = controls.syncControls();
    }

    function getLetterMetrics(letter) {
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText(letter);
      const left = -(metrics.actualBoundingBoxLeft || state.fontSize * 0.28);
      const right = metrics.actualBoundingBoxRight || state.fontSize * 0.28;
      const top = -(metrics.actualBoundingBoxAscent || state.fontSize * 0.5);
      const bottom = metrics.actualBoundingBoxDescent || state.fontSize * 0.18;
      return { left, right, top, bottom };
    }

    function getGlyphCanvas(letter, solid, overrideColor) {
      const color = overrideColor || (solid ? state.fillColor : state.ghostColor);
      const key = `${letter}|${solid ? "fill" : "stroke"}|${state.fontSize}|${state.ghostLineWidth}|${
        color
      }`;
      if (glyphCache.has(key)) return glyphCache.get(key);

      const metrics = getLetterMetrics(letter);
      const pad = state.fontSize * 0.3;
      const width = Math.ceil(metrics.right - metrics.left + pad * 2);
      const height = Math.ceil(metrics.bottom - metrics.top + pad * 2);
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.max(1, Math.ceil(width * state.dpr));
      offscreen.height = Math.max(1, Math.ceil(height * state.dpr));
      const octx = offscreen.getContext("2d");
      octx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      octx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.lineJoin = "miter";
      octx.lineCap = "square";
      octx.setLineDash([]);

      const drawX = width * 0.5;
      const drawY = height * 0.5;
      if (solid) {
        octx.fillStyle = color;
        octx.fillText(letter, drawX, drawY);
      } else {
        octx.strokeStyle = color;
        octx.lineWidth = state.ghostLineWidth;
        octx.strokeText(letter, drawX, drawY);
      }

      const cached = { canvas: offscreen, width, height };
      glyphCache.set(key, cached);
      return cached;
    }

    function getWarpPhase(x, y) {
      return x * 0.004 + y * 0.003;
    }

    function getRotation(x, y) {
      return (x * 0.0008 - y * 0.0006) * Math.max(state.rotateSpeed, 0);
    }

    function createStamp(x, y, letter, solid = false) {
      return {
        x,
        y,
        letter,
        solid,
        warpPhase: getWarpPhase(x, y),
        rotation: state.rotateEnabled ? getRotation(x, y) : 0,
      };
    }

    async function loadPortalImages() {
      const sources = await loadPortalImageUrls(10);
      if (cancelled) return;
      state.portalImages = sources.map((src, index) => {
        const initialPlacement = INITIAL_PORTAL_IMAGE_LAYOUT[index];
        const item = {
          src,
          index,
          texture: null,
          mesh: null,
          material: null,
          aspect: 0.76,
          layer: initialPlacement?.layer || "back",
          x: state.width * 0.5,
          y: 0,
          width: 220,
          height: 290,
          reveal: {
            progress: 0,
            target: 0,
          },
        };
        if (initialPlacement) {
          item.manualPlacement = {
            x: item.x,
            y: item.y,
            layer: item.layer,
            span: { ...initialPlacement.span },
            stretched: Boolean(initialPlacement.stretched),
            cell: { ...initialPlacement.cell },
          };
        }
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          if (cancelled) return;
          item.aspect = (image.naturalWidth || image.width || 1) / Math.max(1, image.naturalHeight || image.height || 1);
          if (useDomPortalImages) {
            image.className = "trace-dom-media";
            image.alt = "";
            image.draggable = false;
            item.domNode = image;
            (item.layer === "front" ? mediaDomFrontLayer : mediaDomBackLayer).appendChild(image);
            buildPortalLayout();
            return;
          }
          const texture = createImageCanvasTexture(image, mediaBackRenderer.capabilities?.maxTextureSize);
          item.texture = texture;
          item.material = createPortalMaterial(texture, noiseTexture, state);
          item.mesh = createPortalMesh(item.material);
          mediaBackScene.add(item.mesh);
          buildPortalLayout();
        };
        image.src = src;
        return item;
      });
      buildPortalLayout();
    }

    function loadBottomVideo() {
      const video = document.createElement("video");
      video.src = BOTTOM_VIDEO_URL;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.preload = "metadata";
      video.crossOrigin = "anonymous";

      let texture = null;
      let material = null;
      let mesh = null;
      if (useDomPortalImages) {
        video.className = "trace-dom-media trace-dom-video";
        mediaDomBackLayer.appendChild(video);
      } else {
        texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        material = createPortalMaterial(texture, noiseTexture, state);
        mesh = createPortalMesh(material);
        mediaBackScene.add(mesh);
      }

      state.bottomVideo = {
        video,
        texture,
        material,
        mesh,
        aspect: 16 / 9,
        domStyle: {},
        lastPlayAttempt: 0,
        reveal: {
          progress: 0,
          target: 0,
        },
      };

      video.addEventListener("loadedmetadata", () => {
        if (cancelled) return;
        state.bottomVideo.aspect = (video.videoWidth || 16) / Math.max(1, video.videoHeight || 9);
      });
      video.addEventListener("canplay", () => {
        if (cancelled) return;
        video.play().catch(() => {});
      });

      video.play().catch(() => {});
    }

    function getStampBounds(stamp) {
      const glyph = getGlyphCanvas(stamp.letter, true);
      return {
        minX: stamp.x - glyph.width * 0.5,
        maxX: stamp.x + glyph.width * 0.5,
        minY: stamp.y - glyph.height * 0.5,
        maxY: stamp.y + glyph.height * 0.5,
      };
    }

    function getHeroGhostWrapBounds() {
      const stamps = [state.anchors[0], ...state.heroChars].filter(Boolean);
      const offsets = getTopGhostOffsets();
      const allBounds = [];
      stamps.forEach((stamp) => {
        allBounds.push(getStampBounds(stamp));
        offsets.forEach((offset) => {
          allBounds.push(getStampBounds({ ...stamp, x: stamp.x + offset.x, y: stamp.y + offset.y }));
        });
      });
      if (!allBounds.length) {
        return {
          width: state.width * 0.64,
          height: state.fontSize * 1.4,
        };
      }

      const minX = Math.min(...allBounds.map((bounds) => bounds.minX));
      const maxX = Math.max(...allBounds.map((bounds) => bounds.maxX));
      const minY = Math.min(...allBounds.map((bounds) => bounds.minY));
      const maxY = Math.max(...allBounds.map((bounds) => bounds.maxY));
      return {
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    function buildPortalLayout() {
      const cells = getPlacementGridCells();
      if (!cells.length) return;
      const placedFrames = [];
      state.portalImages.forEach((item, index) => {
        const manual = item.manualPlacement;
        const span = manual?.span || (index === 0 ? { columns: 1, rows: 1 } : { columns: 2, rows: 2 });
        const preferredCell =
          index === 0
            ? cells.find((candidate) => candidate.gapIndex === 0 && candidate.column === 2 && candidate.row === 2)
            : cells.find(
                (candidate) =>
                  candidate.gapIndex === 1 + Math.floor((index - 1) / 2) &&
                  candidate.column === [0, 2, 4, 1, 3][index % 5] &&
                  candidate.row === [0, 2, 1, 3][index % 4]
              );
        const originCell = manual?.cell
          ? cells.find(
              (candidate) =>
                candidate.gapIndex === manual.cell.gapIndex &&
                candidate.column === manual.cell.column &&
                candidate.row === manual.cell.row
            )
          : preferredCell || cells[index % cells.length];
        const preferredBlock = originCell ? getPlacementBlock(originCell, span) : null;
        const preferredFrame = preferredBlock ? getPortalFrameForBlock(preferredBlock, item, manual?.stretched) : null;
        const block =
          preferredBlock && preferredFrame && !placedFrames.some((placedFrame) => framesOverlap(preferredFrame, placedFrame))
            ? preferredBlock
            : getNearestAvailablePlacementBlock(preferredBlock?.cx || state.width * 0.5, preferredBlock?.cy || state.height * 0.5, span, item, placedFrames);
        if (!block) return;
        const frame = getPortalFrameForBlock(block, item, manual?.stretched);
        item.width = frame.width;
        item.height = frame.height;
        item.x = block.cx;
        item.y = block.cy - state.height * 0.18;
        item.layoutBlock = block;
        item.layoutFrame = frame;
        placedFrames.push(frame);
        if (manual) {
          item.manualPlacement.x = item.x;
          item.manualPlacement.y = item.y;
          item.manualPlacement.span = span;
          item.manualPlacement.stretched = Boolean(manual.stretched);
        }
      });
      syncPortalConfigExport();
    }

    function getPortalConfig() {
      return {
        grid: {
          columns: PLACEMENT_GRID_COLUMNS,
          rows: PLACEMENT_GRID_ROWS,
        },
        images: state.portalImages.map((item) => ({
          index: item.index,
          src: item.src?.split("/").pop() || item.src,
          layer: item.layer,
          x: Number(item.x.toFixed(2)),
          y: Number(item.y.toFixed(2)),
          documentY: Number((item.y + state.height * 0.18).toFixed(2)),
          width: Number(item.width.toFixed(2)),
          height: Number(item.height.toFixed(2)),
          aspect: Number((item.aspect || 1).toFixed(4)),
          cell: item.layoutBlock
            ? {
                gapIndex: item.layoutBlock.gapIndex,
                column: item.layoutBlock.column,
                row: item.layoutBlock.row,
                label: item.layoutBlock.label,
              }
            : item.manualPlacement?.cell || null,
          span: item.layoutBlock?.span || item.manualPlacement?.span || null,
          stretched: Boolean(item.manualPlacement?.stretched),
        })),
      };
    }

    function syncPortalConfigExport() {
      if (!portalConfigExport) return;
      portalConfigExport.value = JSON.stringify(getPortalConfig(), null, 2);
    }

    async function copyPortalConfig() {
      syncPortalConfigExport();
      const text = portalConfigExport?.value || "";
      if (!text) return;
      try {
        await navigator.clipboard?.writeText(text);
      } catch {
        portalConfigExport?.select?.();
      }
    }

    function buildHeroChars() {
      const firstAnchor = state.anchors[0];
      if (!firstAnchor) return [];
      const phrase = "DREAM";
      ctx.save();
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      let cursorX = firstAnchor.x + getHeroLeadAdvance();
      const chars = [];
      Array.from(phrase).forEach((char) => {
        const advance = char === " " ? state.fontSize * 0.42 : ctx.measureText(char).width;
        if (char !== " ") chars.push(createStamp(cursorX + advance * 0.5, firstAnchor.y, char, true));
        cursorX += advance + state.fontSize * 0.015;
      });

      ctx.restore();
      return chars;
    }

    function getHeroLeadAdvance() {
      ctx.save();
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      const aAdvance = ctx.measureText("A").width;
      ctx.restore();
      return aAdvance * 0.62 + state.fontSize * 0.42;
    }

    function getCenteredHeroAnchorX() {
      ctx.save();
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      const leadAdvance = getHeroLeadAdvance();
      let cursorX = leadAdvance;
      const bounds = [];
      const aGlyph = getGlyphCanvas("A", true);
      bounds.push({ x: 0, width: aGlyph.width + state.warpAmount * 2 });

      "DREAM".split("").forEach((char) => {
        const advance = ctx.measureText(char).width;
        const glyph = getGlyphCanvas(char, true);
        bounds.push({ x: cursorX + advance * 0.5, width: glyph.width + state.warpAmount * 2 });
        cursorX += advance + state.fontSize * 0.015;
      });

      ctx.restore();
      if (!bounds.length) return state.width * 0.5;
      const minX = Math.min(...bounds.map((item) => item.x - item.width * 0.5));
      const maxX = Math.max(...bounds.map((item) => item.x + item.width * 0.5));
      return state.width * 0.5 - (minX + maxX) * 0.5;
    }

    function getTopGhostOffsets() {
      const firstAnchor = state.anchors[0];
      if (!firstAnchor || !state.ghosts.length) {
        return Array.from({ length: 5 }, (_, index) => ({
          x: -state.fontSize * 0.11 * (index + 1),
          y: state.fontSize * 0.015 * (index + 1),
        }));
      }

      return Array.from({ length: 5 }, (_, index) => {
        const ghost = state.ghosts[index] || state.ghosts[state.ghosts.length - 1];
        return { x: ghost.x - firstAnchor.x, y: ghost.y - firstAnchor.y };
      });
    }

    function getTopGhostPoint(offsets, age) {
      const headInset = { x: offsets[0].x * 0.28, y: offsets[0].y * 0.28 };
      const points = [headInset, ...offsets];
      const clampedAge = clamp(age, 0, points.length - 1);
      const fromIndex = Math.floor(clampedAge);
      const toIndex = Math.min(points.length - 1, fromIndex + 1);
      const localT = clampedAge - fromIndex;
      return {
        x: lerp(points[fromIndex].x, points[toIndex].x, localT),
        y: lerp(points[fromIndex].y, points[toIndex].y, localT),
      };
    }

    function buildAnchors() {
      const anchors = [];
      const leftX = state.width * 0.28;
      const rightX = state.width * 0.72;
      const gap = state.height * (state.rowGapVh / 100);
      const topOffset = state.height * 0.32;
      const heroY = state.height * 0.5 - state.height * 0.18;
      const heroAnchorX = getCenteredHeroAnchorX();

      for (let i = 0; i < letters.length; i += 1) {
        anchors.push(createStamp(i === 0 ? heroAnchorX : i % 2 === 0 ? leftX : rightX, i === 0 ? heroY : topOffset + gap * i, letters[i], true));
      }

      const lastAnchorY = anchors[anchors.length - 1]?.y || topOffset + gap * Math.max(0, letters.length - 1);
      state.bottomSectionStart = lastAnchorY + 120;
      const bottomVideoHeight = (state.width * 0.95) / (state.bottomVideo?.aspect || 16 / 9);
      const bottomMargin = 48;
      const creativityGap = 192;
      state.bottomSectionHeight = Math.max(state.height * 1.05, bottomVideoHeight + state.height * 0.35 + bottomMargin);
      const bottomVideoBottom = state.bottomSectionStart + state.height * 0.54 + bottomVideoHeight * 0.5;
      syncCreativitySceneMetrics(bottomVideoBottom + creativityGap);
      state.totalHeight = state.creativitySectionStart + state.creativitySectionHeight + bottomMargin;
      return anchors;
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

    function getCreativityContentBottom() {
      const worldYs = [];
      const pathPoints = [
        state.creativityPath.start,
        state.creativityPath.controlA,
        state.creativityPath.controlB,
        state.creativityPath.end,
        ...state.creativityStampOverrides.filter(Boolean),
      ];

      pathPoints.forEach((point) => {
        if (!point) return;
        worldYs.push(getCreativityWorldY(point.y));
      });
      state.creativityStamps.forEach((stamp) => worldYs.push(stamp.y));
      state.creativitySegments.forEach((segment) => {
        segment.ghosts.forEach((ghost) => worldYs.push(ghost.y));
      });

      if (!worldYs.length) return state.creativitySectionStart + state.creativitySectionHeight;
      return Math.max(...worldYs) + Math.max(160, state.height * 0.16);
    }

    function syncTraceSpacerHeight() {
      const bottomMargin = 48;
      const contentBottom = getCreativityContentBottom();
      state.totalHeight = contentBottom + bottomMargin;
      state.renderHeight = Math.max(state.totalHeight, state.height * 2);
      syncRenderSurfaces();
    }

    function syncRenderSurfaces() {
      const renderHeight = Math.max(state.renderHeight || state.totalHeight || state.height, state.height);
      const canvasWidth = Math.round(state.width * state.dpr);
      const canvasHeight = Math.round(renderHeight * state.dpr);

      [canvas, bottomCanvas].forEach((targetCanvas) => {
        if (targetCanvas.width !== canvasWidth) targetCanvas.width = canvasWidth;
        if (targetCanvas.height !== canvasHeight) targetCanvas.height = canvasHeight;
        targetCanvas.style.height = `${renderHeight}px`;
      });

      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      bottomCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      const bottomGhostTop = Math.max(0, state.bottomSectionStart - state.height * 0.35);
      const bottomGhostHeight = Math.max(state.height * 1.2, state.bottomSectionHeight + state.height * 0.35);
      state.bottomGhostCanvasTop = bottomGhostTop;
      state.bottomGhostCanvasHeight = bottomGhostHeight;
      const bottomGhostCanvasWidth = canvasWidth;
      const bottomGhostCanvasHeight = Math.round(bottomGhostHeight * state.dpr);
      if (bottomGhostCanvas.width !== bottomGhostCanvasWidth) bottomGhostCanvas.width = bottomGhostCanvasWidth;
      if (bottomGhostCanvas.height !== bottomGhostCanvasHeight) bottomGhostCanvas.height = bottomGhostCanvasHeight;
      bottomGhostCanvas.style.top = `${bottomGhostTop}px`;
      bottomGhostCanvas.style.height = `${bottomGhostHeight}px`;
      bottomGhostCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      [mediaBackRenderer, mediaFrontRenderer].forEach((renderer) => {
        renderer.setPixelRatio(Math.min(state.dpr, 1.25));
        renderer.setSize(state.width, renderHeight, false);
        renderer.domElement.style.height = `${renderHeight}px`;
      });
      mediaCamera.left = 0;
      mediaCamera.right = state.width;
      mediaCamera.top = renderHeight;
      mediaCamera.bottom = 0;
      mediaCamera.position.z = 10;
      mediaCamera.updateProjectionMatrix();

      if (pathEditor) {
        pathEditor.style.height = `${renderHeight}px`;
        pathEditor.setAttribute("viewBox", `0 0 ${state.width} ${renderHeight}`);
      }
      if (traceViewport) traceViewport.style.height = `${renderHeight}px`;
    }

    function rebuildCreativityPath() {
      syncCreativitySceneMetrics();
      diagonalGhostRenderer.clearCache();
      const creativityGrid = diagonalGhostRenderer.build();
      state.creativityStamps = creativityGrid.stamps;
      state.creativitySegments = creativityGrid.segments;
      syncTraceSpacerHeight();
      syncPathExport();
    }

    function queueCreativityPathRebuild(updateEditor = false) {
      pendingCreativityEditorUpdate = pendingCreativityEditorUpdate || updateEditor;
      if (pendingCreativityRebuild) return;
      pendingCreativityRebuild = requestAnimationFrame(() => {
        pendingCreativityRebuild = 0;
        if (cancelled) return;
        rebuildCreativityPath();
        if (pendingCreativityEditorUpdate) updatePathEditor();
        pendingCreativityEditorUpdate = false;
      });
    }

    function getCreativityPointScreen(key) {
      const point = state.creativityPath[key];
      const worldY = getCreativityWorldY(point.y);
      return {
        x: state.width * point.x,
        y: worldY - state.scrollY + state.height * 0.18,
      };
    }

    function getCreativityWorldY(y) {
      const normalizedY = (y - state.creativitySceneMinY) / Math.max(0.001, state.creativitySceneSpanY);
      return state.creativitySectionStart + state.creativitySectionHeight * clamp(normalizedY, 0, 1);
    }

    function getCreativityRawY(worldY) {
      return clamp((worldY - state.creativitySectionStart) / Math.max(1, state.creativityBaseHeight), 0.02, 0.98);
    }

    function syncPathExport() {
      if (!pathExportOutput) return;
      pathExportOutput.value = JSON.stringify(
        {
          text: "IN-CREATIVITY",
          rowGapVh: state.creativityGapVh,
          sectionHeightVh: Number(((state.creativitySectionHeight / Math.max(1, state.height)) * 100).toFixed(2)),
          points: state.creativityPath,
          stampPoints: state.creativityStampOverrides,
        },
        null,
        2
      );
    }

    function applyPathPreset(name) {
      const stampCount = "IN-CREATIVITY".length;
      const circlePoints = Array.from({ length: stampCount }, (_, index) => {
        const angle = -Math.PI * 0.64 + (Math.PI * 2 * index) / Math.max(1, stampCount - 1);
        return {
          x: 0.5 + Math.cos(angle) * 0.38,
          y: 0.5 + Math.sin(angle) * 0.29,
        };
      });
      const spiralPoints = Array.from({ length: stampCount }, (_, index) => {
        const t = index / Math.max(1, stampCount - 1);
        const angle = -Math.PI * 0.85 + Math.PI * 3.15 * t;
        const radiusX = 0.4 - t * 0.22;
        const radiusY = 0.31 - t * 0.16;
        return {
          x: 0.5 + Math.cos(angle) * radiusX,
          y: 0.5 + Math.sin(angle) * radiusY,
        };
      });
      const presets = {
        c: {
          points: {
            start: { x: 0.1, y: 0.088 },
            controlA: { x: 0.76, y: 0.2 },
            controlB: { x: 0.76, y: 0.8 },
            end: { x: 0.1, y: 0.912 },
          },
        },
        s: {
          points: {
            start: { x: 0.1, y: 0.088 },
            controlA: { x: 0.9, y: 0.22 },
            controlB: { x: 0.1, y: 0.78 },
            end: { x: 0.9, y: 0.912 },
          },
        },
        diagonal: {
          points: {
            start: { x: 0.1, y: 0.088 },
            controlA: { x: 0.42, y: 0.3 },
            controlB: { x: 0.58, y: 0.7 },
            end: { x: 0.9, y: 0.912 },
          },
        },
        straight: {
          points: {
            start: { x: 0.5, y: 0.088 },
            controlA: { x: 0.5, y: 0.32 },
            controlB: { x: 0.5, y: 0.68 },
            end: { x: 0.5, y: 0.912 },
          },
        },
        circle: {
          points: {
            start: circlePoints[0],
            controlA: { x: 0.9, y: 0.18 },
            controlB: { x: 0.1, y: 0.82 },
            end: circlePoints[circlePoints.length - 1],
          },
          stampOverrides: circlePoints,
        },
        spiral: {
          points: {
            start: spiralPoints[0],
            controlA: { x: 0.95, y: 0.18 },
            controlB: { x: 0.12, y: 0.84 },
            end: spiralPoints[spiralPoints.length - 1],
          },
          stampOverrides: spiralPoints,
        },
      };
      const preset = presets[name];
      if (!preset) return;
      state.creativityPath = JSON.parse(JSON.stringify(preset.points));
      state.creativityStampOverrides = JSON.parse(JSON.stringify(preset.stampOverrides || []));
      rebuildLayout();
      updatePathEditor();
    }

    function updatePathEditor() {
      if (!pathEditor) return;
      const shouldShowEditor = pathControlsOpenRef.current || Boolean(activePathPoint);
      pathEditor.classList.toggle("is-hidden", !shouldShowEditor);
      if (!shouldShowEditor) return;
      const showGuides = pathGuidesToggle?.checked ?? true;
      pathEditor.classList.toggle("is-guides-hidden", !showGuides);
      pathEditor.setAttribute("viewBox", `0 0 ${state.width} ${Math.max(state.renderHeight, state.height)}`);
      const documentOffsetY = state.rawScrollY;
      const toDocumentPoint = (point) => ({ x: point.x, y: point.y + documentOffsetY });
      const points = {
        start: toDocumentPoint(getCreativityPointScreen("start")),
        controlA: toDocumentPoint(getCreativityPointScreen("controlA")),
        controlB: toDocumentPoint(getCreativityPointScreen("controlB")),
        end: toDocumentPoint(getCreativityPointScreen("end")),
      };
      const path = pathEditor.querySelector("[data-path-line]");
      const handleA = pathEditor.querySelector("[data-handle-a]");
      const handleB = pathEditor.querySelector("[data-handle-b]");
      if (path) {
        path.setAttribute(
          "d",
          `M ${points.start.x} ${points.start.y} C ${points.controlA.x} ${points.controlA.y}, ${points.controlB.x} ${points.controlB.y}, ${points.end.x} ${points.end.y}`
        );
      }
      if (handleA) {
        handleA.setAttribute("x1", points.start.x);
        handleA.setAttribute("y1", points.start.y);
        handleA.setAttribute("x2", points.controlA.x);
        handleA.setAttribute("y2", points.controlA.y);
      }
      if (handleB) {
        handleB.setAttribute("x1", points.end.x);
        handleB.setAttribute("y1", points.end.y);
        handleB.setAttribute("x2", points.controlB.x);
        handleB.setAttribute("y2", points.controlB.y);
      }
      Object.entries(points).forEach(([key, point]) => {
        const node = pathEditor.querySelector(`[data-path-point="${key}"]`);
        if (!node) return;
        node.setAttribute("cx", point.x);
        node.setAttribute("cy", point.y);
      });
      const stampsLayer = pathEditor.querySelector("[data-stamp-points]");
      if (stampsLayer) {
        stampsLayer.replaceChildren();
        state.creativityStamps.forEach((stamp, index) => {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("data-stamp-index", `${index}`);
          circle.setAttribute("class", "path-editor__stamp-point");
          circle.setAttribute("cx", stamp.x);
          circle.setAttribute("cy", stamp.y - state.scrollY + state.height * 0.18 + documentOffsetY);
          circle.setAttribute("r", "5");
          stampsLayer.appendChild(circle);
        });
      }
    }

    function getBottomSectionScreenY() {
      return state.bottomSectionStart - state.scrollY + state.height * 0.18;
    }

    function getBottomVideoBaseScreenY() {
      return state.bottomSectionStart + state.height * 0.54 - state.scrollY + state.height * 0.18;
    }

    function getBottomVideoBaseRawScreenY() {
      return state.bottomSectionStart + state.height * 0.54 - state.rawScrollY + state.height * 0.18;
    }

    function startBottomAnimation() {
      if (bottomAnimation.started) return;
      bottomAnimation.started = true;
      gsap.killTweensOf(bottomAnimation);
      gsap.fromTo(
        bottomAnimation,
        { progress: 0 },
        {
          progress: 1,
          duration: 4.4,
          ease: "none",
          overwrite: "auto",
        }
      );
    }

    function updateBottomAnimation() {
      const videoScreenY = getBottomVideoBaseRawScreenY();
      const shouldStart = videoScreenY < state.height * 0.9 && videoScreenY > -state.height * 0.35;
      const shouldReset = videoScreenY > state.height * 1.08;

      if (shouldReset && bottomAnimation.started) {
        bottomAnimation.started = false;
        gsap.killTweensOf(bottomAnimation);
        bottomAnimation.progress = 0;
        return;
      }

      if (shouldStart && !bottomAnimation.started) {
        startBottomAnimation();
      }
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
      glyphCache.clear();
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

    function drawWarpedGlyph(stamp, solid, index, total, options = {}) {
      const { canvas: glyphCanvas, width, height } = getGlyphCanvas(stamp.letter, solid, options.color);
      const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
      const opacity = options.opacity ?? (solid ? 1 : Math.max(0, state.ghostOpacity * (0.22 + fade * 0.78)));
      const warpStrength = options.warpStrength ?? (0.28 + fade * 0.72);
      const warpFrequency = options.warpFrequency ?? state.warpFrequency;
      const stripHeight = 1;
      const basePhase = stamp.warpPhase + state.heroWarpPhase + (options.warpPhaseOffset ?? 0);
      const depth = options.depth ?? 0;
      const depthScale = options.scale ?? (1 + depth * 0.08);
      const depthLift = depth * state.fontSize * 0.12;
      const documentY = stamp.y + state.height * 0.18;

      ctx.save();
      ctx.translate(stamp.x, documentY - depthLift);
      if (state.rotateEnabled) ctx.rotate(stamp.rotation);
      if (depthScale !== 1) ctx.scale(depthScale, depthScale);
      ctx.translate(-width * 0.5, -height * 0.5);
      ctx.globalAlpha = opacity;

      for (let y = 0; y < height; y += stripHeight) {
        const sliceH = Math.min(stripHeight, height - y);
        const yNorm = y / height;
        const bendA = Math.sin(yNorm * Math.PI * 2 * warpFrequency + basePhase);
        const bendB = Math.cos(yNorm * Math.PI * warpFrequency * 0.65 - basePhase * 0.7);
        const bend = (bendA * 0.72 + bendB * 0.28) * state.warpAmount * warpStrength;
        ctx.drawImage(glyphCanvas, 0, y * state.dpr, glyphCanvas.width, sliceH * state.dpr, bend, y, width, sliceH + 2);
      }

      ctx.restore();
    }

    function drawStamp(stamp, solid, index, total, options = {}) {
      const documentY = stamp.y + state.height * 0.18;
      const screenY = documentY - state.rawScrollY;
      if (screenY < -state.fontSize * 1.5 || screenY > state.height + state.fontSize * 1.5) return;
      if (state.warpEnabled) {
        drawWarpedGlyph(stamp, solid, index, total, options);
        return;
      }

      ctx.save();
      const depth = options.depth ?? 0;
      const depthScale = options.scale ?? (1 + depth * 0.08);
      const depthLift = depth * state.fontSize * 0.12;
      ctx.translate(stamp.x, documentY - depthLift);
      if (state.rotateEnabled) ctx.rotate(stamp.rotation);
      if (depthScale !== 1) ctx.scale(depthScale, depthScale);
      ctx.font = `900 ${state.fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "miter";
      ctx.lineCap = "square";
      ctx.setLineDash([]);
      if (options.opacity !== undefined) ctx.globalAlpha = options.opacity;

      if (solid) {
        ctx.fillStyle = options.color || state.fillColor;
        ctx.fillText(stamp.letter, 0, 0);
      } else {
        const fade = total <= 1 ? 1 : 1 - index / Math.max(total - 1, 1);
        ctx.strokeStyle = options.color ? hexToRgba(options.color, 1) : hexToRgba(state.ghostColor, state.ghostOpacity * (0.22 + fade * 0.78));
        ctx.lineWidth = state.ghostLineWidth;
        ctx.strokeText(stamp.letter, 0, 0);
      }
      ctx.restore();
    }

    function getHeroWarpOptions() {
      return {
        warpFrequency: state.warpFrequency,
      };
    }

    function drawAnimatedGhostStack(stamp, offsets, opacityMultiplier = 1, yLift = 0, options = {}) {
      const phase = (performance.now() * 0.00042 + stamp.x * 0.0002) % 1;
      for (let i = 5; i >= 1; i -= 1) {
        const slot = 5 - i;
        const age = slot + phase;
        const point = getTopGhostPoint(offsets, age);
        const normalizedAge = age / 5;
        drawStamp(
          { ...stamp, x: stamp.x + point.x, y: stamp.y + point.y - yLift, warpPhase: stamp.warpPhase },
          false,
          i - 1,
          5,
          {
            ...options,
            opacity: Math.pow(1 - normalizedAge, 1.35) * opacityMultiplier,
            warpStrength: 1,
          }
        );
      }

      drawStamp({ ...stamp, y: stamp.y - yLift }, true, 0, 1, {
        ...options,
        opacity: opacityMultiplier,
      });
    }

    function drawScrollCue(opacityMultiplier = 1) {
      const opacity = clamp(opacityMultiplier, 0, 1);
      if (opacity <= 0.001) return;

      const text = "SCROLL";
      const x = state.width * 0.5;
      const y = state.height - 16;
      ctx.save();
      ctx.font = `300 14px "Geist", "Neue Haas Grotesk Text", "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.letterSpacing = "0px";
      ctx.fillStyle = state.fillColor;

      const exit = clamp(scrollCue.exit, 0, 1);
      const fade = heroDismissEase(clamp((exit - 0.82) / 0.18, 0, 1));
      ctx.globalAlpha = opacity * (1 - fade) * 0.9;
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function drawPlacementGrid() {
      if (state.hidePlacementGrid) return;
      if (!state.anchors.length) return;
      const columns = PLACEMENT_GRID_COLUMNS;
      const rows = PLACEMENT_GRID_ROWS;
      const left = state.width * 0.08;
      const width = state.width * 0.84;
      const padY = state.fontSize * 0.55;

      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.font = "500 10px Geist, Helvetica, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      for (let index = 0; index < state.anchors.length - 1; index += 1) {
        const from = state.anchors[index];
        const to = state.anchors[index + 1];
        const top = Math.min(from.y, to.y) + state.height * 0.18 + padY;
        const bottom = Math.max(from.y, to.y) + state.height * 0.18 - padY;
        const height = bottom - top;
        if (height <= 40) continue;

        const screenTop = top - state.rawScrollY;
        const screenBottom = bottom - state.rawScrollY;
        if (screenBottom < -80 || screenTop > state.height + 80) continue;

        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(left, top, width, height);

        ctx.globalAlpha = 0.14;
        for (let column = 1; column < columns; column += 1) {
          const x = left + (width * column) / columns;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
          ctx.stroke();
        }

        for (let row = 1; row < rows; row += 1) {
          const y = top + (height * row) / rows;
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(left + width, y);
          ctx.stroke();
        }

        ctx.globalAlpha = 0.34;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${from.letter}-${to.letter}`, left + 8, top + 8);
      }

      ctx.restore();
    }

    function drawPortalResizeHandles() {
      if (state.hidePlacementGrid) return;
      bottomCtx.save();
      bottomCtx.setLineDash([]);
      const activeResize = portalInteractionState.activePortalDrag?.mode === "resize" ? portalInteractionState.activePortalDrag : null;
      const handleTarget = activeResize || portalInteractionState.hoveredPortalCorner || (portalInteractionState.selectedPortalItem ? { item: portalInteractionState.selectedPortalItem } : null);
      if (handleTarget?.item?.mesh && (handleTarget.item.reveal?.progress ?? 0) > 0.02) {
        const frame = getPortalItemInteractiveFrame(handleTarget.item);
        getPortalFrameCorners(frame).forEach((corner) => {
          const screenY = corner.y - state.rawScrollY;
          if (screenY < -24 || screenY > state.height + 24) return;
          const isActive = corner.corner === handleTarget.corner;
          bottomCtx.globalAlpha = isActive ? 0.96 : 0.62;
          bottomCtx.fillStyle = isActive ? "#ffffff" : "#d8d7d2";
          bottomCtx.strokeStyle = "#000000";
          bottomCtx.lineWidth = isActive ? 2.5 : 1.5;
          bottomCtx.beginPath();
          bottomCtx.arc(corner.x, corner.y, 7, 0, Math.PI * 2);
          bottomCtx.fill();
          bottomCtx.stroke();
        });
        drawPortalLayerToggle(handleTarget.item, frame);
      }
      bottomCtx.restore();
    }

    function drawPortalLayerToggle(item, frame) {
      const button = getPortalLayerToggleRect(frame);
      const screenY = button.y - state.rawScrollY;
      if (screenY < -32 || screenY > state.height + 32) return;
      const isFront = item.layer === "front";
      bottomCtx.save();
      bottomCtx.globalAlpha = 0.9;
      bottomCtx.fillStyle = isFront ? "#ffffff" : "#d8d7d2";
      bottomCtx.strokeStyle = "#000000";
      bottomCtx.lineWidth = 1.5;
      bottomCtx.fillRect(button.x - button.width * 0.5, button.y - button.height * 0.5, button.width, button.height);
      bottomCtx.strokeRect(button.x - button.width * 0.5, button.y - button.height * 0.5, button.width, button.height);
      bottomCtx.fillStyle = "#000000";
      bottomCtx.font = "700 9px Geist, Helvetica, Arial, sans-serif";
      bottomCtx.textAlign = "center";
      bottomCtx.textBaseline = "middle";
      bottomCtx.fillText(isFront ? "BACK" : "FRONT", button.x, button.y + 0.5);
      bottomCtx.restore();
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

    // The ticker remains mounted for GSAP timing, but hidden tabs do no canvas
    // work. This keeps scroll/reveal state available when the tab returns.
    function render() {
      if (document.hidden) {
        state.lastFrameTime = 0;
        return;
      }
      const now = performance.now();
      const minFrameMs = 1000 / TRACE_RENDER_FPS;
      if (state.lastRenderTime && now - state.lastRenderTime < minFrameMs) return;
      state.lastRenderTime = now;
      if (!state.lastFrameTime) state.lastFrameTime = now;
      const dt = now - state.lastFrameTime;
      state.lastFrameTime = now;
      state.heroWarpPhase += dt * state.heroWarpSpeed;
      updateBottomAnimation();
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
      if (pathControlsOpenRef.current || activePathPoint) updatePathEditor();
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

    function onPathPointerDown(event) {
      const target = event.target.closest?.("[data-path-point], [data-stamp-index]");
      if (!target) return;
      activePathPoint = target.dataset.pathPoint
        ? { type: "path", key: target.dataset.pathPoint }
        : { type: "stamp", index: parseInt(target.dataset.stampIndex, 10) };
      target.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }

    function onPathPointerMove(event) {
      if (!activePathPoint) return;
      const worldY = event.clientY + state.scrollY - state.height * 0.18;
      const rawX = clamp(event.clientX / Math.max(1, state.width), 0.02, 0.98);
      const snapColumns = [0.1, 0.5, 0.9];
      const snappedX = snapColumns.reduce((nearest, value) => (Math.abs(value - rawX) < Math.abs(nearest - rawX) ? value : nearest), snapColumns[0]);
      const rawY = getCreativityRawY(worldY);
      const rowGap = (state.height * (state.creativityGapVh / 100)) / Math.max(1, state.creativityBaseHeight);
      const rowBase = state.creativityPath.start.y;
      const snappedRow = Math.round((rawY - rowBase) / Math.max(0.001, rowGap));
      const snappedY = clamp(rowBase + snappedRow * rowGap, 0.02, 0.98);
      if (activePathPoint.type === "path") {
        state.creativityPath[activePathPoint.key] = {
          x: snappedX,
          y: activePathPoint.key === "controlA" || activePathPoint.key === "controlB" ? rawY : snappedY,
        };
      } else {
        const stampCount = "IN-CREATIVITY".length;
        const t = activePathPoint.index / Math.max(1, stampCount - 1);
        const basePoint = cubicPoint(
          state.creativityPath.start,
          state.creativityPath.controlA,
          state.creativityPath.controlB,
          state.creativityPath.end,
          t
        );
        const snapBackDistance = Math.hypot((rawX - basePoint.x) * state.width, (rawY - basePoint.y) * state.creativityBaseHeight);
        if (snapBackDistance < 56) {
          delete state.creativityStampOverrides[activePathPoint.index];
        } else {
          state.creativityStampOverrides[activePathPoint.index] = {
            x: rawX,
            y: rawY,
          };
        }
      }
      queueCreativityPathRebuild(true);
      event.preventDefault();
    }

    function onPathPointerUp() {
      activePathPoint = null;
    }

    function onPathPresetClick(event) {
      applyPathPreset(event.currentTarget.dataset.pathPreset);
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

    inputs.forEach((input) => input.addEventListener("input", rebuildFromControls));
    creativityGapRange?.addEventListener("input", rebuildCreativityFromControls);
    rebuildBtn.addEventListener("click", rebuildLayout);
    portalConfigExportBtn?.addEventListener("click", copyPortalConfig);
    syncControls();
    syncPortalConfigExport();
    loadPortalImages();
    loadBottomVideo();
    gsap.ticker.add(render);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    traceViewport?.addEventListener("pointerdown", portalInteraction.onPointerDown);
    window.addEventListener("pointermove", portalInteraction.onPointerMove);
    window.addEventListener("pointerup", portalInteraction.onPointerUp);
    pathEditor?.addEventListener("pointerdown", onPathPointerDown);
    window.addEventListener("pointermove", onPathPointerMove);
    window.addEventListener("pointerup", onPathPointerUp);
    pathGuidesToggle?.addEventListener("input", updatePathEditor);
    pathExportBtn?.addEventListener("click", syncPathExport);
    pathPresetButtons.forEach((button) => button.addEventListener("click", onPathPresetClick));
    resize();
    render();

    return () => {
      cancelled = true;
      gsap.ticker.remove(render);
      gsap.killTweensOf(state);
      gsap.killTweensOf(bottomAnimation);
      traceViewport?.removeEventListener("pointerdown", portalInteraction.onPointerDown);
      window.removeEventListener("pointermove", portalInteraction.onPointerMove);
      window.removeEventListener("pointerup", portalInteraction.onPointerUp);
      state.portalImages.forEach((item) => gsap.killTweensOf(item.reveal));
      if (state.bottomVideo) gsap.killTweensOf(state.bottomVideo.reveal);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      pathEditor?.removeEventListener("pointerdown", onPathPointerDown);
      window.removeEventListener("pointermove", onPathPointerMove);
      window.removeEventListener("pointerup", onPathPointerUp);
      pathGuidesToggle?.removeEventListener("input", updatePathEditor);
      pathExportBtn?.removeEventListener("click", syncPathExport);
      pathPresetButtons.forEach((button) => button.removeEventListener("click", onPathPresetClick));
      inputs.forEach((input) => input.removeEventListener("input", rebuildFromControls));
      creativityGapRange?.removeEventListener("input", rebuildCreativityFromControls);
      if (pendingCreativityRebuild) cancelAnimationFrame(pendingCreativityRebuild);
      rebuildBtn.removeEventListener("click", rebuildLayout);
      portalConfigExportBtn?.removeEventListener("click", copyPortalConfig);
      glyphCache.clear();
      bottomGhostRenderer.clearCache();
      diagonalGhostRenderer.clearCache();
      state.portalImages.forEach((item) => {
        item.domNode?.remove();
        item.mesh?.parent?.remove(item.mesh);
        item.mesh?.geometry?.dispose();
        item.material?.dispose();
        item.texture?.dispose();
      });
      if (state.bottomVideo) {
        state.bottomVideo.video.pause();
        state.bottomVideo.video.remove();
        state.bottomVideo.video.removeAttribute("src");
        state.bottomVideo.video.load();
        state.bottomVideo.mesh?.parent?.remove(state.bottomVideo.mesh);
        state.bottomVideo.mesh?.geometry?.dispose();
        state.bottomVideo.material?.dispose();
        state.bottomVideo.texture?.dispose();
      }
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
            className={`path-editor${pathControlsOpen ? "" : " is-hidden"}`}
            aria-hidden="true"
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
          <input id="portalRevealDistanceRange" type="range" min="15" max="90" step="1" defaultValue="68" />
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
        <section ref={alphabetSectionRef} className="alphabet-generator" aria-label="Alphabet generator">
          <div className="alphabet-generator__controls" aria-label="Alphabet controls">
            <label className="alphabet-slider">
              <span>Ghost Direction</span>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={alphabetGhostDirection}
                onChange={(event) => setAlphabetGhostDirection(Number(event.target.value))}
              />
            </label>
            <label className="alphabet-slider">
              <span>Warp Chaos</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={alphabetWarpChaos}
                onChange={(event) => setAlphabetWarpChaos(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="alphabet-generator__grid">
            {ALPHABET_LETTERS.map((letter, index) => (
              <AlphabetGlyph
                key={letter}
                letter={letter}
                index={index}
                ghostDirection={alphabetGhostDirection}
                warpChaos={alphabetWarpChaos}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
