import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TvBoard from "./TvBoard";

export default async function TvBoardPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const [{ data: businessRows }, { data: staff }] = await Promise.all([
    supabase.rpc("get_business_by_slug", { p_slug: params.slug }),
    supabase.rpc("get_business_staff_by_slug", { p_slug: params.slug }),
  ]);

  const business = businessRows?.[0];
  if (!business) notFound();

  return <TvBoard slug={params.slug} business={business} staff={staff ?? []} />;
}
