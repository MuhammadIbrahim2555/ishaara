import type { ScreenMap } from '@/types/contracts'
import { ScreenMapSchema } from '../schema'
import waChats from './wa_chats.json'
import waChat from './wa_chat.json'
import waPhotoPicker from './wa_photo_picker.json'
import waPhotoPreview from './wa_photo_preview.json'

const rawMaps: unknown[] = [waChats, waChat, waPhotoPicker, waPhotoPreview]

export const SCREEN_MAPS: ScreenMap[] = rawMaps.map((raw) => {
  const result = ScreenMapSchema.safeParse(raw)
  if (!result.success) {
    const id = typeof raw === 'object' && raw !== null && 'id' in raw ? String(raw.id) : 'unknown'
    throw new Error(`Invalid screen map "${id}": ${result.error.message}`)
  }
  return result.data as ScreenMap
})

/**
 * Retrieves a screen map by its unique identifier.
 */
export function getMap(id: string): ScreenMap | undefined {
  return SCREEN_MAPS.find((m) => m.id === id)
}
