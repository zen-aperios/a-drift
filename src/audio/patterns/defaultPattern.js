export const BASIC_RIM_SHOT_STEPS = [6, 13, 20, 51, 60];

export const AUTO_RIM_SHOT_STEPS = [
  4, 6, 10, 12, 13, 18, 20, 26, 27, 29,
  36, 38, 43, 44, 46, 51, 52, 59, 60, 62,
];

function putPatternLayer(pattern, step, instrument, options = {}) {
  const current = pattern[step]
    ? (Array.isArray(pattern[step]) ? pattern[step].slice() : [pattern[step]])
    : [];
  current.push({ instrument, ...options });
  pattern[step] = current;
}

export function createDefaultSequencerPattern() {
  const pattern = Array.from({ length: 64 }, () => null);

  for (let step = 0; step < 64; step += 4) putPatternLayer(pattern, step, "kick");
  for (let step = 2; step < 64; step += 4) putPatternLayer(pattern, step, "hat");

  [
    ["727:Conga_Lo_727_18", [60]],
    ["808:Tom_Low_B_808_11", [6, 14, 22, 30, 38, 46, 54, 62]],
    ["727:Conga_Hi_Mute_727_18", [11, 27, 43, 59]],
    ["727:Conga_Hi_Open_727_18", [47, 63]],
  ].forEach(([instrument, steps]) => {
    steps.forEach((step) => putPatternLayer(pattern, step, instrument));
  });

  BASIC_RIM_SHOT_STEPS.forEach((step) => {
    putPatternLayer(pattern, step, "808:Rim_Shot_A_808", { startupOnly: true });
  });
  AUTO_RIM_SHOT_STEPS.forEach((step) => {
    putPatternLayer(pattern, step, "808:Rim_Shot_A_808", { autoOnly: true });
  });

  [
    [0, 0], [3, 0], [6, 7], [8, 0], [11, 0], [14, 0],
    [16, 0], [19, 0], [22, 7], [24, 0], [27, 0], [30, 0],
    [32, 0], [35, 0], [38, 7], [40, 0], [43, 0], [46, 0],
    [48, 0], [51, 0], [54, 7], [56, 0], [59, 0], [62, 0],
  ].forEach(([step, pitch]) => putPatternLayer(pattern, step, "bass", { pitch }));

  putPatternLayer(pattern, 63, "bongoLow", { rate: 1.48 });
  [0, 16, 32, 48].forEach((step) => {
    putPatternLayer(pattern, step, "stamp:korg", { muted: true });
  });

  return pattern;
}
