import {
  buildMarketingEmailHtml,
  buildMarketingEmailText,
  marketingEmailFooterHtml,
  marketingEmailFooterText,
  unsubscribeUrl,
} from "../lib/email/marketingCompliance";
import { MINIMUM_SIGNUP_AGE } from "../lib/legal/ageGate";
import { SUBSCRIPTION_CANCEL_INSTRUCTIONS, SUBSCRIPTION_RENEWAL_TERMS } from "../lib/legal/subscriptionTerms";
import { DEFAULT_SESSION_REPLAY, resolveSessionReplayConfig } from "../lib/privacy/sessionReplay";
import { getDmcaAgent } from "../lib/legal/dmcaAgent";

describe("legal compliance helpers", () => {
  it("requires COPPA minimum age of 13", () => {
    expect(MINIMUM_SIGNUP_AGE).toBe(13);
  });

  it("keeps session replay off by default and masks inputs", () => {
    expect(DEFAULT_SESSION_REPLAY.enabled).toBe(false);
    expect(DEFAULT_SESSION_REPLAY.maskInputs).toBe(true);
    expect(resolveSessionReplayConfig(true).maskInputs).toBe(true);
    expect(resolveSessionReplayConfig(true).enabled).toBe(false);
  });

  it("puts unsubscribe link and physical address on every marketing footer", () => {
    const html = marketingEmailFooterHtml("user@example.com");
    const text = marketingEmailFooterText("user@example.com");
    expect(html).toMatch(/Unsubscribe/i);
    expect(html).toContain(unsubscribeUrl("user@example.com"));
    expect(html).toMatch(/LIFEOS_LEGAL|physical|example\.com|Set LIFEOS/i);
    expect(text).toMatch(/Unsubscribe:/i);
    expect(text.length).toBeGreaterThan(40);

    const wrapped = buildMarketingEmailHtml({ bodyHtml: "<p>Hi</p>", email: "user@example.com" });
    expect(wrapped).toContain("<p>Hi</p>");
    expect(wrapped).toMatch(/Unsubscribe/i);

    const wrappedText = buildMarketingEmailText({ bodyText: "Hi", email: "user@example.com" });
    expect(wrappedText.startsWith("Hi")).toBe(true);
    expect(wrappedText).toMatch(/Unsubscribe:/i);
  });

  it("exposes renewal terms and cancel instructions for subscribe CTAs", () => {
    expect(SUBSCRIPTION_RENEWAL_TERMS.toLowerCase()).toContain("renew");
    expect(SUBSCRIPTION_CANCEL_INSTRUCTIONS.toLowerCase()).toContain("cancel");
  });

  it("publishes a DMCA designated agent contact", () => {
    const agent = getDmcaAgent();
    expect(agent.email).toMatch(/@/);
    expect(agent.agentName.length).toBeGreaterThan(0);
    expect(agent.addressLines.length).toBeGreaterThan(0);
    expect(agent.copyrightOfficeFilingUrl).toContain("copyright.gov");
  });
});
