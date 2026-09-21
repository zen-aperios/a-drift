import {
  THREE,
  createImageCanvasTexture,
  createPortalMaterial,
  createPortalMesh,
  loadPortalImageUrls,
} from "./portalMedia.js";
import { BOTTOM_VIDEO_URL, INITIAL_PORTAL_IMAGE_LAYOUT } from "./traceConfig.js";

// Owns portal image/video loading, placement rebuilding, and media disposal.
export function createPortalAssetController({
  state,
  cancelled,
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
}) {
  function buildPortalLayout() {
    const cells = getPlacementGridCells();
    if (!cells.length) return;
    const placedFrames = [];
    state.portalImages.forEach((item, index) => {
      const manual = item.manualPlacement;
      const span = manual?.span || (index === 0 ? { columns: 1, rows: 1 } : { columns: 2, rows: 2 });
      const preferredCell = index === 0
        ? cells.find((candidate) => candidate.gapIndex === 0 && candidate.column === 2 && candidate.row === 2)
        : cells.find((candidate) => candidate.gapIndex === 1 + Math.floor((index - 1) / 2) && candidate.column === [0, 2, 4, 1, 3][index % 5] && candidate.row === [0, 2, 1, 3][index % 4]);
      const originCell = manual?.cell
        ? cells.find((candidate) => candidate.gapIndex === manual.cell.gapIndex && candidate.column === manual.cell.column && candidate.row === manual.cell.row)
        : preferredCell || cells[index % cells.length];
      const preferredBlock = originCell ? getPlacementBlock(originCell, span) : null;
      const preferredFrame = preferredBlock ? getPortalFrameForBlock(preferredBlock, item, manual?.stretched) : null;
      const block = preferredBlock && preferredFrame && !placedFrames.some((placedFrame) => framesOverlap(preferredFrame, placedFrame))
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

  async function loadPortalImages() {
    const sources = await loadPortalImageUrls(10);
    if (cancelled()) return;
    state.portalImages = sources.map((src, index) => {
      const initialPlacement = INITIAL_PORTAL_IMAGE_LAYOUT[index];
      const item = {
        src, index, texture: null, mesh: null, material: null, aspect: 0.76,
        layer: initialPlacement?.layer || "back", x: state.width * 0.5, y: 0, width: 220, height: 290,
        reveal: { progress: 0, target: 0 },
      };
      if (initialPlacement) {
        item.manualPlacement = {
          x: item.x, y: item.y, layer: item.layer, span: { ...initialPlacement.span },
          stretched: Boolean(initialPlacement.stretched), cell: { ...initialPlacement.cell },
        };
      }
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        if (cancelled()) return;
        item.aspect = (image.naturalWidth || image.width || 1) / Math.max(1, image.naturalHeight || image.height || 1);
        if (useDomPortalImages) {
          image.className = "trace-dom-media";
          image.alt = "";
          image.draggable = false;
          item.domNode = image;
          (item.layer === "front" ? mediaDomFrontLayer : mediaDomBackLayer).appendChild(image);
        } else {
          item.texture = createImageCanvasTexture(image, mediaBackRenderer.capabilities?.maxTextureSize);
          item.material = createPortalMaterial(item.texture, noiseTexture, state);
          item.mesh = createPortalMesh(item.material);
          mediaBackScene.add(item.mesh);
        }
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
    state.bottomVideo = { video, texture, material, mesh, aspect: 16 / 9, domStyle: {}, lastPlayAttempt: 0, reveal: { progress: 0, target: 0 } };
    video.addEventListener("loadedmetadata", () => {
      if (!cancelled()) state.bottomVideo.aspect = (video.videoWidth || 16) / Math.max(1, video.videoHeight || 9);
    });
    video.addEventListener("canplay", () => { if (!cancelled()) video.play().catch(() => {}); });
    video.play().catch(() => {});
  }

  function dispose() {
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
  }

  return { buildPortalLayout, loadPortalImages, loadBottomVideo, dispose };
}
