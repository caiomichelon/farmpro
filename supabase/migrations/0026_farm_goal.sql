-- Meta financeira da fazenda (cofrinho) — opcional, nula até o usuário
-- definir em Meta → "Definir meta".
alter table public.farms add column if not exists goal_name text;
alter table public.farms add column if not exists goal_amount numeric;
