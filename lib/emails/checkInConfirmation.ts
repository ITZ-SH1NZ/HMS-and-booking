import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, emailDetails, emailButton, BRAND } from "@/lib/email";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hms-and-booking.vercel.app";

// Sends a welcome email upon check-in. Best-effort — never throws.
export async function sendCheckInConfirmation(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    // Fetch the booking details directly
    const { data: booking, error: fetchError } = await admin
      .from("bookings")
      .select(
        "id, guest_id, guest_name, guest_email, check_in, check_out, nights, hotels(name, location), rooms(name)",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      console.error("[email] check-in: booking not found", bookingId, fetchError);
      return;
    }

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
      console.error("[email] check-in: no recipient email found for booking", bookingId);
      return;
    }

    const hotel = booking.hotels as { name?: string; location?: string } | null;
    const room = booking.rooms as { name?: string } | null;
    const shortBookingId = booking.id.slice(0, 8).toUpperCase();

    const html = emailLayout({
      eyebrow: "Checked In Successfully",
      heading: "Welcome to your stay!",
      footnote: "You're receiving this because you checked in to a BookNest hotel.",
      bodyHtml: `
        <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
          Dear <strong>${toName ?? "Guest"}</strong>,
        </p>
        <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${BRAND.text}; text-align:left;">
          We are delighted to welcome you to <strong>${hotel?.name ?? "BookNest"}</strong>. Your check-in is complete, and your room is ready. Here are your stay details.
        </p>
        
        <!-- Gold luxury divider -->
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
          <tr>
            <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
            <td style="padding:0 10px; font-family:Georgia,serif; font-size:14px; color:${BRAND.gold}; font-style:italic; line-height:1;">&nbsp;⚜&nbsp;</td>
            <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
          </tr>
        </table>

        <!-- Stay Details -->
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
            label: "Scheduled Check-out", 
            value: `${fmtDate(booking.check_out as string)}<br><span style="color:${BRAND.muted}; font-size:11px; font-weight:normal;">11:00 AM</span>`, 
            iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/calendar.png" 
          },
          { 
            label: "Duration", 
            value: `${booking.nights} Night${booking.nights > 1 ? "s" : ""}`, 
            iconUrl: "https://img.icons8.com/ios-filled/50/C9A24D/moon.png" 
          },
        ])}

        <!-- Wi-Fi & Guest Information Banner -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; border:1px solid ${BRAND.line}; border-radius:8px; background:#F8F7F4; overflow:hidden;">
          <tr>
            <td style="padding:20px; font-size:13px; color:${BRAND.text}; text-align:left;">
              <div style="font-size:11px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase; color:${BRAND.gold}; margin-bottom:12px;">🏨 In-Stay Information</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0; font-size:12px; color:${BRAND.text};">
                    <strong>Guest Wi-Fi Network:</strong> <span style="font-family:monospace; font-size:13px; font-weight:bold; color:${BRAND.green};">BookNest_Guest</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0; font-size:12px; color:${BRAND.text};">
                    <strong>Wi-Fi Password:</strong> <span style="font-family:monospace; font-size:13px; font-weight:bold; color:${BRAND.green};">stays_like_home</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0; font-size:12px; color:${BRAND.text};">
                    <strong>Front Desk Dial:</strong> <span style="font-weight:bold;">Extension 0</span>
                  </td>
                </tr>
              </table>
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

        ${emailButton(`${siteUrl}/bookings/${booking.id}`, "View Stay Services")}
      `,
    });

    await sendEmail({
      to: toEmail,
      toName: toName ?? undefined,
      subject: `Welcome to ${hotel?.name ?? "BookNest"} — Checked In`,
      html,
    });
  } catch (err) {
    console.error("[email] sendCheckInConfirmation error", err);
  }
}
