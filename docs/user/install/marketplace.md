# Publishing to marketplaces (optional)

José Claudinho installs locally via `make plugin`, `make cursor-plugin`, or
`make codex-plugin`. To distribute beyond local install:

## Codex

Users install from GitHub:

```bash
codex plugin marketplace add TamirCohen28/jose-claudinho
```

Catalog: [`.agents/plugins/marketplace.json`](../../.agents/plugins/marketplace.json).

Official Codex Plugin Directory self-serve publishing is coming soon per OpenAI docs.

## Cursor

After local testing (`make cursor-plugin`):

1. Ensure [`.cursor-plugin/plugin.json`](../../.cursor-plugin/plugin.json) and README are complete.
2. Submit the public repo at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).
3. Expect manual security review; plugin must be open source.

## Claude Code

This repo is cataloged via the **tamirs-plugins** marketplace (external to this repo).
Use `make plugin` for local development.

## Community (unreviewed)

[cursor.directory](https://cursor.directory) lists community MCP servers and skills;
not a substitute for official marketplace review.
