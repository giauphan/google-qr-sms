import { IPAD_MINI_UA, IPHONE_UA, CLIENT_HINT_HEADERS } from "../domain/constants.js";

const REMOVE_CLIENT_HINTS = CLIENT_HINT_HEADERS.map(header => ({
  header,
  operation: "remove"
}));

const IPAD_RULE_BASE = {
  priority: 1,
  action: {
    type: "modifyHeaders",
    requestHeaders: [
      { header: "User-Agent", operation: "set", value: IPAD_MINI_UA },
      ...REMOVE_CLIENT_HINTS
    ]
  }
};

const SCOPED_RESOURCE_TYPES = ["main_frame", "sub_frame", "xmlhttprequest", "other"];

/**
 * Registers Chrome declarativeNetRequest dynamic rules to enforce iPad Mini UA
 * on /uplevelingstep/* and /_/IdvUplevelingUi/*, and iPhone UA on /devicephoneverification/*.
 * Normal sign-in routes (/v3/signin/*) are left untouched to avoid BotGuard blocks.
 */
export function setupDnrRules() {
  return chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2, 3],
    addRules: [
      {
        id: 1,
        ...IPAD_RULE_BASE,
        condition: {
          urlFilter: "||accounts.google.com/uplevelingstep/*",
          resourceTypes: SCOPED_RESOURCE_TYPES
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
          resourceTypes: SCOPED_RESOURCE_TYPES
        }
      },
      {
        id: 3,
        ...IPAD_RULE_BASE,
        condition: {
          urlFilter: "||accounts.google.com/_/IdvUplevelingUi/*",
          resourceTypes: SCOPED_RESOURCE_TYPES
        }
      }
    ]
  });
}
