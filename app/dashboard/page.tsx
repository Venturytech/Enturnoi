import { redirect } from "next/navigation";
import Link from "next/link";
import { getTheme, type BusinessType } from "@/lib/theme";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import OperationsPanel from "./OperationsPanel";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // El superadmin/admin también puede crear y operar su propio negocio.
  // No lo forzamos al Panel Maestro; le damos un enlace para ir y volver.
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = !!adminProfile && (adminProfile.role === "superadmin" || adminProfile.role === "admin");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, type, status, logo_url, invite_slug, phone, address, open_time, close_time, break_start, break_end")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    const pendingType: BusinessType =
      user.user_metadata?.business_type === "salon" ? "salon" : "barber";
    const theme = getTheme(pendingType);
    return (
      <main className="min-h-screen w-full flex items-center" style={{ background: theme.pageBg }}>
        <div className="px-5 py-8 max-w-sm mx-auto w-full">
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
          {isAdmin && (
            <Link href="/admin" className="font-body block mt-4 text-sm" style={{ color: theme.accentRing }}>
              ← Volver al Panel Maestro
            </Link>
          )}
        </div>
      </main>
    );
  }

  // El negocio nuevo entra "pending": espera aprobación del superadmin.
  // Suspendido: el superadmin lo pausó. En ambos casos no mostramos el panel.
  if (business.status !== "active") {
    const theme = getTheme(business.type);
    const pending = business.status === "pending";
    return (
      <main className="min-h-screen w-full flex items-center" style={{ background: theme.pageBg }}>
        <div className="px-5 py-8 max-w-sm mx-auto w-full text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: theme.chipBg }}>
            <span className="font-display text-2xl" style={{ color: theme.accentRing }}>{pending ? "⏳" : "⏸"}</span>
          </div>
          <h1 className="font-display text-2xl mb-2" style={{ color: theme.textPrimary }}>
            {pending ? "Tu negocio está en revisión" : "Tu negocio está suspendido"}
          </h1>
          <p className="font-body text-sm mb-6" style={{ color: theme.textMuted }}>
            {pending
              ? "Ya recibimos tu registro. El equipo de EnTurnoApp activará tu cuenta muy pronto. Vuelve a entrar en un rato."
              : "Tu cuenta fue pausada. Escríbenos para reactivarla."}
          </p>
          <form action={signOut}>
            <button className="font-body inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold" style={{ background: theme.chipBg, color: theme.accentRing, border: `1px solid ${theme.cardBorder}` }}>
              Cerrar sesión
            </button>
          </form>
          {isAdmin && (
            <Link href="/admin" className="font-body block mt-4 text-sm" style={{ color: theme.accentRing }}>
              ← Volver al Panel Maestro
            </Link>
          )}
        </div>
      </main>
    );
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  const [{ data: staff }, { data: appointments }, { count: clientsCount }, { data: catalog }, { data: services }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, name, specialty, photo_url")
      .eq("business_id", business.id)
      .order("name"),
    supabase
      .from("appointments")
      .select(
        `id, appt_time, price, status,
         staff:staff_id ( id, name ),
         client:client_id ( name ),
         business_service:business_service_id ( catalog:catalog_service_id ( name ) )`
      )
      .eq("business_id", business.id)
      .eq("appt_date", todayKey)
      .in("status", ["scheduled", "present"])
      .order("appt_time"),
    supabase
      .from("client_business")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("services_catalog")
      .select("id, category, name")
      .eq("type", business.type)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("business_services")
      .select("catalog_service_id, price")
      .eq("business_id", business.id),
  ]);

  return (
    <OperationsPanel
      business={business}
      staff={staff ?? []}
      initialAppointments={(appointments ?? []) as any}
      clientsRegistered={clientsCount ?? 0}
      today={todayKey}
      catalog={(catalog ?? []) as any}
      services={(services ?? []) as any}
      isAdmin={isAdmin}
    />
  );
}
