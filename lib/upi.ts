// UPI deep link helpers. No gateway / no secrets — just a public UPI ID (VPA).
// A `upi://pay?...` URI opens GPay/PhonePe/Paytm pre-filled with the amount;
// rendered as a QR it can be scanned from another device.

export const UPI_VPA = process.env.NEXT_PUBLIC_UPI_VPA ?? "";
export const UPI_PAYEE = process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? "HMS";

export function buildUpiUri({
  amountInr,
  note,
}: {
  amountInr: number | null;
  note: string;
}) {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: UPI_PAYEE,
    cu: "INR",
    tn: note,
  });
  // Omit the amount if we couldn't convert — the payer enters it in their app.
  if (amountInr && amountInr > 0) params.set("am", amountInr.toFixed(2));
  return `upi://pay?${params.toString()}`;
}
