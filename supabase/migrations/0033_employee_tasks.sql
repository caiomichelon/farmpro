-- Lista de tarefas do dia — o gerente cria e atribui (ou deixa geral, sem
-- funcionário específico), quem for fazer risca quando terminar. Complementa
-- o ponto digital (que só diz "estava lá", não "o que fez").
create table if not exists public.employee_tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  title text not null,
  notes text,
  due_date date not null default current_date,
  done_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists employee_tasks_farm_id_idx on public.employee_tasks (farm_id, due_date);
create index if not exists employee_tasks_employee_id_idx on public.employee_tasks (employee_id);

alter table public.employee_tasks enable row level security;

drop policy if exists "employee_tasks: membros da fazenda veem" on public.employee_tasks;
create policy "employee_tasks: membros da fazenda veem"
  on public.employee_tasks for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = employee_tasks.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "employee_tasks: membros da fazenda gerenciam" on public.employee_tasks;
create policy "employee_tasks: membros da fazenda gerenciam"
  on public.employee_tasks for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = employee_tasks.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = employee_tasks.farm_id and fm.user_id = auth.uid()
    )
  );
