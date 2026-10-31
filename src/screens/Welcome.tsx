import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PHRASES } from '@/data/phrases'
import { BigButton } from '@/ui/components/BigButton'
import { LangToggle } from '@/ui/components/LangToggle'
import { Screen } from '@/ui/components/Screen'
import { SpeakButton } from '@/ui/components/SpeakButton'
import { Localized } from '@/ui/components/UrduText'
import { bodyClass, useLang } from '@/ui/i18n'
import { requestPersistence } from '@/ui/persist'
import { S, type Pair } from '@/ui/strings'
import { useUiStore, type Lang } from '@/ui/store'

const CONTINUE_UR: Pair = { ur: 'اردو میں جاری رکھیں', en: 'Continue in Urdu' }
const CONTINUE_EN: Pair = { ur: 'انگریزی میں جاری رکھیں', en: 'Continue in English' }
const WELCOME_SPEECH: Pair = { ur: PHRASES.welcome, en: S.tagline.en }

export function Welcome() {
  const navigate = useNavigate()
  const lang = useLang()
  const setSettings = useUiStore((s) => s.setSettings)
  // First run: the language choice comes before the rest of the welcome.
  const [chosen, setChosen] = useState(false)

  function choose(next: Lang) {
    setSettings({ lang: next })
    setChosen(true)
  }

  function start() {
    setSettings({ onboarded: true })
    void requestPersistence()
    navigate('/home', { replace: true })
  }

  return (
    <Screen>
      <div className="flex justify-center">
        <LangToggle />
      </div>

      <img src="/assets/welcome-hero.webp" alt="" className="mx-auto h-auto w-full max-w-[18rem] mix-blend-multiply rounded-[28px]" />

      {!chosen ? (
        <section className="flex flex-col gap-4">
          <BigButton label={CONTINUE_UR} onClick={() => choose('ur')} />
          <BigButton variant="secondary" label={CONTINUE_EN} onClick={() => choose('en')} />
        </section>
      ) : (
        <>
          <header className="flex flex-col items-center gap-2 text-center">
            <Localized
              as="h1"
              p={S.appName}
              className={lang === 'ur' ? 'text-ur-display font-bold' : 'text-latin-display'}
            />
            <Localized as="p" p={S.tagline} className={bodyClass(lang)} />
            <SpeakButton pair={WELCOME_SPEECH} voiceId="welcome" />
          </header>

          <section className="flex flex-col gap-4 rounded-panel bg-surface p-6 shadow-raised">
            <Localized as="h2" p={S.privacyTitle} className="text-ur-title" />
            <ul className="flex flex-col">
              {S.privacyItems.map((item) => (
                <li
                  key={item.en}
                  className="border-b border-surface-sunk py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <Localized as="p" p={item} className={bodyClass(lang)} />
                </li>
              ))}
            </ul>
          </section>

          <BigButton label={S.start} onClick={start} />
        </>
      )}
    </Screen>
  )
}
