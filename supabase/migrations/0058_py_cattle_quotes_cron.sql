-- Agenda a sincronização do preço do novillo paraguaio (Edge Function
-- sync-py-cattle-quotes, ver supabase/functions/) — fonte (Valor Agro)
-- atualiza só semanalmente, mas rodar 1x por dia é barato/idempotente e
-- garante que a gente pega a atualização assim que ela sair, sem precisar
-- adivinhar o dia exato da semana em que o site publica.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'sync-py-cattle-quotes-daily';

select cron.schedule(
  'sync-py-cattle-quotes-daily',
  '0 12 * * *',
  $$ select net.http_post(url := 'https://uyppgfvordxldjbvthgm.supabase.co/functions/v1/sync-py-cattle-quotes') $$
);
