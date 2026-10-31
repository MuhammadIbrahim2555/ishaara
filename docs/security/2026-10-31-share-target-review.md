# Security review — Android share target, custom service worker, iOS shortcut link, 2026-10-31

**Scope:** uncommitted changes since `99fc31b`: `src/sw.ts` (injectManifest SW, `POST /share-target` handler), `vite.config.ts` (manifest `share_target`, icons, `start_url`/`scope`), `src/core/capture.ts` (`isShareLaunch`, `takeSharedImage`), Ask/Setup screens, `useShortcutLaunch`, `useRememberRoute`, `useInstallPrompt`, OCR `ocrInit` warm-up, Settings/Judge status labels, `VITE_IOS_SHORTCUT_URL`.
**Risk:** MEDIUM (new request handler in the service worker). Quick triage + targeted read of `src/sw.ts`.

## Checks
- **Redirects:** the SW only redirects to fixed same-origin paths (`/ask/photo`, `/ask/photo?from=share`) — no user-controlled redirect target. ✅
- **Shared image storage:** stored only in the device's Cache Storage (`ishaara-share` / `/shared/latest`), read once and deleted by `takeSharedImage()`. Never uploaded; it then follows the normal on-device flow (redaction before OCR). ✅
- **Navigation fallback:** `/share-target` is excluded from the SPA fallback; runtime caches unchanged (models/wasm/voice). ✅
- **Egress:** no new network calls. ✅
- **iOS Shortcut link:** a public iCloud share URL in a build-time env var (not a secret); `.env` stays git-ignored. Opening it is an explicit user tap. ✅
- **Route memory:** `from=share` launches are never saved/overridden. ✅

## Findings
| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| L7 | Low | Any website could submit a cross-site form POST to `/share-target`; the SW would store that file and open the hide step with it. Impact is limited to the user seeing an unexpected image they must actively continue with; nothing leaves the device. | Optional hardening: accept only `file.type` starting with `image/` and size ≤ 15 MB in `src/sw.ts`; ignore otherwise |
| L8 | Low | `beforeinstallprompt` captured at module load may be missed if it fires earlier | UX only; Install button simply stays hidden (manual "Install app" from the Chrome menu still works) |

**Verdict:** no HIGH/MEDIUM findings. Safe to commit.
