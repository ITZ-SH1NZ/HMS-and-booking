// Transactional email via Brevo's HTTP API. HTTP (not SMTP) so it works
// reliably on serverless. Server-only: never import this into client code,
// it reads BREVO_API_KEY. All sends are best-effort and never throw — a failed
// email must never break the action that triggered it.

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME ?? "BookNest";

  if (!apiKey || !from) {
    console.error("[email] BREVO_API_KEY or EMAIL_FROM missing — skipping send");
    return false;
  }

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: from, name: fromName },
        to: [{ email: input.to, name: input.toName }],
        subject: input.subject,
        htmlContent: input.html,
        ...(input.replyTo ? { replyTo: { email: input.replyTo } } : {}),
      }),
    });

    if (!res.ok) {
      console.error("[email] Brevo send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send error", err);
    return false;
  }
}

// BookNest palette (mirrors app/globals.css tokens).
export const BRAND = {
  green: "#0F5A46", // brand-600
  greenDark: "#0A4335", // brand-700
  gold: "#C9A24D", // gold-500
  cream: "#F8F7F4", // background
  text: "#1F2937", // foreground
  muted: "#6B7280",
  line: "#E7E2D9", // warm border
  bgLight: "#FFFDF9", // details card background
};

const SERIF = "Georgia,'Times New Roman',Times,serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

// Unsplash high-end imagery
const IMAGES = {
  heroRoom: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80",
  lobbyPromo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
};

// Reusable Gold Divider
function goldDivider(): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
      <td style="padding:0 10px; font-family:${SERIF}; font-size:14px; color:${BRAND.gold}; font-style:italic; line-height:1;">&nbsp;⚜&nbsp;</td>
      <td style="font-size:0; line-height:0;" width="40" height="1" bgcolor="${BRAND.gold}">&nbsp;</td>
    </tr>
  </table>`;
}

// Shared branded wrapper. Inline styles only (email clients strip <style>/CSS).
export function emailLayout(opts: {
  heading: string;
  bodyHtml: string;
  eyebrow?: string;
  footnote?: string;
  imageUrl?: string;
}): string {
  const heroImage = opts.imageUrl ?? IMAGES.heroRoom;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hms-and-booking.vercel.app";
  const logoUrl = `${siteUrl}/logo-mark.png`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <style>
      :root { color-scheme: light only; supported-color-schemes: light only; }
      body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
      a { text-decoration:none; }
      @media only screen and (max-width:600px) {
        .bn-card { width:100% !important; border-radius:0 !important; border-left:none !important; border-right:none !important; }
        .bn-pad { padding:30px 20px !important; }
        .bn-col { display:block !important; width:100% !important; }
        .bn-hero-img { display:none !important; }
        .bn-hero-text { width:100% !important; padding:35px 24px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.cream};font-family:${SANS};color:${BRAND.text};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:24px 0;">
      <tr><td align="center" style="padding:0 8px;">
        
        <table role="presentation" class="bn-card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.03);">
          
          <!-- 1. Luxurious Header -->
          <tr>
            <td style="padding:24px 30px; border-bottom:1px solid #F0ECE3; background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Logo Icon -->
                  <td width="48" style="vertical-align:middle;">
                    <img src="${logoUrl}" width="40" height="40" alt="BookNest" style="display:block; width:40px; height:40px; border:none; outline:none; text-decoration:none;" />
                  </td>
                  <!-- Logo Text -->
                  <td style="padding-left:12px; vertical-align:middle;">
                    <div style="font-family:${SERIF}; color:${BRAND.greenDark}; font-size:22px; font-weight:bold; letter-spacing:0.5px; line-height:1.1;">BookNest</div>
                    <div style="color:${BRAND.gold}; font-size:8px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; margin-top:2px;">Stays that feel like home</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-size:10px; color:${BRAND.muted}; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">Your stay is confirmed</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. Hero Section (Dynamic Two Column) -->
          <tr>
            <td bgcolor="${BRAND.greenDark}" style="background:${BRAND.greenDark};">
              <!--[if mso]>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="360" valign="middle">
              <![endif]-->
              <table role="presentation" align="left" class="bn-col" width="360" cellpadding="0" cellspacing="0" style="width:360px;">
                <tr>
                  <td class="bn-hero-text" style="padding:48px 40px; text-align:left;">
                    ${opts.eyebrow ? `<div style="font-size:10px; font-weight:bold; letter-spacing:2.5px; text-transform:uppercase; color:${BRAND.gold}; margin-bottom:12px;">${opts.eyebrow}</div>` : ""}
                    <h1 style="margin:0; font-family:${SERIF}; font-size:28px; font-weight:normal; line-height:1.2; color:#ffffff;">${opts.heading}</h1>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px; margin-bottom:16px;">
                      <tr><td width="40" height="2" bgcolor="${BRAND.gold}" style="font-size:0; line-height:0;">&nbsp;</td></tr>
                    </table>
                    <p style="margin:0; font-size:14px; color:#E2E8F0; line-height:1.5;">We can't wait to welcome you.</p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
              </td><td width="240" valign="top">
              <![endif]-->
              <table role="presentation" align="left" class="bn-col bn-hero-img" width="240" cellpadding="0" cellspacing="0" style="width:240px;">
                <tr>
                  <td>
                    <img src="${heroImage}" width="240" alt="Luxury Room" style="display:block; width:240px; height:240px; object-fit:cover; border:none;" />
                  </td>
                </tr>
              </table>
              <!--[if mso]>
              </td></tr></table>
              <![endif]-->
            </td>
          </tr>

          <!-- 3. Main Body Content -->
          <tr>
            <td class="bn-pad" style="padding:40px 44px 30px; background:#ffffff;">
              ${opts.bodyHtml}
            </td>
          </tr>

          <!-- 4. Value Propositions Bar -->
          <tr>
            <td style="background:${BRAND.greenDark}; padding:20px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" width="25%" style="font-family:${SANS}; font-size:9px; font-weight:bold; color:#ffffff; letter-spacing:1px; text-transform:uppercase; padding:0 4px; vertical-align:middle;">
                    <img src="https://abs.twimg.com/emoji/v2/72x72/1f3f7.png" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;" />
                    <span style="vertical-align:middle;">Best Price</span>
                  </td>
                  <td align="center" width="25%" style="font-family:${SANS}; font-size:9px; font-weight:bold; color:#ffffff; letter-spacing:1px; text-transform:uppercase; padding:0 4px; border-left:1px solid rgba(255,255,255,0.15); vertical-align:middle;">
                    <img src="https://abs.twimg.com/emoji/v2/72x72/1f6e1.png" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;" />
                    <span style="vertical-align:middle;">Secure Stays</span>
                  </td>
                  <td align="center" width="25%" style="font-family:${SANS}; font-size:9px; font-weight:bold; color:#ffffff; letter-spacing:1px; text-transform:uppercase; padding:0 4px; border-left:1px solid rgba(255,255,255,0.15); vertical-align:middle;">
                    <img src="https://abs.twimg.com/emoji/v2/72x72/1f3a7.png" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;" />
                    <span style="vertical-align:middle;">24/7 Support</span>
                  </td>
                  <td align="center" width="25%" style="font-family:${SANS}; font-size:9px; font-weight:bold; color:#ffffff; letter-spacing:1px; text-transform:uppercase; padding:0 4px; border-left:1px solid rgba(255,255,255,0.15); vertical-align:middle;">
                    <img src="https://abs.twimg.com/emoji/v2/72x72/1f514.png" width="14" height="14" style="display:inline-block; vertical-align:middle; margin-right:4px;" />
                    <span style="vertical-align:middle;">Handpicked</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 5. Support Promo Section -->
          <tr>
            <td style="padding:32px 44px; background:${BRAND.cream}; border-top:1px solid ${BRAND.line};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Image -->
                  <td class="bn-col" width="200" style="width:200px; padding-right:24px; vertical-align:middle;">
                    <img src="${IMAGES.lobbyPromo}" width="200" alt="Lobby" style="display:block; width:100%; border-radius:6px; border:1px solid ${BRAND.line};" />
                  </td>
                  <!-- Content -->
                  <td class="bn-col" style="vertical-align:middle; padding-top:16px;">
                    <h3 style="margin:0; font-family:${SERIF}; font-size:18px; font-weight:normal; color:${BRAND.greenDark};">Need anything?</h3>
                    <p style="margin:8px 0 16px; font-size:12px; line-height:1.6; color:${BRAND.muted};">Our guest support team is here for you 24/7 to make your upcoming stay exceptional.</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:4px; background:${BRAND.green};">
                          <a href="mailto:support@booknest.com" style="display:inline-block; padding:10px 20px; font-size:11px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase; color:#ffffff; border-radius:4px;">Contact Support &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 6. Footer Info Bar -->
          <tr>
            <td style="padding:16px 30px; background:#ffffff; border-top:1px solid #F0ECE3; border-bottom:1px solid #F0ECE3; text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size:11px; font-weight:bold; color:${BRAND.muted};">
                    📞 <span style="color:${BRAND.text}; margin-left:4px;">+91 124 456 7890</span>
                    <span style="margin:0 12px; color:${BRAND.line};">|</span>
                    ✉ <span style="color:${BRAND.text}; margin-left:4px;">support@booknest.com</span>
                    <span style="margin:0 12px; color:${BRAND.line};">|</span>
                    🌐 <span style="color:${BRAND.text}; margin-left:4px;">www.booknest.com</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 7. Social Footer -->
          <tr>
            <td align="center" style="padding:24px 30px; background:${BRAND.greenDark};">
              <div style="font-family:${SERIF}; color:#ffffff; font-size:20px; font-weight:bold; letter-spacing:0.5px;">BookNest</div>
              <div style="color:${BRAND.gold}; font-size:8px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; margin-top:3px; margin-bottom:16px;">Stays that feel like home</div>
              
              <p style="margin:16px 0 0; font-size:10px; color:#94A3B8; line-height:1.4;">${opts.footnote ?? "This is an automated email. Please do not reply."}</p>
            </td>
          </tr>

        </table>
        
        <p style="margin:16px 0 0; font-family:${SERIF}; font-size:10px; letter-spacing:1px; color:#A8A29E;">BOOKNEST &nbsp;·&nbsp; LUXURY BOUTIQUE HOTELS</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

// Refined CTA Button
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td style="border-radius:4px; background:${BRAND.green}; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
        <a href="${href}" style="display:inline-block; padding:14px 35px; font-family:${SANS}; font-size:11px; font-weight:bold; letter-spacing:2px; text-transform:uppercase; color:#ffffff; border-radius:4px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

// Dual column details card layout with QR code option
export function emailDetails(
  rows: { label: string; value: string; iconUrl?: string }[],
  qrData?: string
): string {
  const detailsRows = rows
    .map((r, i) => {
      const iconHtml = r.iconUrl ? `<img src="${r.iconUrl}" width="16" height="16" style="display:inline-block; vertical-align:middle; margin-right:8px;" />` : "";
      return `<tr style="${i < rows.length - 1 ? `border-bottom:1.5px solid #F0ECE3;` : ""}">
        <td style="padding:14px 16px; font-size:10px; font-weight:bold; letter-spacing:1px; text-transform:uppercase; color:${BRAND.muted}; vertical-align:middle;">
          ${iconHtml}<span style="vertical-align:middle;">${r.label}</span>
        </td>
        <td style="padding:14px 16px; font-size:13px; font-weight:bold; color:${BRAND.text}; text-align:right; vertical-align:middle;">
          ${r.value}
        </td>
      </tr>`;
    })
    .join("");

  const detailsTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bgLight};">${detailsRows}</table>`;

  if (!qrData) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line}; border-radius:8px; overflow:hidden; background:${BRAND.bgLight};">${detailsRows}</table>`;
  }

  // If QR code is provided, render the two-column layout
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrData)}`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line}; border-radius:8px; overflow:hidden; background:${BRAND.bgLight};">
    <tr>
      <!-- Details Column -->
      <!--[if mso]>
      <td width="340" valign="top">
      <![endif]-->
      <td class="bn-col" width="340" style="width:340px; border-right:1px solid ${BRAND.line}; vertical-align:top;">
        ${detailsTable}
      </td>
      <!--[if mso]>
      </td><td width="172" valign="middle" align="center">
      <![endif]-->
      <!-- QR Code Column -->
      <td class="bn-col" align="center" style="padding:20px; vertical-align:middle; text-align:center; background:#ffffff;">
        <div style="font-size:9px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase; color:${BRAND.gold}; margin-bottom:12px;">Booking QR Code</div>
        <img src="${qrUrl}" width="120" height="120" alt="Booking QR" style="display:block; width:120px; height:120px; border:1px solid ${BRAND.line}; padding:4px; background:#ffffff;" />
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin-top:12px; margin-bottom:6px;">
          <tr><td width="24" height="1" bgcolor="${BRAND.gold}"></td></tr>
        </table>
        <div style="font-size:8px; color:${BRAND.muted}; line-height:1.4; max-width:120px;">Show this QR at check-in for a seamless experience.</div>
      </td>
      <!--[if mso]>
      </td></tr></table>
      <![endif]-->
    </tr>
  </table>`;
}
