// ---------------------------------------------------------------
// Enlaces a las tiendas (App Store / Google Play).
//
// MODO ACTUAL: el botón se MUESTRA (para ver cómo queda) pero todavía
// NO lleva a ninguna parte, porque la app aún no existe.
//
// Cuando la app esté publicada, solo pega los 2 links reales abajo
// (ios y android). Con eso el botón empezará a abrir la tienda
// correcta según el dispositivo. Nada más que tocar.
//
// Si algún día quieres ocultar el botón por completo, pon
// `enabled: false`.
// ---------------------------------------------------------------
export const APP_STORE = {
  enabled: true,
  ios: "", // <- pega aquí el link real de App Store cuando exista
  android: "", // <- pega aquí el link real de Google Play cuando exista
};

export type MobilePlatform = "ios" | "android" | "other";

export function detectPlatform(): MobilePlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

// Devuelve la info para pintar el botón, o null si está oculto
// (enabled = false). `url` puede venir vacío: en ese caso el botón se
// ve pero no navega a ningún lado (modo prueba).
export function appDownloadCta(): { platform: MobilePlatform; url: string } | null {
  if (!APP_STORE.enabled) return null;
  const platform = detectPlatform();
  const url =
    platform === "ios"
      ? APP_STORE.ios
      : platform === "android"
        ? APP_STORE.android
        : APP_STORE.ios || APP_STORE.android || "";
  return { platform, url };
}
