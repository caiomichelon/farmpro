import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { supabase } from '../../../../../../src/lib/supabase';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../src/theme';

interface PreviewRow {
  idv: number;
  entry_weight_kg: number | null;
  carimbo: string | null;
  breed: string | null;
  category: string | null;
  allocated_lot_id: string | null;
  allocated_lot_name: string | null;
}

/** Aceita números colados de qualquer jeito — um por linha, separados por
 * vírgula, ponto e vírgula, espaço, ou uma mistura disso (é assim que sai
 * quando alguém cola direto de uma planilha ou de uma mensagem). Remove
 * repetidos, porque é comum o mesmo IDV aparecer duas vezes na lista que a
 * pessoa recebeu. */
function parseIdvList(raw: string): number[] {
  const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  const seen = new Set<number>();
  for (const token of tokens) {
    const n = Number(token);
    if (Number.isInteger(n) && n > 0) seen.add(n);
  }
  return [...seen];
}

function parseDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

const PREVIEW_LIMIT = 20;

export default function SearchAndGroupStampedAnimalsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();

  const [rawList, setRawList] = useState('');
  const [lotName, setLotName] = useState('');
  const [entryDateText, setEntryDateText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchedIdvs, setSearchedIdvs] = useState<number[] | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [createdLotId, setCreatedLotId] = useState<string | null>(null);

  const parsedIdvs = useMemo(() => parseIdvList(rawList), [rawList]);
  const foundIdvs = new Set(rows.map((r) => r.idv));
  const notFound = searchedIdvs?.filter((idv) => !foundIdvs.has(idv)) ?? [];
  const available = rows.filter((r) => !r.allocated_lot_id);
  const alreadyAllocated = rows.filter((r) => r.allocated_lot_id);
  const avgWeight =
    available.length > 0
      ? available.reduce((sum, r) => sum + (r.entry_weight_kg ?? 0), 0) / available.length
      : 0;

  async function handleSearch() {
    setSearchError(null);
    setCreatedLotId(null);
    if (parsedIdvs.length === 0) {
      setSearchError('Cole pelo menos um número de IDV.');
      return;
    }
    setIsSearching(true);
    const { data, error } = await supabase.rpc('preview_stamped_animals', {
      p_farm_id: farmId,
      p_idvs: parsedIdvs,
    });
    setIsSearching(false);
    if (error) {
      setSearchError(error.message);
      return;
    }
    setSearchedIdvs(parsedIdvs);
    setRows((data ?? []) as PreviewRow[]);
  }

  async function handleCreate() {
    setCreateError(null);
    if (!lotName.trim()) {
      setCreateError('Dá um nome pro lote (ex.: "Lote 3 - Semi 16/09/26").');
      return;
    }
    if (available.length === 0) {
      setCreateError('Nenhum animal disponível pra criar o lote.');
      return;
    }
    const entryDate = entryDateText.trim() ? parseDate(entryDateText) : null;
    if (entryDateText.trim() && !entryDate) {
      setCreateError('Data inválida — use DD/MM/AAAA.');
      return;
    }

    setIsCreating(true);
    const { data, error } = await supabase.rpc('create_lot_from_stamped_animals', {
      p_farm_id: farmId,
      p_idvs: parsedIdvs,
      p_lot_name: lotName.trim(),
      p_entry_date: entryDate,
    });
    setIsCreating(false);
    if (error) {
      setCreateError(error.message);
      return;
    }
    const result = data?.[0];
    if (result?.lot_id) setCreatedLotId(result.lot_id);
  }

  if (createdLotId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title="Lote criado" subtitle={lotName} />
        <View style={styles.content}>
          <Card style={styles.successCard}>
            <Text style={styles.successTitle}>
              {available.length} {available.length === 1 ? 'animal agrupado' : 'animais agrupados'} em &ldquo;{lotName}&rdquo;
            </Text>
            <Text style={styles.successSubtitle}>
              Já dá pra acompanhar peso, custo e saúde desse lote como qualquer outro.
            </Text>
          </Card>
          <Button label="Ver o lote" onPress={() => router.replace(`/farms/${farmId}/pecuaria/corte/lote/${createdLotId}`)} />
          <Button label="Buscar outro grupo" variant="ghost" onPress={() => router.replace(`/farms/${farmId}/pecuaria/corte/carimbados/buscar-agrupar`)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Buscar e agrupar por carimbo"
        subtitle="Cole a lista de IDVs e monta o lote na hora, sem catar um por um"
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>1. Cole os números</Text>
            <Text style={styles.cardSubtitle}>
              Um por linha, ou separados por vírgula/espaço — do jeito que vier.
            </Text>
            <TextField
              label="IDVs"
              value={rawList}
              onChangeText={setRawList}
              placeholder={'Ex.:\n4094\n4195\n4138'}
              multiline
              numberOfLines={8}
              style={styles.textArea}
              autoCapitalize="none"
              keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
            />
            <Text style={styles.countHint}>
              {parsedIdvs.length} {parsedIdvs.length === 1 ? 'número reconhecido' : 'números reconhecidos'}
            </Text>
            {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
            <Button label="Buscar" onPress={handleSearch} loading={isSearching} disabled={parsedIdvs.length === 0} />
          </Card>

          {searchedIdvs ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>2. Resultado da busca</Text>
              <Text style={styles.resultLine}>
                {available.length} {available.length === 1 ? 'animal disponível' : 'animais disponíveis'} pra agrupar
                {available.length > 0 ? ` — peso médio ${avgWeight.toFixed(0)} kg` : ''}
              </Text>

              {alreadyAllocated.length > 0 ? (
                <View style={styles.warnBox}>
                  <Text style={styles.warnTitle}>
                    {alreadyAllocated.length} já {alreadyAllocated.length === 1 ? 'está' : 'estão'} em outro lote (não entram de novo)
                  </Text>
                  {alreadyAllocated.slice(0, PREVIEW_LIMIT).map((r) => (
                    <Text key={r.idv} style={styles.warnLine}>
                      IDV {r.idv} — já está em &ldquo;{r.allocated_lot_name ?? '?'}&rdquo;
                    </Text>
                  ))}
                  {alreadyAllocated.length > PREVIEW_LIMIT ? (
                    <Text style={styles.warnLine}>… e mais {alreadyAllocated.length - PREVIEW_LIMIT}.</Text>
                  ) : null}
                </View>
              ) : null}

              {notFound.length > 0 ? (
                <View style={styles.warnBox}>
                  <Text style={styles.warnTitle}>
                    {notFound.length} {notFound.length === 1 ? 'número não encontrado' : 'números não encontrados'} no cadastro (confira se digitou certo)
                  </Text>
                  <Text style={styles.warnLine}>{notFound.slice(0, PREVIEW_LIMIT).join(', ')}{notFound.length > PREVIEW_LIMIT ? `… e mais ${notFound.length - PREVIEW_LIMIT}.` : ''}</Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {searchedIdvs && available.length > 0 ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>3. Nomeia o lote</Text>
              <TextField label="Nome do lote" value={lotName} onChangeText={setLotName} placeholder='Ex.: "Lote 3 - Semi 16/09/26"' />
              <TextField
                label="Data de entrada"
                value={entryDateText}
                onChangeText={setEntryDateText}
                placeholder="DD/MM/AAAA (hoje, se vazio)"
                keyboardType="numbers-and-punctuation"
              />
              {createError ? <Text style={styles.error}>{createError}</Text> : null}
              <Button
                label={`Criar lote com ${available.length} ${available.length === 1 ? 'animal' : 'animais'}`}
                onPress={handleCreate}
                loading={isCreating}
                disabled={!lotName.trim()}
              />
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    card: { gap: spacing.sm },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    cardSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
    textArea: {
      height: 160,
      paddingTop: spacing.sm,
      textAlignVertical: 'top',
    },
    countHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    resultLine: {
      ...typography.bodyMedium,
      color: colors.pecuaria,
    },
    warnBox: {
      backgroundColor: colors.warningLight,
      borderWidth: 1,
      borderColor: colors.warning,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 2,
    },
    warnTitle: {
      ...typography.captionMedium,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    warnLine: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    successCard: {
      gap: spacing.xs,
      backgroundColor: colors.successLight,
    },
    successTitle: {
      ...typography.subheading,
      color: colors.success,
    },
    successSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });
}
