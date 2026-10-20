# LifeOS legal compliance checklist

Operator guide for the six launch risks called out in the “vibe-coded app liability” audit. This is **not legal advice** — confirm with counsel for your entity and jurisdictions.

| # | Risk | Product control | Status |
|---|------|-----------------|--------|
| 1 | COPPA — signup without age | Age gate (13+) on web login, shell-auth, and iOS auth | In app |
| 2 | GDPR — Google Fonts CDN leaks IP | Self-hosted font only (`public/fonts/…`, `app/globals.css`) | In app |
| 3 | CIPA — session replay / keystroke capture | Replay **off** by default; inputs always masked; vendor gated | In app |
| 4 | CAN-SPAM — marketing email without unsub + postal address | `buildMarketingEmailHtml` / `sendMarketingEmail` + `/unsubscribe` | In app (set address) |
| 5 | Auto-renewal disclosure | Renewal + cancel copy next to every Subscribe CTA | In app |
| 6 | DMCA safe harbor — designated agent | `/legal/dmca` + Copyright Office filing | In app + **you must file** |

## Env vars (required before production mail / DMCA filing)

Copy from `.env.example`:

```bash
LIFEOS_LEGAL_ENTITY_NAME=
LIFEOS_LEGAL_PHYSICAL_ADDRESS=   # real street address for CAN-SPAM footers
LIFEOS_SUPPORT_EMAIL=
LIFEOS_DMCA_AGENT_NAME=
LIFEOS_DMCA_AGENT_TITLE=
LIFEOS_DMCA_AGENT_EMAIL=
LIFEOS_DMCA_AGENT_PHONE=
LIFEOS_DMCA_AGENT_ADDRESS=       # defaults to LIFEOS_LEGAL_PHYSICAL_ADDRESS if unset
NEXT_PUBLIC_LIFEOS_SITE_URL=     # used in unsubscribe links
```

`sendMarketingEmail` **refuses to send** if the physical address is still the placeholder.

## Register a DMCA designated agent (Copyright Office)

Safe harbor for user uploads requires a filed agent (~$6). Walkthrough:

1. Create / sign in at [copyright.gov](https://www.copyright.gov/dmca-directory/) → DMCA Designated Agent Directory.
2. Register your service provider (entity name = `LIFEOS_LEGAL_ENTITY_NAME`).
3. Enter the **same** agent name, email, phone, and mailing address as `/legal/dmca` (the `LIFEOS_DMCA_AGENT_*` values).
4. Pay the fee and keep the registration renewed.
5. Publish the agent page publicly (already at `/legal/dmca`) and link it from Settings → Plan & billing and the site footer.
6. When a valid notice arrives: disable access to the material promptly, notify the uploader, and follow counternotice procedure with counsel.

## Code map

| Concern | Files |
|---------|--------|
| Age gate | `lib/legal/ageGate.ts`, `app/components/AgeGateCheckbox.tsx`, `app/page.tsx` login, `app/shell-auth/page.tsx`, `lifeos-mobile/src/components/Auth.tsx` |
| Fonts | `public/fonts/`, `app/globals.css` `@font-face` |
| Session replay | `lib/privacy/sessionReplay.ts`, `app/components/PrivacyTelemetry.tsx` |
| Marketing email | `lib/email/marketingCompliance.ts`, `lib/email/sendMarketingEmail.ts`, `app/unsubscribe/`, `app/api/email/unsubscribe/` |
| Subscription disclosures | `lib/legal/subscriptionTerms.ts`, `app/components/SubscriptionCheckoutCard.tsx`, `app/components/PaywallGate.tsx` |
| DMCA | `lib/legal/dmcaAgent.ts`, `app/legal/dmca/page.tsx` |

## Tests

```bash
npm test -- --runInBand __tests__/legalCompliance.test.ts
```
