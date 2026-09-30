import React, { useEffect, useRef, useState } from "react";

const MINI_SEQUENCER_LABELS = {
  kick: "KICK",
  hat: "HAT",
  bass: "BASS",
  bongoLow: "BONGO LOW",
  bongoHigh: "BONGO HIGH",
  clap: "CLAP",
};

export function miniInstrumentLabel(instrument) {
  if (instrument?.startsWith("bass:")) return `BASS ${instrument.split(":")[1]}`;
  return MINI_SEQUENCER_LABELS[instrument]
    || instrument.replace(/^[^:]+:/, "").replaceAll("_", " ").toUpperCase();
}

export function MiniTrackDropdown({ engine, value, groups, placeholder, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className={`mini-track-dropdown${open ? " is-open" : ""}${!value ? " mini-track-dropdown--add" : ""}`} ref={dropdownRef}>
      <button
        className="mini-track-dropdown__trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value ? miniInstrumentLabel(value) : placeholder}
        {value && <span aria-hidden="true">+</span>}
      </button>
      {open && (
        <div
          className="mini-track-dropdown__menu"
          role="listbox"
          data-lenis-prevent
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.scrollTop += event.deltaY;
            window.requestAnimationFrame(() => {
              const option = document
                .elementFromPoint(event.clientX, event.clientY)
                ?.closest(".mini-track-dropdown__option");
              const instrument = option?.dataset.instrument;
              if (instrument) engine?.previewSequencerInstrument?.(instrument);
            });
          }}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {groups.map((group) => (
            <div className="mini-track-dropdown__group" key={group.label}>
              <div className="mini-track-dropdown__separator">{group.label}</div>
              {group.items.map((option) => (
                <button
                  className={`mini-track-dropdown__option${option === value ? " is-current" : ""}`}
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  data-instrument={option}
                  onMouseEnter={() => engine?.previewSequencerInstrument?.(option)}
                  onFocus={() => engine?.previewSequencerInstrument?.(option)}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {miniInstrumentLabel(option)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
