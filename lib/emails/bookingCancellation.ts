import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, emailDetails, emailButton, BRAND } from "@/lib/email";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://booknest.app";

// Notifies the guest (and the host) that a booking was cancelled. Idempotent
// via cancellation_email_sent_at. Best-effort — never throws into the route.
export async function sendBookingCancellation(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: booking } = await admin
      .from("bookings")
      .update({ cancellation_email_sent_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("status", "cancelled")
      .is("cancellation_email_sent_at", null)
      .select(
        "id, guest_id, guest_name, guest_email, check_in, check_out, refund_amount, cancellation_reason, hotels(name, location, manager_id), rooms(name)",
      )
      .maybeSingle();

    if (!booking) return;

    const hotel = booking.hotels as
      | { name?: string; location?: string; manager_id?: string }
      | null;
    const room = booking.rooms as { name?: string } | null;
    const refund = Number(booking.refund_amount ?? 0);

    const details = emailDetails([
      { label: "Hotel", value: hotel?.name ?? "—", iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/hotel.png" },
      { label: "Room", value: room?.name ?? "—", iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/bed.png" },
      { label: "Check-in", value: fmtDate(booking.check_in as string), iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/calendar.png" },
      { label: "Check-out", value: fmtDate(booking.check_out as string), iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/calendar.png" },
      {
        label: "Refund Status",
        value:
          refund > 0
            ? `<span style="color:${BRAND.green}; font-weight:bold;">${inr(refund)}</span><br><span style="color:${BRAND.muted}; font-size:11px; font-weight:normal;">Refunding online</span>`
            : "No refund due",
        iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/credit-card.png",
      },
    ]);

    const reasonBlock = booking.cancellation_reason
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; border:1px solid ${BRAND.line}; border-radius:8px; background:#F8F7F4; overflow:hidden;">
          <tr>
            <td style="padding:16px 20px; font-size:12px; color:${BRAND.text}; text-align:left; vertical-align:middle;">
              <img src="https://img.icons8.com/ios-filled/50/C9A24D/speech-bubble.png" width="16" height="16" style="display:inline-block; vertical-align:middle; margin-right:8px;" />
              <strong style="text-transform:uppercase; font-size:10px; letter-spacing:1.5px; color:${BRAND.muted}; margin-right:12px; vertical-align:middle;">Cancellation Reason</strong>
              <span style="font-size:12px; font-weight:bold; color:${BRAND.text}; vertical-align:middle;">${booking.cancellation_reason}</span>
            </td>
          </tr>
        </table>`
      : "";

    const shortBookingId = booking.id.slice(0, 8).toUpperCase();

    // --- Guest ---
    let guestEmail = booking.guest_email as string | null;
    let guestName = booking.guest_name as string | null;
    if (!guestEmail && booking.guest_id) {
      const { data } = await admin.auth.admin.getUserById(
        booking.guest_id as string,
      );
      guestEmail = data.user?.email ?? null;
      guestName =
        guestName ?? (data.user?.user_metadata?.full_name as string) ?? null;
    }

    if (guestEmail) {
      const ok = await sendEmail({
        to: guestEmail,
        toName: guestName ?? undefined,
        subject: `Booking cancelled — ${hotel?.name ?? "BookNest"}`,
        html: emailLayout({
          eyebrow: "Booking Cancelled",
          heading: "Your reservation is cancelled",
          footnote: "You're receiving this because your BookNest reservation was cancelled.",
          bodyHtml: `
            <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
              Dear <strong>${guestName ?? "Guest"}</strong>,
            </p>
            <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
              Your booking has been successfully cancelled. Below are the details of the cancelled stay and your refund status.
            </p>
            
            <!-- Gold luxury divider -->
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
              <tr>
                <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
                <td style="padding:0 10px; font-family:Georgia,serif; font-size:14px; color:${BRAND.gold}; font-style:italic; line-height:1;">&nbsp;⚜&nbsp;</td>
                <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
              </tr>
            </table>

            ${details}
            ${reasonBlock}

            <!-- Booking ID Banner -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; border:1px solid ${BRAND.line}; border-radius:8px; background:#F8F7F4; overflow:hidden;">
              <tr>
                <td style="padding:16px 20px; font-size:12px; color:${BRAND.text}; text-align:left; vertical-align:middle;">
                  <img src="https://img.icons8.com/ios-filled/50/C9A24D/shield.png" width="16" height="16" style="display:inline-block; vertical-align:middle; margin-right:8px;" />
                  <strong style="text-transform:uppercase; font-size:10px; letter-spacing:1.5px; color:${BRAND.muted}; margin-right:12px; vertical-align:middle;">Booking ID</strong>
                  <span style="font-family:monospace; font-size:12px; font-weight:bold; color:${BRAND.text}; vertical-align:middle;">${shortBookingId}</span>
                </td>
              </tr>
            </table>

            ${emailButton(`${siteUrl}/bookings`, "View My Trips")}
          `,
        }),
      });
      if (!ok) {
        // Allow retry if the guest send failed.
        await admin
          .from("bookings")
          .update({ cancellation_email_sent_at: null })
          .eq("id", bookingId);
        return;
      }
    }

    // --- Host (best-effort, no retry gating) ---
    if (hotel?.manager_id) {
      const { data } = await admin.auth.admin.getUserById(hotel.manager_id);
      const hostEmail = data.user?.email;
      if (hostEmail) {
        await sendEmail({
          to: hostEmail,
          subject: `A booking was cancelled — ${hotel?.name ?? "BookNest"}`,
          html: emailLayout({
            eyebrow: "Host Notification",
            heading: "A reservation was cancelled",
            footnote: "You're receiving this as the host/manager of this property.",
            bodyHtml: `
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
                Hello,
              </p>
              <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
                A booking for <strong>${hotel?.name ?? "your property"}</strong> has been cancelled. The dates are now open for new bookings.
              </p>
              
              <!-- Gold luxury divider -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
                <tr>
                  <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
                  <td style="padding:0 10px; font-family:Georgia,serif; font-size:14px; color:${BRAND.gold}; font-style:italic; line-height:1;">&nbsp;⚜&nbsp;</td>
                  <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
                </tr>
              </table>

              ${details}
              ${reasonBlock}

              <!-- Booking ID Banner -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; border:1px solid ${BRAND.line}; border-radius:8px; background:#F8F7F4; overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px; font-size:12px; color:${BRAND.text}; text-align:left; vertical-align:middle;">
                    <img src="https://img.icons8.com/ios-filled/50/C9A24D/shield.png" width="16" height="16" style="display:inline-block; vertical-align:middle; margin-right:8px;" />
                    <strong style="text-transform:uppercase; font-size:10px; letter-spacing:1.5px; color:${BRAND.muted}; margin-right:12px; vertical-align:middle;">Booking ID</strong>
                    <span style="font-family:monospace; font-size:12px; font-weight:bold; color:${BRAND.text}; vertical-align:middle;">${shortBookingId}</span>
                  </td>
                </tr>
              </table>
            `,
          }),
        });
      }
    }
  } catch (err) {
    console.error("[email] sendBookingCancellation error", err);
  }
}
