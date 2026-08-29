import type { ComponentType } from 'react'

export type SignupEmailProps = {
  email: string
  userId: string
  provider: string
  emailConfirmed: string
  createdAt: string
  adminUrl: string
  appUrl?: string
  logoSrc?: string
}

export const SignupEmail: ComponentType<SignupEmailProps>
export default SignupEmail
