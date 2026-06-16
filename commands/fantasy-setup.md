---
name: fantasy-setup
description: Help configure the Fantasy WC MCP — paste your Sport5 session cookie and verify the connection.
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_team",
  "mcp__plugin_jose-claudinho_fantasy-wc__worldcup_fixtures",
  "mcp__plugin_jose-claudinho_fantasy-wc__get_game_rules"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>`.

Walk me through configuring the `jose-claudinho` plugin.

The private endpoints (my team, my leagues) need my logged-in Sport5 session
cookie, exported as the `SPORT5_COOKIE` environment variable.

1. Explain how to get it: open https://fantasywc.sport5.co.il while logged in →
   DevTools → Network tab → click any `dreamteam.sport5.co.il/api/...` request →
   Headers → copy the full `Cookie` request-header value.
2. Tell me to export it before launching Claude Code, e.g. in my shell profile:
   `export SPORT5_COOKIE='<the cookie string>'`
   (then restart Claude Code so the MCP server picks it up).
3. Note the optional vars: `SPORT5_SEASON_ID` (default 9),
   `FWC_DATA_DIR` (snapshot storage), `SPORTSDB_KEY` (default free key "3").
4. Verify: call `worldcup_fixtures` (works without a cookie) to confirm the MCP is
   up, then `sport5_get_my_team` to confirm the cookie works. If the cookie is
   missing/expired, the tool returns a clear message — relay it and the fix.

The cookie expires periodically; if private tools start failing, re-copy it.
