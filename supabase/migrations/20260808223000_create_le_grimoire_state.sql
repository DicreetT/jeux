create table if not exists public.le_grimoire_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.le_grimoire_state enable row level security;

drop policy if exists "le grimoire public read state" on public.le_grimoire_state;
drop policy if exists "le grimoire public insert state" on public.le_grimoire_state;
drop policy if exists "le grimoire public update state" on public.le_grimoire_state;

create policy "le grimoire public read state"
  on public.le_grimoire_state
  for select
  to anon
  using (true);

create policy "le grimoire public insert state"
  on public.le_grimoire_state
  for insert
  to anon
  with check (true);

create policy "le grimoire public update state"
  on public.le_grimoire_state
  for update
  to anon
  using (true)
  with check (true);
