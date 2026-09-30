# Sound Controls

Reference for the sound engine, live sequencer, stamp sounds, and possible future controls.

## Bass Controls

Current or supported bass controls:

| Setting | Purpose | Suggested range |
| --- | --- | --- |
| Sound shape | Selects the oscillator character, such as deep sine, house pluck, or velvet bass | Presets |
| Level | Bass volume | 0-100% |
| Octave | Moves the bass register | -3 to -1 octaves |
| Cutoff / brightness | Filter brightness. This is currently named `Brightness` | 400-1800 Hz |
| Resonance | Emphasizes the cutoff area | 0.3-10 |
| Attack | How quickly each note starts | 0.002-0.08s |
| Decay | How quickly each note falls away | 0.25-1.2s |
| Sub / body | Mixes the secondary body oscillator | 0-40% |
| Transpose | Moves the whole bass pattern by semitones | -12 to +12 |
| Reverb | Amount sent to the bass reverb | 0-60% |
| Reverb decay | Length of the reverb tail | 0-4s |

Useful future bass controls:

- Release: tail length after a note ends.
- Drive / saturation: adds weight, warmth, and harmonic distortion.
- Glide / portamento: smooths the movement between notes.
- Filter type: low-pass, band-pass, or high-pass.
- Filter envelope amount: makes the cutoff move with each note.
- Pulse width: changes the character of square and pulse shapes.
- Stereo width: controls how wide the bass body feels.

## Sequencer Track Controls

Each selected track can have its own:

| Setting | Purpose |
| --- | --- |
| Level | Independent volume for that track |
| Reverb | Independent reverb send |
| Reverb decay | Independent reverb tail length |
| Step active state | Turns an instrument on or off on a step |
| Note pitch | Moves an individual step up or down by semitones |
| Sample choice | Replaces the sound assigned to a track |
| Track duplication | Creates another independent rhythm from a bass track |
| Preview | Plays the selected sound before assigning it |

## Sequencer Timing

- BPM: currently 120.
- Swing: currently 0.18, with a supported range of 0-0.5.
- Pattern length: 64 steps.
- Page size: 16 steps.
- Pages: 4.
- Page arrows can manually override automatic playback paging.
- Bass notes can repeat a page or use different pitch variations across pages.

Useful future timing controls:

- Per-track swing amount.
- Humanize timing.
- Humanize velocity.
- Note probability.
- Step repeat / ratchet count.
- Pattern length selector: 16, 32, or 64 steps.
- Quantization strength.

## Available Instrument Groups

- Core: kick, hat, clap, bass, bongos, and other built-in sounds.
- 727 samples.
- 808 samples.
- 909 samples when files are present.
- Korg melodic and chord samples.
- Synth chord and stamp sounds.

## Stamp / Auto-Play Sound

- Stamp sound selection.
- Alternating stamp sound pattern.
- Chord progression selection.
- Chord root and sample playback-rate mapping.
- Auto-play sequencer continuation after the stamps.
- Synth stamp reverb and decay.
- Sound activation toggle.
- Scroll-triggered playback.

## Per-Note Editing

- Single click: toggle a step on or off.
- Double click: select a filled step for editing.
- Minus button: lower the selected note by one semitone.
- Plus button: raise the selected note by one semitone.
- Each step stores its own pitch offset.

## Export

The sequence export can contain:

- BPM.
- 64-step pattern.
- Track levels.
- Track reverb and decay values.
- Swing amount.
- Per-step pitch offsets.

