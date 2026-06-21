import Link from "next/link";
import Image from "next/image";
import {
  UmbrellaIcon,
  MountainIcon,
  BuildingIcon,
  TreeIcon,
  GemIcon,
  WalletIcon,
} from "@/components/icons";

// Static, decorative category shortcuts (not hotel data). Each links into the
// hotel grid below.
const CATEGORIES = [
  { label: "Beachfront", Icon: UmbrellaIcon, image: "1507525428034-b723cf961d3e" },
  { label: "Mountain", Icon: MountainIcon, image: "1464822759023-fed622ff2c3b" },
  { label: "City", Icon: BuildingIcon, image: "1480714378408-67cf0d13bc1b" },
  { label: "Countryside", Icon: TreeIcon, image: "1500382017468-9049fed747ef" },
  { label: "Luxury", Icon: GemIcon, image: "1582719478250-c89cae4dc85b" },
  { label: "Budget", Icon: WalletIcon, image: "1505693416388-ac5ce068fe85" },
];

export function CategoryStrip() {
  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Explore by category</h2>
        <Link href="#hotels" className="text-sm font-semibold text-rose-600">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.label}
            href="#hotels"
            className="group flex items-center gap-2 rounded-2xl bg-white p-2 pl-3 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <cat.Icon className="h-5 w-5 shrink-0 text-rose-500" />
            <span className="flex-1 truncate text-sm font-semibold text-slate-800">
              {cat.label}
            </span>
            <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
              <Image
                src={`https://images.unsplash.com/photo-${cat.image}?auto=format&fit=crop&w=240&q=70`}
                alt=""
                aria-hidden
                fill
                sizes="80px"
                className="object-cover transition duration-300 group-hover:scale-110"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
