export function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export function createSynthVoices({
  chords,
  bassRoots,
  getOutput,
  getBassControls,
  getBassReverbInput,
  connectReverb,
}) {
  let noiseBuffer;

  function getNoiseBuffer(context) {
    if (noiseBuffer) return noiseBuffer;
    noiseBuffer = context.createBuffer(1, context.sampleRate * 1.5, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function envelope(context, time, level, attack, decay) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    gain.connect(getOutput());
    return gain;
  }

  function playPercussion(context, step) {
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
    kickGain.connect(getOutput());
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
    hatGain.connect(getOutput());
    hat.start(now + 0.045);
    hat.stop(now + 0.15);
  }

  function playNoiseHit(
    context,
    time,
    frequency,
    decay,
    level,
    volume = 1,
    reverbInput = getBassReverbInput(),
    reverbSend = 0.32,
  ) {
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

  function playKick(
    context,
    time,
    volume = 1,
    reverbSend = 0,
    reverbInput = getBassReverbInput(),
  ) {
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

  function playBassNote(
    context,
    index,
    scheduledTime = null,
    volume = 1,
    pitch = 0,
    reverbInput = getBassReverbInput(),
    reverbSend = getBassControls().reverb * 0.32,
  ) {
    const bassControls = getBassControls();
    const now = scheduledTime ?? context.currentTime + 0.015;
    const oscillator = context.createOscillator();
    const bodyOscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const bodyGain = context.createGain();
    oscillator.type = bassControls.waveform;
    bodyOscillator.type = bassControls.bodyWaveform;
    const rootFrequency = midiToFrequency(
      bassRoots[index % bassRoots.length] + bassControls.octave * 12 + bassControls.transpose + pitch
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
    gain.connect(getOutput());
    bodyOscillator.connect(bodyGain);
    bodyGain.connect(getOutput());
    connectReverb(gain, context, reverbSend, reverbInput);
    connectReverb(bodyGain, context, reverbSend, reverbInput);
    oscillator.start(now);
    bodyOscillator.start(now);
    oscillator.stop(now + Math.max(0.75, bassControls.decay + bassControls.reverbDecay));
    bodyOscillator.stop(now + Math.max(0.55, bassControls.decay * 0.68 + bassControls.reverbDecay));
  }

  function playChord(
    context,
    index,
    {
      variant = "classic",
      time = null,
      duration = 15.5,
      volume = 1,
      reverbInput = getBassReverbInput(),
      reverbSend = getBassControls().reverb * 0.32,
    } = {},
  ) {
    const now = time ?? context.currentTime + 0.015;
    const baseChord = chords[index % chords.length];
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
      voiceGain.connect(getOutput());
      connectReverb(voiceGain, context, reverbSend, reverbInput);
      oscillator.start(now);
      overtone.start(now);
      oscillator.stop(now + duration + 0.05);
      overtone.stop(now + duration + 0.05);
    });
  }

  function dispose() {
    noiseBuffer = undefined;
  }

  return {
    playPercussion,
    playNoiseHit,
    playPercTone,
    playKick,
    playBassNote,
    playChord,
    dispose,
  };
}
