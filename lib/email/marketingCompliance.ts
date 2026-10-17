/**
 * CAN-SPAM / CASL helpers for marketing email.
 * Every outbound marketing message MUST go through `buildMarketingEmailHtml`
 * (or append `marketingEmailFooterHtml`) so unsubscribe + physical address are present.
 */

export type MarketingEmailIdentity = {
  entityName: string;
  physicalAddress: string;
  supportEmail: string;
  siteOrigin: string;
};

export function getMarketingEmailIdentity(): MarketingEmailIdentity {
  const siteOrigin = (
    process.env.NEXT_PUBLIC_LIFEOS_SITE_URL ||
    process.env.NEXT_PUBLIC_LIFEOS_AUTH_DOMAIN ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const origin =
    siteOrigin.startsWith("http") ? siteOrigin : `https://${siteOrigin}`;

  return {
    entityName: process.env.LIFEOS_LEGAL_ENTITY_NAME?.trim() || "LifeOS",
    physicalAddress:
      process.env.LIFEOS_LEGAL_PHYSICAL_ADDRESS?.trim() ||
      "[Set LIFEOS_LEGAL_PHYSICAL_ADDRESS in .env]",
    supportEmail: process.env.LIFEOS_SUPPORT_EMAIL?.trim() || "support@example.com",
    siteOrigin: origin,
  };
}

export function unsubscribeUrl(email?: string, token?: string): string {
  const { siteOrigin } = getMarketingEmailIdentity();
  const url = new URL("/unsubscribe", siteOrigin);
  if (email) url.searchParams.set("email", email);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

/** Plain-text footer required on every marketing email. */
export function marketingEmailFooterText(email?: string, token?: string): string {
  const id = getMarketingEmailIdentity();
  return [
    "—",
    `You're receiving this because you opted into LifeOS updates.`,
    `Unsubscribe: ${unsubscribeUrl(email, token)}`,
    `${id.entityName}`,
    id.physicalAddress,
    `Questions: ${id.supportEmail}`,
  ].join("\n");
}

/** HTML footer required on every marketing email. */
export function marketingEmailFooterHtml(email?: string, token?: string): string {
  const id = getMarketingEmailIdentity();
  const unsub = unsubscribeUrl(email, token);
  return `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e8e9ed;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;color:#777b84;">
  <p style="margin:0 0 8px;">You're receiving this because you opted into LifeOS updates.</p>
  <p style="margin:0 0 8px;"><a href="${unsub}" style="color:#625af6;">Unsubscribe</a> from marketing emails.</p>
  <p style="margin:0 0 4px;"><strong>${escapeHtml(id.entityName)}</strong></p>
  <p style="margin:0;">${escapeHtml(id.physicalAddress)}</p>
  <p style="margin:8px 0 0;">${escapeHtml(id.supportEmail)}</p>
</div>`.trim();
}

export function buildMarketingEmailHtml(args: {
  bodyHtml: string;
  email?: string;
  token?: string;
}): string {
  return `${args.bodyHtml}\n${marketingEmailFooterHtml(args.email, args.token)}`;
}

export function buildMarketingEmailText(args: {
  bodyText: string;
  email?: string;
  token?: string;
}): string {
  return `${args.bodyText}\n\n${marketingEmailFooterText(args.email, args.token)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
