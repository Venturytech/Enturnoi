import type { CapacitorConfig } from "@capacitor/cli";

// Configuración de la app nativa (Android / iOS) generada con Capacitor.
// Estrategia: la app envuelve el sitio que ya está en producción (server.url),
// así reusamos toda la web sin reescribir nada. Los plugins nativos
// (ubicación en segundo plano, notificaciones push) se agregan encima.
//
// appId es el identificador permanente en las tiendas: NO cambiarlo después
// de la primera publicación.
const config: CapacitorConfig = {
  appId: "com.venturytech.enturnoi",
  appName: "EnTurnoApp",
  // Carpeta de recursos web locales que empaqueta Capacitor. Como la app
  // carga el sitio real vía server.url, esta carpeta solo lleva una página
  // de respaldo (se ve únicamente si el sitio no está accesible al abrir).
  webDir: "www",
  server: {
    // La app carga el sitio en producción. Cuando exista un dominio propio
    // (ej. app.enturnoi.com) se cambia aquí.
    url: "https://enturnoi-venturytech.vercel.app",
    cleartext: false,
  },
};

export default config;
