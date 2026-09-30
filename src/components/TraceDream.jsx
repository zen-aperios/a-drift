import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { FooterClock } from "./footer/FooterClock.jsx";
import { FooterLineField } from "./footer/FooterLineField.jsx";
import { FooterLottie } from "./footer/FooterLottie.jsx";
import { FooterTypeComposer } from "./footer/FooterTypeComposer.jsx";
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
  TRACE_NARROW_LAYOUT_MAX,
} from "./traceConfig.js";

const TRACE_DPR_CAP = 1.25;

const MINI_SEQUENCER_LABELS = {
  kick: "KICK",
  hat: "HAT",
  bass: "BASS",
  bongoLow: "BONGO LOW",
  bongoHigh: "BONGO HIGH",
  clap: "CLAP",
};

function miniInstrumentLabel(instrument) {
  if (instrument?.startsWith("bass:")) return `BASS ${instrument.split(":")[1]}`;
  return MINI_SEQUENCER_LABELS[instrument]
    || instrument.replace(/^[^:]+:/, "").replaceAll("_", " ").toUpperCase();
}

function MiniTrackDropdown({ engine, value, groups, placeholder, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className={`mini-track-dropdown${open ? " is-open" : ""}${!value ? " mini-track-dropdown--add" : ""}`} ref={dropdownRef}>
      <button
        className="mini-track-dropdown__trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value ? miniInstrumentLabel(value) : placeholder}
        {value && <span aria-hidden="true">+</span>}
      </button>
      {open && (
        <div
          className="mini-track-dropdown__menu"
          role="listbox"
          data-lenis-prevent
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.scrollTop += event.deltaY;
            window.requestAnimationFrame(() => {
              const option = document
                .elementFromPoint(event.clientX, event.clientY)
                ?.closest(".mini-track-dropdown__option");
              const instrument = option?.dataset.instrument;
              if (instrument) engine?.previewSequencerInstrument?.(instrument);
            });
          }}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {groups.map((group) => (
            <div className="mini-track-dropdown__group" key={group.label}>
              <div className="mini-track-dropdown__separator">{group.label}</div>
              {group.items.map((option) => (
                <button
                  className={`mini-track-dropdown__option${option === value ? " is-current" : ""}`}
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  data-instrument={option}
                  onMouseEnter={() => engine?.previewSequencerInstrument?.(option)}
                  onFocus={() => engine?.previewSequencerInstrument?.(option)}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {miniInstrumentLabel(option)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniSequencer({
  engine,
  instrumentOptions = [],
  isOpen = false,
  imageGridVisible = false,
  onToggleImageGrid = () => {},
}) {
  const [pattern, setPattern] = useState(() => engine?.getSequencerPattern?.() ?? []);
  const [activeStep, setActiveStep] = useState(-1);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [trackPages, setTrackPages] = useState({});
  const [manualPageOverrides, setManualPageOverrides] = useState({});
  const [editingStep, setEditingStep] = useState(null);
  const [flashingStep, setFlashingStep] = useState(null);
  const [notePitch, setNotePitch] = useState(0);
  const [trackVolume, setTrackVolume] = useState(1);
  const [reverb, setReverb] = useState(0);
  const [reverbDecay, setReverbDecay] = useState(0);
  const [editingTrack, setEditingTrack] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const clickTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelRef.current) return undefined;
    const panel = panelRef.current;
    gsap.killTweensOf(panel);
    gsap.set(panel, { xPercent: -50 });

    const timeline = gsap.timeline();
    timeline.to(panel, {
      yPercent: isOpen ? 0 : 100,
      duration: 0.9,
      ease: "power4.out",
    }, 0);
    timeline.to(panel, {
      opacity: isOpen ? 1 : 0,
      duration: 0.3,
      ease: "power2.out",
    }, 0);

    return () => timeline.kill();
  }, [isOpen]);

  useEffect(() => {
    if (!engine) return undefined;
    setPattern(engine.getSequencerPattern?.() ?? []);
    return engine.subscribeSequencer?.((step, event) => {
      setActiveStep(step);
      setPattern((current) => {
        if (!current.length) return engine.getSequencerPattern?.() ?? [];
        const next = current.slice();
        next[step] = event;
        return next;
      });
    }) ?? undefined;
  }, [engine]);

  const tracks = [];
  pattern.forEach((event) => {
    (Array.isArray(event) ? event : [event]).filter(Boolean).forEach((layer) => {
      if (layer.instrument && layer.instrument !== "stamp:korg" && !tracks.includes(layer.instrument)) {
        tracks.push(layer.instrument);
      }
    });
  });

  const visibleTrack = selectedTrack === "stamp:korg" ? tracks[0] : selectedTrack || tracks[0];
  const displayTracks = visibleTrack && !tracks.includes(visibleTrack)
    ? [...tracks, visibleTrack]
    : tracks;
  const allInstrumentOptions = [...new Set([...instrumentOptions, ...displayTracks])];
  const instrumentGroups = [
    { label: "CORE", items: allInstrumentOptions.filter((item) => !item.includes(":") || item.startsWith("bass:")) },
    { label: "727", items: allInstrumentOptions.filter((item) => item.startsWith("727:")) },
    { label: "808", items: allInstrumentOptions.filter((item) => item.startsWith("808:")) },
    { label: "909", items: allInstrumentOptions.filter((item) => item.startsWith("909:")) },
  ].filter((group) => group.items.length);

  useEffect(() => {
    if (!tracks.includes(selectedTrack) && !instrumentOptions.includes(selectedTrack)) {
      setSelectedTrack(tracks[0] || "");
    }
  }, [instrumentOptions, selectedTrack, tracks.join("|")]);

  useEffect(() => {
    if (activeStep >= 0 && visibleTrack && manualPageOverrides[visibleTrack] === undefined) {
      setTrackPages((pages) => ({ ...pages, [visibleTrack]: Math.floor(activeStep / 16) }));
    }
  }, [activeStep, manualPageOverrides, visibleTrack]);

  useEffect(() => () => {
    window.clearTimeout(clickTimerRef.current);
    window.clearTimeout(flashTimerRef.current);
  }, []);

  useEffect(() => {
    if (editingStep === null) return;
    setNotePitch(engine?.getSequencerStepPitch?.(editingStep, visibleTrack) ?? 0);
  }, [engine, editingStep, visibleTrack, pattern]);

  useEffect(() => {
    setTrackVolume(engine?.getSequencerVolume?.(visibleTrack) ?? 1);
  }, [engine, visibleTrack]);

  useEffect(() => {
    const effect = engine?.getSequencerEffect?.(visibleTrack);
    if (!effect) return;
    setReverb(effect.reverb);
    setReverbDecay(effect.reverbDecay);
  }, [engine, visibleTrack]);

  const stepPage = trackPages[visibleTrack] ?? 0;
  const pageStart = stepPage * 16;
  const visibleSteps = pattern.slice(pageStart, pageStart + 16);

  const toggleStep = (step, isAssigned) => {
    window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      engine?.toggleSequencerInstrument(step, visibleTrack);
      setEditingStep((current) => {
        if (!isAssigned) return step;
        return current === step ? null : current;
      });
    }, 220);
  };

  const editStep = (step, isAssigned) => {
    window.clearTimeout(clickTimerRef.current);
    if (!isAssigned) return;
    setEditingStep(step);
    setFlashingStep(step);
    window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlashingStep(null), 700);
    setTrackPages((pages) => ({ ...pages, [visibleTrack]: Math.floor(step / 16) }));
    setNotePitch(engine?.getSequencerStepPitch?.(step, visibleTrack) ?? 0);
  };

  const exportSequence = () => {
    if (!engine) return;
    const config = {
      bpm: 120,
      pattern: engine.getSequencerPattern?.() ?? [],
      trackLevels: engine.getSequencerVolumes?.() ?? {},
      trackEffects: engine.getSequencerEffects?.() ?? {},
      swing: engine.getSequencerSwing?.() ?? 0,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "a-drift-sequence.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={panelRef}
      className={`mini-sequencer${isOpen ? " is-open" : ""}`}
      aria-label="Live music sequencer"
      aria-hidden={!isOpen}
    >
      <div className="mini-sequencer__header">
        <div className="mini-sequencer__title">SEQUENCER</div>
        <button className="mini-sequencer__export" type="button" onClick={exportSequence}>
          EXP
        </button>
        <button
          className="mini-sequencer__settings"
          type="button"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          SETTINGS
        </button>
        <button
          className={`mini-sequencer__image-grid${imageGridVisible ? " is-active" : ""}`}
          type="button"
          aria-pressed={imageGridVisible}
          onClick={onToggleImageGrid}
        >
          GRID
        </button>
        <span className="mini-sequencer__header-divider" aria-hidden="true" />
        <span className="mini-sequencer__bpm" aria-label="Current tempo">
          <span className="mini-sequencer__bpm-number">120</span>
          <span className="mini-sequencer__bpm-unit">BPM</span>
        </span>
      </div>
      {isOpen && settingsOpen && (
      <>
      <div className="mini-sequencer__tabs" role="tablist" aria-label="Sequencer instruments">
        {displayTracks.map((instrument) => (
          editingTrack === instrument ? (
            <MiniTrackDropdown
              engine={engine}
              key={instrument}
              value={instrument}
              groups={instrumentGroups}
              placeholder="REPLACE"
              onChange={(nextInstrument) => {
                engine?.replaceSequencerTrack(instrument, nextInstrument);
                setSelectedTrack(nextInstrument);
                setEditingTrack(null);
              }}
            />
          ) : (
            <button
              className={`mini-sequencer__tab${visibleTrack === instrument ? " is-selected" : ""}`}
              key={instrument}
              type="button"
              role="tab"
              aria-selected={visibleTrack === instrument}
              onClick={() => setSelectedTrack(instrument)}
              onDoubleClick={() => setEditingTrack(instrument)}
              title="Double-click to replace this track"
            >
              {miniInstrumentLabel(instrument)}
            </button>
          )
        ))}
        <MiniTrackDropdown
          engine={engine}
          value=""
          groups={instrumentGroups.map((group) => ({
            ...group,
            items: group.items.filter((option) => !displayTracks.includes(option)),
          })).filter((group) => group.items.length)}
          placeholder="+ TRACK"
          onChange={(nextInstrument) => setSelectedTrack(nextInstrument)}
        />
      </div>
      {visibleTrack?.startsWith("bass") && (
        <button
          className="mini-sequencer__copy-rhythm"
          type="button"
          onClick={() => {
            const duplicate = engine?.duplicateSequencerTrack?.(visibleTrack);
            if (duplicate) setSelectedTrack(duplicate);
          }}
        >
          COPY RHYTHM
        </button>
      )}
      {editingStep !== null && (
        <div className="mini-sequencer__pitch" aria-label="Selected note pitch">
          <button
            className="mini-sequencer__pitch-button"
            type="button"
            aria-label="Pitch down one semitone"
            disabled={!engine || !visibleTrack || notePitch <= -12}
            onClick={() => {
              const next = engine.setSequencerStepPitch(editingStep, visibleTrack, -1);
              setNotePitch(next);
            }}
          >
            -
          </button>
          <span>{`NOTE ${editingStep + 1}  PITCH ${notePitch >= 0 ? `+${notePitch}` : notePitch}`}</span>
          <button
            className="mini-sequencer__pitch-button"
            type="button"
            aria-label="Pitch up one semitone"
            disabled={!engine || !visibleTrack || notePitch >= 12}
            onClick={() => {
              const next = engine.setSequencerStepPitch(editingStep, visibleTrack, 1);
              setNotePitch(next);
            }}
          >
            +
          </button>
        </div>
      )}
      <div className="mini-sequencer__controls-row">
        <label className="mini-sequencer__volume">
          <span>LEVEL {Math.round(trackVolume * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={trackVolume}
            disabled={!engine || !visibleTrack}
            aria-label={`${visibleTrack || "Instrument"} volume`}
            onChange={(event) => {
              const next = Number(event.target.value);
              setTrackVolume(next);
              engine?.setSequencerVolume(visibleTrack, next);
            }}
          />
        </label>
        <div className="mini-sequencer__effects">
        <label className="mini-sequencer__effect">
          <span>REVERB {Math.round(reverb * 100)}%</span>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.01"
            value={reverb}
            onChange={(event) => {
              const next = Number(event.target.value);
              setReverb(next);
              engine?.setSequencerEffect(visibleTrack, "reverb", next);
            }}
          />
        </label>
        <label className="mini-sequencer__effect">
          <span>DECAY {reverbDecay.toFixed(2)}S</span>
          <input
            type="range"
            min="0"
            max="4"
            step="0.05"
            value={reverbDecay}
            onChange={(event) => {
              const next = Number(event.target.value);
              setReverbDecay(next);
              engine?.setSequencerEffect(visibleTrack, "reverbDecay", next);
            }}
          />
        </label>
        </div>
      </div>
      </>
      )}
      <div className={`mini-sequencer__pager${settingsOpen ? " is-settings-open" : ""}`}>
        <button
          className="mini-sequencer__arrow"
          type="button"
          aria-label="Previous 16 steps"
          disabled={stepPage === 0}
          onClick={() => {
            const nextPage = Math.max(0, stepPage - 1);
            setTrackPages((pages) => ({ ...pages, [visibleTrack]: nextPage }));
            setManualPageOverrides((pages) => ({ ...pages, [visibleTrack]: nextPage }));
          }}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M8.5 1.5 4 6l4.5 4.5" />
          </svg>
        </button>
        {settingsOpen && (
          <span className="mini-sequencer__page" aria-live="polite">
            {String(stepPage + 1).padStart(2, "0")} / 04
          </span>
        )}
        <div className="mini-sequencer__steps" role="tabpanel" aria-label={`${visibleTrack || "Instrument"} steps`}>
        {visibleSteps.map((event, localStep) => {
          const step = pageStart + localStep;
          const layers = Array.isArray(event) ? event : [event];
          const isAssigned = layers.some((layer) => layer?.instrument === visibleTrack);
          return (
            <button
              className={`mini-sequencer__step${isAssigned ? " is-filled" : ""}${activeStep === step ? " is-active" : ""}${editingStep === step ? " is-editing" : ""}${flashingStep === step ? " is-flashing" : ""}`}
              key={`${visibleTrack}-${step}`}
              type="button"
              aria-label={`${isAssigned ? "Remove" : "Add"} ${visibleTrack || "instrument"} on step ${step + 1}`}
              disabled={!engine || !visibleTrack}
              onClick={() => toggleStep(step, isAssigned)}
              onDoubleClick={() => editStep(step, isAssigned)}
            />
          );
        })}
        </div>
        <button
          className="mini-sequencer__arrow"
          type="button"
          aria-label="Next 16 steps"
          disabled={stepPage === 3}
          onClick={() => {
            const nextPage = Math.min(3, stepPage + 1);
            setTrackPages((pages) => ({ ...pages, [visibleTrack]: nextPage }));
            setManualPageOverrides((pages) => ({ ...pages, [visibleTrack]: nextPage }));
          }}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="m3.5 1.5 4.5 4.5-4.5 4.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function TraceDream() {
  const canvasRef = useRef(null);
  const rhodesEngineRef = useRef(null);
  const soundEnabledRef = useRef(false);
  const soundScrollStartedRef = useRef(false);
  const soundScrollPositionRef = useRef(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sequencerOpen, setSequencerOpen] = useState(false);
  const [imageGridVisible, setImageGridVisible] = useState(false);
  const [rhodesEngine, setRhodesEngine] = useState(null);
  const [sequencerInstrumentOptions, setSequencerInstrumentOptions] = useState([]);
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
    const startScrollAudio = () => {
      if (!soundEnabledRef.current) return;
      soundScrollStartedRef.current = true;
      void rhodesChordEngine.startScrollGroove();
    };
    const stopScrollAudio = () => {
      if (!soundScrollStartedRef.current) return;
      soundScrollStartedRef.current = false;
      rhodesChordEngine.stopScrollGroove();
    };
    const startAudioFromWheel = (event) => {
      if (event.deltaY > 0) {
        soundScrollPositionRef.current = Math.max(soundScrollPositionRef.current, 1);
        startScrollAudio();
      }
    };
    window.addEventListener("wheel", startAudioFromWheel, { passive: true });
    const state = createTraceState();
    const setPlacementGridVisibility = (event) => {
      state.hidePlacementGrid = !Boolean(event.detail?.visible);
    };
    window.addEventListener("trace:placement-grid", setPlacementGridVisibility);
    const rhodesChordEngine = createRhodesChordEngine();
    rhodesEngineRef.current = rhodesChordEngine;
    setRhodesEngine(rhodesChordEngine);
    setSequencerInstrumentOptions(rhodesChordEngine.getSequencerInstrumentOptions?.() ?? []);
    const unlockRhodesAudio = (event) => {
      if (event?.type === "wheel") {
        if (event.deltaY > 0) startScrollAudio();
        return;
      }
      void rhodesChordEngine.unlock();
    };
    const audioUnlockEvents = ["pointerdown", "touchstart", "keydown"];
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
      state.fontSize = state.width <= TRACE_NARROW_LAYOUT_MAX
        ? Math.min(160, Math.max(64, state.width * 0.217 - 17))
        : 160;
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
        soundScrollPositionRef.current = state.scrollY;
        if (soundEnabledRef.current) startScrollAudio();
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
      setRhodesEngine(null);
      setSequencerInstrumentOptions([]);
      window.removeEventListener("wheel", startAudioFromWheel);
      window.removeEventListener("trace:placement-grid", setPlacementGridVisibility);
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
      <div className="hero-top-bar">
        <div className="hero-lottie">
          <FooterLottie />
        </div>
        <div className="rhodes-audio-control">
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
                // Restart from a clean state so the toggle works at any scroll position.
                soundScrollStartedRef.current = false;
                engine.stopScrollGroove();
                soundScrollStartedRef.current = true;
                void engine.startScrollGroove();
              } else if (engine) {
                soundScrollStartedRef.current = false;
                engine.stopScrollGroove();
              }
            }}
          >
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>
        </div>
      </div>
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
      <FooterTypeComposer />
      <footer className="site-footer" aria-label="Footer grid">
        <div className="site-footer__grid">
          <span className="site-footer__lottie-cell" aria-hidden="true" />
          <FooterLineField />
          <MiniSequencer
            engine={rhodesEngine}
            instrumentOptions={sequencerInstrumentOptions}
            isOpen={sequencerOpen}
            imageGridVisible={imageGridVisible}
            onToggleImageGrid={() => {
              const visible = !imageGridVisible;
              setImageGridVisible(visible);
              window.dispatchEvent(new CustomEvent("trace:placement-grid", {
                detail: { visible },
              }));
            }}
          />
        </div>
        <div className="site-footer__bottom-row">
          <button
            className="site-footer__label site-footer__sequencer-toggle"
            type="button"
            aria-expanded={sequencerOpen}
            onClick={() => setSequencerOpen((open) => !open)}
          >
            SEQUENCER
          </button>
          <span className="site-footer__time"><FooterClock /></span>
        </div>
      </footer>
    </section>
  );
}
