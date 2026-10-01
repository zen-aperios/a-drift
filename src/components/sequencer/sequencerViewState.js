export const SEQUENCER_PAGE_SIZE = 16;

export function getSequencerPage(step) {
  return Math.floor(step / SEQUENCER_PAGE_SIZE);
}

export function getSequencerPageSteps(pattern, page) {
  const pageStart = page * SEQUENCER_PAGE_SIZE;
  return pattern.slice(pageStart, pageStart + SEQUENCER_PAGE_SIZE);
}

export function shouldFollowSequencerStep(manualPageOverrides, track) {
  return manualPageOverrides[track] === undefined;
}
