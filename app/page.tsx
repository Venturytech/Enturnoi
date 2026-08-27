import Link from "next/link";
import { getTheme } from "@/lib/theme";

// Portada temporal. Se reemplaza cuando migremos las pantallas del cliente.
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
        <p className="font-body text-sm mb-7" style={{ color: theme.textMuted }}>
          Reservas para barberías y salones
        </p>
        <Link
          href="/login"
          className="font-body inline-block py-3 px-6 rounded-xl font-semibold"
          style={{
            background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`,
            color: theme.buttonText,
          }}
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
