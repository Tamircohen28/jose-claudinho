/** Thin authenticated client for the Sport5 Fantasy World Cup API. */

const BASE = "https://dreamteam.sport5.co.il/api";

export function seasonId(): string {
  return process.env.SPORT5_SEASON_ID || "9";
}

export function hasCookie(): boolean {
  return !!(process.env.SPORT5_COOKIE && process.env.SPORT5_COOKIE.trim());
}

export class Sport5Error extends Error {}

/** Throw an actionable error when a private endpoint is hit without a cookie. */
export function requireCookie(what: string): void {
  if (!hasCookie()) {
    throw new Sport5Error(
      `${what} needs your logged-in Sport5 session, but SPORT5_COOKIE is not set. ` +
        `Open https://fantasywc.sport5.co.il while logged in, copy the request Cookie header ` +
        `from DevTools → Network, and export it as SPORT5_COOKIE before starting Claude Code.`
    );
  }
}

/**
 * GET a Sport5 endpoint. `seasonId` is added automatically. Params whose value
 * is `undefined` are skipped; `null` is sent literally as the string "null"
 * (the league endpoint expects `leagueId=null` for the general league).
 */
export async function s5get(
  path: string,
  params: Record<string, string | number | boolean | null | undefined> = {}
): Promise<any> {
  const url = new URL(BASE + path);
  url.searchParams.set("seasonId", seasonId());
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, v === null ? "null" : String(v));
  }

  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9,he;q=0.8",
    referer: "https://fantasywc.sport5.co.il/",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  };
  if (hasCookie()) headers.cookie = process.env.SPORT5_COOKIE!.trim();

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (e: any) {
    throw new Sport5Error(`Network error calling ${path}: ${e?.message || e}`);
  }
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? " (your SPORT5_COOKIE may be missing or expired — re-copy it from the browser)"
        : "";
    throw new Sport5Error(`Sport5 API ${path} returned ${res.status} ${res.statusText}${hint}`);
  }
  const json = await res.json();
  if (json && json.result === false) {
    throw new Sport5Error(`Sport5 API ${path} error: ${json.error ?? "unknown error"}`);
  }
  return json.data;
}

/** Run an async mapper over items with bounded concurrency. */
export async function pool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
