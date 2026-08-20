-- Job lifecycle helpers for automated ingestion.
-- Kept in a private schema because SECURITY DEFINER functions in public can become an API surface.

create schema if not exists private;

create or replace function private.expire_stale_jobs(stale_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  changed integer;
begin
  update public.jobs
     set active = false
   where active = true
     and last_seen_at < now() - make_interval(days => greatest(stale_days, 1));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function private.expire_stale_jobs(integer) from public, anon, authenticated;
grant execute on function private.expire_stale_jobs(integer) to service_role;
