# /// script
# requires-python = ">=3.10"
# dependencies = ["torch", "transformers>=4.40", "numpy", "scipy"]
# ///
"""Pre-generate the Urdu voice clips for Ishaara with Meta MMS-TTS.

Run from anywhere:
    uv run scripts/pregen_voice.py           # skips clips that are already up to date
    uv run scripts/pregen_voice.py --force   # regenerates every clip

Writes public/voice/<key>.wav (16-bit mono PCM at the model rate, 16 kHz) and
public/voice/manifest.json in the shape src/ai/voice.ts reads:

    { "<key>": { "file": "<key>.wav", "text": "<urdu text>" } }

Keys come from src/data/phrases.json (key -> text) and from src/data/maps/*.json:
each step's `voice` file name gives the key, `captionUr` -> <key>, `whyUr` -> <key>_why.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import torch
from scipy.io import wavfile
from transformers import AutoTokenizer, VitsModel

MODEL_ID = "facebook/mms-tts-urd-script_arabic"
SEED = 0
MIN_DURATION_S = 0.3
MIN_RMS = 0.005

ROOT = Path(__file__).resolve().parent.parent
MAPS_DIR = ROOT / "src" / "data" / "maps"
PHRASES_PATH = ROOT / "src" / "data" / "phrases.json"
OUT_DIR = ROOT / "public" / "voice"
MANIFEST_PATH = OUT_DIR / "manifest.json"


def voice_key(voice_file: str) -> str:
    """Same rule as voiceKey() in src/core/voiceSelect.ts: 'wa_photo_2.mp3' -> 'wa_photo_2'."""
    normalized = voice_file.replace("\\", "/")
    filename = normalized.rsplit("/", 1)[-1]
    dot = filename.rfind(".")
    return filename[:dot] if dot > 0 else filename


def collect_items() -> dict[str, str]:
    """Return {key: urdu_text} for every clip the app can ask for, in a stable order."""
    items: dict[str, str] = {}

    phrases = json.loads(PHRASES_PATH.read_text(encoding="utf-8"))
    for key, text in phrases.items():
        if isinstance(text, str) and text.strip():
            items[key] = text.strip()

    for map_file in sorted(MAPS_DIR.glob("*.json")):
        content = json.loads(map_file.read_text(encoding="utf-8"))
        tasks = content.get("tasks")
        if not isinstance(tasks, dict):
            continue
        for steps in tasks.values():
            if not isinstance(steps, list):
                continue
            for step in steps:
                voice = step.get("voice")
                key = voice_key(voice) if voice else ""
                if not key:
                    continue
                caption = step.get("captionUr")
                if isinstance(caption, str) and caption.strip():
                    items[key] = caption.strip()
                why = step.get("whyUr")
                if isinstance(why, str) and why.strip():
                    items[f"{key}_why"] = why.strip()
    return items


def normalize(text: str, vocab: set[str]) -> tuple[str, set[str]]:
    """Make text speakable by the character-level MMS tokenizer.

    Punctuation, symbols and emoji (Urdu ، ؟ ۔ ! …, 🔊 etc.) become spaces.
    Anything else the tokenizer has no symbol for is dropped and returned for reporting.
    """
    out: list[str] = []
    dropped: set[str] = set()
    for ch in unicodedata.normalize("NFC", text):
        category = unicodedata.category(ch)
        if category[0] in "PS" or category == "Zs" or ch.isspace():
            out.append(" ")
        elif ch in vocab:
            out.append(ch)
        else:
            dropped.add(ch)
    spoken = re.sub(r"\s+", " ", "".join(out)).strip()
    return spoken, dropped


def check_wav(path: Path, sample_rate: int) -> tuple[bool, str]:
    """Re-read a written clip from disk and apply the duration and loudness checks."""
    try:
        rate, data = wavfile.read(str(path))
    except Exception as exc:  # unreadable or truncated file
        return False, f"unreadable: {exc}"
    if rate != sample_rate:
        return False, f"sample rate {rate} != {sample_rate}"
    if data.ndim != 1 or data.dtype != np.int16:
        return False, "not 16-bit mono"
    duration = data.size / rate
    rms = float(np.sqrt(np.mean((data.astype(np.float64) / 32768.0) ** 2))) if data.size else 0.0
    if duration < MIN_DURATION_S:
        return False, f"too short ({duration:.2f} s)"
    if rms <= MIN_RMS:
        return False, f"near-silent (RMS {rms:.4f})"
    return True, f"{duration:.2f} s, RMS {rms:.4f}"


def synthesize(model: VitsModel, tokenizer, text: str) -> np.ndarray:
    torch.manual_seed(SEED)
    inputs = tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        waveform = model(**inputs).waveform
    return waveform.squeeze().cpu().numpy().astype(np.float32)


def write_wav(path: Path, audio: np.ndarray, sample_rate: int) -> tuple[bool, str]:
    if audio.size == 0 or not np.all(np.isfinite(audio)):
        path.unlink(missing_ok=True)
        return False, "empty or non-finite model output"
    pcm = np.round(np.clip(audio, -1.0, 1.0) * 32767.0).astype(np.int16)
    wavfile.write(str(path), sample_rate, pcm)
    ok, info = check_wav(path, sample_rate)
    if not ok:
        path.unlink(missing_ok=True)
    return ok, info


def load_previous_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {}
    try:
        data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def main() -> int:
    parser = argparse.ArgumentParser(description="Pre-generate Urdu voice clips (MMS-TTS).")
    parser.add_argument("--force", action="store_true", help="regenerate every clip")
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")  # Urdu text in the log on Windows consoles
    torch.manual_seed(SEED)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    items = collect_items()
    print(f"Collected {len(items)} voice texts from phrases.json and maps/*.json.")

    print(f"Loading {MODEL_ID} (first run downloads about 150 MB) ...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = VitsModel.from_pretrained(MODEL_ID).eval()
    sample_rate = int(model.config.sampling_rate)
    vocab = set(tokenizer.get_vocab().keys())
    print(f"Model ready: {sample_rate} Hz, device cpu, vocab {len(vocab)} symbols.")

    previous = load_previous_manifest()
    manifest: dict[str, dict[str, str]] = {}
    generated = 0
    skipped = 0
    empty: list[str] = []
    failures: list[str] = []
    dropped_symbols: set[str] = set()

    for key, text in items.items():
        path = OUT_DIR / f"{key}.wav"

        # Skip only when the clip exists, its manifest text is unchanged and it passes the checks.
        if path.exists() and not args.force and previous.get(key, {}).get("text") == text:
            ok, info = check_wav(path, sample_rate)
            if ok:
                manifest[key] = {"file": path.name, "text": text}
                skipped += 1
                continue

        spoken, dropped = normalize(text, vocab)
        dropped_symbols |= dropped
        if not spoken:
            empty.append(key)
            print(f"  [{key}] skipped: nothing speakable left after normalising")
            continue

        try:
            audio = synthesize(model, tokenizer, spoken)
            ok, info = write_wav(path, audio, sample_rate)
        except Exception as exc:  # keep going, report at the end
            path.unlink(missing_ok=True)
            failures.append(f"{key}: {exc}")
            print(f"  [{key}] FAILED: {exc}")
            continue

        if not ok:
            failures.append(f"{key}: {info}")
            print(f"  [{key}] FAILED sanity check: {info}")
            continue

        manifest[key] = {"file": path.name, "text": text}
        generated += 1
        print(f"  [{key}] {info}")

    tmp_manifest = MANIFEST_PATH.with_suffix(".json.tmp")
    tmp_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp_manifest, MANIFEST_PATH)

    total_bytes = sum((OUT_DIR / entry["file"]).stat().st_size for entry in manifest.values())
    stale = [p.name for p in OUT_DIR.glob("*.wav") if p.name not in {e["file"] for e in manifest.values()}]

    print()
    print("Summary")
    print(f"  clips in manifest : {len(manifest)}  (generated {generated}, reused {skipped})")
    print(f"  total size        : {total_bytes / 1024:.1f} KB across {len(manifest)} wav files")
    print(f"  empty after norm. : {len(empty)} {empty if empty else ''}".rstrip())
    print(f"  failures          : {len(failures)}")
    for failure in failures:
        print(f"    - {failure}")
    if dropped_symbols:
        symbols = ", ".join(f"U+{ord(c):04X}" for c in sorted(dropped_symbols))
        print(f"  dropped symbols   : {symbols}")
    if stale:
        print(f"  unused wav files  : {len(stale)} (not in manifest, left in place)")
    print(f"  manifest          : {MANIFEST_PATH}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
