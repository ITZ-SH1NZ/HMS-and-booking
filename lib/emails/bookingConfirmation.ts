import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, emailDetails, BRAND } from "@/lib/email";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// Sends the "booking confirmed" email exactly once. Idempotent across the
// webhook and the reconcile safety net: it atomically claims the send by
// stamping confirmation_email_sent_at, and only the caller that wins the claim
// actually sends. Best-effort — never throws into the payment flow.
export async function sendBookingConfirmation(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    // Atomic claim: only confirmed bookings that haven't been emailed yet.
    const { data: booking } = await admin
      .from("bookings")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .is("confirmation_email_sent_at", null)
      .select(
        "id, guest_id, guest_name, guest_email, check_in, check_out, nights, num_rooms, total_price, hotels(name, location), rooms(name)",
      )
      .maybeSingle();

    if (!booking) return; // already sent, or not confirmed yet

    // Resolve recipient: walk-in bookings snapshot guest_email; self-bookings
    // don't, so fall back to the account email behind guest_id.
    let toEmail = booking.guest_email as string | null;
    let toName = booking.guest_name as string | null;
    if (!toEmail && booking.guest_id) {
      const { data } = await admin.auth.admin.getUserById(
        booking.guest_id as string,
      );
      toEmail = data.user?.email ?? null;
      toName =
        toName ??
        (data.user?.user_metadata?.full_name as string) ??
        null;
    }
    if (!toEmail) {
      console.error("[email] no recipient for booking", bookingId);
      // Allow a future retry rather than silently swallowing the booking.
      await admin
        .from("bookings")
        .update({ confirmation_email_sent_at: null })
        .eq("id", bookingId);
      return;
    }

    const hotel = booking.hotels as { name?: string; location?: string } | null;
    const room = booking.rooms as { name?: string } | null;

    const html = emailLayout({
      eyebrow: "Reservation Confirmed",
      heading: "Your stay is booked!",
      footnote: "You're receiving this because you booked a stay with BookNest.",
      bodyHtml: `
        <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
          Dear <strong>${toName ?? "Guest"}</strong>,
        </p>
        <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
          Your reservation has been confirmed. Here are the details of your upcoming stay.
        </p>
        
        <!-- Gold luxury divider -->
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
          <tr>
            <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
            <td style="padding:0 10px; font-family:Georgia,serif; font-size:14px; color:${BRAND.gold}; font-style:italic; line-height:1;">&nbsp;⚜&nbsp;</td>
            <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
          </tr>
        </table>

        <!-- Details Card & QR Code -->
        ${emailDetails([
          {
            label: "Hotel",
            value: `${hotel?.name ?? "—"}${hotel?.location ? `<br><span style="color:${BRAND.muted}; font-size:11px; font-weight:normal;">${hotel.location}</span>` : ""}`,
            icon: "🏨",
          },
          {
            label: "Room",
            value: `${room?.name ?? "—"}${booking.num_rooms > 1 ? ` × ${booking.num_rooms}` : ""}`,
            icon: "🛌",
          },
          { 
            label: "Check-in", 
            value: `${fmtDate(booking.check_in as string)}<br><span style="color:${BRAND.muted}; font-size:11px; font-weight:normal;">02:00 PM onwards</span>`, 
            icon: "📅" 
          },
          { 
            label: "Check-out", 
            value: `${fmtDate(booking.check_out as string)}<br><span style="color:${BRAND.muted}; font-size:11px; font-weight:normal;">11:00 AM</span>`, 
            icon: "📅" 
          },
          { 
            label: "Nights", 
            value: `${booking.nights} Night${booking.nights > 1 ? "s" : ""}`, 
            icon: "🌙" 
          },
          {
            label: "Total paid",
            value: `<span style="font-weight:bold; color:${BRAND.green};">${inr(booking.total_price as number)}</span><br><span style="color:${BRAND.muted}; font-size:11px; font-weight:normal;">Paid via Online</span>`,
            icon: "💳",
          },
        ], booking.id)}

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
    });

    const ok = await sendEmail({
      to: toEmail,
      toName: toName ?? undefined,
      subject: `Booking confirmed — ${hotel?.name ?? "BookNest"}`,
      html,
    });

    if (!ok) {
      // Send failed: clear the stamp so a later trigger can retry.
      await admin
        .from("bookings")
        .update({ confirmation_email_sent_at: null })
        .eq("id", bookingId);
    }
  } catch (err) {
    console.error("[email] sendBookingConfirmation error", err);
  }
}
