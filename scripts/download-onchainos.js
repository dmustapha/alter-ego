#!/usr/bin/env node
/**
 * Downloads the onchainos Linux binary and pre-authenticates during Vercel build.
 *
 * The Linux binary has a bug with angle brackets in HTTP headers (InvalidHeaderValue),
 * so we authenticate during build and bundle the session for runtime use.
 *
 * On local dev: skips (uses system binary from PATH).
 * On Vercel: downloads binary, logs in with API keys, bundles session to public/bin/.onchainos/
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const VERSION = "v4.2.4";
const BINARY = "onchainos";
const PUBLIC_BIN = path.join(__dirname, "..", "public", "bin");
const ROOT_BIN = path.join(__dirname, "..", "bin");
const DEST = path.join(PUBLIC_BIN, BINARY);

// On macOS (local dev), skip — use system binary
if (process.platform === "darwin") {
  console.log("[onchainos] Local dev detected — using system binary from PATH.");
  process.exit(0);
}

// Detect platform
const platform = process.arch === "arm64"
  ? "aarch64-unknown-linux-gnu"
  : "x86_64-unknown-linux-gnu";
const url = `https://github.com/okx/onchainos-skills/releases/download/${VERSION}/onchainos-${platform}`;

// ── Step 1: Download binary ──────────────────────────────────
if (!fs.existsSync(DEST)) {
  console.log(`[onchainos] Downloading ${url}...`);
  fs.mkdirSync(PUBLIC_BIN, { recursive: true });
  execSync(`curl -sL "${url}" -o "${DEST}"`, { stdio: "inherit" });
  fs.chmodSync(DEST, 0o755);
  console.log(`[onchainos] Downloaded (${fs.statSync(DEST).size} bytes)`);
} else {
  console.log(`[onchainos] Binary already exists, skipping download.`);
}

// Copy to root bin/ for function bundle inclusion
fs.mkdirSync(ROOT_BIN, { recursive: true });
fs.copyFileSync(DEST, path.join(ROOT_BIN, BINARY));
fs.chmodSync(path.join(ROOT_BIN, BINARY), 0o755);

// ── Step 2: Pre-authenticate ─────────────────────────────────
if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY) {
  const sessionDir = path.join(PUBLIC_BIN, ".onchainos");
  const homeEnv = { ...process.env, ONCHAINOS_HOME: sessionDir, HOME: "/tmp" };

  console.log("[onchainos] Attempting API key login during build...");
  try {
    fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });

    // Login with API key
    execSync(`${DEST} wallet login --force`, {
      env: homeEnv,
      stdio: "pipe",
      timeout: 30000,
    });

    // Verify login worked
    const status = execSync(`${DEST} wallet status`, {
      env: homeEnv,
      encoding: "utf-8",
      timeout: 15000,
    });
    const parsed = JSON.parse(status);
    if (parsed?.data?.loggedIn) {
      console.log("[onchainos] Build-time login SUCCESS — session bundled.");

      // Copy session to root bin/ too
      const rootSessionDir = path.join(ROOT_BIN, ".onchainos");
      fs.cpSync(sessionDir, rootSessionDir, { recursive: true });
    } else {
      console.warn("[onchainos] Build-time login returned but not logged in:", status.slice(0, 200));
    }
  } catch (e) {
    console.error("[onchainos] Build-time login failed:", e.message);
    console.error("[onchainos] The app will attempt runtime login (may fail with special chars in passphrase).");
  }
} else {
  console.warn("[onchainos] No API keys in build env — skipping pre-auth.");
}

console.log("[onchainos] Prebuild complete.");
