# Security review — Rounds 2–3 + UI integration, 2026-10-31

**Scope:** all uncommitted changes since `313ea82` not covered by the round-1 review: on-device AI (`src/ai/*`, `src/workers/ai.worker.ts`), voice/translate/capture, family sync (`src/sync/*`, `firestore.rules`), progress card, metrics, vision gate, UI screens (Family, Join, Judge, Settings, Progress, Ask/Lesson/Check), `scripts/pregen_voice.py`, `public/voice/*`, PWA config, `vite.lan.config.ts`.
**Strategy:** FOCUSED on data egress, auth/authorization (Firestore rules), secrets, injection, browser-API misuse. Confidence: medium-high.

## Checks
- **Secrets:** Firebase web config only in `.env` (git-ignored, verified with `git check-ignore`); no API keys in tracked files (grep `AIza…` clean); `.env.example` has empty values. Note: Firebase web API keys are public identifiers by design; protection comes from the rules below.
- **Analytics:** no `firebase/analytics`, gtag or measurementId in app code (only transitive packages in the lockfile, never imported). ✅
- **Data egress:** screenshots, OCR text, voice recordings and lessons never leave the device. Firestore writes (`src/sync/family.ts`) only: `families` (ownerUid, ownerName, createdAt), `invites` (familyId, ownerUid, elderName, expiresAt), `elders` (progress fields + inviteCode). `pushProgress` is a no-op unless linked **and** sharing is on; unit test asserts the exact key allow-list. Model downloads (Hugging Face / jsDelivr / tessdata) are the only other requests. ✅
- **Firestore rules:** deny-by-default; family read/list only by owner; invites `get`-only while unexpired, no list/update, created only by the family owner with ≤ 30 min expiry; elder doc create requires `auth.uid == eid` + valid unexpired invite for that family; updates can't change `elderId`/`inviteCode`; strict key allow-list + type/size checks. ✅
- **Injection:** no `innerHTML`/`dangerouslySetInnerHTML`/`eval`/`new Function`; QR rendered via `qrcode.react` (SVG, value = same-origin URL). ✅
- **Clipboard / mic:** both only on user gesture; mic recording max 6 s, sent only to the on-device Whisper worker. ✅
- **Judge view:** safety-stop shows the reason only, never the matched OTP/PIN text. ✅
- **Invite codes:** 8 chars from a 32-symbol alphabet via `crypto.getRandomValues` (~1.1e12 space), 15-min expiry → brute force impractical. ✅

## Findings
| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| L4 | Low | `elders.skills` list items are not field-validated in rules (only list size ≤ 10), so a modified client could store arbitrary small data in the elder's own doc, readable only by that family's owner | Acceptable for v1; validate item shape server-side later (Cloud Function) |
| L5 | Low | Anyone holding a valid unexpired invite code can join the family as an "elder" | Codes are short-lived and shown only on the helper's screen; add owner approval later |
| L6 | Low | Rules are not yet deployed and rules tests need the emulator (Java + firebase-tools) | Deploy with `firebase deploy --only firestore:rules`; run `npm run test:rules` when the emulator is available |
| I3 | Info | `vite.lan.config.ts` serves the dev server on the LAN with a self-signed cert | Dev-only; never used for production builds |
| I4 | Info | npm audit highs remain Node-only transitive deps (grpc-js via firebase, sharp via transformers) | Not in the browser bundle |

**Verdict:** no HIGH/MEDIUM issues. Safe to commit.
