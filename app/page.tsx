import { getTheme } from "@/lib/theme";

// Portada temporal. Se reemplaza cuando migremos las pantallas reales
// (login del negocio, panel maestro, flujo del cliente).
export default function Home() {
  const theme = getTheme("barber");

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-6 text-center"
      style={{ background: theme.pageBg }}
    >
      <div>
        <h1 className="font-display text-4xl mb-3" style={{ color: theme.textPrimary }}>
          Enturnoi
        </h1>
        <p className="font-body text-sm" style={{ color: theme.textMuted }}>
          Reservas para barberías y salones · en construcción
        </p>
      </div>
    </main>
  );
}
