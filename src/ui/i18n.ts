import { useUiStore, type Lang } from '@/ui/store'

export function useLang(): Lang {
  return useUiStore((s) => s.settings.lang)
}

export function otherLang(lang: Lang): Lang {
  return lang === 'ur' ? 'en' : 'ur'
}

/** lang and dir attributes for a block of text in the given language. */
export function langAttrs(lang: Lang) {
  return { lang, dir: lang === 'ur' ? 'rtl' : 'ltr' } as const
}

/** Body text size and line-height for a block in the given language. */
export function bodyClass(lang: Lang): string {
  return lang === 'ur' ? 'text-ur-body leading-[1.9]' : 'text-body leading-normal'
}
