import { build } from "esbuild";

// Bundle the server + all dependencies into a single self-contained ESM file,
// so the plugin's .mcp.json can run `node dist/index.js` with no node_modules
// present at runtime. The banner restores `require` for any bundled dependency
// that uses CommonJS internally.
await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/index.js",
  // esbuild preserves the entry file's own shebang (src/index.ts) on line 1,
  // so the banner must NOT add a second one. It only restores `require` for
  // any bundled CommonJS dependency.
  banner: {
    js: [
      "import { createRequire as __cr } from 'module';",
      "const require = __cr(import.meta.url);",
    ].join("\n"),
  },
  logLevel: "info",
});
