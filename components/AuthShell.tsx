import Link from "next/link";
import Image from "next/image";
import {
  ShieldIcon,
  BuildingIcon,
  UsersIcon,
  StarIcon,
  LockIcon,
  HeadphonesIcon,
} from "@/components/icons";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80";

const FEATURES = [
  { Icon: ShieldIcon, title: "Secure & Safe", body: "Your data is 100% protected" },
  { Icon: BuildingIcon, title: "10,000+ Hotels", body: "Worldwide best properties" },
  { Icon: UsersIcon, title: "500K+ Happy Guests", body: "Trusted by travelers globally" },
];

interface SideContent {
  title: string;
  subtitle: string;
  image?: string;
}

// Two-panel responsive auth layout. The marketing panel is hidden on small
// screens; the form panel is always centered and scrollable.
export function AuthShell({
  side,
  children,
}: {
  side: SideContent;
  children: React.ReactNode;
}) {
  return (
    <div className="grid lg:grid-cols-2">
      {/* Marketing panel — hidden on mobile */}
      <aside className="relative hidden overflow-hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${side.image ?? DEFAULT_IMAGE}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/60 to-slate-900/85" />

        <div className="relative flex h-full flex-col justify-center gap-8 px-10 py-16 xl:px-16">
          <div>
            <h2 className="text-4xl font-extrabold text-white xl:text-5xl">
              {side.title}
            </h2>
            <p className="mt-3 max-w-sm text-lg text-slate-200">
              {side.subtitle}
            </p>
          </div>

          <ul className="space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
                  <f.Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-white">
                    {f.title}
                  </span>
                  <span className="block text-sm text-slate-300">{f.body}</span>
                </span>
              </li>
            ))}
          </ul>

          <figure className="max-w-md rounded-2xl bg-white/10 p-5 backdrop-blur">
            <div className="flex gap-0.5 text-gold-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} className="h-4 w-4" filled />
              ))}
            </div>
            <blockquote className="mt-2 text-sm text-slate-100">
              “BookNest made our vacation amazing. Best hotel booking experience
              ever!”
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                PS
              </span>
              <span className="text-sm">
                <span className="block font-semibold text-white">
                  Priya Sharma
                </span>
                <span className="block text-slate-300">Traveled to Bali</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex min-h-[calc(100dvh-60px)] flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 flex items-center justify-center gap-2 lg:hidden"
          >
            <Image
              src="/logo.png"
              alt="BookNest Logo"
              width={210}
              height={53}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>

          <AuthFooter />
        </div>
      </div>
    </div>
  );
}

function AuthFooter() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
      <span className="flex items-center gap-1">
        <LockIcon className="h-4 w-4 text-brand-500" /> SSL Secured
      </span>
      <span className="flex items-center gap-1">
        <ShieldIcon className="h-4 w-4 text-brand-500" /> Privacy Protected
      </span>
      <span className="flex items-center gap-1">
        <HeadphonesIcon className="h-4 w-4 text-brand-500" /> 24/7 Support
      </span>
    </div>
  );
}
