# Audit Note

This file exists so the privacy claims are checkable, not just asserted. It
records (a) the per-build compliance status and (b) an explanation of the
off-device-looking strings in the editor files, so an auditor can confirm which
ones do — and don't — cause runtime network egress.

Audited build hashes are in [`../public/SHA256SUMS.txt`](../public/SHA256SUMS.txt).
If a file's hash doesn't match, this audit doesn't apply to it.

## Summary

| Build | Privacy holds? | OCR actually works offline? | Status |
|-------|----------------|------------------------------|--------|
| `pdf-editor-lean.html` | ✅ yes | n/a (no OCR) | ✅ Fully self-contained |
| `pdf-editor-ocr-full.html` | ✅ yes (CSP blocks egress) | ❌ no — WASM core not inlined | ⚠️ Almost compliant; one gap |
| `pdf-editor-ocr-fast.html` | ✅ yes (CSP blocks egress) | ❌ no — nothing inlined | ⚠️ Not compliant |

"Privacy holds" everywhere because `connect-src 'none'` is present in every
build and blocks any attempted fetch. The OCR builds differ in whether OCR is
genuinely *inlined and working* versus *broken because its assets can't be
fetched*. Per invariant 7, a build whose OCR only "works" by reaching a CDN is
not allowed to be advertised as a working offline OCR build.

## `pdf-editor-lean.html` — ✅ verified self-contained

- `connect-src 'none'` present as a `<meta>` tag.
- No CDN URLs. No runtime asset fetching.
- `langPath` / `workerPath` / `traineddata` appear only as inert identifiers
  inside the bundled pdf.js; lean has no OCR code path that fetches them.
- Runs fully offline. This is the recommended default.

## `pdf-editor-ocr-full.html` — ⚠️ almost compliant, ONE gap (WASM core)

This build is a genuine, careful attempt at compliance and is much closer than
`ocr-fast`. Two of the three OCR assets are correctly inlined:

- **Language model** — `eng.traineddata` (~14.5 MB, gzipped) is embedded in a
  `<script id='tess-eng-data' type='text/plain'>` block, decoded to bytes at
  runtime, exposed as a blob URL, and passed via `langPath` (with `gzip:true`).
- **Worker script** — embedded in `<script id='tess-worker-src'>`, turned into a
  blob URL, and passed via `workerPath`.

**The gap:** the **WebAssembly core is not inlined.** In `runOCR()` the
`Tesseract.createWorker` options set `workerPath` and `langPath` but **never set
`corePath`**. So `corePath` falls through to the tesseract.js default:
`https://cdn.jsdelivr.net/npm/tesseract.js-core@v.../...`. At OCR time the engine
tries to fetch the core (`tesseract-core-simd-lstm.wasm.js` / `.wasm`) from
jsdelivr.

**Consequence:** under `connect-src 'none'` that fetch is **blocked**, so no user
content leaks (privacy holds) — but OCR fails at the "loading tesseract core"
step. It is broken-offline, not working-offline. Advertising it as a
self-contained OCR build would violate invariant 7.

**Remediation (small):**
1. At build time, obtain the matching `tesseract.js-core` build — both the
   `*-lstm.wasm.js` loader and its `.wasm` (SIMD and non-SIMD as desired).
2. Inline it the same way the worker/model are inlined (script block ->
   blob URL), or as a `data:`/blob the loader can reach.
3. In `runOCR()`, set `corePath` to that local/blob location.
4. Keep `connect-src 'none'` unchanged; regenerate `SHA256SUMS.txt`.

After that, this build should OCR fully offline and earn the "self-contained"
label.

## `pdf-editor-ocr-fast.html` — ⚠️ not compliant (nothing inlined)

The OCR engine uses tesseract.js's stock CDN paths for **all three** assets — it
attempts to fetch from the public internet at first use:

- worker — `cdn.jsdelivr.net/npm/tesseract.js@v.../dist/worker.min.js`
- WASM core — `cdn.jsdelivr.net/npm/tesseract.js-core@v...`
- language model — `cdn.jsdelivr.net/npm/@tesseract.js-data/.../*.traineddata`

There is no inlined base64 blob for the core or model and no `corePath`/`langPath`/
`workerPath` override to local sources. Breaks invariant 3 (and invariant 7 if
advertised as working). CSP blocks the fetches, so no data leaks, but OCR does
not function. Same remediation as `ocr-full`, plus inlining the model and worker
that `ocr-full` already inlines.

## External-looking strings, explained

The editor files contain URLs that look like network endpoints. Categorized:

- **XML namespace / schema URIs** — `http://www.w3.org/...`, `http://ns.adobe.com/...`,
  `http://www.xfa.org/...`. XML namespace identifiers used by PDF/XMP parsing in
  pdf.js. String labels, never fetched.
- **License header URL** — `http://www.apache.org/licenses/LICENSE-2.0` in bundled
  license comments. Inert text.
- **Source-repo reference** — `https://github.com/Hopding/pdf-lib`. Inert text.
- **Self-test URLs** — `https://example.com` / `.../collect?leak=1` power the
  Verify-privacy panel's deliberate "try to phone home" button, which exists to
  demonstrate the browser blocking the request. This is the one allowed network
  *attempt* (invariant 4), meant to fail.
- **Template-literal fragments** — `http://${...}` inside library code; string
  builders, not live endpoints.
- **jsdelivr CDN URLs** — these are NOT inert. They are the OCR-asset fetches
  described above: fully active in `ocr-fast`, and the WASM-core fetch in
  `ocr-full`. They are the reason those builds are flagged.

## How to reproduce this audit

```bash
# Off-device-looking URLs in a build:
grep -oiE "https?://[^\"'\`) ]+" public/pdf-editor-lean.html | sort -u

# CSP meta tag present?
grep -o "connect-src 'none'" public/pdf-editor-lean.html

# Runtime CDN asset paths? (lean prints nothing)
grep -oiE "cdn\.[a-z]+|corePath|langPath|workerPath" public/pdf-editor-ocr-full.html

# Is the WASM core inlined? (ocr-full: model+worker yes, core no)
grep -oiE "tess-eng-data|tess-worker-src|tess-core" public/pdf-editor-ocr-full.html

# Verify published hashes:
cd public && sha256sum -c SHA256SUMS.txt
```
