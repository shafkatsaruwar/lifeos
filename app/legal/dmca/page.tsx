import type { Metadata } from "next";
import Link from "next/link";
import { getDmcaAgent } from "@/lib/legal/dmcaAgent";

export const metadata: Metadata = {
  title: "DMCA Designated Agent — LifeOS",
  description: "LifeOS DMCA designated agent contact and notice procedures.",
};

export default function DmcaPage() {
  const agent = getDmcaAgent();

  return (
    <main className="legal-page">
      <p className="eyebrow">Legal</p>
      <h1>DMCA designated agent</h1>
      <p>
        {agent.serviceProvider} respects intellectual property rights. To submit a notice of claimed
        copyright infringement under the Digital Millennium Copyright Act (17 U.S.C. § 512), contact our
        designated agent:
      </p>

      <section className="legal-card">
        <h2>Designated agent</h2>
        <dl className="legal-dl">
          <div>
            <dt>Service provider</dt>
            <dd>{agent.serviceProvider}</dd>
          </div>
          <div>
            <dt>Name</dt>
            <dd>
              {agent.agentName}
              {agent.agentTitle ? `, ${agent.agentTitle}` : ""}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${agent.email}`}>{agent.email}</a>
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{agent.phone}</dd>
          </div>
          <div>
            <dt>Mailing address</dt>
            <dd>
              {agent.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      <section className="legal-card">
        <h2>Notice requirements</h2>
        <p>A valid DMCA notice should include:</p>
        <ul>
          <li>Your physical or electronic signature</li>
          <li>Identification of the copyrighted work claimed to be infringed</li>
          <li>Identification of the material that is claimed to be infringing and information reasonably sufficient to permit us to locate it</li>
          <li>Your contact information (address, telephone number, and email)</li>
          <li>A statement that you have a good-faith belief that use of the material is not authorized</li>
          <li>A statement that the information in the notice is accurate, and under penalty of perjury, that you are authorized to act on behalf of the copyright owner</li>
        </ul>
      </section>

      <section className="legal-card">
        <h2>Copyright Office registration</h2>
        <p>
          The designated agent listed above is registered (or will be kept registered) with the U.S. Copyright
          Office DMCA designated agent directory. Operators: file and renew at{" "}
          <a href={agent.copyrightOfficeFilingUrl} rel="noreferrer" target="_blank">
            copyright.gov/dmca-directory
          </a>{" "}
          using the same name, email, phone, and address as this page (set via{" "}
          <code>LIFEOS_DMCA_AGENT_*</code> env vars).
        </p>
      </section>

      <p className="legal-back">
        <Link href="/">← Back to LifeOS</Link>
      </p>
    </main>
  );
}
