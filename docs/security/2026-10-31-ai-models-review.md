# Security review — on-device AI model sources and loading, 2026-10-31

**Scope:** uncommitted changes since `c97fd7a`: `src/workers/ai.worker.ts` (Hub model ids, WebGPU/WASM dtypes, single fallback, cache self-heal), `src/core/engine.ts` (vision threshold 0.8), `src/ai/voice.ts`, `src/ai/translate.ts`, `src/core/voiceSelect.ts`, `src/core/index.ts`, Settings model section removed, tests, docs.
**Risk:** MEDIUM (third-party model weights fetched at runtime). Quick triage.

## Checks
- **Supply chain — model weights:** two models come from individual Hugging Face accounts, not official orgs: `fintutto/opus-mt-en-ur` (Apache-2.0, ONNX of Helsinki-NLP/opus-mt-en-ur) and `obaidasiaone/mms-tts-urd-onnx` (ONNX of facebook/mms-tts-urd-script_arabic, CC-BY-NC-4.0). ONNX files are data executed by ONNX Runtime (WASM sandbox in a Web Worker) — no arbitrary code execution, no network access from the model. Worst realistic case: wrong/garbled translation or audio. Outputs were verified in a real browser (correct Urdu translation; 4.6 s clean Urdu speech). Whisper/Florence come from `onnx-community` (Hugging Face).
- **Pinning:** models are fetched from `resolve/main` — a later upload by the repo owner would change what users download. (L9)
- **Data egress:** model downloads only (GET from huggingface.co / CDN). No user data is sent; inference is local. ✅
- **Cache self-heal:** only deletes entries in the app's own `transformers-cache` whose `content-type` is `text/html` (never valid model files). ✅
- **Vision threshold:** raised to 0.8 so a distant, possibly different icon can't replace the map target — safety/UX improvement. ✅
- **No secrets, no new storage of personal data.** ✅

## Findings
| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| L9 | Low | Third-party model repos are referenced by branch (`main`), not by commit, and are owned by individual accounts | Pin a commit `revision` in `from_pretrained` options, or mirror the files into an org-owned Hub repo before a public launch |
| L10 | Info | MMS-TTS Urdu is CC-BY-NC-4.0 (non-commercial) | Fine for the hackathon; replace for commercial use |

**Verdict:** no HIGH/MEDIUM findings. Safe to commit.
