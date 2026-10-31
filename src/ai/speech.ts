import type { SpeechResult, SpeechService } from '@/types/contracts'
import { blobToPcm16k } from '@/ai/audio'
import { matchIntent } from '@/core/intent'

export interface SpeechModels {
  worker: {
    transcribe(pcm: Float32Array): Promise<string>
  }
}

/**
 * Creates the speech-to-text service that transcribes audio via Whisper worker
 * and infers the user task intent. Never throws; returns empty result on error.
 */
export function createSpeech(models: SpeechModels): SpeechService {
  return {
    async transcribe(audio: Blob): Promise<SpeechResult> {
      try {
        const pcm = await blobToPcm16k(audio)
        const text = await models.worker.transcribe(pcm)
        const result = matchIntent(text)
        return {
          text,
          task: result.task,
          confidence: result.confidence,
          source: 'whisper',
        }
      } catch {
        return {
          text: '',
          task: null,
          confidence: 0,
          source: 'whisper',
        }
      }
    },
    mode(): 'gemini' | 'whisper' {
      return 'whisper'
    },
    setOnline(_enabled: boolean): void {},
  }
}
