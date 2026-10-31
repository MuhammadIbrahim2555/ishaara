import { useNavigate } from 'react-router-dom'
import { BigButton } from '@/ui/components/BigButton'
import { Hint } from '@/ui/components/Hint'
import { LangToggle } from '@/ui/components/LangToggle'
import { MicOrb } from '@/ui/components/MicOrb'
import { Screen } from '@/ui/components/Screen'
import { TaskTile } from '@/ui/components/TaskTile'
import { Localized } from '@/ui/components/UrduText'
import { useModelWarmUp } from '@/ui/hooks/useModelWarmUp'
import { useVoiceQuery, type VoiceQuery } from '@/ui/hooks/useVoiceQuery'
import { IconImage } from '@/ui/icons'
import { S } from '@/ui/strings'
import { TASK_IMAGE, TASK_ORDER } from '@/ui/tasks'
import type { TaskId } from '@/types/contracts'

export function Home() {
  const navigate = useNavigate()
  const { query, whisperProgress, start, toggle } = useVoiceQuery()
  useModelWarmUp()

  return (
    <Screen nav>
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex w-full justify-end">
          <LangToggle />
        </div>
        <Localized as="h1" p={S.greeting} className="text-ur-title" />
        <Localized as="p" p={S.homeQuestion} className="text-ur-body" />
      </header>

      <MicOrb listening={query.kind === 'listening'} busy={query.kind === 'busy'} onToggle={toggle} />

      {whisperProgress !== null && <SpeechModelProgress progress={whisperProgress} />}

      <VoiceResult
        query={query}
        onConfirm={(task) => navigate(`/ask/${task}`)}
        onAgain={() => void start()}
      />

      <div className="grid grid-cols-2 gap-3">
        {TASK_ORDER.map((task) => (
          <TaskTile
            key={task}
            label={S.tasks[task]}
            image={TASK_IMAGE[task]}
            onSelect={() => navigate(`/ask/${task}`)}
          />
        ))}
      </div>

      <BigButton
        variant="secondary"
        label={S.showScreen}
        icon={<IconImage />}
        onClick={() => navigate('/ask/photo')}
      />
    </Screen>
  )
}

interface VoiceResultProps {
  query: VoiceQuery
  onConfirm: (task: TaskId) => void
  onAgain: () => void
}

/** What the mic heard. The learner always confirms the task; nothing navigates by itself. */
function VoiceResult({ query, onConfirm, onAgain }: VoiceResultProps) {
  if (query.kind === 'denied') return <Hint tone="coral" text={S.micDenied} />
  if (query.kind === 'error' || query.kind === 'unmatched') return <Hint text={S.notHeard} />
  if (query.kind === 'matched') {
    return (
      <section className="flex flex-col gap-4 rounded-panel bg-surface p-5 shadow-raised">
        <Localized as="p" p={S.youSaid(query.text)} className="text-ur-body" />
        <BigButton label={S.yesDoTask(S.tasks[query.task])} onClick={() => onConfirm(query.task)} />
        <BigButton variant="secondary" label={S.sayAgain} onClick={onAgain} />
      </section>
    )
  }
  return null
}

/** Shown only while the Whisper model downloads (first use). */
function SpeechModelProgress({ progress }: { progress: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 self-center text-center">
      <Localized as="p" p={S.speechPrep} className="text-ur-body" />
      <progress
        className="h-3 w-full overflow-hidden rounded-pill [&::-webkit-progress-bar]:bg-surface-sunk [&::-webkit-progress-value]:bg-teal-900 [&::-moz-progress-bar]:bg-teal-900"
        value={percent}
        max={100}
        aria-label={`${percent}%`}
      />
      <span className="text-sub">{percent}%</span>
    </div>
  )
}
