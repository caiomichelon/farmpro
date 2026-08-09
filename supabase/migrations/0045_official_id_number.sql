-- Número de identificação oficial de rastreamento por animal — SISBOV no
-- Brasil, SIAP/SITRAP (SENACSA) no Paraguai, ou o sistema equivalente de
-- cada país. É diferente do brinco/identificação de manejo do dia a dia
-- (tag_number / identification) — esse aqui é o número oficial do brinco
-- eletrônico/rastreamento, exigido por lei em vários países pra bovinos.
-- Opcional porque nem todo animal tem (implantação é gradual, começando
-- pelos bezerros em vários lugares) e o campo aceita qualquer formato —
-- não travamos em 15 dígitos porque cada país numera diferente.

alter table public.cattle_animals
  add column if not exists official_id_number text;

alter table public.breeding_cows
  add column if not exists official_id_number text;
