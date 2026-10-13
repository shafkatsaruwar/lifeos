"use client";

import { useState } from "react";
import {
  entitlementStatusLabel,
  formatEntitlementExpiry,
  isEntitled,
  redeemPromoCode,
  type Entitlement,
} from "@/lib/billing/entitlement";
import {
  SUBSCRIPTION_CANCEL_INSTRUCTIONS,
  SUBSCRIPTION_OFFERS,
  SUBSCRIPTION_RENEWAL_TERMS,
} from "@/lib/legal/subscriptionTerms";

type Props = {
  entitlement?: Entitlement | null;
  onEntitlementChange?: (entitlement: Entitlement) => void;
  onSubscribe?: (offerId: string) => void;
};

/** Plan & billing — status, Subscribe CTAs, and promo redeem. */
export function SubscriptionCheckoutCard({
  entitlement,
  onEntitlementChange,
  onSubscribe,
}: Props) {
  const entitled = isEntitled(entitlement);
  const [promo, setPromo] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const expiry = formatEntitlementExpiry(entitlement);

  const applyPromo = () => {
    setError("");
    setMessage("");
    const result = redeemPromoCode(promo);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onEntitlementChange?.(result.entitlement);
    setMessage(
      expiry || result.entitlement.expiresAt
        ? `Unlocked through ${new Date(result.entitlement.expiresAt!).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}.`
        : "Unlocked.",
    );
    setPromo("");
  };

  return (
    <section className="card settings-card" data-testid="subscription-checkout">
      <div className="card-head">
        <div>
          <span className="section-icon violet" aria-hidden>
            ★
          </span>
          <h2>Plan &amp; billing</h2>
        </div>
        <span className="count">{entitlementStatusLabel(entitlement)}</span>
      </div>
      <div className="settings-body">
        {entitled ? (
          <p className="settings-note" style={{ marginBottom: 12 }}>
            You have access
            {expiry ? ` until ${expiry}` : ""}.
            {entitlement?.status === "promo"
              ? " This year was unlocked with a founder promo code."
              : " Thanks for supporting LifeOS Pro."}
          </p>
        ) : (
          <p className="settings-note" style={{ marginBottom: 12 }}>
            LifeOS requires an active plan. Subscribe below, or redeem a founder promo for one free year.
          </p>
        )}

        <div className="subscription-offers">
          {SUBSCRIPTION_OFFERS.map((offer) => (
            <div className="subscription-checkout-row" key={offer.id}>
              <div className="subscription-checkout-copy">
                <strong>
                  {offer.label} · {offer.priceLabel}
                </strong>
                {offer === SUBSCRIPTION_OFFERS[0] ? (
                  <>
                    <p className="settings-note" style={{ margin: "8px 0 0" }}>
                      <strong>Renewal terms.</strong> {SUBSCRIPTION_RENEWAL_TERMS}
                    </p>
                    <p className="settings-note" style={{ margin: "8px 0 0" }}>
                      <strong>How to cancel.</strong> {SUBSCRIPTION_CANCEL_INSTRUCTIONS}
                    </p>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                className="primary"
                disabled={!offer.available || entitled}
                aria-describedby="lifeos-subscription-disclosures"
                onClick={() => offer.available && onSubscribe?.(offer.id)}
                title={
                  entitled
                    ? "You already have access"
                    : offer.available
                      ? `Subscribe to ${offer.label}`
                      : "Paid plans are not open yet"
                }
              >
                {entitled ? "Active" : offer.available ? "Subscribe" : "Coming soon"}
              </button>
            </div>
          ))}
        </div>

        <div id="lifeos-subscription-disclosures" className="subscription-disclosures">
          <p>
            By subscribing you agree to the renewal terms above. Cancel before the next billing date to avoid the
            next charge. On iPhone, paid plans use the App Store when products are live; web checkout uses Stripe
            when configured.
          </p>
        </div>

        <div className="subscription-promo" style={{ marginTop: 16 }}>
          <label htmlFor="settings-promo-code" className="settings-field-label">
            Promo code
          </label>
          <div className="import-url-row" style={{ marginTop: 6 }}>
            <input
              id="settings-promo-code"
              value={promo}
              onChange={(event) => {
                setPromo(event.target.value);
                if (error) setError("");
              }}
              placeholder='Exact code, quotes included'
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" disabled={!promo.trim()} onClick={applyPromo}>
              Redeem
            </button>
          </div>
          {error ? (
            <p className="settings-note" style={{ color: "#c65048", marginTop: 8 }} role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="settings-note" style={{ color: "var(--accent)", marginTop: 8 }}>
              {message}
            </p>
          ) : null}
        </div>

        <p className="settings-note" style={{ marginTop: 12 }}>
          Legal: <a href="/legal/dmca">DMCA</a> · <a href="/unsubscribe">Email preferences</a>
        </p>
      </div>
    </section>
  );
}
