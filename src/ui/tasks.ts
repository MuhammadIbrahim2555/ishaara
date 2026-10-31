import type { TaskId } from '@/types/contracts'

export const TASK_ORDER: TaskId[] = ['photo', 'video_call', 'voice_note', 'send_money']

export const TASK_IMAGE: Record<TaskId, string> = {
  photo: '/assets/icon-photo.webp',
  video_call: '/assets/icon-video-call.webp',
  voice_note: '/assets/icon-voice-note.webp',
  send_money: '/assets/icon-send-money.webp',
}
