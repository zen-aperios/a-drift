import React, { useState } from "react";
import SphereHero from "./components/SphereHero.jsx";
import TraceDream from "./components/TraceDream.jsx";

export default function App() {
  const [phase, setPhase] = useState("sphere");

  return (
    <main className={`dream-app dream-app--${phase}`}>
      {phase === "sphere" && <SphereHero onComplete={() => setPhase("trace")} />}
      {phase === "trace" && <TraceDream />}
    </main>
  );
}
