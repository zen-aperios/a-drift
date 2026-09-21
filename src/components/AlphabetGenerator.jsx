import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AlphabetGlyph } from "./AlphabetGlyph.jsx";
import { ALPHABET_LETTERS } from "./traceConfig.js";

// Owns the alphabet controls, reveal lifecycle, and responsive glyph grid.
// Individual letter canvases remain isolated in AlphabetGlyph.
export function AlphabetGenerator() {
  const sectionRef = useRef(null);
  const [ghostDirection, setGhostDirection] = useState(148);
  const [warpChaos, setWarpChaos] = useState(0.62);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    let hasRevealed = false;
    const cells = section.querySelectorAll(".alphabet-cell");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasRevealed) return;
        hasRevealed = true;
        gsap.fromTo(
          cells,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.025,
            overwrite: true,
          }
        );
      },
      {
        root: null,
        rootMargin: "360px 0px 360px 0px",
        threshold: 0.01,
      }
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      gsap.killTweensOf(cells);
    };
  }, []);

  return (
    <section ref={sectionRef} className="alphabet-generator" aria-label="Alphabet generator">
      <div className="alphabet-generator__controls" aria-label="Alphabet controls">
        <label className="alphabet-slider">
          <span>Ghost Direction</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={ghostDirection}
            onChange={(event) => setGhostDirection(Number(event.target.value))}
          />
        </label>
        <label className="alphabet-slider">
          <span>Warp Chaos</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={warpChaos}
            onChange={(event) => setWarpChaos(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="alphabet-generator__grid">
        {ALPHABET_LETTERS.map((letter, index) => (
          <AlphabetGlyph
            key={letter}
            letter={letter}
            index={index}
            ghostDirection={ghostDirection}
            warpChaos={warpChaos}
          />
        ))}
      </div>
    </section>
  );
}
