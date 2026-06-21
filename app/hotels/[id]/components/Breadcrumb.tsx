import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

interface BreadcrumbProps {
  state: string | null;
  city: string | null;
  hotelName: string;
}

export function Breadcrumb({ state, city, hotelName }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
      <Link href="/" className="hover:text-brand-600 transition">
        Home
      </Link>
      {state && (
        <>
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
          <Link
            href={`/?location=${encodeURIComponent(state)}`}
            className="hover:text-brand-600 transition"
          >
            {state}
          </Link>
        </>
      )}
      {city && (
        <>
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
          <Link
            href={`/?location=${encodeURIComponent(city)}`}
            className="hover:text-brand-600 transition"
          >
            {city}
          </Link>
        </>
      )}
      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-slate-800 font-medium truncate">{hotelName}</span>
    </nav>
  );
}
