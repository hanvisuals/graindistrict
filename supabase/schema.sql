-- ============================================================
--  GRAINDISTRICT — Supabase schema (projects + sharing + roles)
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Safe to re-run (idempotent).
-- ============================================================

-- ---------- TABLES ----------

-- A project = one whole board (nodes, notes, plan, settings) as JSON.
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null default 'Untitled',
  data        jsonb not null default '{}'::jsonb,
  is_public   boolean not null default false,
  public_role text not null default 'viewer' check (public_role in ('viewer','editor')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Sharing: invite people by email and give them a role.
create table if not exists public.project_members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email      text not null,
  user_id    uuid references auth.users(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists idx_members_user    on public.project_members(user_id);
create index if not exists idx_members_email   on public.project_members(lower(email));
create index if not exists idx_projects_owner  on public.projects(owner_id);

-- ---------- ROLE HELPER (security definer = no RLS recursion) ----------
-- Returns 'owner' | 'admin' | 'editor' | 'viewer' | null for the current user.
create or replace function public.project_role(pid uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when exists (
      select 1 from public.projects p
      where p.id = pid and p.owner_id = auth.uid()
    ) then 'owner'
    else (
      select m.role from public.project_members m
      where m.project_id = pid
        and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      limit 1
    )
  end;
$$;

grant execute on function public.project_role(uuid) to anon, authenticated;

-- ---------- updated_at auto-touch ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_projects_touch on public.projects;
create trigger trg_projects_touch
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------- ROW LEVEL SECURITY ----------
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;

-- PROJECTS --------------------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (
    is_public = true
    or public.project_role(id) is not null
  );

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert with check ( owner_id = auth.uid() );

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update using ( public.project_role(id) in ('owner','admin','editor') )
            with check ( public.project_role(id) in ('owner','admin','editor') );

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete using ( public.project_role(id) in ('owner','admin') );

-- MEMBERS ---------------------------------------------------
drop policy if exists members_select on public.project_members;
create policy members_select on public.project_members
  for select using ( public.project_role(project_id) is not null );

drop policy if exists members_insert on public.project_members;
create policy members_insert on public.project_members
  for insert with check ( public.project_role(project_id) in ('owner','admin') );

drop policy if exists members_update on public.project_members;
create policy members_update on public.project_members
  for update using ( public.project_role(project_id) in ('owner','admin') );

drop policy if exists members_delete on public.project_members;
create policy members_delete on public.project_members
  for delete using ( public.project_role(project_id) in ('owner','admin') );

-- done.
