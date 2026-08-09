import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx');

import { supabase } from './supabase';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const datePart = iso.slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

type Row = Record<string, unknown>;

interface ExportSheet {
  /** Nome da aba — Excel só aceita até 31 caracteres. */
  name: string;
  fetch: (farmId: string) => Promise<Row[]>;
}

async function selectByFarm(table: string, farmId: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table as never).select('*').eq('farm_id', farmId);
  if (error) throw error;
  return (data ?? []) as Row[];
}

const SHEETS: ExportSheet[] = [
  // ── Lavoura ────────────────────────────────────────────────────────────
  {
    name: 'Talhões',
    fetch: async (farmId) => {
      const rows = await selectByFarm('plots', farmId);
      return rows.map((r) => ({
        Talhão: r.name,
        'Área (ha)': r.area_hectares,
        Tipo: r.type === 'lavoura' ? 'Lavoura' : 'Pecuária',
        Cadastrado_em: formatDate(r.created_at as string),
      }));
    },
  },
  {
    name: 'Safras',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('plot_seasons')
        .select('*, plots!inner(farm_id, name)')
        .eq('plots.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { plots: { name: string } | null })[]).map((r) => ({
        Talhão: r.plots?.name ?? '',
        Safra: r.season_label,
        Cultura: r.crop,
        Variedade: r.variety ?? '',
        'Área plantada (ha)': r.planted_area_hectares,
        Plantio: formatDate(r.planting_date as string),
        Status: r.status,
      }));
    },
  },
  {
    name: 'Custos de produção',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('production_costs')
        .select('*, plot_seasons!inner(season_label, plots!inner(farm_id, name))')
        .eq('plot_seasons.plots.farm_id', farmId);
      if (error) throw error;
      return (
        (data ?? []) as unknown as (Row & {
          plot_seasons: { season_label: string; plots: { name: string } | null } | null;
        })[]
      ).map((r) => ({
        Talhão: r.plot_seasons?.plots?.name ?? '',
        Safra: r.plot_seasons?.season_label ?? '',
        Categoria: r.category,
        Descrição: r.description,
        Quantidade: r.quantity ?? '',
        Unidade: r.unit ?? '',
        'Custo unitário': r.unit_cost ?? '',
        'Custo total': r.total_cost,
        'Aplicado em': formatDate(r.applied_at as string),
      }));
    },
  },
  {
    name: 'Colheitas',
    fetch: async (farmId) => {
      // Lançamentos amarrados a talhão/safra e lançamentos soltos direto na
      // fazenda (sem talhão) são buscados em duas consultas separadas — o
      // Supabase não faz "OR" entre uma junção e uma coluna direta na mesma
      // query — e depois combinados numa lista só.
      const [bySeason, direct] = await Promise.all([
        supabase
          .from('harvest_entries')
          .select('*, plot_seasons!inner(season_label, crop, plots!inner(farm_id, name))')
          .eq('plot_seasons.plots.farm_id', farmId),
        supabase.from('harvest_entries').select('*').eq('farm_id', farmId),
      ]);
      if (bySeason.error) throw bySeason.error;
      if (direct.error) throw direct.error;

      const seasonRows = (bySeason.data ?? []) as unknown as (Row & {
        plot_seasons: { season_label: string; crop: string; plots: { name: string } | null } | null;
      })[];
      const directRows = (direct.data ?? []) as Row[];

      return [
        ...seasonRows.map((r) => ({
          Talhão: r.plot_seasons?.plots?.name ?? '',
          Safra: r.plot_seasons?.season_label ?? '',
          Cultura: r.plot_seasons?.crop ?? '',
          'Colhido em': formatDate(r.harvested_at as string),
          'Quantidade (sacas)': r.quantity_sacas,
          Observações: r.notes ?? '',
        })),
        ...directRows.map((r) => ({
          Talhão: '',
          Safra: '',
          Cultura: '',
          'Colhido em': formatDate(r.harvested_at as string),
          'Quantidade (sacas)': r.quantity_sacas,
          Observações: r.notes ?? '',
        })),
      ];
    },
  },
  {
    name: 'Vendas de grão',
    fetch: async (farmId) => {
      const [bySeason, direct] = await Promise.all([
        supabase
          .from('grain_sales')
          .select('*, grain_buyers(name), plot_seasons!inner(season_label, crop, plots!inner(farm_id, name))')
          .eq('plot_seasons.plots.farm_id', farmId),
        supabase.from('grain_sales').select('*, grain_buyers(name)').eq('farm_id', farmId),
      ]);
      if (bySeason.error) throw bySeason.error;
      if (direct.error) throw direct.error;

      const seasonRows = (bySeason.data ?? []) as unknown as (Row & {
        grain_buyers: { name: string } | null;
        plot_seasons: { season_label: string; crop: string; plots: { name: string } | null } | null;
      })[];
      const directRows = (direct.data ?? []) as unknown as (Row & { grain_buyers: { name: string } | null })[];

      return [
        ...seasonRows.map((r) => ({
          Talhão: r.plot_seasons?.plots?.name ?? '',
          Safra: r.plot_seasons?.season_label ?? '',
          Cultura: r.plot_seasons?.crop ?? '',
          Comprador: r.grain_buyers?.name ?? '',
          'Vendido em': formatDate(r.sale_date as string),
          'Quantidade (sacas)': r.quantity_sacas,
          'Preço por saca': r.price_per_saca,
        })),
        ...directRows.map((r) => ({
          Talhão: '',
          Safra: '',
          Cultura: '',
          Comprador: r.grain_buyers?.name ?? '',
          'Vendido em': formatDate(r.sale_date as string),
          'Quantidade (sacas)': r.quantity_sacas,
          'Preço por saca': r.price_per_saca,
        })),
      ];
    },
  },
  {
    name: 'Compradores de grão',
    fetch: async (farmId) => {
      const rows = await selectByFarm('grain_buyers', farmId);
      return rows.map((r) => ({ Nome: r.name, Observações: r.notes ?? '' }));
    },
  },

  // ── Pecuária — Corte ──────────────────────────────────────────────────
  {
    name: 'Lotes',
    fetch: async (farmId) => {
      const rows = await selectByFarm('cattle_lots', farmId);
      return rows.map((r) => ({
        Lote: r.name,
        Status: r.status,
        'Entrada (data)': formatDate(r.entry_date as string),
        'Cabeças na entrada': r.entry_head_count,
        'Peso médio de entrada (kg)': r.entry_avg_weight_kg,
      }));
    },
  },
  {
    name: 'Animais',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('cattle_animals')
        .select('*, cattle_lots(name)')
        .eq('farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { cattle_lots: { name: string } | null })[]).map((r) => ({
        Brinco: r.tag_number,
        Lote: r.cattle_lots?.name ?? '',
        Sexo: r.sex === 'macho' ? 'Macho' : r.sex === 'femea' ? 'Fêmea' : '',
        Raça: r.breed ?? '',
        'Peso de entrada (kg)': r.entry_weight_kg ?? '',
        'Entrada (data)': formatDate(r.entry_date as string),
        Status: r.status,
        Observações: r.notes ?? '',
      }));
    },
  },
  {
    name: 'Pesagens de lote',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('cattle_lot_weighings')
        .select('*, cattle_lots!inner(farm_id, name)')
        .eq('cattle_lots.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { cattle_lots: { name: string } | null })[]).map((r) => ({
        Lote: r.cattle_lots?.name ?? '',
        'Pesado em': formatDate(r.weighed_at as string),
        'Peso médio (kg)': r.avg_weight_kg,
        Cabeças: r.head_count ?? '',
        'Escore corporal': r.body_condition_score ?? '',
      }));
    },
  },
  {
    name: 'Pesagens de animal',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('cattle_animal_weighings')
        .select('*, cattle_animals!inner(farm_id, tag_number)')
        .eq('cattle_animals.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { cattle_animals: { tag_number: string } | null })[]).map((r) => ({
        Brinco: r.cattle_animals?.tag_number ?? '',
        'Pesado em': formatDate(r.weighed_at as string),
        'Peso (kg)': r.weight_kg,
        'Escore corporal': r.body_condition_score ?? '',
      }));
    },
  },
  {
    name: 'Saúde dos animais',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('cattle_animal_health_events')
        .select('*, cattle_animals!inner(farm_id, tag_number)')
        .eq('cattle_animals.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { cattle_animals: { tag_number: string } | null })[]).map((r) => ({
        Brinco: r.cattle_animals?.tag_number ?? '',
        Data: formatDate(r.event_date as string),
        Tipo: r.event_type,
        Descrição: r.description,
      }));
    },
  },
  {
    name: 'Movimentação de animais',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('cattle_animal_movements')
        .select(
          '*, cattle_animals!inner(farm_id, tag_number), from_lot:cattle_lots!from_lot_id(name), to_lot:cattle_lots!to_lot_id(name)'
        )
        .eq('cattle_animals.farm_id', farmId);
      if (error) throw error;
      return (
        (data ?? []) as unknown as (Row & {
          cattle_animals: { tag_number: string } | null;
          from_lot: { name: string } | null;
          to_lot: { name: string } | null;
        })[]
      ).map((r) => ({
        Brinco: r.cattle_animals?.tag_number ?? '',
        'Do lote': r.from_lot?.name ?? '',
        'Para o lote': r.to_lot?.name ?? '',
        Data: formatDate(r.moved_at as string),
      }));
    },
  },
  {
    name: 'Mortalidade',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('cattle_mortality_events')
        .select('*, cattle_lots!inner(farm_id, name)')
        .eq('cattle_lots.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { cattle_lots: { name: string } | null })[]).map((r) => ({
        Lote: r.cattle_lots?.name ?? '',
        Data: formatDate(r.event_date as string),
        Cabeças: r.head_count,
        Causa: r.cause ?? '',
      }));
    },
  },
  {
    name: 'Abates',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('cattle_slaughters')
        .select('*, cattle_lots!inner(farm_id, name), slaughterhouses(name)')
        .eq('cattle_lots.farm_id', farmId);
      if (error) throw error;
      return (
        (data ?? []) as unknown as (Row & {
          cattle_lots: { name: string } | null;
          slaughterhouses: { name: string } | null;
        })[]
      ).map((r) => ({
        Lote: r.cattle_lots?.name ?? '',
        Frigorífico: r.slaughterhouses?.name ?? '',
        Data: formatDate(r.slaughter_date as string),
        Cabeças: r.head_count,
        'Peso de saída (kg)': r.exit_avg_weight_kg,
        'Rendimento de carcaça (%)': r.carcass_yield_pct ?? '',
        'Preço por arroba': r.price_per_arroba,
      }));
    },
  },
  {
    name: 'Frigoríficos',
    fetch: async (farmId) => {
      const rows = await selectByFarm('slaughterhouses', farmId);
      return rows.map((r) => ({ Nome: r.name, Observações: r.notes ?? '' }));
    },
  },

  // ── Pecuária — Cria/Reprodução ────────────────────────────────────────
  {
    name: 'Matrizes',
    fetch: async (farmId) => {
      const rows = await selectByFarm('breeding_cows', farmId);
      return rows.map((r) => ({
        Identificação: r.identification,
        Nascimento: formatDate(r.birth_date as string),
        Observações: r.notes ?? '',
      }));
    },
  },
  {
    name: 'Inseminações',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('inseminations')
        .select('*, breeding_cows!inner(farm_id, identification)')
        .eq('breeding_cows.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { breeding_cows: { identification: string } | null })[]).map(
        (r) => ({
          Matriz: r.breeding_cows?.identification ?? '',
          Data: formatDate(r.insemination_date as string),
          Veterinário: r.veterinarian ?? '',
          Método: r.method ?? '',
          'Previsão de parto': formatDate(r.expected_calving_date as string),
        })
      );
    },
  },
  {
    name: 'Partos',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('calvings')
        .select('*, breeding_cows!inner(farm_id, identification)')
        .eq('breeding_cows.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { breeding_cows: { identification: string } | null })[]).map(
        (r) => ({
          Matriz: r.breeding_cows?.identification ?? '',
          Data: formatDate(r.calving_date as string),
          'Bezerros nascidos': r.calf_count,
          'Identificação do bezerro': r.calf_identification ?? '',
        })
      );
    },
  },

  // ── Funcionários ──────────────────────────────────────────────────────
  {
    name: 'Funcionários',
    fetch: async (farmId) => {
      const rows = await selectByFarm('employees', farmId);
      return rows.map((r) => ({
        Nome: r.full_name,
        Setor: r.sector,
        Função: r.role,
        'Tipo de custo': r.cost_type,
        'Valor do custo': r.cost_value,
        CPF: r.cpf ?? '',
        Telefone: r.phone ?? '',
        Admissão: formatDate(r.admission_date as string),
        Nascimento: formatDate(r.birth_date as string),
        Status: r.status,
      }));
    },
  },
  {
    name: 'Documentos de funcionários',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*, employees!inner(farm_id, full_name)')
        .eq('employees.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { employees: { full_name: string } | null })[]).map((r) => ({
        Funcionário: r.employees?.full_name ?? '',
        'Tipo de documento': r.document_type,
        Número: r.document_number ?? '',
        Emissão: formatDate(r.issue_date as string),
        Vencimento: formatDate(r.expiry_date as string),
      }));
    },
  },
  {
    name: 'Ponto',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, employees!inner(farm_id, full_name)')
        .eq('employees.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { employees: { full_name: string } | null })[]).map((r) => ({
        Funcionário: r.employees?.full_name ?? '',
        Tipo: r.entry_type,
        'Registrado em': formatDate(r.recorded_at as string),
      }));
    },
  },
  {
    name: 'Produtividade',
    fetch: async (farmId) => {
      const { data, error } = await supabase
        .from('productivity_records')
        .select('*, employees!inner(farm_id, full_name)')
        .eq('employees.farm_id', farmId);
      if (error) throw error;
      return ((data ?? []) as unknown as (Row & { employees: { full_name: string } | null })[]).map((r) => ({
        Funcionário: r.employees?.full_name ?? '',
        Data: formatDate(r.record_date as string),
        Atividade: r.activity,
        Quantidade: r.quantity,
        Unidade: r.unit,
      }));
    },
  },
];

export interface ExportProgress {
  sheetName: string;
  done: number;
  total: number;
}

/** Busca todas as tabelas da fazenda (lavoura, pecuária e funcionários),
 * monta uma planilha .xlsx com uma aba por tipo de dado, e abre o
 * compartilhar/salvar do sistema (ou baixa direto, no navegador). */
export async function exportFarmData(
  farmId: string,
  farmName: string,
  onProgress?: (p: ExportProgress) => void
): Promise<{ sheetCount: number; rowCount: number }> {
  const workbook = XLSX.utils.book_new();
  let rowCount = 0;

  for (let i = 0; i < SHEETS.length; i++) {
    const sheet = SHEETS[i];
    onProgress?.({ sheetName: sheet.name, done: i, total: SHEETS.length });
    const rows = await sheet.fetch(farmId);
    rowCount += rows.length;
    const worksheet =
      rows.length > 0 ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['Sem registros ainda']]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  onProgress?.({ sheetName: '', done: SHEETS.length, total: SHEETS.length });

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const safeName = farmName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-');
  const fileName = `farmpro-${safeName || 'fazenda'}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === 'web') {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { sheetCount: SHEETS.length, rowCount };
  }

  const fileUri = `${cacheDirectory}${fileName}`;
  await writeAsStringAsync(fileUri, base64, { encoding: EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar dados do FarmPro',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }

  return { sheetCount: SHEETS.length, rowCount };
}
