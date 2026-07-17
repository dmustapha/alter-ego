import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Diagnostic endpoint — checks onchainos binary status on Vercel.
 * GET /api/diag — returns binary location, env vars presence, test run result.
 */
export async function GET() {
  const results: Record<string, any> = {
    platform: process.platform,
    cwd: process.cwd(),
    env: {
      OKX_API_KEY: process.env.OKX_API_KEY ? "***present***" : "MISSING",
      OKX_SECRET_KEY: process.env.OKX_SECRET_KEY ? "***present***" : "MISSING",
      OKX_PASSPHRASE: process.env.OKX_PASSPHRASE ? "***present***" : "MISSING",
    },
    binary: {},
  };

  // Check binary locations
  const locations = [
    "/tmp/onchainos",
    path.join(process.cwd(), "bin", "onchainos"),
    path.join(process.cwd(), "public", "bin", "onchainos"),
  ];

  for (const loc of locations) {
    const exists = fs.existsSync(loc);
    results.binary[loc] = exists
      ? `exists (${fs.statSync(loc).size} bytes, mode ${fs.statSync(loc).mode.toString(8)})`
      : "not found";
  }

  // Try running the binary
  const tmpBin = "/tmp/onchainos";
  if (fs.existsSync(tmpBin) || fs.existsSync(path.join(process.cwd(), "bin", "onchainos"))) {
    // Copy to /tmp if needed
    const src = fs.existsSync(tmpBin)
      ? tmpBin
      : path.join(process.cwd(), "bin", "onchainos");
    if (src !== tmpBin) {
      try {
        fs.copyFileSync(src, tmpBin);
        fs.chmodSync(tmpBin, 0o755);
      } catch (e: any) {
        results.copyError = e.message;
      }
    }

    if (fs.existsSync(tmpBin)) {
      try {
        const r = spawnSync(tmpBin, ["--version"], {
          encoding: "utf-8",
          timeout: 10000,
          env: {
            ...process.env,
            ONCHAINOS_HOME: "/tmp/.onchainos",
          },
        });
        results.testRun = {
          status: r.status,
          stdout: r.stdout?.trim(),
          stderr: r.stderr?.trim()?.slice(0, 500),
          error: r.error?.message,
        };
      } catch (e: any) {
        results.testRunError = e.message;
      }
    }
  }

  // Test wallet status (auth check)
  if (fs.existsSync(tmpBin)) {
    try {
      const r = spawnSync(tmpBin, ["wallet", "status"], {
        encoding: "utf-8",
        timeout: 15000,
        env: {
          ...process.env,
          ONCHAINOS_HOME: "/tmp/.onchainos",
        },
      });
      results.walletStatus = {
        status: r.status,
        stdout: r.stdout?.trim()?.slice(0, 500),
        stderr: r.stderr?.trim()?.slice(0, 500),
        error: r.error?.message,
      };
    } catch (e: any) {
      results.walletStatusError = e.message;
    }
  }

  // List project root files
  try {
    results.rootFiles = fs.readdirSync(process.cwd()).filter((f) => f.startsWith("bin") || f === "public");
    if (fs.existsSync(path.join(process.cwd(), "bin"))) {
      results.binDir = fs.readdirSync(path.join(process.cwd(), "bin"));
    }
  } catch {}

  return NextResponse.json(results);
}
