import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/theme";

// Placeholder: la pantalla real "Crear negocio" (CreateBusiness) se migra
// en el siguiente paso. Por ahora protege la ruta y confirma la sesión.
export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const theme = getTheme("barber");

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-6 text-center"
      style={{ background: theme.pageBg }}
    >
      <div>
        <h1 className="font-display text-2xl mb-2" style={{ color: theme.textPrimary }}>
          Crear negocio
        </h1>
        <p className="font-body text-sm" style={{ color: theme.textMuted }}>
          Esta pantalla se conecta en el próximo paso.
        </p>
      </div>
    </main>
  );
}
