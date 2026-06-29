"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useHotelEditor } from "../useHotelEditor";
import Step1Basics from "@/app/manager/create-hotel/steps/Step1Basics";
import Step4Rooms from "@/app/manager/create-hotel/steps/Step4Rooms";
import Step7Pricing from "@/app/manager/create-hotel/steps/Step7Pricing";
import { ChevronLeftIcon } from "@/components/icons";

type Tab = "details" | "rooms" | "pricing";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Hotel Details" },
  { id: "rooms", label: "Rooms" },
  { id: "pricing", label: "Pricing" },
];

export default function EditHotelPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const hotelId = params.id;

  const editor = useHotelEditor(hotelId);
  const { draft, loading, saving, error } = editor;

  const [tab, setTab] = useState<Tab>("details");

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-slate-500">
        Loading hotel...
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-red-600 font-medium">{error ?? "Hotel not found."}</p>
        <button
          onClick={() => router.push("/manager/dashboard")}
          className="mt-4 text-sm font-semibold text-brand-600 hover:underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/manager/dashboard"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{draft.name}</h1>
          <p className="text-sm text-slate-500">{draft.location}</p>
        </div>
        <span className="text-xs font-medium text-slate-400">
          {saving ? "Saving..." : "All changes saved"}
        </span>
      </div>

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              tab === t.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "details" && <Step1Basics draftContext={editor} />}
        {tab === "rooms" && <Step4Rooms draftContext={editor} />}
        {tab === "pricing" && <Step7Pricing draftContext={editor} />}
      </div>
    </div>
  );
}