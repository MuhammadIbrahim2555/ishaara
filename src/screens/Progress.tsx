import { useEffect, useState, type CSSProperties } from 'react'
import type { FadeLevel, ProgressSummary, SkillProgress, TaskId } from '@/types/contracts'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { BiLabel } from '@/ui/components/BiLabel'
import { Hint } from '@/ui/components/Hint'
import { Screen } from '@/ui/components/Screen'
import { Localized } from '@/ui/components/UrduText'
import { useObjectUrl } from '@/ui/hooks/useObjectUrl'
import { useLang } from '@/ui/i18n'
import { IconShare } from '@/ui/icons'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'
import { TASK_IMAGE, TASK_ORDER } from '@/ui/tasks'

/** Shelf level: 0 = not practised yet, otherwise the skill's fade level. */
type ShelfLevel = 0 | FadeLevel

const COPY = {
  shelfTitle: { ur: 'میری کامیابیاں', en: 'My achievements' },
  notStarted: { ur: 'ابھی شروع نہیں کیا', en: 'Not started yet' },
  share: { ur: 'بچوں کو دکھائیں', en: 'Show my children' },
  download: { ur: 'تصویر محفوظ کریں', en: 'Save the picture' },
  close: { ur: 'بند کریں', en: 'Close' },
  cardAlt: { ur: 'اشارہ کا ترقی کارڈ', en: 'Ishaara progress card' },
}

/** Text sent with the progress card when sharing. */
const SHARE_TEXT: Pair = {
  ur: `${S.progressTitle.ur} — ${S.appName.ur}`,
  en: `${S.progressTitle.en} — ${S.appName.en}`,
}

function skillFor(summary: ProgressSummary, task: TaskId): SkillProgress | undefined {
  return summary.skills.find((s) => s.task === task)
}

function shelfLevel(skill: SkillProgress | undefined): ShelfLevel {
  if (!skill || skill.timesPracticed === 0) return 0
  return skill.level
}

function badgeStyle(level: ShelfLevel, glow: boolean): CSSProperties | undefined {
  if (level === 0) return { filter: 'grayscale(1)', opacity: 0.45 }
  if (glow) return { boxShadow: '0 0 0 4px var(--saffron)' }
  return undefined
}

function ShelfBadge({ task, level, stuck }: { task: TaskId; level: ShelfLevel; stuck: boolean }) {
  const glow = level === 3 && !stuck
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative size-24">
        <img
          src={TASK_IMAGE[task]}
          alt=""
          className="size-24 rounded-[28px] bg-page object-contain"
          style={badgeStyle(level, glow)}
        />
        {glow && (
          <img src="/assets/icon-star.webp" alt="" className="absolute -top-2 -end-2 size-7" />
        )}
      </div>
      <BiLabel label={S.tasks[task]} />
      <BiLabel
        label={level === 0 ? COPY.notStarted : S.levels[level]}
        className={level === 3 ? 'text-success' : 'text-ink-soft'}
      />
    </div>
  )
}

export function Progress() {
  const lang = useLang()
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<'unsupported' | 'error' | null>(null)
  const [card, setCard] = useState<Blob | null>(null)
  const cardUrl = useObjectUrl(card)

  useEffect(() => {
    let alive = true
    void services.library.progress().then((s) => {
      if (alive) setSummary(s)
    })
    return () => {
      alive = false
    }
  }, [])

  async function shareProgress() {
    setBusy(true)
    setNotice(null)
    try {
      const blob = await services.progressCard(await services.library.progress(), {})
      const result = await services.share.shareImage(blob, SHARE_TEXT[lang])
      if (result === 'unsupported') {
        setCard(blob)
        setNotice('unsupported')
      }
    } catch {
      setNotice('error')
    } finally {
      setBusy(false)
    }
  }

  function closeCard() {
    setCard(null)
    setNotice(null)
  }

  return (
    <Screen nav>
      <BackBar title={S.progressTitle} to="/home" />

      {summary && (
        <>
          <img src="/assets/icon-trophy.webp" alt="" className="mx-auto h-auto w-32" />
          <Localized
            as="p"
            p={S.learnedCount(summary.learnedCount)}
            className="text-center text-ur-title"
          />

          {summary.skills.length === 0 && (
            <section className="flex flex-col items-center gap-3 text-center">
              <Localized as="h2" p={S.progressEmpty} className="text-ur-title" />
              <Localized as="p" p={S.progressEmptyBody} className="text-ur-body" />
            </section>
          )}

          <section aria-label={COPY.shelfTitle[lang]} className="flex flex-col gap-4">
            <Localized as="h2" p={COPY.shelfTitle} className="text-ur-title" />
            <div className="rounded-panel bg-surface-sunk px-4 pt-6 pb-5 shadow-[inset_0_-8px_0_0_rgba(60,40,20,0.08)]">
              <div aria-hidden="true" className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
                {TASK_ORDER.map((task) => {
                  const skill = skillFor(summary, task)
                  return (
                    <ShelfBadge
                      key={task}
                      task={task}
                      level={shelfLevel(skill)}
                      stuck={skill?.stuck ?? false}
                    />
                  )
                })}
              </div>
            </div>
            <ul className="sr-only">
              {TASK_ORDER.map((task) => {
                const level = shelfLevel(skillFor(summary, task))
                return (
                  <li key={task}>
                    <Localized as="span" p={S.tasks[task]} />
                    {' — '}
                    <Localized as="span" p={level === 0 ? COPY.notStarted : S.levels[level]} />
                  </li>
                )
              })}
            </ul>
          </section>

          <div className="flex flex-col gap-4">
            <BigButton
              label={COPY.share}
              icon={<IconShare />}
              loading={busy}
              onClick={() => void shareProgress()}
            />

            {notice === 'error' && <Hint tone="coral" pair={S.notUnderstood} />}
            {notice === 'unsupported' && <Hint pair={S.shareUnsupported} />}

            {card && cardUrl && (
              <section
                aria-label={COPY.share[lang]}
                className="flex flex-col gap-4 rounded-panel bg-surface-sunk p-4 shadow-raised"
              >
                <img
                  src={cardUrl}
                  alt={COPY.cardAlt[lang]}
                  className="h-auto w-full rounded-[16px]"
                />
                <a
                  href={cardUrl}
                  download="ishaara-progress.png"
                  className="flex min-h-16 items-center justify-center rounded-control border-2 border-teal-900 bg-surface px-6 py-3 text-teal-900 transition duration-[180ms] hover:bg-teal-100"
                >
                  <BiLabel label={COPY.download} />
                </a>
                <BigButton variant="secondary" label={COPY.close} onClick={closeCard} />
              </section>
            )}
          </div>
        </>
      )}
    </Screen>
  )
}
