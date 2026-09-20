import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard } from '../../../../../src/components/ImportWizard';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { normalize, type ImportField } from '../../../../../src/lib/spreadsheetImport';
import { useColors } from '../../../../../src/theme';

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

/** Assinatura = identificação (brinco) da matriz, normalizada — é o
 * identificador único de verdade da vaca dentro da fazenda (fixedValues já
 * filtra por farm_id, então não precisa mais que isso). Não usa número
 * oficial nem data de nascimento na assinatura: se a planilha vier com
 * esses dados preenchidos ou corrigidos numa reimportação, ainda quer
 * reconhecer a mesma matriz pela identificação, não duplicar. */
function cowDedupeKey(row: Record<string, unknown>): string | null {
  const identification = normalize(String(row.identification ?? ''));
  return identification || null;
}

export default function ImportCowsScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title="Importar matrizes" subtitle="De uma planilha Excel ou CSV" />
      <ImportWizard
        table="breeding_cows"
        fields={FIELDS}
        dedupeKey={cowDedupeKey}
        accentColor={colors.pecuaria}
        fixedValues={{ farm_id: farmId }}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}
