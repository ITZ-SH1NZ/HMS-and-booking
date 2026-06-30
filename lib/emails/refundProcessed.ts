import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, emailDetails, BRAND } from "@/lib/email";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

// Tells the guest their refund has been issued. Idempotent via
// refund_email_sent_at (Razorpay fires refund.created AND refund.processed).
// Best-effort — never throws into the webhook.
export async function sendRefundProcessed(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: booking } = await admin
      .from("bookings")
      .update({ refund_email_sent_at: new Date().toISOString() })
      .eq("id", bookingId)
      .is("refund_email_sent_at", null)
      .select(
        "id, guest_id, guest_name, guest_email, refund_amount, hotels(name)",
      )
      .maybeSingle();

    if (!booking) return;

    const refund = Number(booking.refund_amount ?? 0);
    const hotel = booking.hotels as { name?: string } | null;

    let toEmail = booking.guest_email as string | null;
    let toName = booking.guest_name as string | null;
    if (!toEmail && booking.guest_id) {
      const { data } = await admin.auth.admin.getUserById(
        booking.guest_id as string,
      );
      toEmail = data.user?.email ?? null;
      toName = toName ?? (data.user?.user_metadata?.full_name as string) ?? null;
    }
    if (!toEmail) {
      await admin
        .from("bookings")
        .update({ refund_email_sent_at: null })
        .eq("id", bookingId);
      return;
    }

    const ok = await sendEmail({
      to: toEmail,
      toName: toName ?? undefined,
      subject: `Refund processed — ${hotel?.name ?? "BookNest"}`,
      html: emailLayout({
        eyebrow: "Refund Processed",
        heading: "Your refund is on its way",
        footnote: "You're receiving this about a BookNest refund.",
        bodyHtml: `
          <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
            Dear <strong>${toName ?? "Guest"}</strong>,
          </p>
          <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
            We have successfully processed your refund. The funds should reflect in your bank account within 5–7 business days.
          </p>
          
          <!-- Gold luxury divider -->
          <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
            <tr>
              <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
              <td style="padding:0 10px; font-family:Georgia,serif; font-size:14px; color:${BRAND.gold}; font-style:italic; line-height:1;">&nbsp;⚜&nbsp;</td>
              <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
            </tr>
          </table>

          <!-- Details Card -->
          ${emailDetails([
            { label: "Hotel", value: hotel?.name ?? "—", icon: "🏨" },
            {
              label: "Refunded Amount",
              value: `<span style="color:${BRAND.green}; font-weight:bold;">${inr(refund)}</span><br><span style="color:${BRAND.muted}; font-size:11px; font-weight:normal;">Returned to original source</span>`,
              icon: "💳",
            },
          ])}

          <!-- Booking Reference Banner -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; border:1px solid ${BRAND.line}; border-radius:8px; background:#F8F7F4; overflow:hidden;">
            <tr>
              <td style="padding:16px 20px; font-size:12px; color:${BRAND.text}; text-align:left;">
                <span style="font-size:16px; margin-right:8px; display:inline-block; vertical-align:middle; color:${BRAND.gold};">🛡</span>
                <strong style="text-transform:uppercase; font-size:10px; letter-spacing:1.5px; color:${BRAND.muted}; margin-right:12px; vertical-align:middle;">Booking Reference</strong>
                <span style="font-family:monospace; font-size:12px; font-weight:bold; color:${BRAND.text}; vertical-align:middle;">${booking.id}</span>
              </td>
            </tr>
          </table>
        `,
      }),
    });

    if (!ok) {
      await admin
        .from("bookings")
        .update({ refund_email_sent_at: null })
        .eq("id", bookingId);
    }
  } catch (err) {
    console.error("[email] sendRefundProcessed error", err);
  }
}
