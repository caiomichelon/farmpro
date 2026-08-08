-- Diário de bordo / nota rápida de campo — anotação livre da fazenda como
-- um todo (não precisa escolher lote/talhão/animal antes), com foto e GPS
-- opcionais. É o "anotei aqui rapidinho" pra não perder a ideia/observação
-- no meio da lida.
create table if not exists public.farm_notes (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  note_text text,
  photo_url text,
  latitude numeric,
  longitude numeric,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists farm_notes_farm_id_idx on public.farm_notes (farm_id, created_at desc);

alter table public.farm_notes enable row level security;

drop policy if exists "farm_notes: membros da fazenda veem" on public.farm_notes;
create policy "farm_notes: membros da fazenda veem"
  on public.farm_notes for select
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_notes.farm_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "farm_notes: membros da fazenda gerenciam" on public.farm_notes;
create policy "farm_notes: membros da fazenda gerenciam"
  on public.farm_notes for all
  using (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_notes.farm_id and fm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farm_members fm
      where fm.farm_id = farm_notes.farm_id and fm.user_id = auth.uid()
    )
  );
