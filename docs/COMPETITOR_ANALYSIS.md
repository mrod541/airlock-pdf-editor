# Competitive Landscape — Privacy-Minded In-Browser PDF Editors

A factual look at how competing "private, in-browser" PDF editors actually
behave, captured from network traffic and product documentation. Compiled to
sharpen AirLock's positioning around its real differentiator: a *browser-enforced,
verifiable* no-egress guarantee, not a marketing promise.

---

## Case study: LocalPDF (localpdf.online)

**Their claim:** "keeps everything on your device — no uploads, no server
storage, no privacy policies to trust."

**What a HAR capture of an editing session actually shows:**

The PDF itself is **not uploaded** — that part of the claim holds. No file bytes
appear in any request. Processing is genuinely client-side (WebAssembly).

**However**, the page runs a full PostHog analytics + session-replay SDK
(`$lib: web`, v1.393.4), reverse-proxied through `localpdf.online/ingest/` so it
looks first-party. In a short session it fired ~50 POSTs to that backend. So
"no privacy policies to trust" is not accurate: there is extensive telemetry,
just not the file.

### What was actually collected (decoded from the gzipped event batches)

Event types in the capture:
- `$snapshot` (36×) — **session replay** (rrweb): reconstructs the page session
  (clicks, scrolls, navigation).
- `$$heatmap` (22×) — mouse-movement / interaction heatmap data.
- `$web_vitals` (4×) — performance metrics tied to specific URLs visited.
- `app_file_uploaded` (2×) — fires when you open a document. **Metadata only,
  not contents:** `file_count`, `total_bytes` (e.g. 88,226), `mime_category`
  ("pdf"), `tool_id` ("studio"), tied to a persistent device ID + session ID.

80 distinct property fields were collected across the session, including:
- **Device/browser fingerprint:** `$os`, `$os_version`, `$browser` (correctly
  identified Brave despite a spoofed Chrome user-agent), `$device_type`,
  `$screen_height/width`, `$viewport_height/width`, `$timezone`,
  `$browser_language`, `$raw_user_agent`.
- **Persistent identifiers:** `$device_id`, `distinct_id`, `$session_id`,
  `$window_id` — stable across sessions, i.e. you are re-identifiable on return.
- **Navigation:** `$current_url`, `$pathname`, `$referrer`, `$referring_domain`,
  `$session_entry_url`, plus the session-replay snapshot stream.

### The takeaway

LocalPDF keeps the narrow promise (file not uploaded) while doing the broad
thing its tagline disclaims (tracking, fingerprinting, session recording).
"Local" describes where the *PDF* is processed — not whether *you* are tracked.
The user takes everything except the file on trust.

### Why AirLock is categorically different

AirLock's `connect-src blob:` CSP would make **every one of those ~50 PostHog
POSTs structurally impossible** — blocked by the browser, not by a policy. A HAR
capture of AirLock under the same test shows only the initial file load and then
nothing: zero `/ingest/`, zero telemetry, zero fingerprinting. The difference
isn't "we promise not to" — it's "the browser won't let us, and you can verify
the capture yourself."

**This HAR is worth keeping** as a side-by-side demonstration: a competitor that
advertises "no privacy policies to trust" while running session replay, next to
AirLock's empty capture.

---

## The broader pattern

Most "private, in-browser" PDF editors fall into a predictable split:

- **Genuinely client-side for the file** — yes, many now process the PDF in the
  browser via WebAssembly / pdf.js / pdf-lib. This part is increasingly common
  and not, by itself, a differentiator.
- **Still tracking the user** — analytics, session replay, fingerprinting, and
  in some cases optional cloud features or server-side billing checks that the
  privacy copy glosses over. SimplePDF, for instance, openly captures form data
  server-side in some configurations despite privacy framing.

The honest, verifiable, *whole-page* no-egress guarantee — enforced by the
browser and checkable by the user — is the rare position. That is the gap AirLock
occupies.

---

## Is anyone building the *real* thing? (open-source landscape)

The genuinely privacy-respecting PDF editors tend to be open-source projects, not
the polished commercial sites. They split into three shapes:

**Native desktop, no telemetry** (genuine, but you install an app):
- **KillerPDF** (GitHub: SteveTheKiller/KillerPDF) — "local-only, portable, no
  account, no telemetry. The PDF equivalent of Notepad." GPLv3, Windows/.NET.
- **Open PDF Studio** (OpenAEC-Foundation) — "no subscriptions, telemetry, or
  bloatware." Tauri 2, GPLv3, cross-platform desktop.
- A **Tauri 2 + Rust** form-filler/signer — "no accounts, no cloud, no telemetry."

**Self-hosted server** (private to *your* infrastructure, but a server touches the file):
- **Stirling-PDF** — 30M+ downloads, open-source, 50+ tools, Docker. "Private" =
  your own server. Now has a paid commercial tier.
- **PdfDing** — self-hosted manager/viewer/editor.

**In-browser, client-side** (the same shape as AirLock):
- A few exist in the GitHub `pdf-editor` / `pdf-tools` topics: "a simple,
  client-side, in-browser, privacy-focused PDF editor based on PDF.js"; a
  "Zero-Server Architecture" toolkit (merge/split/compress/edit, "no uploads, no
  servers, no tracking"); a client-side dark-mode converter.

### Where AirLock is actually differentiated

The in-browser client-side projects rest their privacy claim on **"trust the
source / it's open."** That's a developer-auditable guarantee — real, but only
checkable by someone who can read the repo.

What was **not** found anywhere in this search is AirLock's specific combination:
- in-browser, zero-server, **and**
- **CSP-enforced** no-egress (the browser blocks the network, not just a promise
  in the code), **and**
- **runtime-verifiable by a non-developer** — the in-app Verify-privacy panel,
  the offline test, and published SHA-256 hashes.

So: plenty of people build no-telemetry PDF tools; fewer build them browser-only;
and essentially nobody packages the guarantee so an ordinary user can *verify it
themselves in the moment* rather than trusting a repo they can't read. That
"provable to anyone, not just auditable by developers" position is the gap AirLock
occupies — and it only holds as long as the builds honestly meet it (the reason
retiring the non-compliant ocr-fast build mattered).
