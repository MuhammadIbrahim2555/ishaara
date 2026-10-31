import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '@/ui/cn'
import type { Pair } from '@/ui/strings'
import { BiLabel } from './BiLabel'

export interface BigButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  label: Pair
  icon?: ReactNode
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function BigButton({
  label,
  icon,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ref,
  ...rest
}: BigButtonProps) {
  const primary = variant === 'primary'
  return (
    <button
      ref={ref}
      type="button"
      data-control=""
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'flex min-h-16 w-full items-center justify-center gap-4 rounded-control px-6 py-3 transition duration-[180ms] ease-out motion-safe:active:scale-[0.98] active:shadow-raised disabled:cursor-not-allowed disabled:opacity-60',
        primary
          ? 'bg-teal-900 text-white shadow-raised hover:bg-teal-700'
          : 'border-2 border-teal-900 bg-surface text-teal-900 hover:bg-teal-100',
        className,
      )}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-7 shrink-0 rounded-full border-[3px] border-current border-t-transparent motion-safe:animate-spin"
        />
      ) : icon ? (
        <span aria-hidden="true" className="flex shrink-0 [&>svg]:size-8">
          {icon}
        </span>
      ) : null}
      <BiLabel label={label} />
    </button>
  )
}
