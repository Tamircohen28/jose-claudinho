/**
 * Environment-variable access that is robust to MCP config placeholders.
 *
 * When `.mcp.json` declares `"SPORTSDB_KEY": "${SPORTSDB_KEY}"` and the host has no
 * such variable set, the value can arrive as the literal, unsubstituted string
 * `"${SPORTSDB_KEY}"`. Treating that as a real value would override our baked-in
 * defaults with garbage. These helpers treat an empty string OR an unexpanded
 * `${...}` placeholder as "not set", so the defaults always win with zero config.
 */

const PLACEHOLDER = /^\s*\$\{[^}]*\}\s*$/;

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
