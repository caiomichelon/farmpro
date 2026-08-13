-- Dados que já vinham na planilha real da mãe mas ainda não eram
-- capturados: comprador da carga (texto livre — só informativo, não exige
-- cadastro prévio em grain_buyers como a venda com preço exige), peso antes
-- do desconto de umidade/impureza (a planilha chama de "Peso (kg)", em
-- contraste com o peso líquido já usado — "Peso Líquido p/ Fixação (kg)" —
-- que é depois do desconto) e a umidade (%) informada na nota de pesagem.
-- A diferença entre os dois pesos é o quanto a empresa descontou.
alter table public.harvest_entries
  add column if not exists buyer_name text,
  add column if not exists raw_net_weight_kg numeric(12, 2) check (raw_net_weight_kg >= 0),
  add column if not exists humidity_pct numeric(5, 2) check (humidity_pct >= 0 and humidity_pct <= 100);
