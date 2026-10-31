# Security review — photoreal hand (3D + 2D lesson), 2026-10-31

**Scope:** uncommitted changes since `67f9445`: `public/assets/hand-point.webp`, `public/assets/hand-press.webp` (generated images, cut out with ffmpeg), `src/scenes/parts/handAnchor.ts`, `src/scenes/parts/Finger.tsx` (`RealHand`), `src/scenes/LessonScene.tsx` (framing/timeline), `src/ui/components/LessonPlayer2D.tsx` (layout). Not in scope: `video/` and the `.gitignore` video lines (another session's demo-video work, left uncommitted here).
**Risk:** LOW (rendering only).

## Checks
- Added lines scanned for `fetch(`, URLs, `innerHTML`, `dangerouslySetInnerHTML`, `eval(`, `localStorage`, keys: **none**. ✅
- Assets are same-origin static images; textures disposed on unmount. ✅
- No engine, storage, sync or network changes. ✅

**Verdict:** no findings. Safe to commit.
