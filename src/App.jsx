import React, { useEffect } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import TraceDrift from "./components/TraceDrift.jsx";
import { PageLoader } from "./components/loader/PageLoader.jsx";
import { NoiseLayer } from "./components/NoiseLayer.jsx";

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
    <>
      <PageLoader />
      <NoiseLayer />
      <main className="drift-app drift-app--trace">
        <TraceDrift />
      </main>
    </>
  );
}
