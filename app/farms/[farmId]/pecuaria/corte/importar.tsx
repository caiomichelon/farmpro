import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard } from '../../../../../src/components/ImportWizard';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { normalize, type ImportField } from '../../../../../src/lib/spreadsheetImport';
import { useColors } from '../../../../../src/theme';

const FIELDS: ImportField[] = [
  { key: 'name', label: 'Nome do lote', required: true, kind: 'text', aliases: ['lote'] },
  { key: 'entry_head_count', label: 'Cabeças na entrada', required: true, kind: 'number', aliases: ['cabecas', 'quantidade'] },
  { key: 'entry_avg_weight_kg', label: 'Peso médio de entrada (kg)', required: true, kind: 'number', aliases: ['peso'] },
  { key: 'entry_date', label: 'Data de entrada', kind: 'date', aliases: ['entrada'] },
];

/** Assinatura pra reconhecer que duas linhas são "o mesmo lote" — nome +
 * data de entrada. Só o nome não basta: é comum reaproveitar o mesmo nome
 * de lote (ex.: "Lote 1") em entradas diferentes ao longo do tempo; com a
 * data de entrada junto, fica específico o bastante pra não confundir dois
 * lotes de verdade. Não usa cabeças/peso na assinatura de propósito: se
 * alguém corrigir esses números num lote já lançado e reenviar a planilha,
 * ainda quer que seja reconhecido como o mesmo lote, não duplicado. Sem
 * data de entrada não dá pra montar uma assinatura confiável — a linha
 * simplesmente não é checada contra duplicata nesse caso. */
function lotDedupeKey(row: Record<string, unknown>): string | null {
  const name = normalize(String(row.name ?? ''));
  const date = String(row.entry_date ?? '').trim();
  if (!name || !date) return null;
  return `${name}|${date}`;
}

export default function ImportLotsScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title="Importar lotes" subtitle="De uma planilha Excel ou CSV" />
      <ImportWizard
        table="cattle_lots"
        fields={FIELDS}
        dedupeKey={lotDedupeKey}
        accentColor={colors.pecuaria}
        fixedValues={{ farm_id: farmId }}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}
