import { useState } from 'react'
import {
  cloneChatGithubRepo,
  fetchChatGithubRepos,
  fetchChatGithubStatus,
} from '../../../lib/api'

type GithubRepo = {
  fullName: string
  private: boolean
  defaultBranch: string
  htmlUrl: string
}

/**
 * Attach a GitHub repo workspace. Without App secrets, surfaces NEEDS_HUMAN.
 */
export function GithubBind({
  sandboxSessionId,
  onBound,
  onCancel,
}: {
  /** Optional existing sandbox to clone into. */
  sandboxSessionId?: string
  onBound: (result: { repo: string; note: string; sandboxSessionId?: string }) => void
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [repos, setRepos] = useState<GithubRepo[]>([])
  const [repoInput, setRepoInput] = useState('')
  const [note, setNote] = useState<string | null>(null)

  const refresh = async () => {
    setBusy(true)
    setNote(null)
    try {
      const st = await fetchChatGithubStatus()
      setConfigured(st.configured)
      if (!st.configured) {
        setNote(st.message || 'GitHub App not configured (NEEDS_HUMAN).')
        return
      }
      const list = await fetchChatGithubRepos()
      setRepos(list)
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'GitHub status failed')
    } finally {
      setBusy(false)
    }
  }

  const cloneRepo = async (fullName: string) => {
    if (!sandboxSessionId) {
      setNote('Create an Internal sandbox first, then clone into it.')
      return
    }
    setBusy(true)
    try {
      const data = await cloneChatGithubRepo({ repo: fullName, sandboxSessionId })
      onBound({
        repo: data.repo || fullName,
        note: data.ok
          ? `Cloned ${fullName}. Suggested branch: ${data.suggestedBranch || 'chat/…'}`
          : `Clone finished with errors for ${fullName}`,
        sandboxSessionId,
      })
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Clone failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inbox-local-bind" role="dialog" aria-label="Bind GitHub repo">
      <p className="inbox-empty" style={{ paddingTop: 0 }}>
        Link a GitHub repo (App install). Without App credentials this stays blocked for Henry
        (NEEDS_HUMAN).
      </p>
      <div className="inbox-project-actions">
        <button type="button" className="inbox-new-chat" disabled={busy} onClick={() => void refresh()}>
          Check GitHub App
        </button>
        <button type="button" className="inbox-new-chat" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
      {configured === false ? (
        <p className="inbox-empty">NEEDS_HUMAN: set GITHUB_APP_ID / PRIVATE_KEY / INSTALLATION_ID.</p>
      ) : null}
      {configured === true ? <p className="inbox-empty">App configured.</p> : null}
      {repos.length ? (
        <ul className="inbox-list">
          {repos.map((r) => (
            <li key={r.fullName} className="inbox-list-item">
              <button
                type="button"
                className="inbox-list-btn"
                disabled={busy || !sandboxSessionId}
                onClick={() => void cloneRepo(r.fullName)}
              >
                {r.fullName}
              </button>
              <span className="inbox-workspace-kind">{r.private ? 'Private' : 'Public'}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="inbox-search">
        <span className="aui-sr-only">owner/repo</span>
        <input
          type="text"
          value={repoInput}
          placeholder="owner/repo"
          disabled={busy}
          onChange={(e) => setRepoInput(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="inbox-new-chat"
        disabled={busy || !repoInput.trim()}
        onClick={() => {
          if (!configured) {
            onBound({
              repo: repoInput.trim(),
              note: 'Saved GitHub workspace placeholder — clone/PR wait on App secrets (NEEDS_HUMAN).',
            })
            return
          }
          void cloneRepo(repoInput.trim())
        }}
      >
        {configured ? 'Clone into sandbox' : 'Save placeholder'}
      </button>
      {note ? <p className="inbox-empty">{note}</p> : null}
    </div>
  )
}
