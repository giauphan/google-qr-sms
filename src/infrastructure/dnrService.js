import { IPAD_MINI_UA, IPHONE_UA, CLIENT_HINT_HEADERS } from "../domain/constants.js";

const REMOVE_CLIENT_HINTS = CLIENT_HINT_HEADERS.map(header => ({
  header,
  operation: "remove"
}));

/**
 * Registers Chrome declarativeNetRequest dynamic rules to enforce iPad Mini UA
 * across accounts.google.com and iPhone UA for /devicephoneverification/*.
 */
export function setupDnrRules() {
  return chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "User-Agent", operation: "set", value: IPAD_MINI_UA },
            ...REMOVE_CLIENT_HINTS
          ]
        },
        condition: {
          urlFilter: "||accounts.google.com/*",
          excludedRequestDomains: [],
          resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"]
        }
      },
      {
        id: 2,
        priority: 10,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "User-Agent", operation: "set", value: IPHONE_UA },
            ...REMOVE_CLIENT_HINTS
          ]
        },
        condition: {
          urlFilter: "||accounts.google.com/devicephoneverification/*",
          resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"]
        }
      }
    ]
  });
}
