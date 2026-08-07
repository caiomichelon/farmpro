import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard } from '../../../../../src/components/ImportWizard';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import type { ImportField } from '../../../../../src/lib/spreadsheetImport';
import { colors } from '../../../../../src/theme';

const FIELDS: ImportField[] = [
  { key: 'name', label: 'Nome do lote', required: true, kind: 'text', aliases: ['lote'] },
  { key: 'entry_head_count', label: 'Cabeças na entrada', required: true, kind: 'number', aliases: ['cabecas', 'quantidade'] },
  { key: 'entry_avg_weight_kg', label: 'Peso médio de entrada (kg)', required: true, kind: 'number', aliases: ['peso'] },
  { key: 'entry_date', label: 'Data de entrada', kind: 'date', aliases: ['entrada'] },
];

export default function ImportLotsScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title="Importar lotes" subtitle="De uma planilha Excel ou CSV" />
      <ImportWizard
        table="cattle_lots"
        fields={FIELDS}
        accentColor={colors.pecuaria}
        fixedValues={{ farm_id: farmId }}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}
