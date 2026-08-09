create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null unique check (role in ('chef', 'servos')),
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.private_role_invites (
  role text primary key check (role in ('chef', 'servos')),
  invite_hash text not null,
  claimed_by uuid unique references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.private_media (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('chef', 'servos')),
  storage_path text not null unique,
  scene text check (scene in ('cuisine', 'pause')),
  x_percent numeric check (x_percent >= 0 and x_percent <= 100),
  y_percent numeric check (y_percent >= 0 and y_percent <= 100),
  kind text not null default 'image',
  message text,
  expires_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.private_role_invites enable row level security;
alter table public.private_media enable row level security;

create or replace function public.is_private_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('chef', 'servos')
  );
$$;

create or replace function public.claim_private_role(
  requested_role text,
  invite_code text,
  display_name text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  invite_row public.private_role_invites%rowtype;
  claimed_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if requested_role not in ('chef', 'servos') then
    raise exception 'invalid_role';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile_already_claimed';
  end if;

  select *
  into invite_row
  from public.private_role_invites
  where role = requested_role
  for update;

  if invite_row.role is null then
    raise exception 'invite_not_configured';
  end if;

  if invite_row.claimed_by is not null then
    raise exception 'role_already_claimed';
  end if;

  if crypt(invite_code, invite_row.invite_hash) <> invite_row.invite_hash then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.profiles (id, role, display_name)
  values (auth.uid(), requested_role, nullif(trim(display_name), ''))
  returning * into claimed_profile;

  update public.private_role_invites
  set claimed_by = auth.uid(),
      claimed_at = now()
  where role = requested_role;

  return claimed_profile;
end;
$$;

revoke all on function public.claim_private_role(text, text, text) from public;
grant execute on function public.claim_private_role(text, text, text) to authenticated;

drop policy if exists "profiles private members read" on public.profiles;
create policy "profiles private members read"
  on public.profiles
  for select
  to authenticated
  using (public.is_private_member() or id = auth.uid());

drop policy if exists "private media members read" on public.private_media;
create policy "private media members read"
  on public.private_media
  for select
  to authenticated
  using (
    public.is_private_member()
    and deleted_at is null
    and expires_at > now()
  );

drop policy if exists "private media sender insert" on public.private_media;
create policy "private media sender insert"
  on public.private_media
  for insert
  to authenticated
  with check (
    public.is_private_member()
    and sender_id = auth.uid()
    and recipient_role in ('chef', 'servos')
    and expires_at > now()
  );

drop policy if exists "private media sender delete marker" on public.private_media;
create policy "private media sender delete marker"
  on public.private_media
  for update
  to authenticated
  using (public.is_private_member() and sender_id = auth.uid())
  with check (public.is_private_member() and sender_id = auth.uid());

drop policy if exists "le grimoire public read state" on public.le_grimoire_state;
drop policy if exists "le grimoire public insert state" on public.le_grimoire_state;
drop policy if exists "le grimoire public update state" on public.le_grimoire_state;
drop policy if exists "le grimoire private read state" on public.le_grimoire_state;
drop policy if exists "le grimoire private insert state" on public.le_grimoire_state;
drop policy if exists "le grimoire private update state" on public.le_grimoire_state;

create policy "le grimoire private read state"
  on public.le_grimoire_state
  for select
  to authenticated
  using (public.is_private_member());

create policy "le grimoire private insert state"
  on public.le_grimoire_state
  for insert
  to authenticated
  with check (public.is_private_member());

create policy "le grimoire private update state"
  on public.le_grimoire_state
  for update
  to authenticated
  using (public.is_private_member())
  with check (public.is_private_member());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'le-grimoire-private',
  'le-grimoire-private',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "private members read private media objects" on storage.objects;
create policy "private members read private media objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'le-grimoire-private'
    and public.is_private_member()
  );

drop policy if exists "private members upload own private media" on storage.objects;
create policy "private members upload own private media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'le-grimoire-private'
    and public.is_private_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "private members delete own private media objects" on storage.objects;
create policy "private members delete own private media objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'le-grimoire-private'
    and public.is_private_member()
    and owner = auth.uid()
  );
