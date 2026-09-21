-- Remove o módulo de Diaristas avulsos (mão de obra temporária sem cadastro
-- fixo de funcionário) a pedido do usuário.
--
-- IMPORTANTE: ao contrário de remoções anteriores, esta não pôde ser
-- aplicada nem verificada contra o banco de produção nesta sessão (sem
-- credenciais de Management API disponíveis aqui) — rode manualmente e
-- confira antes se `select count(*) from public.casual_laborers` é zero;
-- se houver registros reais, exporte-os antes de aplicar esta migração.

drop table if exists public.casual_laborers;
