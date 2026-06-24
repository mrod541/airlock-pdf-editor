/**
 * Vault — Cloudflare Worker
 *
 * This Worker does exactly two things:
 *   1. Serves the static editor files from ./public (via the [assets] binding).
 *   2. Stamps strict security headers on every response — most importantly the
 *      header-level Content-Security-Policy with `connect-src 'none'`, which is
 *      the heart of the privacy guarantee.
 *
 * INVARIANT: This Worker must never receive, inspect, store, log, or relay a
 * user's PDF. By design it can't — the PDF is processed entirely in the browser
 * tab and never leaves the device. Do not add request-body reading, fetch() to
 * third parties, logging of user content, or anything that weakens the CSP.
 */

// The single source of truth for the security headers applied to every response.
// `connect-src 'none'` blocks every fetch / XHR / WebSocket / sendBeacon.
// Keep this in sync with the <meta http-equiv="Content-Security-Policy"> tag
// that is inlined into each editor HTML file.
const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    // Inline scripts/styles are required because everything is inlined into one
    // HTML file. No off-device sources are permitted.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // The core of the guarantee: no network egress of any kind.
    "connect-src 'none'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
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
