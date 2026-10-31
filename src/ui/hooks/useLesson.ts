import { useEffect, useState } from 'react'
import type { Lesson, LessonPart } from '@/types/contracts'
import { services } from '@/ui/services'

/** The part a learner works on: the last screen of the lesson. */
export function lastPart(lesson: Lesson): LessonPart | undefined {
  return lesson.parts[lesson.parts.length - 1]
}

/** Loads a lesson from the library. undefined while loading, null when it does not exist. */
export function useLesson(id: string): Lesson | null | undefined {
  const [loaded, setLoaded] = useState<{ id: string; lesson: Lesson | null } | null>(null)

  useEffect(() => {
    let alive = true
    services.library.get(id).then(
      (found) => {
        if (alive) setLoaded({ id, lesson: found ?? null })
      },
      () => {
        if (alive) setLoaded({ id, lesson: null })
      },
    )
    return () => {
      alive = false
    }
  }, [id])

  if (!loaded || loaded.id !== id) return undefined
  return loaded.lesson
}
