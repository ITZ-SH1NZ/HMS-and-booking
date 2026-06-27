"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useHotelDraft } from "./useHotelDraft";
import WizardShell from "./WizardShell";

function WizardLoader() {
  const searchParams = useSearchParams();
  const hotelId = searchParams.get("hotelId") ?? undefined;
  const draftContext = useHotelDraft(hotelId);
  return <WizardShell draftContext={draftContext} />;
}

export default function CreateHotelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
            <span className="text-sm font-medium text-slate-500">
              Loading your draft...
            </span>
          </div>
        </div>
      }
    >
      <WizardLoader />
    </Suspense>
  );
}
