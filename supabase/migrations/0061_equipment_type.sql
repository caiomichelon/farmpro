-- Tipo do equipamento (Trator, Plantadeira, Distribuidor de adubo/calcário,
-- etc.) — pra dar pra ver no relatório de maquinário quantos tem de cada
-- tipo. Texto livre (não enum) porque a lista de sugestões só cobre os
-- tipos mais comuns; equipamento existente fica sem tipo até o dono editar.
alter table public.equipment add column if not exists type text;
