import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard } from '../../../../../../src/components/ImportWizard';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import type { ImportField } from '../../../../../../src/lib/spreadsheetImport';
import { useColors } from '../../../../../../src/theme';

const FIELDS: ImportField[] = [
  { key: 'idv', label: 'IDV', required: true, kind: 'number', aliases: ['idv'] },
  { key: 'entry_date', label: 'Data', kind: 'date', aliases: ['data'] },
  { key: 'entry_weight_kg', label: 'Peso (kg)', kind: 'number', aliases: ['peso'] },
  { key: 'carimbo', label: 'Carimbo', kind: 'text', aliases: ['carimbo'] },
  { key: 'lote_label', label: 'Lote', kind: 'text', aliases: ['lote', 'fornecedor'] },
  { key: 'breed', label: 'Raça', kind: 'text', aliases: ['raca'] },
  { key: 'category', label: 'Categoria', kind: 'text', aliases: ['categoria'] },
  {
    key: 'official_id_number',
    label: 'Número oficial (SIAP/SISBOV)',
    kind: 'text',
    aliases: ['siap', 'sisbov', 'sitrap', 'senacsa', 'rastreamento'],
  },
];

/** Assinatura = IDV, o número individual único de cada animal na planilha
 * do produtor (é o que ele fala quando pede pra separar um lote). Uma
 * reimportação da planilha atualizada (com animais novos comprados) não
 * duplica os que já estavam — e se algum dado de um animal já cadastrado
 * mudar (peso corrigido, categoria etc.), ele continua sendo reconhecido
 * pelo mesmo IDV, só que sem atualizar automaticamente os campos (a
 * reimportação só adiciona os que faltam, não sobrescreve — pra sobrescrever
 * um dado específico, ainda é mais seguro editar aquele animal direto). */
function idvDedupeKey(row: Record<string, unknown>): string | null {
  const idv = Number(row.idv);
  return Number.isFinite(idv) ? String(idv) : null;
}

export default function ImportStampedAnimalsScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Importar animais carimbados"
        subtitle="Cadastro geral (IDV, carimbo, peso etc.) — de uma planilha Excel ou CSV"
      />
      <ImportWizard
        table="stamped_animals"
        fields={FIELDS}
        dedupeKey={idvDedupeKey}
        accentColor={colors.pecuaria}
        fixedValues={{ farm_id: farmId }}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}
