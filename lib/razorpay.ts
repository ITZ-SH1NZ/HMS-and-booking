import Razorpay from "razorpay";

// Server-side Razorpay client. Uses the secret — never import this from a
// Client Component.
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Razorpay charges in INR only, so convert the USD-base total at order time.
export async function getUsdInrRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (data.rates?.INR) return data.rates.INR;
    }
  } catch {
    // fall through to fallback
  }
  return 83; // fallback rate if the FX API is unavailable
}

export async function usdToInr(usd: number): Promise<number> {
  return usd * (await getUsdInrRate());
}

// Re-exported from lib/booking (single source of truth) for the Route split.
export { PLATFORM_COMMISSION_RATE } from "@/lib/booking";
