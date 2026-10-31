# Ishaara — Product

> Context inferred from the team's research and planning conversation (no separate interview). Assumptions are marked _(assumed)_.

## What it is

An offline phone tutor for people who did not grow up with technology. The user uploads a screenshot of the screen where they are stuck; Ishaara makes a short Urdu lesson **on their own screenshot** that points at the right button and explains why, checks their next screenshot to confirm they did it themselves, and gives less help each time until they no longer need it. AI runs on the device; screenshots never leave it.

## Users

- **Primary — "Ammi":** Pakistani parent/grandparent, 55–75, owns a smartphone (iPhone or Android), reads Urdu comfortably, English weakly _(assumed)_, uses WhatsApp, camera, sometimes JazzCash. Uses the phone at home, in daylight or warm indoor light, often with reading glasses, one hand holding the phone.
- **Fears:** breaking something, looking foolish, bothering busy children, scams.
- **Secondary — the child/grandchild:** tech-comfortable, wants Ammi to be independent, views her progress (opt-in) on a family dashboard.
- **Tertiary — hackathon judges:** open the live link on a laptop; need a sample mode.

## Jobs

1. "Show me where to tap on _this_ screen, in my language, without making me feel stupid."
2. "Let me try it myself and tell me I got it right."
3. "Let me watch it again later without calling anyone."
4. (Child) "Let me see what Ammi learned and where she's stuck, without spying on her phone."

## Principles

- **Teach, never do.** She always taps the real app herself.
- **Kind by default.** No red errors, no failure language; hints, not corrections.
- **One thing per screen.** One primary action, always a way back.
- **Her phone, her data.** Nothing leaves the device except opt-in progress numbers.
- **Urdu first.** Urdu script primary; English labels secondary for judges and family.

## Success

- She completes a task on the real app after one lesson; the third time she needs no help.
- Fewer "how do I…" calls to her children.

## Platform

Responsive web app (PWA). Phone first (360–430 px), laptop judge layout (≥ 1024 px). Light theme only _(use scene: daylight/indoor, older eyes; dark mode not needed for v1)_.
