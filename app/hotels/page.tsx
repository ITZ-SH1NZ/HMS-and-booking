import { createClient } from "@/lib/supabase/server";
import HotelsClient from "./HotelsClient";

export default async function HotelsPage() {
  const supabase = await createClient();

  const { data: hotels, error } = await supabase
    .from("hotels")
    .select("*");

  if (error) {
    return <div>{error.message}</div>;
  }

return (
  <div className="p-6">
    <h1 className="text-3xl font-bold mb-6">
      Explore Hotels
    </h1>

    <HotelsClient hotels={hotels ?? []} />
  </div>
);

}