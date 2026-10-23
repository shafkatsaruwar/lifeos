import fs from "fs";
import path from "path";
import {
  buildMarketingEmailHtml,
  buildMarketingEmailText,
  isPhysicalAddressConfigured,
  marketingEmailFooterHtml,
  marketingEmailFooterText,
  unsubscribeUrl,
} from "../lib/email/marketingCompliance";
import { sendMarketingEmail } from "../lib/email/sendMarketingEmail";
import { MINIMUM_SIGNUP_AGE } from "../lib/legal/ageGate";
import { SUBSCRIPTION_CANCEL_INSTRUCTIONS, SUBSCRIPTION_RENEWAL_TERMS } from "../lib/legal/subscriptionTerms";
import { DEFAULT_SESSION_REPLAY, resolveSessionReplayConfig } from "../lib/privacy/sessionReplay";
import { getDmcaAgent } from "../lib/legal/dmcaAgent";

describe("legal compliance helpers", () => {
  const originalAddress = process.env.LIFEOS_LEGAL_PHYSICAL_ADDRESS;

  afterEach(() => {
    if (originalAddress === undefined) delete process.env.LIFEOS_LEGAL_PHYSICAL_ADDRESS;
    else process.env.LIFEOS_LEGAL_PHYSICAL_ADDRESS = originalAddress;
  });

  it("requires COPPA minimum age of 13", () => {
    expect(MINIMUM_SIGNUP_AGE).toBe(13);
  });

  it("keeps session replay off by default and masks inputs", () => {
    expect(DEFAULT_SESSION_REPLAY.enabled).toBe(false);
    expect(DEFAULT_SESSION_REPLAY.maskInputs).toBe(true);
    expect(resolveSessionReplayConfig(true).maskInputs).toBe(true);
    expect(resolveSessionReplayConfig(true).enabled).toBe(false);
  });

  it("self-hosts UI fonts with no Google Fonts CDN", () => {
    const css = fs.readFileSync(path.join(__dirname, "../app/globals.css"), "utf8");
    expect(css).toMatch(/@font-face/);
    expect(css).toMatch(/url\("\/fonts\/SFProDisplay-Medium\.ttf"\)/);
    expect(css).not.toMatch(/fonts\.googleapis\.com/);
    expect(css).not.toMatch(/fonts\.gstatic\.com/);
    expect(fs.existsSync(path.join(__dirname, "../public/fonts/SFProDisplay-Medium.ttf"))).toBe(true);
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

  it("refuses marketing send when physical address is not configured", async () => {
    delete process.env.LIFEOS_LEGAL_PHYSICAL_ADDRESS;
    expect(isPhysicalAddressConfigured()).toBe(false);
    const result = await sendMarketingEmail({
      to: "user@example.com",
      subject: "Launch",
      bodyHtml: "<p>We launched</p>",
      bodyText: "We launched",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/LIFEOS_LEGAL_PHYSICAL_ADDRESS/);
  });

  it("accepts a real-looking physical address for CAN-SPAM", () => {
    expect(isPhysicalAddressConfigured("123 Market St, San Francisco, CA 94105")).toBe(true);
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
