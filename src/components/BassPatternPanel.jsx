import React, { useEffect, useState } from "react";
import {
  BASS_PATTERN_PRESETS,
  BASS_SOUND_STYLES,
  LARRY_HEARD_BASS_PATTERNS,
} from "./rhodesChordEngine.js";

const CONTROL_FIELDS = [
  ["volume", "Volume", 0, 1, 0.01],
  ["octave", "Octave", -3, -1, 1],
  ["decay", "Decay", 0.25, 1.2, 0.01],
  ["brightness", "Brightness", 400, 1800, 10],
  ["attack", "Attack", 0.002, 0.08, 0.001],
  ["resonance", "Resonance", 0.3, 10, 0.1],
  ["subMix", "Sub / body", 0, 0.4, 0.01],
  ["transpose", "Transpose", -12, 12, 1],
  ["reverb", "Reverb", 0, 0.6, 0.01],
  ["reverbDecay", "Reverb decay", 0.25, 4, 0.01],
];

export function BassPatternPanel({ engineRef }) {
  const [selectedPattern, setSelectedPattern] = useState(-1);
  const [selectedLarryPattern, setSelectedLarryPattern] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [controls, setControls] = useState({ volume: 1, octave: -2, decay: 1.2, brightness: 980, attack: 0.01, resonance: 1.9, subMix: 0.16, transpose: 12, reverb: 0.6, reverbDecay: 4 });

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return undefined;
    setSelectedPattern(engine.getBassPatternIndex?.() ?? 0);
    setControls(engine.getBassControls?.() ?? controls);
    const unsubscribePattern = engine.subscribeBassPattern?.(setSelectedPattern);
    const unsubscribeControls = engine.subscribeBassControls?.(setControls);
    return () => {
      unsubscribePattern?.();
      unsubscribeControls?.();
    };
  }, [engineRef]);

  function choosePattern(index) {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setBassPattern(index);
    setSelectedPattern(index);
  }

  function changeControl(name, event) {
    const value = Number(event.target.value);
    const engine = engineRef.current;
    if (!engine) return;
    engine.setBassControl(name, value);
    setControls((current) => ({ ...current, [name]: value }));
  }

  function changeStyle(event) {
    const index = Number(event.target.value);
    const engine = engineRef.current;
    if (!engine) return;
    engine.setBassStyle?.(index);
    setSelectedStyle(index);
    setControls(engine.getBassControls?.() ?? controls);
  }

  function chooseNamedPattern(pattern) {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setBassPatternDefinition?.(pattern);
    setSelectedPattern(-1);
    setSelectedLarryPattern(LARRY_HEARD_BASS_PATTERNS.indexOf(pattern));
  }

  return (
    <aside className="bass-pattern-panel" aria-label="Bass pattern controls" data-lenis-prevent>
      <div className="bass-pattern-panel__heading">Bass patterns</div>
      <label className="bass-pattern-panel__style">
        <span>Sound shape</span>
        <select value={selectedStyle} onChange={changeStyle}>
          {BASS_SOUND_STYLES.map(([label], index) => (
            <option key={label} value={index}>{label}</option>
          ))}
        </select>
      </label>
      <div className="bass-pattern-panel__controls">
        {CONTROL_FIELDS.map(([name, label, min, max, step]) => (
          <label key={name} className="bass-pattern-panel__control">
            <span>{label} <output>{name === "octave" ? `${controls[name]} oct` : Number(controls[name]).toFixed(name === "brightness" ? 0 : 2)}</output></span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={controls[name]}
              onChange={(event) => changeControl(name, event)}
            />
          </label>
        ))}
      </div>
      <div className="bass-pattern-panel__grid">
        {BASS_PATTERN_PRESETS.map((pattern, index) => (
          <button
            key={pattern.name}
            type="button"
            className={index === selectedPattern ? "is-active" : ""}
            aria-label={`Use ${pattern.name}`}
            onClick={() => choosePattern(index)}
          >
            {String(index + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
      <div className="bass-pattern-panel__heading bass-pattern-panel__heading--secondary">
        Larry Heard inspired
      </div>
      <div className="bass-pattern-panel__named-list">
        {LARRY_HEARD_BASS_PATTERNS.map((pattern) => (
          <button
            key={pattern.name}
            type="button"
            className={selectedPattern === -1 && LARRY_HEARD_BASS_PATTERNS.indexOf(pattern) === selectedLarryPattern ? "is-active" : ""}
            onClick={() => chooseNamedPattern(pattern)}
          >
            {pattern.name}
          </button>
        ))}
      </div>
    </aside>
  );
}
