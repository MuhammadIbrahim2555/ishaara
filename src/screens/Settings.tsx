import { useEffect, useReducer, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { useNavigate } from 'react-router-dom'
import type { LoadProgress, ModelId } from '@/types/contracts'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { BiLabel } from '@/ui/components/BiLabel'
import { Hint } from '@/ui/components/Hint'
import { LangToggle } from '@/ui/components/LangToggle'
import { Screen } from '@/ui/components/Screen'
import { Localized } from '@/ui/components/UrduText'
import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { IconHelp, IconTrash } from '@/ui/icons'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'
import { useUiStore, type TextSize } from '@/ui/store'

interface SegmentOption<T extends string> {
  value: T
  label: Pair
}

const TEXT_OPTIONS: SegmentOption<TextSize>[] = [
  { value: 'normal', label: S.textNormal },
  { value: 'large', label: S.textLarge },
  { value: 'xl', label: S.textXl },
]

const OTHER_SCREENS: Pair = { ur: 'دوسری اسکرینیں', en: 'Other screens' }

/** Row title: a label, so both languages show (current one first). Forced to the start edge. */
const ROW_LABEL_CLASS = 'items-start! text-start!'

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: Pair
  value: T
  options: SegmentOption<T>[]
  onChange: (next: T) => void
}) {
  const lang = useLang()
  return (
    <div
      role="group"
      aria-label={label[lang]}
      className="flex gap-1 rounded-control bg-surface-sunk p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            data-control=""
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-16 flex-1 items-center justify-center rounded-[16px] px-2 transition-colors duration-[180ms]',
              active ? 'bg-teal-900 text-white' : 'text-ink hover:bg-surface',
            )}
          >
            <BiLabel label={option.label} />
          </button>
        )
      })}
    </div>
  )
}

function ToggleRow({
  id,
  title,
  hint,
  checked,
  onChange,
}: {
  id: string
  title: Pair
  hint: Pair
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-5">
      <label htmlFor={id} className="flex min-w-0 cursor-pointer flex-col gap-1">
        <BiLabel label={title} className={ROW_LABEL_CLASS} />
        <Localized as="span" p={hint} className="text-label text-ink-soft" />
      </label>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        data-control=""
        className="relative h-9 w-16 shrink-0 cursor-pointer rounded-pill border-2 border-teal-900 bg-surface-sunk transition-colors duration-[180ms] data-[state=checked]:bg-teal-900"
      >
        <Switch.Thumb className="block size-6 translate-x-[3px] rounded-full bg-white shadow-raised transition-transform duration-[180ms] data-[state=checked]:translate-x-[33px]" />
      </Switch.Root>
    </li>
  )
}

const MODEL_ORDER: ModelId[] = ['ocr', 'whisper', 'florence', 'translate', 'tts']

const STATE_TEXT: Record<LoadProgress['status'], Pair> = {
  idle: { ur: 'لوڈ نہیں ہوا', en: 'Not loaded' },
  downloading: { ur: 'ڈاؤن لوڈ ہو رہا ہے', en: 'Downloading' },
  ready: { ur: 'تیار', en: 'Ready' },
  error: { ur: 'خرابی', en: 'Error' },
}

function downloadingText(percent: number): Pair {
  return {
    ur: `${STATE_TEXT.downloading.ur} ${percent}%`,
    en: `${STATE_TEXT.downloading.en} ${percent}%`,
  }
}

function deviceLine(device: string): Pair {
  return { ur: `آلہ: ${device}`, en: `device: ${device}` }
}

/** Small status chip per on-device model, plus the compute device. Updates as models load. */
function ModelStatus() {
  const lang = useLang()
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  useEffect(() => services.models.onProgress(() => refresh()), [])

  const status = services.models.status()
  const device = services.models.device()

  return (
    <section
      aria-label={S.modelsTitle[lang]}
      className="flex flex-col gap-3 rounded-panel bg-surface p-5 shadow-raised"
    >
      <Localized as="p" p={S.modelsTitle} className="text-ur-body font-bold leading-[2]" />
      <ul className="flex flex-wrap gap-2">
        {MODEL_ORDER.map((id) => {
          const entry = status[id]
          const state: Pair =
            entry.status === 'downloading'
              ? downloadingText(Math.round(entry.progress * 100))
              : STATE_TEXT[entry.status]
          return (
            <li key={id} className="rounded-pill bg-teal-100 px-3 py-1">
              <Localized
                as="span"
                p={{ ur: `${id}: ${state.ur}`, en: `${id}: ${state.en}` }}
                className="text-label text-ink"
              />
            </li>
          )
        })}
      </ul>
      <Localized as="p" p={deviceLine(device)} className="text-label text-ink-soft" />
    </section>
  )
}

const FAMILY_COPY = {
  title: { ur: 'گھر والے', en: 'Family' },
  linkedAs: (name: string): Pair => ({
    ur: `آپ ${name} کے طور پر جڑی ہیں`,
    en: `You are linked as ${name}`,
  }),
  join: { ur: 'بچوں سے جوڑیں', en: 'Connect with my children' },
  sharing: { ur: 'بچوں کو میری ترقی دکھائیں', en: 'Show my progress to my children' },
  sharingHint: {
    ur: 'صرف ترقی — تصویریں، آواز اور پیغامات کبھی نہیں',
    en: 'Progress only — never photos, voice or messages',
  },
  unlink: { ur: 'الگ ہو جائیں اور سب مٹا دیں', en: 'Unlink and delete everything' },
  unlinkTitle: { ur: 'کیا الگ ہونا ہے اور سب مٹانا ہے؟', en: 'Unlink and delete everything?' },
  unlinkBody: {
    ur: 'گھر والے آپ کی ترقی دیکھنا بند کر دیں گے، اور اس فون سے جڑا ہوا سارا ڈیٹا مٹ جائے گا۔',
    en: 'Your family will stop seeing your progress, and all linked data will be removed.',
  },
  confirmUnlink: { ur: 'ہاں، الگ ہو جائیں', en: 'Yes, unlink' },
  familyDashboard: { ur: 'گھر والوں کا ڈیش بورڈ', en: 'Family dashboard (for children)' },
  judgeView: { ur: 'جج کا منظر', en: 'Judge view' },
}

/** Coral (gentle attention, not error red) secondary action, 64px tall. */
const CORAL_BUTTON =
  'flex min-h-16 w-full items-center justify-center gap-4 rounded-control border-2 border-coral bg-coral/15 px-6 py-3 text-ink transition duration-[180ms] ease-out hover:bg-coral/25 motion-safe:active:scale-[0.98] active:shadow-raised disabled:cursor-not-allowed disabled:opacity-60'

/** Family link section. Hidden when the family service is unavailable. */
function FamilySection() {
  const navigate = useNavigate()
  const lang = useLang()
  const [linked, setLinked] = useState(() => services.family.linkedFamily())
  const [sharing, setSharingState] = useState(() => services.family.sharing())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!services.family.available()) return null

  async function changeSharing(on: boolean) {
    const previous = sharing
    setSharingState(on)
    try {
      await services.family.setSharing(on)
    } catch {
      setSharingState(previous)
    }
  }

  async function unlink() {
    setBusy(true)
    try {
      await services.family.unlinkAndDelete()
    } catch {
      setBusy(false)
      return
    }
    setBusy(false)
    setConfirmOpen(false)
    setLinked(null)
    setSharingState(false)
  }

  return (
    <section
      aria-label={FAMILY_COPY.title[lang]}
      className="flex flex-col gap-3 rounded-panel bg-surface p-5 shadow-raised"
    >
      <Localized as="p" p={FAMILY_COPY.title} className="text-ur-body font-bold leading-[2]" />
      {linked ? (
        <>
          <Localized
            as="p"
            p={FAMILY_COPY.linkedAs(linked.elderName)}
            className="text-ur-body leading-[1.9]"
          />
          <ul className="divide-y divide-surface-sunk">
            <ToggleRow
              id="setting-family-sharing"
              title={FAMILY_COPY.sharing}
              hint={FAMILY_COPY.sharingHint}
              checked={sharing}
              onChange={(on) => void changeSharing(on)}
            />
          </ul>
          <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Dialog.Trigger asChild>
              <button type="button" data-control="" className={CORAL_BUTTON}>
                <BiLabel label={FAMILY_COPY.unlink} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
              <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-panel bg-surface p-6 shadow-lifted">
                <Dialog.Title {...langAttrs(lang)} className="text-ur-title">
                  {FAMILY_COPY.unlinkTitle[lang]}
                </Dialog.Title>
                <Dialog.Description {...langAttrs(lang)} className={bodyClass(lang)}>
                  {FAMILY_COPY.unlinkBody[lang]}
                </Dialog.Description>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    data-control=""
                    disabled={busy}
                    onClick={() => void unlink()}
                    className={CORAL_BUTTON}
                  >
                    <BiLabel label={FAMILY_COPY.confirmUnlink} />
                  </button>
                  <Dialog.Close asChild>
                    <BigButton variant="secondary" label={S.keepIt} />
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ) : (
        <BigButton label={FAMILY_COPY.join} onClick={() => navigate('/join')} />
      )}
    </section>
  )
}

/** Small secondary links to the child-side family dashboard and the judge view. */
function FamilyLinks() {
  const navigate = useNavigate()
  const lang = useLang()
  const linkClass =
    'min-h-14 rounded-control px-3 text-label font-bold text-teal-900 underline underline-offset-4 transition-colors duration-[180ms] hover:bg-teal-100'
  return (
    <nav aria-label={OTHER_SCREENS[lang]} className="flex flex-wrap justify-center gap-2">
      <button
        type="button"
        data-control=""
        onClick={() => navigate('/family')}
        className={linkClass}
      >
        <BiLabel label={FAMILY_COPY.familyDashboard} />
      </button>
      <button type="button" data-control="" onClick={() => navigate('/judge')} className={linkClass}>
        <BiLabel label={FAMILY_COPY.judgeView} />
      </button>
    </nav>
  )
}

export function Settings() {
  const navigate = useNavigate()
  const lang = useLang()
  const settings = useUiStore((s) => s.settings)
  const setSettings = useUiStore((s) => s.setSettings)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState(false)

  async function deleteEverything() {
    setBusy(true)
    try {
      await services.library.clear()
    } catch {
      setBusy(false)
      return
    }
    setBusy(false)
    setConfirmOpen(false)
    setDeleted(true)
  }

  return (
    <Screen nav>
      <BackBar title={S.settingsTitle} to="/home" />

      <ul className="divide-y divide-surface-sunk rounded-panel bg-surface px-5 shadow-raised">
        <li className="flex flex-col gap-3 py-5">
          <BiLabel label={S.textSize} className={ROW_LABEL_CLASS} />
          <Segmented
            label={S.textSize}
            value={settings.textSize}
            options={TEXT_OPTIONS}
            onChange={(textSize) => setSettings({ textSize })}
          />
        </li>
        <ToggleRow
          id="setting-contrast"
          title={S.contrast}
          hint={S.contrastHint}
          checked={settings.contrast === 'high'}
          onChange={(on) => setSettings({ contrast: on ? 'high' : 'normal' })}
        />
        <ToggleRow
          id="setting-simple"
          title={S.simpleMode}
          hint={S.simpleHint}
          checked={settings.simpleMode}
          onChange={(simpleMode) => setSettings({ simpleMode })}
        />
        <li className="flex flex-col gap-3 py-5">
          <BiLabel label={S.language} className={ROW_LABEL_CLASS} />
          <LangToggle />
        </li>
      </ul>

      <FamilySection />

      <ModelStatus />

      <BigButton
        variant="secondary"
        label={S.setup}
        icon={<IconHelp />}
        onClick={() => navigate('/setup')}
      />

      {deleted && <Hint tone="success" pair={S.deleted} />}

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Trigger asChild>
          <BigButton variant="secondary" label={S.deleteAll} icon={<IconTrash />} />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-panel bg-surface p-6 shadow-lifted">
            <Dialog.Title {...langAttrs(lang)} className="text-ur-title">
              {S.deleteTitle[lang]}
            </Dialog.Title>
            <Dialog.Description {...langAttrs(lang)} className={bodyClass(lang)}>
              {S.deleteBody[lang]}
            </Dialog.Description>
            <div className="flex flex-col gap-3">
              <BigButton
                label={S.confirmDelete}
                loading={busy}
                onClick={() => void deleteEverything()}
              />
              <Dialog.Close asChild>
                <BigButton variant="secondary" label={S.keepIt} />
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <FamilyLinks />
    </Screen>
  )
}
