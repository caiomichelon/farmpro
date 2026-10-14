-- Mortalidade completa: liga opcionalmente a morte a um animal rastreado
-- individualmente (cattle_animals), guarda categoria do animal, foto
-- obrigatória na tela, quem tirou a foto e a localização de quem registrou.
alter table public.cattle_mortality_events add column if not exists animal_id uuid references public.cattle_animals (id) on delete set null;
alter table public.cattle_mortality_events add column if not exists category text;
alter table public.cattle_mortality_events add column if not exists photo_url text;
alter table public.cattle_mortality_events add column if not exists photographer text;
alter table public.cattle_mortality_events add column if not exists latitude numeric(9, 6);
alter table public.cattle_mortality_events add column if not exists longitude numeric(9, 6);

create index if not exists cattle_mortality_events_animal_id_idx on public.cattle_mortality_events (animal_id);
