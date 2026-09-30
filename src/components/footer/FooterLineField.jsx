import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import footerContentAnimation from "../../../runman02.json";
import aperiosLogo from "../../../logo.svg";
import { AlphabetGlyph } from "../AlphabetGlyph.jsx";
import { FooterLottie } from "./FooterLottie.jsx";

export function FooterLineField() {
  const fieldRef = useRef(null);

  useLayoutEffect(() => {
    if (!fieldRef.current) return undefined;
    const field = fieldRef.current;
    const primaryCurrents = field.querySelectorAll(".site-footer__line-current--primary");
    const secondaryCurrents = field.querySelectorAll(".site-footer__line-current--secondary");
    const tertiaryCurrents = field.querySelectorAll(".site-footer__line-current--tertiary");
    const tweens = [];

    primaryCurrents.forEach((current, index) => {
      tweens.push(gsap.fromTo(current,
        { x: () => field.clientWidth * 0.04 },
        {
          x: () => Math.max(field.clientWidth * 0.04, field.clientWidth - current.offsetWidth - field.clientWidth * 0.04),
          duration: 42,
          delay: index * -0.08,
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
          ease: "sine.inOut",
        }
      ));
    });

    secondaryCurrents.forEach((current, index) => {
      tweens.push(gsap.fromTo(current,
        { x: () => field.clientWidth + current.offsetWidth },
        {
          x: () => -current.offsetWidth,
          duration: 68,
          delay: index * -0.06,
          repeat: -1,
          repeatRefresh: true,
          ease: "none",
        }
      ));
    });

    tertiaryCurrents.forEach((current, index) => {
      tweens.push(gsap.fromTo(current,
        { x: () => Math.max(field.clientWidth * 0.04, field.clientWidth - current.offsetWidth - field.clientWidth * 0.04) },
        {
          x: () => field.clientWidth * 0.04,
          duration: 48,
          delay: index * -0.07,
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
          ease: "sine.inOut",
        }
      ));
    });

    return () => tweens.forEach((tween) => tween.kill());
  }, []);

  return (
    <span ref={fieldRef} className="site-footer__line-cell">
      <span className="site-footer__line-field" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index}>
            <span className="site-footer__line-stroke">
              <span className="site-footer__line-current site-footer__line-current--primary" />
              <span className="site-footer__line-current site-footer__line-current--secondary" />
              <span className="site-footer__line-current site-footer__line-current--tertiary" />
            </span>
          </i>
        ))}
      </span>
      <div className="site-footer__idea-row">
        <div className="site-footer__idea-column site-footer__idea-primary">
          <div className="site-footer__collaboration">
            <FooterLottie animationData={footerContentAnimation} lazy />
            <div className="site-footer__collaboration-x" aria-hidden="true">
              <div />
              <div />
            </div>
            <img className="site-footer__collaboration-logo" src={aperiosLogo} alt="Aperios Design" />
          </div>
          <div className="site-footer__idea-word" aria-label="5 Days, catch my drift">
            <div className="site-footer__idea-word-main">
              {Array.from("5-DAYS").map((letter, index) => (
                <AlphabetGlyph
                  key={`${letter}-${index}`}
                  letter={letter}
                  index={index}
                  ghostDirection={148}
                  warpChaos={0.62}
                />
              ))}
            </div>
            <div className="site-footer__idea-word-tagline">
              {Array.from("CATCH MY DRIFT").map((letter, index) => (
                <AlphabetGlyph
                  key={`${letter}-${index}`}
                  letter={letter}
                  index={index}
                  ghostDirection={148}
                  warpChaos={0.62}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="site-footer__idea-column site-footer__idea-directories">
          <nav className="site-footer__idea-links" aria-label="Other links">
            <span className="site-footer__idea-links-title">OTHER</span>
            <a href="https://tympanus.net/codrops/" target="_blank" rel="noreferrer">CODROPS</a>
            <a href="https://gsap.com/" target="_blank" rel="noreferrer">GSAP</a>
          </nav>
          <nav className="site-footer__idea-links" aria-label="Social links">
            <span className="site-footer__idea-links-title">SOCIAL</span>
            <a href="https://www.runrobrun.com" target="_blank" rel="noreferrer">RUN ROB RUN</a>
            <a href="https://aperios-design.co.uk" target="_blank" rel="noreferrer">APERIOS DESIGN</a>
            <a href="mailto:aperiosdevelopment@gmail.com">CONTACT</a>
          </nav>
        </div>
      </div>
    </span>
  );
}
