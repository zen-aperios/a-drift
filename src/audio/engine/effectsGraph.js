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

export function createEffectsGraph({ getTrackEffect, setTrackEffect, getBassSettings }) {
  let audioContext;
  let output;
  let bassReverbInput;
  let bassReverbGain;
  const trackReverbBuses = new Map();

  function refreshBassReverbImpulse() {
    if (!audioContext || !bassReverbInput) return;
    bassReverbInput.buffer = createReverbImpulse(audioContext, getBassSettings().reverbDecay);
  }

  function initialize(context, destination) {
    if (audioContext === context && output === destination && bassReverbInput) return;
    audioContext = context;
    output = destination;
    bassReverbInput = audioContext.createConvolver();
    bassReverbGain = audioContext.createGain();
    bassReverbGain.gain.value = getBassSettings().reverb;
    bassReverbInput.connect(bassReverbGain);
    bassReverbGain.connect(output);
    refreshBassReverbImpulse();
  }

  function getBassReverbInput() {
    return bassReverbInput;
  }

  function setBassReverbLevel(value) {
    if (bassReverbGain) bassReverbGain.gain.value = value;
  }

  function getTrackReverbBus(instrument) {
    if (!audioContext || !instrument) return null;
    if (!trackReverbBuses.has(instrument)) {
      const input = audioContext.createConvolver();
      const gain = audioContext.createGain();
      const effect = getTrackEffect(instrument);
      input.buffer = createReverbImpulse(audioContext, effect.reverbDecay);
      gain.gain.value = effect.reverb;
      input.connect(gain);
      gain.connect(output);
      trackReverbBuses.set(instrument, { input, gain });
    }
    return trackReverbBuses.get(instrument);
  }

  function connect(sourceGain, context, reverbSend, reverbInput) {
    if (!reverbInput || reverbSend <= 0) return;
    const reverbGain = context.createGain();
    reverbGain.gain.value = reverbSend;
    sourceGain.connect(reverbGain);
    reverbGain.connect(reverbInput);
  }

  function updateTrackEffect(instrument, name, value) {
    const current = setTrackEffect(instrument, name, value);
    if (!current) return;
    const bus = trackReverbBuses.get(instrument);
    if (bus) {
      if (name === "reverb") bus.gain.gain.value = current.reverb;
      if (name === "reverbDecay") {
        bus.input.buffer = createReverbImpulse(audioContext, current.reverbDecay);
      }
    }
  }

  function dispose() {
    trackReverbBuses.forEach(({ input, gain }) => {
      input.disconnect();
      gain.disconnect();
    });
    trackReverbBuses.clear();
    bassReverbInput?.disconnect();
    bassReverbGain?.disconnect();
    bassReverbInput = undefined;
    bassReverbGain = undefined;
    audioContext = undefined;
    output = undefined;
  }

  return {
    initialize,
    getBassReverbInput,
    setBassReverbLevel,
    refreshBassReverbImpulse,
    getTrackReverbBus,
    connect,
    updateTrackEffect,
    dispose,
  };
}
