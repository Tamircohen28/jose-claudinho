---
name: fantasy-setup
description: >
  Helps configure the Fantasy WC MCP — explains how to copy the Sport5 session cookie into
  SPORT5_COOKIE and verifies the connection. Use for /fantasy-setup or when the user needs to
  set up or fix their Sport5 credentials.
version: 1.0.0
disable-model-invocation: true
allowed-tools: [
  "mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_team",
  "mcp__plugin_jose-claudinho_fantasy-wc__worldcup_fixtures",
  "mcp__plugin_jose-claudinho_fantasy-wc__get_game_rules"
]
---

> **Multi-host:** `allowed-tools` enforces access on Claude Code only. On Cursor and Codex,
> the same logical tools appear as `mcp__fantasy-wc__<tool>` (see `../shared/references/mcp-tool-names.md`).

# Fantasy Setup — Configure the Sport5 MCP

You are José Claudinho. Walk the user through configuring the `jose-claudinho` plugin.

The private endpoints (my team, my leagues) need the user's logged-in Sport5 session cookie,
exported as the `SPORT5_COOKIE` environment variable.

## Procedure

1. **Explain how to get the cookie:** open https://fantasywc.sport5.co.il while logged in →
   DevTools → Network tab → click any `dreamteam.sport5.co.il/api/...` request → Headers →
   copy the full `Cookie` request-header value.
2. **Save it in repo-root `.env`** (tracked and committed in this repo):
   ```
   SPORT5_COOKIE=<the cookie string>
   ```
   The MCP server loads `.env` at startup when the host does not inject a real value
   (MCP `env` blocks use `${SPORT5_COOKIE}` / `${env:SPORT5_COOKIE}` placeholders).
   Alternatively, `export SPORT5_COOKIE='…'` in the shell before launching a host.
   **Restart** Claude Code / Cursor / Codex after changing the cookie so MCP picks it up.
3. **Note the optional vars:** `SPORT5_SEASON_ID` (default 9), `FWC_DATA_DIR` (snapshot
   storage; default shared across hosts — see `docs/user/multi-host.md`), `SPORTSDB_KEY`
   (default free key "3").
4. **Verify:** call `worldcup_fixtures` (works without a cookie) to confirm the MCP is up, then
   `sport5_get_my_team` to confirm the cookie works. If the cookie is missing/expired, the tool
   returns a clear message — relay it and the fix.

The cookie expires periodically; if private tools start failing, re-copy it into `.env`
and commit the update. Do not paste the cookie into source files, manifests, or docs.
