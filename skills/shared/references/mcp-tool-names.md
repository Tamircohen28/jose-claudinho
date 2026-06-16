# MCP tool names — multi-host

The `fantasy-wc` MCP server exposes the same logical tools on every host. The **host**
prefixes tool names differently in the tool picker.

## Server key

In [`.mcp.json`](../../../.mcp.json) the server is registered as **`fantasy-wc`**.

## Prefix by host

| Host | Prefix pattern | Example (`sport5_get_my_team`) |
|------|----------------|--------------------------------|
| Claude Code plugin | `mcp__plugin_jose-claudinho_fantasy-wc__` | `mcp__plugin_jose-claudinho_fantasy-wc__sport5_get_my_team` |
| Cursor plugin / `.cursor/mcp.json` | `mcp__fantasy-wc__` | `mcp__fantasy-wc__sport5_get_my_team` |
| Codex plugin | `mcp__fantasy-wc__` | `mcp__fantasy-wc__sport5_get_my_team` |

## How skills should call tools

1. Use the **logical tool name** in procedures (e.g. `team_round_utilization`,
   `sport5_get_my_leagues`).
2. In the MCP tool picker, match by suffix if the full prefixed name differs by host.
3. Do not invent data when a tool is missing — follow `error-handling.md`.

## All tools (logical names)

`sport5_list_players` · `sport5_get_my_team` · `sport5_get_user_team` ·
`sport5_get_my_leagues` · `sport5_get_league_table` · `worldcup_fixtures` ·
`snapshot_top_teams` · `analyze_ownership` · `list_snapshots` · `get_game_rules` ·
`team_round_utilization` · `league_round_utilization` · `league_watchlist`
