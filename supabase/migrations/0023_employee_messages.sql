-- Chat entre funcionário e gerente. Sem conta de login separada pro
-- funcionário (mesmo padrão do ponto digital: quem estiver com o celular
-- na mão usa a sessão já autenticada do app e diz "estou enviando como
-- funcionário/gerente" na própria tela) — sender é só uma etiqueta de
-- exibição, a segurança de fato é a mesma de qualquer outro dado do
-- funcionário (membro da fazenda).
create table if not exists public.employee_messages (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  sender text not null check (sender in ('funcionario', 'gerente')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists employee_messages_employee_id_idx on public.employee_messages (employee_id);

alter table public.employee_messages enable row level security;

drop policy if exists "employee_messages: membros da fazenda veem" on public.employee_messages;
create policy "employee_messages: membros da fazenda veem"
  on public.employee_messages for select
  using (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = employee_messages.employee_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "employee_messages: membros da fazenda gerenciam" on public.employee_messages;
create policy "employee_messages: membros da fazenda gerenciam"
  on public.employee_messages for all
  using (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = employee_messages.employee_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = employee_messages.employee_id and fm.user_id = auth.uid()
    )
  );
