alter table public.le_grimoire_state replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.le_grimoire_state;
exception
  when duplicate_object then
    null;
  when undefined_object then
    null;
end;
$$;
