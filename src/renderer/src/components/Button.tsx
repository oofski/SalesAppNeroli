import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost'
type Size = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  // Primary: brand-dark bg, white text — Upload, Export, main actions (§4.4)
  primary: 'bg-brand-dark text-white hover:bg-brand-mid disabled:bg-brand-stone disabled:text-text-secondary',
  // Secondary: white bg, brand-dark border + text
  secondary: 'bg-white text-brand-dark border border-brand-dark hover:bg-brand-light',
  // Destructive: status-red — delete / reset only
  destructive: 'bg-status-red text-white hover:brightness-110',
  ghost: 'bg-transparent text-text-secondary hover:bg-brand-light hover:text-brand-dark'
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mid/40 disabled:cursor-not-allowed',
        size === 'md' ? 'h-9 px-4 text-body' : 'h-8 px-3 text-body-sm',
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
