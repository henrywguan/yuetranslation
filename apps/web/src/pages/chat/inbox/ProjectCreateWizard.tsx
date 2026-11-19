import { useState } from 'react'
import type { ChatInboxWorkspaceKind } from '../../../lib/chatInbox'

export type ProjectWizardWorkspace = ChatInboxWorkspaceKind | 'none'

const WORKSPACE_OPTIONS: Array<{
  id: ProjectWizardWorkspace
  label: string
  hint: string
}> = [
  {
    id: 'internal',
    label: 'Internal sandbox',
    hint: 'Cloud stub / Fly session for coding tools',
  },
  {
    id: 'local',
    label: 'Local folder',
    hint: 'Mirror a folder from this device',
  },
  {
    id: 'github',
    label: 'GitHub repo',
    hint: 'Clone into a sandbox, then open PRs',
  },
  {
    id: 'none',
    label: 'Skip for now',
    hint: 'Bind a workspace later from Workspaces',
  },
]

export function ProjectCreateWizard({
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  busy?: boolean
  error?: string | null
  onConfirm: (opts: { title: string; workspace: ProjectWizardWorkspace }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [workspace, setWorkspace] = useState<ProjectWizardWorkspace>('internal')

  const canSubmit = title.trim().length > 0 && !busy

  return (
    <section className="inbox-section inbox-project-panel inbox-project-wizard" aria-label="New project">
      <div className="inbox-section-head">
        <span className="inbox-section-toggle" style={{ cursor: 'default' }}>
          New project
        </span>
      </div>
      <p className="inbox-empty" style={{ paddingTop: 0 }}>
        Name the Project and bind a workspace so Overseer can nest agents with a real coding surface.
      </p>
      <label className="inbox-memory">
        <span className="inbox-agents-label">Name</span>
        <input
          type="text"
          value={title}
          placeholder="Project name"
          autoFocus
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) {
              e.preventDefault()
              onConfirm({ title: title.trim(), workspace })
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
        />
      </label>
      <fieldset className="inbox-wizard-ws" disabled={busy}>
        <legend className="inbox-agents-label">Workspace</legend>
        <div className="inbox-wizard-ws-options">
          {WORKSPACE_OPTIONS.map((opt) => (
            <label key={opt.id} className={`inbox-wizard-ws-option${workspace === opt.id ? ' is-on' : ''}`}>
              <input
                type="radio"
                name="project-workspace"
                value={opt.id}
                checked={workspace === opt.id}
                onChange={() => setWorkspace(opt.id)}
              />
              <span className="inbox-wizard-ws-label">{opt.label}</span>
              <span className="inbox-wizard-ws-hint">{opt.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="inbox-empty inbox-wizard-error">{error}</p> : null}
      <div className="inbox-project-actions">
        <button
          type="button"
          className="inbox-new-chat"
          disabled={!canSubmit}
          onClick={() => onConfirm({ title: title.trim(), workspace })}
        >
          {busy ? 'Creating…' : 'Create project'}
        </button>
        <button
          type="button"
          className="inbox-new-chat inbox-new-chat--quiet"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </section>
  )
}
