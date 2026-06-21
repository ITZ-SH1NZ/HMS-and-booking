import { ShieldCheckIcon, MessageSquareIcon } from "lucide-react";
import type { PublicProfile } from "@/lib/types";

interface HostCardProps {
  host: PublicProfile | null;
  isSuperhost: boolean;
}

export function HostCard({ host, isSuperhost }: HostCardProps) {
  if (!host) return null;

  // Get initials for avatar
  const initials = host.full_name
    ? host.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "H";

  // Calculate duration string (Member since month year)
  const memberSince = new Date(host.created_at).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition duration-300">
      <div className="flex items-center gap-4">
        {/* Initials Avatar */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand-500 to-brand-600 font-bold text-white text-xl tracking-wider shadow-inner">
          {initials}
          {isSuperhost && (
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-white shadow-md border border-white">
              <ShieldCheckIcon className="h-4 w-4" />
            </span>
          )}
        </div>

        {/* Host Metadata */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 leading-tight">
            Hosted by {host.full_name || "Hotel Manager"}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Joined in {memberSince}
          </p>
          {isSuperhost && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full border border-gold-100 uppercase tracking-wide">
              Superhost
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500 leading-relaxed">
          As your host, {host.full_name?.split(" ")[0] || "we"} will ensure you have a seamless and memorable stay. Feel free to reach out with any inquiries.
        </p>

        {/* Coming soon Message Button */}
        <button
          type="button"
          disabled
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed hover:bg-slate-50 transition"
        >
          <MessageSquareIcon className="h-4.5 w-4.5" />
          Message Host <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-1 font-bold">Coming Soon</span>
        </button>
      </div>
    </div>
  );
}
