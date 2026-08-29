import type { ComponentType } from 'react'

export type UpgradeEmailProps = {
  email: string
  userId: string
  fromPlan: string
  toPlan: string
  source: string
  when: string
  stripeCustomerId?: string | null
  adminUrl: string
  appUrl?: string
  logoSrc?: string
}

export const UpgradeEmail: ComponentType<UpgradeEmailProps>
export default UpgradeEmail
