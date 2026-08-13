-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Creates a single table that stores the whole app state as JSON.
-- (Storage buckets for payment proofs & product files are created
-- automatically by the server on first boot.)

create table if not exists app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Lock the table down: only the server (using the service role key,
-- which bypasses RLS) can read/write it. No public access at all.
alter table app_state enable row level security;

insert into app_state (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
