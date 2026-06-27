# Multi-host and multi-agent

Run José Claudinho in **Claude Code, Cursor, and Codex at the same time** on one machine
without MCP sessions interfering with each other.

## How MCP isolation works

Each agent session spawns its **own** `node mcp-server/dist/index.js` child process. The
server speaks MCP over **stdio** (stdin/stdout) — there is no shared TCP port, no singleton
daemon, and no cross-process MCP channel.

| Scenario | Interference? |
|----------|----------------|
| Two Cursor chats | None — two independent MCP processes |
| Cursor + Claude Code + Codex | None — each host spawns separately |
| Different tool name prefixes per host | Cosmetic only — same binary and tools |

On startup the server logs cookie status and the data directory to **stderr** (never stdout):

```text
[fantasy-wc] MCP server ready. Cookie present. Data dir: /Users/you/.fantasy-wc-mcp/data
```

In Cursor, open **Output → MCP Logs** if a server fails to start.

## What is shared (by design)

Three things overlap across hosts — none of them break MCP correctness:

### 1. Local snapshot storage

Default directory: `~/.fantasy-wc-mcp/data/` (override with `FWC_DATA_DIR`).

| File | Behaviour with parallel agents |
|------|------------------------------|
| `snapshot-r{N}-{timestamp}.json` | Safe — unique filenames, append-only |
| `injury-cache.json`, `lineup-cache.json` | Benign — concurrent refreshes may duplicate API work; last write wins |

Sharing the default data dir is **intentional**: a snapshot taken in Cursor is visible to
`analyze_ownership` in Claude Code.

### 2. Sport5 API and your cookie

All instances use the same `SPORT5_COOKIE`. That is fine — the plugin is **read-only** and
never mutates your team.

The practical limit is **API load**: three agents running `snapshot_top_teams` or
`league_round_utilization` at once triples parallel Sport5 requests. Stagger heavy commands
or run bulk fetches from one agent.

### 3. Environment variables

Hosts read MCP env when they **start** (or when the MCP child is spawned). If you update
`.env` or `export SPORT5_COOKIE=...` in a terminal, **reload or restart** hosts that were
already running so their MCP servers pick up the new value.

## Recommended setup (one user, shared learning)

Use a **single cookie source** that every host can read:

**Option A — repo-root `.env` (gitignored)**

The MCP server calls `loadWorkspaceEnv()` at startup and fills unset vars from `.env` in
the plugin/repo root:

```bash
# .env — never commit this file
SPORT5_COOKIE=<Cookie header from DevTools>
# API_FOOTBALL_KEY=<optional, for injury feed>
```

Works well when Claude Code, Cursor, and Codex all point at the same clone. Restart each
host after editing `.env`.

**Option B — shell profile**

```bash
export SPORT5_COOKIE='<Cookie header from DevTools>'
```

Launch hosts from that shell, or add the line to `~/.zshrc` / `~/.bashrc`.

Leave `FWC_DATA_DIR` **unset** so all hosts share `~/.fantasy-wc-mcp/data/`.

## Isolating data per host (optional)

Use a different `FWC_DATA_DIR` when you want separate snapshot history — for example a
second Sport5 account, or an experimental worktree:

| Host | Example |
|------|---------|
| Claude Code | `export FWC_DATA_DIR="$HOME/.fantasy-wc-mcp/claude-data"` before launch |
| Cursor (workspace) | Add to [`.cursor/mcp.json`](../../.cursor/mcp.json) `env`: `"FWC_DATA_DIR": "${env:FWC_DATA_DIR}"` and export in the shell, or set a fixed path |
| Codex | `export FWC_DATA_DIR="$HOME/.fantasy-wc-mcp/codex-data"` before launch |

Pair isolated data dirs with a **separate `.env`** (or cookie) if the Sport5 accounts differ.

## Per-host install notes

- [Claude Code](install/claude-code.md#multi-host-on-this-machine)
- [Cursor](install/cursor.md#multi-host-on-this-machine)
- [Codex](install/codex.md#multi-host-on-this-machine)

Tool prefixes differ by host; logical tool names are the same. See
[mcp-tool-names.md](../../skills/shared/references/mcp-tool-names.md).

## Troubleshooting multi-host issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Private tools work in Cursor but not Claude Code | Stale env in one host | Restart the failing host after updating cookie |
| Duplicate snapshots in data dir | Parallel `/snapshot-league` runs | Harmless — stagger heavy fetches |
| `analyze_ownership` empty in a new host | Isolated `FWC_DATA_DIR` or no snapshots yet | Run `/snapshot-league` or point at the shared data dir |
| Sport5 errors under heavy parallel use | API load from multiple agents | Run league-wide tools from one agent at a time |

More: [troubleshooting.md](troubleshooting.md).
