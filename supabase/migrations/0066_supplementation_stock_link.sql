-- Amplia as categorias de estoque da pecuária — separa "núcleo/sal mineral"
-- em sal, proteico, mineral e núcleo (produtos distintos de cocho) e
-- adiciona vacina, pra cobrir os insumos de sanidade também.
alter table public.cattle_inventory_items drop constraint if exists cattle_inventory_items_category_check;
alter table public.cattle_inventory_items add constraint cattle_inventory_items_category_check
  check (category in ('racao', 'sal', 'proteico', 'mineral', 'nucleo', 'medicamento', 'vacina', 'outro'));

-- Suplementação de campo: liga a movimentação de estoque ao piquete onde foi
-- aplicada (pra saber quanto saiu pra cada piquete) e guarda a localização
-- de quem registrou — mesma evidência de visita usada no ponto digital e
-- nas coletas de campo.
alter table public.cattle_inventory_movements add column if not exists plot_id uuid references public.plots (id) on delete set null;
alter table public.cattle_inventory_movements add column if not exists latitude numeric(9, 6);
alter table public.cattle_inventory_movements add column if not exists longitude numeric(9, 6);

create index if not exists cattle_inventory_movements_plot_id_idx on public.cattle_inventory_movements (plot_id);

-- Farol de cocho: liga o abastecimento a um item de estoque (desconta
-- automático quando registrado) e guarda a localização de quem registrou.
alter table public.plot_cocho_events add column if not exists stock_item_id uuid references public.cattle_inventory_items (id) on delete set null;
alter table public.plot_cocho_events add column if not exists latitude numeric(9, 6);
alter table public.plot_cocho_events add column if not exists longitude numeric(9, 6);
