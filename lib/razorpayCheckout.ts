// Client-side Razorpay Checkout helper: creates an order, loads checkout.js,
// opens the modal, then verifies the signature server-side.

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export async function startRazorpayPayment({
  bookingId,
  prefill,
  onSuccess,
  onError,
}: {
  bookingId: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const orderRes = await fetch("/api/payments/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) {
    onError(order.error ?? "Could not start payment");
    return;
  }

  const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!ok) {
    onError("Could not load Razorpay. Check your connection and try again.");
    return;
  }

  const rzp = new window.Razorpay({
    key: order.keyId,
    order_id: order.orderId,
    amount: order.amount,
    currency: order.currency,
    name: "HMS",
    description: `Booking ${bookingId.slice(0, 8).toUpperCase()}`,
    prefill,
    theme: { color: "#e11d48" },
    handler: async (resp: RazorpayResponse) => {
      const v = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          orderId: resp.razorpay_order_id,
          paymentId: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        }),
      });
      const vj = await v.json();
      if (v.ok) onSuccess();
      else onError(vj.error ?? "Payment verification failed");
    },
    modal: {
      ondismiss: () => onError("Payment was cancelled."),
    },
  });
  rzp.open();
}
