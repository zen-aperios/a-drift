export const SAMPLE_URLS = {
  bongoLow: "/audio/percussion/bongo-low.wav",
  bongoHigh: "/audio/percussion/bongo-high.wav",
  korgSoftChordFMinor: new URL("../korg/korg-synth-fx-down-sweep-2/korg-fx-down-sweep-synth-shot-soft-chord_F_minor.wav", import.meta.url).href,
  korgSoftChordHighFMinor: new URL("../korg/korg-synth-fx-down-sweep-2/korg-fx-down-sweep-synth-shot-soft-chord-high_F_minor.wav", import.meta.url).href,
};

const LIBRARY_727_URLS = import.meta.glob("../../../727/*.wav", {
  eager: true,
  import: "default",
  query: "?url",
});

const LIBRARY_808_URLS = import.meta.glob("../../../808/*.wav", {
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

export const LIBRARY_SAMPLE_IDS = Object.keys(SAMPLE_URLS).filter((id) => id.includes(":"));
