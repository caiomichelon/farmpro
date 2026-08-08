-- Genealogia da matriz — de qual matriz já cadastrada ela é filha (se for
-- o caso). O pai/sêmen usado já é capturado por inseminação em
-- inseminations.sire_or_semen — não precisa de coluna nova pra isso.
alter table public.breeding_cows add column if not exists dam_id uuid references public.breeding_cows (id) on delete set null;

create index if not exists breeding_cows_dam_id_idx on public.breeding_cows (dam_id);
