import { lazy, Suspense, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Box } from '@/types/contracts'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { FirstRunProgress } from '@/ui/components/FirstRunProgress'
import { Hint } from '@/ui/components/Hint'
import { ImageInput } from '@/ui/components/ImageInput'
import { LessonPlayer2D } from '@/ui/components/LessonPlayer2D'
import { AskFamilyPanel, SafetyPanel } from '@/ui/components/Outcome'
import { Screen } from '@/ui/components/Screen'
import { SceneBoundary } from '@/ui/components/SceneBoundary'
import { SpeakButton } from '@/ui/components/SpeakButton'
import { cn } from '@/ui/cn'
import { lastPart, useLesson } from '@/ui/hooks/useLesson'
import { useObjectUrl } from '@/ui/hooks/useObjectUrl'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'
import { useUiStore } from '@/ui/store'

const ShabashBurst = lazy(() => import('@/scenes/ShabashBurst'))

type Outcome =
  | { kind: 'input' }
  | { kind: 'checking' }
  | { kind: 'pass'; done: boolean }
  | { kind: 'hint'; step: number }
  | { kind: 'safety' }
  | { kind: 'unknown' }

/** Text in the current UI language only. Titles get the heading size; body text gets bodyClass. */
function Copy({
  p,
  as: Tag = 'p',
  variant = 'body',
  className,
}: {
  p: Pair
  as?: 'p' | 'h2' | 'span'
  variant?: 'title' | 'body'
  className?: string
}) {
  const lang = useLang()
  const size =
    variant === 'title'
      ? lang === 'ur'
        ? 'text-ur-title'
        : 'text-[1.75rem] font-bold leading-snug'
      : bodyClass(lang)
  return (
    <Tag {...langAttrs(lang)} className={cn(size, className)}>
      {p[lang]}
    </Tag>
  )
}

/** Learner does the step in the real app, shows the new screen, and gets a verdict. */
export function Check() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromShortcut = searchParams.get('from') === 'shortcut'
  const simple = useUiStore((s) => s.settings.simpleMode)
  const lesson = useLesson(id)
  const part = lesson ? lastPart(lesson) : undefined
  const partUrl = useObjectUrl(part?.image ?? null)
  const boxes = useMemo<Box[]>(() => (part?.steps ?? []).map((step) => step.target.box), [part])
  // The screen the map expects after the learner's step, offered first in the sample chooser.
  const nextScreenId = part?.steps.find((step) => step.expectNext)?.expectNext
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'input' })
  const [checked, setChecked] = useState<Blob | null>(null)

  if (lesson === undefined) {
    return (
      <Screen>
        <BackBar to={`/lesson/${id}`} />
      </Screen>
    )
  }

  if (lesson === null || !part) {
    return (
      <Screen>
        <BackBar to="/home" />
        <Hint pair={S.lessonMissing} />
        <BigButton label={S.goHome} onClick={() => navigate('/home')} />
      </Screen>
    )
  }

  async function onPicked(blob: Blob) {
    setChecked(blob)
    setOutcome({ kind: 'checking' })
    try {
      const result = await services.engine.check({ image: blob, lessonId: id })
      if (result.kind === 'pass') {
        setOutcome({ kind: 'pass', done: result.done })
      } else if (result.kind === 'hint') {
        setOutcome({ kind: 'hint', step: result.step.index })
      } else if (result.kind === 'safety-stop') {
        setChecked(null)
        setOutcome({ kind: 'safety' })
      } else {
        setOutcome({ kind: 'unknown' })
      }
    } catch {
      setOutcome({ kind: 'unknown' })
    }
  }

  // A hint shows the outline on the screenshot: media on the left, retry on the right on desktop.
  const hinting = outcome.kind === 'hint' && !!partUrl
  const hintRetry = hinting ? (
    <BigButton variant="secondary" label={S.retry} onClick={() => setOutcome({ kind: 'input' })} />
  ) : undefined

  return (
    <Screen split={hinting} aside={hintRetry}>
      <BackBar title={S.tasks[lesson.task]} to={`/lesson/${id}`} />

      {outcome.kind === 'input' && (
        <>
          <Copy as="h2" variant="title" p={S.checkInstructions} />
          <ImageInput
            fromShortcut={fromShortcut}
            onPick={(blob) => void onPicked(blob)}
            suggestedSampleId={nextScreenId}
          />
        </>
      )}

      {outcome.kind === 'checking' && (
        <section className="flex flex-col items-center gap-6 text-center">
          <span
            aria-hidden="true"
            className="size-28 rounded-full border-[8px] border-saffron/30 border-t-saffron motion-safe:animate-spin"
          />
          <Copy variant="title" p={S.checking} />
          <FirstRunProgress />
        </section>
      )}

      {outcome.kind === 'pass' && !outcome.done && (
        <section className="flex flex-col gap-5">
          <Hint tone="success" pair={S.wellDone} voiceId="shabash" />
          <BigButton label={S.nextStepBtn} onClick={() => navigate(`/lesson/${id}`)} />
        </section>
      )}

      {outcome.kind === 'pass' && outcome.done && <Shabash simple={simple} />}

      {outcome.kind === 'hint' && partUrl && (
        <section className="flex flex-col gap-5">
          <Hint tone="coral" pair={S.hintCoral} voiceId="hint_try_this" />
          <LessonPlayer2D
            imageUrl={partUrl}
            boxes={boxes}
            active={outcome.step}
            level={2}
            playing
            slow={false}
          />
        </section>
      )}

      {outcome.kind === 'safety' && <SafetyPanel />}

      {outcome.kind === 'unknown' && (
        <section className="flex flex-col gap-5">
          <Hint pair={S.notClear} voiceId="unknown_screen" />
          {checked ? (
            <AskFamilyPanel image={checked} onRetry={() => setOutcome({ kind: 'input' })} />
          ) : (
            <BigButton variant="secondary" label={S.retry} onClick={() => setOutcome({ kind: 'input' })} />
          )}
        </section>
      )}
    </Screen>
  )
}

function Shabash({ simple }: { simple: boolean }) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  return (
    <section className="relative flex min-h-72 flex-col items-center justify-center gap-6 text-center">
      {!simple && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <SceneBoundary fallback={null}>
            <Suspense fallback={null}>
              <ShabashBurst />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <motion.img
        src="/assets/icon-star.webp"
        alt=""
        aria-hidden="true"
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        className="relative size-48 object-contain"
      />
      <div className="relative flex items-start justify-center gap-3">
        <Copy as="h2" variant="title" p={S.shabash} />
        <SpeakButton pair={S.shabash} voiceId="shabash_done" />
      </div>
      <BigButton label={S.seeProgress} onClick={() => navigate('/progress')} />
      <BigButton variant="secondary" label={S.goHome} onClick={() => navigate('/home')} />
    </section>
  )
}
