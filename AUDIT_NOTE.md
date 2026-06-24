# Audit Note

This file exists so the privacy claims are checkable, not just asserted. It
records (a) the per-build compliance status and (b) an explanation of the
off-device-looking strings in the editor files, so an auditor can confirm none
of them cause runtime network egress.

## Per-build status

### `pdf-editor-lean.html` — ✅ verified self-contained

- `connect-src 'none'` present as a `<meta>` tag.
- No CDN URLs. No runtime asset fetching.
- The strings `langPath`, `workerPath`, `traineddata` appear only as inert
  identifiers inside the bundled pdf.js; lean has no OCR machinery and there is
  no code path that fetches them.
- Runs fully offline.

### `pdf-editor-ocr-fast.html` — ⚠️ FLAGGED: not compliant (do not advertise as working)

**Finding.** The OCR engine (tesseract.js) is configured with its stock CDN
paths, so at first use it attempts to fetch three things from the public
internet:

- the Tesseract **worker** script — `cdn.jsdelivr.net/npm/tesseract.js@v.../dist/worker.min.js`
- the Tesseract **WASM core** — `cdn.jsdelivr.net/npm/tesseract.js-core@v...`
- the **language model** — `cdn.jsdelivr.net/npm/@tesseract.js-data/.../*.traineddata`

The file is ~5.8 MB and contains **no** large inlined base64 blob for the core or
the language model, and there is **no** app-level override of `corePath` /
`langPath` / `workerPath` (or `workerBlobURL`) to local/blob sources. The only
asset paths in the file point at jsdelivr.

**Why this violates the invariants.**
- Breaks **invariant 3** (everything inlined; nothing fetched at runtime).
- Breaks **invariant 7** (honesty over polish): the docs describe the OCR builds
  as shipping "tesseract.js + the language model" inlined. For this file that is
  not true.

**Does the privacy guarantee still hold?** Yes, narrowly. Because the page ships
`connect-src 'none'`, the browser *blocks* those jsdelivr fetches. No user
content leaks. But the consequence is that **OCR is silently broken**, not
"working and private." Shipping it as a functional OCR build would be the exact
kind of reassuring-label-over-a-gap that invariant 7 forbids.

**Remediation (the compliant pattern).** Rebuild the file with the OCR assets
inlined and the paths overridden so `createWorker` never reaches off-device:

1. At *build* time (egress is allowed at build time, not runtime), fetch the
   matching `tesseract.js` worker, `tesseract.js-core` WASM, and the
   `.traineddata` model.
2. Embed them in the HTML (base64 / blob URLs).
3. Set `workerBlobURL`, `corePath`, and `langPath` to those inlined blobs.
4. Keep `connect-src 'none'` unchanged.
5. Regenerate `public/SHA256SUMS.txt`.

Until that is done, the build stays flagged in the README and should not be
relied on. Adding the `build/` source (currently absent from the repo) is a
prerequisite for doing this reproducibly.

### `pdf-editor-ocr-full.html` — not yet in repo.

## External-looking strings, explained

The editor files contain URLs that look like network endpoints but are inert.
For completeness:

- **XML namespace / schema URIs** — `http://www.w3.org/...`, `http://ns.adobe.com/...`,
  `http://www.xfa.org/...`. These are XML namespace identifiers used by the PDF/XMP
  parsing in pdf.js. They are string labels, never fetched.
- **License header URL** — `http://www.apache.org/licenses/LICENSE-2.0` in
  bundled library license comments. Inert text.
- **Source-repo reference** — `https://github.com/Hopding/pdf-lib` in a pdf-lib
  comment/string. Inert text.
- **Self-test URLs** — `https://example.com` / `https://example.com/collect?leak=1`
  power the Verify-privacy panel's deliberate "try to phone home" button, which
  exists precisely to demonstrate the browser blocking the request. This is the
  one allowed network *attempt* (invariant 4), and it is meant to fail.
- **Template-literal fragments** — `http://${...}` inside library code are
  string-building fragments, not live endpoints.
- **jsdelivr CDN URLs** (ocr-fast only) — these are NOT inert; see the flagged
  finding above. They are the reason that build is non-compliant.

## How to reproduce this audit

```bash
# List off-device-looking URLs in a build:
grep -oiE "https?://[^\"'\`) ]+" public/pdf-editor-lean.html | sort -u

# Confirm the CSP meta tag is present:
grep -o "connect-src '\''none'\''" public/pdf-editor-lean.html

# Confirm a build has no runtime CDN asset paths (lean should print nothing):
grep -oiE "cdn\.[a-z]+|corePath|langPath|workerPath" public/pdf-editor-lean.html

# Verify published hashes:
cd public && sha256sum -c SHA256SUMS.txt
```
