create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  full_name text not null,
  sector text not null check (sector in ('lavoura', 'corte', 'cria', 'escritorio')),
  role text not null,
  cost_type text not null default 'mensalista'
    check (cost_type in ('mensalista', 'diarista', 'tarefa')),
  cost_value numeric(12, 2) not null check (cost_value >= 0),
  cpf text,
  phone text,
  admission_date date not null default current_date,
  birth_date date,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.employees enable row level security;
drop policy if exists "employees: membros da fazenda veem" on public.employees;
create policy "employees: membros da fazenda veem"
  on public.employees for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = employees.farm_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "employees: membros da fazenda gerenciam" on public.employees;
create policy "employees: membros da fazenda gerenciam"
  on public.employees for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = employees.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = employees.farm_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  document_type text not null,
  document_number text,
  issue_date date,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.employee_documents enable row level security;
drop policy if exists "employee_documents: membros da fazenda veem" on public.employee_documents;
create policy "employee_documents: membros da fazenda veem"
  on public.employee_documents for select
  using (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = employee_documents.employee_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "employee_documents: membros da fazenda gerenciam" on public.employee_documents;
create policy "employee_documents: membros da fazenda gerenciam"
  on public.employee_documents for all
  using (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = employee_documents.employee_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = employee_documents.employee_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  entry_type text not null check (entry_type in ('entrada', 'saida_almoco', 'volta_almoco', 'saida')),
  recorded_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  location_accuracy_m double precision,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.time_entries enable row level security;
drop policy if exists "time_entries: membros da fazenda veem" on public.time_entries;
create policy "time_entries: membros da fazenda veem"
  on public.time_entries for select
  using (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = time_entries.employee_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "time_entries: membros da fazenda gerenciam" on public.time_entries;
create policy "time_entries: membros da fazenda gerenciam"
  on public.time_entries for all
  using (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = time_entries.employee_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = time_entries.employee_id and fm.user_id = auth.uid()
    )
  );

create table if not exists public.productivity_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  record_date date not null default current_date,
  activity text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  unit text not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.productivity_records enable row level security;
drop policy if exists "productivity_records: membros da fazenda veem" on public.productivity_records;
create policy "productivity_records: membros da fazenda veem"
  on public.productivity_records for select
  using (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = productivity_records.employee_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists "productivity_records: membros da fazenda gerenciam" on public.productivity_records;
create policy "productivity_records: membros da fazenda gerenciam"
  on public.productivity_records for all
  using (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = productivity_records.employee_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.employees e
      join public.farm_members fm on fm.farm_id = e.farm_id
      where e.id = productivity_records.employee_id and fm.user_id = auth.uid()
    )
  );
