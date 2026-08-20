-- Ag Jobs Pro v2 database foundation
-- Run this migration in a Supabase SQL editor or via the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id text primary key,
  canonical_key text not null unique,
  title text not null,
  company text not null,
  company_code text,
  company_color text,
  location text,
  state text,
  remote boolean not null default false,
  pay_low numeric,
  pay_high numeric,
  pay_type text not null default 'salary' check (pay_type in ('salary','hourly')),
  employment_type text not null default 'Full-time',
  job_types text[] not null default '{}',
  easy_apply boolean not null default false,
  description text,
  source_name text,
  source_url text,
  official_url text,
  indeed_url text,
  linkedin_url text,
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  raw_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_active_posted_idx on public.jobs (active, posted_at desc);
create index if not exists jobs_company_idx on public.jobs (company);
create index if not exists jobs_remote_idx on public.jobs (remote);
create index if not exists jobs_types_gin_idx on public.jobs using gin (job_types);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

-- Explicit least-privilege Data API grants.
revoke all on table public.jobs from anon, authenticated;
grant select on table public.jobs to anon, authenticated;
grant select, insert, update, delete on table public.jobs to service_role;

drop policy if exists "Public can read active jobs" on public.jobs;
create policy "Public can read active jobs"
on public.jobs for select
to anon, authenticated
using (active = true);

-- Writes are intentionally NOT permitted to anon/authenticated clients.
-- Automated ingestion should use a server-side service-role credential only.
