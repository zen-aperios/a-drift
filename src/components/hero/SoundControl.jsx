import React from "react";

export function SoundControl({ soundEnabled, onToggleSound }) {
  const actionLabel = soundEnabled ? "Mute" : "Unmute";

  return (
    <div className="rhodes-audio-control">
      <button
        className="rhodes-audio-button"
        type="button"
        aria-label={actionLabel}
        title={actionLabel}
        onClick={onToggleSound}
      >
        {actionLabel}
      </button>
    </div>
  );
}
