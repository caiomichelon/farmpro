-- Foto da nota (venda de grão / abate), anexada direto pelo app — mesma ideia
-- já usada em employee_documents e cattle_animal_health_events: guarda a foto
-- como referência/prova junto dos números lançados manualmente.
alter table grain_sales add column if not exists photo_url text;
alter table cattle_slaughters add column if not exists photo_url text;
