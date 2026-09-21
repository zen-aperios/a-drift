import React from "react";
import TraceDream from "./components/TraceDream.jsx";
import LogoCardSequence from "./components/LogoCardSequence.jsx";

export default function App() {
  return (
    <main className="dream-app dream-app--trace">
      <TraceDream />
      <LogoCardSequence />
    </main>
  );
}
