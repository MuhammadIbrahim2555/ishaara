import { useRef, useState } from 'react'
import type {
  ClipboardEvent as ReactClipboardEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import * as Switch from '@radix-ui/react-switch'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { JoinResult } from '@/types/contracts'
import { INVITE_ALPHABET, normaliseCode } from '@/sync/inviteCode'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { Hint } from '@/ui/components/Hint'
import { Screen } from '@/ui/components/Screen'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { services } from '@/ui/services'
import type { Pair } from '@/ui/strings'

type JoinFailure = Extract<JoinResult, { ok: false }>['error']
type Linked = { familyId: string; elderName: string }

const PART_LENGTH = 4

const C = {
  title: { ur: 'بچوں سے جڑیں', en: 'Connect with your children' },
  intro: {
    ur: 'بچوں کے فون پر جو کوڈ ہے، وہ یہاں لکھیں',
    en: "Type the code shown on your children's phone",
  },
  firstPart: { ur: 'کوڈ کے پہلے چار حروف', en: 'First four characters of the code' },
  secondPart: { ur: 'کوڈ کے آخری چار حروف', en: 'Last four characters of the code' },
  join: { ur: 'جوڑیں', en: 'Connect' },
  joining: { ur: 'جوڑ رہی ہوں…', en: 'Connecting…' },
  joinedTitle: { ur: 'آپ اپنے گھر والوں سے جڑ گئے', en: 'You are now connected with your family' },
  elderName: { ur: 'آپ کا نام', en: 'Your name' },
  sharedHeading: {
    ur: 'اگر آپ یہ آن کریں تو بچوں کو یہ نظر آئے گا:',
    en: 'If you turn this on, your children will see:',
  },
  sharedItems: [
    { ur: 'آپ نے کون سی چیزیں سیکھیں', en: 'Which things you learned' },
    { ur: 'ہفتے میں کتنی چیزیں سیکھیں', en: 'How many things you learned each week' },
  ] satisfies Pair[],
  neverHeading: { ur: 'یہ کبھی شیئر نہیں ہوگا:', en: 'This is never shared:' },
  neverBody: {
    ur: 'تصویریں، آواز، پیغامات، اسکرین',
    en: 'Photos, voice, messages, screen',
  },
  sharingLabel: { ur: 'بچوں کو میری ترقی دکھائیں', en: 'Let my children see my progress' },
  done: { ur: 'ٹھیک ہے', en: 'OK' },
}

const FAILURE: Record<JoinFailure, Pair> = {
  invalid: {
    ur: 'یہ کوڈ درست نہیں — دوبارہ دیکھ کر لکھیں',
    en: 'This code is not correct. Look at it again and type it.',
  },
  expired: {
    ur: 'یہ کوڈ پرانا ہو گیا — بچوں سے نیا کوڈ مانگیں',
    en: 'This code has expired. Ask your children for a new one.',
  },
  offline: {
    ur: 'انٹرنیٹ سے جڑیں، پھر دوبارہ کوشش کریں',
    en: 'Connect to the internet, then try again.',
  },
  unavailable: {
    ur: 'یہ سہولت ابھی موجود نہیں',
    en: 'This feature is not available yet.',
  },
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

/** Keeps only invite-alphabet characters, uppercased, at most 8. Dashes and spaces drop out. */
function cleanChars(raw: string): string {
  let out = ''
  for (const ch of raw.toUpperCase()) {
    if (INVITE_ALPHABET.includes(ch)) out += ch
  }
  return out.slice(0, PART_LENGTH * 2)
}

interface JoinedPanelProps {
  elderName: string
  sharingOn: boolean
  onSharingChange: (next: boolean) => void
  onDone: () => void
}

/** Success view: confirmation, what is and is not shared, and the sharing switch (off by default). */
function JoinedPanel({ elderName, sharingOn, onSharingChange, onDone }: JoinedPanelProps) {
  const lang = useLang()
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-4 text-center">
        <img src="/assets/icon-family.webp" alt="" className="size-32 object-contain" />
        <Copy as="h2" p={C.joinedTitle} className="text-ur-title leading-[1.9]" />
        <p {...langAttrs(lang)} className={bodyClass(lang)}>
          {C.elderName[lang]}: <span dir="auto">{elderName}</span>
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-panel bg-surface p-5 shadow-raised">
        <Copy as="h3" p={C.sharedHeading} className="text-ur-body font-bold leading-[1.8]" />
        <ul className="flex list-disc flex-col gap-2 ps-6">
          {C.sharedItems.map((item) => (
            <li key={item.en}>
              <Copy as="span" p={item} className="text-ur-body leading-[1.9]" />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-panel bg-surface-sunk p-5">
        <Copy as="h3" p={C.neverHeading} className="text-ur-body font-bold leading-[1.8]" />
        <Copy p={C.neverBody} />
      </section>

      <label
        htmlFor="join-sharing"
        className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-panel bg-surface p-5 shadow-raised"
      >
        <Copy
          as="span"
          p={C.sharingLabel}
          className="min-w-0 flex-1 text-ur-body font-bold leading-[1.8]"
        />
        <Switch.Root
          id="join-sharing"
          checked={sharingOn}
          onCheckedChange={(next) => onSharingChange(next)}
          data-control=""
          className="relative h-10 w-18 shrink-0 cursor-pointer rounded-pill border-2 border-teal-900 bg-surface-sunk transition-colors duration-[180ms] data-[state=checked]:bg-teal-900"
        >
          <Switch.Thumb className="block size-7 ms-1 rounded-full bg-white shadow-raised transition-[margin] duration-[180ms] data-[state=checked]:ms-[36px]" />
        </Switch.Root>
      </label>

      <BigButton label={C.done} onClick={onDone} />
    </div>
  )
}

/** Elder-facing screen: type the 8-character code from the child's phone to link the two. */
export default function Join() {
  const lang = useLang()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [linked, setLinked] = useState<Linked | null>(() => services.family.linkedFamily())
  const [sharingOn, setSharingOn] = useState<boolean>(() => services.family.sharing())

  const [first, setFirst] = useState(() =>
    cleanChars(params.get('code') ?? '').slice(0, PART_LENGTH),
  )
  const [second, setSecond] = useState(() =>
    cleanChars(params.get('code') ?? '').slice(PART_LENGTH),
  )
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<JoinFailure | null>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const secondRef = useRef<HTMLInputElement>(null)

  const codeReady = normaliseCode(first + second) !== null

  function changeFirst(raw: string) {
    setFailure(null)
    const clean = cleanChars(raw)
    setFirst(clean)
    if (clean.length === PART_LENGTH) secondRef.current?.focus()
  }

  function changeSecond(raw: string) {
    setFailure(null)
    setSecond(cleanChars(raw))
  }

  /** A pasted code fills both boxes; pasting into either box replaces the whole code. */
  function paste(e: ReactClipboardEvent<HTMLInputElement>) {
    const text = cleanChars(e.clipboardData.getData('text'))
    if (!text) return
    e.preventDefault()
    setFailure(null)
    setFirst(text.slice(0, PART_LENGTH))
    setSecond(text.slice(PART_LENGTH))
    if (text.length > PART_LENGTH) secondRef.current?.focus()
  }

  /** Backspace in an empty second box moves back into the first box. */
  function secondKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && second === '') {
      e.preventDefault()
      setFirst((prev) => prev.slice(0, -1))
      firstRef.current?.focus()
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const clean = normaliseCode(first + second)
    if (!clean || busy) return

    setBusy(true)
    setFailure(null)
    let result: JoinResult
    try {
      result = await services.family.joinWithCode(clean)
    } catch {
      result = { ok: false, error: 'offline' }
    }
    setBusy(false)

    if (result.ok) {
      setLinked({ familyId: result.familyId, elderName: result.elderName })
      setSharingOn(services.family.sharing())
      return
    }
    setFailure(result.error)
  }

  async function changeSharing(next: boolean) {
    setSharingOn(next)
    try {
      await services.family.setSharing(next)
    } catch {
      setSharingOn(!next)
    }
  }

  return (
    <Screen>
      <BackBar title={C.title} to="/home" />

      {linked ? (
        <JoinedPanel
          elderName={linked.elderName}
          sharingOn={sharingOn}
          onSharingChange={(next) => void changeSharing(next)}
          onDone={() => navigate('/home')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p {...langAttrs(lang)} className={`${bodyClass(lang)} text-ink-soft`}>
            {C.intro[lang]}
          </p>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="flex flex-col gap-5 rounded-panel bg-surface p-5 shadow-raised"
          >
            <div dir="ltr" className="flex items-center gap-3">
              <input
                ref={firstRef}
                type="text"
                lang="en"
                dir="ltr"
                value={first}
                onChange={(e) => changeFirst(e.target.value)}
                onPaste={paste}
                maxLength={PART_LENGTH}
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label={C.firstPart[lang]}
                className="h-16 min-w-0 flex-1 rounded-control border-2 border-teal-900 bg-surface-sunk text-center font-latin text-[2rem] leading-none font-bold tracking-[0.15em] text-ink uppercase"
              />
              <span aria-hidden="true" className="font-latin text-ur-title text-ink-soft">
                -
              </span>
              <input
                ref={secondRef}
                type="text"
                lang="en"
                dir="ltr"
                value={second}
                onChange={(e) => changeSecond(e.target.value)}
                onPaste={paste}
                onKeyDown={secondKeyDown}
                maxLength={PART_LENGTH}
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label={C.secondPart[lang]}
                className="h-16 min-w-0 flex-1 rounded-control border-2 border-teal-900 bg-surface-sunk text-center font-latin text-[2rem] leading-none font-bold tracking-[0.15em] text-ink uppercase"
              />
            </div>

            <BigButton
              type="submit"
              label={busy ? C.joining : C.join}
              loading={busy}
              disabled={!codeReady}
            />
          </form>

          {failure && <Hint tone="coral" pair={FAILURE[failure]} />}
        </div>
      )}
    </Screen>
  )
}
