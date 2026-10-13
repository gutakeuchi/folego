import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import App from "./App";
import "./styles.css";
import { registerOffline } from "./pwa";

try {
  const preference = localStorage.getItem("folego-theme");
  const dark = preference
    ? preference === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#101d1b" : "#f3f7f5");
} catch {
  /* The app remains usable when storage is unavailable. */
}
registerOffline();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
