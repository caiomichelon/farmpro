import type { LavouraInventoryCategory } from '../types/database';
import { CATTLE_INVENTORY_UNIT_LABELS, CATTLE_INVENTORY_UNIT_OPTIONS } from './cattleOptions';

export const LAVOURA_INVENTORY_CATEGORY_LABELS: Record<LavouraInventoryCategory, string> = {
  sementes: 'Sementes',
  fertilizante: 'Fertilizante',
  defensivo: 'Defensivo agrícola',
  combustivel: 'Combustível',
  outro: 'Outro',
};

export const LAVOURA_INVENTORY_CATEGORY_OPTIONS = Object.entries(LAVOURA_INVENTORY_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as LavouraInventoryCategory, label })
);

// Unidade é a mesma lista usada no estoque da Pecuária (kg, saco, litro,
// dose, unidade) — reexportada aqui só pra manter o import local ao setor.
export const LAVOURA_INVENTORY_UNIT_LABELS = CATTLE_INVENTORY_UNIT_LABELS;
export const LAVOURA_INVENTORY_UNIT_OPTIONS = CATTLE_INVENTORY_UNIT_OPTIONS;
