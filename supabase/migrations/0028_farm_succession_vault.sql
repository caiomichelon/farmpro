-- Modo sucessão / cofre da fazenda — sucessor designado, contato de
-- emergência e notas importantes (onde estão documentos, contas etc.),
-- pra alguém de confiança conseguir tocar a fazenda numa emergência.
-- Segue o mesmo padrão do cofrinho da meta: campos opcionais em farms,
-- sem tabela nova.
alter table public.farms add column if not exists successor_name text;
alter table public.farms add column if not exists successor_relationship text;
alter table public.farms add column if not exists successor_phone text;
alter table public.farms add column if not exists emergency_contact_name text;
alter table public.farms add column if not exists emergency_contact_phone text;
alter table public.farms add column if not exists vault_notes text;
alter table public.farms add column if not exists vault_updated_at timestamptz;
