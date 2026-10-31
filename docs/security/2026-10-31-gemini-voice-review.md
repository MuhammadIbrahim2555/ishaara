# Security review — Smart voice (Gemini) server proxy + client, 2026-10-31

**Scope:** uncommitted changes since `e8a1cc3`: `server/geminiVoice.ts`, `server/viteVoicePlugin.ts`, `api/voice.ts` (Vercel), `src/ai/geminiSpeech.ts`, `src/core/index.ts` wiring, `src/types/contracts.ts`, `src/sw.ts` (`/api/` denylist), consent UI (`SmartVoiceConsent`, Settings switch, `VoiceReplyPanel`, `src/ui/smartVoice.ts`), `eslint.config.js` (ignore `video/`), tests, `.env.example`.
**Risk:** HIGH (new external call + secret handling). Targeted read of the server handler and both adapters; live tests on the LAN build.

## Checks
- **Secret exposure:** key read server-side from `GEMINI_API_KEY` (no `VITE_` prefix); sent only as `x-goog-api-key` header to `generativelanguage.googleapis.com`; never logged or echoed (upstream errors map to generic `upstream`). `dist/` scanned for the variable name and key prefix: **not present**. ✅
- **Model/URL injection:** model ids come only from server env and are `encodeURIComponent`-ed into a fixed Google host → no SSRF. ✅
- **Request limits:** POST only (GET → 405), `audio/*` only (415), ≤ 1.5 MB (413, enforced while streaming in adapters), per-attempt 12 s / total 25 s timeouts. ✅
- **Abuse / quota (fixed in this change):** per-IP rate limit now keyed on the socket address (Vite) or `x-vercel-forwarded-for`/`x-real-ip` (Vercel) — no longer the spoofable first `x-forwarded-for`; global rolling-24 h cap `GEMINI_DAILY_CAP` (default 300) → 429; cross-site requests rejected via `Origin`/`Sec-Fetch-Site` → 403. Live: same-origin 200, cross-site 403, GET 405. ✅
- **PII (audio):** only sent when the user has opted in (`ishaara.smartVoice.v1 = 'on'` via the consent sheet; default off); audio is not stored server-side; screenshots never sent. Consent text states exactly what is sent and how to turn it off. ✅
- **Safety:** OTP/PIN guard now token/bigram-based (no false positives on اپنا/اپنی); tested. ✅
- **Service worker:** `/api/` never cached or navigation-fallbacked. ✅
- **Key in chat:** the user pasted the key into the conversation; recommend rotating it after the event. (Process note, not code.)

## Findings
| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| L11 | Low | Rate limit + daily cap are in-memory → per serverless instance on Vercel (a determined abuser across instances could exceed the cap) | Use Vercel KV/Upstash or Firebase App Check before a public launch; set a hard quota in Google Cloud console |
| L12 | Low | `Origin`/`Sec-Fetch-Site` checks stop browsers, not scripted clients | Add Firebase App Check / reCAPTCHA Enterprise token or per-install signed token for production |
| I5 | Info | Key exposed in chat transcript | Rotate the key in Google AI Studio after the hackathon |

**Verdict:** no HIGH/MEDIUM findings remaining. Safe to commit.

**Pre-publish secret scan (before first GitHub push):** 226 tracked + untracked app files (excluding `video/`, another session's work) scanned for the Gemini key, Google API key patterns and `GEMINI_API_KEY=` values — none found. `.env` is git-ignored.
