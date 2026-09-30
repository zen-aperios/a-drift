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

function putPatternLayer(pattern, step, instrument, options = {}) {
  const current = pattern[step] ? (Array.isArray(pattern[step]) ? pattern[step].slice() : [pattern[step]]) : [];
  current.push({ instrument, ...options });
  pattern[step] = current;
}

const BASS_PATTERN_SHAPES = [
  [1, 3, 6, 8, 11],
  [0, 3, 6, 8, 11, 14],
  [1, 4, 7, 10, 12, 15],
  [0, 4, 8, 10, 14],
  [2, 5, 7, 11, 13],
  [0, 2, 6, 9, 12, 14],
  [1, 3, 7, 8, 11, 15],
  [0, 5, 8, 11, 13],
  [2, 4, 7, 10, 12, 15],
  [0, 3, 5, 8, 11, 14],
];

function makeBassPattern(index) {
  const shape = BASS_PATTERN_SHAPES[Math.floor(index / 5) % BASS_PATTERN_SHAPES.length];
  const variation = index % 5;
  const shift = [0, 1, 2, 3, 4][variation];
  const steps = Array.from({ length: 64 }, () => false);
  const pitch = Array.from({ length: 64 }, () => 0);
  let hitInBar = 0;
  shape.forEach((offset, hitIndex) => {
    for (let bar = 0; bar < 4; bar += 1) {
      const shouldSkip = variation === 4 && hitIndex === shape.length - 1 && bar % 2 === 1;
      if (!shouldSkip) {
        const step = bar * 16 + ((offset + shift) % 16);
        steps[step] = true;
        if (index === 0) pitch[step] = [0, 1, 2, 3, 2][hitInBar % 5];
      }
    }
    hitInBar += 1;
  });
  return {
    name: `Bass ${String(index + 1).padStart(2, "0")}`,
    steps,
    pitch,
  };
}

export const BASS_PATTERN_PRESETS = Array.from({ length: 50 }, (_, index) => makeBassPattern(index));

function makeNamedBassPattern(name, offsets, pitches = []) {
  const steps = Array.from({ length: 64 }, () => false);
  const pitch = Array.from({ length: 64 }, () => 0);
  offsets.forEach((offset, hitIndex) => {
    for (let bar = 0; bar < 4; bar += 1) {
      const step = bar * 16 + offset;
      steps[step] = true;
      pitch[step] = pitches[hitIndex % pitches.length] || 0;
    }
  });
  return { name, steps, pitch };
}

// Original patterns using classic Larry Heard-inspired deep-house space and syncopation.
export const LARRY_HEARD_BASS_PATTERNS = [
  makeNamedBassPattern("Can You Feel It inspired", [0, 3, 6, 8, 11, 14], [0, 0, 7, 0, 0, 0]),
  makeNamedBassPattern("Mystery of Love inspired", [1, 4, 7, 10, 12], [0, 3, 5, 7, 5]),
  makeNamedBassPattern("Washing Machine inspired", [0, 2, 6, 9, 11, 14], [0, 0, 3, 5, 3, 7]),
  makeNamedBassPattern("Another Night inspired", [1, 3, 6, 8, 12, 15], [0, 3, 5, 3, 7, 5]),
  makeNamedBassPattern("The Sun Can't Compare inspired", [0, 5, 7, 10, 13], [0, 7, 5, 3, 5]),
  makeNamedBassPattern("Missing You inspired", [2, 4, 8, 11, 14], [0, 3, 5, 7, 5]),
  makeNamedBassPattern("Beyond the Clouds inspired", [0, 3, 7, 9, 12, 15], [0, 5, 7, 5, 3, 0]),
  makeNamedBassPattern("Alien inspired", [1, 6, 8, 11, 14], [0, 7, 5, 3, 7]),
  makeNamedBassPattern("Sceneries inspired", [0, 4, 6, 10, 12, 15], [0, 3, 5, 3, 7, 5]),
  makeNamedBassPattern("Summertime inspired", [1, 3, 7, 8, 11, 14], [0, 0, 5, 7, 5, 3]),
];

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

const DEFAULT_SEQUENCER_PATTERN = Array.from({ length: 64 }, () => null);
const PERCUSSION_INSTRUMENTS = new Set(["kick", "hat", "clap", "bongoLow", "bongoHigh"]);
const BASIC_RIM_SHOT_STEPS = [6, 13, 20, 51, 60];
const AUTO_RIM_SHOT_STEPS = [4, 6, 10, 12, 13, 18, 20, 26, 27, 29, 36, 38, 43, 44, 46, 51, 52, 59, 60, 62];

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

for (let step = 0; step < DEFAULT_SEQUENCER_PATTERN.length; step += 4) {
  DEFAULT_SEQUENCER_PATTERN[step] = { instrument: "kick" };
}
for (let step = 2; step < DEFAULT_SEQUENCER_PATTERN.length; step += 4) {
  DEFAULT_SEQUENCER_PATTERN[step] = { instrument: "hat" };
}
DEFAULT_SEQUENCER_PATTERN[61] = null;
DEFAULT_SEQUENCER_PATTERN[62] = null;
DEFAULT_SEQUENCER_PATTERN[63] = { instrument: "bongoLow", rate: 1.48, gainLevel: 0.102 };
[
  ["808:Tom_Low_B_808_11", [6, 14, 22, 30, 38, 46, 54, 62]],
  ["727:Conga_Lo_727_18", [60]],
  ["727:Conga_Hi_Open_727_18", [7, 15, 23, 31, 39, 47, 55, 63]],
  ["727:Conga_Hi_Mute_727_18", [11, 27, 43, 59]],
].forEach(([instrument, steps]) => {
  steps.forEach((step) => putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, instrument));
});
BASIC_RIM_SHOT_STEPS.forEach((step) => {
  putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "808:Rim_Shot_A_808", { startupOnly: true });
});
AUTO_RIM_SHOT_STEPS.forEach((step) => {
  putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "808:Rim_Shot_A_808", { autoOnly: true });
});
LARRY_HEARD_BASS_PATTERNS[0].steps.forEach((isActive, step) => {
  if (isActive) {
    putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "bass", {
      pitch: LARRY_HEARD_BASS_PATTERNS[0].pitch[step] || 0,
    });
  }
});

// Keep the bass phrase identical on every visible 16-step page so its groove
// stays consistent while the other sequencer tracks continue to vary.
const firstBassPage = Array.from({ length: 16 }, (_, step) => (
  eventLayers(DEFAULT_SEQUENCER_PATTERN[step])
    .filter((layer) => isBassInstrument(layer.instrument))
    .map((layer) => ({ ...layer }))
));
for (let page = 1; page < 4; page += 1) {
  for (let step = 0; step < 16; step += 1) {
    const targetStep = page * 16 + step;
    const otherLayers = eventLayers(DEFAULT_SEQUENCER_PATTERN[targetStep])
      .filter((layer) => !isBassInstrument(layer.instrument));
    const bassLayers = firstBassPage[step].map((layer) => ({ ...layer }));
    DEFAULT_SEQUENCER_PATTERN[targetStep] = [...otherLayers, ...bassLayers];
  }
}

// Startup arrangement: preserve the existing instruments and use the basic
// rim phrase until the post-stamp auto section takes over.
DEFAULT_SEQUENCER_PATTERN.fill(null);
for (let step = 0; step < 64; step += 4) putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "kick");
for (let step = 2; step < 64; step += 4) putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "hat");
[
  ["727:Conga_Lo_727_18", [60]],
  ["808:Tom_Low_B_808_11", [6, 14, 22, 30, 38, 46, 54, 62]],
  ["727:Conga_Hi_Mute_727_18", [11, 27, 43, 59]],
  ["727:Conga_Hi_Open_727_18", [47, 63]],
].forEach(([instrument, steps]) => {
  steps.forEach((step) => putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, instrument));
});
BASIC_RIM_SHOT_STEPS.forEach((step) => {
  putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "808:Rim_Shot_A_808", { startupOnly: true });
});
AUTO_RIM_SHOT_STEPS.forEach((step) => {
  putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "808:Rim_Shot_A_808", { autoOnly: true });
});
[
  [0, 0], [3, 0], [6, 7], [8, 0], [11, 0], [14, 0],
  [16, 0], [19, 0], [22, 7], [24, 0], [27, 0], [30, 0],
  [32, 0], [35, 0], [38, 7], [40, 0], [43, 0], [46, 0],
  [48, 0], [51, 0], [54, 7], [56, 0], [59, 0], [62, 0],
].forEach(([step, pitch]) => putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "bass", { pitch }));
putPatternLayer(DEFAULT_SEQUENCER_PATTERN, 63, "bongoLow", { rate: 1.48, gainLevel: 0.102 });
[0, 16, 32, 48].forEach((step) => putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "stamp:korg", { muted: true }));

const SAMPLE_URLS = {
  bongoLow: "/audio/percussion/bongo-low.wav",
  bongoHigh: "/audio/percussion/bongo-high.wav",
  korgSoftChordFMinor: new URL("../audio/korg/korg-synth-fx-down-sweep-2/korg-fx-down-sweep-synth-shot-soft-chord_F_minor.wav", import.meta.url).href,
  korgSoftChordHighFMinor: new URL("../audio/korg/korg-synth-fx-down-sweep-2/korg-fx-down-sweep-synth-shot-soft-chord-high_F_minor.wav", import.meta.url).href,
};

const LIBRARY_727_URLS = import.meta.glob("../../727/*.wav", {
  eager: true,
  import: "default",
  query: "?url",
});
const LIBRARY_808_URLS = import.meta.glob("../../808/*.wav", {
  eager: true,
  import: "default",
  query: "?url",
});

function librarySampleUrls(library, prefix) {
  return Object.fromEntries(Object.entries(library).map(([path, url]) => {
    const filename = path.split("/").pop().replace(/\.wav$/i, "");
    return [`${prefix}:${filename}`, url];
  }));
}

Object.assign(SAMPLE_URLS, librarySampleUrls(LIBRARY_727_URLS, "727"));
Object.assign(SAMPLE_URLS, librarySampleUrls(LIBRARY_808_URLS, "808"));
const LIBRARY_SAMPLE_IDS = Object.keys(SAMPLE_URLS).filter((id) => id.includes(":"));

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

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

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
  let bassReverbInput;
  let bassReverbGain;
  let disposed = false;
  let pendingUnlock = null;
  let noiseBuffer;
  let lastScrollPercussionTime = -Infinity;
  let grooveTimer = null;
  let grooveRunning = false;
  let grooveStartPromise = null;
  let grooveRequestId = 0;
  let nextGrooveTime = 0;
  let grooveStep = 0;
  const grooveStepDuration = 60 / 120 / 4;
  const grooveLookahead = 0.3;
  const grooveScheduleInterval = 25;
  const sampleBuffers = new Map();
  const sampleLoads = new Map();
  let sequencerPattern = DEFAULT_SEQUENCER_PATTERN.map(clonePatternEvent);
  const sequencerListeners = new Set();
  const sequencerVolumeListeners = new Set();
  const sequencerVolumes = new Map();
  const sequencerEffects = new Map();
  const sequencerReverbBuses = new Map();
  const startupTrackLevels = {
    "808:Tom_Low_B_808_11": 0.81,
    "808:Rim_Shot_A_808": 0.51,
    "727:Conga_Lo_727_18": 0.34,
    "727:Conga_Hi_Open_727_18": 0.39,
    "727:Conga_Hi_Mute_727_18": 0.34,
  };
  Object.entries(startupTrackLevels).forEach(([instrument, volume]) => sequencerVolumes.set(instrument, volume));
  sequencerEffects.set("808:Rim_Shot_A_808", { reverb: 0.59, reverbDecay: 0.65 });
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

  function createReverbImpulse(context, decay) {
    const length = Math.max(1, Math.floor(context.sampleRate * decay));
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const fade = 1 - index / length;
        data[index] = (Math.random() * 2 - 1) * fade * fade;
      }
    }
    return impulse;
  }

  function setBassReverbImpulse() {
    if (!audioContext || !bassReverbInput) return;
    bassReverbInput.buffer = createReverbImpulse(audioContext, bassControls.reverbDecay);
  }

  function getSequencerEffect(instrument) {
    if (!instrument) return { reverb: 0, reverbDecay: 0 };
    if (!sequencerEffects.has(instrument)) {
      sequencerEffects.set(instrument, {
        reverb: 0,
        reverbDecay: 0,
      });
    }
    return { ...sequencerEffects.get(instrument) };
  }

  function getSequencerReverbBus(instrument) {
    if (!audioContext || !instrument) return null;
    if (!sequencerReverbBuses.has(instrument)) {
      const input = audioContext.createConvolver();
      const gain = audioContext.createGain();
      const effect = getSequencerEffect(instrument);
      input.buffer = createReverbImpulse(audioContext, effect.reverbDecay);
      gain.gain.value = effect.reverb;
      input.connect(gain);
      gain.connect(masterGain);
      sequencerReverbBuses.set(instrument, { input, gain });
    }
    return sequencerReverbBuses.get(instrument);
  }

  function connectReverb(sourceGain, context, reverbSend, reverbInput) {
    if (!reverbInput || reverbSend <= 0) return;
    const reverbGain = context.createGain();
    reverbGain.gain.value = reverbSend;
    sourceGain.connect(reverbGain);
    reverbGain.connect(reverbInput);
  }

  function setSequencerEffect(instrument, name, value) {
    if (!instrument) return;
    const current = getSequencerEffect(instrument);
    const ranges = { reverb: [0, 0.6], reverbDecay: [0, 4] };
    if (!ranges[name]) return;
    const [min, max] = ranges[name];
    current[name] = Math.max(min, Math.min(max, Number(value)));
    sequencerEffects.set(instrument, current);
    const bus = sequencerReverbBuses.get(instrument);
    if (bus) {
      if (name === "reverb") bus.gain.gain.value = current.reverb;
      if (name === "reverbDecay") bus.input.buffer = createReverbImpulse(audioContext, current.reverbDecay);
    }
  }

  function getSequencerEffects() {
    return Object.fromEntries([...sequencerEffects.entries()].map(([instrument]) => [instrument, getSequencerEffect(instrument)]));
  }

  function getContext() {
    if (audioContext || typeof window === "undefined") return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.34;
    masterGain.connect(audioContext.destination);
    bassReverbInput = audioContext.createConvolver();
    bassReverbGain = audioContext.createGain();
    bassReverbGain.gain.value = bassControls.reverb;
    bassReverbInput.connect(bassReverbGain);
    bassReverbGain.connect(masterGain);
    setBassReverbImpulse();
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

  function getNoiseBuffer(context) {
    if (noiseBuffer) return noiseBuffer;
    noiseBuffer = context.createBuffer(1, context.sampleRate * 1.5, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
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

    const now = context.currentTime + 0.01;
    const kick = context.createOscillator();
    const kickGain = context.createGain();
    kick.type = "sine";
    kick.frequency.setValueAtTime(step % 2 ? 68 : 54, now);
    kick.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    kickGain.gain.setValueAtTime(0.0001, now);
    kickGain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
    kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    kick.connect(kickGain);
    kickGain.connect(masterGain);
    kick.start(now);
    kick.stop(now + 0.22);

    const hat = context.createBufferSource();
    const hatFilter = context.createBiquadFilter();
    const hatGain = context.createGain();
    hat.buffer = getNoiseBuffer(context);
    hatFilter.type = "highpass";
    hatFilter.frequency.value = 4200;
    hatGain.gain.setValueAtTime(0.0001, now + 0.045);
    hatGain.gain.exponentialRampToValueAtTime(0.045, now + 0.052);
    hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    hat.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(masterGain);
    hat.start(now + 0.045);
    hat.stop(now + 0.15);
  }

  function envelope(context, time, level, attack, decay) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    gain.connect(masterGain);
    return gain;
  }

  function playNoiseHit(context, time, frequency, decay, level, volume = 1, reverbInput = bassReverbInput, reverbSend = 0.32) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = envelope(context, time, level * volume, 0.002, decay);
    source.buffer = getNoiseBuffer(context);
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 6;
    source.connect(filter);
    filter.connect(gain);
    connectReverb(gain, context, reverbSend, reverbInput);
    source.start(time);
    source.stop(time + decay + 0.04);
  }

  function playPercTone(context, time, frequency, decay, type, level) {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = envelope(context, time, level, 0.002, decay);
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    filter.type = "bandpass";
    filter.frequency.value = frequency * 1.4;
    filter.Q.value = 5;
    oscillator.connect(filter);
    filter.connect(gain);
    oscillator.start(time);
    oscillator.stop(time + decay + 0.03);
  }

  function playKick(context, time, volume = 1, reverbSend = 0, reverbInput = bassReverbInput) {
    const gain = envelope(context, time, 0.46 * volume, 0.004, 0.42);
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(132, time);
    oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.18);
    oscillator.connect(gain);
    connectReverb(gain, context, reverbSend, reverbInput);
    oscillator.start(time);
    oscillator.stop(time + 0.46);
  }

  async function loadSample(id) {
    const context = getContext();
    const url = SAMPLE_URLS[id];
    if (!context || !url) return null;
    if (sampleBuffers.has(id)) return sampleBuffers.get(id);
    if (!sampleLoads.has(id)) {
      sampleLoads.set(id, fetch(url)
        .then((response) => response.arrayBuffer())
        .then((buffer) => context.decodeAudioData(buffer))
        .then((decoded) => {
          sampleBuffers.set(id, decoded);
          return decoded;
        })
        .catch(() => null));
    }
    return sampleLoads.get(id);
  }

  async function playSample(
    id,
    { time = null, rate = 1, gainLevel = null, reverbSend = 0, reverbInput = bassReverbInput } = {}
  ) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      await unlock();
      if (context.state !== "running") return;
    }
    const buffer = await loadSample(id);
    if (!buffer || disposed) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const level = gainLevel ?? (id === "triangle" ? 0.18 : 0.42);
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(masterGain);
    connectReverb(gain, context, reverbSend, reverbInput);
    const startTime = Math.max(time ?? 0, context.currentTime + 0.01);
    source.start(startTime);
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
        gainLevel: (isPercussionInstrument(layer.instrument) && (layer.instrument === "bongoLow" || layer.instrument === "bongoHigh")
          ? 0.34
          : (layer.gainLevel || 0.28)) * volume * grooveAccent,
        reverbSend: sequencerReverbSend,
        reverbInput: sequencerReverbBus?.input,
      });
    });
    void step;
  }

  function notifySequencer(step, event) {
    const visibleLayers = eventLayers(event).filter((layer) => (
      (!layer.startupOnly || !postStampKeysEnabled)
      && (!layer.autoOnly || postStampKeysEnabled)
    ));
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
    return [...new Set(["kick", "hat", "bass", "clap", "bongoLow", "bongoHigh", ...Object.keys(SAMPLE_URLS)])];
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
    if (name === "reverb" && bassReverbGain) bassReverbGain.gain.value = bassControls.reverb;
    if (name === "reverbDecay") setBassReverbImpulse();
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
      const visibleLayers = eventLayers(step).filter((layer) => (
        (!layer.startupOnly || !postStampKeysEnabled)
        && (!layer.autoOnly || postStampKeysEnabled)
      ));
      if (visibleLayers.length === 1) return { ...visibleLayers[0] };
      return visibleLayers.length ? visibleLayers.map((layer) => ({ ...layer })) : null;
    });
  }

  function subscribeSequencer(listener) {
    sequencerListeners.add(listener);
    return () => sequencerListeners.delete(listener);
  }

  function setSequencerVolume(instrument, volume) {
    if (!instrument) return;
    const nextVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    sequencerVolumes.set(instrument, nextVolume);
    sequencerVolumeListeners.forEach((listener) => listener(instrument, nextVolume));
  }

  function getSequencerVolume(instrument) {
    return sequencerVolumes.get(instrument) ?? 1;
  }

  function getSequencerVolumes() {
    return Object.fromEntries(sequencerVolumes.entries());
  }

  function subscribeSequencerVolume(listener) {
    sequencerVolumeListeners.add(listener);
    return () => sequencerVolumeListeners.delete(listener);
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
    reverbInput = bassReverbInput,
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
    const now = scheduledTime ?? context.currentTime + 0.015;
    const oscillator = context.createOscillator();
    const bodyOscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const bodyGain = context.createGain();
    oscillator.type = bassControls.waveform;
    bodyOscillator.type = bassControls.bodyWaveform;
    const rootFrequency = midiToFrequency(
      BASS_ROOTS[index % BASS_ROOTS.length] + bassControls.octave * 12 + bassControls.transpose + pitch
    );
    oscillator.frequency.value = rootFrequency;
    bodyOscillator.frequency.value = rootFrequency * 2;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(bassControls.brightness, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(160, bassControls.brightness * 0.18), now + bassControls.decay * 0.55);
    filter.Q.value = bassControls.resonance;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12 * volume * bassControls.volume, now + bassControls.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + bassControls.decay);
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.045 * volume * bassControls.volume * (1 - bassControls.subMix), now + bassControls.attack);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + bassControls.decay * 0.68);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    bodyOscillator.connect(bodyGain);
    bodyGain.connect(masterGain);
    connectReverb(gain, context, reverbSend, reverbInput);
    connectReverb(bodyGain, context, reverbSend, reverbInput);
    oscillator.start(now);
    bodyOscillator.start(now);
    oscillator.stop(now + Math.max(0.75, bassControls.decay + bassControls.reverbDecay));
    bodyOscillator.stop(now + Math.max(0.55, bassControls.decay * 0.68 + bassControls.reverbDecay));
  }

  function playScrollPercussion(step) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      unlock().then(() => {
        if (context.state === "running") playScrollPercussion(step);
      });
      return;
    }

    const time = context.currentTime + 0.01;
    if (time - lastScrollPercussionTime < 0.32) return;
    lastScrollPercussionTime = time;
    playKick(context, time);
    if (step % 2 === 1) {
      const octavePattern = [0.5, 0.75, 1, 1.5, 2, 1.5, 1, 0.75];
      const rate = octavePattern[Math.floor(step / 2) % octavePattern.length];
      playSample("bongoHigh", {
        time: time + 0.055,
        rate,
        gainLevel: 0.3,
      });
    }
  }

  async function startScrollGroove() {
    if (grooveRunning || grooveStartPromise || disposed) return;
    const requestId = grooveRequestId + 1;
    grooveRequestId = requestId;
    grooveStartPromise = (async () => {
      const context = getContext();
      if (!context) return;
      await unlock();
      if (disposed || requestId !== grooveRequestId || context.state !== "running" || grooveRunning) return;
      const sampleIds = new Set();
      sequencerPattern.forEach((event) => eventLayers(event).forEach((layer) => {
        if (SAMPLE_URLS[layer.instrument]) sampleIds.add(layer.instrument);
      }));
      await Promise.all([...sampleIds].map((id) => loadSample(id)));
      if (disposed || requestId !== grooveRequestId || context.state !== "running") return;
      grooveRunning = true;
      grooveStep = 0;
      // Leave a small two-step lead-in so the first downbeat does not jump in
      // directly under the scroll gesture.
      nextGrooveTime = context.currentTime + grooveStepDuration * 2;
      loadSample("bongoLow");
      loadSample("bongoHigh");

      const schedule = () => {
        if (!grooveRunning || disposed) return;
        const now = context.currentTime;
        while (nextGrooveTime < now + grooveLookahead) {
          const patternStep = grooveStep % sequencerPattern.length;
          const event = sequencerPattern[patternStep];
          const swingOffset = patternStep % 2 === 1 ? grooveStepDuration * sequencerSwing : 0;
          playSequencerSound(context, event, nextGrooveTime + swingOffset, patternStep);
          if (Math.floor(grooveStep / sequencerPattern.length) === 1
            && (patternStep === sequencerPattern.length - 2 || patternStep === sequencerPattern.length - 1)) {
            playSample("bongoHigh", {
              time: nextGrooveTime + 0.012,
              rate: patternStep === sequencerPattern.length - 2 ? 0.96 : 1.08,
              gainLevel: 0.34 * getSequencerVolume("bongoHigh"),
            });
          }
          const halfPattern = Math.max(1, Math.floor(sequencerPattern.length / 2));
          if (postStampKeysEnabled
            && (patternStep === 0 || patternStep === halfPattern)
            && stampInstrumentPattern.length) {
            const cycleIndex = Math.floor(
              Math.max(0, grooveStep - postStampCycleStartStep) / halfPattern
            );
            const cycleInstrument = stampInstrumentPattern[cycleIndex % stampInstrumentPattern.length];
            const fullCycleIndex = Math.floor(grooveStep / sequencerPattern.length);
            const reverbSend = fullCycleIndex >= 1 ? bassControls.reverb * 0.32 : 0;
            playStampInstrument(1, cycleInstrument, nextGrooveTime, reverbSend);
          }
          notifySequencer(patternStep, event);
          grooveStep += 1;
          nextGrooveTime += grooveStepDuration;
        }
      };
      schedule();
      grooveTimer = window.setInterval(schedule, grooveScheduleInterval);
    })().finally(() => {
      if (requestId === grooveRequestId) grooveStartPromise = null;
    });
    return grooveStartPromise;
  }

  function stopScrollGroove() {
    grooveRequestId += 1;
    grooveRunning = false;
    grooveStartPromise = null;
    if (grooveTimer) window.clearInterval(grooveTimer);
    grooveTimer = null;
    nextGrooveTime = 0;
  }

  function enablePostStampKeys() {
    postStampKeysEnabled = true;
    postStampCycleStartStep = grooveStep;
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
      reverbInput = bassReverbInput,
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

    const now = time ?? context.currentTime + 0.015;
    const baseChord = CHORDS[index % CHORDS.length];
    const chord = [
      baseChord[0] - 12,
      ...baseChord,
      baseChord[1] + 12,
      baseChord[2] + 12,
      baseChord[4] + 12,
    ];
    chord.forEach((note, noteIndex) => {
      const frequency = midiToFrequency(note);
      const oscillator = context.createOscillator();
      const overtone = context.createOscillator();
      const voiceGain = context.createGain();
      const overtoneGain = context.createGain();
      const filter = context.createBiquadFilter();

      oscillator.type = variant === "glass" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      overtone.type = variant === "glass" ? "triangle" : "sine";
      overtone.frequency.value = frequency * 2.01;
      overtoneGain.gain.value = variant === "glass" ? 0.16 : variant === "velvet" ? 0.07 : 0.11;
      filter.type = "lowpass";
      filter.frequency.value = (variant === "glass" ? 2400 : variant === "velvet" ? 1450 : 1850) - noteIndex * 80;
      filter.Q.value = variant === "glass" ? 0.9 : 0.6;

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.095 * volume, now + 0.025);
      voiceGain.gain.exponentialRampToValueAtTime((variant === "velvet" ? 0.052 : 0.06) * volume, now + 1.2);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(filter);
      overtone.connect(overtoneGain);
      overtoneGain.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(masterGain);
      connectReverb(voiceGain, context, reverbSend, reverbInput);
      oscillator.start(now);
      overtone.start(now);
      oscillator.stop(now + duration + 0.05);
      overtone.stop(now + duration + 0.05);
    });
  }

  function dispose() {
    disposed = true;
    stopScrollGroove();
    if (audioContext) audioContext.close().catch(() => {});
    audioContext = null;
    masterGain = null;
    noiseBuffer = null;
    sampleBuffers.clear();
    sampleLoads.clear();
    lastScrollPercussionTime = -Infinity;
  }

  return {
    unlock,
    playChord,
    playStampChord,
    previewStampChord,
    playPercussion,
    playScrollPercussion,
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
