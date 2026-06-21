"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import type { AdditionalCharge, PricingSeason } from "@/lib/types";

import { UseHotelDraftReturn } from "../useHotelDraft";

interface Step7PricingProps {
  draftContext: UseHotelDraftReturn;
}

export default function Step7Pricing({ draftContext }: Step7PricingProps) {
  const {
    draft,
    seasons,
    charges,
    patch,
    saveSeason,
    removeSeason,
    saveCharge,
    removeCharge,
  } = draftContext;

  const [activeTab, setActiveTab] = useState<"base" | "seasonal">("base");

  // Local state for seasonal form entry
  const [seasonName, setSeasonName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seasonPrice, setSeasonPrice] = useState("");

  // Local state for charge form entry
  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargePer, setChargePer] = useState<"night" | "stay" | "day" | "guest">("night");

  if (!draft) return null;

  // Sum of tax percentages
  const gst = draft.gst_percent ?? 18;
  const svc = draft.service_charge_percent ?? 0;
  const other = draft.other_tax_percent ?? 0;
  const totalTax = gst + svc + other;

  // Add seasonal pricing validation
  const handleAddSeason = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!seasonName.trim()) return alert("Season name is required.");
    if (!startDate || !endDate) return alert("Dates are required.");
    if (new Date(startDate) > new Date(endDate)) {
      return alert("Start date cannot be after end date.");
    }
    const priceVal = parseFloat(seasonPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      return alert("Nightly price must be a valid positive number.");
    }

    // Check for date overlaps locally
    const isOverlapping = seasons.some((s: PricingSeason) => {
      const sStart = new Date(s.start_date);
      const sEnd = new Date(s.end_date);
      const nStart = new Date(startDate);
      const nEnd = new Date(endDate);
      return nStart <= sEnd && nEnd >= sStart;
    });

    if (isOverlapping) {
      return alert("This seasonal pricing configuration overlaps with an existing season.");
    }

    try {
      await saveSeason({
        name: seasonName,
        start_date: startDate,
        end_date: endDate,
        price: priceVal,
      });
      // Clear inputs
      setSeasonName("");
      setStartDate("");
      setEndDate("");
      setSeasonPrice("");
    } catch (err) {
      console.error(err);
      alert("Failed to save seasonal price slot.");
    }
  };

  // Add additional charge handler
  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chargeLabel.trim()) return alert("Charge label is required.");
    const amtVal = parseFloat(chargeAmount);
    if (isNaN(amtVal) || amtVal <= 0) {
      return alert("Amount must be a positive number.");
    }

    try {
      await saveCharge({
        label: chargeLabel,
        amount: amtVal,
        per: chargePer,
      });
      setChargeLabel("");
      setChargeAmount("");
      setChargePer("night");
    } catch (err) {
      console.error(err);
      alert("Failed to add charge slot.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Horizontal tabs */}
        <div className="flex border-b border-slate-100 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("base")}
            className={`pb-3 text-sm font-bold border-b-2 px-1 transition ${
              activeTab === "base"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Base pricing & taxes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("seasonal")}
            className={`pb-3 text-sm font-bold border-b-2 px-1 ml-6 transition ${
              activeTab === "seasonal"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Seasonal pricing
          </button>
        </div>

        {/* TAB 1: Base Pricing & Taxes */}
        {activeTab === "base" && (
          <div className="space-y-6">
            {/* Base price warning card */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-800 block mb-1">Base Room Prices</span>
              Per-room nightly base prices are configured in <strong className="font-semibold text-slate-800">Step 4 (Rooms & rates)</strong>. Use this section to add taxes and auxiliary fees that apply to all reservations at your property. All pricing is processed in <strong className="font-semibold text-slate-800">Indian Rupees (₹)</strong>.
            </div>

            {/* Additional Charges Section */}
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Additional charges</h4>
              <p className="text-xs text-slate-500 mb-4">
                Add mandatory or optional service charges (e.g. Extra guest fee, Cleaning fee).
              </p>

              {/* List of current charges */}
              {charges.length > 0 && (
                <div className="divide-y divide-slate-100 mb-4">
                  {charges.map((c: AdditionalCharge) => (
                    <div key={c.id} className="flex justify-between items-center py-2.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800">{c.label}</span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          ₹{c.amount} per {c.per}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCharge(c.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                        title="Remove charge"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add charge form */}
              <form onSubmit={handleAddCharge} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50/50 border border-slate-200/60 rounded-xl p-3.5">
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">Label</span>
                  <input
                    type="text"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none bg-white focus:border-emerald-600"
                    placeholder="e.g. Cleaning fee"
                    value={chargeLabel}
                    onChange={(e) => setChargeLabel(e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">Amount (₹)</span>
                  <input
                    type="number"
                    min={0}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none bg-white focus:border-emerald-600"
                    placeholder="e.g. 500"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">Per</span>
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none bg-white"
                    value={chargePer}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setChargePer(e.target.value as "night" | "stay" | "day" | "guest")}
                  >
                    <option value="night">Night</option>
                    <option value="stay">Stay</option>
                    <option value="day">Day</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3 flex items-center justify-center gap-1 transition shadow-sm h-[34px]"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add charge
                </button>
              </form>
            </div>

            {/* Taxes Form Card */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                <h4 className="text-sm font-bold text-slate-800">Taxes</h4>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                  Total tax: {totalTax}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-slate-600">GST (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    value={draft.gst_percent ?? 18}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      patch({ gst_percent: isNaN(val) ? 0 : val });
                    }}
                    placeholder="18"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-slate-600">Service charge (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    value={draft.service_charge_percent ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      patch({ service_charge_percent: isNaN(val) ? 0 : val });
                    }}
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-slate-600">Other tax (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    value={draft.other_tax_percent ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      patch({ other_tax_percent: isNaN(val) ? 0 : val });
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Seasonal Pricing */}
        {activeTab === "seasonal" && (
          <div className="space-y-6 animate-fadeIn">
            <p className="text-xs text-slate-500 leading-relaxed">
              Add custom overrides for rooms base price during high seasons, holidays, or specific intervals.
            </p>

            {/* List of active seasonal blocks */}
            {seasons.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white divide-y divide-slate-200">
                {seasons.map((s: PricingSeason) => (
                  <div key={s.id} className="flex justify-between items-center p-3.5 text-xs hover:bg-slate-50/50">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-800">{s.name}</span>
                      <span className="text-slate-400 font-medium">
                        {new Date(s.start_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })} - {new Date(s.end_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                        ₹{s.price}/night
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSeason(s.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Delete seasonal slot"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new season slot form */}
            <form onSubmit={handleAddSeason} className="border border-slate-200 bg-slate-50/50 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
                Configure new seasonal rate
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">Season name</span>
                  <input
                    type="text"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:border-emerald-600"
                    placeholder="e.g. Summer High Season"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">Nightly Override Rate (₹)</span>
                  <input
                    type="number"
                    min={1}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:border-emerald-600"
                    placeholder="e.g. 5000"
                    value={seasonPrice}
                    onChange={(e) => setSeasonPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">Start Date</span>
                  <input
                    type="date"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-semibold text-slate-500">End Date</span>
                  <input
                    type="date"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200/60">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-4 shadow-sm transition flex items-center gap-1.5"
                >
                  <PlusIcon className="h-4 w-4" />
                  Save seasonal override
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
