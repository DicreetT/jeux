create extension if not exists pgcrypto with schema extensions;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.private_role_invites drop constraint if exists private_role_invites_role_check;
alter table public.private_media drop constraint if exists private_media_recipient_role_check;

update public.profiles
set role = 'serveuse'
where role = 'servos';

update public.private_role_invites
set role = 'serveuse'
where role = 'servos';

update public.private_media
set recipient_role = 'serveuse'
where recipient_role = 'servos';

alter table public.profiles
  add constraint profiles_role_check check (role in ('chef', 'serveuse'));

alter table public.private_role_invites
  add constraint private_role_invites_role_check check (role in ('chef', 'serveuse'));

alter table public.private_media
  add constraint private_media_recipient_role_check check (recipient_role in ('chef', 'serveuse'));

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
      and role in ('chef', 'serveuse')
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
  normalized_code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if requested_role not in ('chef', 'serveuse') then
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

  normalized_code := lower(trim(invite_code));

  if encode(digest(normalized_code, 'sha256'), 'hex') <> invite_row.invite_hash then
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

drop policy if exists "private media sender insert" on public.private_media;
create policy "private media sender insert"
  on public.private_media
  for insert
  to authenticated
  with check (
    public.is_private_member()
    and sender_id = auth.uid()
    and recipient_role in ('chef', 'serveuse')
    and expires_at > now()
  );

insert into public.private_role_invites (role, invite_hash)
values
  ('chef', '8f37b153c7caadd4037e0a79350b0e734522bbf0c6f2e798f2600636136f1983'),
  ('serveuse', 'b7e5917836345395c520aa41fdf32b2d59f19c389d0cf89443c4106d1c2bea39')
on conflict (role) do update
set invite_hash = excluded.invite_hash
where public.private_role_invites.claimed_by is null;
