import type { ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { langAttrs, useLang } from '@/ui/i18n'
import type { Pair } from '@/ui/strings'

type TextTag = 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'strong'

interface TextProps {
  as?: TextTag
  className?: string
  children?: ReactNode
}

/** Always Urdu: lang="ur" dir="rtl". */
export function UrduText({ as: Tag = 'span', className, children }: TextProps) {
  return (
    <Tag {...langAttrs('ur')} className={cn('font-urdu', className)}>
      {children}
    </Tag>
  )
}

/** Always Latin: lang="en" dir="ltr". */
export function LatinText({ as: Tag = 'span', className, children }: TextProps) {
  return (
    <Tag {...langAttrs('en')} className={cn('font-latin', className)}>
      {children}
    </Tag>
  )
}

interface LocalizedProps {
  p: Pair
  as?: TextTag
  className?: string
}

/** Shows the string in the current UI language. */
export function Localized({ p, as: Tag = 'span', className }: LocalizedProps) {
  const lang = useLang()
  return (
    <Tag {...langAttrs(lang)} className={className}>
      {p[lang]}
    </Tag>
  )
}
