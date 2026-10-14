"use client";

import { useState } from "react";
import { redeemPromoCode, type Entitlement } from "@/lib/billing/entitlement";
import {
  SUBSCRIPTION_CANCEL_INSTRUCTIONS,
  SUBSCRIPTION_OFFERS,
  SUBSCRIPTION_PRODUCT_NAME,
  SUBSCRIPTION_RENEWAL_TERMS,
} from "@/lib/legal/subscriptionTerms";

type Props = {
  onUnlock: (entitlement: Entitlement) => void;
  onSubscribe?: (offerId: string) => void;
  onClose?: () => void;
  subscribeBusy?: boolean;
  subscribeNote?: string;
};

/** Modal paywall for paid hubs (Work, Study Abroad, Treasury, Mastery). */
export function PaywallGate({
  onUnlock,
  onSubscribe,
  onClose,
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
    <div
      className="paywall-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="paywall-card"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="paywall-card-head">
          <p className="eyebrow">LifeOS Pro</p>
          {onClose ? (
            <button type="button" className="paywall-text-btn" onClick={onClose} aria-label="Close">
              Not now
            </button>
          ) : null}
        </div>
        <h1 id="paywall-title">Unlock more hubs</h1>
        <p className="paywall-lead">
          Home and School stay free. Pro unlocks Work, Study Abroad, Treasury, and Mastery.
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
              placeholder="Enter promo code"
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
          {error ? <p className="paywall-error" role="alert">{error}</p> : null}
        </div>

        <p className="paywall-footnote">
          {SUBSCRIPTION_PRODUCT_NAME} · <a href="/legal/dmca">Legal</a>
        </p>
      </div>
    </div>
  );
}
