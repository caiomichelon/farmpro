-- Agenda a sincronização diária das cotações da B3 (Edge Function
-- sync-b3-quotes, ver supabase/functions/) — roda sozinha todo dia útil,
-- sem precisar de nenhuma rotina externa.
--
-- Horários em UTC (Brasília = UTC-3, sem horário de verão desde 2019):
--   01:30 UTC = 22:30 BRT do dia anterior — logo depois do fechamento do
--     pregão (~18h BRT) e do processamento do arquivo de ajustes da B3.
--   03:30 UTC = 00:30 BRT — segunda tentativa, caso o arquivo da B3 ainda
--     não estivesse "Final" na primeira (a função é idempotente: só
--     sobrescreve com o mesmo dado se já tiver processado, sem duplicar).
-- Dias 2-6 em cron (terça a sábado, em UTC) cobrem o fechamento de
-- segunda a sexta-feira (dia útil BRT vira dia seguinte em UTC à noite).
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'sync-b3-quotes-primary';
select cron.unschedule(jobid) from cron.job where jobname = 'sync-b3-quotes-retry';

select cron.schedule(
  'sync-b3-quotes-primary',
  '30 1 * * 2-6',
  $$ select net.http_post(url := 'https://uyppgfvordxldjbvthgm.supabase.co/functions/v1/sync-b3-quotes') $$
);

select cron.schedule(
  'sync-b3-quotes-retry',
  '30 3 * * 2-6',
  $$ select net.http_post(url := 'https://uyppgfvordxldjbvthgm.supabase.co/functions/v1/sync-b3-quotes') $$
);
