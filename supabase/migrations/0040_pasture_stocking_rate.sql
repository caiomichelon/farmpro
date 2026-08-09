-- Limite de lotação (UA/ha) que o produtor define pra cada pasto (talhão
-- type='pecuaria') — usado pra colorir o alerta de lotação. Fica null até
-- o usuário configurar; sem valor fabricado, sem "número seguro" universal
-- (a lotação ideal varia muito com forragem/região/manejo).
alter table public.plots
  add column if not exists max_stocking_rate_ua_ha numeric(6, 2) check (max_stocking_rate_ua_ha > 0);
