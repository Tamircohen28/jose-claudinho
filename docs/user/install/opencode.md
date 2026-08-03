# Install — OpenCode

| | |
|---|---|
| **Validated against** | OpenCode **1.18.11** |
| **Minimum supported** | **1.16.2** |
| **Plugin manifest** | none — OpenCode has no plugin format |
| **Repo config** | `opencode.json` (`skills.paths`) |
| **Official docs** | [Skills](https://opencode.ai/docs/skills/) · [MCP servers](https://opencode.ai/docs/mcp-servers/) · [Config schema](https://opencode.ai/config.json) |

Check your version:

```bash
opencode --version
```

> **OpenCode has no plugin marketplace and no plugin manifest.** There is nothing to
> `install` — OpenCode reads skills straight off disk, and MCP servers from its own
> config. So this target is a clone plus two pieces of wiring, and it stays current with
> `git pull` rather than an update command.

## Prerequisites

- OpenCode 1.16.2 or newer (1.18.11 is what this release was validated on)
- Node.js ≥ 18 — the `fantasy-wc` MCP server runs on it
- A Sport5 Fantasy WC 2026 account, for the private team/league reads

## Step 1 — Clone and build

```bash
git clone https://github.com/TamirCohen28/jose-claudinho.git
cd jose-claudinho
make install    # MCP server deps
make bundle     # produces mcp-server/dist/index.js
```

The bundle is committed, so `make bundle` is only needed if you change the server source
— but running it once confirms your Node install works.

## Step 2 — Make the skills visible

Two ways. Pick one.

### Method A — global symlink (skills available in every project)

OpenCode auto-scans `~/.config/opencode/skill/`:

```bash
mkdir -p ~/.config/opencode
ln -s "$PWD/skills" ~/.config/opencode/skill
```

### Method B — per-project via `skills.paths`

If you only want José in one workspace, point at the clone from that project's
`opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "skills": {
    "paths": ["/absolute/path/to/jose-claudinho/skills"]
  }
}
```

This repo ships its own [`opencode.json`](../../../opencode.json) declaring
`"skills": { "paths": ["skills"] }`, so running `opencode` **from inside the clone**
works with no extra setup at all.

## Step 3 — Wire the MCP server

OpenCode does **not** read `.mcp.json`. Declare `fantasy-wc` yourself in
`~/.config/opencode/opencode.json` (global) or a project `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "fantasy-wc": {
      "type": "local",
      "command": ["node", "/absolute/path/to/jose-claudinho/mcp-server/dist/index.js"],
      "enabled": true,
      "environment": {
        "SPORT5_COOKIE": "{env:SPORT5_COOKIE}",
        "API_FOOTBALL_KEY": "{env:API_FOOTBALL_KEY}"
      }
    }
  }
}
```

Shape notes that OpenCode is strict about, and that differ from the other three targets:

- `command` is an **array of strings**, never one string.
- `type` is required (`"local"` for a stdio server).
- Interpolation is `{env:VAR}` — the shell-style `${VAR}` used in `.mcp.json` is **not**
  substituted here.
- Paths must be absolute; `${CLAUDE_PLUGIN_ROOT}` means nothing on this target.

Export the cookie before launching:

```bash
export SPORT5_COOKIE='<Cookie header from DevTools>'
```

Config is read once at startup and is not hot-reloaded — quit and restart OpenCode after
editing it.

## Verify

```bash
opencode debug skill
```

All 11 skills should appear with a `location` under your clone:

```
fantasy-setup · league-next24h-matchups · league-round-report ·
league-round-utilization · league-watchlist · provide-wc-plan · snapshot-league ·
squad-advice · squad-debate · team-round-utilization · transfer-optimizer
```

Then check the MCP server resolved:

```bash
opencode debug config | python3 -c \
  'import json,sys; print(json.load(sys.stdin)["mcp"]["fantasy-wc"]["command"])'
```

You should get the two-element `["node", "/path/to/mcp-server/dist/index.js"]` array.

> Don't pipe the raw `opencode debug config` output anywhere shared. `{env:...}`
> placeholders are resolved before printing, so your `SPORT5_COOKIE` appears in the
> output verbatim.

## Usage differences

Skills are **model-invoked** on OpenCode, not slash commands. Instead of typing
`/squad-advice`, ask for the thing:

> "Give me this round's transfer and captain plan for my team."

OpenCode matches the request against skill descriptions and loads `squad-advice` itself.
The skill bodies are identical across all four targets — only the invocation differs.

MCP tool names are namespaced by the server key you chose (`fantasy-wc`), not by the
Claude Code `mcp__plugin_jose-claudinho_fantasy-wc__<tool>` form. Skill bodies refer to
tools by their bare name (`get_game_rules`, `optimize_squad`), so nothing in the skills
depends on the prefix.

## What does not port

| Feature | OpenCode | Why |
|---------|:---:|-----|
| Skills | ✅ | Read natively from disk |
| MCP server | ⚠️ | Works, but wired by hand — `.mcp.json` is ignored |
| Slash commands | ❌ | Skills are model-invoked; commands would need `.opencode/command/*.md` |
| Marketplace install | ❌ | No plugin marketplace exists |
| One-command update | ❌ | `git pull` (plus `make bundle` after server changes) |

## Update

```bash
cd /path/to/jose-claudinho
git pull
make bundle    # only if mcp-server/ changed
```

Restart OpenCode.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `opencode debug skill` shows none of the 11 skills | The symlink or `skills.paths` entry is wrong. `skills.paths` must point at the directory *containing* the per-skill folders, and paths outside the project must be absolute. |
| `ConfigInvalidError` on startup | Almost always the MCP block: `command` must be an array and `type` is required. Start with `OPENCODE_DISABLE_PROJECT_CONFIG=1 opencode` to get in and fix the file. |
| Skills load but every private tool fails | `SPORT5_COOKIE` is unset or stale. Export it and restart — OpenCode reads the environment at MCP-process spawn. |
| Config edits appear to do nothing | Config is loaded once at startup. Quit and relaunch. |
| Skills from unrelated projects show up | Expected: OpenCode also scans `~/.claude/skills/` and `~/.agents/skills/`. Set `OPENCODE_DISABLE_EXTERNAL_SKILLS=1` to suppress. |

More: [troubleshooting.md](../troubleshooting.md).
