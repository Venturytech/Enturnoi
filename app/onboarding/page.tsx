import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BusinessType } from "@/lib/theme";
import OnboardingForm, { type CatalogItem } from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing) redirect("/dashboard");

  const businessType: BusinessType =
    user.user_metadata?.business_type === "salon" ? "salon" : "barber";

  const { data: catalog } = await supabase
    .from("services_catalog")
    .select("id, category, name")
    .eq("type", businessType)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <OnboardingForm
      businessType={businessType}
      catalog={(catalog ?? []) as CatalogItem[]}
    />
  );
}
