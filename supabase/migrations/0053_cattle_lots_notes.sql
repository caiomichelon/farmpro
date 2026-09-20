-- Observação livre por lote de corte — útil pra anotar qualquer contexto
-- que não tem campo próprio (ex.: um lote reconstruído a partir de uma
-- planilha antiga, avisando que o peso de entrada é aproximado).
alter table public.cattle_lots add column if not exists notes text;
