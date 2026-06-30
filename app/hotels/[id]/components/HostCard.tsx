"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon, MessageSquareIcon } from "lucide-react";
import type { PublicProfile } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { getOrCreateConversation } from "@/app/messages/actions";

interface HostCardProps {
  host: PublicProfile | null;
  isSuperhost: boolean;
  hotelId: string;
}

export function HostCard({ host, isSuperhost, hotelId }: HostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

  const handleMessageHost = () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    startTransition(async () => {
      try {
        const conversationId = await getOrCreateConversation(hotelId);
        router.push(`/messages?c=${conversationId}`);
      } catch (err) {
        console.error("Failed to start message thread:", err);
        alert("Failed to message host. Please try again.");
      }
    });
  };

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

        <button
          type="button"
          onClick={handleMessageHost}
          disabled={pending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white py-3 text-sm font-semibold transition disabled:opacity-50"
        >
          {pending ? (
            <span className="animate-pulse">Connecting...</span>
          ) : (
            <>
              <MessageSquareIcon className="h-4.5 w-4.5" />
              Message Host
            </>
          )}
        </button>
      </div>
    </div>
  );
}

