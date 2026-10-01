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
