import { cn } from '@/ui/cn'
import { IconSettings } from '@/ui/icons'

const HAND = '/assets/helper-hand.webp'

export interface MockRow {
  label: string
  value?: string
  chevron?: boolean
  check?: boolean
  glow?: boolean
  /** Section heading rather than a tappable row. */
  header?: boolean
}

/** Glow ring + hand pointing at a row. Used on both the settings list and the home grid. */
function Pointer() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[3px] rounded-[8px] border-[3px] border-saffron motion-safe:animate-pulse"
      />
      <img
        src={HAND}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute end-2 top-full z-10 -mt-3 w-16 mix-blend-multiply"
      />
    </>
  )
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

const PHONE_FRAME = 'mx-auto w-full max-w-[300px] rounded-[40px] bg-[#1F2A2B] p-[7px] shadow-lifted'

/** Crisp HTML recreation of an iPhone Settings list. Labels are English, as on the phone. */
export function PhoneMock({ title, rows }: { title: string; rows: MockRow[] }) {
  return (
    <div lang="en" dir="ltr" className={PHONE_FRAME}>
      <div
        className="flex min-h-[400px] flex-col rounded-[33px] bg-[#F2F2F7] px-3 pb-6 pt-8 text-[#000]"
        style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}
      >
        <p className="pb-3 text-center text-[17px] font-semibold">{title}</p>
        <ul className="rounded-[12px] bg-white">
          {rows.map((row) =>
            row.header ? (
              <li key={row.label} className="px-4 pb-1.5 pt-4 text-[13px] text-[#6D6D72]">
                {row.label}
              </li>
            ) : (
              <li
                key={row.label}
                className={cn(
                  'relative flex items-center justify-between gap-3 border-b border-[#E5E5EA] px-4 py-3 text-[17px] last:border-b-0',
                  row.glow && 'bg-[#FCEBCB]',
                )}
              >
                {row.glow && <Pointer />}
                <span className="min-w-0 truncate">{row.label}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[#8E8E93]">
                  {row.value && <span>{row.value}</span>}
                  {row.check && (
                    <span className="text-[#007AFF]">
                      <CheckMark />
                    </span>
                  )}
                  {row.chevron && <Chevron />}
                </span>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  )
}

const TILE_COLOURS = ['#E07A5F', '#1C6E70', '#E8A33D', '#4A5556', '#DCEDEA', '#F3ECE1']

/** Crisp HTML recreation of an iPhone home screen grid. `glow` names the app to tap. */
export function HomeMock({ apps, glow }: { apps: string[]; glow: string }) {
  return (
    <div lang="en" dir="ltr" className={PHONE_FRAME}>
      <div
        className="grid min-h-[400px] grid-cols-4 content-start gap-x-3 gap-y-5 rounded-[33px] bg-[#DCEDEA] px-4 pb-6 pt-12"
        style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}
      >
        {apps.map((app, i) => {
          const isGlow = app === glow
          return (
            <div key={app} className="relative flex flex-col items-center gap-1">
              <span
                className="flex size-12 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: app === 'Settings' ? '#8E8E93' : TILE_COLOURS[i % TILE_COLOURS.length] }}
              >
                {app === 'Settings' && <IconSettings className="size-7 text-white" />}
              </span>
              <span className="truncate text-[10px] text-[#000]">{app}</span>
              {isGlow && <Pointer />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
