-- Corrige permissões: as migrations anteriores habilitaram RLS e criaram as
-- policies, mas nunca concederam os GRANTs de tabela que o Postgres exige
-- por baixo da RLS. Sem isso, toda leitura/escrita autenticada falha com
-- "permission denied for table X", mesmo com as policies corretas —
-- RLS restringe LINHAS, não substitui o GRANT de acesso à tabela.
--
-- Constatado testando o app de ponta a ponta: cadastro funcionava (usa a
-- API de Auth), mas a primeira leitura em `farms` já quebrava com 42501.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Garante que tabelas criadas por futuras migrations já nasçam com esses
-- grants, sem depender de lembrar de repetir isso a cada nova migration.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
