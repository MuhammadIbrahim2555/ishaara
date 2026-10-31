# Security review — bilingual UI + fixes, 2026-10-31

**Scope:** changes after `docs/security/2026-10-31-round2-3-review.md`: bilingual UI (`LangToggle`, `useSpeak`, Pair copy across screens), English lesson data (`captionEn`/`whyEn` in maps, `phrases.en.json`), vision gate (`src/ai/visionGate.ts`), checker/fading logic fixes, Dikhayein button sizing, `dev:lan` script.
**Strategy:** quick triage (LOW–MEDIUM risk: UI copy, static data, pure logic). Confidence: high for egress/injection.

## Checks
- **Egress:** no new network calls. Only `fetch` in app code: same-origin `/samples/*.svg` and `/voice/manifest.json`. English speech uses the browser's local `speechSynthesis`. ✅
- **Injection:** no `innerHTML` / `dangerouslySetInnerHTML` / `eval`; all new copy rendered as React text. ✅
- **Storage:** only the existing settings key (`lang` added to non-sensitive settings). ✅
- **Secrets:** none in tracked files (`AIza…` grep clean); `.env` still git-ignored. ✅
- **Vision gate:** reduces load (no blocking model download, 5 s timeout) — no new data paths. ✅
- **Checker/fading:** pure logic, covered by tests (94 passing). ✅
- **Mock family:** `src/sync/family.ts:567` mock invite URL points to a placeholder domain — mock mode only, never used with real Firebase. Info.
- **`dev:lan`:** dev-only HTTPS LAN server (self-signed); not part of the production build. Info.

**Verdict:** no HIGH/MEDIUM/LOW findings. Safe to commit.
