import Razorpay from "razorpay";

// Server-side Razorpay client. Uses the secret — never import this from a
// Client Component.
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "mock_key_id_for_build",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_key_secret_for_build",
});

// Prices are stored in INR, so there's no conversion at order time.
// Re-exported from lib/booking (single source of truth) for the Route split.
export { PLATFORM_COMMISSION_RATE } from "@/lib/booking";
