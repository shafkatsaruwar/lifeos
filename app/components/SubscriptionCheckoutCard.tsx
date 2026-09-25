"use client";

import {
  SUBSCRIPTION_CANCEL_INSTRUCTIONS,
  SUBSCRIPTION_OFFERS,
  SUBSCRIPTION_RENEWAL_TERMS,
} from "@/lib/legal/subscriptionTerms";

type Props = {
  onSubscribe?: (offerId: string) => void;
};

/** Subscribe CTA with renewal terms + cancel instructions immediately adjacent (required disclosures). */
export function SubscriptionCheckoutCard({ onSubscribe }: Props) {
  const offer = SUBSCRIPTION_OFFERS[0];

  return (
    <section className="card settings-card" data-testid="subscription-checkout">
      <div className="card-head">
        <div>
          <span className="section-icon violet" aria-hidden>
            ★
          </span>
          <h2>Plan &amp; billing</h2>
        </div>
        <span className="count">Free</span>
      </div>
      <div className="settings-body">
        <p className="settings-note" style={{ marginBottom: 12 }}>
          You are on the free LifeOS plan. No card is on file and nothing renews automatically today.
        </p>
        <div className="subscription-checkout-row">
          <div className="subscription-checkout-copy">
            <strong>
              {offer.label} · {offer.priceLabel}
            </strong>
            <p className="settings-note" style={{ margin: "8px 0 0" }}>
              <strong>Renewal terms.</strong> {SUBSCRIPTION_RENEWAL_TERMS}
            </p>
            <p className="settings-note" style={{ margin: "8px 0 0" }}>
              <strong>How to cancel.</strong> {SUBSCRIPTION_CANCEL_INSTRUCTIONS}
            </p>
          </div>
          <button
            type="button"
            className="primary"
            disabled={!offer.available}
            aria-describedby="lifeos-subscription-disclosures"
            onClick={() => offer.available && onSubscribe?.(offer.id)}
            title={offer.available ? `Subscribe to ${offer.label}` : "Paid plans are not open yet"}
          >
            {offer.available ? "Subscribe" : "Subscribe (coming soon)"}
          </button>
        </div>
        <div id="lifeos-subscription-disclosures" className="subscription-disclosures">
          <p>
            By subscribing you agree to the renewal terms above. Cancel before the next billing date to avoid the
            next charge.
          </p>
        </div>
        <p className="settings-note" style={{ marginTop: 12 }}>
          Legal: <a href="/legal/dmca">DMCA</a> ·{" "}
          <a href="/unsubscribe">Email preferences</a>
        </p>
      </div>
    </section>
  );
}
