-- Métricas numéricas opcionais na coleta de campo:
-- - head_count: contagem de cabeças na coleta "Rebanho" — base do detector
--   de possível abigeato (comparação com o esperado do lote).
-- - level_pct: nível (%) do cocho/aguada na coleta "Aguada" — reportado
--   manualmente pelo funcionário por enquanto; a coluna é a mesma que vai
--   receber leitura de um sensor IoT real no futuro, sem precisar mudar
--   nada no resto do app quando isso existir.
alter table public.cattle_field_collections add column if not exists head_count integer;
alter table public.cattle_field_collections add column if not exists level_pct integer;
