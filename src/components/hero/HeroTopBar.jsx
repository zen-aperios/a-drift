import React from "react";
import { FooterLottie } from "../footer/FooterLottie.jsx";
import { SoundControl } from "./SoundControl.jsx";

export function HeroTopBar({ soundEnabled, onToggleSound }) {
  return (
    <div className="hero-top-bar">
      <div className="hero-lottie">
        <FooterLottie />
      </div>
      <SoundControl soundEnabled={soundEnabled} onToggleSound={onToggleSound} />
    </div>
  );
}
