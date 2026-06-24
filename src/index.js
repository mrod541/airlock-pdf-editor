/**
 * Vault — Cloudflare Worker
 *
 * This Worker does exactly two things:
 *   1. Serves the static editor files from ./public (via the [assets] binding).
 *   2. Stamps strict security headers on every response — most importantly the
 *      header-level Content-Security-Policy with `connect-src blob:`, which
 *      blocks every network destination (no fetch/XHR/WebSocket/beacon can reach
 *      any http(s):// or ws:// server) while permitting the page to read its own
 *      inlined data via blob: URLs. This is the heart of the privacy guarantee.
 *
 * INVARIANT: This Worker must never receive, inspect, store, log, or relay a
 * user's PDF. By design it can't — the PDF is processed entirely in the browser
 * tab and never leaves the device. Do not add request-body reading, fetch() to
 * third parties, logging of user content, or anything that weakens the CSP.
 */

// The single source of truth for the security headers applied to every response.
// `connect-src blob:` blocks every network destination (fetch / XHR / WebSocket /
// sendBeacon to any http(s):// or ws:// server); the only thing it permits is
// reading the page's own in-memory data via blob: URLs (the inlined libraries).
// Keep this in sync with the <meta http-equiv="Content-Security-Policy"> tag
// that is inlined into each editor HTML file.
const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'none'",
    // Inline scripts/styles are required because everything is inlined into one
    // HTML file. 'wasm-unsafe-eval' permits WebAssembly compilation (needed by
    // the OCR engine) but NOT general eval(). No off-device sources are permitted.
    // This must stay byte-identical to the <meta> CSP inlined in each editor.
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // The core of the guarantee: no network egress of any kind.
    "connect-src blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), interest-cohort=()",
};

export default {
  async fetch(request, env) {
    // Serve the requested static asset from the [assets] binding.
    const response = await env.ASSETS.fetch(request);

    // Clone so we can attach headers (asset responses are immutable).
    const stamped = new Response(response.body, response);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      stamped.headers.set(name, value);
    }
    return stamped;
  },
};
