import type { CattleLotStatus } from '../types/database';

export const CATTLE_LOT_STATUS_LABELS: Record<CattleLotStatus, string> = {
  ativo: 'Ativo',
  vendido: 'Vendido',
  abatido: 'Abatido',
};

/** Escore de condição corporal (ECC) — escala 1 a 5 usada em bovinos de corte. */
export const BODY_CONDITION_SCORE_OPTIONS = [
  { value: '1', label: '1 · Muito magra' },
  { value: '2', label: '2 · Magra' },
  { value: '3', label: '3 · Boa' },
  { value: '4', label: '4 · Gorda' },
  { value: '5', label: '5 · Muito gorda' },
];

/** Grau de acabamento de gordura na carcaça — escala usada por frigoríficos. */
export const FAT_FINISH_SCORE_OPTIONS = [
  { value: '1', label: '1 · Ausente' },
  { value: '2', label: '2 · Escassa' },
  { value: '3', label: '3 · Mediana' },
  { value: '4', label: '4 · Uniforme' },
  { value: '5', label: '5 · Excessiva' },
];

export const INSEMINATION_METHODS = ['IATF', 'Monta natural', 'IA em cio observado'];
