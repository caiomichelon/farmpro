-- Remove o módulo de Diaristas avulsos (mão de obra temporária sem cadastro
-- fixo de funcionário) a pedido do usuário. Confirmado sem dado real na
-- tabela (0 linhas) antes de aplicar.

drop table if exists public.casual_laborers;
