import {
  BASS_PATTERN_PRESETS,
} from "../audio/patterns/bassPatterns.js";
import { createDefaultSequencerPattern } from "../audio/patterns/defaultPattern.js";
import { getVisibleSequencerLayers } from "../audio/patterns/patternVisibility.js";
import { SAMPLE_URLS } from "../audio/engine/sampleRegistry.js";
import { createTrackState } from "../audio/engine/trackState.js";
import { createEffectsGraph } from "../audio/engine/effectsGraph.js";
import { createSynthVoices, midiToFrequency } from "../audio/engine/synthVoices.js";
import { createSamplePlayer } from "../audio/engine/samplePlayer.js";
import { createSequencerTransport } from "../audio/engine/sequencerTransport.js";

export {
  BASS_PATTERN_PRESETS,
  LARRY_HEARD_BASS_PATTERNS,
} from "../audio/patterns/bassPatterns.js";

const CHORDS = [
  // P: Em9
  [40, 47, 50, 54, 59],
  // E: A13
  [45, 52, 55, 59, 64],
  // R: D9
  [38, 45, 48, 52, 57],
  // I: Gmaj9
  [43, 50, 54, 57, 62],
  // O: Cmaj9
  [36, 43, 47, 50, 59],
  // S: B7, resolving back toward E
  [35, 42, 45, 49, 54],
];

export const CHORD_PROGRESSION_OPTIONS = [
  ["Late night", [0, 1, 2, 3, 4, 5]],
  ["Deep minor", [1, 2, 4, 0, 3, 5]],
  ["Soul lift", [3, 4, 0, 1, 5, 2]],
  ["Suspended return", [2, 3, 1, 4, 0, 5]],
  ["After hours", [4, 2, 0, 5, 3, 1]],
  ["Minor 9 / Maj 9", [0, 3, 0, 3, 0, 3]],
];

const korgSoftChordFMinor = "korgSoftChordFMinor";
const korgSoftChordHighFMinor = "korgSoftChordHighFMinor";
const DEFAULT_STAMP_INSTRUMENT = korgSoftChordFMinor;
const DEFAULT_STAMP_INSTRUMENT_PATTERN = [korgSoftChordFMinor, korgSoftChordHighFMinor];

export const BASS_SOUND_STYLES = [
  ["Deep sine", { waveform: "sine", bodyWaveform: "triangle", attack: 0.008, resonance: 0.7, subMix: 0.2 }],
  ["Round triangle", { waveform: "triangle", bodyWaveform: "sine", attack: 0.012, resonance: 0.9, subMix: 0.15 }],
  ["Soft saw", { waveform: "sawtooth", bodyWaveform: "sine", attack: 0.018, resonance: 0.8, subMix: 0.1 }],
  ["Muted saw", { waveform: "sawtooth", bodyWaveform: "triangle", attack: 0.025, resonance: 1.2, subMix: 0.08 }],
  ["House pluck", { waveform: "square", bodyWaveform: "sine", attack: 0.003, resonance: 1.8, subMix: 0.05 }],
  ["Rubber bass", { waveform: "triangle", bodyWaveform: "square", attack: 0.006, resonance: 2.4, subMix: 0.12 }],
  ["Warm octave", { waveform: "sine", bodyWaveform: "sawtooth", attack: 0.02, resonance: 0.65, subMix: 0.28 }],
  ["Acid edge", { waveform: "sawtooth", bodyWaveform: "square", attack: 0.004, resonance: 7, subMix: 0.04 }],
  ["Sub pulse", { waveform: "square", bodyWaveform: "sine", attack: 0.01, resonance: 1.4, subMix: 0.22 }],
  ["Glass low", { waveform: "sine", bodyWaveform: "square", attack: 0.03, resonance: 3.2, subMix: 0.08 }],
  ["Velvet bass", { waveform: "triangle", bodyWaveform: "triangle", attack: 0.04, resonance: 0.55, subMix: 0.18 }],
  ["Night drive", { waveform: "sawtooth", bodyWaveform: "sine", attack: 0.01, resonance: 3.8, subMix: 0.16 }],
];

const DEFAULT_SEQUENCER_PATTERN = createDefaultSequencerPattern();
const PERCUSSION_INSTRUMENTS = new Set(["kick", "hat", "clap", "bongoLow"]);

function isPercussionInstrument(instrument) {
  return PERCUSSION_INSTRUMENTS.has(instrument)
    || instrument?.startsWith("727:")
    || instrument?.startsWith("808:")
    || instrument?.startsWith("909:");
}

function isBassInstrument(instrument) {
  return instrument === "bass" || instrument?.startsWith("bass:");
}

function isStampTrack(instrument) {
  return instrument?.startsWith("stamp:");
}

// Match sample-based stamp sounds to the root of each chord in the same bank.
const STAMP_CHORD_RATES = CHORDS.map((chord) => 2 ** ((chord[0] - CHORDS[0][0]) / 12));
// Index 0 is A, which stays silent; indices 1-6 are P-E-R-I-O-S.
const STAMP_CHORD_PATTERN = [0, 0, 1, 2, 3, 4, 5];
const BASS_ROOTS = [40, 45, 38, 43, 36, 35];
// A 32-step pattern: three bongo hits in each 16-step half, with empty steps
// between them so the phrase keeps its space.
const BONGO_PATTERN = [
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, null, null, null,
  null, 0.84, 0.84, 1.48,
];
const BONGO_HIT_OFFSETS = [0.1, 0.16, 0.11];
const BONGO_HIT_LEVELS = [0.38, 0.32, 0.39];
const BONGO_PHRASE_VARIATIONS = [0, 0.018, -0.012, 0.024];

function eventLayers(event) {
  if (!event) return [];
  return (Array.isArray(event) ? event : [event]).filter(Boolean);
}

function clonePatternEvent(event) {
  if (Array.isArray(event)) return event.map((layer) => ({ ...layer }));
  return event && { ...event };
}

// Lightweight synthesized Rhodes voicing. It avoids shipping audio assets while
// keeping the landing cue warm, short, and quiet enough to layer over scrolling.
export function createRhodesChordEngine() {
  let audioContext;
  let masterGain;
  let disposed = false;
  let pendingUnlock = null;
  const grooveStepDuration = 60 / 120 / 4;
  let sequencerPattern = DEFAULT_SEQUENCER_PATTERN.map(clonePatternEvent);
  const sequencerListeners = new Set();
  const trackState = createTrackState();
  const sequencerSwingListeners = new Set();
  let sequencerSwing = 0.18;
  let stampInstrument = DEFAULT_STAMP_INSTRUMENT;
  let stampInstrumentPattern = DEFAULT_STAMP_INSTRUMENT_PATTERN.slice();
  let postStampKeysEnabled = false;
  let postStampCycleStartStep = 0;
  let bassPatternIndex = -1;
  const bassControls = {
    volume: 1,
    octave: -2,
    decay: 1.2,
    brightness: 980,
    waveform: "sine",
    bodyWaveform: "triangle",
    attack: 0.01,
    resonance: 1.9,
    subMix: 0.16,
    transpose: 12,
    reverb: 0.6,
    reverbDecay: 4,
  };
  const stampListeners = new Set();
  let chordProgressionIndex = 0;
  const chordProgressionListeners = new Set();
  const bassPatternListeners = new Set();
  const bassControlListeners = new Set();
  const effectsGraph = createEffectsGraph({
    getTrackEffect: trackState.getEffect,
    setTrackEffect: trackState.setEffect,
    getBassSettings: () => bassControls,
  });
  const synthVoices = createSynthVoices({
    chords: CHORDS,
    bassRoots: BASS_ROOTS,
    getOutput: () => masterGain,
    getBassControls: () => bassControls,
    getBassReverbInput: effectsGraph.getBassReverbInput,
    connectReverb: effectsGraph.connect,
  });
  const samplePlayer = createSamplePlayer({
    sampleUrls: SAMPLE_URLS,
    getContext,
    getOutput: () => masterGain,
    getDefaultReverbInput: effectsGraph.getBassReverbInput,
    connectReverb: effectsGraph.connect,
    unlock,
    isDisposed: () => disposed,
  });
  const transport = createSequencerTransport({
    getContext,
    unlock,
    isDisposed: () => disposed,
    getPattern: () => sequencerPattern,
    getSwing: () => sequencerSwing,
    isSampleInstrument: (instrument) => Boolean(SAMPLE_URLS[instrument]),
    loadSample,
    playStep: playSequencerSound,
    schedulePostStamp,
    notifyStep: notifySequencer,
  });

  function getSequencerEffect(instrument) {
    return trackState.getEffect(instrument);
  }

  function getSequencerReverbBus(instrument) {
    return effectsGraph.getTrackReverbBus(instrument);
  }

  function setSequencerEffect(instrument, name, value) {
    effectsGraph.updateTrackEffect(instrument, name, value);
  }

  function getSequencerEffects() {
    return trackState.getEffects();
  }

  function getContext() {
    if (audioContext || typeof window === "undefined") return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.34;
    masterGain.connect(audioContext.destination);
    effectsGraph.initialize(audioContext, masterGain);
    return audioContext;
  }

  function unlock() {
    const context = getContext();
    if (!context || disposed || context.state === "running") return Promise.resolve();
    if (!pendingUnlock) {
      pendingUnlock = context.resume()
        .catch(() => {})
        .finally(() => {
          pendingUnlock = null;
        });
    }
    loadSample("synthChord");
    return pendingUnlock;
  }

  function playPercussion(step) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      unlock().then(() => {
        if (context.state === "running") playPercussion(step);
      });
      return;
    }
    synthVoices.playPercussion(context, step);
  }

  function playNoiseHit(context, time, frequency, decay, level, volume = 1, reverbInput = effectsGraph.getBassReverbInput(), reverbSend = 0.32) {
    synthVoices.playNoiseHit(context, time, frequency, decay, level, volume, reverbInput, reverbSend);
  }

  function playPercTone(context, time, frequency, decay, type, level) {
    synthVoices.playPercTone(context, time, frequency, decay, type, level);
  }

  function playKick(context, time, volume = 1, reverbSend = 0, reverbInput = effectsGraph.getBassReverbInput()) {
    synthVoices.playKick(context, time, volume, reverbSend, reverbInput);
  }

  async function loadSample(id) {
    return samplePlayer.load(id);
  }

  async function playSample(
    id,
    { time = null, rate = 1, gainLevel = null, reverbSend = 0, reverbInput = effectsGraph.getBassReverbInput() } = {}
  ) {
    return samplePlayer.play(id, {
      time,
      rate,
      gainLevel,
      reverbSend,
      reverbInput,
    });
  }

  function playStampChord(index) {
    if (index <= 0) return;
    const stampStep = index - 1;
    const progression = CHORD_PROGRESSION_OPTIONS[chordProgressionIndex][1];
    const patternIndex = progression[stampStep % progression.length];
    const stampSound = stampInstrumentPattern[stampStep % stampInstrumentPattern.length] || stampInstrument;
    if (stampSound === "pad" || stampSound === "stab") {
      playChord(patternIndex);
      return;
    }
    const rate = stampInstrumentPattern.length > 1 ? 1 : STAMP_CHORD_RATES[patternIndex];
    playStampInstrument(rate, stampSound);
  }

  function previewStampChord(index = 1) {
    playStampChord(index);
  }

  function playStampInstrument(rate = 1, instrument = stampInstrument, time = null, reverbSend = 0) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      unlock().then(() => playStampInstrument(rate, instrument, time, reverbSend));
      return;
    }
    if (instrument === "synthChord") {
      playSample("synthChord", {
        time,
        rate,
        gainLevel: 0.52,
        reverbSend,
      });
      return;
    }
    if (SAMPLE_URLS[instrument]) {
      playSample(instrument, {
        time,
        rate,
        gainLevel: 0.46,
        reverbSend,
      });
      return;
    }
    playSound(stampInstrument);
  }

  function playSequencerSound(context, event, time, step) {
    eventLayers(event).forEach((layer) => {
      if (layer.muted) return;
      if (layer.startupOnly && postStampKeysEnabled) return;
      if (layer.autoOnly && !postStampKeysEnabled) return;
      const volume = getSequencerVolume(layer.instrument);
      const notePitch = Number(layer.pitchOffset) || 0;
      const sequencerEffect = getSequencerEffect(layer.instrument);
      const sequencerReverbBus = getSequencerReverbBus(layer.instrument);
      const sequencerReverbSend = sequencerEffect.reverb * 0.32;
      const isPercussive = layer.instrument !== "kick"
        && layer.instrument !== "hat"
        && layer.instrument !== "clap"
        && !layer.instrument.toLowerCase().includes("chord");
      const groovePhase = step % 4;
      const grooveAccent = isPercussive
        ? 1 + ([0.08, -0.04, 0.03, -0.07][groovePhase] * sequencerSwing * 2)
        : 1;
      const grooveTime = isPercussive && groovePhase === 3
        ? time - grooveStepDuration * sequencerSwing * 0.06
        : time;
      if (isStampTrack(layer.instrument)) {
        const stampVariant = layer.instrument.slice("stamp:".length);
        if (stampVariant === "korg") {
          const stampSound = stampInstrumentPattern[Math.floor(step / 16) % stampInstrumentPattern.length] || stampInstrument;
          playStampInstrument(1, stampSound, time, sequencerReverbSend);
        } else {
          playChord(Math.floor(step / 16), {
            variant: stampVariant === "stamp" ? "classic" : stampVariant.replace("rhodes", "").toLowerCase(),
            time,
            duration: 3.6,
            volume,
            reverbInput: sequencerReverbBus?.input,
            reverbSend: sequencerReverbSend,
          });
        }
        return;
      }
      if (layer.instrument === "kick") {
        playKick(context, time, volume, sequencerReverbSend, sequencerReverbBus?.input);
        return;
      }
      if (layer.instrument === "hat") {
        playNoiseHit(context, grooveTime + 0.008, 8200, 0.055, 0.06, volume * grooveAccent, sequencerReverbBus?.input, sequencerReverbSend);
        return;
      }
      if (layer.instrument === "clap") {
        playNoiseHit(context, grooveTime + 0.01, 2200, 0.12, 0.1, volume * grooveAccent, sequencerReverbBus?.input, sequencerReverbSend);
        return;
      }
      if (isBassInstrument(layer.instrument)) {
        playBassNote(
          step % BASS_ROOTS.length,
          grooveTime,
          volume * grooveAccent,
          (layer.pitch || 0) + notePitch,
          sequencerReverbBus?.input,
          sequencerReverbSend,
        );
        return;
      }
      playSample(layer.instrument, {
        time: grooveTime + (layer.instrument === "bongoLow" ? 0.01 : 0),
        rate: (layer.rate || 1) * (2 ** (notePitch / 12)),
        gainLevel: (layer.gainLevel || 0.28) * volume * grooveAccent,
        reverbSend: sequencerReverbSend,
        reverbInput: sequencerReverbBus?.input,
      });
    });
    void step;
  }

  function notifySequencer(step, event) {
    const visibleLayers = getVisibleSequencerLayers(event, postStampKeysEnabled);
    const visibleEvent = visibleLayers.length === 1
      ? { ...visibleLayers[0] }
      : visibleLayers.length ? visibleLayers.map((layer) => ({ ...layer })) : null;
    sequencerListeners.forEach((listener) => listener(step, visibleEvent));
  }

  function setSequencerStep(step, instrument, layerIndex = 0) {
    const normalizedStep = ((step % 64) + 64) % 64;
    const layers = eventLayers(sequencerPattern[normalizedStep]);
    if (!instrument) {
      layers.splice(layerIndex, 1);
    } else {
      layers[layerIndex] = { instrument };
    }
    sequencerPattern[normalizedStep] = layers.length ? layers : null;
    notifySequencer(normalizedStep, sequencerPattern[normalizedStep]);
  }

  function toggleSequencerInstrument(step, instrument) {
    if (!instrument) return;
    const normalizedStep = ((step % 64) + 64) % 64;
    const layers = eventLayers(sequencerPattern[normalizedStep]).map((layer) => ({ ...layer }));
    const existingIndex = layers.findIndex((layer) => layer.instrument === instrument);
    if (existingIndex >= 0) layers.splice(existingIndex, 1);
    else layers.push({ instrument });
    sequencerPattern[normalizedStep] = layers.length ? layers : null;
    notifySequencer(normalizedStep, sequencerPattern[normalizedStep]);
  }

  function setSequencerStepPitch(step, instrument, direction) {
    if (!instrument) return 0;
    const normalizedStep = ((step % 64) + 64) % 64;
    const layers = eventLayers(sequencerPattern[normalizedStep]).map((layer) => ({ ...layer }));
    const layer = layers.find((item) => item.instrument === instrument);
    if (!layer) return 0;
    const current = Number(layer.pitchOffset) || 0;
    layer.pitchOffset = Math.max(-12, Math.min(12, current + (direction < 0 ? -1 : 1)));
    sequencerPattern[normalizedStep] = layers.length === 1 ? layers[0] : layers;
    notifySequencer(normalizedStep, sequencerPattern[normalizedStep]);
    return layer.pitchOffset;
  }

  function getSequencerStepPitch(step, instrument) {
    const normalizedStep = ((step % 64) + 64) % 64;
    const layer = eventLayers(sequencerPattern[normalizedStep]).find((item) => item.instrument === instrument);
    return Number(layer?.pitchOffset) || 0;
  }

  function duplicateSequencerTrack(instrument) {
    if (!isBassInstrument(instrument)) return null;
    const existingTracks = new Set();
    sequencerPattern.forEach((event) => eventLayers(event).forEach((layer) => existingTracks.add(layer.instrument)));
    let suffix = 2;
    let duplicate = `bass:${suffix}`;
    while (existingTracks.has(duplicate)) {
      suffix += 1;
      duplicate = `bass:${suffix}`;
    }
    sequencerPattern = sequencerPattern.map((event) => {
      const layers = eventLayers(event).map((layer) => ({ ...layer }));
      const source = layers.find((layer) => layer.instrument === instrument);
      if (source) layers.push({ ...source, instrument: duplicate });
      return layers.length === 1 ? layers[0] : layers.length ? layers : null;
    });
    sequencerPattern.forEach((event, step) => notifySequencer(step, event));
    return duplicate;
  }

  function replaceSequencerTrack(fromInstrument, toInstrument) {
    if (!fromInstrument || !toInstrument || fromInstrument === toInstrument || !SAMPLE_URLS[toInstrument]
      && !["kick", "hat", "clap", "bass"].includes(toInstrument)
      && !isStampTrack(toInstrument)) return;
    sequencerPattern = sequencerPattern.map((event) => {
      const layers = eventLayers(event).map((layer) => {
        const replaced = layer.instrument === fromInstrument;
        const nextLayer = {
          ...layer,
          instrument: replaced ? toInstrument : layer.instrument,
        };
        if (replaced) {
          delete nextLayer.muted;
          delete nextLayer.startupOnly;
          delete nextLayer.autoOnly;
        }
        return nextLayer;
      });
      const deduped = layers.filter((layer, index, all) => (
        all.findIndex((candidate) => candidate.instrument === layer.instrument) === index
      ));
      return deduped.length === 1 ? deduped[0] : deduped.length ? deduped : null;
    });
    sequencerPattern.forEach((event, step) => notifySequencer(step, event));
  }

  function getSequencerInstrumentOptions() {
    return [...new Set(["kick", "hat", "bass", ...Object.keys(SAMPLE_URLS)])];
  }

  function setSequencerPattern(pattern) {
    sequencerPattern = Array.from({ length: 64 }, (_, index) => {
      const event = pattern?.[index];
      return event ? eventLayers(event).map((layer) => ({ ...layer })) : null;
    });
    sequencerPattern.forEach((event, step) => notifySequencer(step, event));
  }

  function applyBassPattern(selectedPattern, selectedIndex = -1) {
    sequencerPattern = sequencerPattern.map((event) => {
      const remainingLayers = eventLayers(event).filter((layer) => layer.instrument !== "bass");
      if (!remainingLayers.length) return null;
      return remainingLayers.length === 1 ? remainingLayers[0] : remainingLayers;
    });
    selectedPattern.steps.forEach((isActive, step) => {
      if (!isActive) return;
      const layers = eventLayers(sequencerPattern[step]).map((layer) => ({ ...layer }));
      layers.push({ instrument: "bass", pitch: selectedPattern.pitch?.[step] || 0 });
      sequencerPattern[step] = layers;
    });
    bassPatternIndex = selectedIndex;
    sequencerPattern.forEach((event, step) => notifySequencer(step, event));
    bassPatternListeners.forEach((listener) => listener(bassPatternIndex));
  }

  function setBassPattern(index) {
    const normalizedIndex = ((Number(index) || 0) % BASS_PATTERN_PRESETS.length + BASS_PATTERN_PRESETS.length)
      % BASS_PATTERN_PRESETS.length;
    applyBassPattern(BASS_PATTERN_PRESETS[normalizedIndex], normalizedIndex);
  }

  function setBassPatternDefinition(pattern) {
    if (pattern?.steps) applyBassPattern(pattern, -1);
  }

  function getBassPatternIndex() {
    return bassPatternIndex;
  }

  function subscribeBassPattern(listener) {
    bassPatternListeners.add(listener);
    return () => bassPatternListeners.delete(listener);
  }

  function getBassControls() {
    return { ...bassControls };
  }

  function setBassControl(name, value) {
    if (!(name in bassControls)) return;
    const ranges = {
      volume: [0, 1],
      octave: [-3, -1],
      decay: [0.25, 1.2],
      brightness: [400, 1800],
      attack: [0.002, 0.08],
      resonance: [0.3, 10],
      subMix: [0, 0.4],
      transpose: [-12, 12],
      reverb: [0, 0.6],
      reverbDecay: [0.25, 4],
    };
    const [min, max] = ranges[name];
    bassControls[name] = Math.max(min, Math.min(max, Number(value)));
    if (name === "reverb") effectsGraph.setBassReverbLevel(bassControls.reverb);
    if (name === "reverbDecay") effectsGraph.refreshBassReverbImpulse();
    bassControlListeners.forEach((listener) => listener(getBassControls()));
  }

  function setBassStyle(index) {
    const style = BASS_SOUND_STYLES[((Number(index) || 0) % BASS_SOUND_STYLES.length + BASS_SOUND_STYLES.length) % BASS_SOUND_STYLES.length];
    Object.assign(bassControls, style[1]);
    bassControlListeners.forEach((listener) => listener(getBassControls()));
  }

  function subscribeBassControls(listener) {
    bassControlListeners.add(listener);
    return () => bassControlListeners.delete(listener);
  }

  function setSequencerLayerRate(step, layerIndex, direction) {
    const normalizedStep = ((step % 64) + 64) % 64;
    const layers = eventLayers(sequencerPattern[normalizedStep]).map((layer) => ({ ...layer }));
    const layer = layers[layerIndex];
    if (!layer) return;
    const currentRate = Number(layer.rate) || 1;
    const semitone = 2 ** (1 / 12);
    layer.rate = direction < 0 ? currentRate / semitone : currentRate * semitone;
    sequencerPattern[normalizedStep] = layers;
    notifySequencer(normalizedStep, layers);
  }

  function getSequencerPattern() {
    return sequencerPattern.map((step) => {
      const visibleLayers = getVisibleSequencerLayers(step, postStampKeysEnabled);
      if (visibleLayers.length === 1) return { ...visibleLayers[0] };
      return visibleLayers.length ? visibleLayers.map((layer) => ({ ...layer })) : null;
    });
  }

  function subscribeSequencer(listener) {
    sequencerListeners.add(listener);
    return () => sequencerListeners.delete(listener);
  }

  function setSequencerVolume(instrument, volume) {
    trackState.setVolume(instrument, volume);
  }

  function getSequencerVolume(instrument) {
    return trackState.getVolume(instrument);
  }

  function getSequencerVolumes() {
    return trackState.getVolumes();
  }

  function subscribeSequencerVolume(listener) {
    return trackState.subscribeVolume(listener);
  }

  function setSequencerSwing(value) {
    sequencerSwing = Math.max(0, Math.min(0.5, Number(value) || 0));
    sequencerSwingListeners.forEach((listener) => listener(sequencerSwing));
  }

  function getSequencerSwing() {
    return sequencerSwing;
  }

  function subscribeSequencerSwing(listener) {
    sequencerSwingListeners.add(listener);
    return () => sequencerSwingListeners.delete(listener);
  }

  function setStampInstrument(instrument) {
    if (!instrument || !SAMPLE_URLS[instrument]) return;
    stampInstrument = instrument;
    stampInstrumentPattern = [instrument];
    stampListeners.forEach((listener) => listener(stampInstrument));
  }

  function setKorgStampPattern() {
    stampInstrumentPattern = DEFAULT_STAMP_INSTRUMENT_PATTERN.slice();
    stampInstrument = DEFAULT_STAMP_INSTRUMENT;
    stampListeners.forEach((listener) => listener(stampInstrument));
  }

  function getStampInstrumentPattern() {
    return stampInstrumentPattern.slice();
  }

  function getStampInstrument() {
    return stampInstrument;
  }

  function subscribeStampInstrument(listener) {
    stampListeners.add(listener);
    return () => stampListeners.delete(listener);
  }

  function setChordProgression(index) {
    chordProgressionIndex = Math.max(0, Math.min(CHORD_PROGRESSION_OPTIONS.length - 1, index));
    chordProgressionListeners.forEach((listener) => listener(chordProgressionIndex));
  }

  function getChordProgression() {
    return chordProgressionIndex;
  }

  function subscribeChordProgression(listener) {
    chordProgressionListeners.add(listener);
    return () => chordProgressionListeners.delete(listener);
  }

  async function previewSequencerStep(step) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      await unlock();
      if (context.state !== "running") return;
    }
    const normalizedStep = ((step % sequencerPattern.length) + sequencerPattern.length) % sequencerPattern.length;
    playSequencerSound(context, sequencerPattern[normalizedStep], context.currentTime + 0.01, normalizedStep);
  }

  function playBassNote(
    index,
    scheduledTime = null,
    volume = 1,
    pitch = 0,
    reverbInput = effectsGraph.getBassReverbInput(),
    reverbSend = bassControls.reverb * 0.32,
  ) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      unlock().then(() => {
        if (context.state === "running") playBassNote(index, scheduledTime, volume, pitch, reverbInput, reverbSend);
      });
      return;
    }
    synthVoices.playBassNote(
      context,
      index,
      scheduledTime,
      volume,
      pitch,
      reverbInput,
      reverbSend,
    );
  }

  function schedulePostStamp({ step, patternStep, patternLength, time }) {
    const halfPattern = Math.max(1, Math.floor(patternLength / 2));
    if (!postStampKeysEnabled
      || (patternStep !== 0 && patternStep !== halfPattern)
      || !stampInstrumentPattern.length) return;
    const cycleIndex = Math.floor(
      Math.max(0, step - postStampCycleStartStep) / halfPattern
    );
    const cycleInstrument = stampInstrumentPattern[cycleIndex % stampInstrumentPattern.length];
    const fullCycleIndex = Math.floor(step / patternLength);
    const reverbSend = fullCycleIndex >= 1 ? bassControls.reverb * 0.32 : 0;
    playStampInstrument(1, cycleInstrument, time, reverbSend);
  }

  async function startScrollGroove() {
    return transport.start();
  }

  function stopScrollGroove() {
    transport.stop();
  }

  function enablePostStampKeys() {
    postStampKeysEnabled = true;
    postStampCycleStartStep = transport.getStep();
    sequencerPattern.forEach((event, step) => notifySequencer(step, event));
  }

  function disablePostStampKeys() {
    postStampKeysEnabled = false;
    sequencerPattern.forEach((event, step) => notifySequencer(step, event));
  }

  async function playSound(id, step = 0, preview = false) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      await unlock();
      if (context.state === "running") playSound(id, step, preview);
      return;
    }
    if (SAMPLE_URLS[id]) {
      playSample(id, preview ? { gainLevel: 0.1 } : undefined);
      return;
    }
    const time = context.currentTime + 0.01;
    const previewGain = preview ? 0.25 : 1;
    if (id === "kick") playKick(context, time, previewGain);
    else if (id === "rim") playPercTone(context, time, 1800, 0.075, "square", 0.12 * previewGain);
    else if (id === "clap") playNoiseHit(context, time, 2400, 0.13, 0.24, previewGain);
    else if (id === "hat") playNoiseHit(context, time, 7800, 0.045, 0.14, previewGain);
    else if (id === "openHat") playNoiseHit(context, time, 6200, 0.24, 0.13, previewGain);
    else if (id === "shaker") playNoiseHit(context, time, 9200, 0.07, 0.10, previewGain);
    else if (id === "clave") playPercTone(context, time, 2200, 0.08, "square", 0.10 * previewGain);
    else if (id === "congaLow") playPercTone(context, time, 165, 0.36, "triangle", 0.18 * previewGain);
    else if (id === "congaHigh") playPercTone(context, time, 330, 0.18, "triangle", 0.15 * previewGain);
    else if (id === "cowbell") playPercTone(context, time, 760, 0.18, "square", 0.12 * previewGain);
    else if (id === "agogo") playPercTone(context, time, 1040, 0.2, "triangle", 0.12 * previewGain);
    else if (id === "bass") playBassNote(step % BASS_ROOTS.length, null, previewGain);
    else if (id === "stab") playChord(step);
    else if (id === "pad") playChord(step + 1);
    else if (id === "synthChord") playSample("synthChord", { gainLevel: 0.12 * previewGain });
    else if (id === "pluck") playPercTone(context, time, midiToFrequency(60 + (step % 5) * 2), 0.28, "sine", 0.13 * previewGain);
    else if (id === "noise") playNoiseHit(context, time, 1200, 0.52, 0.06, previewGain);
  }

  function previewSequencerInstrument(instrument) {
    if (isBassInstrument(instrument)) {
      playBassNote(0, null, getSequencerVolume(instrument) * 0.25);
      return;
    }
    playSound(instrument, 0, true);
  }

  function playChord(
    index,
    {
      variant = "classic",
      time = null,
      duration = 15.5,
      volume = 1,
      reverbInput = effectsGraph.getBassReverbInput(),
      reverbSend = bassControls.reverb * 0.32,
    } = {},
  ) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      unlock().then(() => {
        if (context.state === "running") playChord(index, {
          variant, time, duration, volume, reverbInput, reverbSend,
        });
      });
      return;
    }
    synthVoices.playChord(context, index, {
      variant,
      time,
      duration,
      volume,
      reverbInput,
      reverbSend,
    });
  }

  function dispose() {
    disposed = true;
    transport.dispose();
    effectsGraph.dispose();
    synthVoices.dispose();
    samplePlayer.dispose();
    if (audioContext) audioContext.close().catch(() => {});
    audioContext = null;
    masterGain = null;
  }

  return {
    unlock,
    playChord,
    playStampChord,
    previewStampChord,
    playPercussion,
    playSound,
    previewSequencerInstrument,
    getSequencerPattern,
    setSequencerStep,
    toggleSequencerInstrument,
    setSequencerStepPitch,
    getSequencerStepPitch,
    duplicateSequencerTrack,
    replaceSequencerTrack,
    getSequencerInstrumentOptions,
    setSequencerPattern,
    setBassPattern,
    setBassPatternDefinition,
    getBassPatternIndex,
    subscribeBassPattern,
    getBassControls,
    setBassControl,
    setBassStyle,
    subscribeBassControls,
    setSequencerLayerRate,
    subscribeSequencer,
    setSequencerVolume,
    getSequencerVolume,
    getSequencerVolumes,
    setSequencerEffect,
    getSequencerEffect,
    getSequencerEffects,
    subscribeSequencerVolume,
    setSequencerSwing,
    getSequencerSwing,
    subscribeSequencerSwing,
    previewSequencerStep,
    setStampInstrument,
    setKorgStampPattern,
    getStampInstrumentPattern,
    getStampInstrument,
    subscribeStampInstrument,
    setChordProgression,
    getChordProgression,
    subscribeChordProgression,
    startScrollGroove,
    stopScrollGroove,
    enablePostStampKeys,
    disablePostStampKeys,
    dispose,
  };
}
