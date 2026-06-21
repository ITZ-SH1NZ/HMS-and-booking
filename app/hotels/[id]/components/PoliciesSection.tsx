import {
  ClockIcon,
  BanIcon,
  CheckCircleIcon,
  ShieldIcon,
} from "@/components/icons";
import { Dog, Cigarette, Users, Info } from "lucide-react";
import type { Hotel } from "@/lib/types";
import { Section } from "./SectionWrapper";

interface PoliciesSectionProps {
  hotel: Hotel;
}

export function PoliciesSection({ hotel }: PoliciesSectionProps) {
  // Format check-in/out times nicely
  const checkIn = hotel.check_in_time
    ? formatTime(hotel.check_in_time)
    : "Flexible";
  const checkOut = hotel.check_out_time
    ? formatTime(hotel.check_out_time)
    : "Flexible";

  // Friendly representation of policy choices
  const getPolicyLabel = (choice: string | null | undefined) => {
    if (!choice) return "Not specified";
    switch (choice) {
      case "allowed":
        return "Allowed";
      case "not_allowed":
        return "Not allowed";
      case "on_request":
        return "On request";
      case "designated":
        return "Designated areas only";
      default:
        return choice;
    }
  };

  // Cancellation Policy description
  const getCancellationDescription = () => {
    if (hotel.cancellation_policy === "custom" && hotel.cancellation_policy_custom) {
      return hotel.cancellation_policy_custom;
    }
    switch (hotel.cancellation_policy) {
      case "flexible":
        return "Flexible: Free cancellation up to 24 hours before check-in. Cancellations within 24 hours are non-refundable.";
      case "moderate":
        return "Moderate: Free cancellation up to 5 days before check-in. Cancellations within 5 days are subject to a 50% charge.";
      case "strict":
        return "Strict: Cancellations are non-refundable. The total booking price will be charged.";
      default:
        return "Standard policy applies. Please check details at check-in.";
    }
  };

  // Payment Policy description
  const getPaymentDescription = () => {
    switch (hotel.payment_policy) {
      case "pay_at_property":
        return "Pay at Property: No advance payment is required. You will pay the full amount directly at the hotel during check-in/checkout.";
      case "advance":
        return `Advance Payment: An advance of ${
          hotel.require_advance && hotel.advance_amount
            ? `${hotel.advance_amount}${hotel.advance_is_percent ? "%" : " INR"}`
            : "a portion"
        } is required to secure your booking. The remainder is due at check-in.`;
      case "both":
        return "Both Options: You can choose to pay online now or pay at the property upon arrival.";
      default:
        return "Standard payment policy applies.";
    }
  };

  return (
    <Section id="policies" title="Policies & Rules">
      {/* TODO(future): booking's GST/fee/refund logic is still hard-coded in the RPCs (book_room/cancel_booking). Displaying per-hotel policy here is display-only for now. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
        
        {/* House Rules */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircleIcon className="h-4.5 w-4.5 text-rose-500" />
            House Rules
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Check-in / Check-out</p>
                <p className="text-xs text-slate-500">
                  After {checkIn} / Before {checkOut}
                </p>
              </div>
            </div>

            {hotel.min_age && (
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Minimum Age</p>
                  <p className="text-xs text-slate-500">Guest must be at least {hotel.min_age} years old</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Dog className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Pets Policy</p>
                <p className="text-xs text-slate-500">{getPolicyLabel(hotel.pets_policy)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Cigarette className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Smoking Policy</p>
                <p className="text-xs text-slate-500">{getPolicyLabel(hotel.smoking_policy)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Parties & Events</p>
                <p className="text-xs text-slate-500">{getPolicyLabel(hotel.parties_policy)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation & Payment */}
        <div className="space-y-6">
          {/* Cancellation */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BanIcon className="h-4.5 w-4.5 text-rose-500" />
              Cancellation Policy
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              {getCancellationDescription()}
            </p>
          </div>

          {/* Payment */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldIcon className="h-4.5 w-4.5 text-rose-500" />
              Payment Policy
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              {getPaymentDescription()}
            </p>
          </div>
        </div>

      </div>
    </Section>
  );
}

// Small helper to format HH:MM:SS to 12-hour AM/PM format
function formatTime(timeStr: string): string {
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
}
