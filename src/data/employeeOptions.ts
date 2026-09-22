import type { EmployeeCostType, EmployeeSector, TimeEntryType } from '../types/database';

export const EMPLOYEE_SECTOR_LABELS: Record<EmployeeSector, string> = {
  lavoura: 'Lavoura',
  corte: 'Pecuária — Corte',
  cria: 'Pecuária — Cria',
  escritorio: 'Escritório / Administrativo',
};

export const EMPLOYEE_SECTOR_OPTIONS: EmployeeSector[] = ['lavoura', 'corte', 'cria', 'escritorio'];

export type EmployeeArea = 'lavoura' | 'pecuaria';

const AREA_SECTORS: Record<EmployeeArea, EmployeeSector[]> = {
  lavoura: ['lavoura'],
  pecuaria: ['corte', 'cria'],
};

/** Setores que fazem sentido pra quem entrou pela Lavoura ou pela Pecuária —
 * "Escritório" fica disponível nos dois porque não é uma área de produção.
 * Sem filtro (`area` nulo, ex.: telas de importação/planilha que veem a
 * fazenda inteira), volta a lista completa. */
export function getSectorOptionsForArea(area: EmployeeArea | null | undefined): EmployeeSector[] {
  if (!area) return EMPLOYEE_SECTOR_OPTIONS;
  return [...AREA_SECTORS[area], 'escritorio'];
}

export function isEmployeeArea(value: unknown): value is EmployeeArea {
  return value === 'lavoura' || value === 'pecuaria';
}

export const EMPLOYEE_COST_TYPE_LABELS: Record<EmployeeCostType, string> = {
  mensalista: 'Mensalista',
  diarista: 'Diarista',
  tarefa: 'Por tarefa',
};

export const TIME_ENTRY_TYPE_LABELS: Record<TimeEntryType, string> = {
  entrada: 'Entrada',
  saida_almoco: 'Saída almoço',
  volta_almoco: 'Volta almoço',
  saida: 'Saída',
};

/** Ordem natural do dia — usada pra saber qual é o próximo tipo de batida. */
export const TIME_ENTRY_SEQUENCE: TimeEntryType[] = ['entrada', 'saida_almoco', 'volta_almoco', 'saida'];

/** Documentos comuns no trabalho rural brasileiro — só sugestão, o campo
 * aceita qualquer texto. ASO e NR-31 são obrigatórios por lei pra quem
 * trabalha no campo. */
export const COMMON_DOCUMENT_TYPES = [
  'ASO (Atestado de Saúde Ocupacional)',
  'NR-31 (Segurança no Trabalho Rural)',
  'CTPS',
  'CNH',
  'Ficha de EPI',
  'Exame Toxicológico',
];

/** Unidades comuns pra registro de produtividade — sugestão, campo livre. */
export const COMMON_PRODUCTIVITY_UNITS = ['hectares', 'animais', 'horas', 'sacas', 'litros', 'unidades'];
