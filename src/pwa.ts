export function registerOffline() {
  if (
    !import.meta.env.PROD ||
    !["http:", "https:"].includes(location.protocol) ||
    !("serviceWorker" in navigator)
  )
    return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        console.info("Modo offline indisponível neste navegador.");
      });
  });
}
