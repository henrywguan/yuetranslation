import { BiText } from './BiText'
import {
  sendHouseholdInvite,
  revokeHouseholdInvite,
  removeHouseholdMember,
} from '../lib/api'
import { biPlain, ui } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

type Props = {
  entitlement: Entitlement
  inviteEmail: string
  setInviteEmail: (v: string) => void
  inviteBusy: boolean
  setInviteBusy: (v: boolean) => void
  inviteSentTo: string | null
  setInviteSentTo: (v: string | null) => void
  inviteError: string | null
  setInviteError: (v: string | null) => void
  loadBootstrap: () => Promise<void>
}

/** Household seats, invite form, and member list for the account hub. */
export function AccountHubHousehold({
  entitlement,
  inviteEmail,
  setInviteEmail,
  inviteBusy,
  setInviteBusy,
  inviteSentTo,
  setInviteSentTo,
  inviteError,
  setInviteError,
  loadBootstrap,
}: Props) {
  if (
    !(
      entitlement.loggedIn &&
      (entitlement.plan === 'family' ||
        entitlement.plan === 'business' ||
        entitlement.household)
    )
  ) {
    return null
  }

  return (
    <section
      className="account-hub-section account-hub-area-household"
      aria-label={biPlain(ui.accountHousehold)}
    >
      <p className="account-hub-label">
        <BiText copy={ui.accountHousehold} size="sm" />
      </p>
      <p className="account-hub-seats">
        <BiText
          copy={ui.accountSeatsUsed(
            String(entitlement.household?.seatUsed ?? 1),
            String(
              entitlement.household?.seatLimit ??
                (entitlement.plan === 'business' ? 10 : 4),
            ),
          )}
          size="sm"
        />
      </p>

      {inviteSentTo ? (
        <div className="account-hub-invite-sent" role="status">
          <span className="account-hub-invite-sent-badge">
            <BiText copy={ui.accountInviteSent} size="sm" />
          </span>
          <p className="account-hub-invite-sent-msg">
            <BiText copy={ui.accountInviteSentTo(inviteSentTo)} size="sm" />
          </p>
        </div>
      ) : null}

      {!entitlement.household || entitlement.household.role === 'owner' ? (
        <form
          className="account-hub-invite-form"
          onSubmit={(e) => {
            e.preventDefault()
            const next = inviteEmail.trim()
            if (!next || inviteBusy) return
            setInviteBusy(true)
            setInviteError(null)
            void sendHouseholdInvite(next)
              .then(async (res) => {
                setInviteSentTo(res.invite?.email || next)
                setInviteEmail('')
                await loadBootstrap()
              })
              .catch((err: unknown) => {
                setInviteError(
                  err instanceof Error ? err.message : biPlain(ui.accountInviteError),
                )
              })
              .finally(() => setInviteBusy(false))
          }}
        >
          <label className="account-hub-invite-field">
            <span className="account-hub-voice-lang">
              <BiText copy={ui.accountInviteEmail} size="sm" />
            </span>
            <input
              type="email"
              className="account-hub-select account-hub-invite-input"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value)
                setInviteSentTo(null)
              }}
              placeholder={biPlain(ui.accountInvitePlaceholder)}
              autoComplete="email"
              required
            />
          </label>
          <button
            type="submit"
            className="account-hub-btn account-hub-btn--primary account-hub-invite-btn"
            disabled={inviteBusy || !inviteEmail.trim()}
          >
            <BiText copy={ui.accountInviteSend} size="sm" />
          </button>
        </form>
      ) : null}

      {inviteError ? <p className="account-hub-invite-error">{inviteError}</p> : null}

      {entitlement.household ? (
        <ul className="account-hub-member-list">
          {entitlement.household.members.map((m) => (
            <li key={m.userId} className="account-hub-member-row">
              <span className="account-hub-member-email">
                {m.email || m.userId.slice(0, 8)}
                {m.role === 'owner' ? (
                  <span className="account-hub-member-tag">
                    {' '}
                    · <BiText copy={ui.accountMemberOwner} size="sm" />
                  </span>
                ) : null}
              </span>
              {entitlement.household?.role === 'owner' && m.role === 'member' ? (
                <button
                  type="button"
                  className="account-hub-member-action"
                  onClick={() => {
                    void removeHouseholdMember(m.userId)
                      .then(async () => {
                        await loadBootstrap()
                      })
                      .catch(() => undefined)
                  }}
                >
                  <BiText copy={ui.accountMemberRemove} size="sm" />
                </button>
              ) : null}
            </li>
          ))}
          {entitlement.household.pendingInvites.map((inv) => (
            <li key={inv.id} className="account-hub-member-row is-pending">
              <span className="account-hub-member-email">
                {inv.email}
                <span className="account-hub-member-tag">
                  {' '}
                  · <BiText copy={ui.accountInvitePending} size="sm" />
                </span>
              </span>
              {entitlement.household?.role === 'owner' ? (
                <button
                  type="button"
                  className="account-hub-member-action"
                  onClick={() => {
                    void revokeHouseholdInvite(inv.id)
                      .then(async () => {
                        await loadBootstrap()
                      })
                      .catch(() => undefined)
                  }}
                >
                  <BiText copy={ui.accountInviteRevoke} size="sm" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
