import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/theme";
import { signOut } from "@/app/auth/actions";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ¿El dueño ya creó su negocio?
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, type, status")
    .eq("owner_id", user.id)
    .maybeSingle();

  const theme = getTheme(business?.type === "salon" ? "salon" : "barber");

  return (
    <main className="min-h-screen w-full" style={{ background: theme.pageBg }}>
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${theme.divider}` }}
      >
        <span className="font-display text-base" style={{ color: theme.textPrimary }}>
          {business?.name ?? "EnTurno"}
        </span>
        <form action={signOut}>
          <button
            className="font-body flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
            style={{ border: `1px solid ${theme.cardBorder}`, color: theme.textMuted }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </form>
      </div>

      <div className="px-5 py-8 max-w-sm mx-auto">
        {business ? (
          <>
            <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
              Tu negocio hoy
            </h1>
            <p className="font-body text-sm" style={{ color: theme.textMuted }}>
              Sesión iniciada como {user.email}. El panel de operaciones se conecta en la
              siguiente pantalla que migremos.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl mb-1" style={{ color: theme.textPrimary }}>
              Casi listo
            </h1>
            <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>
              Aún no has creado tu negocio. Vamos a configurarlo.
            </p>
            <Link
              href="/onboarding"
              className="font-body inline-block py-3 px-5 rounded-xl font-semibold"
              style={{
                background: `linear-gradient(135deg, ${theme.accentFrom}, ${theme.accentTo})`,
                color: theme.buttonText,
              }}
            >
              Crear mi negocio
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
