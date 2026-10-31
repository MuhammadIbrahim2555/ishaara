import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Lesson } from '@/types/contracts'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { Screen } from '@/ui/components/Screen'
import { Localized } from '@/ui/components/UrduText'
import { langAttrs, useLang } from '@/ui/i18n'
import { services } from '@/ui/services'
import { S } from '@/ui/strings'
import { useUiStore, type Lang } from '@/ui/store'

/** Short date in the UI language, with Latin digits in both. */
function formatDate(ms: number, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'ur' ? 'ur-PK' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(ms))
}

export function Library() {
  const navigate = useNavigate()
  const lang = useLang()
  const setSession = useUiStore((s) => s.setSession)
  const [lessons, setLessons] = useState<Lesson[] | null>(null)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true
    void services.library.list().then((list) => {
      if (alive) setLessons(list)
    })
    return () => {
      alive = false
    }
  }, [])

  // Object URLs for thumbnails, revoked when the list changes or the screen unmounts.
  useEffect(() => {
    if (!lessons) return
    const urls: Record<string, string> = {}
    for (const lesson of lessons) {
      const image = lesson.parts[0]?.image
      if (image) urls[lesson.id] = URL.createObjectURL(image)
    }
    setThumbs(urls)
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url)
    }
  }, [lessons])

  return (
    <Screen nav>
      <BackBar title={S.libraryTitle} to="/home" />

      {lessons && lessons.length === 0 && (
        <section className="flex flex-col items-center gap-5 text-center">
          <img src="/assets/empty-library.webp" alt="" className="h-auto w-full max-w-[16rem]" />
          <Localized as="h2" p={S.libraryEmpty} className="text-ur-title" />
          <Localized as="p" p={S.libraryEmptyBody} className="text-ur-body" />
          <BigButton label={S.goHome} onClick={() => navigate('/home')} />
        </section>
      )}

      {lessons && lessons.length > 0 && (
        <ul className="flex flex-col gap-3">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                to={`/lesson/${lesson.id}`}
                onClick={() => setSession({ currentLessonId: lesson.id })}
                className="flex min-h-24 items-center gap-4 rounded-panel bg-surface p-3 shadow-raised transition-shadow duration-[180ms] hover:shadow-lifted"
              >
                {thumbs[lesson.id] ? (
                  <img
                    src={thumbs[lesson.id]}
                    alt=""
                    className="size-20 shrink-0 rounded-[16px] bg-surface-sunk object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-20 shrink-0 rounded-[16px] bg-surface-sunk"
                  />
                )}
                <span className="flex min-w-0 flex-col gap-1">
                  <Localized
                    as="span"
                    p={S.tasks[lesson.task]}
                    className="text-ur-body font-bold leading-[1.8]"
                  />
                  <span {...langAttrs(lang)} className="text-label text-ink-soft">
                    {formatDate(lesson.createdAt, lang)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  )
}
