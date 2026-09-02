import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientFlow from "./ClientFlow";

export default async function BusinessEntryPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data } = await supabase.rpc("get_business_by_slug", { p_slug: params.slug });
  const business = data?.[0];

  if (!business) notFound();

  return <ClientFlow slug={params.slug} business={business} />;
}
