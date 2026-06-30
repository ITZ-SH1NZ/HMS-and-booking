import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, emailDetails, emailButton, BRAND } from "@/lib/email";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hms-and-booking.vercel.app";

// Sends a check-out confirmation email. Idempotent via check_out_email_sent_at.
// Best-effort — never throws.
export async function sendCheckOutConfirmation(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    // Atomic claim: only completed bookings that haven't been emailed yet.
    const { data: booking } = await admin
      .from("bookings")
      .update({ check_out_email_sent_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("status", "completed")
      .is("check_out_email_sent_at", null)
      .select(
        "id, guest_id, guest_name, guest_email, nights, total_price, hotels(name, location), rooms(name)",
      )
      .maybeSingle();

    if (!booking) return;

    let toEmail = booking.guest_email as string | null;
    let toName = booking.guest_name as string | null;
    if (!toEmail && booking.guest_id) {
      const { data } = await admin.auth.admin.getUserById(
        booking.guest_id as string,
      );
      toEmail = data.user?.email ?? null;
      toName = toName ?? (data.user?.user_metadata?.full_name as string) ?? null;
    }
    if (!toEmail) return;

    const hotel = booking.hotels as { name?: string; location?: string } | null;
    const room = booking.rooms as { name?: string } | null;
    const shortBookingId = booking.id.slice(0, 8).toUpperCase();

    const html = emailLayout({
      eyebrow: "Stay Completed",
      heading: "Thank you for staying with us!",
      footnote: "You're receiving this because you completed a stay at a BookNest hotel.",
      bodyHtml: `
        <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
          Dear <strong>${toName ?? "Guest"}</strong>,
        </p>
        <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
          Thank you for choosing <strong>${hotel?.name ?? "BookNest"}</strong> for your stay. We hope your time with us was comfortable and relaxing. Your checkout is complete, and your invoice details are below.
        </p>
        
        <!-- Gold luxury divider -->
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
          <tr>
            <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
            <td style="padding:0 10px; font-family:Georgia,serif; font-size:14px; color:${BRAND.gold}; font-style:italic; line-height:1;">&nbsp;⚜&nbsp;</td>
            <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
          </tr>
        </table>

        <!-- Stay & Payment Details -->
        ${emailDetails([
          {
            label: "Hotel",
            value: `${hotel?.name ?? "—"}${hotel?.location ? `<br><span style="color:${BRAND.muted}; font-size:11px; font-weight:normal;">${hotel.location}</span>` : ""}`,
            iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/hotel.png",
          },
          {
            label: "Room Type",
            value: `${room?.name ?? "—"}`,
            iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/bed.png",
          },
          { 
            label: "Nights Stayed", 
            value: `${booking.nights} Night${booking.nights > 1 ? "s" : ""}`, 
            iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/moon.png" 
          },
          {
            label: "Total Paid",
            value: `<span style="font-weight:bold; color:${BRAND.green};">${inr(booking.total_price as number)}</span><br><span style="color:${BRAND.green}; font-size:11px; font-weight:bold;">PAID IN FULL</span>`,
            iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/credit-card.png",
          },
        ])}

        <!-- Invoice / Receipt Banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; border:1px solid ${BRAND.line}; border-radius:8px; background:#F8F7F4; overflow:hidden;">
          <tr>
            <td style="padding:20px; font-size:13px; color:${BRAND.text}; text-align:left;">
              <div style="font-size:11px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase; color:${BRAND.gold}; margin-bottom:12px;">🧾 Invoice Information</div>
              <p style="margin:0; font-size:12px; line-height:1.5; color:${BRAND.text};">
                Your receipt has been finalized. No further charges are pending on this reservation. You can view or print your full receipt at any time using the portal link below.
              </p>
            </td>
          </tr>
        </table>

        <!-- Booking ID Banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px; border:1px solid ${BRAND.line}; border-radius:8px; background:#F8F7F4; overflow:hidden;">
          <tr>
            <td style="padding:16px 20px; font-size:12px; color:${BRAND.text}; text-align:left; vertical-align:middle;">
              <img src="https://img.icons8.com/ios-filled/50/C9A24D/shield.png" width="16" height="16" style="display:inline-block; vertical-align:middle; margin-right:8px;" />
              <strong style="text-transform:uppercase; font-size:10px; letter-spacing:1.5px; color:${BRAND.muted}; margin-right:12px; vertical-align:middle;">Booking ID</strong>
              <span style="font-family:monospace; font-size:12px; font-weight:bold; color:${BRAND.text}; vertical-align:middle;">${shortBookingId}</span>
                </td>
              </tr>
            </table>

        ${emailButton(`${siteUrl}/bookings/${booking.id}/review`, "Share Your Feedback")}
      `,
    });

    await sendEmail({
      to: toEmail,
      toName: toName ?? undefined,
      subject: `Thank you for staying at ${hotel?.name ?? "BookNest"} — Checkout Complete`,
      html,
    });
  } catch (err) {
    console.error("[email] sendCheckOutConfirmation error", err);
  }
}
