import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MiniTrackDropdown, miniInstrumentLabel } from "./MiniTrackDropdown.jsx";
import {
  getSequencerPage,
  getSequencerPageSteps,
  SEQUENCER_PAGE_SIZE,
  shouldFollowSequencerStep,
} from "./sequencerViewState.js";

export function MiniSequencer({
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
    gsap.set(panel, { x: 0, xPercent: -50, force3D: false });

    const timeline = gsap.timeline();
    timeline.to(panel, {
      y: 0,
      yPercent: isOpen ? 0 : 100,
      duration: 0.9,
      ease: "power4.out",
      force3D: false,
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
    if (activeStep >= 0 && visibleTrack && shouldFollowSequencerStep(manualPageOverrides, visibleTrack)) {
      setTrackPages((pages) => ({ ...pages, [visibleTrack]: getSequencerPage(activeStep) }));
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
  const pageStart = stepPage * SEQUENCER_PAGE_SIZE;
  const visibleSteps = getSequencerPageSteps(pattern, stepPage);

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
    setTrackPages((pages) => ({ ...pages, [visibleTrack]: getSequencerPage(step) }));
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
