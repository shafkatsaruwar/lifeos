/**
 * Auto-renewal / cancel disclosures for paid plans (FTC Negative Option / state ARL).
 * Render next to every Subscribe CTA — do not rely on a buried Terms link alone.
 */

export const SUBSCRIPTION_PRODUCT_NAME = "LifeOS Pro";

export const SUBSCRIPTION_RENEWAL_TERMS =
  "Paid plans renew automatically at the then-current price each billing period (monthly or annual, as shown at checkout) until you cancel. You will be charged at the start of each period.";

export const SUBSCRIPTION_CANCEL_INSTRUCTIONS =
  "Cancel anytime in Settings → Plan & billing → Cancel subscription, or email support@lifeos.app. Cancellation stops future renewals; you keep access through the end of the period you already paid for. App Store / Google Play subscriptions must also be cancelled in that store's subscription settings.";

export type SubscriptionOffer = {
  id: string;
  label: string;
  priceLabel: string;
  period: "month" | "year";
  available: boolean;
};

/** Current catalog — mark available:true when Stripe/IAP is wired. */
export const SUBSCRIPTION_OFFERS: SubscriptionOffer[] = [
  {
    id: "pro-monthly",
    label: "LifeOS Pro",
    priceLabel: "$8/month",
    period: "month",
    available: false,
  },
];
