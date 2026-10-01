export function createSamplePlayer({
  sampleUrls,
  getContext,
  getOutput,
  getDefaultReverbInput,
  connectReverb,
  unlock,
  isDisposed,
}) {
  const buffers = new Map();
  const loads = new Map();

  async function load(id) {
    const context = getContext();
    const url = sampleUrls[id];
    if (!context || !url) return null;
    if (buffers.has(id)) return buffers.get(id);
    if (!loads.has(id)) {
      loads.set(id, fetch(url)
        .then((response) => response.arrayBuffer())
        .then((buffer) => context.decodeAudioData(buffer))
        .then((decoded) => {
          buffers.set(id, decoded);
          return decoded;
        })
        .catch(() => null));
    }
    return loads.get(id);
  }

  async function play(
    id,
    {
      time = null,
      rate = 1,
      gainLevel = null,
      reverbSend = 0,
      reverbInput = getDefaultReverbInput(),
    } = {},
  ) {
    const context = getContext();
    if (!context || isDisposed()) return;
    if (context.state !== "running") {
      await unlock();
      if (context.state !== "running") return;
    }
    const buffer = await load(id);
    if (!buffer || isDisposed()) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const level = gainLevel ?? (id === "triangle" ? 0.18 : 0.42);
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(getOutput());
    connectReverb(gain, context, reverbSend, reverbInput);
    const startTime = Math.max(time ?? 0, context.currentTime + 0.01);
    source.start(startTime);
  }

  function dispose() {
    buffers.clear();
    loads.clear();
  }

  return {
    load,
    play,
    dispose,
  };
}
