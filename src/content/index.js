(() => {
  // Only mount helper panel on Cloud Console or QR verification page
  const isCloudConsole = location.hostname === "console.cloud.google.com";
  const isQrPage = location.pathname.includes("/challenge/iap/qrcode");
  if (!isCloudConsole && !isQrPage) {
    return;
  }

  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;background:#1a73e8;color:#fff;padding:12px 16px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.25);font-family:system-ui,sans-serif;font-size:13px;display:flex;flex-direction:column;gap:8px;min-width:240px;max-width:320px;";

  const title = document.createElement("div");
  title.style.cssText = "font-weight:600;font-size:14px;display:flex;justify-content:space-between;align-items:center;";
  title.textContent = "⚡ Google QR SMS Helper v1.0.0";
  panel.appendChild(title);

  const statusEl = document.createElement("div");
  statusEl.style.cssText = "font-size:12px;color:#e8f0fe;word-break:break-word;line-height:1.4;";
  panel.appendChild(statusEl);

  const btn = document.createElement("button");
  btn.style.cssText = "background:#fff;color:#1a73e8;border:none;padding:8px 12px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;";
  panel.appendChild(btn);

  document.body.appendChild(panel);

  if (isCloudConsole) {
    statusEl.textContent = "Step 1: Click the top-right Cloud Shell icon [>_] to prompt Verify, or click below";
    btn.textContent = "1. Open Cloud Shell Terminal";
    btn.onclick = () => {
      const shellBtn = document.querySelector('button[aria-label*="Cloud Shell"], button[mattooltip*="Cloud Shell"], [id*="cloudshell"]');
      if (shellBtn) {
        shellBtn.click();
        statusEl.textContent = "✅ Terminal icon clicked. Waiting for Verify button...";
        setTimeout(() => {
          const allBtns = Array.from(document.querySelectorAll("button, a"));
          const verifyBtn = allBtns.find(b => b.textContent.trim() === "Verify");
          if (verifyBtn) {
            verifyBtn.click();
            statusEl.textContent = "✅ Verify button clicked automatically!";
          }
        }, 2500);
      } else {
        statusEl.textContent = "⚠️ Terminal button not found. Please click [>_] manually in top-right.";
      }
    };
  } else if (isQrPage) {
    statusEl.textContent = "QR code verification detected. Click below to inject [3,null,4] fallback.";
    btn.textContent = "⚡ Downgrade to SMS Verification";
    btn.onclick = runDowngrade;
  }

  async function extractQrUrlFromPage() {
    if ("BarcodeDetector" in window) {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const mediaEls = Array.from(document.querySelectorAll("img, canvas"));
      for (const el of mediaEls) {
        try {
          if (el.clientWidth > 80 && el.clientHeight > 80) {
            const c = document.createElement("canvas");
            c.width = el.naturalWidth || el.clientWidth || 300;
            c.height = el.naturalHeight || el.clientHeight || 300;
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(el, 0, 0, c.width, c.height);
            const codes = await detector.detect(c);
            if (codes && codes.length > 0 && codes[0].rawValue) {
              return codes[0].rawValue;
            }
          }
        } catch (_) {}
      }
    }
    const bodyText = document.body.innerText || "";
    const shortMatch = bodyText.match(/g\.co\/verify\/[A-Za-z0-9_-]+/);
    if (shortMatch) {
      return "https://" + shortMatch[0];
    }
    const html = document.documentElement.innerHTML;
    const m = html.match(/https:\/\/accounts\.google\.com\/devicephoneverification\/begin\?[^"'\s<>]+/);
    if (m) return m[0].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
    throw new Error("Failed to detect QR code on the current page. Please ensure the QR code image is visible.");
  }

  function extractPageTl() {
    const params = new URLSearchParams(location.search);
    if (params.get("TL")) return params.get("TL");
    if (params.get("tl")) return params.get("tl");
    const cont = params.get("continue");
    if (cont) {
      try {
        const contUrl = new URL(cont, location.origin);
        if (contUrl.searchParams.get("TL")) return contUrl.searchParams.get("TL");
        if (contUrl.searchParams.get("tl")) return contUrl.searchParams.get("tl");
      } catch (_) {}
    }
    const htmlMatch = document.documentElement.innerHTML.match(/ADG-[A-Za-z0-9_-]+/);
    return htmlMatch ? htmlMatch[0] : null;
  }

  async function runDowngrade() {
    try {
      btn.disabled = true;
      btn.textContent = "Detecting QR code...";
      const qrUrl = await extractQrUrlFromPage();
      const pageTl = extractPageTl();
      statusEl.textContent = "QR detected. Injecting fallback state [3,null,4]...";

      if (!chrome?.runtime?.sendMessage) {
        throw new Error("Extension was reloaded. Please refresh this page (F5) and try again.");
      }
      const res = await chrome.runtime.sendMessage({ action: "downgradeQr", qrUrl, pageTl });
      if (!res || !res.ok) {
        throw new Error(res ? res.error : "Background request failed");
      }
      if (!/\[\s*3\s*,\s*null\s*,\s*4\s*\]/.test(res.ydResp)) {
        statusEl.textContent = "⚠️ Server response: " + res.ydResp.slice(0, 100);
        btn.disabled = false;
        btn.textContent = "Retry Downgrade";
        return;
      }

      statusEl.textContent = "✅ Fallback [3,null,4] injected successfully! Redirecting...";
      const params = new URLSearchParams(location.search);
      const cont = params.get("continue");
      if (!cont) throw new Error("Current URL does not have a continue parameter. Please start from Cloud Shell Verify.");

      const targetUrl = new URL(cont, location.origin);
      if (!targetUrl.searchParams.has("TL") && pageTl) {
        targetUrl.searchParams.set("TL", pageTl);
      }
      if (targetUrl.searchParams.has("authuser") && targetUrl.searchParams.get("authuser") === "") {
        targetUrl.searchParams.set("authuser", "0");
      }
      targetUrl.searchParams.set("idv_xdevice", "1");
      location.replace(targetUrl.toString());
    } catch (e) {
      statusEl.textContent = "❌ " + e.message;
      btn.disabled = false;
      btn.textContent = "Retry Downgrade";
    }
  }
})();
