import React, { useEffect } from "react";
import Lenis from "lenis";
import TraceDream from "./components/TraceDream.jsx";

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.16,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
    });

    let rafId = 0;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="dream-app dream-app--trace">
      <TraceDream />
    </main>
  );
}
