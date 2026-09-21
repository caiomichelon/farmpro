-- País da fazenda — define qual cotação de gado é usada nos cálculos e
-- relatórios de Pecuária de Corte (B3/arroba/BRL pro Brasil, novillo a
-- frigorífico/quilo/USD pro Paraguai — o Paraguai não cota em arroba, essa
-- é uma unidade só brasileira). Padrão 'BR' pras fazendas já existentes.
alter table public.farms add column if not exists country text not null default 'BR' check (country in ('BR', 'PY'));

-- Fazenda Panambí 2 (nome real da vila de Panambí fica no Paraguai) é do
-- Paraguai — a pedido do usuário, que confirmou explicitamente essa fazenda
-- como a única do Paraguai entre as três hoje cadastradas.
update public.farms set country = 'PY' where name = 'Fazenda Panambí 2';
