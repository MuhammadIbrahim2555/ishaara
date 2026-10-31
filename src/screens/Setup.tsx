import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackBar } from '@/ui/components/BackBar'
import { BigButton } from '@/ui/components/BigButton'
import { BiLabel } from '@/ui/components/BiLabel'
import { HomeMock, PhoneMock } from '@/ui/components/PhoneMock'
import { Screen } from '@/ui/components/Screen'
import { Stepper } from '@/ui/components/Stepper'
import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { IconChevron, IconShare } from '@/ui/icons'
import { useInstallPrompt, type InstallPrompt } from '@/ui/hooks/useInstallPrompt'
import { S, type Pair } from '@/ui/strings'

const STEP_COUNT = S.setupSteps.length
/** iPhone flow: screen 0 is the Shortcut card, 1..STEP_COUNT the steps, the last one the test. */
const FINAL_SCREEN = STEP_COUNT + 1

type Platform = 'ios' | 'android' | 'other'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

const HOME_APPS = [
  'Messages',
  'Photos',
  'Camera',
  'Clock',
  'Mail',
  'Maps',
  'Notes',
  'Settings',
  'Calendar',
  'Music',
  'WhatsApp',
  'Wallet',
]

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

/** The iPhone screen for each step. Rows are labelled in English, as on the phone. */
function StepMock({ step }: { step: number }) {
  switch (step) {
    case 1:
      return <HomeMock apps={HOME_APPS} glow="Settings" />
    case 2:
      return (
        <PhoneMock
          title="Settings"
          rows={[
            { label: 'Wi-Fi', value: 'Home', chevron: true },
            { label: 'Bluetooth', value: 'On', chevron: true },
            { label: 'General', chevron: true },
            { label: 'Accessibility', chevron: true, glow: true },
            { label: 'Display & Brightness', chevron: true },
            { label: 'Wallpaper', chevron: true },
          ]}
        />
      )
    case 3:
      return (
        <PhoneMock
          title="Accessibility"
          rows={[
            { label: 'Vision', header: true },
            { label: 'VoiceOver', value: 'Off', chevron: true },
            { label: 'Zoom', value: 'Off', chevron: true },
            { label: 'Physical and Motor', header: true },
            { label: 'Touch', chevron: true, glow: true },
            { label: 'Face ID & Attention', chevron: true },
          ]}
        />
      )
    case 4:
      return (
        <PhoneMock
          title="Touch"
          rows={[
            { label: 'AssistiveTouch', value: 'Off', chevron: true },
            { label: 'Back Tap', value: 'Off', chevron: true, glow: true },
            { label: 'Haptic Touch', chevron: true },
            { label: 'Touch Accommodations', chevron: true },
          ]}
        />
      )
    case 5:
      return (
        <PhoneMock
          title="Back Tap"
          rows={[
            { label: 'Double Tap', value: 'None', chevron: true },
            { label: 'Triple Tap', value: 'None', chevron: true, glow: true },
          ]}
        />
      )
    case 6:
      return (
        <PhoneMock
          title="Triple Tap"
          rows={[
            { label: 'None' },
            { label: 'Accessibility Shortcut' },
            { label: 'Shortcuts', header: true },
            { label: 'Ishaara', check: true, glow: true },
          ]}
        />
      )
    default:
      return null
  }
}

/** Shortcut card: explains the Shortcut and holds the not-yet-live install button. */
function ShortcutCard() {
  const shortcutUrl = `${window.location.origin}/ask/photo?from=shortcut`
  const iCloudUrl = import.meta.env.VITE_IOS_SHORTCUT_URL
  const hasLink = typeof iCloudUrl === 'string' && iCloudUrl.trim() !== ''
  return (
    <section className="flex flex-col gap-5 rounded-panel bg-surface p-5 shadow-raised">
      <Copy as="h2" variant="title" p={S.shortcutTitle} />
      <Copy p={S.shortcutBody} />
      <ol className="flex flex-col gap-2">
        {S.shortcutSteps.map((item, i) => (
          <li key={item.en} className="flex items-center gap-3 rounded-control bg-teal-100 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-teal-900 text-label font-bold text-white">
              {i + 1}
            </span>
            <Copy as="span" p={item} className="font-bold" />
          </li>
        ))}
      </ol>
      <details className="group rounded-control border-2 border-teal-900 px-4">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
          <BiLabel label={S.shortcutManual} className="items-start text-start" />
          <span aria-hidden="true" className="flex text-teal-900 transition-transform duration-[180ms] group-open:rotate-90">
            <IconChevron className="size-7" />
          </span>
        </summary>
        <ol className="flex flex-col gap-3 pb-4">
          {S.shortcutManualSteps.map((item, i) => (
            <li key={item.en} className="flex flex-col gap-2">
              <Copy as="span" p={item} />
              {i === 3 && (
                <code dir="ltr" lang="en" className="break-all rounded-control bg-surface-sunk p-3 font-latin text-label">
                  {shortcutUrl}
                </code>
              )}
            </li>
          ))}
        </ol>
      </details>
      {hasLink ? (
        <BigButton
          label={S.addShortcut}
          icon={<IconShare />}
          onClick={() => {
            window.location.href = iCloudUrl
          }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <BigButton disabled label={S.shortcutNotAdded} icon={<IconShare />} />
          <Copy as="span" p={S.shortcutNotAddedNote} className="text-center text-ink-soft" />
        </div>
      )}
    </section>
  )
}

/** Android card: what the family does on Android, plus the install button when the browser offered it. */
function AndroidCard({ install }: { install: InstallPrompt }) {
  return (
    <section className="flex w-full flex-col gap-5 rounded-panel bg-surface p-5 text-start shadow-raised">
      <Copy as="h2" p={S.androidTitle} className="font-bold" />
      <Copy p={S.androidBody} />
      {install.canInstall && (
        <BigButton label={S.installApp} icon={<IconShare />} onClick={() => void install.install()} />
      )}
    </section>
  )
}

/**
 * Family guide. iPhone: Shortcut card, then six phone steps, then the test.
 * Android: the install and share card, then the test. Other devices: both sections on the first screen.
 */
export function Setup() {
  const navigate = useNavigate()
  const [platform] = useState<Platform>(detectPlatform)
  const install = useInstallPrompt()
  const showIos = platform !== 'android'
  const showAndroid = platform !== 'ios'
  const lastScreen = showIos ? FINAL_SCREEN : 1
  const [screen, setScreen] = useState(0)
  const stepData = showIos && screen >= 1 && screen <= STEP_COUNT ? S.setupSteps[screen - 1] : undefined

  return (
    <Screen>
      <BackBar title={S.setup} />

      {screen === 0 && (
        <div className="flex flex-col gap-6">
          {showIos && (
            <div className="flex flex-col gap-3">
              {platform === 'other' && <Copy as="h2" variant="title" p={S.headingIphone} />}
              <ShortcutCard />
            </div>
          )}
          {showAndroid && (
            <div className="flex flex-col gap-3">
              {platform === 'other' && <Copy as="h2" variant="title" p={S.headingAndroid} />}
              <AndroidCard install={install} />
            </div>
          )}
        </div>
      )}

      {stepData && (
        <>
          <Stepper current={screen} total={STEP_COUNT} />
          <section className="flex flex-col items-center gap-3 text-center">
            <Copy as="h2" variant="title" p={stepData.title} />
            <Copy p={stepData.caption} />
          </section>
          <StepMock step={screen} />
        </>
      )}

      {screen === lastScreen && (
        <section className="flex flex-col items-center gap-6 text-center">
          <img src="/assets/icon-star.webp" alt="" aria-hidden="true" className="size-32 object-contain" />
          <Copy variant="title" p={S.setupTry} />
        </section>
      )}

      <div className="flex flex-col gap-3">
        {screen === lastScreen ? (
          <BigButton label={S.goHome} onClick={() => navigate('/home')} />
        ) : (
          <BigButton label={S.next} onClick={() => setScreen(screen + 1)} />
        )}
        {screen > 0 && <BigButton variant="secondary" label={S.prev} onClick={() => setScreen(screen - 1)} />}
      </div>
    </Screen>
  )
}
