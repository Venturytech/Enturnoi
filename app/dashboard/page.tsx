import { redirect } from "next/navigation";
import Link from "next/link";
import { getTheme, type BusinessType } from "@/lib/theme";
import { createClient } from "@/lib/supabase/server";
import OperationsPanel from "./OperationsPanel";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, type, status, logo_url, invite_slug")
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
        </div>
      </main>
    );
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  const [{ data: staff }, { data: appointments }, { count: clientsCount }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, name, specialty")
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
  ]);

  return (
    <OperationsPanel
      business={business}
      staff={staff ?? []}
      initialAppointments={(appointments ?? []) as any}
      clientsRegistered={clientsCount ?? 0}
      today={todayKey}
    />
  );
}
