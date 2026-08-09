-- Nota de caminhão no lançamento de colheita — motorista, placa e peso
-- (bruto e líquido), tudo opcional. Quando o peso líquido é informado, o
-- app calcula as sacas a partir dele (kg_per_saca guarda o fator usado
-- naquele lançamento, pra não bagunçar histórico se o padrão mudar depois).
alter table public.harvest_entries
  add column if not exists truck_plate text,
  add column if not exists driver_name text,
  add column if not exists gross_weight_kg numeric(12, 2) check (gross_weight_kg >= 0),
  add column if not exists net_weight_kg numeric(12, 2) check (net_weight_kg >= 0),
  add column if not exists kg_per_saca numeric(6, 2) check (kg_per_saca > 0),
  add column if not exists photo_url text;
