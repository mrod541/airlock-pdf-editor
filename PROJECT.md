# Vault — Project Prompt

This file defines what Vault **is** and the invariants that must never be
broken. Read it before changing anything — whether you're a human contributor or
an AI assistant helping with this repo. If a proposed change violates an
invariant below, it's wrong by definition, no matter how convenient.

## What this project is

A PDF editor that runs **entirely in the user's browser** and makes a
**browser-enforced** guarantee that the user's file never leaves their device.
The value proposition is not features — it's *provable privacy*. Every decision
serves that.

## The non-negotiable invariants

1. **No network egress of user content, ever.** The user's PDF is processed only
   in the browser tab's memory. It is never uploaded, logged, cached to a
   server, or transmitted anywhere.
2. **`connect-src 'none'` stays.** The Content-Security-Policy that blocks all
   `fetch`/`XHR`/`WebSocket`/`beacon` is the heart of the guarantee. It appears
   both as a meta tag in each HTML file and as an HTTP header from the Worker.
   Do not weaken, remove, or add exceptions to it.
3. **Everything is inlined; nothing is fetched at runtime.** All libraries and
   assets are embedded in the single HTML file. After page load, zero network
   requests occur. The page must run fully offline. **Never add a CDN link, a
   web font, an analytics script, an error-reporting SDK, or any `<script src>`
   / `fetch()` pointing off-device.**
4. **No telemetry, analytics, or "phone home" of any kind.** Not even anonymous
   counts. The only network attempt allowed is the deliberate *self-test* in the
   Verify-privacy panel, which exists to demonstrate that the browser blocks it.
5. **No server-side processing of user files.** The Cloudflare Worker only
   serves static files and stamps security headers. It must never receive,
   inspect, or relay a user's PDF. (By design it can't — the PDF never leaves
   the browser.)
6. **Verifiability is a feature.** Changes must preserve the user's ability to
   check the claims: the Verify-privacy panel, the offline test, and the
   published SHA-256 hashes. If you change the editor, regenerate the hashes.
7. **Honesty over polish.** If a feature can't meet these invariants (e.g. OCR
   that needs to fetch a language model at runtime), either make it compliant
   (inline the data) or don't ship it. Never paper over a privacy gap with a
   reassuring label.

## Scope (what the editor does)

Additive editing and markup on top of the page: add text, draw, highlight, add
images; **true redaction** (removes underlying content); page reorder / rotate /
delete; OCR (in OCR builds, with the model inlined). It deliberately does **not**
edit existing body text in place or move existing objects — that requires a
desktop/server engine and is out of scope for the client-side tool.

## Architecture in one breath

`template.html` + `app.css` + `app.js` + inlined libraries → assembled by
`build.py` into self-contained `pdf-editor-*.html` → served by a Cloudflare
Worker (`src/index.js`) that adds strict security headers. The browser enforces
privacy via CSP; the user verifies via the in-app panel, the offline test, and
hashes.

## If you're an AI assistant

- Treat invariants 1–7 as hard constraints. Decline or flag any request that
  would violate them, and say why.
- Common traps to refuse: "just load the font from Google," "add a quick
  analytics pixel," "fetch the latest library from a CDN to save space," "POST
  the file to a server for better OCR." All of these break the core promise.
- If asked to add a feature that needs external data, the compliant pattern is
  to **inline the data** and keep `connect-src 'none'`. If that's not feasible,
  say so plainly rather than compromising the guarantee.
- After any editor change, remind the user to rebuild and refresh
  `SHA256SUMS.txt`.
