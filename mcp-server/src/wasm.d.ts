// esbuild's `binary` loader turns a `.wasm` import into a Uint8Array default export.
declare module "*.wasm" {
  const data: Uint8Array;
  export default data;
}

// The `highs` package exports its WASM binary under the "highs/runtime" alias
// (see its package.json exports map). esbuild resolves it to build/highs.wasm and
// applies the binary loader, yielding a Uint8Array.
declare module "highs/runtime" {
  const data: Uint8Array;
  export default data;
}
