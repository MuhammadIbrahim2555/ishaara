# Mujhe Dikhao: Build Plan v3 (31 Oct 2026, 9:00 AM to 5:00 PM PKT)

> *"Ammi ki apni screen par, Ammi ki zubaan mein, tab tak sikhata hai jab tak Ammi ko khud na aa jaye."*
> (On Ammi's own screen, in Ammi's own language, it teaches until Ammi can do it herself.)
>
> An offline AI phone tutor in a rich, friendly 3D web app. Ammi shows the screen where she's stuck, the AI **on her device** makes a short Urdu video lesson on **her own screenshot**, checks that she did it herself, and helps less each time until she doesn't need it. **The AI and her screens never leave her phone.** Only her learning progress can be shared with family, and only if she turns it on.

---

## 0. Who builds what

| Role | Who | Does |
|---|---|---|
| **Planner + reviewer** | **Claude Opus** | Writes each `TASK.md` for Antigravity and the UI specs for Haiku, defines the shared contracts (types), reviews every diff (code, tests, security, rubric fit), writes the fix lists |
| **Engine builder (all non-UI code)** | **Antigravity 2.0 (Gemini)** | Scaffold, config, AI workers, OCR, screen-map engine, check step, fading, storage, PWA, tests. **One round per milestone** (3 rounds), running in the background |
| **UI builder** | **Claude Haiku (`quick-worker`)** | All components, screens, 3D scenes, animations, styling, written from Opus's design specs |
| **Fixes after review** | **Claude Haiku** | Applies Opus's exact fix list. Work is never sent back to Antigravity |
| **Images** | **Antigravity image generation (`agy-media`)** | 3D clay icons, helper character, empty states, logo, all in one batch prompt |
| **Human team** | You + teammates | Interviews, Urdu voice recording, screen maps (screenshots + labels), device testing, **learning each module so you can explain it to the judges** (rulebook §6), video, submission |

**Folder ownership** (lets Antigravity and Haiku work at the same time without touching the same files):
- **Antigravity:** `src/core/**`, `src/ai/**`, `src/workers/**`, `src/data/**`, `src/sync/**` (Firebase), `src/types/**`, `firestore.rules`, `tests/**`, config files
- **Haiku (UI):** `src/ui/**`, `src/screens/**` (including the dashboards), `src/scenes/**` (3D), `src/styles/**`, `public/assets/**`
- **Contract:** `src/types/contracts.ts`, written by Opus in Round 1's TASK.md and created first by Antigravity. Until the engine lands, the UI uses mock implementations of the same interfaces.

**Before 9 AM tomorrow:** the Antigravity app is open, the `B4B` folder is added as an Antigravity project, and the new GitHub repo is created at 9:00 (`git init` + first commit, so every round can be reviewed and reverted).

**AI disclosure (README, rulebook §6):** Antigravity (Gemini) built the engine; Claude (Opus planned and reviewed, Haiku wrote the UI); on-device models (Whisper, Florence-2, Opus-MT, Tesseract). The team must be able to explain every part.

---

## 1. Target user
- **Primary:** a Pakistani parent or grandparent (55+), smartphone owner, Urdu or Punjabi speaker, who freezes on everyday app screens and either calls their children or gives up.
- **Fears:** breaking something, looking foolish, bothering the kids, scams.
- **Evidence:** in RESEARCH.md. The #1 family complaint is repeated questions; big-tech AI answers live but forgets; 28% of Pakistani women who use mobile internet only go online through someone else's phone.

---

## 2. All features
| # | Feature | AI | Built by | Priority |
|---|---|---|---|---|
| 1 | Welcome + consent in Urdu voice and text ("Sab kuch aap ke phone mein rehta hai", everything stays on your phone) | – | Haiku (UI) | Core |
| 2 | **Ask by voice:** hold the mic → **Whisper** on the device → task | ✅ | AG engine + Haiku UI | Core |
| 3 | Ask by picture: 3D clay task cards (Photo, Video call, Voice note, Paise bhejna) | – | Haiku | Core |
| 4 | Screenshot pick / drag-drop + **Chhupao** (hide) tool, blacked out on the device before analysis | – | AG (image processing) + Haiku (draw UI) | Core |
| 5 | **Tesseract.js** OCR → screen-map match | ✅ | AG | Core |
| 6 | **Florence-2** finds buttons on unmapped screens + confidence threshold | ✅ | AG | Core |
| 7 | **Video lesson:** her screenshot on a **3D phone**, camera zooms to the target, 3D finger tap, spotlight, Urdu captions, recorded voice (what + why) | – | AG (lesson timeline data) + Haiku (3D player) | Core |
| 8 | **Opus-MT** en→ur captions, with a dictionary fallback | ✅ | AG | Core |
| 9 | **"Ab aap khud karein"** (now you do it): next screenshot → check → "Shabash!" (well done) with a 3D celebration, or a gentle hint | ✅ | AG + Haiku | Core |
| 10 | Multi-screen lessons (the parts join into one lesson) | – | AG | Core |
| 11 | **Meri Videos** (my videos): 3D card shelf of saved lessons, offline, delete | – | AG (IndexedDB) + Haiku | Core |
| 12 | **Help that shrinks:** full → glow → "Aap ko aata hai!" (you know this) + a hint button | – | AG | Core |
| 13 | **OTP/PIN guard:** a calm warning, and the lesson stops | ✅ | AG + Haiku | Core |
| 14 | **Family se poochein** (ask the family): Web Share to WhatsApp | – | AG util + Haiku | Core |
| 15 | Accessibility: text size, high contrast, spoken everything, **Simple mode (3D off)** | – | Haiku | Core |
| 16 | Confidence screen: "5 cheezein khud seekh li" (learned 5 things yourself), with badges | – | Haiku | Should |
| 17 | Offline PWA + model caching | – | AG | Should |
| 18 | Laptop judge mode: side-by-side layout + "Try a sample" screenshots | – | Haiku + AG (sample data) | Should |
| 19 | Save the lesson as MP4 | – | AG | Stretch |
| 20 | **Meri Taraqqi (my progress), Ammi's dashboard:** "Aap ne 5 cheezein khud seekh li" (you've learned 5 things yourself), 3D clay skill badges, help level per skill (*Video dekhi* watched the video → *Ishara kaafi tha* a hint was enough → *Khud kar liya!* did it herself), "is hafte 3 call kam" (3 fewer calls this week). Spoken aloud, large | – | AG (stats from the library) + Haiku | **Core** |
| 21 | **Family progress card:** "Bachon ko dikhayein" (show the kids) → image card shared to WhatsApp (Web Share). Only when she presses it | – | AG (card render) + Haiku | Core |
| 22 | **Family dashboard with Google sign-in:** the **child** signs in with Google; Ammi links with **no login**, by scanning a QR or typing a 6-digit code from the child's screen. The child sees Ammi's skills, help levels, "Ammi abhi video call par atki hain → saath practice karein" (Ammi is stuck on video calls → practise together), and weekly progress. Several elders per family | – | AG (Firebase Auth, linking, sync, Firestore rules) + Haiku (dashboard UI) | **Should** |
| 23 | **Ammi's sharing switch:** "Bachon ko meri taraqqi dikhayein" (show my progress to the kids), **off by default**, explained in Urdu; turn off and delete everything synced with one tap. **Only progress is synced; never screenshots, voice, lessons or screen text** | – | AG + Haiku | Should (required if #22 ships) |
| 24 | **Judge dashboard (laptop):** lessons made, checks passed, help levels falling, which on-device model ran and how long it took | – | AG (local metrics) + Haiku | Should |
| 25 | **Map Studio:** a family member or volunteer uploads a new screenshot, taps the target, records the Urdu voice → a new screen map saved on the device | – | AG + Haiku | Stretch |

---

## 3. Tech stack (use the latest stable versions at 9 AM)

**App and UI**
| Layer | Choice | Why |
|---|---|---|
| Build | **Vite + React 19 + TypeScript (strict)** | Fast, typed, static deploy |
| Styling | **Tailwind CSS v4** + CSS-variable design tokens | Quick, consistent, easy theming (contrast / large text) |
| 3D | **React Three Fiber + @react-three/drei** (+ light postprocessing: soft bloom and vignette only) | Rich 3D with React components |
| Motion | **GSAP + @gsap/react** for the lesson timeline (finger path, camera dolly, captions); **Motion** for UI transitions | GSAP timelines are precise and pausable, which suits a "video" |
| Accessible primitives | **Radix UI** (dialog, slider, toggle) | Keyboard and screen-reader support built in |
| State | **Zustand** | Tiny, simple |
| Routing | **React Router** | Welcome / Home / Ask / Lesson / Library / Settings |
| Fonts | **Noto Nastaliq Urdu** (Urdu), **Atkinson Hyperlegible Next** (Latin) | Readability for older eyes |

**Engine and AI (all on the device)**
| Layer | Choice |
|---|---|
| AI runtime | **@huggingface/transformers (transformers.js v3)** in **Web Workers** via **Comlink**; WebGPU when available, otherwise WASM |
| Speech | **Whisper** (`onnx-community/whisper-base`, falling back to `whisper-tiny`), Urdu |
| Vision | **Florence-2-base-ft** (`onnx-community/Florence-2-base-ft`), quantised |
| Translation | **Opus-MT en→ur** (verify the ONNX build) → team dictionary fallback |
| OCR | **tesseract.js** (`eng` + `urd`) |
| Validation | **Zod** for screen maps and lesson data |
| Storage | **IndexedDB** via `idb-keyval` |
| Offline | **vite-plugin-pwa** (Workbox runtime caching for model files) |
| Quality | **Vitest** + Testing Library (unit), **Playwright** (one end-to-end smoke test), ESLint + Prettier |
| Deploy | **Vercel** (static, no server) |

**Family sync (progress only, opt-in)**
| Layer | Choice |
|---|---|
| Sign-in | **Firebase Auth**, Google provider. **Child only**; Ammi never logs in |
| Linking | Child creates a family → a **QR code** (`qrcode.react`) + a 6-digit code (expires in 10 min). Ammi's device scans it (`BarcodeDetector`, falling back to typing the code) and joins as an anonymous family member |
| Data | **Firestore**: `families/{familyId}/elders/{elderId}/progress` holds only `{ skill, level, lastPracticed, stuckFlag, weeklyCount }` |
| Security | **Firestore security rules**: only linked family members can read; only Ammi's device can write her progress; no other fields allowed. Tested with the Firebase emulator |
| Free tier | Firebase Spark plan (no card needed) |

**Performance budget (3D and AI share one phone)**
- The 3D scene is a **lazy-loaded** chunk. The AI runs in a separate worker.
- **The 3D render loop pauses while a model is running** (`frameloop="demand"`). Pixel density capped at 1.5. Low-poly models only.
- Weak devices (low memory, reduced motion or iPhone memory pressure) → **Simple mode** switches on automatically: the same flow as flat 2D animation.

---

## 4. 3D UI design direction (Opus designs, Haiku builds)
**Concept: "Ammi ka narm kamra"** (Ammi's soft room). A warm, calm, clay-style 3D world: matte, soft light, rounded shapes, warm off-white with deep teal and saffron accents. It should feel like a kind room, not a tech dashboard. No neon, no glassmorphism, no stock gradients.

| Screen | 3D experience | Accessibility guard |
|---|---|---|
| **Welcome** | A friendly 3D phone floats and breathes in soft light, waves hello with a little clay hand, and the Urdu voice greets her | Big HTML "Shuru karein" (start) button, never inside the canvas |
| **Home** | 4 big **3D clay task cards** (icons generated by Antigravity) that tilt gently when touched; a big mic orb that pulses while listening | Cards are real buttons with labels and voice |
| **Ask** | The screenshot drops into a 3D phone frame; Chhupao draws soft clay patches over hidden areas | Large draw targets, undo |
| **Thinking** | The phone gently glows while "Aap ki video ban rahi hai…" (your video is being made…) plays, and a progress ring fills | Spoken status, no spinner-only state |
| **Lesson player** | Her screenshot as a texture on the 3D phone → the camera **dollies in** to the target → a **3D finger** presses with a ripple → a spotlight dims the rest → the Urdu caption rises | Play/pause/replay/slow controls are HTML; captions are HTML text |
| **Shabash** | Soft 3D confetti of clay stars + a warm chime | Reduced motion → a static star |
| **Meri Videos** | A 3D shelf of lesson cards (thumbnail = her screenshot); swipe to browse | A plain-list toggle, with large text |
| **Safety (OTP)** | The phone turns into a calm shield shape, no red alarms | The warning is spoken and written |
| **Laptop (judges)** | The 3D phone on the left, steps and controls on the right; "Try a sample" button | Responsive from 360px to 1440px+ |
| **Meri Taraqqi** | A 3D clay **trophy shelf**: each skill badge fills up (video → hint → did it herself) and glows when learned; a gentle number counter "5 cheezein khud seekh li" | Spoken summary; badges also listed as large text |
| **Family dashboard (child)** | A clean desktop and phone dashboard: an elder card per parent with 3D badge rings, a "stuck" chip with a "saath practice karein" (practise together) action, and a weekly progress bar | Normal accessible charts; clear "only progress is shared" note |
| **Linking** | The QR floats on a 3D card on the child's screen; on Ammi's phone, a big "Bachon se jodein" (connect with the kids) button opens the camera | The code-typing fallback uses big number keys |
| **Judge dashboard** | Live tiles: lessons, checks, help levels, model timings | Laptop only |

**Rules for everything:**
- 3D is **presentation only**. Every action is a real HTML control (big text, 56px+ targets, 7:1 contrast, spoken).
- `prefers-reduced-motion` and the Simple mode toggle are respected everywhere.
- One main action per screen; "Wapas" (back) is always visible; no error screens, only gentle hints.

Design skills Opus uses for direction: `impeccable`, `design-taste-frontend`, `gsap-*`, `react_bits_lookup`, `transitions-dev`.

---

## 5. Engine pipeline (Antigravity builds)
```
Voice (Whisper) | task card → TASK
Screenshot → Chhupao blackout (canvas, on device) → Tesseract OCR (words + boxes)
  ├─ OTP/PIN keywords → SafetyStop
  ├─ screen-map match (Zod-validated JSON) → target box          (most reliable)
  └─ no match → Florence-2 phrase grounding ("camera icon") → box + confidence
                 └─ below threshold → AskFamily
→ buildLesson(): Lesson { steps[{ box, captionUr, why, audio, expectNext }], level }
→ (UI plays it: 3D phone + GSAP timeline)
→ check(nextScreenshot, expectNext) → Pass | Hint(box) → next part / done
→ save to IndexedDB, update the fading level for the task
```
**Contracts** (`src/types/contracts.ts`, written by Opus in TASK 1): `Task`, `ScreenMap`, `OcrResult`, `Target`, `Lesson`, `LessonStep`, `CheckResult`, `FadeLevel`, plus the service interfaces `Engine.analyze()`, `Engine.check()`, `Speech.listen()`, `Library.*`.

---

## 6. Build rounds and timeline (commit at every ✅)

| Time | Antigravity (background) | Claude: Haiku UI / Opus review | Human team | Commit |
|---|---|---|---|---|
| **9:00–9:25** | – | Opus: writes **TASK 1** + contracts + UI spec 1 | Create repo, push `IDEATION.md`, `PLAN.md`, README skeleton; open Antigravity, add project | ✅ docs |
| **9:25–10:45** | **Round 1, Foundation:** Vite/React/TS/Tailwind scaffold, PWA, Comlink worker setup, contracts, Tesseract OCR service, Chhupao blackout, screen-map schema + matcher + 3 sample maps, check step, fading engine, OTP guard, IndexedDB library, Web Share util, Vitest tests | **agy-media batch** (clay icons, helper hand, empty states, logo). Haiku: design tokens, fonts, layout shell, Welcome + Home screens (mock engine) | Record voice clips; write the remaining 7 screen maps from tonight's screenshots | ✅ scaffold (AG) · ✅ UI shell |
| **10:45–11:15** | – | **Opus reviews Round 1** (diff, `npm test`, build, security) → Haiku applies fixes | Learn the engine code (who explains what) | ✅ R1 reviewed |
| **11:15–12:30** | **Round 2, AI models:** Whisper worker + task matcher (Urdu/Roman/English keywords), Florence-2 grounding + confidence, Opus-MT captions + dictionary fallback, model preload/cache manager with progress events, `buildLesson()` timeline data, tests | Haiku: **3D phone scene** (R3F), lesson player with GSAP timeline (finger, dolly, spotlight, captions, audio) on mock lessons; Ask screen + Chhupao draw UI | Test the models on the iPhone (the **device decision by 12:00**); add the maps to `src/data` | ✅ R2 · ✅ player |
| **12:30–13:00** | – | **Opus reviews Round 2** → Haiku fixes → **integrate the real engine into the UI: first full loop** | Device test | ✅ "core loop works" |
| 13:00–13:30 | – | Break / Opus does a rubric check against the live app | Break + phone test | |
| **13:30–14:30** | **Round 3, Hardening + family sync:** multi-screen chaining, error states (mic denied, model load fail, unreadable screen), progress stats API (feeds Meri Taraqqi + the judge dashboard), progress card image, **Firebase Google sign-in (child), QR/code family linking, progress-only sync, sharing switch + delete, `firestore.rules` + emulator tests**, sample judge-mode data, MP4 export (stretch), Playwright smoke test, pause 3D during inference | Haiku: Shabash 3D celebration, Meri Videos 3D shelf + list mode, **Meri Taraqqi trophy shelf**, safety screen, settings (text size, contrast, Simple mode, sharing switch) | Consent copy (including the sync explanation); prepare the demo script | ✅ R3 · ✅ screens |
| **14:30–15:00** | – | Haiku: **family dashboard (child)**, linking screens (QR + code), judge dashboard; **Opus reviews Round 3 + carefully reviews `firestore.rules`** → Haiku fixes | Test linking with 2 devices (one Google account) | ✅ dashboards |
| **15:00–15:15** | – | Full UI review (Claude browser at 375px and 1440px, reduced motion, contrast) → Haiku fixes | Full demo run on the phone + laptop | ✅ fixes |
| **15:15–15:45** | – | Polish pass (micro-transitions, copy, loading states). **Feature freeze at 15:45** | | ✅ polish |
| **15:45–16:15** | – | Deploy to Vercel; `/security-review` before the final push | Preload models on the demo devices; 2 full rehearsals | ✅ deploy |
| **16:15–16:45** | – | – | **Record the video** | |
| **16:45–16:55** | – | README final (AI disclosure, model licences, limits, **final commit hash**) | Check links, **submit on Hackathon Hub** | ✅ final |
| 16:55–17:00 | – | – | Buffer. **No commits after 5:00 PM** | |

**Rule:** Antigravity gets **one round per milestone**. Whatever it gets wrong is fixed by Haiku from Opus's fix list, never sent back. If Antigravity is unavailable, ask the team; Claude doesn't build the engine unless you say so.

---

## 7. Review checklist (Opus, every round)
- `npm run build`, `npm test` and lint pass; the full `git diff` has been read.
- Contracts are respected. **Only** the progress fields go to Firestore, only when the sharing switch is on; screenshots, voice and OCR text never leave the device (search for `fetch(`, Firestore writes and any non-model URLs).
- `firestore.rules`: deny by default; family-member reads only; elder-device writes only to its own progress; field allow-list; emulator tests pass.
- No secrets; inputs validated (Zod); errors handled with gentle UI states.
- Every core feature in §2 is checked against its acceptance criteria.
- UI checks:
  - every action is an HTML control
  - targets 56px or more, contrast 7:1, Urdu RTL is correct
  - reduced motion and Simple mode work
  - layout works at 375px and 1440px
  - the 3D loop pauses during inference
- Rubric pass: teaches rather than does · specific user · readable · trust is explained · works reliably · clear demo.

---

## 8. Demo video (≤ 2:00)
1. **0:00–0:15:** an interview quote + the problem ("help is asked and forgotten").
2. **0:15–1:10:**
   - Ammi asks by voice → screenshot → hides her number.
   - The **3D phone zooms in and the finger shows the button** with an Urdu voice.
   - She taps the real app → next screenshot → **Shabash**.
3. **1:10–1:25:** the same task again → only a glow → "Aap ko aata hai!"
4. **1:25–1:40:** airplane mode (works offline) · OTP screen warning · **the son's family dashboard: "Ammi ne video call khud kar li!" (Ammi made the video call herself)**, with the note that only progress is shared, by her choice.
5. **1:40–2:00:** why it's new (big-tech AI forgets; we check and fade) + which device it runs on + tagline.

---

## 9. README checklist (rulebook §7)
Title and team · user and problem · features · setup and run · stack · **AI disclosure** (Antigravity/Gemini, Claude, on-device models with licences: Whisper (MIT), Florence-2 (MIT), Opus-MT (CC-BY 4.0), Tesseract (Apache-2.0)) · credits (fonts, icons generated by Antigravity) · limits (fully reliable only on mapped screens; she chooses the screenshot; device notes) · **privacy section:** what is synced (progress fields only), why, default off, how to turn it off and delete · Firebase in the dependencies · final commit hash.

---

## 10. Tonight (no project code)
- [ ] Interview 2–3 parents (stuck screens, feelings, exact quotes) + 2 children.
- [ ] Take screenshots of the 10 target screens (WhatsApp, camera, JazzCash) on an iPhone, in English **and** Urdu phone language.
- [ ] Urdu voice script (about 40 lines), and choose who records.
- [ ] Test the public transformers.js demos (Whisper, Florence-2) in iPhone Safari.
- [ ] Check the ONNX models exist on Hugging Face (Whisper-base, Florence-2-base-ft, Opus-MT en-ur).
- [ ] Antigravity app is working and signed in; Node 20+ installed; Vercel account.
- [ ] **Firebase (a team member does this; settings only, no code):** create a project on the Spark plan → turn on **Google** and **Anonymous** sign-in → create a Firestore database → add `localhost` and the Vercel domain to the authorised domains → keep the web config ready to paste tomorrow (it's public config, not a secret, but don't commit any service-account keys).
- [ ] Read GuideMe (CHI 2026); confirm the "same idea" rule with the organisers.

---

## 11. Risks and fallbacks
| Risk | Fallback |
|---|---|
| 3D + AI too heavy on the iPhone | Simple mode switches on automatically on the phone; the full 3D runs on the laptop for the judges; say so in the video |
| Models fail on iPhone Safari | `whisper-tiny`; run the AI parts on a laptop or Android Chrome for the demo |
| An Antigravity round fails or times out | Opus reviews what exists; Haiku finishes from the fix list |
| Whisper mishears | Show "Aap ne kaha: …" (you said: …) to confirm; the task cards are always on screen |
| Florence-2 points wrong | Used only on unmapped screens + a confidence threshold → Family se poochein |
| No Opus-MT ONNX build | Dictionary of about 200 words |
| Firebase sign-in or linking breaks | Turn off #22–23; Meri Taraqqi + the family progress card (WhatsApp) still show progress; say "family sync = planned" in the README |
| Running late | Cut in this order: Map Studio → MP4 → judge dashboard → **family sync (keep the progress card)** → the 3D shelf (keep the list) → Opus-MT (keep the dictionary). **Never cut:** core loop, check step, fading, 3D lesson player, README, video |
