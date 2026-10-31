# Ishaara — Design

## World: "Ammi ka narm kamra" (Ammi's soft room)

A warm, calm room made of matte clay. Soft top-left daylight, rounded chunky forms, cream walls, deep teal furniture, saffron accents like a dupatta border. It should feel like sitting next to a patient grandchild, not using a tech product. **Mode: Operate** — clarity and calm beat spectacle; the 3D is the one authored moment (the phone that zooms in and the finger that shows the way), everything else is quiet and precise.

## Tokens (CSS variables in `src/styles/tokens.css`)

| Token            | Value                                                                | Use                                               |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| `--bg`           | `#FBF7F0`                                                            | page (matches the clay image backgrounds exactly) |
| `--surface`      | `#FFFFFF`                                                            | raised panels                                     |
| `--surface-sunk` | `#F3ECE1`                                                            | wells, inputs, image frames                       |
| `--ink`          | `#1F2A2B`                                                            | body text (≥ 12:1 on bg)                          |
| `--ink-soft`     | `#4A5556`                                                            | secondary text (≥ 7:1 on bg)                      |
| `--teal-900`     | `#0F5257`                                                            | primary buttons, brand                            |
| `--teal-700`     | `#1C6E70`                                                            | hover/pressed                                     |
| `--teal-100`     | `#DCEDEA`                                                            | selected/soft fills                               |
| `--saffron`      | `#E8A33D`                                                            | highlight, focus ring, target glow                |
| `--saffron-ink`  | `#7A4A07`                                                            | text on saffron fills                             |
| `--coral`        | `#E07A5F`                                                            | gentle attention (never "error red")              |
| `--success`      | `#2F7D4F`                                                            | "Shabash" states                                  |
| `--shadow-1`     | `0 2px 4px rgba(60,40,20,.06), 0 8px 24px rgba(60,40,20,.08)`        | raised                                            |
| `--shadow-2`     | `0 6px 12px rgba(60,40,20,.08), 0 20px 48px rgba(60,40,20,.12)`      | lifted / pressed-up                               |
| `--radius`       | `16px` (panels), `999px` (small pills only), `28px` (big task tiles) |
| spacing          | 4-pt scale: 4, 8, 12, 16, 24, 32, 48, 64                             |
| `--focus`        | `0 0 0 4px #FBF7F0, 0 0 0 7px var(--saffron)`                        | every focusable                                   |

High-contrast setting: `--ink-soft` → `--ink`, `--surface-sunk` → `#EDE3D3`, borders 2px `--ink` on controls.

## Type

- **Urdu:** Noto Nastaliq Urdu (`@fontsource/noto-nastaliq-urdu`, 400/700). Body 22px, line-height 2.1. Headings 30/38px, line-height 1.9. Always `dir="rtl"` on Urdu blocks.
- **Latin:** Atkinson Hyperlegible Next (`@fontsource/atkinson-hyperlegible-next`, 400/700/800; fallback Atkinson Hyperlegible). Body 18px/1.5, labels 16px, display 40–56px weight 800, tracking -0.02em.
- Text-size setting: normal / large (×1.2) / extra (×1.4) via `--scale` on `html`.
- Numerals tabular in counters.

## Iconography & imagery

- Clay images in `public/assets/*.png` (cream bg baked in — place on `--bg` or `--surface-sunk` only, never on white cards without a cream well).
- UI control icons: `lucide-react`, stroke 2.25, size 28–32. No emoji, no unicode glyphs as icons.

## Components

- **BigButton:** min-height 64px, radius 20px, label 22px Urdu + 15px Latin sub-label, icon leading (right side in RTL). Primary teal, secondary white with 2px teal-900 border. Pressed: scale .98 + shadow-1.
- **TaskTile:** 2×2 grid on phone (min 160px square), clay image 96px, Urdu label + Latin sub-label, CSS 3D tilt (max 6°) toward pointer, `--shadow-2` lift on hover/focus. Whole tile is one `<button>`.
- **MicOrb:** 112px teal circle, hold-to-talk _and_ tap-to-toggle; listening state = soft saffron pulse rings (scale + opacity), live "سن رہی ہوں…" text.
- **SpeakButton (🔊):** 48px round, next to every instruction; plays Urdu voice in this order: pre-generated `public/voice/<id>.wav` (27 clips from MMS-TTS, `obaidasiaone/mms-tts-urd-onnx` on the Hub) → live MMS-TTS Urdu in the worker for any other Urdu text → captions only if the model fails (button hidden). No human recordings.
- **BackBar:** top bar, "واپس" big back button always present except on Home.
- **BottomNav (phone):** 4 items — گھر Home, میری ویڈیوز Videos, میری ترقی Progress, ترتیبات Settings — 72px tall, icon + label, active = teal-100 pill behind icon.
- **Toast/Hint:** inline panel (not modal) with coral or teal tint, Urdu text + speak button.
- **Stepper:** dots + "قدم 1 / 3" for lesson steps.
- No modals except the delete-confirm (Radix Dialog). No cards nested in cards. No left/right colored border stripes. No gradient text, no glassmorphism.

## Getting the screenshot in

- **Dikhayein mode** (app opened with `?from=shortcut`, or regains focus after the shortcut runs): the whole screen becomes one giant teal button, at least 70% of the viewport height, reading "دکھائیں" (48px Urdu) with the sub-label "Show my screen" and the helper-hand image. The tap calls the clipboard read (it must happen inside that tap gesture so Safari shows its Paste bubble). Below it, a quiet link "تصویروں سے چنیں" (choose from photos) opens the file picker. If the clipboard has no image → an inline teal hint: "پہلے پیچھے تین بار ٹیپ کریں" (first triple-tap the back of the phone), plus the picker.
- **Normal mode:** BigButton "میری اسکرین دکھائیں" (show my screen) opens the Photos picker (`accept="image/*"`; the newest screenshot is at the top). On desktop, a large dashed drop zone on `--surface-sunk` plus "Try a sample".
- **Phone tayyar karein guide** (`/setup`, linked from Settings and from the first-run welcome; meant for the family): 6 steps, one per screen, each showing a drawn iPhone settings mock (crisp SVG/HTML recreation, not a screenshot) with the row to tap glowing saffron and the hand image pointing at it, Urdu + English text, Next/Back BigButtons, and a stepper. Steps: 1 Settings → 2 Accessibility → 3 Touch → 4 Back Tap → 5 Triple Tap → 6 choose the "Ishaara" Shortcut. Before them, a Shortcut card: an "Add the Shortcut" button (iCloud link, when available) + collapsible manual steps (Take Screenshot → Copy to Clipboard → Open URL). The last screen says: "Try it: tap the back of the phone 3 times."

## 3D (React Three Fiber) — three scenes only

1. **WelcomeScene:** clay phone (RoundedBox, teal-900 body, cream screen showing `logo-mark.png`) floating with a slow 4 s bob and ±4° sway; soft key light top-left + ambient; contact shadow (`ContactShadows`). `helper-hand.png` as a sprite waving (rotate ±12°, 3 times, then rest).
2. **LessonScene (the authored moment):** phone with the user's screenshot as the screen texture (correct aspect). Per step: camera dolly from full view to ~1.8× zoom centred on target (GSAP, 900 ms, `expo.out`); dim overlay plane with a rounded-rect hole at the target (canvas-generated alpha texture), hole edge softly glowing saffron; a 3D clay finger (CapsuleGeometry 0.18 radius + sphere tip, MeshStandardMaterial roughness .9, skin `#C99A74`) travels in from bottom-right on a curved path, presses (z-dip 0.06 + ripple ring that scales 1→2.2 and fades). Caption rises in HTML below the canvas. Between steps camera eases back to 1.2×.
3. **ShabashBurst:** 14 instanced star sprites (`icon-star.png`) burst upward and settle with gravity, 1.6 s, plus a warm chime.

- `<Canvas dpr={[1, 1.5]} frameloop="demand">`, invalidate only while animating; pause entirely while the engine is analyzing.
- **Simple mode** (auto when `prefers-reduced-motion`, `navigator.deviceMemory < 4`, or user toggle): no WebGL. LessonPlayer2D = `<img>` + absolutely positioned spotlight (`box-shadow: 0 0 0 9999px rgba(31,42,43,.55)` on a rounded box at the target) + `helper-hand.png` animated with GSAP; reduced motion → no travel, just appear.

## Fade levels (presentation)

- **Level 1:** full scene — dolly, finger, dim, caption, why, voice.
- **Level 2:** no finger, no dolly; target ring gently glows; one-line caption.
- **Level 3:** screenshot shown plainly + "آپ کو آتا ہے، خود کریں 😊" (text, no emoji in UI icons) with secondary button "اشارہ چاہیے؟" that switches to level 2 view.

## Motion

Easing `expo.out` / `cubic-bezier(.16,1,.3,1)`. Durations 180 ms (controls), 320 ms (screen transitions: fade + 12px rise via Motion), 900 ms (camera). One authored moment per screen. All motion respects reduced-motion.

## Copy voice

Urdu, respectful (آپ), short sentences, verbs first. Never "error", "failed", "invalid". Examples: "یہ اسکرین مجھے صاف نظر نہیں آئی" · "کوئی بات نہیں، دوبارہ کوشش کریں" · "شاباش! بالکل صحیح".
