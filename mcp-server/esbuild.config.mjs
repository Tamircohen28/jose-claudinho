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
  // Inline any imported .wasm (e.g. the HiGHS solver) as a Uint8Array so the
  // bundle stays a single self-contained file with no sidecar binaries.
  loader: { ".wasm": "binary" },
  // esbuild preserves the entry file's own shebang (src/index.ts) on line 1,
  // so the banner must NOT add a second one. It restores `require` for any
  // bundled CommonJS dependency, and defines __filename/__dirname (absent in
  // ESM) which the bundled Emscripten HiGHS loader references at init time.
  banner: {
    js: [
      "import { createRequire as __cr } from 'module';",
      "import { fileURLToPath as __ftu } from 'url';",
      "import { dirname as __dn } from 'path';",
      "const require = __cr(import.meta.url);",
      "const __filename = __ftu(import.meta.url);",
      "const __dirname = __dn(__filename);",
    ].join("\n"),
  },
  logLevel: "info",
});
