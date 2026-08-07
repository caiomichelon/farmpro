import type { EmployeeCostType, EmployeeSector, TimeEntryType } from '../types/database';

export const EMPLOYEE_SECTOR_LABELS: Record<EmployeeSector, string> = {
  lavoura: 'Lavoura',
  corte: 'Pecuária — Corte',
  cria: 'Pecuária — Cria',
  escritorio: 'Escritório / Administrativo',
};

export const EMPLOYEE_SECTOR_OPTIONS: EmployeeSector[] = ['lavoura', 'corte', 'cria', 'escritorio'];

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
