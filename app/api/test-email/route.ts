import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;

  const diagnostics = {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : null,
    hasFromEmail: !!from,
    fromEmail: from || null,
  };

  if (!apiKey || !from) {
    return NextResponse.json({
      ok: false,
      message: "Required environment variables are missing on this server environment.",
      diagnostics,
    });
  }

  console.log("[test-email] Sending test email to:", from);
  const ok = await sendEmail({
    to: from,
    toName: "Test Recipient",
    subject: "BookNest Email Diagnostics Test",
    html: `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f5a46;">Diagnostics Test Successful</h2>
        <p>If you are reading this, your Brevo integration is working perfectly on this environment!</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Timestamp: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  return NextResponse.json({
    ok,
    message: ok 
      ? "Test email sent successfully! Check your inbox (and spam folder) for: " + from
      : "Brevo API accepted the request but failed to send. Check server logs.",
    diagnostics,
  });
}
