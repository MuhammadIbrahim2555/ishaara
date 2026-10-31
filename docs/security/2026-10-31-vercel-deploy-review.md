# Security review — Vercel production deploy config, 2026-10-31

**Scope:** uncommitted changes since `efaab8c` (excluding `video/`, another session's work): `.npmrc` (`legacy-peer-deps=true`), `.vercelignore`, `api/voice.ts` (ESM import path `.js`), `.gitignore` (`.vercel`).
**Risk:** LOW–MEDIUM (deployment surface). Verified against the live deployment `https://ishaara-zeta.vercel.app`.

## Checks
- **Upload contents:** `.vercelignore` excludes `.env`, `.env.*` (keeps `.env.example`), `video/`, build output and build-loop scratch → no local secret files are uploaded with the CLI deploy. `.vercel/` (project link) and `.env.local` (created by `vercel link`) are git-ignored. ✅
- **Secrets:** Gemini key and Firebase config live in Vercel project environment variables (production). `GEMINI_API_KEY` has no `VITE_` prefix → server-only; live HTML/JS checked: key not present. The Firebase web API key is public by design (protected by Firestore rules). ✅
- **Live endpoint behaviour:** `GET /api/voice` → 405; same-origin POST with Urdu audio → 200 (transcript + task + reply, ~5 s, gemini-3.5-flash); cross-site POST → 403. ✅
- **`.npmrc`:** only relaxes peer-dependency resolution (same as local installs); no registry or auth changes. ✅

## Findings
| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| I6 | Info | Rate limit / daily cap are per serverless instance (see L11) | Add Vercel KV/Upstash-based limits or Firebase App Check before a wide public launch |

**Verdict:** no findings blocking commit.
