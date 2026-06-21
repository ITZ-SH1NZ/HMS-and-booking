import {
  TagIcon,
  CalendarIcon,
  ShieldIcon,
  HeadphonesIcon,
} from "@/components/icons";

// Static marketing section.
const FEATURES = [
  {
    Icon: TagIcon,
    title: "Best Price Guarantee",
    body: "Find a lower price? We'll match it.",
  },
  {
    Icon: CalendarIcon,
    title: "Free Cancellation",
    body: "Cancel for free on most rooms.",
  },
  {
    Icon: ShieldIcon,
    title: "Secure Booking",
    body: "Your data is safe with us.",
  },
  {
    Icon: HeadphonesIcon,
    title: "24/7 Support",
    body: "We're here to help anytime.",
  },
];

export function WhyChoose() {
  return (
    <section id="why" className="border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Why choose BookNest?</h2>
          <p className="mt-1 text-sm text-slate-500">
            We make travel simple, comfortable and memorable.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
                <f.Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
