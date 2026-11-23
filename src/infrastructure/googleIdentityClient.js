import { ACCOUNTS_ORIGIN } from "../domain/constants.js";

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Resolves a g.co/verify short URL to the underlying devicephoneverification/begin URL.
 */
export async function resolveShortVerifyUrl(qrUrl) {
  if (!qrUrl.includes("g.co/verify/")) {
    return qrUrl;
  }
  const shortResp = await fetch(qrUrl, { credentials: "include" });
  if (!shortResp.ok) {
    throw new Error(`Failed to resolve short URL (HTTP ${shortResp.status})`);
  }
  if (shortResp.url.includes("devicephoneverification/begin")) {
    return shortResp.url;
  }
  const shortHtml = await shortResp.text();
  const m = shortHtml.match(/devicephoneverification\/begin\?[^"'\s<>]+/);
  if (!m) {
    throw new Error("Failed to extract devicephoneverification/begin URL from g.co/verify page");
  }
  return `${ACCOUNTS_ORIGIN}/` + m[0]
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;.*$/, "");
}

/**
 * Fetches the initiate page and extracts session tokens (at, dsh, tl, plt).
 */
export async function fetchInitiateContext(targetUrl, pageTl) {
  const initResp = await fetch(targetUrl, { credentials: "include" });
  if (!initResp.ok) {
    throw new Error(`Failed to load QR verification page (HTTP ${initResp.status})`);
  }
  const html = await initResp.text();

  const ds0ErrMatch = html.match(/AF_initDataCallback\(\{key:\s*['"]ds:0['"][^)]*data:\s*\[(\d+)\][^)]*errorHasStatus:\s*true/s);
  if (ds0ErrMatch) {
    const code = ds0ErrMatch[1];
    throw new Error(
      code === "9"
        ? "QR code verification session has expired (ds:0 error [9]). Please reopen Verify for a fresh QR code."
        : `Google verification error on initiate page (ds:0 error [${code}]). Please get a fresh QR code.`
    );
  }

  const atMatch = html.match(/"SNlM0e":"([^"]+)"/);
  const dshMatch = html.match(/"Qzxixc":"([^"]+)"/);
  const ds0Match = html.match(/AF_initDataCallback\(\{key:\s*['"]ds:0['"][^)]*?data:\s*\[\s*"([^"]+)"/s);

  const initUrl = new URL(initResp.url || targetUrl, ACCOUNTS_ORIGIN);
  const reqUrl = new URL(targetUrl, ACCOUNTS_ORIGIN);
  const ds0Token = ds0Match ? ds0Match[1] : null;
  const tl = ds0Token
    || initUrl.searchParams.get("tl")
    || initUrl.searchParams.get("TL")
    || reqUrl.searchParams.get("tl")
    || reqUrl.searchParams.get("TL")
    || (html.match(/ADG-[A-Za-z0-9_-]+/)?.[0] ?? null)
    || pageTl;
  const plt = initUrl.searchParams.get("plt") || reqUrl.searchParams.get("plt") || "";

  const missing = [];
  if (!atMatch) missing.push("SNlM0e");
  if (!dshMatch) missing.push("Qzxixc");
  if (!tl && !plt) missing.push("TL/plt");
  if (missing.length > 0) {
    throw new Error(`Failed to extract ${missing.join(" / ")} parameter(s) from QR page (URL: ${initUrl.pathname})`);
  }

  return {
    at: atMatch[1],
    dsh: dshMatch[1],
    tl,
    plt
  };
}

/**
 * Executes a Google DevicePhoneVerificationUi batchexecute RPC call.
 */
export async function executeBatchRpc({ rpcid, payload, sourcePath, at, tl }) {
  const query = new URLSearchParams({
    rpcids: rpcid,
    "source-path": sourcePath,
    hl: "en",
    rt: "c"
  });
  if (tl) query.set("tl", tl);

  const url = `${ACCOUNTS_ORIGIN}/devicephoneverification/_/DevicePhoneVerificationUi/data/batchexecute?${query.toString()}`;
  const body = new URLSearchParams({
    "f.req": JSON.stringify([[[rpcid, JSON.stringify(payload), null, "generic"]]]),
    at
  });

  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: body.toString()
  });
  if (!r.ok) {
    throw new Error(`RPC ${rpcid} request failed (HTTP ${r.status})`);
  }
  return await r.text();
}

/**
 * Fetches /devicephoneverification/consent to extract a request UUID if present.
 */
export async function fetchConsentUuid({ dsh, plt, tl, mypxResp }) {
  const consentQuery = new URLSearchParams({ flow: "browser", dsh, hl: "en" });
  if (plt) consentQuery.set("plt", plt);
  if (tl) consentQuery.set("tl", tl);

  const consentUrl = `${ACCOUNTS_ORIGIN}/devicephoneverification/consent?${consentQuery.toString()}`;
  const consentResp = await fetch(consentUrl, { credentials: "include" });
  if (!consentResp.ok) {
    return null;
  }

  const consentHtml = await consentResp.text();
  return (
    consentHtml.match(UUID_REGEX)?.[0]
    || (consentResp.url && consentResp.url.match(UUID_REGEX)?.[0])
    || (mypxResp && mypxResp.match(UUID_REGEX)?.[0])
    || null
  );
}
