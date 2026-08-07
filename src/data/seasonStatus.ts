import type { SeasonStatus } from '../types/database';

export const SEASON_STATUS_LABELS: Record<SeasonStatus, string> = {
  planejada: 'Planejada',
  plantada: 'Plantada',
  colhendo: 'Colhendo',
  colhida: 'Colhida',
};

export const SEASON_STATUS_OPTIONS: SeasonStatus[] = ['planejada', 'plantada', 'colhendo', 'colhida'];

/** Culturas mais comuns no agronegócio brasileiro — só para sugestão rápida
 * no formulário; o campo aceita qualquer texto. */
export const COMMON_CROPS = ['Soja', 'Milho', 'Algodão', 'Sorgo', 'Feijão', 'Trigo', 'Café', 'Cana-de-açúcar'];
