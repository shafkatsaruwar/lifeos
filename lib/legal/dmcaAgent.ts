/**
 * DMCA designated agent — publish on-site and file with the U.S. Copyright Office
 * (https://www.copyright.gov/dmca-directory/). Keep env vars in sync with the filing.
 */

export type DmcaAgent = {
  serviceProvider: string;
  agentName: string;
  agentTitle: string;
  email: string;
  phone: string;
  addressLines: string[];
  copyrightOfficeFilingUrl: string;
};

export function getDmcaAgent(): DmcaAgent {
  const address =
    process.env.LIFEOS_DMCA_AGENT_ADDRESS?.trim() ||
    process.env.LIFEOS_LEGAL_PHYSICAL_ADDRESS?.trim() ||
    "[Set LIFEOS_DMCA_AGENT_ADDRESS in .env]";

  return {
    serviceProvider: process.env.LIFEOS_LEGAL_ENTITY_NAME?.trim() || "LifeOS",
    agentName: process.env.LIFEOS_DMCA_AGENT_NAME?.trim() || "DMCA Designated Agent",
    agentTitle: process.env.LIFEOS_DMCA_AGENT_TITLE?.trim() || "Copyright Agent",
    email: process.env.LIFEOS_DMCA_AGENT_EMAIL?.trim() || "dmca@example.com",
    phone: process.env.LIFEOS_DMCA_AGENT_PHONE?.trim() || "[Set LIFEOS_DMCA_AGENT_PHONE]",
    addressLines: address.split(/\n|, /).map((line) => line.trim()).filter(Boolean),
    copyrightOfficeFilingUrl: "https://www.copyright.gov/dmca-directory/",
  };
}
