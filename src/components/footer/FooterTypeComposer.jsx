import React, { useEffect, useState } from "react";
import { AlphabetGlyph } from "../AlphabetGlyph.jsx";

const footerGlyphAdvanceCache = new Map();
let footerGlyphMeasureContext;

function getFooterGlyphAdvance(letter) {
  if (footerGlyphAdvanceCache.has(letter)) return footerGlyphAdvanceCache.get(letter);
  if (typeof document === "undefined") return 0.62;

  if (!footerGlyphMeasureContext) {
    footerGlyphMeasureContext = document.createElement("canvas").getContext("2d");
    footerGlyphMeasureContext.font = "900 100px Helvetica, Arial, sans-serif";
  }

  const advance = footerGlyphMeasureContext.measureText(letter).width / 100 + 0.015;
  footerGlyphAdvanceCache.set(letter, advance);
  return advance;
}

export function FooterTypeComposer() {
  const [value, setValue] = useState("");
  const [demoText, setDemoText] = useState("");
  const [hasTyped, setHasTyped] = useState(false);

  useEffect(() => {
    if (hasTyped) return undefined;

    const word = "TYPE SOMETHING";
    let index = 0;
    let deleting = false;
    let timer;

    const tick = () => {
      if (!deleting) {
        index += 1;
        setDemoText(word.slice(0, index));
        if (index === word.length) {
          deleting = true;
          timer = window.setTimeout(tick, 900);
          return;
        }
      } else {
        index -= 1;
        setDemoText(word.slice(0, index));
        if (index === 0) {
          deleting = false;
          timer = window.setTimeout(tick, 320);
          return;
        }
      }
      timer = window.setTimeout(tick, deleting ? 90 : 150);
    };

    timer = window.setTimeout(tick, 350);
    return () => window.clearTimeout(timer);
  }, [hasTyped]);

  const displayText = hasTyped ? value : demoText;

  return (
    <section className="footer-type" aria-label="Write with the alphabet display">
      <div className="footer-type__input-wrap">
        <input
          className="footer-type__input"
          type="text"
          value={value}
          maxLength={32}
          aria-label="Write text"
          autoComplete="off"
          spellCheck="false"
          onChange={(event) => {
            setHasTyped(true);
            setValue(event.target.value.toUpperCase());
          }}
        />
        <div
          className="footer-type__display"
          aria-live="polite"
          aria-label={displayText || "Write preview"}
        >
          {Array.from(displayText).map((letter, index) => (
            <AlphabetGlyph
              key={`${letter}-${index}`}
              letter={letter}
              index={index}
              ghostDirection={290}
              warpChaos={0.62}
              style={{ "--footer-glyph-advance": getFooterGlyphAdvance(letter) }}
            />
          ))}
          <span className="footer-type__caret" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
