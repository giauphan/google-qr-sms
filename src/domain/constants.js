/**
 * Domain constants for UA profiles, Google Identity endpoints, and RPC identifiers.
 */

export const IPAD_MINI_UA =
  "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

export const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

export const ACCOUNTS_ORIGIN = "https://accounts.google.com";

export const CLIENT_HINT_HEADERS = [
  "Sec-CH-UA",
  "Sec-CH-UA-Mobile",
  "Sec-CH-UA-Platform",
  "Sec-CH-UA-Platform-Version",
  "Sec-CH-UA-Model",
  "Sec-CH-UA-Full-Version",
  "Sec-CH-UA-Full-Version-List",
  "Sec-CH-UA-Arch",
  "Sec-CH-UA-Bitness",
  "Sec-CH-UA-WoW64",
  "Sec-CH-UA-Form-Factors"
];

export const RPC_IDS = {
  INITIATE_CONSENT: "MypxBd",
  SUBMIT_FALLBACK_STATUS: "YDtwf"
};

export const FALLBACK_STATUS_PATTERN = /\[\s*3\s*,\s*null\s*,\s*4\s*\]/;
