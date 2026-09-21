import React, { useEffect } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import TraceDream from "./components/TraceDream.jsx";

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.16,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      autoRaf: false,
    });

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="dream-app dream-app--trace">
      <TraceDream />
    </main>
  );
}
