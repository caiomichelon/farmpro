-- Deixa o estoque mais "profissional" (pedido explícito, comparando com
-- apps de controle de estoque de verdade): cada item agora pode ter
-- fornecedor (liga com o cadastro de fornecedores já existente), validade
-- (crítico pra medicamento/defensivo vencer sem perceber), foto (mesmo
-- padrão já usado em colheita/coleta de campo) e local de armazenamento
-- (qual galpão/depósito).
alter table public.cattle_inventory_items
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null,
  add column if not exists expiration_date date,
  add column if not exists photo_url text,
  add column if not exists location text;

alter table public.lavoura_inventory_items
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null,
  add column if not exists expiration_date date,
  add column if not exists photo_url text,
  add column if not exists location text;

create index if not exists cattle_inventory_items_supplier_id_idx on public.cattle_inventory_items (supplier_id);
create index if not exists lavoura_inventory_items_supplier_id_idx on public.lavoura_inventory_items (supplier_id);
