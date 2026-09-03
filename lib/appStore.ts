// ---------------------------------------------------------------
// Enlaces a las tiendas (App Store / Google Play).
//
// Todavía no existe la app nativa. Cuando esté publicada:
//   1) pon `enabled: true`
//   2) pega los enlaces reales de iOS y Android
// Con eso, la pantalla del cliente mostrará el botón de descarga
// automáticamente según el dispositivo. Nada más que tocar.
// ---------------------------------------------------------------
export const APP_STORE = {
  enabled: false,
  ios: "https://apps.apple.com/app/id0000000000", // reemplazar con el link real
  android: "https://play.google.com/store/apps/details?id=com.enturnoapp", // reemplazar con el link real
};

export type MobilePlatform = "ios" | "android" | "other";

export function detectPlatform(): MobilePlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

// Devuelve el link de descarga adecuado al dispositivo, o null si aún
// no está habilitado / no aplica.
export function storeLinkForDevice(): { platform: MobilePlatform; url: string } | null {
  if (!APP_STORE.enabled) return null;
  const platform = detectPlatform();
  if (platform === "ios" && APP_STORE.ios) return { platform, url: APP_STORE.ios };
  if (platform === "android" && APP_STORE.android) return { platform, url: APP_STORE.android };
  return null;
}
