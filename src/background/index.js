import { setupDnrRules } from "../infrastructure/dnrService.js";
import { downgradeQrUseCase } from "../application/downgradeQrUseCase.js";

chrome.runtime.onInstalled.addListener(setupDnrRules);
chrome.runtime.onStartup.addListener(setupDnrRules);
const rulesReady = setupDnrRules();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "downgradeQr") {
    downgradeQrUseCase({
      qrUrl: msg.qrUrl,
      pageTl: msg.pageTl,
      ensureRulesReady: rulesReady
    })
      .then(sendResponse)
      .catch(err => {
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }
});
