# Security review — route memory, persistent storage, LAN preview, no-translate, 2026-10-31

**Scope:** uncommitted changes since `51e4d21`: `src/ui/hooks/useRememberRoute.ts`, `src/ui/persist.ts`, `src/ui/App.tsx`, `src/screens/Welcome.tsx`, `src/screens/Settings.tsx`, `index.html` (notranslate), `vite.lan.config.ts` (`hmr: false`, HTTPS `preview`), `package.json` (`lan` script). Risk: LOW–MEDIUM (navigation from stored data). Quick triage.

## Checks
- **Open redirect / injection via saved route:** the stored value is re-validated against a strict allow-list of internal path regexes before use (`readSaved` → `isRemembered`) and only passed to React Router `navigate()` (same-origin, client-side). A tampered value that doesn't match is ignored. Lesson/check ids are only looked up in local IndexedDB. ✅
- **Storage:** stores only a pathname (no screenshots, no ids beyond the lesson id already in the URL). `navigator.storage.persist()` only asks the browser not to evict local data. ✅
- **Egress:** no new network calls. ✅
- **index.html:** adds `translate="no"` + `<meta name="google" content="notranslate">` — prevents browser machine translation from altering UI/safety text. ✅
- **LAN config:** dev-only; HMR disabled; `vite preview` serves the production build over self-signed HTTPS on the LAN. Not used for deployment. Info.

**Verdict:** no findings. Safe to commit.
