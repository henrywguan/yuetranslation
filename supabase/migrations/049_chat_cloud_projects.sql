-- Cloud-synced DeepSeek Chat Inbox Projects + thread transcripts (signed-in).
-- Device-local IndexedDB remains the working set; these tables are the source of
-- truth for projects that have been "Moved to cloud".
-- Apply in Supabase SQL editor if not yet pushed via CLI.

create table if not exists public.chat_cloud_projects (
  id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled project',
  memory text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

comment on table public.chat_cloud_projects is
  'JyutTranslate #/chat Inbox Projects moved to cloud (per signed-in user). payload holds agents/workspaces/threadIds metadata.';

comment on column public.chat_cloud_projects.payload is
  'Project chrome JSON: threadIds, agents, workspaces (metadata only — no FS handles), overseerAgentId, defaultWorkspaceId.';

create table if not exists public.chat_cloud_threads (
  id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id text not null,
  thread jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, project_id)
    references public.chat_cloud_projects (user_id, id)
    on delete cascade
);

comment on table public.chat_cloud_threads is
  'Pruned ChatThread JSON blobs for cloud-backed Inbox Projects.';

create index if not exists chat_cloud_threads_project_idx
  on public.chat_cloud_threads (user_id, project_id);

create index if not exists chat_cloud_projects_updated_idx
  on public.chat_cloud_projects (user_id, updated_at desc);

alter table public.chat_cloud_projects enable row level security;
alter table public.chat_cloud_threads enable row level security;

-- Service-role API uses the admin client; still lock down direct user access.
create policy "Users read own chat cloud projects"
  on public.chat_cloud_projects for select
  using (auth.uid() = user_id);

create policy "Users insert own chat cloud projects"
  on public.chat_cloud_projects for insert
  with check (auth.uid() = user_id);

create policy "Users update own chat cloud projects"
  on public.chat_cloud_projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own chat cloud projects"
  on public.chat_cloud_projects for delete
  using (auth.uid() = user_id);

create policy "Users read own chat cloud threads"
  on public.chat_cloud_threads for select
  using (auth.uid() = user_id);

create policy "Users insert own chat cloud threads"
  on public.chat_cloud_threads for insert
  with check (auth.uid() = user_id);

create policy "Users update own chat cloud threads"
  on public.chat_cloud_threads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own chat cloud threads"
  on public.chat_cloud_threads for delete
  using (auth.uid() = user_id);
