-- Guest trial identity anchors: survive cookie wipe (IP) and IP/VPN change (device).
-- Service role only (API). Hashes are sha256 hex — never store raw IP or device UUID.

create table if not exists public.guest_network_trials (
  ip_hash text not null,
  month text not null,
  guest_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ip_hash, month)
);

create index if not exists guest_network_trials_guest_month_idx
  on public.guest_network_trials (guest_id, month);

alter table public.guest_network_trials enable row level security;

create table if not exists public.guest_device_trials (
  device_hash text not null,
  month text not null,
  guest_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (device_hash, month)
);

create index if not exists guest_device_trials_guest_month_idx
  on public.guest_device_trials (guest_id, month);

alter table public.guest_device_trials enable row level security;
