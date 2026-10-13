"use client";

import { useState } from "react";
import {
  LIFEOS_PROMO_CODE,
  redeemPromoCode,
  type Entitlement,
} from "@/lib/billing/entitlement";
import {
  SUBSCRIPTION_CANCEL_INSTRUCTIONS,
  SUBSCRIPTION_OFFERS,
  SUBSCRIPTION_PRODUCT_NAME,
  SUBSCRIPTION_RENEWAL_TERMS,
} from "@/lib/legal/subscriptionTerms";

type Props = {
  onUnlock: (entitlement: Entitlement) => void;
  onSubscribe?: (offerId: string) => void;
  onSignOut?: () => void;
  subscribeBusy?: boolean;
  subscribeNote?: string;
};

export function PaywallGate({
  onUnlock,
  onSubscribe,
  onSignOut,
  subscribeBusy,
  subscribeNote,
}: Props) {
  const [promo, setPromo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const applyPromo = () => {
    setBusy(true);
    setError("");
    const result = redeemPromoCode(promo);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUnlock(result.entitlement);
  };

  return (
    <div className="paywall-layer" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="paywall-card">
        <p className="eyebrow">LifeOS Pro</p>
        <h1 id="paywall-title">Unlock your operating system</h1>
        <p className="paywall-lead">
          One calm home for Now, Calendar, tasks, and your environments. Subscribe to continue — or redeem a
          founder promo for a free year.
        </p>

        <div className="paywall-offers">
          {SUBSCRIPTION_OFFERS.map((offer) => (
            <button
              key={offer.id}
              type="button"
              className="paywall-offer"
              disabled={!offer.available || subscribeBusy}
              onClick={() => onSubscribe?.(offer.id)}
            >
              <strong>{offer.label}</strong>
              <span>{offer.priceLabel}</span>
            </button>
          ))}
        </div>

        <p className="paywall-legal">
          <strong>Renewal.</strong> {SUBSCRIPTION_RENEWAL_TERMS}
        </p>
        <p className="paywall-legal">
          <strong>Cancel.</strong> {SUBSCRIPTION_CANCEL_INSTRUCTIONS}
        </p>
        {subscribeNote ? <p className="paywall-note">{subscribeNote}</p> : null}

        <div className="paywall-promo">
          <label htmlFor="lifeos-promo-code">Promo code</label>
          <div className="paywall-promo-row">
            <input
              id="lifeos-promo-code"
              value={promo}
              onChange={(event) => {
                setPromo(event.target.value);
                if (error) setError("");
              }}
              placeholder='Include the quotes — e.g. "…"'
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyPromo();
                }
              }}
            />
            <button type="button" className="primary" disabled={busy || !promo.trim()} onClick={applyPromo}>
              Redeem
            </button>
          </div>
          <p className="paywall-hint">
            Founder year unlock uses the exact code {LIFEOS_PROMO_CODE} (quotes included).
          </p>
          {error ? <p className="paywall-error" role="alert">{error}</p> : null}
        </div>

        <p className="paywall-footnote">
          {SUBSCRIPTION_PRODUCT_NAME} ·{" "}
          <a href="/legal/dmca">Legal</a>
          {onSignOut ? (
            <>
              {" · "}
              <button type="button" className="paywall-text-btn" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
