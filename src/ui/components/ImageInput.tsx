import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { SAMPLE_SCREENS, loadSampleBlob } from '@/core'
import type { SampleScreen } from '@/data/samples'
import { cn } from '@/ui/cn'
import { bodyClass, langAttrs, otherLang, useLang } from '@/ui/i18n'
import { IconImage } from '@/ui/icons'
import { services } from '@/ui/services'
import { S, type Pair } from '@/ui/strings'
import { BigButton } from './BigButton'
import { BiLabel } from './BiLabel'
import { Hint } from './Hint'

interface ImageInputProps {
  /** Receives the chosen screenshot. */
  onPick: (image: Blob) => void
  /** App was opened by the Shortcut (?from=shortcut): show the giant "Show" button first. */
  fromShortcut?: boolean
  /** Sample id to offer first in the chooser (Ask: wa_chat; Check: the next expected screen). */
  suggestedSampleId?: string
}

/** English names of the sample screens. The data only has the Urdu name (titleUr). */
const SAMPLE_TITLE_EN: Record<string, string | undefined> = {
  wa_chats: 'Chats list',
  wa_chat: 'Chat',
  wa_photo_picker: 'Photo picker',
  wa_photo_preview: 'View and send photo',
}

/** Puts the suggested sample first; keeps the default order otherwise. */
function orderSamples(suggestedId?: string): SampleScreen[] {
  const suggested = SAMPLE_SCREENS.find((sample) => sample.id === suggestedId)
  if (!suggested) return SAMPLE_SCREENS
  return [suggested, ...SAMPLE_SCREENS.filter((sample) => sample !== suggested)]
}

/** Text in the current UI language only. Body text gets bodyClass. */
function Copy({ p, className }: { p: Pair; className?: string }) {
  const lang = useLang()
  return (
    <p {...langAttrs(lang)} className={cn(bodyClass(lang), className)}>
      {p[lang]}
    </p>
  )
}

/** Shared screenshot input: Show my screen (clipboard), photo picker, drop zone and sample chooser (desktop). */
export function ImageInput({ onPick, fromShortcut = false, suggestedSampleId }: ImageInputProps) {
  const lang = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [clipMissed, setClipMissed] = useState(false)
  const [notice, setNotice] = useState<'notPicture' | 'sample' | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)

  // Back from the screenshot flow: bring the giant Show button back (the clipboard is read on tap).
  useEffect(() => {
    if (!fromShortcut) return
    return services.capture.onReturn(() => setClipMissed(false))
  }, [fromShortcut])

  function openPicker() {
    inputRef.current?.click()
  }

  function take(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setNotice('notPicture')
      return
    }
    setNotice(null)
    onPick(file)
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    take(e.target.files?.[0])
    e.target.value = ''
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    take(e.dataTransfer.files[0])
  }

  // Runs inside the tap so the browser allows the clipboard read.
  async function showShortcutScreen() {
    const blob = await services.capture.readClipboardImage()
    if (blob) {
      setClipMissed(false)
      onPick(blob)
      return
    }
    setClipMissed(true)
  }

  async function pickSample(url: string) {
    setNotice(null)
    try {
      const blob = await loadSampleBlob(url)
      setSampleOpen(false)
      onPick(blob)
    } catch {
      setNotice('sample')
    }
  }

  const samples = orderSamples(suggestedSampleId)
  const noticeText: Pair | null =
    notice === 'notPicture' ? S.pickPicture : notice === 'sample' ? S.sampleUnavailable : null
  const showPicker = !fromShortcut || clipMissed

  return (
    <div className="flex flex-col gap-6">
      {fromShortcut && (
        <button
          type="button"
          data-control=""
          onClick={() => void showShortcutScreen()}
          className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-6 rounded-tile bg-teal-900 p-6 text-white shadow-lifted transition duration-[180ms] ease-out motion-safe:active:scale-[0.98]"
        >
          <img
            src="/assets/helper-hand.webp"
            alt=""
            aria-hidden="true"
            className="size-44 rounded-[28px] object-contain"
          />
          <span className="flex flex-col items-center gap-1 text-center">
            <span
              {...langAttrs(lang)}
              className={cn(
                'font-bold leading-[1.4]',
                lang === 'ur' ? 'text-[48px]' : 'text-[40px]',
              )}
            >
              {S.dikhayein[lang]}
            </span>
            <span
              {...langAttrs(otherLang(lang))}
              className={cn('text-[18px] leading-snug', otherLang(lang) === 'en' && 'font-latin')}
            >
              {S.dikhayein[otherLang(lang)]}
            </span>
          </span>
        </button>
      )}

      {fromShortcut && clipMissed && <Hint pair={S.tripleTapFirst} />}

      {showPicker ? (
        <BigButton label={S.showScreen} icon={<IconImage />} onClick={openPicker} />
      ) : (
        <button
          type="button"
          data-control=""
          onClick={openPicker}
          className="self-center rounded-control px-4 py-3 text-teal-900 underline underline-offset-4 transition duration-[180ms] hover:bg-teal-100"
        >
          <BiLabel label={S.pickFromPhotos} />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={onInputChange}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'hidden min-h-56 flex-col items-center justify-center gap-4 rounded-tile border-2 border-dashed border-teal-700 bg-surface-sunk p-8 transition-colors duration-[180ms] lg:flex',
          dragOver && 'bg-teal-100',
        )}
      >
        <Copy p={S.dropHere} />
        <button
          type="button"
          data-control=""
          aria-expanded={sampleOpen}
          onClick={() => {
            setNotice(null)
            setSampleOpen((open) => !open)
          }}
          className="min-h-14 rounded-control border-2 border-teal-900 bg-surface px-6 text-teal-900 transition duration-[180ms] hover:bg-teal-100"
        >
          <BiLabel label={S.trySample} />
        </button>

        {sampleOpen && (
          <div className="grid w-full grid-cols-2 gap-4">
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                data-control=""
                onClick={() => void pickSample(sample.url)}
                className={cn(
                  'flex min-h-14 flex-col items-center gap-3 rounded-tile border-2 bg-surface p-3 transition duration-[180ms] hover:bg-teal-100',
                  sample.id === suggestedSampleId ? 'border-teal-900' : 'border-teal-700',
                )}
              >
                <img
                  src={sample.url}
                  alt=""
                  loading="lazy"
                  className="h-auto w-[120px] max-w-full rounded-control bg-white object-contain"
                />
                <BiLabel
                  label={{ ur: sample.titleUr, en: SAMPLE_TITLE_EN[sample.id] ?? sample.id }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {noticeText && <Hint tone="coral" pair={noticeText} />}
    </div>
  )
}
