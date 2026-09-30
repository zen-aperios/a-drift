import React, { useEffect, useRef, useState } from "react";
import footerAnimation from "../../../runman01.json";

export function FooterLottie({ animationData = footerAnimation, lazy = false }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  useEffect(() => {
    if (!lazy) {
      setShouldLoad(true);
      return undefined;
    }

    const container = containerRef.current;
    if (!container || shouldLoad) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    observer.observe(container);

    return () => observer.disconnect();
  }, [lazy, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || !containerRef.current) return undefined;
    setReady(false);
    let disposed = false;
    let animation;

    import("lottie-web/build/player/lottie_light").then(({ default: lottie }) => {
      if (disposed || !containerRef.current) return;
      animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData,
      });
      animation.addEventListener("DOMLoaded", () => setReady(true));
    });

    return () => {
      disposed = true;
      animation?.destroy();
    };
  }, [animationData, shouldLoad]);

  return (
    <div
      ref={containerRef}
      className={`site-footer__lottie${ready ? " is-ready" : ""}`}
      aria-label="Animated mark"
      style={{ width: "80px", height: "100px", overflow: "hidden" }}
    />
  );
}
