import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type {
  AnalyzeResult,
  LoadProgress,
  ModelId,
  ProgressSummary,
} from '@/types/contracts'
import { SAMPLE_SCREENS, loadSampleBlob } from '@/data/samples'
import { BackBar } from '@/ui/components/BackBar'
import { Screen } from '@/ui/components/Screen'
import { cn } from '@/ui/cn'
import { services } from '@/ui/services'
import { S } from '@/ui/strings'

const MODEL_IDS: ModelId[] = ['ocr', 'whisper', 'florence', 'translate', 'tts']

const STATUS_TEXT: Record<LoadProgress['status'], string> = {
  idle: 'Not loaded',
  downloading: 'Downloading',
  ready: 'Ready',
  error: 'Error',
}

const STATUS_CLASS: Record<LoadProgress['status'], string> = {
  idle: 'text-ink-soft',
  downloading: 'text-teal-900',
  ready: 'text-success',
  error: 'text-ink font-bold',
}

interface SampleRun {
  result: AnalyzeResult
  ms: number
}

function fmtMs(n: number): string {
  return n.toFixed(1)
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function Section({
  id,
  title,
  ur,
  children,
}: {
  id: string
  title: string
  ur: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-2xl font-extrabold tracking-tight text-ink">
          {title}
        </h2>
        <span dir="rtl" lang="ur" className="font-urdu text-label text-ink-soft">
          {ur}
        </span>
      </header>
      {children}
    </section>
  )
}

function Stat({ value, label, ur }: { value: number | string; label: string; ur: string }) {
  return (
    <div className="flex flex-col gap-2 p-6">
      <span className="text-latin-display tabular-nums text-teal-900">{value}</span>
      <span className="text-label font-bold text-ink">{label}</span>
      <span dir="rtl" lang="ur" className="font-urdu text-label leading-[1.9] text-ink-soft">
        {ur}
      </span>
    </div>
  )
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <>
      <dt className="text-ink-soft">{k}</dt>
      <dd className="min-w-0 break-words text-ink">{v}</dd>
    </>
  )
}

function RunDetails({ run }: { run: SampleRun }) {
  const r = run.result

  if (r.kind === 'lesson') {
    const steps = r.lesson.parts.flatMap((p) => p.steps)
    const first = steps[0]
    return (
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-body">
        <Row k="Result" v="Lesson made" />
        <Row k="Time" v={`${fmtMs(run.ms)} ms`} />
        <Row k="Steps" v={String(steps.length)} />
        <Row
          k="First caption"
          v={
            first ? (
              <span dir="rtl" lang="ur" className="font-urdu leading-[1.9]">
                {first.captionUr}
              </span>
            ) : (
              '—'
            )
          }
        />
        <Row
          k="Target"
          v={first ? `${first.target.source} · ${pct(first.target.confidence)}` : '—'}
        />
        <Row
          k="Open"
          v={
            <Link
              to={`/lesson/${r.lesson.id}`}
              className="font-bold text-teal-900 underline underline-offset-4 hover:text-teal-700"
            >
              Open lesson
            </Link>
          }
        />
      </dl>
    )
  }

  if (r.kind === 'ask-family') {
    return (
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-body">
        <Row k="Result" v="Ask family" />
        <Row k="Reason" v={r.reason} />
        <Row k="Time" v={`${fmtMs(run.ms)} ms`} />
      </dl>
    )
  }

  // safety-stop: the matched text is deliberately not shown (it may be a PIN or OTP).
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-body">
      <Row k="Result" v="Safety stop" />
      <Row k="Reason" v={r.reason} />
      <Row k="Time" v={`${fmtMs(run.ms)} ms`} />
      <Row k="Note" v="Matched text is not shown." />
    </dl>
  )
}

function PrivacyList({
  title,
  ur,
  items,
  shared = false,
}: {
  title: string
  ur: string
  items: string[]
  shared?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-panel p-6',
        shared ? 'bg-surface-sunk' : 'bg-surface shadow-raised',
      )}
    >
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <span dir="rtl" lang="ur" className="font-urdu text-label text-ink-soft">
          {ur}
        </span>
      </header>
      <ul className="flex flex-col divide-y divide-surface-sunk">
        {items.map((item) => (
          <li key={item} className="py-3 text-body text-ink">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Judge() {
  const [statuses, setStatuses] = useState<Record<ModelId, LoadProgress>>(() =>
    services.models.status(),
  )
  const [timings, setTimings] = useState(() => services.metrics.snapshot())
  const [lessonCount, setLessonCount] = useState<number | null>(null)
  const [progress, setProgress] = useState<ProgressSummary | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [sampleId, setSampleId] = useState('wa_chat')
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState<SampleRun | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const device = services.models.device() === 'webgpu' ? 'WebGPU' : 'WASM'

  useEffect(() => {
    setStatuses(services.models.status())
    return services.models.onProgress((e) => {
      setStatuses((prev) => ({ ...prev, [e.model]: e }))
    })
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setTimings(services.metrics.snapshot())
      }
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let alive = true
    void Promise.all([services.library.list(), services.library.progress()])
      .then(([lessons, summary]) => {
        if (!alive) return
        setLessonCount(lessons.length)
        setProgress(summary)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [refreshKey])

  const checksPassed = progress
    ? progress.skills.reduce((n, skill) => n + skill.timesPassed, 0)
    : null

  async function runSample() {
    const sample = SAMPLE_SCREENS.find((s) => s.id === sampleId)
    if (!sample) return
    setRunning(true)
    setRunError(null)
    try {
      const image = await loadSampleBlob(sample.url)
      const started = performance.now()
      const result = await services.engine.analyze({ image, task: 'photo', redactions: [] })
      const ms = performance.now() - started
      setRun({ result, ms })
      setTimings(services.metrics.snapshot())
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setRun(null)
      setRunError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  const sortedTimings = [...timings].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Screen className="lg:max-w-[1120px]">
      <div lang="en" dir="ltr" className="flex w-full flex-col gap-6">
      <BackBar to="/settings" />

      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-[-0.02em] text-ink lg:text-5xl">
          Ishaara — judge view
        </h1>
        <p className="max-w-2xl text-body leading-normal text-ink-soft">
          On-device AI phone tutor: a lesson on your own screenshot, checks you did it yourself,
          help fades. Screenshots never leave the device.
        </p>
      </header>

      <div className="grid grid-cols-2 divide-y divide-surface-sunk overflow-hidden rounded-panel bg-surface shadow-raised lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <Stat value={lessonCount ?? '—'} label="Lessons made" ur="سبق بنائے گئے" />
        <Stat value={checksPassed ?? '—'} label="Tasks completed" ur="مکمل کام" />
        <Stat value={progress?.learnedCount ?? '—'} label="Learned on their own" ur="خود سیکھا گیا" />
        <Stat
          value={progress?.callsSavedThisWeek ?? '—'}
          label="Calls saved this week"
          ur="اس ہفتے بچائی گئی کالیں"
        />
      </div>

      <Section id="judge-models" title="On-device models" ur={S.modelsTitle.ur}>
        <div className="overflow-x-auto rounded-panel bg-surface shadow-raised">
          <table className="w-full min-w-[420px] border-collapse text-left text-body">
            <thead>
              <tr className="text-label text-ink-soft">
                <th scope="col" className="px-5 py-3 font-bold">
                  Model
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  Device
                </th>
              </tr>
            </thead>
            <tbody>
              {MODEL_IDS.map((id) => {
                const p = statuses[id]
                return (
                  <tr key={id} className="border-t border-surface-sunk align-top">
                    <th scope="row" className="px-5 py-3 font-latin font-bold text-ink">
                      {id}
                    </th>
                    <td className={cn('px-5 py-3', STATUS_CLASS[p.status])}>
                      {STATUS_TEXT[p.status]}
                      {p.status === 'downloading' ? ` ${pct(p.progress)}` : ''}
                      {p.message && (
                        <span className="block text-sub text-ink-soft">{p.message}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink">{device}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="judge-timings" title="Timings" ur="کارکردگی">
        <div className="overflow-x-auto rounded-panel bg-surface shadow-raised">
          <table className="w-full min-w-[420px] border-collapse text-left text-body">
            <thead>
              <tr className="text-label text-ink-soft">
                <th scope="col" className="px-5 py-3 font-bold">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 text-right font-bold">
                  Count
                </th>
                <th scope="col" className="px-5 py-3 text-right font-bold">
                  Avg ms
                </th>
                <th scope="col" className="px-5 py-3 text-right font-bold">
                  Last ms
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTimings.length === 0 && (
                <tr className="border-t border-surface-sunk">
                  <td colSpan={4} className="px-5 py-4 text-ink-soft">
                    No timings yet. Run a sample lesson below.
                  </td>
                </tr>
              )}
              {sortedTimings.map((t) => (
                <tr key={t.name} className="border-t border-surface-sunk">
                  <th scope="row" className="px-5 py-3 font-latin font-bold text-ink">
                    {t.name}
                  </th>
                  <td className="px-5 py-3 text-right tabular-nums text-ink">{t.count}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink">{fmtMs(t.avgMs)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink">{fmtMs(t.lastMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="judge-sample" title="Run sample lesson" ur={S.trySample.ur}>
        <div className="flex flex-col gap-5 rounded-panel bg-surface p-6 shadow-raised">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-end">
            <label className="flex flex-col gap-2">
              <span className="text-label font-bold text-ink-soft">Sample screen</span>
              <select
                value={sampleId}
                disabled={running}
                onChange={(e) => setSampleId(e.target.value)}
                className="min-h-14 rounded-control border-2 border-teal-900 bg-surface px-4 text-body text-ink disabled:opacity-60"
              >
                {SAMPLE_SCREENS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-label font-bold text-ink-soft">Task</span>
              <span className="flex min-h-14 items-center rounded-control bg-surface-sunk px-4 text-body text-ink">
                photo
              </span>
            </div>
          </div>

          <button
            type="button"
            data-control=""
            onClick={() => void runSample()}
            disabled={running}
            className="flex min-h-14 items-center justify-center rounded-control bg-teal-900 px-6 font-latin text-body font-bold text-white shadow-raised transition duration-[180ms] hover:bg-teal-700 motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? 'Analyzing…' : 'Run sample lesson'}
          </button>

          <div aria-live="polite" className="flex flex-col gap-3">
            {runError && (
              <p role="alert" className="text-body text-ink">
                The sample could not run: {runError}
              </p>
            )}
            {run && <RunDetails run={run} />}
          </div>
        </div>
      </Section>

      <Section id="judge-privacy" title="Privacy" ur={S.privacyTitle.ur}>
        <div className="grid gap-4 md:grid-cols-2">
          <PrivacyList
            title="Stays on this device"
            ur="اسی فون پر رہتا ہے"
            items={[
              'Screenshots (redacted before analysis)',
              'Lesson videos',
              'Voice',
              'OCR text',
              'Event log',
            ]}
          />
          <PrivacyList
            title="Shared (only if the elder turns it on)"
            ur="صرف اجازت سے شیئر ہوتا ہے"
            shared
            items={['Skill levels', 'Learned count', 'Weekly count', 'Last practised']}
          />
        </div>
        <p className="text-body font-bold text-ink">No analytics. No account for the elder.</p>
      </Section>
      </div>
    </Screen>
  )
}
