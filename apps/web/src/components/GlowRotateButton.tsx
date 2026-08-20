import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

/** Rectangular CTA with a rotating jade glow border (Webflow-style). */
export function GlowRotateButton({ children, className = '', type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={`glow-rotate ${className}`.trim()} {...rest}>
      <span className="glow-rotate-ring" aria-hidden="true">
        <span className="glow-rotate-spin" />
      </span>
      <span className="glow-rotate-inner">{children}</span>
    </button>
  )
}
