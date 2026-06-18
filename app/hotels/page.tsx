import { createClient } from "@/lib/supabase/server";

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
    <h1 className="text-3xl font-bold mb-6">Explore Hotels</h1>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

{hotels?.map((hotel) => (
  <div
    key={hotel.id}
    className="border rounded-lg p-4 shadow-lg bg-white"
  >

    <img
        src={hotel.image_url}
        alt={hotel.name}
        className="w-full h-48 object-cover rounded-lg mb-4"
    />

    <h2 className="text-xl font-semibold">{hotel.name}</h2>

    <p className="text-gray-600">📍 {hotel.location}</p>

    <p className="mt-2">{hotel.description}</p>

    <a
      href={`/hotels/${hotel.id}`}
      className="inline-block mt-4 px-4 py-2 bg-pink-600 text-white rounded"
    >
      View Details
    </a>
  </div>
))}
</div>
  </div>
);
}