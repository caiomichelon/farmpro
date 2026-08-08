-- Suporte a fotos: bucket de armazenamento + coluna de foto nos documentos
-- de funcionário (ex.: foto do ASO, CNH, etc.).

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

drop policy if exists "attachments: usuário autenticado envia arquivo" on storage.objects;
create policy "attachments: usuário autenticado envia arquivo"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists "attachments: leitura pública" on storage.objects;
create policy "attachments: leitura pública"
  on storage.objects for select
  using (bucket_id = 'attachments');

drop policy if exists "attachments: usuário autenticado remove arquivo" on storage.objects;
create policy "attachments: usuário autenticado remove arquivo"
  on storage.objects for delete
  using (bucket_id = 'attachments' and auth.role() = 'authenticated');

alter table public.employee_documents add column if not exists photo_url text;
alter table public.cattle_animal_health_events add column if not exists photo_url text;
