# Build4Better: Research Findings

Compiled 30 Oct 2026 from 10 web-research agents run in two rounds. Most findings come from search snippets, so **open each source and check the number before you put it on a slide or in the README.**

---

## 0. Event rules that shape the idea
- Online, Saturday 31 Oct 2026, 9:00 AM to 5:00 PM PKT (8 hours). Teams of 2 to 4.
- New GitHub repo at the start of the build window, with commits spread through the day. History is tracked, and a single final commit is a red flag.
- Demo video of **2 minutes or less** (mandatory, important), plus live judging.
- The README must cover: title, team, target user and problem, features, setup, stack, AI tools used, credits, limitations or mocked parts, and the final commit hash.
- AI use is allowed but must be disclosed. The team must be able to explain the code.
- The organisers also said that **an idea that is the same as another team's means disqualification**, and the idea must be unique and solve an unsolved real problem.

**Rubric:** Ideation 20%; Target user 16%; Design and UI 16%; Trust, safety and privacy 16%; Execution 16%; Impact and presentation 16%.
- Ideation 5 = custom idea built around *helping people learn*, not doing the task for them.
- Target user 5 = real evidence (interviews, personas, observed scenarios).
- Design 5 = large text, high contrast, plain language, few steps, forgiving navigation, voice, local language.

---

## ROUND 1: Testing the first ideas

### Agent 1: Is "play the scammer" (Chor Ki Nazar) new?
**Verdict: NOT new.** The mechanic already exists.
- Scamboo, a card game where you play the scammer: https://mechanicsofmagic.com/2026/10/14/designing-scamboo-think-like-a-scammer-learn-to-defend/
- Gametize "Aging population / Scammee", aimed at elderly players: https://corp.gametize.com/2024/12/23/aging-population-scammee
- "Watch Out For Your Pension" (itch.io): https://ruobingdu.itch.io/watch-out-for-your-pension
- Scammer Simulator: https://cucas-interactive.itch.io/scamer-simulator
- ImmuniFraug, where AI plays the scammer: https://arxiv.org/pdf/2601.06774
- Sentinel, an AI scam-call simulation: https://arxiv.org/pdf/2608.24778
- ROLESafe (CHI '26, 144 older adults in China) uses an LLM scammer with the elder in the victim role: https://arxiv.org/abs/2601.12324
- ShieldUp!: https://arxiv.org/pdf/2503.12341
- Bad News, Go Viral and Harmony Square: the player creates misinformation, and this is proven to work.
- Be Scam Ready (Google with Filament Games): https://www.filamentgames.com/project/be-scam-ready
- **Pakistan:** Meta and PTA run an "Is This Legit?" campaign covering 7 scam categories, plus Easypaisa's "Pin Chors" campaign: https://propakistani.pk/2025/10/17/meta-and-pta-collaborate-to-launch-is-this-legit-anti-scam-campaign-for-a-safer-more-informed-online-community-in-pakistan/

### Agent 2: Are Haath Ka Hunar and Ulta Ustad new?
- **Haath Ka Hunar (comparisons from the person's own trade):** no app found, but teaching through analogy is known research, so a judge could say "not new".
  - Micocci & Spinelli 2018: https://www.researchgate.net/publication/332363718
  - Spatial-metaphor phone menus: https://link.springer.com/chapter/10.1007/978-3-642-21675-6_77
  - Caveat: one study found analogies no better than plain instructions.
- **Ulta Ustad (grandparent teaches, learns tech along the way):** this framing was not found. Story-saving apps do exist: Remento, Storii, Yaranga (https://yaranga.net), Mon Livre de Vie, LifeBio and MemoryWell. None of them uses the recording as a way to learn tech skills.
  - The name "Ustaad" is already used by a teaching platform: https://dl.ifip.org/IFIP-LNCS/hal-02544602v1
  - Supporting evidence: Cyber-Seniors reverse mentoring improved confidence: https://cyberseniors.org/wp-content/uploads/2020/01/Implementing-reverse-mentoring-to-address-social-isolation-among-older-adults.pdf
  - Senior Planet with Remento: https://oats.org/capturing-life-stories-through-technology-at-senior-planet/
  - Pakistan: Saathi, an Urdu voice assistant for elders: https://link.springer.com/chapter/10.1007/978-3-031-09593-1_6

### Agent 3: Pakistan facts
**Cybercrime complaints** (sources disagree, so cite one source per number):
- ProPakistani, 21 May 2026: 2023: 134,710 · 2024: 161,828 · 2025: 157,465 · 2026 so far: 77,023. Total 523,749 complaints and only 199 convictions (about 0.04%). https://propakistani.pk/2026/05/21/pakistans-cybercrime-conviction-rate-stayed-below-0-04-despite-523000-complaints/
- 2025 per the Interior Minister: 142,272 complaints. https://propakistani.pk/2025/12/01/pakistanis-file-over-142000-cybercrime-complaints-in-2025/amp/
- 2025: 81,996 financial-fraud complaints, PKR 2.716 bn (needs checking): https://thepenpk.com/cybercrime-complaints-top-150000-in-2025-na-told
- PTA 2024: 19,730 users warned and 5,294 numbers blocked: https://tribune.com.pk/story/2573226/rising-impersonation-scams-threaten-digital-economy

**Real scam scripts:**
- BISP prize SMS for about Rs25,200. Genuine BISP messages come only from 8171.
- JazzCash "lucky draw": the caller says your balance will be doubled and asks for the code. Source: Tribune.
- Fake school WhatsApp group: the victim clicks a link, the account is hijacked, then contacts are asked for money. Source: Tribune.
- "Your account is blocked": the caller asks for the MPIN or code. JazzCash and Easypaisa never ask for these.
- Spoofed helpline numbers.

**People:**
- GSMA 2025: women's mobile internet use reached 45% in 2024, with about 8 million women coming online that year: https://www.dawn.com/news/1911146
- Tribune (cyber officer): the elderly are the easiest targets.
- No checked news story was found of an elderly Pakistani losing money to a scam.

### Agent 4: Research and design rules
- **Inoculation works:** Bad News (about 15k people) reduced trust in fake headlines by about 21%. It works across cultures, but the effect fades after about 2 months unless boosted.
- ⚠️ **Writing scams yourself can backfire:** Zheng & Becker (UCL, 2023, 183 people) found that participants who wrote a phish were **about 3× more likely** to fall for one later. https://discovery.ucl.ac.uk/10175677/1/Zheng_phishing_2023.pdf
- Conventional phishing training didn't help (Lain et al., IEEE S&P 2022, 19k staff).
- **Why older people fall for scams:** cognitive decline, loneliness, trust in authority, reciprocity tricks (Toronto 2017; Frontiers 2021).
- **Design numbers:**
  - Touch targets at least 44×44 px (WCAG AAA).
  - Contrast at least 4.5:1, aiming for 7:1.
  - Body text at least 18 px.
  - Text resizable to 200%.
  - In NN/g usability tests, older users completed about 55% of tasks vs about 75% for younger users.
  - Avoid jargon.

### Agent 5: Past hackathons and technical feasibility
- **The most crowded idea at past hackathons is scam detection:** ScamTalk, Scampot, ScamShield, Scam Spook, Cyber Safety for Seniors, Shield Seniors. Also common: simplified portals, check-in alerts and video calling.
- **Winners:** simple tools with a clear caregiver link and a strong video showing real impact.
- **Urdu voice:** browser text-to-speech and speech recognition for Urdu are NOT reliable (only partial support on Android). Azure has Urdu voices (ur-PK-UzmaNeural / AsadNeural). **Pre-record or pre-generate the audio.**
- **AI model:** Gemini has the best evidence for Urdu and Roman Urdu.
- **Stack:** Vite or React (or Next.js) on Vercel. Font: Noto Nastaliq Urdu with `dir="rtl"` and a line height of at least 1.8.

---

## ROUND 2: Looking for an UNSOLVED problem

### Agent 6: Gaps that published research calls open
1. **Learned steps are lost after app or UI updates.** No study has followed this over time (ExplorAR 2025; Leung 2010).
2. **Family helpers ("warm experts") are uneven.** The 2025 paper says they "should not be the sole solution" but offers no tested alternative. https://jyx.jyu.fi/handle/123456789/106496
3. **Help that teaches instead of doing it for them:** Barber et al., CHI 2025 (https://discovery.ucl.ac.uk/id/eprint/10205567) and Laznik et al., IJHCI 2025 cover banking only.
4. **Support reduces the fear of hassle but not the fear of personal failure** (JMIR Aging 2026).
5. **Shame and saving face:** older adults save up their questions so they don't burden anyone. **No design has been shown to reduce this.** ASSETS '19: https://faculty.washington.edu/wobbrock/pubs/assets-19.03.pdf
6. Older adults with low literacy: no proven learning design exists.

### Agent 7: Pakistan-specific unsolved problems
- **28% of women who use mobile internet only get online through someone else's phone** (4% of men). Women's phone ownership is 68% vs 93% for men, the widest gap surveyed. Family disapproval is 23%, the highest of 14 countries (GSMA 2026). https://www.arabnews.pk/pakistan/pakistan-narrows-mobile-gender-gap-but-28-of-women-still-rely-on-borrowed-phones-report-2649428
- **Ageing fingerprints fail BISP and NADRA checks.** Elderly women make repeat trips (Shangla, Dec 2025). Face recognition was added in March 2026, but nothing prepares elders for the check. https://www.nation.com.pk/29-Dec-2025/bisp-sim-card-distribution-shangla-faces-logistical-hurdlesa
- Sharing PINs with a child or wallet agent: commonly described, but never measured.
- No HCI4D paper stating open problems for older Pakistanis was found. The SPRC Old Age Report 2024 was unreadable.

### Agent 8: What real families say
1. **The parent asks the same question again and again (#1).** Example: a mother asked about a customs card 15 times. https://thespinoff.co.nz/society/13-05-2026/how-did-i-get-the-job-of-24-7-it-support-for-my-parents
2. Support falls on one child: 50% of parents phone their children for help (Kaspersky). Children lack patience (Australia, 750 people). https://phys.org/news/2020-01-seniors-struggle-technology-kids-wont.html
3. Accidental settings changes, then denial.
4. Updates move buttons ("technology caregiving"). An app's "aging mode" was rejected by users.
5. "Is this real?" scam-check calls.
6. Parents hide confusion so they won't be a burden.
7. Remote-help apps are too hard for parents to set up and add scam risk (AARP).
- **Gap:** nothing fixes repeated questions on an ordinary phone without remote control or a new device.

### Agent 9: Are "help call becomes a lesson" and "coach the helper" new?
- **Help call becomes a lesson: PARTIALLY exists in research, not as a product.**
  - HelpCall (CHI 2024) does annotated screenshots and video calls. **Saving and replaying help is listed as future work.** https://www.cs.ubc.ca/~ttaa2021/content/HelpCall/CHI24WorkshopPositionPaper.pdf
  - Breezie, Oscar Senior, Samsung Assist and GrandPad take control of the phone or stream it live. None saves the helper's explanation as a lesson.
  - ⚠️ Similar hackathon projects: OneTap AI (Devpost, voice lessons for seniors), TapSmart (GitHub), TeGuio (DigiEduHack 2025).
- **Coach the helper: real-time or after-session coaching NOT FOUND.** Only static tip blogs exist (hugletters, thetechhelper, techpals).
  - WePilot (CSCW 2025) uses a chatbot to help the parent–child pair, but doesn't coach how the helper teaches. https://chensivan.github.io/papers/CSCW25_WePilot.pdf
- Not yet checked: arXiv 2608.23751, "Technology Caregiving".

### Agent 10: Handing over a task, update lessons, danger meter
- **Danger meter: CROWDED.** ScreenSense (Devpost, screenshot to explanation for seniors), SilverGuide, Be My AI, KinShieldGuard. Drop it.
- **"What changed after the app update": NOT FOUND** as a product. Doable if users upload old and new screenshots. Detecting updates automatically is not practical.
- **Handing over a task without sharing the PIN: PARTIAL.** Lloyds "Trusted Person" card, AARP BankSafe carer logins, and Synapse (HKUST, where the helper demonstrates and the elder repeats). **Nothing similar exists for JazzCash or Easypaisa.**

---

## VERDICT

| Idea | Status |
|---|---|
| Chor Ki Nazar (play the scammer) | ❌ Exists, crowded, and backfire risk |
| Danger meter | ❌ Crowded |
| Haath Ka Hunar | ⚠️ Known concept |
| Ulta Ustad / Sikha Ke Seekho | ✅ Framing is new; story apps exist |
| What changed after an update | ✅ Not found |
| Handing over a task without the PIN (Pakistan) | ⚠️ Pieces exist abroad, none in Pakistan |
| **Ek Baar Samjhao** (help becomes a lesson + coaching the helper) | ✅ **Strongest: top family complaint, named as future work in research, helper coaching not found** |

### Recommended: Ek Baar Samjhao ("explain it once")
1. The parent asks privately: one button, a screenshot, and a voice question in Urdu.
2. The child must teach, not take over: they draw arrows on the screenshot and must record the **why** before sending. There is no remote control.
3. **Meri Kitaab (my book):** each answer becomes a replayable lesson in the family member's voice.
4. A repeated problem becomes a practice round instead of another call.
5. **Helper coaching:** after each answer, the child gets 3 notes (too many steps at once, no "why", and so on).
6. Pakistan fit: works in person too (many families live together), Urdu-first, and lessons stay inside the family, which makes the Trust score easy.

**Pitch:** "Har sawal sirf ek baar." (Every question only once.)

**Present it honestly:** the parts exist separately. What's new is the combination, the forced *why* and the helper coaching.

### Agent 11: arXiv 2608.23751 checked, low overlap
- "Technology Caregiving: Reframing How Older Adults Are Supported in Everyday Digital Activities", Chattopadhyay & Mubashshira, Aug 2026. https://arxiv.org/abs/2608.23751
- It is a systematic review of 36 studies plus a framework (why, who, when, how). It proposes **no system**.
- Findings: helping parents with tech is caregiving, not IT support; it is ongoing; both sides feel the burden; frequent updates break the support. **Cite it as motivation.**
- Near-misses: Meerkat (Tel Aviv University, screenshot + doodle remote help, https://toch.tau.ac.il/meerkat/) and Easierphone (EU AAL). Neither has the required why recording, the lesson book, practice rounds or helper coaching.

---

## ROUND 3: The user's AI idea, "Mujhe Dikhao" ("show me")
The concept: Ammi sends a screenshot and asks by voice in Urdu → AI finds the steps → a short replayable video on her own screenshot (animated finger, highlight, Urdu voiceover explaining why) → she does it herself and sends a new screenshot, which the AI checks → lessons saved in a personal library → help gets shorter with each repeat.

### Agent 12: Big-tech AI assistants
- Gemini Live screen sharing (Android and iOS, free): sees the screen, but no pointing on a shared screen, no saved lesson and no check. Urdu is listed only in 2024 sources.
- Siri in iOS 27 (Sept 2026): sees the screen and can act on it, but gives no lessons.
- ChatGPT voice screen sharing and Copilot Vision (highlights only on Windows desktop): no lessons and no check.
- Close: TechBuddy (techbuddy-lime.vercel.app) claims "upload a screenshot, the AI says what to tap". Synapse (arXiv 2209.09596) highlights the button with audio for older adults.

### Agent 13: Startups, hackathons and research
- Tutorial-video makers for business, not seniors: Guidde (from a screen recording), TechSmith (screenshots → narrated video), Tango, Trupeer, Arcade.
- Senior helpers:
  - ScreenSense (screenshot → spoken explanation)
  - GrannyAI (an AI that acts on the phone)
  - LetsHelp/Auralis (live Gemini screen guidance)
  - Saathi (Urdu voice assistant, the only Urdu precedent)
- Research:
  - ⚠️ **GuideMe (CHI 2026):** an AI that helps older adults learn smartphones using screenshots and voice. **Biggest overlap risk; read the full paper.** https://doi.org/10.1145/3772318.3791448
  - AgeMate (2025): screenshot → step-by-step Tutorial Mode.
- **Not found anywhere:** the full combination, especially **checking her redo with a new screenshot + help that gets shorter with repeats** + a replayable Urdu video on her own screen.

### Agent 14: Feasibility
- iOS web apps can't receive shares from the share sheet → use a file picker that opens Photos (simple and works).
- iOS forbids reading other apps' screens, listing installed apps, or detecting "stuck" → she must send the screenshot herself. That's also a Trust point.
- Gemini returns button positions as `box_2d` = [ymin, xmin, ymax, xmax] on a 0–1000 scale. No official accuracy figure for phone screens → **test on real iPhone screenshots in the first hour.** The free-tier limit is unclear.
- Urdu voice: Azure ur-PK-UzmaNeural / AsadNeural. An Urdu voice in iPhone Safari is not confirmed.
- MP4 export: Safari's recorder (MediaRecorder) supports MP4. Fall back to live playback.

### Round 3 verdict
"AI reads the screen and tells her where to tap" is NOT unique. Unique = **(1) a replayable Urdu video on her own screenshot + (2) the AI checking that she did it herself + (3) help that gets shorter until she doesn't need it + (4) a personal library.** Make the check-and-shrink loop the core of the pitch.

### Open items
- Read GuideMe (CHI 2026) in full before claiming novelty.
- Open the main sources before quoting any number.
- Interview 2–3 parents or grandparents tonight and use their quotes as Target-user evidence.
