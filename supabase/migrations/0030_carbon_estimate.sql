-- Estimativa de crédito de carbono — calculadora simples baseada em
-- práticas que o produtor já usa (plantio direto, cultura de cobertura,
-- pastejo rotacionado, manejo de dejetos). Só um educativo, não substitui
-- auditoria de certificadora. Segue o mesmo padrão do cofre/cofrinho:
-- campos opcionais direto em farms, sem tabela nova.
alter table public.farms add column if not exists carbon_uses_no_till boolean not null default false;
alter table public.farms add column if not exists carbon_uses_cover_crop boolean not null default false;
alter table public.farms add column if not exists carbon_uses_rotational_grazing boolean not null default false;
alter table public.farms add column if not exists carbon_uses_manure_management boolean not null default false;
