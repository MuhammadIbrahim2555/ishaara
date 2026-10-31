import { useEffect, useState, useSyncExternalStore } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type {
  ElderProgressDoc,
  ElderSkillShare,
  FadeLevel,
  FamilyUser,
  TaskId,
} from '@/types/contracts'
import { formatCode } from '@/sync/inviteCode'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { Hint } from '@/ui/components/Hint'
import { Screen } from '@/ui/components/Screen'
import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { IconReplay, IconShare } from '@/ui/icons'
import { services } from '@/ui/services'
import type { Pair } from '@/ui/strings'
import { TASK_IMAGE } from '@/ui/tasks'

const ELDER_WAIT_MS = 8000
const ONE_SECOND_MS = 1000
const HALF_MINUTE_MS = 30000

const COPY = {
  title: { ur: 'خاندان', en: 'Family' },
  unavailable: {
    ur: 'اس ورژن میں فیملی سنک موجود نہیں',
    en: 'Family sync is not set up on this build',
  },
  signedOutTitle: { ur: 'امی کی ترقی دیکھیں', en: "See Ammi's progress" },
  signedOutBody: {
    ur: 'دیکھیں امی نے کیا سیکھا۔ صرف ترقی شیئر ہوتی ہے، ان کی اسکرین، آواز یا پیغامات کبھی نہیں۔ فیصلہ ان کا ہے۔',
    en: 'See what Ammi has learned. Only progress is shared, never her screen, voice or messages. The choice is hers.',
  },
  signIn: { ur: 'Google سے سائن ان کریں', en: 'Sign in with Google' },
  signInFailed: {
    ur: 'سائن ان نہیں ہو سکا۔ دوبارہ کوشش کریں',
    en: 'Sign-in did not work. Please try again.',
  },
  setupFailed: {
    ur: 'فیملی سنک ابھی شروع نہیں ہو سکا۔ تھوڑی دیر بعد دوبارہ کوشش کریں',
    en: 'Family sync could not start yet. Please try again shortly.',
  },
  offline: { ur: 'انٹرنیٹ سے جڑیں', en: 'Connect to the internet' },
  noElders: { ur: 'ابھی امی کی ترقی یہاں نہیں آئی', en: 'No progress from Ammi yet' },
  noEldersBody: {
    ur: 'نیچے کوڈ بنائیں اور امی کا فون جوڑیں۔',
    en: "Create a code below and link Ammi's phone.",
  },
  elderFallback: { ur: 'امی', en: 'Ammi' },
  learned: { ur: 'چیزیں خود سیکھ لیں', en: 'things learned on their own' },
  noSkills: { ur: 'ابھی کوئی کام شروع نہیں ہوا', en: 'No tasks started yet' },
  stuck: { ur: 'اٹکی ہوئی', en: 'Stuck' },
  stuckBody: { ur: 'انہیں کال کر کے ساتھ پریکٹس کریں', en: 'Call them and practise together' },
  weekly: (n: number): Pair => ({
    ur: `اس ہفتے ${n} کام خود کیے`,
    en: `${n} tasks done on their own this week`,
  }),
  updated: { ur: 'آخری اپ ڈیٹ', en: 'Last updated' },
  signOut: { ur: 'سائن آؤٹ', en: 'Sign out' },
  inviteTitle: { ur: 'امی کا فون جوڑیں', en: "Link Ammi's phone" },
  inviteBody: {
    ur: 'امی کے فون پر اشارہ کھولیں، ترتیبات میں جائیں، "بچوں سے جوڑیں" چنیں، پھر یہ کوڈ لکھیں یا QR اسکین کریں۔',
    en: 'On Ammi\'s phone, open Ishaara, go to Settings, tap "Connect to children", then type this code or scan the QR.',
  },
  nameLabel: { ur: 'نام (جیسے امی)', en: 'Name (for example, Ammi)' },
  createCode: { ur: 'کوڈ بنائیں', en: 'Create code' },
  newCode: { ur: 'نیا کوڈ', en: 'New code' },
  copyLink: { ur: 'لنک کاپی کریں', en: 'Copy link' },
  copied: { ur: 'لنک کاپی ہو گیا', en: 'Link copied' },
  copyFailed: {
    ur: 'لنک کاپی نہیں ہو سکا۔ کوڈ لکھ لیں',
    en: 'Could not copy. Please write the code down.',
  },
  inviteFailed: {
    ur: 'کوڈ نہیں بن سکا۔ دوبارہ کوشش کریں',
    en: 'Could not make a code. Please try again.',
  },
  qrLabel: { ur: 'جوڑنے کے لیے QR کوڈ', en: 'QR code to link the phone' },
  expired: { ur: 'کوڈ ختم ہو گیا', en: 'Code expired' },
  expiresIn: (time: string): Pair => ({
    ur: `کوڈ ختم ہونے میں ${time}`,
    en: `Expires in ${time}`,
  }),
}

const TASK_LABEL: Record<TaskId, Pair> = {
  photo: { ur: 'تصویر بھیجنا', en: 'Send a photo' },
  video_call: { ur: 'ویڈیو کال', en: 'Video call' },
  voice_note: { ur: 'آواز کا پیغام', en: 'Voice note' },
  send_money: { ur: 'پیسے بھیجنا', en: 'Send money' },
}

const LEVEL_LABEL: Record<FadeLevel, Pair> = {
  1: { ur: 'ویڈیو دیکھی', en: 'Watched a video' },
  2: { ur: 'اشارہ کافی تھا', en: 'A hint was enough' },
  3: { ur: 'خود کر لیا!', en: 'Did it myself!' },
}

type Status =
  | 'checking'
  | 'signedOut'
  | 'setupFailed'
  | 'offline'
  | 'loading'
  | 'empty'
  | 'list'

interface AuthState {
  ready: boolean
  user: FamilyUser | null
}

interface InviteState {
  code: string
  expiresAt: number
  url: string
}

function subscribeOnline(cb: () => void): () => void {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  )
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function relativeTime(at: number, now: number): Pair {
  const min = Math.floor(Math.max(0, now - at) / 60000)
  if (min < 1) return { ur: 'ابھی', en: 'Just now' }
  if (min < 60) {
    return { ur: `${min} منٹ پہلے`, en: `${min} ${min === 1 ? 'minute' : 'minutes'} ago` }
  }
  const hours = Math.floor(min / 60)
  if (hours < 24) {
    return { ur: `${hours} گھنٹے پہلے`, en: `${hours} ${hours === 1 ? 'hour' : 'hours'} ago` }
  }
  const days = Math.floor(hours / 24)
  return { ur: `${days} دن پہلے`, en: `${days} ${days === 1 ? 'day' : 'days'} ago` }
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

interface CopyProps {
  p: Pair
  as?: 'span' | 'p' | 'h2' | 'h3'
  className?: string
}

/**
 * One string in the current UI language only. Blocks get the body size
 * unless `className` is given; spans inherit the size of their parent.
 */
function Copy({ p, as: Tag = 'p', className }: CopyProps) {
  const lang = useLang()
  const sizing = className ?? (Tag === 'span' ? undefined : bodyClass(lang))
  return (
    <Tag {...langAttrs(lang)} className={sizing}>
      {p[lang]}
    </Tag>
  )
}

function CardSkeleton() {
  return (
    <div aria-hidden="true" className="h-56 rounded-panel bg-surface-sunk motion-safe:animate-pulse" />
  )
}

function SignOutLink({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <button
      type="button"
      data-control=""
      onClick={() => void onSignOut()}
      className="min-h-14 self-center px-4 text-label font-bold text-ink-soft underline underline-offset-4 transition duration-[180ms] hover:text-teal-900"
    >
      <Copy as="span" p={COPY.signOut} />
    </button>
  )
}

function EmptyCard() {
  return (
    <section className="flex flex-col gap-3 rounded-panel bg-surface p-6 shadow-raised">
      <Copy as="h2" p={COPY.noElders} className="text-ur-title font-bold" />
      <Copy p={COPY.noEldersBody} />
    </section>
  )
}

function SkillRow({ skill }: { skill: ElderSkillShare }) {
  return (
    <li className="flex items-start gap-4 py-4">
      <img
        src={TASK_IMAGE[skill.task]}
        alt=""
        className="size-12 shrink-0 rounded-[16px] bg-surface-sunk object-contain"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <Copy
            as="span"
            p={TASK_LABEL[skill.task]}
            className="text-ur-body font-bold leading-[1.8]"
          />
          {skill.stuck && (
            <Copy
              as="span"
              p={COPY.stuck}
              className="rounded-pill bg-coral/15 px-3 py-1 text-label font-bold text-ink"
            />
          )}
        </div>
        <Copy as="span" p={LEVEL_LABEL[skill.level]} className="text-label text-ink-soft" />
        {skill.stuck && (
          <Copy as="span" p={COPY.stuckBody} className="text-label text-ink-soft" />
        )}
      </div>
    </li>
  )
}

function ElderCard({ elder, now }: { elder: ElderProgressDoc; now: number }) {
  const lang = useLang()
  return (
    <article className="flex flex-col gap-5 rounded-panel bg-surface p-6 shadow-raised">
      <div className="flex flex-col gap-2">
        <h2 dir="auto" className="font-urdu text-ur-title font-bold leading-[1.9]">
          {elder.name ? elder.name : <Copy as="span" p={COPY.elderFallback} />}
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-latin text-latin-display tabular-nums text-teal-900">
            {elder.learnedCount}
          </span>
          <Copy as="span" p={COPY.learned} className="text-ur-body font-bold" />
        </p>
      </div>

      <ul className="flex flex-col divide-y-2 divide-surface-sunk">
        {elder.skills.length === 0 ? (
          <li className="py-2">
            <Copy p={COPY.noSkills} />
          </li>
        ) : (
          elder.skills.map((skill) => <SkillRow key={skill.task} skill={skill} />)
        )}
      </ul>

      <footer className="flex flex-col gap-1 border-t-2 border-surface-sunk pt-4">
        <Copy
          as="p"
          p={COPY.weekly(elder.weeklyCompleted)}
          className="text-label font-bold text-ink"
        />
        {elder.updatedAt > 0 && (
          <p {...langAttrs(lang)} className="text-sub text-ink-soft">
            {COPY.updated[lang]} {relativeTime(elder.updatedAt, now)[lang]}
          </p>
        )}
      </footer>
    </article>
  )
}

function InvitePanel({ familyId }: { familyId: string | null }) {
  const lang = useLang()
  const [name, setName] = useState('')
  const [invite, setInvite] = useState<InviteState | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const now = useNow(ONE_SECOND_MS)

  const trimmed = name.trim()
  const canCreate = familyId !== null && trimmed.length > 0 && !busy
  const remaining = invite !== null ? invite.expiresAt - now : 0
  const expired = invite !== null && remaining <= 0

  async function create() {
    if (!familyId || trimmed.length === 0) return
    setBusy(true)
    setFailed(false)
    setCopyState('idle')
    try {
      setInvite(await services.family.createInvite(familyId, trimmed))
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-panel bg-surface p-6 shadow-raised">
      <Copy as="h2" p={COPY.inviteTitle} className="text-ur-title font-bold" />
      <Copy p={COPY.inviteBody} />

      <label className="flex flex-col gap-2">
        <Copy as="span" p={COPY.nameLabel} className="text-label font-bold text-ink-soft" />
        <input
          type="text"
          dir="auto"
          value={name}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          className="min-h-14 w-full rounded-control bg-surface-sunk px-4 font-urdu text-ur-body text-ink"
        />
      </label>

      {invite === null ? (
        <BigButton
          label={COPY.createCode}
          onClick={() => void create()}
          disabled={!canCreate}
          loading={busy}
        />
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div
            role="img"
            aria-label={COPY.qrLabel[lang]}
            className={cn('rounded-panel bg-page p-4 transition duration-[320ms]', expired && 'opacity-40')}
          >
            <QRCodeSVG value={invite.url} size={240} fgColor="#0F5257" bgColor="#FBF7F0" />
          </div>

          <p
            dir="ltr"
            lang="en"
            className="font-latin text-[2.25rem] leading-none font-extrabold tracking-[0.12em] text-ink tabular-nums"
          >
            {formatCode(invite.code)}
          </p>

          <Copy
            as="p"
            p={expired ? COPY.expired : COPY.expiresIn(clock(remaining))}
            className="text-label font-bold text-ink-soft"
          />

          <div className="grid w-full gap-3 sm:grid-cols-2">
            <BigButton
              variant="secondary"
              label={COPY.newCode}
              icon={<IconReplay />}
              onClick={() => void create()}
              disabled={!canCreate}
              loading={busy}
            />
            <BigButton
              variant="secondary"
              label={COPY.copyLink}
              icon={<IconShare />}
              onClick={() => void copyLink()}
            />
          </div>

          {copyState !== 'idle' && (
            <div role="status">
              <Copy
                as="p"
                p={copyState === 'copied' ? COPY.copied : COPY.copyFailed}
                className="text-label text-ink-soft"
              />
            </div>
          )}
        </div>
      )}

      {failed && <Hint tone="coral" pair={COPY.inviteFailed} />}
    </section>
  )
}

function FamilyScreen() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const user = services.family.currentUser()
    return { ready: user !== null, user }
  })
  const [signingIn, setSigningIn] = useState(false)
  const [signInFailed, setSignInFailed] = useState(false)
  const [familyState, setFamilyState] = useState<{ uid: string; familyId: string } | null>(
    null,
  )
  const [setupFailedUid, setSetupFailedUid] = useState<string | null>(null)
  const [eldersState, setEldersState] = useState<{
    familyId: string
    list: ElderProgressDoc[]
  } | null>(null)
  const [waitedUid, setWaitedUid] = useState<string | null>(null)
  const online = useOnline()
  const now = useNow(HALF_MINUTE_MS)

  useEffect(() => services.family.onAuth((user) => setAuth({ ready: true, user })), [])

  const signedIn = auth.user !== null && !auth.user.isAnonymous ? auth.user : null
  const uid = signedIn?.uid ?? null

  useEffect(() => {
    if (!uid) return
    let alive = true
    services.family
      .ensureFamily()
      .then(({ familyId }) => {
        if (alive) setFamilyState({ uid, familyId })
      })
      .catch(() => {
        if (alive) setSetupFailedUid(uid)
      })
    return () => {
      alive = false
    }
  }, [uid])

  useEffect(() => {
    if (!uid) return
    const timer = window.setTimeout(() => setWaitedUid(uid), ELDER_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [uid])

  const familyId = familyState !== null && familyState.uid === uid ? familyState.familyId : null

  useEffect(() => {
    if (!familyId) return
    return services.family.watchElders(familyId, (list) =>
      setEldersState({ familyId, list }),
    )
  }, [familyId])

  const elders =
    eldersState !== null && familyId !== null && eldersState.familyId === familyId
      ? eldersState.list
      : null
  const setupFailed = uid !== null && setupFailedUid === uid
  const waited = uid !== null && waitedUid === uid

  async function signIn() {
    setSigningIn(true)
    setSignInFailed(false)
    try {
      const user = await services.family.signInWithGoogle()
      if (user) setAuth({ ready: true, user })
    } catch {
      setSignInFailed(true)
    } finally {
      setSigningIn(false)
    }
  }

  async function signOut() {
    await services.family.signOut().catch(() => undefined)
    setAuth({ ready: true, user: null })
  }

  let status: Status
  if (!auth.ready) status = 'checking'
  else if (signedIn === null) status = 'signedOut'
  else if (setupFailed) status = 'setupFailed'
  else if (waited && !online && (elders === null || elders.length === 0)) status = 'offline'
  else if (elders === null) status = 'loading'
  else if (elders.length === 0) status = 'empty'
  else status = 'list'

  if (status === 'checking') {
    return (
      <Screen>
        <BackBar title={COPY.title} to="/home" />
        <CardSkeleton />
      </Screen>
    )
  }

  if (status === 'signedOut') {
    return (
      <Screen>
        <BackBar title={COPY.title} to="/home" />
        <section className="flex flex-col gap-5 rounded-panel bg-surface p-6 shadow-raised">
          <Copy as="h2" p={COPY.signedOutTitle} className="text-ur-title font-bold" />
          <Copy p={COPY.signedOutBody} />
          <BigButton
            label={COPY.signIn}
            onClick={() => void signIn()}
            loading={signingIn}
          />
        </section>
        {signInFailed && <Hint tone="coral" pair={COPY.signInFailed} />}
      </Screen>
    )
  }

  if (status === 'setupFailed') {
    return (
      <Screen>
        <BackBar title={COPY.title} to="/home" />
        <Hint tone="coral" pair={COPY.setupFailed} />
        <SignOutLink onSignOut={signOut} />
      </Screen>
    )
  }

  const invite = <InvitePanel familyId={familyId} />

  if (status === 'loading' || status === 'list') {
    return (
      <Screen className="lg:max-w-[1120px]">
        <BackBar title={COPY.title} to="/home" />
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-12">
          <div className="flex flex-col gap-6">
            {status === 'loading' ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : (
              (elders ?? []).map((elder) => (
                <ElderCard key={elder.elderId} elder={elder} now={now} />
              ))
            )}
          </div>
          <div className="flex flex-col gap-6">
            {invite}
            <SignOutLink onSignOut={signOut} />
          </div>
        </div>
      </Screen>
    )
  }

  return (
    <Screen className="lg:max-w-[1120px]">
      <BackBar title={COPY.title} to="/home" />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        {status === 'offline' ? <Hint tone="coral" pair={COPY.offline} /> : <EmptyCard />}
        {invite}
        <SignOutLink onSignOut={signOut} />
      </div>
    </Screen>
  )
}

export default function Family() {
  if (!services.family.available()) {
    return (
      <Screen>
        <BackBar title={COPY.title} to="/home" />
        <Hint pair={COPY.unavailable} />
      </Screen>
    )
  }
  return <FamilyScreen />
}
