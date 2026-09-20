-- Remove o módulo de Pecuária de Cria (reprodução/matrizes), o Diário de
-- bordo (nunca chegou a ter tela — tabela morta), o pluviômetro/clima e as
-- notificações de boletim diário/fechamento do dia — tudo a pedido do
-- usuário. Confirmado sem dado real em nenhuma dessas tabelas antes de
-- remover (breeding_cows, inseminations, calvings, farm_notes,
-- rain_readings: 0 linhas em todas na hora da remoção).

drop function if exists public.regional_benchmark_cria(uuid);

drop table if exists public.cow_weighings;
drop table if exists public.weanings;
drop table if exists public.pregnancy_diagnoses;
drop table if exists public.calvings;
drop table if exists public.inseminations;
drop table if exists public.breeding_cow_costs;
drop table if exists public.breeding_cows;

drop table if exists public.farm_notes;
drop table if exists public.rain_readings;
