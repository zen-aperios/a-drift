import React from "react";

export function SoundControl({ soundEnabled, onToggleSound }) {
  return (
    <div className="rhodes-audio-control">
      <button
        className="rhodes-audio-button"
        type="button"
        aria-label="Play Rhodes sound"
        title="Play Rhodes sound"
        onClick={onToggleSound}
      >
        {soundEnabled ? "Sound on" : "Sound off"}
      </button>
    </div>
  );
}
