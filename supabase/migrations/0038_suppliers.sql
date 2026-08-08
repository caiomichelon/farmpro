-- Cadastro de fornecedores — lista simples de contatos úteis da fazenda
-- (loja agropecuária, veterinário, mecânico, transportadora etc.), pra não
-- precisar procurar número de telefone perdido em papel ou WhatsApp.
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  category text not null default 'outro' check (
    category in ('agropecuaria', 'veterinario', 'mecanico', 'transportadora', 'comprador', 'outro')
  ),
  phone text,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists suppliers_farm_id_idx on public.suppliers (farm_id, name);

alter table public.suppliers enable row level security;

drop policy if exists "suppliers: membros da fazenda veem" on public.suppliers;
create policy "suppliers: membros da fazenda veem"
  on public.suppliers for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = suppliers.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "suppliers: membros da fazenda gerenciam" on public.suppliers;
create policy "suppliers: membros da fazenda gerenciam"
  on public.suppliers for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = suppliers.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = suppliers.farm_id and fm.user_id = auth.uid()
    )
  );
