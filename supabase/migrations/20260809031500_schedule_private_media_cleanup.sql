create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

do $$
begin
  perform cron.unschedule('cleanup-private-media-every-15-minutes');
exception
  when others then
    null;
end;
$$;

select cron.schedule(
  'cleanup-private-media-every-15-minutes',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://hgmmgxwxcvgmpsqbxusy.supabase.co/functions/v1/cleanup-private-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_irb3kZfl8qO97YIkb3QmvQ_f5M3zM4t',
      'apikey', 'sb_publishable_irb3kZfl8qO97YIkb3QmvQ_f5M3zM4t'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
