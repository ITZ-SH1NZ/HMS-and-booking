"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResubmitButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resubmit() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("resubmit_verification");
      if (error) setError(error.message);
      else router.refresh();
    });
  }

  return (
    <div className="mt-6">
      <button
        onClick={resubmit}
        disabled={pending}
        className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Submitting…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-brand-700">{error}</p>}
    </div>
  );
}
