const sampleModules = import.meta.glob("../audio/**/*.{wav,WAV,mp3,MP3,aif,AIF,aiff,AIFF,ogg,OGG}", {
  eager: true,
  import: "default",
  query: "?url",
});

function labelFromPath(path) {
  const fileName = path.split("/").pop().replace(/\.[^.]+$/, "");
  return fileName
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFromPath(path) {
  const parts = path.split("/");
  const category = parts[2] || "other";
  if (category === "house-c's") return "House chords";
  if (category === "808") return "808";
  if (category === "909") return "909";
  if (category === "korg") return "Korg";
  if (category === "mini") return "Mini";
  return category;
}

export const DOWNLOADED_SAMPLE_LIBRARY = Object.entries(sampleModules)
  .sort(([first], [second]) => first.localeCompare(second))
  .map(([path, url], index) => [
    `userSample${index}`,
    labelFromPath(path),
    url,
    categoryFromPath(path),
  ]);
