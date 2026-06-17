"use client";

import { useCurrency } from "@/components/CurrencyProvider";

// Renders a stored price converted into the visitor's local currency.
export function Price({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  const { format } = useCurrency();
  return (
    <span className={className} suppressHydrationWarning>
      {format(amount)}
    </span>
  );
}
