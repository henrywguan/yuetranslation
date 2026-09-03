import type { ComponentType } from 'react'
import type { AuthEmailCopy } from '../authEmailMeta.js'

export type AuthEmailProps = {
  copy: AuthEmailCopy
  verifyUrl: string
  otpCode?: string | null
  appUrl?: string
  logoSrc?: string
}

export const AuthEmail: ComponentType<AuthEmailProps>
export default AuthEmail
