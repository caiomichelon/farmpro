import * as DocumentPicker from 'expo-document-picker';
// A API nova (baseada em classes `File`/`Directory`) trava com
// "this.validatePath is not a function" ao ler um arquivo vindo do
// DocumentPicker no web — usamos a API "legacy" (readAsStringAsync), que é
// mais madura. Mesmo essa não existe na versão web do expo-file-system
// ("not available on web") — só é implementada nativamente (iOS/Android) —
// por isso o branch por plataforma logo abaixo.
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
// A lib não tem tipos oficiais completos pra RN; os `any` abaixo são
// isolados aqui de propósito, o resto do app usa tudo tipado.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx');

import { supabase } from './supabase';

/** Lê o arquivo escolhido como base64 — no nativo usa a API de arquivos do
 * Expo; no web (só usado durante desenvolvimento/testes) lê via fetch+Blob,
 * já que o expo-file-system não implementa leitura de arquivo no web. */
async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o arquivo.'));
      reader.onload = () => {
        const result = reader.result as string; // "data:<mime>;base64,XXXX"
        resolve(result.split(',')[1] ?? '');
      };
      reader.readAsDataURL(blob);
    });
  }
  return readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}

const SPREADSHEET_MIME_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export interface ParsedSheet {
  fileName: string;
  headers: string[];
  rows: string[][];
}

/** Abre o seletor de arquivo do sistema, filtrado pra .xlsx/.xls/.csv, e já
 * devolve a planilha lida (cabeçalho + linhas, tudo como texto). Retorna
 * `null` se o usuário cancelar a seleção. */
export async function pickAndParseSpreadsheet(): Promise<ParsedSheet | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: SPREADSHEET_MIME_TYPES,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const base64 = await readFileAsBase64(asset.uri);

  // codepage 65001 = UTF-8 — sem isso, CSV com acento vem com os bytes
  // interpretados como Latin-1 ("Função" virava "FunÃ§Ã£o"). cellDates:true
  // faz células de data virarem Date de verdade — sem isso, datas de um
  // .xlsx de verdade (guardadas como número serial internamente) vazavam
  // cru tipo "46026" em vez de uma data legível. raw:true é essencial pra
  // CSV: sem ele, o parser de CSV tenta "adivinhar" o tipo de cada célula e
  // interpreta uma data em texto tipo "05/08/2026" como formato americano
  // (MM/DD), virando silenciosamente 8 de maio em vez de 5 de agosto — sem
  // erro nenhum, o dia e o mês só trocavam de lugar. Com raw:true a célula
  // continua como texto puro e quem decide o formato é o DATE_DMY aqui
  // embaixo; datas nativas de um .xlsx de verdade (serial number, sem
  // ambiguidade) continuam vindo como Date normalmente.
  const workbook = XLSX.read(base64, { type: 'base64', codepage: 65001, cellDates: true, raw: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { fileName: asset.name, headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (matrix.length === 0) return { fileName: asset.name, headers: [], rows: [] };

  const cellToText = (cell: unknown): string => {
    if (cell instanceof Date) {
      const y = cell.getUTCFullYear();
      const m = String(cell.getUTCMonth() + 1).padStart(2, '0');
      const d = String(cell.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return cell !== undefined && cell !== null ? String(cell).trim() : '';
  };

  const headerRow = matrix[0];
  const headers = headerRow.map((h, i) => {
    const text = cellToText(h);
    return text !== '' ? text : `Coluna ${i + 1}`;
  });
  const rows = matrix.slice(1).map((row) => headers.map((_, i) => cellToText(row[i])));

  return { fileName: asset.name, headers, rows };
}

/** Normaliza texto pra comparação (sem acento, minúsculo, só alfanumérico) —
 * usado tanto pra sugerir o mapeamento de colunas quanto pra reconhecer
 * valores de campos do tipo enum (ex.: "Mensalista" vs "mensalista"). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export type ImportFieldKind = 'text' | 'number' | 'date' | 'enum';

export interface ImportEnumOption {
  value: string;
  label: string;
}

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  kind?: ImportFieldKind;
  enumOptions?: ImportEnumOption[];
  /** Textos extras pra ajudar a sugerir automaticamente qual coluna da
   * planilha corresponde a este campo. */
  aliases?: string[];
}

/** Tenta achar, entre os cabeçalhos da planilha, o que melhor corresponde a
 * este campo — por nome igual, contido, ou por um dos aliases. */
export function suggestColumnMatch(field: ImportField, headers: string[]): number | null {
  const candidates = [field.label, field.key, ...(field.aliases ?? [])].map(normalize);
  let bestIndex: number | null = null;
  let bestScore = 0;
  headers.forEach((header, index) => {
    const normalizedHeader = normalize(header);
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (normalizedHeader === candidate) {
        bestIndex = index;
        bestScore = 3;
        return;
      }
      if (bestScore < 2 && (normalizedHeader.includes(candidate) || candidate.includes(normalizedHeader))) {
        bestIndex = index;
        bestScore = 2;
      }
    }
  });
  return bestIndex;
}

const DATE_DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const FOOTER_LABEL_KEYWORDS = ['total', 'subtotal', 'media', 'medias', 'resumo', 'soma'];

/** Reconhece linhas de rodapé/resumo de planilha (ex.: "TOTAL", "MÉDIA
 * UMIDADE") que aparecem depois dos dados de verdade — comum em relatórios
 * exportados de outros sistemas (ex.: balanças de caminhão). Não são
 * registros de verdade, então não fazem sentido como "linha com problema"
 * pedindo pra alguém corrigir a planilha — são só ignoradas. */
export function looksLikeFooterLabel(raw: string): boolean {
  const normalized = normalize(raw);
  if (!normalized) return false;
  return FOOTER_LABEL_KEYWORDS.some((kw) => normalized.startsWith(kw));
}

/** Converte um valor bruto de célula (sempre texto) pro tipo esperado do
 * campo. Retorna `error` quando o valor não pôde ser interpretado. */
export function convertCellValue(raw: string, field: ImportField): { value: unknown; error?: string } {
  const trimmed = raw.trim();
  const kind = field.kind ?? 'text';

  if (!trimmed) {
    if (field.required) return { value: null, error: 'obrigatório e está vazio' };
    return { value: null };
  }

  if (kind === 'text') return { value: trimmed };

  if (kind === 'number') {
    // "1.234,56" (formato BR, ponto de milhar) vs "380.5" ou "380,5"
    // (decimal simples) — só remove o ponto quando os dois separadores
    // aparecem juntos, senão "380.5" viraria 3805 por engano.
    let normalized = trimmed;
    if (normalized.includes(',') && normalized.includes('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }
    const num = Number(normalized);
    if (!Number.isFinite(num)) return { value: null, error: `número inválido: "${trimmed}"` };
    return { value: num };
  }

  if (kind === 'date') {
    const dmy = trimmed.match(DATE_DMY);
    if (dmy) {
      const [, d, m, y] = dmy;
      return { value: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` };
    }
    const iso = trimmed.match(DATE_ISO);
    if (iso) return { value: trimmed };
    return { value: null, error: `data inválida: "${trimmed}" (use DD/MM/AAAA)` };
  }

  if (kind === 'enum') {
    const normalized = normalize(trimmed);
    const match = field.enumOptions?.find(
      (opt) => normalize(opt.value) === normalized || normalize(opt.label) === normalized
    );
    if (!match) {
      const options = field.enumOptions?.map((o) => o.label).join(', ');
      return { value: null, error: `valor "${trimmed}" não reconhecido (opções: ${options})` };
    }
    return { value: match.value };
  }

  return { value: trimmed };
}

export interface ImportResult {
  successCount: number;
  errors: { row: number; message: string }[];
}

/** Insere as linhas no Supabase — tenta tudo de uma vez (mais rápido); se
 * falhar, refaz uma por uma pra descobrir exatamente quais linhas têm
 * problema, sem perder as que estão válidas. */
export async function bulkInsert(table: string, rows: Record<string, unknown>[]): Promise<ImportResult> {
  if (rows.length === 0) return { successCount: 0, errors: [] };

  // O nome da tabela é dinâmico (essa função é reusada pra 4 tabelas
  // diferentes), então o cliente tipado do Supabase não consegue inferir a
  // Row/Insert shape aqui — cast local e isolado, resto do arquivo tipado.
  const table_ = supabase.from(table as never);

  const { error: bulkError } = await table_.insert(rows as never[]);
  if (!bulkError) return { successCount: rows.length, errors: [] };

  let successCount = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const { error } = await table_.insert(rows[i] as never);
    if (error) {
      errors.push({ row: i + 1, message: error.message });
    } else {
      successCount++;
    }
  }
  return { successCount, errors };
}
