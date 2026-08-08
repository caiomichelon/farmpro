import type { CattleFieldCollectionCategory, CattleFieldCollectionStatus, CattleLotStatus } from '../types/database';

export const CATTLE_LOT_STATUS_LABELS: Record<CattleLotStatus, string> = {
  ativo: 'Ativo',
  vendido: 'Vendido',
  abatido: 'Abatido',
};

export const CATTLE_FIELD_COLLECTION_CATEGORY_LABELS: Record<CattleFieldCollectionCategory, string> = {
  suplementacao: 'Suplementação',
  altura_forragem: 'Altura de forragem',
  rebanho: 'Rebanho',
  aguada: 'Aguada',
  sanidade: 'Sanidade',
  cerca: 'Cerca',
};

export const CATTLE_FIELD_COLLECTION_CATEGORY_OPTIONS = Object.entries(CATTLE_FIELD_COLLECTION_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as CattleFieldCollectionCategory, label })
);

export const CATTLE_FIELD_COLLECTION_STATUS_LABELS: Record<CattleFieldCollectionStatus, string> = {
  dentro_padrao: 'Dentro do padrão',
  fora_padrao: 'Fora do padrão',
  atencao: 'Atenção',
  acima_padrao: 'Acima do padrão',
  nao_realizada: 'Não realizada',
  ausencia_gado: 'Ausência de gado',
};

export const CATTLE_FIELD_COLLECTION_STATUS_OPTIONS = Object.entries(CATTLE_FIELD_COLLECTION_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as CattleFieldCollectionStatus, label })
);

/** Cor semântica de cada situação — usada no painel de campo (bolinha) e no
 * chip de status. "warning" e "accent" do tema são tons quase idênticos
 * (propositalmente, pra não competir com as cores de setor), então aqui
 * evitamos usar os dois juntos — cada situação precisa ficar diferenciável
 * numa bolinha de 16px. */
export const CATTLE_FIELD_COLLECTION_STATUS_COLOR_KEY: Record<
  CattleFieldCollectionStatus,
  'success' | 'danger' | 'warning' | 'primary' | 'pecuaria' | 'textMuted'
> = {
  dentro_padrao: 'success',
  fora_padrao: 'danger',
  atencao: 'warning',
  acima_padrao: 'primary',
  nao_realizada: 'textMuted',
  ausencia_gado: 'pecuaria',
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
