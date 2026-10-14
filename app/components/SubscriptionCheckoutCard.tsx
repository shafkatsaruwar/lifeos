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

/** Plan & billing — paid hubs only; Home + School stay free. */
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
      result.entitlement.expiresAt
        ? `Hubs unlocked through ${new Date(result.entitlement.expiresAt).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}.`
        : "LifeOS Pro unlocked for life.",
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
            Paid hubs are unlocked
            {expiry ? ` until ${expiry}` : " for life"}. Home and School remain free for everyone.
          </p>
        ) : (
          <p className="settings-note" style={{ marginBottom: 12 }}>
            Home and School are free. Work, Study Abroad, Treasury, and Mastery need LifeOS Pro.
          </p>
        )}

        <div className="subscription-offers">
          {SUBSCRIPTION_OFFERS.map((offer, index) => (
            <div className="subscription-checkout-row" key={offer.id}>
              <div className="subscription-checkout-copy">
                <strong>
                  {offer.label} · {offer.priceLabel}
                </strong>
                {index === 0 ? (
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
            next charge. Lifetime does not renew. On iPhone, paid plans use the App Store when products are live;
            web checkout uses Stripe when configured.
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
              placeholder="Enter promo code"
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
