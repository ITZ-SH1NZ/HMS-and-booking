import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Price } from "@/components/Price";
import { CheckCircleIcon } from "@/components/icons";
import { SuccessClient } from "@/components/SuccessClient";
import type { BookingDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/bookings/${id}`);

  const { data } = await supabase
    .from("bookings")
    .select("*, hotels(id, name, location, image_url), rooms(id, name, capacity), payments(*)")
    .eq("id", id)
    .maybeSingle();

  const booking = data as BookingDetail | null;
  if (!booking) notFound();

  return <SuccessClient booking={booking} />;
}
