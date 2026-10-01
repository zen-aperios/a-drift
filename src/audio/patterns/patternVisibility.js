export function getVisibleSequencerLayers(event, autoPlayEnabled) {
  const layers = (Array.isArray(event) ? event : [event]).filter(Boolean);
  return layers.filter((layer) => (
    (!layer.startupOnly || !autoPlayEnabled)
    && (!layer.autoOnly || autoPlayEnabled)
  ));
}
