import React, { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

const PAGE_LOADER_LINE_ALPHAS = [
  0.42, 0.39, 0.36, 0.33, 0.3, 0.28, 0.26, 0.24, 0.22, 0.21, 0.19, 0.18, 0.16, 0.15,
  0.13, 0.12, 0.11, 0.1, 0.09, 0.08, 0.07, 0.065, 0.06, 0.055, 0.05, 0.045, 0.04, 0.03,
];

export function PageLoader() {
  const panelRef = useRef(null);
  const [dismissed, setDismissed] = useState(false);

  useLayoutEffect(() => {
    if (!panelRef.current) return undefined;
    const panel = panelRef.current;
    const lines = panelRef.current.querySelectorAll(".page-loader__lines i");
    const shadows = panelRef.current.querySelectorAll(".page-loader__shadow");
    gsap.set(lines, { opacity: 0, y: 0 });
    const timeline = gsap.timeline({ onComplete: () => setDismissed(true) });
    timeline.to(lines, {
      opacity: 1,
      duration: 0.35,
      stagger: { each: 0.025, from: "start" },
      ease: "power2.out",
    }, 0);
    timeline.to(lines, {
      opacity: 0,
      duration: 0.7,
      stagger: { each: 0.044, from: "start" },
      ease: "power2.inOut",
    }, 1.11);
    timeline.to(panel, {
      opacity: 0,
      duration: 1.3,
      ease: "power2.inOut",
    }, 1.7);
    const shadowTweens = Array.from(shadows).map((shadow, index) => gsap.fromTo(
      shadow,
      { xPercent: index % 2 === 0 ? -120 : 120, rotate: index % 2 === 0 ? -8 : 7 },
      {
        xPercent: index % 2 === 0 ? 240 : -240,
        rotate: index % 2 === 0 ? 9 : -6,
        duration: 2.2 + index * 0.35,
        ease: "sine.inOut",
      }
    ));
    const paintedFrame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("a-drift:loader-painted"));
    });

    return () => {
      window.cancelAnimationFrame(paintedFrame);
      timeline.kill();
      shadowTweens.forEach((shadowTween) => shadowTween.kill());
    };
  }, []);

  if (dismissed) return null;

  return (
    <div ref={panelRef} className="page-loader" role="status" aria-label="Loading">
      <div className="site-footer__line-field page-loader__lines" aria-hidden="true">
        {PAGE_LOADER_LINE_ALPHAS.map((alpha, index) => (
          <i key={index} style={{ "--line-alpha": alpha }}>
            <span className="site-footer__line-stroke" />
          </i>
        ))}
      </div>
      <div className="page-loader__shadows" aria-hidden="true">
        <span className="page-loader__shadow" />
        <span className="page-loader__shadow" />
        <span className="page-loader__shadow" />
      </div>
    </div>
  );
}
