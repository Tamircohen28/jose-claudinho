/**
 * Environment-variable access that is robust to MCP config placeholders.
 *
 * When `.mcp.json` declares `"SPORTSDB_KEY": "${SPORTSDB_KEY}"` and the host has no
 * such variable set, the value can arrive as the literal, unsubstituted string
 * `"${SPORTSDB_KEY}"`. Treating that as a real value would override our baked-in
 * defaults with garbage. These helpers treat an empty string OR an unexpanded
 * `${...}` placeholder as "not set", so the defaults always win with zero config.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER = /^\s*\$\{[^}]*\}\s*$/;

/** Load repo-root `.env` when the host did not inject vars (e.g. Cursor `${env:…}`). */
export function loadWorkspaceEnv(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
    resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!key) continue;
      const current = process.env[key];
      if (current != null && current.trim() !== "" && !PLACEHOLDER.test(current)) continue;
      process.env[key] = value;
    }
    return;
  }
}

/** Read an env var, treating empty/placeholder values as unset. Returns undefined if so. */
export function envOpt(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const v = raw.trim();
  if (v === "" || PLACEHOLDER.test(v)) return undefined;
  return v;
}

/** Read an env var with a fallback, treating empty/placeholder values as unset. */
export function envOr(name: string, fallback: string): string {
  return envOpt(name) ?? fallback;
}
