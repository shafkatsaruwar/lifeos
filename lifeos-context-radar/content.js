const hostname = window.location.hostname.toLowerCase();
const site = hostname.includes("linkedin.com") ? "linkedin" : hostname.includes("indeed.com") ? "indeed" : hostname.includes("handshake.com") ? "handshake" : hostname.includes("greenhouse.io") ? "greenhouse" : hostname.includes("lever.co") ? "lever" : hostname.includes("coursera.org") ? "coursera" : null;

if (site) {
  chrome.storage.sync.get({ enabledSites: {} }, ({ enabledSites }) => {
    if (!enabledSites[site]) return;
    chrome.runtime.sendMessage({
      type: "LIFEOS_CONTEXT",
      context: { kind: site === "coursera" ? "coursera-course" : "job-application", site, title: document.title.slice(0, 120), url: window.location.href }
    });
  });
}
