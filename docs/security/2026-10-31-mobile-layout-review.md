# Security review — mobile layout + single-language UI, 2026-10-31

**Scope:** uncommitted changes since `7bb73b1` (15 files, +124/−84): BackBar, BiLabel (current language only), BottomNav, Screen, LangToggle, ImageInput, LessonPlayer2D, Lesson/Family/Join/Settings/Library screens, `tokens.css`, `index.css`, and `vite.lan.config.ts` (`cacheDir`).
**Risk:** LOW (layout/CSS/copy rendering; dev-only config). Quick triage.

## Checks
- Added lines scanned for `fetch(`, URLs, `innerHTML`, `dangerouslySetInnerHTML`, `eval(`, `localStorage`, `sendBeacon`, API keys: **none found**. ✅
- No changes to engine, sync, Firestore rules, storage or network code. ✅
- `vite.lan.config.ts`: adds a separate dev dependency cache (`node_modules/.vite-lan`), dev-only, git-ignored path. ✅

**Verdict:** no findings. Safe to commit.
