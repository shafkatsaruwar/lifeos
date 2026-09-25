import {
  buildMarketingEmailHtml,
  buildMarketingEmailText,
  marketingEmailFooterHtml,
  marketingEmailFooterText,
} from "@/lib/email/marketingCompliance";

/**
 * Only entry point for sending marketing email.
 * Refuses payloads that omit the compliance footer (defense in depth).
 */
export async function sendMarketingEmail(args: {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  token?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const html = buildMarketingEmailHtml({
    bodyHtml: args.bodyHtml,
    email: args.to,
    token: args.token,
  });
  const text = buildMarketingEmailText({
    bodyText: args.bodyText,
    email: args.to,
    token: args.token,
  });

  const footerHtml = marketingEmailFooterHtml(args.to, args.token);
  const footerText = marketingEmailFooterText(args.to, args.token);
  if (!html.includes("Unsubscribe") || !html.includes(footerHtml.slice(0, 40))) {
    return { ok: false, error: "Marketing email missing required unsubscribe footer." };
  }
  if (!text.includes(footerText.slice(0, 20))) {
    return { ok: false, error: "Marketing email plain text missing required footer." };
  }

  // No ESP is configured in this repo yet — refuse silent sends.
  const provider = process.env.LIFEOS_EMAIL_PROVIDER?.trim();
  if (!provider) {
    return {
      ok: false,
      error: "No LIFEOS_EMAIL_PROVIDER configured. Footer was validated; message was not sent.",
    };
  }

  return { ok: false, error: `Email provider "${provider}" is not wired yet.` };
}
