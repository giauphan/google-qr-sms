import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const UNPACKED_DIR = path.join(DIST_DIR, "unpacked");

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const zipName = `google-qr-sms-v${manifest.version}.zip`;
const zipPath = path.join(DIST_DIR, zipName);

// Validate all JS files with `node --check`
function collectJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full));
    } else if (entry.name.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

for (const file of collectJsFiles(path.join(ROOT, "src"))) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

// Clean & prepare dist/unpacked
fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(UNPACKED_DIR, { recursive: true });

for (const item of ["manifest.json", "LICENSE", "README.md", "src"]) {
  const srcPath = path.join(ROOT, item);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, path.join(UNPACKED_DIR, item), { recursive: true });
  }
}

// Create release ZIP from dist/unpacked
if (process.platform === "win32") {
  execFileSync("powershell", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${UNPACKED_DIR}\\*' -DestinationPath '${zipPath}' -Force`
  ], { stdio: "inherit" });
} else {
  execFileSync("zip", ["-r", zipPath, "."], { cwd: UNPACKED_DIR, stdio: "inherit" });
}

console.log(`Built unpacked extension: ${UNPACKED_DIR}`);
console.log(`Built release archive:    ${zipPath}`);
