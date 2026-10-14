import type {
  CattleFieldCollectionCategory,
  CattleFieldCollectionStatus,
  CattleInventoryCategory,
  CattleInventoryUnit,
  CattleLotStatus,
} from '../types/database';

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

export const CATTLE_INVENTORY_CATEGORY_LABELS: Record<CattleInventoryCategory, string> = {
  racao: 'Ração',
  sal: 'Sal',
  proteico: 'Proteico',
  mineral: 'Mistura mineral',
  nucleo: 'Núcleo',
  medicamento: 'Medicamento veterinário',
  vacina: 'Vacina',
  outro: 'Outro',
};

/** Categorias de estoque usadas na suplementação de cocho — exclui
 * medicamento/vacina/outro, que não fazem sentido jogar no cocho. */
export const CATTLE_INVENTORY_SUPPLEMENT_CATEGORIES: CattleInventoryCategory[] = ['racao', 'sal', 'proteico', 'mineral', 'nucleo'];

export const CATTLE_INVENTORY_CATEGORY_OPTIONS = Object.entries(CATTLE_INVENTORY_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as CattleInventoryCategory, label })
);

export const CATTLE_INVENTORY_UNIT_LABELS: Record<CattleInventoryUnit, string> = {
  kg: 'kg',
  saco: 'saco',
  litro: 'litro',
  dose: 'dose',
  unidade: 'unidade',
};

export const CATTLE_INVENTORY_UNIT_OPTIONS = Object.entries(CATTLE_INVENTORY_UNIT_LABELS).map(([value, label]) => ({
  value: value as CattleInventoryUnit,
  label,
}));

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

/** Causas mais comuns de morte no gado de corte — só sugestão (vira um botão
 * pra tocar), o campo de causa aceita qualquer texto digitado também. */
export const MORTALITY_CAUSE_SUGGESTIONS = [
  'Doença',
  'Acidente',
  'Intoxicação',
  'Raio',
  'Cobra',
  'Afogamento',
  'Desconhecida',
];

/** Produtos mais comuns abastecidos no cocho — só sugestão, o campo aceita
 * qualquer texto digitado também. */
export const COCHO_PRODUCT_SUGGESTIONS = ['Sal', 'Ração', 'Proteico', 'Mistura mineral', 'Núcleo'];

/** Categorias mais comuns pra classificar o animal perdido — só sugestão,
 * o campo aceita qualquer texto digitado também. */
export const MORTALITY_CATEGORY_SUGGESTIONS = ['Bezerro', 'Bezerra', 'Novilho', 'Novilha', 'Boi', 'Vaca', 'Touro'];
