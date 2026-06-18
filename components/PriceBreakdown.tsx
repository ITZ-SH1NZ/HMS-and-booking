import { Price } from "@/components/Price";
import type { PriceQuote } from "@/lib/types";

export function PriceBreakdown({ quote }: { quote: PriceQuote }) {
  return (
    <div className="space-y-2 text-sm">
      <Row
        label={
          <>
            <Price amount={quote.roomPrice} /> × {quote.nights} night
            {quote.nights === 1 ? "" : "s"}
            {quote.numRooms > 1 ? ` × ${quote.numRooms} rooms` : ""}
          </>
        }
        value={<Price amount={quote.base} />}
      />
      <Row label="GST (18%)" value={<Price amount={quote.gst} />} />
      <Row label="Platform fee (2%)" value={<Price amount={quote.platformFee} />} />
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
        <span>Total</span>
        <Price amount={quote.total} />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
