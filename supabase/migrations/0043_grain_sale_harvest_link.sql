-- Liga uma venda ao lançamento de colheita (nota de caminhão) que a
-- originou — opcional, porque nem toda venda sai direto de um caminhão
-- recém-pesado (às vezes vende semanas depois, de estoque). Quando ligada,
-- evita digitar placa/motorista de novo — já vêm do lançamento de colheita.
alter table public.grain_sales
  add column if not exists harvest_entry_id uuid references public.harvest_entries (id) on delete set null;

create index if not exists grain_sales_harvest_entry_id_idx on public.grain_sales (harvest_entry_id);
