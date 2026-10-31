import * as Dialog from '@radix-ui/react-dialog'
import { BigButton } from '@/ui/components/BigButton'
import { BiLabel } from '@/ui/components/BiLabel'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { SMART_VOICE_COPY, type SmartVoiceChoice } from '@/ui/smartVoice'

interface SmartVoiceConsentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called once the learner picks an option. The caller saves the choice and keeps recording. */
  onChoose: (choice: SmartVoiceChoice) => void
}

/** Shown once, the first time the mic is tapped with no saved smart voice choice. Current language only. */
export function SmartVoiceConsent({ open, onOpenChange, onChoose }: SmartVoiceConsentProps) {
  const lang = useLang()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-panel bg-surface p-6 shadow-lifted">
          <Dialog.Title {...langAttrs(lang)} className="text-ur-title">
            {SMART_VOICE_COPY.consentTitle[lang]}
          </Dialog.Title>
          <Dialog.Description {...langAttrs(lang)} className={bodyClass(lang)}>
            {SMART_VOICE_COPY.consentBody[lang]}
          </Dialog.Description>
          <div className="flex flex-col gap-3">
            <BigButton
              label={SMART_VOICE_COPY.allow}
              onClick={() => onChoose('on')}
              data-control=""
            />
            <button
              type="button"
              data-control=""
              onClick={() => onChoose('off')}
              className="flex min-h-16 w-full items-center justify-center gap-4 rounded-control border-2 border-teal-900 bg-surface px-6 py-3 text-teal-900 transition duration-[180ms] ease-out hover:bg-teal-100 motion-safe:active:scale-[0.98] active:shadow-raised"
            >
              <BiLabel label={SMART_VOICE_COPY.keepOnPhone} />
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
