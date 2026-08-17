import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard, type ImportComputedField } from '../components/ImportWizard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useT } from '../i18n';
import { DEFAULT_KG_PER_SACA, calcSacasFromWeight } from '../lib/harvestWeight';
import { normalize, type ImportField } from '../lib/spreadsheetImport';
import { colors } from '../theme';

const FIELDS: ImportField[] = [
  { key: 'truck_plate', label: 'Placa do caminhão', kind: 'text', aliases: ['placa'] },
  { key: 'driver_name', label: 'Motorista', kind: 'text', aliases: ['motorista', 'chofer'] },
  { key: 'buyer_name', label: 'Comprador', kind: 'text', aliases: ['comprador', 'empresa', 'cliente', 'cooperativa'] },
  {
    key: 'quantity_sacas',
    label: 'Sacas colhidas (60kg)',
    kind: 'number',
    aliases: ['sacas', 'sacas 60kg', 'sc 60kg', 'qtd sacas', 'quantidade de sacas'],
  },
  { key: 'gross_weight_kg', label: 'Peso bruto (kg)', kind: 'number', aliases: ['peso bruto', 'bruto'] },
  {
    key: 'raw_net_weight_kg',
    label: 'Peso (kg) — antes do desconto',
    kind: 'number',
    aliases: ['peso (kg)', 'peso sem desconto', 'peso antes do desconto'],
  },
  {
    key: 'net_weight_kg',
    label: 'Peso líquido p/ fixação (kg)',
    kind: 'number',
    // "peso liquido fixacao" (sem o "p/") cobre o nome como costuma vir de
    // planilha exportada pela cooperativa/balança (ex.: "Peso Líquido
    // Fixação (kg)"), que é mais específico que o "liquido" genérico — sem
    // esse alias, "liquido" batia igual tanto nessa coluna quanto na coluna
    // de peso ANTES do desconto ("Peso Líquido (kg)"), e o match genérico
    // sempre grudava na primeira que aparecesse na planilha.
    aliases: ['peso liquido', 'liquido', 'so grao', 'peso liquido p fixacao', 'peso liquido fixacao', 'peso corrigido'],
  },
  { key: 'humidity_pct', label: 'Umidade (%)', kind: 'number', aliases: ['umidade', 'humidade'] },
  { key: 'kg_per_saca', label: 'Kg por saca', kind: 'number', aliases: ['kg/saca', 'kg por sc'] },
  { key: 'harvested_at', label: 'Data', kind: 'date', aliases: ['data da colheita'] },
  { key: 'notes', label: 'Observação', kind: 'text', aliases: ['obs', 'observacao'] },
];

const COMPUTED_FIELDS: ImportComputedField[] = [
  {
    key: 'quantity_sacas',
    label: 'Sacas (calculadas)',
    requiredMessage: 'informe as sacas ou o peso líquido (pra calcular)',
    compute: (row) => {
      const net = Number(row.net_weight_kg);
      if (!net || net <= 0) return null;
      const kgPerSacaRaw = Number(row.kg_per_saca);
      const kgPerSaca = kgPerSacaRaw > 0 ? kgPerSacaRaw : DEFAULT_KG_PER_SACA;
      return calcSacasFromWeight(net, kgPerSaca);
    },
  },
];

/** Algumas planilhas de balança de caminhão rotulam a coluna de peso como
 * "(kg)" mas na verdade trazem o valor em toneladas (visto numa planilha
 * real: "28.486" pra uma carga de 474 sacas). Usa as sacas já confirmadas
 * (diretas da planilha ou calculadas) como referência pra detectar isso: um
 * caminhão de verdade dá uns 50-70kg por saca, então um peso líquido que
 * implique menos de 5kg/saca é sinal de que veio em toneladas — corrige
 * multiplicando por 1000 (peso bruto junto, mesma origem/erro). */
function normalizeHarvestWeights(row: Record<string, unknown>): Record<string, unknown> {
  const sacas = Number(row.quantity_sacas);
  const net = Number(row.net_weight_kg);
  if (!sacas || sacas <= 0 || !net || net <= 0) return row;

  const impliedKgPerSaca = net / sacas;
  if (impliedKgPerSaca >= 5) return row;

  // Mesma planilha, mesmo erro de unidade — o peso bruto e o peso antes do
  // desconto (raw_net_weight_kg) vêm da mesma balança, então corrige os
  // três juntos.
  const gross = Number(row.gross_weight_kg);
  const rawNet = Number(row.raw_net_weight_kg);
  return {
    ...row,
    net_weight_kg: net * 1000,
    ...(gross > 0 ? { gross_weight_kg: gross * 1000 } : {}),
    ...(rawNet > 0 ? { raw_net_weight_kg: rawNet * 1000 } : {}),
  };
}

/** Assinatura pra reconhecer que duas notas são "a mesma viagem" — data,
 * quantidade de sacas e placa (quando a planilha traz placa). Cobre o caso
 * de mandar uma planilha atualizada que ainda inclui as notas antigas já
 * lançadas antes (manualmente ou numa importação anterior): a nota antiga é
 * reconhecida e pulada, só o que é realmente novo entra.
 *
 * De propósito NÃO usa motorista na comparação — nome de pessoa varia
 * demais entre planilhas ("Marcio" vs "Márcio Souza" vs só o sobrenome), e
 * uma pequena diferença de digitação faria o app achar que é uma nota nova
 * e duplicar. Data + sacas já é bem específico (o valor de sacas vem
 * calculado do peso pesado, então duas viagens de verdade raramente batem
 * exatamente); a placa, quando disponível, só reforça ainda mais. Só exige
 * data e sacas (sempre preenchidos) — nunca pula a checagem de duplicata
 * por falta de placa/motorista.
 *
 * Não usa peso/umidade/comprador na assinatura de propósito: se alguém
 * corrigir esses campos numa nota já lançada e reenviar, ainda quer que
 * seja reconhecida como a mesma nota, não duplicada. */
function harvestDedupeKey(row: Record<string, unknown>): string | null {
  const date = String(row.harvested_at ?? '').trim();
  const sacas = Number(row.quantity_sacas);
  if (!date || !Number.isFinite(sacas) || sacas <= 0) return null;
  const plate = normalize(String(row.truck_plate ?? ''));
  return `${date}|${plate}|${sacas.toFixed(2)}`;
}

/** Importar várias notas de colheita de uma planilha — amarradas a uma
 * safra (seasonId) ou soltas direto na fazenda (sem seasonId). */
export function ImportHarvestScreen({ farmId, seasonId }: { farmId: string; seasonId?: string }) {
  const t = useT();
  const basePath = seasonId ? `/farms/${farmId}/lavoura/safra/${seasonId}` : `/farms/${farmId}/lavoura`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('harvestImport.title')} subtitle={t('harvestImport.subtitle')} />
      <ImportWizard
        table="harvest_entries"
        fields={FIELDS}
        computedFields={COMPUTED_FIELDS}
        normalizeRow={normalizeHarvestWeights}
        dedupeKey={harvestDedupeKey}
        accentColor={colors.lavoura}
        fixedValues={seasonId ? { plot_season_id: seasonId } : { farm_id: farmId }}
        onDone={() => router.replace(`${basePath}/colheita`)}
      />
    </SafeAreaView>
  );
}
