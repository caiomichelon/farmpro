import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard } from '../../../../../../../../src/components/ImportWizard';
import { ScreenHeader } from '../../../../../../../../src/components/ScreenHeader';
import { normalize, type ImportField } from '../../../../../../../../src/lib/spreadsheetImport';
import { useColors } from '../../../../../../../../src/theme';

const FIELDS: ImportField[] = [
  { key: 'tag_number', label: 'Brinco', required: true, kind: 'text', aliases: ['identificacao', 'numero'] },
  {
    key: 'official_id_number',
    label: 'Número oficial (SISBOV/SIAP)',
    kind: 'text',
    aliases: ['sisbov', 'siap', 'sitrap', 'rastreamento'],
  },
  {
    key: 'sex',
    label: 'Sexo',
    kind: 'enum',
    aliases: ['sexo'],
    enumOptions: [
      { value: 'macho', label: 'Macho' },
      { value: 'femea', label: 'Fêmea' },
    ],
  },
  { key: 'breed', label: 'Raça', kind: 'text', aliases: ['raca'] },
  { key: 'entry_weight_kg', label: 'Peso de entrada (kg)', kind: 'number', aliases: ['peso'] },
  { key: 'entry_date', label: 'Data de entrada', kind: 'date', aliases: ['entrada'] },
  { key: 'notes', label: 'Observações', kind: 'text', aliases: ['obs'] },
];

/** Assinatura = brinco do animal, normalizado — fixedValues já filtra por
 * farm_id + lot_id, então só precisa ser único dentro deste lote. Não usa
 * peso/raça/sexo na assinatura, pelo mesmo motivo do lote e da matriz:
 * corrigir esses dados numa reimportação não deve criar um animal novo. */
function animalDedupeKey(row: Record<string, unknown>): string | null {
  const tag = normalize(String(row.tag_number ?? ''));
  return tag || null;
}

export default function ImportAnimalsScreen() {
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title="Importar animais" subtitle="Pra este lote — de uma planilha Excel ou CSV" />
      <ImportWizard
        table="cattle_animals"
        fields={FIELDS}
        dedupeKey={animalDedupeKey}
        accentColor={colors.pecuaria}
        fixedValues={{ farm_id: farmId, lot_id: lotId }}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}
