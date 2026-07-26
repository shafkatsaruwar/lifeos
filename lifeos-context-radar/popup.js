const DEFAULT_SETTINGS = {
  lifeosUrl: "https://lifeos-mu-three.vercel.app",
  enabledSites: { linkedin: true, indeed: true, handshake: true, greenhouse: true, lever: true, coursera: true }
};
const SITE_LABELS = { linkedin: "LinkedIn", indeed: "Indeed", handshake: "Handshake", greenhouse: "Greenhouse", lever: "Lever", coursera: "Coursera" };

const headline = document.querySelector("#headline");
const detail = document.querySelector("#detail");
const start = document.querySelector("#start");
const ignore = document.querySelector("#ignore");
const urlInput = document.querySelector("#lifeos-url");
const toggles = document.querySelector("#site-toggles");
let settings = DEFAULT_SETTINGS;
let context = null;

function contextFromTab(tab) {
  const hostname = new URL(tab?.url || "https://invalid.local").hostname.toLowerCase();
  if (hostname.includes("coursera.org")) return { kind: "coursera-course", site: "coursera", title: tab.title || "Google AI Certificate coursework" };
  if (hostname.includes("linkedin.com")) return { kind: "job-application", site: "linkedin", title: tab.title || "Job application" };
  if (hostname.includes("indeed.com")) return { kind: "job-application", site: "indeed", title: tab.title || "Job application" };
  if (hostname.includes("handshake.com")) return { kind: "job-application", site: "handshake", title: tab.title || "Job application" };
  if (hostname.includes("greenhouse.io")) return { kind: "job-application", site: "greenhouse", title: tab.title || "Job application" };
  if (hostname.includes("lever.co")) return { kind: "job-application", site: "lever", title: tab.title || "Job application" };
  return null;
}

function renderToggles() {
  toggles.innerHTML = Object.entries(SITE_LABELS).map(([key, label]) => '<label class="toggle"><input type="checkbox" data-site="' + key + '" ' + (settings.enabledSites[key] ? "checked" : "") + '><span>' + label + "</span></label>").join("");
}

async function boot() {
  settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  settings.enabledSites = { ...DEFAULT_SETTINGS.enabledSites, ...settings.enabledSites };
  urlInput.value = settings.lifeosUrl;
  renderToggles();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const latest = await chrome.storage.session.get("latestContext");
  if (latest.latestContext?.tabId === tab?.id && ["job-application", "coursera-course"].includes(latest.latestContext?.kind)) context = latest.latestContext;
  if (!context) context = contextFromTab(tab);
  if (context && !settings.enabledSites[context.site]) context = null;
  if (context) {
    const course = context.kind === "coursera-course";
    headline.textContent = course ? "This looks like Coursera coursework." : "This looks like a job application.";
    detail.textContent = course ? "Want to start your Google AI Certificate work in LifeOS? You will still confirm it there." : "Want to start a Career activity in LifeOS? You will still confirm it there.";
    start.disabled = false;
  } else {
    headline.textContent = "No approved work context here.";
    detail.textContent = "Open a page on an enabled job site, then use the extension. Nothing is tracked in the background.";
  }
}

start.addEventListener("click", async () => {
  if (!context) return;
  const base = settings.lifeosUrl.replace(/\/$/, "");
  const course = context.kind === "coursera-course";
  const title = context.title?.replace(/\s*[-|–].*$/, "").slice(0, 80) || (course ? "Google AI Certificate coursework" : "Job application");
  const destination = base + "/?lifeos_activity=" + (course ? "coursera-course" : "job-application") + "&space=Career&title=" + encodeURIComponent(title);
  await chrome.tabs.create({ url: destination });
  window.close();
});
ignore.addEventListener("click", () => window.close());
document.querySelector("#save").addEventListener("click", async () => {
  document.querySelectorAll("[data-site]").forEach(input => { settings.enabledSites[input.dataset.site] = input.checked; });
  settings.lifeosUrl = urlInput.value.trim().replace(/\/$/, "") || DEFAULT_SETTINGS.lifeosUrl;
  await chrome.storage.sync.set(settings);
  headline.textContent = "Settings saved.";
});
boot();
