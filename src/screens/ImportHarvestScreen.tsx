import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard, type ImportComputedField } from '../components/ImportWizard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useT } from '../i18n';
import { DEFAULT_KG_PER_SACA, calcSacasFromWeight } from '../lib/harvestWeight';
import type { ImportField } from '../lib/spreadsheetImport';
import { colors } from '../theme';

const FIELDS: ImportField[] = [
  { key: 'truck_plate', label: 'Placa do caminhão', kind: 'text', aliases: ['placa'] },
  { key: 'driver_name', label: 'Motorista', kind: 'text', aliases: ['motorista', 'chofer'] },
  { key: 'gross_weight_kg', label: 'Peso bruto (kg)', kind: 'number', aliases: ['peso bruto', 'bruto'] },
  { key: 'net_weight_kg', label: 'Peso líquido (kg)', kind: 'number', aliases: ['peso liquido', 'liquido', 'so grao'] },
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
        accentColor={colors.lavoura}
        fixedValues={seasonId ? { plot_season_id: seasonId } : { farm_id: farmId }}
        onDone={() => router.replace(`${basePath}/colheita`)}
      />
    </SafeAreaView>
  );
}
