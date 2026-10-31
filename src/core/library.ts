import { clear, createStore, del, get, keys, set } from 'idb-keyval'
import type {
  LearnEvent,
  Lesson,
  LibraryService,
  ProgressSummary,
  SkillProgress,
  TaskId,
} from '@/types/contracts'
import { emptySkill, nextSkill } from './fading'

const ALL_TASKS: TaskId[] = ['photo', 'video_call', 'voice_note', 'send_money']
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface LibraryOptions {
  now?: () => number
}

/**
 * Creates an offline IndexedDB library service using idb-keyval with a dedicated store.
 */
export function createLibrary(options?: LibraryOptions): LibraryService {
  const store = createStore('ishaara', 'kv')
  const getNow = options?.now ?? (() => Date.now())

  return {
    async list(): Promise<Lesson[]> {
      const allKeys = await keys(store)
      const lessonKeys = allKeys.filter(
        (k): k is string => typeof k === 'string' && k.startsWith('lesson:'),
      )
      const raw = await Promise.all(lessonKeys.map((k) => get<Lesson>(k, store)))
      const lessons = raw.filter((l): l is Lesson => Boolean(l))
      lessons.sort((a, b) => b.updatedAt - a.updatedAt)
      return lessons
    },

    async get(id: string): Promise<Lesson | undefined> {
      return get<Lesson>(`lesson:${id}`, store)
    },

    async save(lesson: Lesson): Promise<void> {
      await set(`lesson:${lesson.id}`, lesson, store)
    },

    async remove(id: string): Promise<void> {
      await del(`lesson:${id}`, store)
    },

    async clear(): Promise<void> {
      await clear(store)
    },

    async skill(task: TaskId): Promise<SkillProgress> {
      const existing = await get<SkillProgress>(`skill:${task}`, store)
      return existing ?? emptySkill(task)
    },

    async logEvent(e: LearnEvent): Promise<void> {
      // 1. Append event to event stream (retain last 500)
      const existingEvents = (await get<LearnEvent[]>('events', store)) ?? []
      existingEvents.push(e)
      const trimmed = existingEvents.slice(-500)
      await set('events', trimmed, store)

      // 2. Update skill progress state
      const currentSkill =
        (await get<SkillProgress>(`skill:${e.task}`, store)) ?? emptySkill(e.task)
      const updatedSkill = nextSkill(currentSkill, e.type, e.at)
      await set(`skill:${e.task}`, updatedSkill, store)
    },

    async progress(): Promise<ProgressSummary> {
      const now = getNow()
      const cutoff = now - SEVEN_DAYS_MS

      const skills = await Promise.all(
        ALL_TASKS.map(async (task) => {
          const s = await get<SkillProgress>(`skill:${task}`, store)
          return s ?? emptySkill(task)
        }),
      )

      const events = (await get<LearnEvent[]>('events', store)) ?? []
      const recentEvents = events.filter((e) => e.at >= cutoff)

      const learnedCount = skills.filter((s) => s.level === 3 && !s.stuck).length
      const weeklyCompleted = recentEvents.filter((e) => e.type === 'done').length
      const callsSavedThisWeek = recentEvents.filter(
        (e) => (e.type === 'pass' && e.level >= 2) || e.type === 'replay',
      ).length

      return {
        skills,
        learnedCount,
        weeklyCompleted,
        callsSavedThisWeek,
      }
    },
  }
}
