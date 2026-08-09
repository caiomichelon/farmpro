import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard } from '../../../../../src/components/ImportWizard';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import type { ImportField } from '../../../../../src/lib/spreadsheetImport';
import { colors } from '../../../../../src/theme';

const FIELDS: ImportField[] = [
  { key: 'identification', label: 'Identificação', required: true, kind: 'text', aliases: ['brinco', 'matriz'] },
  {
    key: 'official_id_number',
    label: 'Número oficial (SISBOV/SIAP)',
    kind: 'text',
    aliases: ['sisbov', 'siap', 'sitrap', 'rastreamento'],
  },
  { key: 'birth_date', label: 'Data de nascimento', kind: 'date', aliases: ['nascimento'] },
  { key: 'notes', label: 'Observações', kind: 'text', aliases: ['obs'] },
];

export default function ImportCowsScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title="Importar matrizes" subtitle="De uma planilha Excel ou CSV" />
      <ImportWizard
        table="breeding_cows"
        fields={FIELDS}
        accentColor={colors.pecuaria}
        fixedValues={{ farm_id: farmId }}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}
