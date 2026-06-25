# GitHub Setup

How to put AirLock on GitHub and (optionally) wire up auto-deploy. Copy-paste
friendly.

## 1. Create the repo

You can't have an AI create the repo for you — do it yourself, either way below.

**With the GitHub CLI (`gh`):**
```bash
cd airlock-pdf-editor
gh repo create airlock-pdf-editor --public --source=. --remote=origin
```

**Or in the browser:** create a new empty repo at
https://github.com/new (no README/license — this repo already has them), then:
```bash
cd airlock-pdf-editor
git remote add origin https://github.com/<your-username>/airlock-pdf-editor.git
```

## 2. Commit and push

```bash
git add -A
git commit -m "AirLock: browser-only PDF editor with browser-enforced privacy"
git branch -M main
git push -u origin main
```

## 3. (Optional) Enable auto-deploy on push

`.github/workflows/deploy.yml` deploys to Cloudflare on every push to `main`,
and refuses to deploy if an editor file changed without `public/SHA256SUMS.txt`
being refreshed (a guard for invariant 6). To turn it on, add two repository
secrets under **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — Cloudflare → My Profile → API Tokens → *Edit
  Cloudflare Workers* template.
- `CLOUDFLARE_ACCOUNT_ID` — from your Workers dashboard.

If you don't add these, the workflow simply fails on the deploy step; nothing
else breaks, and you can always deploy manually with `npm run deploy`.

## What does NOT go in the repo

Nothing user-specific, and no secrets. The `.gitignore` already excludes
`node_modules/`, `.wrangler/`, `dist/`, logs, and `.dev.vars`. There is no
telemetry and no user data anywhere in this project by design — don't add any.
