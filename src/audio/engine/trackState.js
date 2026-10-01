const DEFAULT_TRACK_LEVELS = {
  "808:Tom_Low_B_808_11": 0.81,
  "808:Rim_Shot_A_808": 0.51,
  "727:Conga_Lo_727_18": 0.34,
  "727:Conga_Hi_Open_727_18": 0.39,
  "727:Conga_Hi_Mute_727_18": 0.34,
};

const DEFAULT_TRACK_EFFECTS = {
  "808:Rim_Shot_A_808": { reverb: 0.59, reverbDecay: 0.65 },
};

const EFFECT_RANGES = {
  reverb: [0, 0.6],
  reverbDecay: [0, 4],
};

export function createTrackState() {
  const volumeListeners = new Set();
  const volumes = new Map(Object.entries(DEFAULT_TRACK_LEVELS));
  const effects = new Map(Object.entries(DEFAULT_TRACK_EFFECTS).map(([instrument, effect]) => (
    [instrument, { ...effect }]
  )));

  function getEffect(instrument) {
    if (!instrument) return { reverb: 0, reverbDecay: 0 };
    if (!effects.has(instrument)) {
      effects.set(instrument, { reverb: 0, reverbDecay: 0 });
    }
    return { ...effects.get(instrument) };
  }

  function setEffect(instrument, name, value) {
    if (!instrument) return null;
    const current = getEffect(instrument);
    if (!EFFECT_RANGES[name]) return null;
    const [min, max] = EFFECT_RANGES[name];
    current[name] = Math.max(min, Math.min(max, Number(value)));
    effects.set(instrument, current);
    return { ...current };
  }

  function getEffects() {
    return Object.fromEntries([...effects.entries()].map(([instrument]) => (
      [instrument, getEffect(instrument)]
    )));
  }

  function setVolume(instrument, volume) {
    if (!instrument) return undefined;
    const nextVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    volumes.set(instrument, nextVolume);
    volumeListeners.forEach((listener) => listener(instrument, nextVolume));
    return nextVolume;
  }

  function getVolume(instrument) {
    return volumes.get(instrument) ?? 1;
  }

  function getVolumes() {
    return Object.fromEntries(volumes.entries());
  }

  function subscribeVolume(listener) {
    volumeListeners.add(listener);
    return () => volumeListeners.delete(listener);
  }

  return {
    getEffect,
    setEffect,
    getEffects,
    setVolume,
    getVolume,
    getVolumes,
    subscribeVolume,
  };
}
