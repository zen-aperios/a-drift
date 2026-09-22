import { DOWNLOADED_SAMPLE_LIBRARY } from "./downloadedSampleLibrary.js";

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

export const RHODES_SOUND_CONTROLS = [
  ["kick", "Kick"],
  ["rim", "Rim"],
  ["clap", "Clap"],
  ["hat", "Closed hat"],
  ["openHat", "Open hat"],
  ["shaker", "Shaker"],
  ["clave", "Clave"],
  ["congaLow", "Low conga"],
  ["congaOpen", "Open conga"],
  ["bongoLow", "Low bongo"],
  ["bongoHigh", "High bongo"],
  ["cowbell", "Cowbell"],
  ["agogo", "Agogo"],
  ["tambourine", "Tambourine"],
  ["timbale", "Timbale"],
  ["triangle", "Triangle"],
  ["bass", "Bass"],
  ["stab", "Minor 9 stab"],
  ["pad", "Maj9 pad"],
  ["pluck", "Dub pluck"],
  ["noise", "Air noise"],
  ["synthChord", "E minor sample"],
];

export const PERCUSSION_LIBRARY = [
  ["libraryBongos1", "Bongos 01", "/audio/percussion/library/bongos-lpsp_bongos_001.wav"],
  ["libraryBongos2", "Bongos 02", "/audio/percussion/library/bongos-lpsp_bongos_002.wav"],
  ["libraryCongas1", "Congas 01", "/audio/percussion/library/congas-lpsp_conga_001.wav"],
  ["libraryCongas2", "Congas 02", "/audio/percussion/library/congas-lpsp_conga_002.wav"],
  ["libraryClaves1", "Claves 01", "/audio/percussion/library/claves-lpsp_claves_01.wav"],
  ["libraryClaves2", "Claves 02", "/audio/percussion/library/claves-lpsp_claves_02.wav"],
  ["libraryCowbells1", "Cowbells 01", "/audio/percussion/library/cowbells-lpsp_cowbells_01.wav"],
  ["libraryCowbells2", "Cowbells 02", "/audio/percussion/library/cowbells-lpsp_cowbells_02.wav"],
  ["libraryOpenHats1", "Open hats 01", "/audio/percussion/library/open_hats-lpsp_open_hats_01.wav"],
  ["libraryOpenHats2", "Open hats 02", "/audio/percussion/library/open_hats-lpsp_open_hats_02.wav"],
  ["libraryRimshots1", "Rimshots 01", "/audio/percussion/library/rimshots-lpsp_rimshot_01.wav"],
  ["libraryRimshots2", "Rimshots 02", "/audio/percussion/library/rimshots-lpsp_rimshot_02.wav"],
  ["libraryShakers1", "Shakers 01", "/audio/percussion/library/shakers-lpsp_shakers_01.wav"],
  ["libraryShakers2", "Shakers 02", "/audio/percussion/library/shakers-lpsp_shakers_02.wav"],
  ["libraryTambourines1", "Tambourines 01", "/audio/percussion/library/tambourines-lpsp_tambourines_001.wav"],
  ["libraryTambourines2", "Tambourines 02", "/audio/percussion/library/tambourines-lpsp_tambourines_002.wav"],
  ["libraryTimbales1", "Timbales 01", "/audio/percussion/library/timbales-lpsp_timbales_01.wav"],
  ["libraryTimbales2", "Timbales 02", "/audio/percussion/library/timbales-lpsp_timbales_02.wav"],
  ["libraryTriangles1", "Triangles 01", "/audio/percussion/library/triangles-lpsp_triangles_01.wav"],
  ["libraryTriangles2", "Triangles 02", "/audio/percussion/library/triangles-lpsp_triangles_02.wav"],
  ["libraryMaracas1", "Maracas 01", "/audio/percussion/library/maracas-lpsp_maracas_01.wav"],
  ["libraryMaracas2", "Maracas 02", "/audio/percussion/library/maracas-lpsp_maracas_02.wav"],
  ["libraryCabasas1", "Cabasas 01", "/audio/percussion/library/cabasas-lpsp_cabasas_01.wav"],
  ["libraryCabasas2", "Cabasas 02", "/audio/percussion/library/cabasas-lpsp_cabasas_02.wav"],
  ["libraryGuiros1", "Guiros 01", "/audio/percussion/library/guiros-lpsp_guiros_01.wav"],
  ["libraryGuiros2", "Guiros 02", "/audio/percussion/library/guiros-lpsp_guiros_02.wav"],
  ["libraryWoodblocks1", "Woodblocks 01", "/audio/percussion/library/woodblocks-lpsp_woodblocks_01.wav"],
  ["libraryWoodblocks2", "Woodblocks 02", "/audio/percussion/library/woodblocks-lpsp_woodblocks_02.wav"],
  ["libraryCastanets1", "Castanets 01", "/audio/percussion/library/castanets-lpsp_castanets_1.wav"],
  ["libraryCastanets2", "Castanets 02", "/audio/percussion/library/castanets-lpsp_castanets_2.wav"],
  ["libraryChimes1", "Chimes 01", "/audio/percussion/library/chimes-lpsp_chimes_1.wav"],
  ["libraryChimes2", "Chimes 02", "/audio/percussion/library/chimes-lpsp_chimes_2.wav"],
  ["libraryTaikos1", "Taikos 01", "/audio/percussion/library/taikos-lpsp_taikos_01.wav"],
  ["libraryTaikos2", "Taikos 02", "/audio/percussion/library/taikos-lpsp_taikos_02.wav"],
  ["libraryBamboos1", "Bamboos 01", "/audio/percussion/library/bamboos-lpsp_bamboo_01.wav"],
  ["libraryBamboos2", "Bamboos 02", "/audio/percussion/library/bamboos-lpsp_bamboo_02.wav"],
  ["libraryCoolPercs1", "Cool percs 01", "/audio/percussion/library/cool_percs-lpsp_cool_percs_001.wav"],
  ["libraryCoolPercs2", "Cool percs 02", "/audio/percussion/library/cool_percs-lpsp_cool_percs_002.wav"],
  ["librarySticks1", "Sticks 01", "/audio/percussion/library/sticks-lpsp_sticks_1.wav"],
  ["librarySticks2", "Sticks 02", "/audio/percussion/library/sticks-lpsp_sticks_2.wav"],
];

export const SEQUENCER_INSTRUMENTS = [
  ["kick", "Kick"],
  ["hat", "Closed hat"],
  ["clap", "Clap"],
  ["bongoLow", "Low bongo"],
  ["bongoHigh", "High bongo"],
  ...RHODES_SOUND_CONTROLS.filter(([id]) => !["kick", "hat", "clap", "synthChord"].includes(id)),
  ...PERCUSSION_LIBRARY.map(([id, label]) => [id, label]),
  ...DOWNLOADED_SAMPLE_LIBRARY.map(([id, label]) => [id, label]),
];

const firstDownloadedSample = (category, fallback) =>
  DOWNLOADED_SAMPLE_LIBRARY.find(([, , , sampleCategory]) => sampleCategory === category)?.[0] || fallback;

const downloadedSampleMatching = (category, matcher, fallback) =>
  DOWNLOADED_SAMPLE_LIBRARY.find(([id, label, , sampleCategory]) =>
    sampleCategory === category && matcher.test(`${id} ${label}`))?.[0] || fallback;

const deepHouse808 = firstDownloadedSample("808", "kick");
const deepHouseKorg = downloadedSampleMatching("Korg", /chord|organ|piano|pad|tone/i, firstDownloadedSample("Korg", "synthChord"));
const deepHouseKorgAlt = DOWNLOADED_SAMPLE_LIBRARY.find(([id, label, , category]) =>
  category === "Korg" && id !== deepHouseKorg && /synth|lead|bell|tone/i.test(label)
)?.[0] || deepHouseKorg;
const korgSoftChordFMinor = downloadedSampleMatching("Korg", /synth shot soft chord f minor$/i, deepHouseKorg);
const korgSoftChordHighFMinor = downloadedSampleMatching("Korg", /synth shot soft chord high f minor$/i, deepHouseKorgAlt);
const DEFAULT_STAMP_INSTRUMENT = korgSoftChordFMinor;
const DEFAULT_STAMP_INSTRUMENT_PATTERN = [korgSoftChordFMinor, korgSoftChordHighFMinor];

function createPattern() {
  return Array.from({ length: 64 }, () => null);
}

function putPatternLayer(pattern, step, instrument, options = {}) {
  const current = pattern[step] ? (Array.isArray(pattern[step]) ? pattern[step].slice() : [pattern[step]]) : [];
  current.push({ instrument, ...options });
  pattern[step] = current;
}

const DEEP_HOUSE_BASS_RHYTHM = [1, 3, 6, 8, 11];

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
  makeNamedBassPattern("Can You Feel It inspired", [0, 3, 6, 8, 11, 14], [0, 0, 7, 5, 3, 5]),
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

function makeDeepHousePattern(style = "classic") {
  const pattern = createPattern();
  for (let step = 0; step < 64; step += 4) putPatternLayer(pattern, step, "kick");
  for (let step = 2; step < 64; step += 4) putPatternLayer(pattern, step, "hat");
  for (let step = 4; step < 64; step += 8) putPatternLayer(pattern, step, "clap");
  for (let bar = 0; bar < 64; bar += 16) {
    DEEP_HOUSE_BASS_RHYTHM.forEach((offset) => putPatternLayer(pattern, bar + offset, "bass"));
  }
  for (let step = 7; step < 64; step += 16) putPatternLayer(pattern, step, "bongoLow", { rate: 0.92 });
  for (let step = 15; step < 64; step += 16) putPatternLayer(pattern, step, "bongoHigh", { rate: 1.08 });

  if (style === "late") {
    [12, 28, 44, 60].forEach((step) => putPatternLayer(pattern, step, deepHouseKorg, { gainLevel: 0.2, rate: 0.98 }));
    [14, 30, 46, 62].forEach((step) => putPatternLayer(pattern, step, deepHouseKorgAlt, { gainLevel: 0.14, rate: 1.12 }));
    [6, 22, 38, 54].forEach((step) => putPatternLayer(pattern, step, deepHouse808, { gainLevel: 0.22, rate: 0.5 }));
  } else if (style === "swing") {
    [3, 11, 19, 27, 35, 43, 51, 59].forEach((step) => putPatternLayer(pattern, step, "shaker"));
    [10, 26, 42, 58].forEach((step) => putPatternLayer(pattern, step, deepHouseKorg, { gainLevel: 0.18, rate: 1.06 }));
    [14, 30, 46, 62].forEach((step) => putPatternLayer(pattern, step, deepHouseKorgAlt, { gainLevel: 0.13, rate: 0.94 }));
  } else {
    [8, 24, 40, 56].forEach((step) => putPatternLayer(pattern, step, deepHouseKorg, { gainLevel: 0.18, rate: 1 }));
    [12, 28, 44, 60].forEach((step) => putPatternLayer(pattern, step, deepHouseKorgAlt, { gainLevel: 0.14, rate: 1.12 }));
  }
  return pattern;
}

export const SEQUENCER_PRESETS = [
  ["Deep house", makeDeepHousePattern("classic")],
  ["Late night", makeDeepHousePattern("late")],
  ["Loose swing", makeDeepHousePattern("swing")],
];

const DEFAULT_SEQUENCER_PATTERN = Array.from({ length: 64 }, () => null);
for (let step = 0; step < DEFAULT_SEQUENCER_PATTERN.length; step += 4) {
  DEFAULT_SEQUENCER_PATTERN[step] = { instrument: "kick" };
}
for (let step = 2; step < DEFAULT_SEQUENCER_PATTERN.length; step += 4) {
  DEFAULT_SEQUENCER_PATTERN[step] = { instrument: "hat" };
}
DEFAULT_SEQUENCER_PATTERN[61] = null;
DEFAULT_SEQUENCER_PATTERN[62] = null;
DEFAULT_SEQUENCER_PATTERN[63] = { instrument: "bongoLow", rate: 1.48, gainLevel: 0.102 };
LARRY_HEARD_BASS_PATTERNS[0].steps.forEach((isActive, step) => {
  if (isActive) {
    putPatternLayer(DEFAULT_SEQUENCER_PATTERN, step, "bass", {
      pitch: LARRY_HEARD_BASS_PATTERNS[0].pitch[step] || 0,
    });
  }
});

const SAMPLE_URLS = {
  rim: "/audio/percussion/rim.wav",
  openHat: "/audio/percussion/open-hat.wav",
  shaker: "/audio/percussion/shaker.wav",
  clave: "/audio/percussion/clave.wav",
  congaLow: "/audio/percussion/conga-low.wav",
  congaOpen: "/audio/percussion/conga-open.wav",
  bongoLow: "/audio/percussion/bongo-low.wav",
  bongoHigh: "/audio/percussion/bongo-high.wav",
  cowbell: "/audio/percussion/cowbell.wav",
  agogo: "/audio/percussion/agogo.wav",
  tambourine: "/audio/percussion/tambourine.wav",
  timbale: "/audio/percussion/timbale.wav",
  triangle: "/audio/percussion/triangle.wav",
  synthChord: "/audio/synth-chord-memories.wav",
  ...Object.fromEntries(PERCUSSION_LIBRARY.map(([id, , url]) => [id, url])),
  ...Object.fromEntries(DOWNLOADED_SAMPLE_LIBRARY.map(([id, , url]) => [id, url])),
};

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

  function setBassReverbImpulse() {
    if (!audioContext || !bassReverbInput) return;
    const length = Math.max(1, Math.floor(audioContext.sampleRate * bassControls.reverbDecay));
    const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const fade = 1 - index / length;
        data[index] = (Math.random() * 2 - 1) * fade * fade;
      }
    }
    bassReverbInput.buffer = impulse;
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

  function playNoiseHit(context, time, frequency, decay, level, volume = 1) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = envelope(context, time, level * volume, 0.002, decay);
    source.buffer = getNoiseBuffer(context);
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 6;
    source.connect(filter);
    filter.connect(gain);
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

  function playKick(context, time, volume = 1) {
    const gain = envelope(context, time, 0.46 * volume, 0.004, 0.42);
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(132, time);
    oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.18);
    oscillator.connect(gain);
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
    { time = null, rate = 1, gainLevel = null, reverbSend = 0 } = {}
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
    if (reverbSend > 0 && bassReverbInput) {
      const reverbGain = context.createGain();
      reverbGain.gain.value = reverbSend;
      gain.connect(reverbGain);
      reverbGain.connect(bassReverbInput);
    }
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
      const volume = sequencerVolumes.get(layer.instrument) ?? 1;
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
      if (layer.instrument === "kick") {
        playKick(context, time, volume);
        return;
      }
      if (layer.instrument === "hat") {
        playNoiseHit(context, grooveTime + 0.008, 8200, 0.055, 0.06, volume * grooveAccent);
        return;
      }
      if (layer.instrument === "clap") {
        playNoiseHit(context, grooveTime + 0.01, 2200, 0.12, 0.1, volume * grooveAccent);
        return;
      }
      if (layer.instrument === "bass") {
        playBassNote(step % BASS_ROOTS.length, grooveTime, volume * grooveAccent, layer.pitch || 0);
        return;
      }
      playSample(layer.instrument, {
        time: grooveTime + (layer.instrument === "bongoLow" ? 0.01 : 0),
        rate: layer.rate || 1,
        gainLevel: (layer.gainLevel || (layer.instrument === "bongoLow" ? 0.34 : 0.28)) * volume * grooveAccent,
      });
    });
    void step;
  }

  function notifySequencer(step, event) {
    sequencerListeners.forEach((listener) => listener(step, event));
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
      if (Array.isArray(step)) return step.map((layer) => ({ ...layer }));
      return step && { ...step };
    });
  }

  function subscribeSequencer(listener) {
    sequencerListeners.add(listener);
    return () => sequencerListeners.delete(listener);
  }

  function setSequencerVolume(instrument, volume) {
    if (!instrument) return;
    sequencerVolumes.set(instrument, Math.max(0, Math.min(1, Number(volume) || 0)));
    sequencerVolumeListeners.forEach((listener) => listener(instrument, sequencerVolumes.get(instrument)));
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
    if (!instrument || !SEQUENCER_INSTRUMENTS.some(([id]) => id === instrument)) return;
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

  function playBassNote(index, scheduledTime = null, volume = 1, pitch = 0) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      unlock().then(() => {
        if (context.state === "running") playBassNote(index, scheduledTime, volume, pitch);
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
    gain.connect(bassReverbInput);
    bodyOscillator.connect(bodyGain);
    bodyGain.connect(masterGain);
    bodyGain.connect(bassReverbInput);
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
    grooveStartPromise = (async () => {
      const context = getContext();
      if (!context) return;
      await unlock();
      if (disposed || context.state !== "running" || grooveRunning) return;
      const sampleIds = new Set();
      sequencerPattern.forEach((event) => eventLayers(event).forEach((layer) => {
        if (SAMPLE_URLS[layer.instrument]) sampleIds.add(layer.instrument);
      }));
      await Promise.all([...sampleIds].map((id) => loadSample(id)));
      if (disposed || context.state !== "running") return;
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
            && patternStep === sequencerPattern.length - 1) {
            playSample("bongoHigh", {
              time: nextGrooveTime + 0.012,
              rate: 1.08,
              gainLevel: 0.22,
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
            const reverbSend = fullCycleIndex >= 1 ? 0.32 : 0;
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
      grooveStartPromise = null;
    });
    return grooveStartPromise;
  }

  function stopScrollGroove() {
    grooveRunning = false;
    if (grooveTimer) window.clearInterval(grooveTimer);
    grooveTimer = null;
    nextGrooveTime = 0;
  }

  function enablePostStampKeys() {
    postStampKeysEnabled = true;
    postStampCycleStartStep = grooveStep;
  }

  function disablePostStampKeys() {
    postStampKeysEnabled = false;
  }

  async function playSound(id, step = 0) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      await unlock();
      if (context.state === "running") playSound(id, step);
      return;
    }
    if (SAMPLE_URLS[id]) {
      playSample(id);
      return;
    }
    const time = context.currentTime + 0.01;
    if (id === "kick") playKick(context, time);
    else if (id === "rim") playPercTone(context, time, 1800, 0.075, "square", 0.12);
    else if (id === "clap") playNoiseHit(context, time, 2400, 0.13, 0.24);
    else if (id === "hat") playNoiseHit(context, time, 7800, 0.045, 0.14);
    else if (id === "openHat") playNoiseHit(context, time, 6200, 0.24, 0.13);
    else if (id === "shaker") playNoiseHit(context, time, 9200, 0.07, 0.10);
    else if (id === "clave") playPercTone(context, time, 2200, 0.08, "square", 0.10);
    else if (id === "congaLow") playPercTone(context, time, 165, 0.36, "triangle", 0.18);
    else if (id === "congaHigh") playPercTone(context, time, 330, 0.18, "triangle", 0.15);
    else if (id === "cowbell") playPercTone(context, time, 760, 0.18, "square", 0.12);
    else if (id === "agogo") playPercTone(context, time, 1040, 0.2, "triangle", 0.12);
    else if (id === "bass") playBassNote(step % BASS_ROOTS.length);
    else if (id === "stab") playChord(step);
    else if (id === "pad") playChord(step + 1);
    else if (id === "synthChord") playSample("synthChord", { gainLevel: 0.52 });
    else if (id === "pluck") playPercTone(context, time, midiToFrequency(60 + (step % 5) * 2), 0.28, "sine", 0.13);
    else if (id === "noise") playNoiseHit(context, time, 1200, 0.52, 0.06);
  }

  function playChord(index) {
    const context = getContext();
    if (!context || disposed) return;
    if (context.state !== "running") {
      unlock().then(() => {
        if (context.state === "running") playChord(index);
      });
      return;
    }

    const now = context.currentTime + 0.015;
    const baseChord = CHORDS[index % CHORDS.length];
    const chord = [
      baseChord[0] - 12,
      ...baseChord,
      baseChord[1] + 12,
      baseChord[2] + 12,
      baseChord[4] + 12,
    ];
    const duration = 15.5;

    chord.forEach((note, noteIndex) => {
      const frequency = midiToFrequency(note);
      const oscillator = context.createOscillator();
      const overtone = context.createOscillator();
      const voiceGain = context.createGain();
      const overtoneGain = context.createGain();
      const filter = context.createBiquadFilter();

      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      overtone.type = "sine";
      overtone.frequency.value = frequency * 2.01;
      overtoneGain.gain.value = 0.11;
      filter.type = "lowpass";
      filter.frequency.value = 1850 - noteIndex * 80;
      filter.Q.value = 0.6;

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.095, now + 0.025);
      voiceGain.gain.exponentialRampToValueAtTime(0.06, now + 1.2);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(filter);
      overtone.connect(overtoneGain);
      overtoneGain.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(masterGain);
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
    getSequencerPattern,
    setSequencerStep,
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
