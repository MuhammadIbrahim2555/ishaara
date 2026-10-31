import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { BiLabel } from '@/ui/components/BiLabel'
import { FirstRunProgress } from '@/ui/components/FirstRunProgress'
import { Hint } from '@/ui/components/Hint'
import { ImageInput } from '@/ui/components/ImageInput'
import { AskFamilyPanel, SafetyPanel } from '@/ui/components/Outcome'
import { RedactEditor } from '@/ui/components/RedactEditor'
import { Screen } from '@/ui/components/Screen'
import { SpeakButton } from '@/ui/components/SpeakButton'
import { cn } from '@/ui/cn'
import { useObjectUrl } from '@/ui/hooks/useObjectUrl'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'
import { useUiStore } from '@/ui/store'
import { TASK_ORDER } from '@/ui/tasks'
import type { RedactRect, TaskId } from '@/types/contracts'

type Phase = 'input' | 'redact' | 'thinking' | 'safety' | 'family'

function isTaskId(value: string | undefined): value is TaskId {
  return TASK_ORDER.some((task) => task === value)
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

/** Shows a screenshot, lets the learner hide private parts, then turns it into a lesson. */
export function Ask() {
  const { task } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setSession = useUiStore((s) => s.setSession)
  const [phase, setPhase] = useState<Phase>('input')
  const [image, setImage] = useState<Blob | null>(null)
  const [redactions, setRedactions] = useState<RedactRect[]>([])
  const [drawing, setDrawing] = useState(true)
  const [shareMissed, setShareMissed] = useState(false)
  const shareChecked = useRef(false)
  const imageUrl = useObjectUrl(image)
  const fromShortcut = searchParams.get('from') === 'shortcut'

  // Android Share (from=share): the service worker stored the image. Take it once and go straight to hiding.
  // The ref guards against StrictMode's double effect run, since takeSharedImage deletes the image.
  useEffect(() => {
    if (shareChecked.current || !services.capture.isShareLaunch()) return
    shareChecked.current = true
    void (async () => {
      const shared = await services.capture.takeSharedImage()
      services.capture.consumeShortcutParam()
      if (shared) {
        setImage(shared)
        setRedactions([])
        setDrawing(true)
        setPhase('redact')
      } else {
        setShareMissed(true)
      }
    })()
  }, [])

  if (!isTaskId(task)) return <Navigate to="/home" replace />

  function pick(blob: Blob) {
    setImage(blob)
    setRedactions([])
    setDrawing(true)
    setPhase('redact')
  }

  async function analyze(current: Blob, taskId: TaskId) {
    setPhase('thinking')
    try {
      const result = await services.engine.analyze({ image: current, task: taskId, redactions })
      if (result.kind === 'lesson') {
        setSession({ currentLessonId: result.lesson.id })
        navigate(`/lesson/${result.lesson.id}`)
        return
      }
      if (result.kind === 'safety-stop') {
        setImage(null)
        setPhase('safety')
        return
      }
      setImage(result.image)
      setPhase('family')
    } catch {
      setPhase('family')
    }
  }

  // Once an image is chosen, the editor is the media column and the tools sit beside it on desktop.
  const redacting = phase === 'redact' && !!imageUrl
  const redactControls = redacting ? (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <ToolButton label={S.redactDraw} pressed={drawing} onClick={() => setDrawing((on) => !on)} />
        <ToolButton
          label={S.redactUndo}
          disabled={redactions.length === 0}
          onClick={() => setRedactions((rects) => rects.slice(0, -1))}
        />
        <ToolButton label={S.chooseAnother} onClick={() => setPhase('input')} />
      </div>
      <BigButton
        label={S.continueBtn}
        onClick={() => {
          if (image) void analyze(image, task)
        }}
      />
    </section>
  ) : undefined

  return (
    <Screen split={redacting} aside={redactControls}>
      <BackBar title={S.tasks[task]} />

      {phase === 'input' && shareMissed && <Hint pair={S.shareAgain} />}

      {phase === 'input' && (
        <ImageInput fromShortcut={fromShortcut} onPick={pick} suggestedSampleId="wa_chat" />
      )}

      {redacting && imageUrl && (
        <section className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <Copy as="h2" variant="title" p={S.redactTitle} className="min-w-0 flex-1" />
            <SpeakButton pair={S.redactTitle} voiceId="ask_screen" />
          </div>
          <Copy p={S.redactHelp} />
          <RedactEditor imageUrl={imageUrl} rects={redactions} drawing={drawing} onChange={setRedactions} />
        </section>
      )}

      {phase === 'thinking' && (
        <section className="flex flex-col items-center gap-6 text-center">
          <div className="relative">
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="block max-h-[56dvh] rounded-panel object-contain opacity-70 shadow-raised"
              />
            )}
            <span
              aria-hidden="true"
              className="absolute inset-0 m-auto size-28 rounded-full border-[8px] border-saffron/30 border-t-saffron motion-safe:animate-spin"
            />
          </div>
          <div className="flex items-center gap-4">
            <Copy variant="title" p={S.making} />
            <SpeakButton pair={S.making} voiceId="making_video" />
          </div>
          <FirstRunProgress />
        </section>
      )}

      {phase === 'safety' && <SafetyPanel />}

      {phase === 'family' && image && (
        <AskFamilyPanel image={image} onRetry={() => setPhase('redact')} />
      )}
    </Screen>
  )
}

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
}: {
  label: Pair
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-control=""
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-14 flex-1 items-center justify-center rounded-control border-2 border-teal-900 px-4 text-teal-900 transition duration-[180ms] disabled:opacity-40',
        pressed ? 'bg-teal-900 text-white' : 'bg-surface hover:bg-teal-100',
      )}
    >
      <BiLabel label={label} />
    </button>
  )
}
