# build/ — generator source (placeholder)

This directory is where the build source lives:

```
build/
├── build.py          assembles template + css + js + assets -> public/pdf-editor-*.html
├── template.html
├── app.css
├── app.js
└── assets/           inlined libraries (pdf.js, pdf-lib) and OCR assets
                      (tesseract worker, WASM core, eng.traineddata)
```

**It is not populated in this repo yet.** Only the generated editor HTML files
in `public/` are present. Until the source is added here:

- The "Rebuild from source" instructions can't actually be run.
- The flagged OCR builds can't be fixed reproducibly. The fix for
  `pdf-editor-ocr-full.html` is small and specific: inline the tesseract.js
  **WASM core** and set `corePath` to it (the model and worker are already
  inlined). See `docs/AUDIT_NOTE.md`.

When you add the source, keep the build deterministic so output hashes match
`public/SHA256SUMS.txt`, and remember: nothing may be fetched at runtime
(invariant 3). Build-time downloads are fine; runtime ones are not.
