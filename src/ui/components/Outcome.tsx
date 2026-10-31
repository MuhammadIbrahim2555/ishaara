import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/ui/cn'
import { useObjectUrl } from '@/ui/hooks/useObjectUrl'
import { bodyClass, langAttrs, useLang } from '@/ui/i18n'
import { IconShare } from '@/ui/icons'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'
import { BigButton } from './BigButton'
import { Hint } from './Hint'
import { SpeakButton } from './SpeakButton'

const SHARE_TEXT = 'Ammi ko is screen par madad chahiye'

/** Text in the current UI language only. Body text gets bodyClass. */
function Copy({ p, className }: { p: Pair; className?: string }) {
  const lang = useLang()
  return (
    <p {...langAttrs(lang)} className={cn(bodyClass(lang), className)}>
      {p[lang]}
    </p>
  )
}

/** Shown when the screen has a secret code on it. Never offers to continue. */
export function SafetyPanel() {
  const navigate = useNavigate()
  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <img src="/assets/icon-shield.webp" alt="" aria-hidden="true" className="size-40 rounded-tile object-contain" />
      <div className="flex items-center justify-center gap-3">
        <Copy p={S.safetyBody} />
        <SpeakButton pair={S.safetyBody} voiceId="safety_otp" />
      </div>
      <BigButton label={S.goHome} onClick={() => navigate('/home')} />
    </section>
  )
}

interface AskFamilyPanelProps {
  image: Blob
  onRetry: () => void
}

/** Screen the app cannot help with yet: share it with family. */
export function AskFamilyPanel({ image, onRetry }: AskFamilyPanelProps) {
  const previewUrl = useObjectUrl(image)
  const [notice, setNotice] = useState<Pair | null>(null)

  async function share() {
    setNotice(null)
    const outcome = await services.share.shareImage(image, SHARE_TEXT)
    if (outcome === 'unsupported') setNotice(S.shareUnsupported)
  }

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      {previewUrl && (
        <img src={previewUrl} alt="" className="max-h-64 rounded-panel object-contain shadow-raised" />
      )}
      <div className="flex items-center justify-center gap-3">
        <Copy p={S.familyBody} />
        <SpeakButton pair={S.familyBody} voiceId="ask_family" />
      </div>
      <div className="flex w-full flex-col gap-3">
        <BigButton label={S.askFamily} icon={<IconShare />} onClick={() => void share()} />
        <BigButton variant="secondary" label={S.retry} onClick={onRetry} />
      </div>
      {notice && <Hint pair={notice} />}
    </section>
  )
}
