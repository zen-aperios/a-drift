export function createSequencerTransport({
  getContext,
  unlock,
  isDisposed,
  getPattern,
  getSwing,
  isSampleInstrument,
  loadSample,
  playStep,
  schedulePostStamp,
  notifyStep,
  setTimer = (callback, interval) => window.setInterval(callback, interval),
  clearTimer = (timer) => window.clearInterval(timer),
}) {
  const stepDuration = 60 / 120 / 4;
  const lookahead = 0.3;
  const scheduleInterval = 25;
  let timer = null;
  let running = false;
  let startPromise = null;
  let requestId = 0;
  let nextStepTime = 0;
  let step = 0;

  async function start() {
    if (running || startPromise || isDisposed()) return;
    const currentRequestId = requestId + 1;
    requestId = currentRequestId;
    startPromise = (async () => {
      const context = getContext();
      if (!context) return;
      await unlock();
      if (isDisposed() || currentRequestId !== requestId || context.state !== "running" || running) return;
      const sampleIds = new Set();
      getPattern().forEach((event) => {
        const layers = (Array.isArray(event) ? event : [event]).filter(Boolean);
        layers.forEach((layer) => {
          if (isSampleInstrument(layer.instrument)) sampleIds.add(layer.instrument);
        });
      });
      await Promise.all([...sampleIds].map((id) => loadSample(id)));
      if (isDisposed() || currentRequestId !== requestId || context.state !== "running") return;
      running = true;
      step = 0;
      // Leave a small two-step lead-in so the first downbeat does not jump in
      // directly under the scroll gesture.
      nextStepTime = context.currentTime + stepDuration * 2;
      const schedule = () => {
        if (!running || isDisposed()) return;
        const now = context.currentTime;
        while (nextStepTime < now + lookahead) {
          const pattern = getPattern();
          const patternStep = step % pattern.length;
          const event = pattern[patternStep];
          const swingOffset = patternStep % 2 === 1 ? stepDuration * getSwing() : 0;
          playStep(context, event, nextStepTime + swingOffset, patternStep);
          schedulePostStamp({
            step,
            patternStep,
            patternLength: pattern.length,
            time: nextStepTime,
          });
          notifyStep(patternStep, event);
          step += 1;
          nextStepTime += stepDuration;
        }
      };
      schedule();
      timer = setTimer(schedule, scheduleInterval);
    })().finally(() => {
      if (currentRequestId === requestId) startPromise = null;
    });
    return startPromise;
  }

  function stop() {
    requestId += 1;
    running = false;
    startPromise = null;
    if (timer) clearTimer(timer);
    timer = null;
    nextStepTime = 0;
  }

  function dispose() {
    stop();
  }

  return {
    start,
    stop,
    getStep: () => step,
    dispose,
  };
}
