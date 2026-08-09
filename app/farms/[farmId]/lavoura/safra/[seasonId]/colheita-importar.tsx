import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard, type ImportComputedField } from '../../../../../../src/components/ImportWizard';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { useT } from '../../../../../../src/i18n';
import { DEFAULT_KG_PER_SACA, calcSacasFromWeight } from '../../../../../../src/lib/harvestWeight';
import type { ImportField } from '../../../../../../src/lib/spreadsheetImport';
import { colors } from '../../../../../../src/theme';

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

export default function ImportHarvestScreen() {
  const t = useT();
  const { farmId, seasonId } = useLocalSearchParams<{ farmId: string; seasonId: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('harvestImport.title')} subtitle={t('harvestImport.subtitle')} />
      <ImportWizard
        table="harvest_entries"
        fields={FIELDS}
        computedFields={COMPUTED_FIELDS}
        accentColor={colors.lavoura}
        fixedValues={{ plot_season_id: seasonId }}
        onDone={() => router.replace(`/farms/${farmId}/lavoura/safra/${seasonId}/colheita`)}
      />
    </SafeAreaView>
  );
}
