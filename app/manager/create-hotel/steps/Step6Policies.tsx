"use client";

import { UseHotelDraftReturn } from "../useHotelDraft";
import type { CancellationPolicy } from "@/lib/types";
import { BuildingIcon, CreditCardIcon, CheckCircleIcon } from "@/components/icons";

interface Step6PoliciesProps {
  draftContext: UseHotelDraftReturn;
}

const POLICY_TIMES = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM"
];

const CANCELLATION_HELPER = {
  flexible: "Guest can cancel free of charge until 1 day before check-in. 100% charge after that.",
  moderate: "Guest can cancel free of charge until 5 days before check-in. 30% charge after that.",
  strict: "No refund allowed. 100% cancellation charge applies immediately on booking.",
  custom: "Enter custom cancellation terms in detail.",
};

export default function Step6Policies({ draftContext }: Step6PoliciesProps) {
  const { draft, patch } = draftContext;

  if (!draft) return null;

  return (
    <div className="space-y-6">
      {/* House Rules Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          House rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Check-in Time */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-slate-700">
              Check-in time <span className="text-brand-500">*</span>
            </label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              value={draft.check_in_time || "12:00 PM"}
              onChange={(e) => patch({ check_in_time: e.target.value })}
              required
            >
              {POLICY_TIMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Check-out Time */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-slate-700">
              Check-out time <span className="text-brand-500">*</span>
            </label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              value={draft.check_out_time || "11:00 AM"}
              onChange={(e) => patch({ check_out_time: e.target.value })}
              required
            >
              {POLICY_TIMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Minimum Age */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-slate-700">
              Minimum check-in age <span className="text-brand-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
              value={draft.min_age ?? 18}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                patch({ min_age: isNaN(val) ? 18 : val });
              }}
              placeholder="e.g. 18"
              required
            />
          </div>
        </div>

        {/* Radio House Rules Options */}
        <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
          {/* Pets Policy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
            <span className="text-sm font-semibold text-slate-800">Pets Policy</span>
            <div className="flex gap-4">
              {["allowed", "not_allowed", "on_request"].map((opt) => (
                <label key={opt} className="inline-flex items-center text-xs font-semibold text-slate-700 cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="pets_policy"
                    value={opt}
                    checked={draft.pets_policy === opt}
                    onChange={(e) => patch({ pets_policy: e.target.value })}
                    className="mr-1.5 h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  {opt.replace("_", " ")}
                </label>
              ))}
            </div>
          </div>

          {/* Smoking Policy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
            <span className="text-sm font-semibold text-slate-800">Smoking Policy</span>
            <div className="flex gap-4">
              {["allowed", "not_allowed", "designated"].map((opt) => (
                <label key={opt} className="inline-flex items-center text-xs font-semibold text-slate-700 cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="smoking_policy"
                    value={opt}
                    checked={draft.smoking_policy === opt}
                    onChange={(e) => patch({ smoking_policy: e.target.value })}
                    className="mr-1.5 h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  {opt.replace("_", " ")}
                </label>
              ))}
            </div>
          </div>

          {/* Parties & Events Policy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
            <span className="text-sm font-semibold text-slate-800">Parties & events</span>
            <div className="flex gap-4">
              {["allowed", "not_allowed", "on_request"].map((opt) => (
                <label key={opt} className="inline-flex items-center text-xs font-semibold text-slate-700 cursor-pointer capitalize">
                  <input
                    type="radio"
                    name="parties_policy"
                    value={opt}
                    checked={draft.parties_policy === opt}
                    onChange={(e) => patch({ parties_policy: e.target.value })}
                    className="mr-1.5 h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  {opt.replace("_", " ")}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Policy Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          Cancellation policy <span className="text-brand-500">*</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["flexible", "moderate", "strict", "custom"].map((opt) => {
            const isSelected = draft.cancellation_policy === opt;

            return (
              <button
                key={opt}
                type="button"
                onClick={() => patch({ cancellation_policy: opt as CancellationPolicy })}
                className={`flex flex-col items-center justify-center p-4 border rounded-xl text-center capitalize transition w-full ${
                  isSelected
                    ? "border-brand-600 bg-brand-50 text-brand-950 font-bold"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold"
                }`}
              >
                <span className="text-xs">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Cancellation Helper Text */}
        {draft.cancellation_policy && (
          <p className="mt-3.5 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-500 leading-relaxed">
            {CANCELLATION_HELPER[draft.cancellation_policy as keyof typeof CANCELLATION_HELPER]}
          </p>
        )}

        {/* Custom cancellation details input */}
        {draft.cancellation_policy === "custom" && (
          <div className="flex flex-col mt-4">
            <label className="mb-1 text-sm font-semibold text-slate-700">
              Custom policy details
            </label>
            <textarea
              rows={3}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
              value={draft.cancellation_policy_custom || ""}
              onChange={(e) => patch({ cancellation_policy_custom: e.target.value })}
              placeholder="e.g. Free cancellation up to 10 days before check-in. 50% charge if within 10-3 days..."
              required
            />
          </div>
        )}
      </div>

      {/* Payment Policy Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
          Payment policy <span className="text-brand-500">*</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Card 1: Pay At Property */}
          <button
            type="button"
            onClick={() =>
              patch({
                payment_policy: "pay_at_property",
                require_advance: false,
              })
            }
            className={`flex flex-col items-start p-4 border rounded-xl text-left transition w-full relative h-full ${
              draft.payment_policy === "pay_at_property"
                ? "border-brand-600 bg-brand-50/30 ring-1 ring-brand-600"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <BuildingIcon className={`h-5 w-5 ${draft.payment_policy === "pay_at_property" ? "text-brand-700" : "text-slate-500"}`} />
              <span className={`block text-xs font-bold ${draft.payment_policy === "pay_at_property" ? "text-brand-950 font-extrabold" : "text-slate-800"}`}>
                Pay At Property
              </span>
            </div>
            <span className="block text-[11px] text-slate-500 leading-normal font-medium flex-1">
              Bookings are secured instantly. Guests pay the full amount directly to you at the hotel on arrival or checkout.
            </span>
            {draft.payment_policy === "pay_at_property" && (
              <div className="absolute top-3 right-3 text-brand-700">
                <CheckCircleIcon className="h-4.5 w-4.5 fill-brand-100 stroke-[2.5]" />
              </div>
            )}
          </button>

          {/* Card 2: Pay Online */}
          <button
            type="button"
            onClick={() =>
              patch({
                payment_policy: "advance",
                require_advance: true,
              })
            }
            className={`flex flex-col items-start p-4 border rounded-xl text-left transition w-full relative h-full ${
              draft.payment_policy === "advance"
                ? "border-brand-600 bg-brand-50/30 ring-1 ring-brand-600"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CreditCardIcon className={`h-5 w-5 ${draft.payment_policy === "advance" ? "text-brand-700" : "text-slate-500"}`} />
              <span className={`block text-xs font-bold ${draft.payment_policy === "advance" ? "text-brand-950 font-extrabold" : "text-slate-800"}`}>
                Pay Online
              </span>
            </div>
            <span className="block text-[11px] text-slate-500 leading-normal font-medium flex-1">
              Guests pay securely online via the website. You can collect a full or partial advance payment to guarantee their reservation.
            </span>
            {draft.payment_policy === "advance" && (
              <div className="absolute top-3 right-3 text-brand-700">
                <CheckCircleIcon className="h-4.5 w-4.5 fill-brand-100 stroke-[2.5]" />
              </div>
            )}
          </button>

          {/* Card 3: Both Options */}
          <button
            type="button"
            onClick={() =>
              patch({
                payment_policy: "both",
                require_advance: true,
              })
            }
            className={`flex flex-col items-start p-4 border rounded-xl text-left transition w-full relative h-full ${
              draft.payment_policy === "both"
                ? "border-brand-600 bg-brand-50/30 ring-1 ring-brand-600"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-1 shrink-0">
                <BuildingIcon className={`h-4 w-4 ${draft.payment_policy === "both" ? "text-brand-700" : "text-slate-400"}`} />
                <CreditCardIcon className={`h-4 w-4 ${draft.payment_policy === "both" ? "text-brand-700" : "text-slate-400"}`} />
              </div>
              <span className={`block text-xs font-bold ${draft.payment_policy === "both" ? "text-brand-950 font-extrabold" : "text-slate-800"}`}>
                Both Options
              </span>
            </div>
            <span className="block text-[11px] text-slate-500 leading-normal font-medium flex-1">
              Guests can choose at checkout whether to pay securely online today or book and pay on arrival at the property.
            </span>
            {draft.payment_policy === "both" && (
              <div className="absolute top-3 right-3 text-brand-700">
                <CheckCircleIcon className="h-4.5 w-4.5 fill-brand-100 stroke-[2.5]" />
              </div>
            )}
          </button>
        </div>

        {/* Require advance details if selected */}
        {(draft.payment_policy === "advance" || draft.payment_policy === "both") && (
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-4 animate-fadeIn">
            <label className="inline-flex items-center text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.require_advance ?? false}
                onChange={(e) => patch({ require_advance: e.target.checked })}
                className="mr-2 h-4 w-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
              />
              Require advance payment to secure booking
            </label>

            {draft.require_advance && (
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div className="flex flex-col">
                  <span className="mb-1 text-xs font-medium text-slate-500">Advance amount</span>
                  <input
                    type="number"
                    min={0}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
                    value={draft.advance_amount || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      patch({ advance_amount: isNaN(val) ? 0 : val });
                    }}
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-xs font-medium text-slate-500">Unit</span>
                  <div className="flex border border-slate-300 rounded-lg overflow-hidden bg-white mt-0.5">
                    <button
                      type="button"
                      onClick={() => patch({ advance_is_percent: true })}
                      className={`flex-1 py-1.5 text-xs font-bold text-center border-r border-slate-200 transition ${
                        draft.advance_is_percent
                          ? "bg-brand-700 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => patch({ advance_is_percent: false })}
                      className={`flex-1 py-1.5 text-xs font-bold text-center transition ${
                        !draft.advance_is_percent
                          ? "bg-brand-700 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ₹
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
