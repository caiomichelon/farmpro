-- Corte tecnificado: eventos de saúde ganham "próxima dose" (mesmo padrão
-- de expected_calving_date nas inseminações) pra dar visibilidade de
-- vacina/tratamento pendente sem depender de lembrar na cabeça.
alter table public.cattle_animal_health_events add column if not exists next_due_date date;
