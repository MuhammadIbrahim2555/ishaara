import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { voiceKey } from '@/core/voiceSelect'
import type { Box, FadeLevel, LessonStep } from '@/types/contracts'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { BiLabel } from '@/ui/components/BiLabel'
import { Hint } from '@/ui/components/Hint'
import { LessonPlayer2D, MEDIA_HEIGHT } from '@/ui/components/LessonPlayer2D'
import { Screen } from '@/ui/components/Screen'
import { SceneBoundary } from '@/ui/components/SceneBoundary'
import { SpeakButton } from '@/ui/components/SpeakButton'
import { Stepper } from '@/ui/components/Stepper'
import { LatinText, UrduText } from '@/ui/components/UrduText'
import { cn } from '@/ui/cn'
import { lastPart, useLesson } from '@/ui/hooks/useLesson'
import { useObjectUrl } from '@/ui/hooks/useObjectUrl'
import { useSpeak } from '@/ui/hooks/useSpeak'
import { useTranslatedLabel } from '@/ui/hooks/useTranslatedLabel'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { IconChevron, IconPause, IconPlay, IconReplay, IconSpeaker } from '@/ui/icons'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'
import { useUiStore, type Lang } from '@/ui/store'

const LessonScene = lazy(() => import('@/scenes/LessonScene'))

/** Pause after a step has played before the next one starts (a step lasts about 3.5 s). */
const STEP_GAP_MS = 1200

/** Caption in both languages. English falls back to the Urdu text when no English caption was saved. */
function captionPair(step: LessonStep): Pair {
  return { ur: step.captionUr, en: step.captionEn ?? step.captionUr }
}

/** Why-text in both languages, with the same fallback as the caption. */
function whyPair(step: LessonStep): Pair {
  return { ur: step.whyUr, en: step.whyEn ?? step.whyUr }
}

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

/** Plays a saved lesson on the learner's own screenshot. Starts paused: Play starts motion and voice. */
export function Lesson() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const lang = useLang()
  const simple = useUiStore((s) => s.settings.simpleMode)
  const setSession = useUiStore((s) => s.setSession)
  const lesson = useLesson(id)
  const part = lesson ? lastPart(lesson) : undefined
  const imageUrl = useObjectUrl(part?.image ?? null)
  const steps = useMemo(() => part?.steps ?? [], [part])
  const boxes = useMemo<Box[]>(() => steps.map((step) => step.target.box), [steps])
  const last = steps.length - 1

  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [slow, setSlow] = useState(false)
  const [stepDone, setStepDone] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [levelOverride, setLevelOverride] = useState<FadeLevel | null>(null)
  const level: FadeLevel = levelOverride ?? lesson?.level ?? 1

  const step = steps[active]
  // Clip ids: the step's voice file without path or extension; the why-text uses the same key + "_why".
  const captionId = step?.voice ? voiceKey(step.voice) : undefined
  const whyId = captionId ? `${captionId}_why` : undefined
  // The Urdu rendering of the English label is only shown in Urdu mode.
  const labelUr = useTranslatedLabel(lang === 'ur' ? step?.labelEn : undefined)

  // Captions speak through the hook: Urdu clips in Urdu mode, the browser voice in English.
  const speech = useSpeak()
  const speechRef = useRef(speech)
  useEffect(() => {
    speechRef.current = speech
  })

  useEffect(() => {
    setSession({ currentLessonId: id })
  }, [id, setSession])

  // Leaving the lesson silences any caption.
  useEffect(() => {
    return () => services.voice.stop()
  }, [])

  // Caption auto-play. Only once the learner has pressed Play or Replay (browsers block autoplay).
  useEffect(() => {
    if (!playing || !step) {
      speechRef.current.stop()
      return
    }
    void speechRef.current.speak(captionPair(step), { voiceId: captionId })
  }, [playing, step, captionId, runKey])

  // Once a step has played, wait briefly and move on, as long as the lesson is playing.
  useEffect(() => {
    if (!playing || !stepDone || last < 0) return
    if (active >= last) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => {
      setActive((a) => Math.min(a + 1, last))
      setStepDone(false)
    }, STEP_GAP_MS)
    return () => window.clearTimeout(timer)
  }, [playing, stepDone, active, last])

  const onStepAnimated = useCallback(() => setStepDone(true), [])

  function goTo(next: number) {
    setActive(Math.max(0, Math.min(last, next)))
    setStepDone(false)
  }

  function replay() {
    setActive(0)
    setStepDone(false)
    setPlaying(true)
    setRunKey((k) => k + 1)
  }

  function togglePlay() {
    if (playing) setPlaying(false)
    else if (stepDone && active >= last) replay()
    else setPlaying(true)
  }

  if (lesson === undefined) {
    return (
      <Screen>
        <BackBar to="/home" />
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

  if (!imageUrl) {
    return (
      <Screen>
        <BackBar to="/home" />
      </Screen>
    )
  }

  const player = (
    <LessonPlayer2D
      key={runKey}
      imageUrl={imageUrl}
      boxes={boxes}
      active={active}
      level={level}
      playing={playing}
      slow={slow}
      onStepAnimated={onStepAnimated}
      onAskHint={() => setLevelOverride(2)}
    />
  )
  // The 3D stage gets an explicit height so the R3F canvas has room to draw.
  const stage =
    !simple && level !== 3 ? (
      <SceneBoundary fallback={player}>
        <Suspense fallback={player}>
          <div className="w-full" style={{ height: MEDIA_HEIGHT }}>
            <LessonScene
              key={runKey}
              imageUrl={imageUrl}
              imageAspect={part.height ? part.width / part.height : 0.5}
              boxes={boxes}
              active={active}
              level={level}
              playing={playing}
              slow={slow}
              onStepAnimated={onStepAnimated}
            />
          </div>
        </Suspense>
      </SceneBoundary>
    ) : (
      player
    )

  // Desktop: media on the left, caption and controls on the right. Phones: one column.
  const controls =
    level !== 3 && step ? (
      <>
        <section className="flex items-start gap-3 rounded-panel bg-surface p-5 shadow-raised">
          {/* Speak buttons sit at the start edge of their text, inside the panel (never beside a BigButton). */}
          <div className="flex shrink-0 flex-col gap-3">
            <SpeakButton pair={captionPair(step)} voiceId={captionId} />
            {step.whyUr && <SpeakButton pair={whyPair(step)} voiceId={whyId} />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Copy as="p" variant="title" p={captionPair(step)} />
            <Copy p={whyPair(step)} />
            {step.labelEn && <StepLabel en={step.labelEn} ur={labelUr} lang={lang} />}
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <ControlButton
              size="lg"
              label={S.prev}
              icon={<IconChevron className="ltr:-scale-x-100" />}
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
            />
            <Stepper current={active + 1} total={steps.length} />
            <ControlButton
              size="lg"
              label={S.next}
              icon={<IconChevron className="rtl:-scale-x-100" />}
              disabled={active >= last}
              onClick={() => goTo(active + 1)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ControlButton
              stacked
              filled
              label={playing ? S.pause : S.play}
              icon={playing ? <IconPause /> : <IconPlay />}
              onClick={togglePlay}
            />
            <ControlButton stacked label={S.replay} icon={<IconReplay />} onClick={replay} />
            <ControlButton
              stacked
              label={S.slow}
              icon={<IconSpeaker />}
              pressed={slow}
              onClick={() => setSlow((s) => !s)}
            />
          </div>
        </div>
      </>
    ) : null

  return (
    <Screen
      split
      aside={
        <>
          {controls}
          <BigButton label={S.doItMyself} onClick={() => navigate(`/check/${lesson.id}`)} />
        </>
      }
    >
      <BackBar title={S.tasks[lesson.task]} to="/home" />

      {stage}
    </Screen>
  )
}

/** Step label in the current language only: the Urdu rendering in Urdu mode (when there is one), else the English. */
function StepLabel({ en, ur, lang }: { en: string; ur: string | null; lang: Lang }) {
  if (lang === 'ur' && ur) {
    return <UrduText as="p" className="text-sub text-ink-soft leading-[1.9]">{ur}</UrduText>
  }
  return <LatinText as="p" className="text-sub text-ink-soft">{en}</LatinText>
}

function ControlButton({
  label,
  icon,
  onClick,
  disabled,
  pressed,
  filled,
  stacked,
  size = 'md',
}: {
  label: Pair
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  /** Soft teal fill, used for Play / Pause. */
  filled?: boolean
  /** Icon above the label. */
  stacked?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <button
      type="button"
      data-control=""
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={cn(
        'flex items-center justify-center gap-2 rounded-control border-2 border-teal-900 text-teal-900 transition duration-[180ms] disabled:opacity-40',
        stacked ? 'min-h-20 flex-col px-2' : size === 'lg' ? 'min-h-16 px-4' : 'min-h-14 px-3',
        pressed ? 'bg-teal-900 text-white' : filled ? 'bg-teal-100' : 'bg-surface hover:bg-teal-100',
      )}
    >
      <span aria-hidden="true" className="flex [&>svg]:size-7">
        {icon}
      </span>
      <BiLabel label={label} />
    </button>
  )
}
