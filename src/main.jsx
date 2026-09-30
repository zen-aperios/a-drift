import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

const stylesReady = new Promise((resolve) => {
  const checkStyles = () => {
    const ready = window.getComputedStyle(document.documentElement)
      .getPropertyValue("--a-drift-styles-ready")
      .trim() === "1";

    if (ready) {
      resolve();
      return;
    }

    window.requestAnimationFrame(checkStyles);
  };

  checkStyles();
});

const loaderPainted = new Promise((resolve) => {
  window.addEventListener("a-drift:loader-painted", resolve, { once: true });
});
const loaderFallback = new Promise((resolve) => window.setTimeout(resolve, 5000));

Promise.all([
  Promise.race([stylesReady, loaderFallback]),
  Promise.race([loaderPainted, loaderFallback]),
]).finally(() => {
  window.requestAnimationFrame(() => {
    document.getElementById("boot-loader")?.remove();
  });
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
