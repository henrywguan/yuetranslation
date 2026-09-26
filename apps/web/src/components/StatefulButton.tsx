import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { MagneticButton } from '../landing/MagneticButton'
import './StatefulButton.css'

export type ButtonPhase = 'idle' | 'loading' | 'success'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  phase?: ButtonPhase
  children: ReactNode
  loadingLabel?: ReactNode
  successLabel?: ReactNode
  /** Landing CTAs — keep the magnetic hover. */
  magnetic?: boolean
}

/** Aceternity Stateful Button — idle / spinner / check, Harbor CSS. */
export function StatefulButton({
  phase = 'idle',
  children,
  loadingLabel,
  successLabel,
  magnetic = false,
  className = '',
  disabled,
  type = 'button',
  onClick,
  ...rest
}: Props) {
  const busy = phase === 'loading' || phase === 'success'
  const label = phase === 'loading' ? loadingLabel || children : phase === 'success' ? successLabel || children : children
  const inner = (
    <span className={`stateful-btn-inner is-${phase}`}>
      {phase === 'loading' ? <span className="stateful-btn-spin" aria-hidden="true" /> : null}
      {phase === 'success' ? <span className="stateful-btn-check" aria-hidden="true" /> : null}
      <span className="stateful-btn-label">{label}</span>
    </span>
  )

  const activate = () => {
    if (busy || disabled || !onClick) return
    onClick({ preventDefault() {}, stopPropagation() {} } as MouseEvent<HTMLButtonElement>)
  }

  if (magnetic) {
    return (
      <MagneticButton
        className={`stateful-btn ${className}`.trim()}
        disabled={disabled || busy}
        onClick={activate}
      >
        {inner}
      </MagneticButton>
    )
  }

  return (
    <button
      type={type}
      className={`stateful-btn ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={onClick}
      {...rest}
    >
      {inner}
    </button>
  )
}
