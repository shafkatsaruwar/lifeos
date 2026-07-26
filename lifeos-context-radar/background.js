const DEFAULT_SETTINGS = {
  lifeosUrl: "https://lifeos-mu-three.vercel.app",
  enabledSites: { linkedin: true, indeed: true, handshake: true, greenhouse: true, lever: true, coursera: true }
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...existing, enabledSites: { ...DEFAULT_SETTINGS.enabledSites, ...existing.enabledSites } });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "LIFEOS_CONTEXT") return;
  chrome.storage.session.set({ latestContext: { ...message.context, tabId: sender.tab?.id, receivedAt: Date.now() } })
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));
  return true;
});
