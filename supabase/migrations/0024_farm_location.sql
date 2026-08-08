-- Localização (lat/lng) da fazenda — base pros alertas de clima proativos
-- (geada, chuva forte, calor extremo, vento). Opcional: nulo até o usuário
-- capturar a localização atual em Clima → "Ativar alertas de clima".
alter table public.farms add column if not exists latitude numeric;
alter table public.farms add column if not exists longitude numeric;
