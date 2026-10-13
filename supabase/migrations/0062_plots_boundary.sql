-- Contorno georreferenciado do talhão/piquete (lista de pontos lat/lng que
-- formam o polígono), pra desenhar no mapa. Guardado como jsonb simples (não
-- PostGIS) porque só precisamos renderizar no Leaflet, não fazer consulta
-- espacial. Null em talhões antigos cadastrados sem mapa.
alter table public.plots add column if not exists boundary jsonb;
