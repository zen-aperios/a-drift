import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_RIM_SHOT_STEPS,
  BASIC_RIM_SHOT_STEPS,
  createDefaultSequencerPattern,
} from "../src/audio/patterns/defaultPattern.js";
import { getVisibleSequencerLayers } from "../src/audio/patterns/patternVisibility.js";
import { createTrackState } from "../src/audio/engine/trackState.js";
import { createSequencerTransport } from "../src/audio/engine/sequencerTransport.js";
import {
  getSequencerPage,
  getSequencerPageSteps,
  shouldFollowSequencerStep,
} from "../src/components/sequencer/sequencerViewState.js";

function instrumentSteps(pattern, instrument, autoPlayEnabled) {
  return pattern.flatMap((event, step) => (
    getVisibleSequencerLayers(event, autoPlayEnabled)
      .some((layer) => layer.instrument === instrument) ? [step] : []
  ));
}

test("sequencer pages contain 16 steps and manual pages stop autoplay following", () => {
  const pattern = Array.from({ length: 64 }, (_, step) => step);

  assert.equal(getSequencerPage(0), 0);
  assert.equal(getSequencerPage(15), 0);
  assert.equal(getSequencerPage(16), 1);
  assert.equal(getSequencerPage(63), 3);
  assert.deepEqual(getSequencerPageSteps(pattern, 2), pattern.slice(32, 48));
  assert.equal(shouldFollowSequencerStep({}, "bass"), true);
  assert.equal(shouldFollowSequencerStep({ bass: 0 }, "bass"), false);
  assert.equal(shouldFollowSequencerStep({ bass: 0 }, "kick"), true);
});

test("startup and autoplay expose their distinct rim-shot patterns", () => {
  const pattern = createDefaultSequencerPattern();
  const finalLayers = getVisibleSequencerLayers(pattern[63], false);
  const finalBongo = finalLayers.find((layer) => layer.instrument === "bongoLow");

  assert.equal(pattern.length, 64);
  assert.deepEqual(instrumentSteps(pattern, "808:Rim_Shot_A_808", false), BASIC_RIM_SHOT_STEPS);
  assert.deepEqual(instrumentSteps(pattern, "808:Rim_Shot_A_808", true), AUTO_RIM_SHOT_STEPS);
  assert.deepEqual(instrumentSteps(pattern, "727:Conga_Lo_727_18", false), [60]);
  assert.equal(instrumentSteps(pattern, "bongoLow", false).length, 1);
  assert.equal(finalBongo.rate, 1.48);
  assert.equal("gainLevel" in finalBongo, false);
});

test("track settings preserve defaults, clamp values, and notify volume subscribers", () => {
  const state = createTrackState();
  const changes = [];
  const unsubscribe = state.subscribeVolume((instrument, volume) => changes.push([instrument, volume]));

  assert.equal(state.getVolume("808:Tom_Low_B_808_11"), 0.81);
  assert.deepEqual(state.getEffect("808:Rim_Shot_A_808"), { reverb: 0.59, reverbDecay: 0.65 });
  assert.equal(state.setVolume("kick", 4), 1);
  assert.equal(state.setVolume("bass", -2), 0);
  assert.deepEqual(state.setEffect("kick", "reverb", 2), { reverb: 0.6, reverbDecay: 0 });
  assert.deepEqual(state.setEffect("kick", "reverbDecay", -1), { reverb: 0.6, reverbDecay: 0 });
  assert.deepEqual(changes, [["kick", 1], ["bass", 0]]);

  unsubscribe();
  state.setVolume("kick", 0.5);
  assert.equal(changes.length, 2);
});

test("transport keeps lead-in, swing, notifications, and stop cleanup stable", async () => {
  const context = { state: "suspended", currentTime: 10 };
  const pattern = [{ instrument: "sample" }, { instrument: "kick" }, null, [{ instrument: "sample" }]];
  const loaded = [];
  const played = [];
  const posts = [];
  const notices = [];
  let timerCallback;
  let clearedTimer;

  const transport = createSequencerTransport({
    getContext: () => context,
    unlock: async () => { context.state = "running"; },
    isDisposed: () => false,
    getPattern: () => pattern,
    getSwing: () => 0.18,
    isSampleInstrument: (instrument) => instrument === "sample",
    loadSample: async (instrument) => { loaded.push(instrument); },
    playStep: (_context, event, time, step) => played.push({ event, time, step }),
    playSample: () => {},
    playKick: () => {},
    schedulePostStamp: (details) => posts.push(details),
    notifyStep: (step, event) => notices.push({ step, event }),
    setTimer: (callback, interval) => {
      assert.equal(interval, 25);
      timerCallback = callback;
      return 7;
    },
    clearTimer: (timer) => { clearedTimer = timer; },
  });

  await transport.start();
  assert.deepEqual(loaded, ["sample"]);
  assert.deepEqual(played[0], { event: pattern[0], time: 10.25, step: 0 });

  context.currentTime = 11.1;
  timerCallback();
  assert.equal(played.find((entry) => entry.step === 1).time, 10.3975);
  assert.equal(posts.length, played.length);
  assert.equal(notices.length, played.length);

  transport.stop();
  assert.equal(clearedTimer, 7);
});

test("stopping during preload prevents delayed transport startup", async () => {
  let releaseLoad;
  const heldLoad = new Promise((resolve) => { releaseLoad = resolve; });
  let played = false;
  let timerCreated = false;
  const context = { state: "running", currentTime: 1 };
  const transport = createSequencerTransport({
    getContext: () => context,
    unlock: async () => {},
    isDisposed: () => false,
    getPattern: () => [{ instrument: "sample" }],
    getSwing: () => 0,
    isSampleInstrument: () => true,
    loadSample: (instrument) => instrument === "sample" ? heldLoad : Promise.resolve(),
    playStep: () => { played = true; },
    playSample: () => {},
    playKick: () => {},
    schedulePostStamp: () => {},
    notifyStep: () => {},
    setTimer: () => { timerCreated = true; },
    clearTimer: () => {},
  });

  const starting = transport.start();
  await Promise.resolve();
  transport.stop();
  releaseLoad();
  await starting;

  assert.equal(played, false);
  assert.equal(timerCreated, false);
});
