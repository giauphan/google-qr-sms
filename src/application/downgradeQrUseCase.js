import { RPC_IDS } from "../domain/constants.js";
import {
  resolveShortVerifyUrl,
  fetchInitiateContext,
  executeBatchRpc,
  fetchConsentUuid
} from "../infrastructure/googleIdentityClient.js";

/**
 * Orchestrates the cross-device QR fallback ([3, null, 4]) for a given QR URL.
 */
export async function downgradeQrUseCase({ qrUrl, pageTl, ensureRulesReady }) {
  if (ensureRulesReady) {
    await ensureRulesReady;
  }

  const targetUrl = await resolveShortVerifyUrl(qrUrl);
  const { at, dsh, tl, plt } = await fetchInitiateContext(targetUrl, pageTl);

  let mypxResp = "";
  try {
    mypxResp = await executeBatchRpc({
      rpcid: RPC_IDS.INITIATE_CONSENT,
      payload: [tl || null, dsh, false, null, null, false, null, null, "browser"],
      sourcePath: "/devicephoneverification/initiate",
      at,
      tl
    });
  } catch (err) {
    console.warn("MypxBd request warning:", err);
  }

  let rid = null;
  try {
    rid = await fetchConsentUuid({ dsh, plt, tl, mypxResp });
  } catch (err) {
    console.warn("consent fetch warning:", err);
  }

  if (!rid) {
    rid = crypto.randomUUID();
  }

  const ydResp = await executeBatchRpc({
    rpcid: RPC_IDS.SUBMIT_FALLBACK_STATUS,
    payload: [null, rid, dsh, 7, null, tl || null, false],
    sourcePath: "/devicephoneverification/modacintro",
    at,
    tl
  });

  return { ok: true, rid, ydResp };
}
