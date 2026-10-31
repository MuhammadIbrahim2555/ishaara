# Security review — Round 1 (foundation engine + UI), 2026-10-31

**Scope:** all uncommitted changes vs `313ea82` (120 new files): `src/core`, `src/workers`, `src/ai`, `src/data`, `src/types`, `src/ui`, `src/screens`, `src/scenes`, config, `public/samples`, `public/assets`.
**Type:** greenfield client-only web app (no server, no auth yet). Strategy: FOCUSED triage of data-flow and browser-API risk. No baseline to diff against, so git-blame/regression phases don't apply.
**Confidence:** medium-high for data-leaving-device and DOM-injection risk; not a full line-by-line audit of 3D/animation code (LOW risk).

## Risk classification
| Area | Risk | Why |
|---|---|---|
| `core/engine.ts`, `core/image.ts` (redaction), `workers/ocr.worker.ts` | HIGH | Handle user screenshots (may contain balances/names) |
| `ui/dev/clipboard.ts`, `ui/components/ImageInput.tsx` | MEDIUM | Clipboard + file input |
| `core/library.ts`, `ui/store.ts` | MEDIUM | On-device persistence |
| `core/share.ts` | MEDIUM | Only path that hands an image to another app |
| UI screens, scenes, styles | LOW | Rendering only |

## Checks and results
- **Data leaving the device:** no `fetch`/XHR/beacon in app code except `data/samples.ts` (same-origin `/samples/*.svg`). Network = Google Fonts CSS (L1) + Tesseract language data / model files from CDNs (L2). Screenshots are never uploaded. ✅
- **Redaction order:** `engine.analyze/check` call `redactImage` **before** OCR, storage and the ask-family share; the shared image is the redacted one. Re-encoding strips EXIF. ✅
- **DOM injection:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`; OCR text is never rendered as HTML. ✅
- **Clipboard:** read only inside a user tap, only `image/*` items accepted, errors → null. ✅
- **Object URLs:** created and revoked (`useObjectUrl`, `Library`, `samples`). ✅
- **Share:** only on explicit tap via Web Share; AbortError handled. ✅
- **Storage:** settings in localStorage (non-sensitive). Lessons (redacted screenshots) in IndexedDB, unencrypted, on device; "delete everything" exists (L3).
- **Secrets:** none in repo; `.env*` ignored, `.env.example` empty. ✅
- **Dependencies (`npm audit --omit=dev`):** 6 high — `@grpc/grpc-js` via `firebase/firestore`, `sharp` via `@huggingface/transformers`. Both are **Node/server-side code paths** (grpc server, native image lib) not bundled into the browser build → not exploitable in this app (I1).

## Findings
| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| L1 | Low | Google Fonts `@import` sends the user's IP to Google on every load; contradicts "nothing leaves the phone" pitch | Self-host fonts via `@fontsource/*` (planned, next UI pass) |
| L2 | Low | Tesseract `eng`/`urd` traineddata and (round 2) HF models are fetched from public CDNs on first use | Acceptable (model download, cached by PWA); document in README; optionally self-host tessdata under `public/` |
| L3 | Low | Redacted screenshots stored unencrypted in IndexedDB | Acceptable for on-device store; keep "delete all"; mention in privacy section |
| I1 | Info | npm audit highs are Node-only transitive deps | Re-check after round 3 (firebase); consider transformers v4 if it drops `sharp` |
| I2 | Info | `ocr.worker.ts` creates an `ImageBitmap` without `close()`; no downscale before OCR | Fix in round 2 (memory, not security) |

**Verdict:** no HIGH/MEDIUM issues. Safe to commit.
