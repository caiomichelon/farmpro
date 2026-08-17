import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../lib/supabase';
import {
  bulkInsert,
  convertCellValue,
  looksLikeFooterLabel,
  pickAndParseSpreadsheet,
  suggestColumnMatch,
  type ImportField,
  type ImportResult,
  type ParsedSheet,
} from '../lib/spreadsheetImport';
import { radius, spacing, typography, useColors, type Colors } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { ChipSelect } from './ChipSelect';
import { DataTable, type DataTableColumn } from './DataTable';

/** Campo que não vem direto de uma coluna da planilha, mas é calculado a
 * partir de outros campos já mapeados na mesma linha — ex.: sacas colhidas
 * calculadas a partir do peso líquido ÷ kg por saca. Só roda quando o campo
 * não foi preenchido diretamente (permite que o usuário também mapeie uma
 * coluna própria, se a planilha já tiver esse valor pronto). */
export interface ImportComputedField {
  key: string;
  label: string;
  /** Mensagem de erro na linha quando o cálculo não é possível (ex.: faltou peso). */
  requiredMessage: string;
  compute: (row: Record<string, unknown>) => number | null;
}

interface ImportWizardProps {
  /** Nome da tabela do Supabase onde as linhas válidas serão inseridas. */
  table: string;
  fields: ImportField[];
  accentColor: string;
  /** Campos fixos (não vêm da planilha) — ex.: farm_id, lot_id da rota atual. */
  fixedValues?: Record<string, unknown>;
  /** Campos derivados de outros campos da mesma linha (opcional). */
  computedFields?: ImportComputedField[];
  /** Ajusta a linha já mapeada (campos diretos + calculados) antes de
   * salvar — ex.: corrigir uma coluna que veio em unidade errada da
   * planilha, usando outro campo já confiável como referência. Roda por
   * último, só em linhas sem nenhum problema até ali. */
  normalizeRow?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Assinatura de duplicata (ex.: data+placa+motorista+sacas) — comparada
   * contra os registros que já existem em `table` (mesmo filtro de
   * fixedValues) e contra as outras linhas da própria planilha, pra não
   * lançar de novo algo que já foi importado ou digitado antes. Retorna
   * `null` quando a linha não tem campo suficiente pra montar uma
   * assinatura confiável (nesse caso não é checada). Precisa ser uma
   * referência estável — declare fora do componente, como computedFields. */
  dedupeKey?: (row: Record<string, unknown>) => string | null;
  onDone: () => void;
}

type Step = 'pick' | 'map' | 'preview' | 'done';

const NONE = '__none__';

export function ImportWizard({
  table,
  fields,
  accentColor,
  fixedValues,
  computedFields,
  normalizeRow,
  dedupeKey,
  onDone,
}: ImportWizardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>('pick');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [pickError, setPickError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicatesSkippedCount, setDuplicatesSkippedCount] = useState(0);
  // Assinaturas do que já existe em `table` (mesmo farm/safra/lote de
  // fixedValues) — carregadas em paralelo enquanto o usuário escolhe o
  // arquivo e mapeia as colunas, pra já estarem prontas na hora da prévia.
  // `null` = ainda carregando (bloqueia a importação até resolver, pra não
  // arriscar duplicar por ter comparado contra uma lista incompleta).
  const [existingSignatures, setExistingSignatures] = useState<Set<string> | null>(dedupeKey ? null : new Set());
  const fixedValuesKey = JSON.stringify(fixedValues ?? {});

  useEffect(() => {
    if (!dedupeKey) return;
    let cancelled = false;
    (async () => {
      let query = supabase.from(table as never).select('*');
      const fv = fixedValuesKey ? (JSON.parse(fixedValuesKey) as Record<string, unknown>) : {};
      for (const [key, value] of Object.entries(fv)) {
        query = query.eq(key, value as never);
      }
      const { data, error } = await query;
      if (cancelled) return;
      const sigs = new Set<string>();
      if (!error) {
        for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
          const sig = dedupeKey(row);
          if (sig) sigs.add(sig);
        }
      }
      setExistingSignatures(sigs);
    })();
    return () => {
      cancelled = true;
    };
    // dedupeKey é uma referência estável (definida fora do componente que
    // chama o wizard, como computedFields/normalizeRow) — só table e o
    // filtro realmente mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, fixedValuesKey, dedupeKey]);

  async function handlePickFile() {
    setPickError(null);
    try {
      const parsed = await pickAndParseSpreadsheet();
      if (!parsed) return; // cancelado
      if (parsed.headers.length === 0) {
        setPickError('Não encontrei nenhuma linha nessa planilha. Confira se a primeira aba tem dados.');
        return;
      }
      const initialMapping: Record<string, number | null> = {};
      for (const field of fields) {
        initialMapping[field.key] = suggestColumnMatch(field, parsed.headers);
      }
      setSheet(parsed);
      setMapping(initialMapping);
      setStep('map');
    } catch (err) {
      setPickError(err instanceof Error ? err.message : 'Não foi possível ler esse arquivo.');
    }
  }

  function buildRows(): {
    valid: Record<string, unknown>[];
    duplicates: { row: number; message: string }[];
    rowErrors: { row: number; message: string }[];
    footerCount: number;
  } {
    if (!sheet) return { valid: [], duplicates: [], rowErrors: [], footerCount: 0 };
    const valid: Record<string, unknown>[] = [];
    const duplicates: { row: number; message: string }[] = [];
    const rowErrors: { row: number; message: string }[] = [];
    let footerCount = 0;
    // Assinaturas já vistas NESTA planilha — pega tanto duplicata contra o
    // que já existe no banco quanto duplicata dentro do próprio arquivo
    // (ex.: a mesma nota colada duas vezes na planilha).
    const seenInBatch = new Set<string>();

    // Quando alguma célula da linha (em qualquer coluna, mapeada ou não)
    // traz um rótulo tipo "TOTAL" ou "MÉDIA UMIDADE" em vez de dado de
    // verdade, a linha é um rodapé de resumo da planilha, não um registro —
    // ignora sem contar como "problema" (não é algo pra corrigir na
    // planilha). Olha a linha inteira, não só as colunas mapeadas: numa
    // planilha de balança de caminhão, por exemplo, o rótulo "TOTAL" pode
    // vir numa coluna (tipo "Carga #") que nem tem campo correspondente no
    // app — só o peso/sacas do rodapé, que teriam número normal.

    sheet.rows.forEach((rawRow, rowIndex) => {
      const isFooterRow = rawRow.some((cell) => looksLikeFooterLabel(cell ?? ''));
      if (isFooterRow) {
        footerCount++;
        return;
      }

      const mappedRow: Record<string, unknown> = { ...fixedValues };
      const problems: string[] = [];

      for (const field of fields) {
        const colIndex = mapping[field.key];
        const raw = colIndex !== null && colIndex !== undefined ? (rawRow[colIndex] ?? '') : '';
        const { value, error } = convertCellValue(raw, field);
        if (error) problems.push(`${field.label}: ${error}`);
        // Omite a chave (em vez de gravar `null`) quando o campo opcional
        // veio vazio — assim colunas com valor padrão no banco (ex.:
        // admission_date) continuam usando o default em vez de quebrar
        // por causa de um NULL explícito.
        else if (value !== null) mappedRow[field.key] = value;
      }

      for (const computed of computedFields ?? []) {
        if (mappedRow[computed.key] !== undefined && mappedRow[computed.key] !== null) continue;
        const value = computed.compute(mappedRow);
        if (value === null) problems.push(computed.requiredMessage);
        else mappedRow[computed.key] = value;
      }

      if (problems.length > 0) {
        rowErrors.push({ row: rowIndex + 2, message: problems.join('; ') }); // +2: linha 1 é cabeçalho
        return;
      }

      const finalRow = normalizeRow ? normalizeRow(mappedRow) : mappedRow;

      if (dedupeKey) {
        const sig = dedupeKey(finalRow);
        if (sig) {
          if (existingSignatures?.has(sig)) {
            duplicates.push({ row: rowIndex + 2, message: 'já estava no aplicativo — não foi importada de novo' });
            return;
          }
          if (seenInBatch.has(sig)) {
            duplicates.push({ row: rowIndex + 2, message: 'repetida na própria planilha — só a primeira ocorrência conta' });
            return;
          }
          seenInBatch.add(sig);
        }
      }

      valid.push(finalRow);
    });

    return { valid, duplicates, rowErrors, footerCount };
  }

  async function handleConfirmImport() {
    const { valid, duplicates, rowErrors } = buildRows();
    setIsImporting(true);
    const insertResult = await bulkInsert(table, valid);
    setIsImporting(false);
    setDuplicatesSkippedCount(duplicates.length);
    setResult({
      successCount: insertResult.successCount,
      errors: [...rowErrors, ...insertResult.errors.map((e) => ({ ...e, row: e.row }))],
    });
    setStep('done');
  }

  const requiredMissing = fields.filter((f) => f.required && mapping[f.key] === null);
  // Enquanto existingSignatures ainda não carregou (null), não monta a
  // prévia de verdade — evita mostrar "pronto pra importar" antes de saber
  // o que já existe, o que deixaria passar duplicata na correria.
  const isCheckingExisting = dedupeKey !== undefined && existingSignatures === null;
  const {
    valid: previewRows,
    duplicates: previewDuplicates,
    rowErrors: previewErrors,
    footerCount: previewFooterCount,
  } = sheet && !isCheckingExisting ? buildRows() : { valid: [], duplicates: [], rowErrors: [], footerCount: 0 };

  // Um campo calculado pode ter a mesma key de um campo direto de propósito
  // (ex.: "sacas colhidas" mapeada direto da planilha, com o cálculo a
  // partir do peso só como reserva) — evita coluna duplicada na prévia.
  const computedOnly = (computedFields ?? []).filter((cf) => !fields.some((f) => f.key === cf.key));
  const previewColumns: DataTableColumn<Record<string, unknown>>[] = [...fields, ...computedOnly].map((f) => ({
    key: f.key,
    label: f.label,
    width: 130,
    render: (row) => (row[f.key] !== undefined && row[f.key] !== null ? String(row[f.key]) : '—'),
  }));

  if (step === 'pick') {
    return (
      <View style={styles.stepContainer}>
        <Card style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Como funciona</Text>
          <Text style={styles.instructionsText}>
            1. Escolha um arquivo Excel (.xlsx) ou CSV com uma linha de cabeçalho.{'\n'}
            2. Você confirma qual coluna da planilha corresponde a cada campo.{'\n'}
            3. Confere uma prévia antes de importar de verdade.
          </Text>
        </Card>
        <Button label="Escolher arquivo (.xlsx ou .csv)" onPress={handlePickFile} />
        {pickError ? <Text style={styles.error}>{pickError}</Text> : null}
      </View>
    );
  }

  if (step === 'map' && sheet) {
    return (
      <ScrollView contentContainerStyle={styles.stepContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.fileLabel}>Arquivo: {sheet.fileName}</Text>
        <Text style={styles.instructionsText}>
          Pra cada campo, escolha a coluna da planilha correspondente. Campos com * são obrigatórios.
        </Text>
        {fields.map((field) => (
          <ChipSelect
            key={field.key}
            label={field.required ? `${field.label} *` : `${field.label} (opcional)`}
            accentColor={accentColor}
            value={mapping[field.key] !== null && mapping[field.key] !== undefined ? String(mapping[field.key]) : NONE}
            onChange={(v) => setMapping((prev) => ({ ...prev, [field.key]: v === NONE ? null : Number(v) }))}
            options={[
              { value: NONE, label: 'Não importar' },
              ...sheet.headers.map((h, i) => ({ value: String(i), label: h })),
            ]}
          />
        ))}
        {requiredMissing.length > 0 ? (
          <Text style={styles.error}>
            Falta mapear: {requiredMissing.map((f) => f.label).join(', ')}
          </Text>
        ) : null}
        <View style={styles.actionsRow}>
          <Button label="Voltar" variant="ghost" onPress={() => setStep('pick')} style={styles.flexButton} />
          <Button
            label="Continuar"
            onPress={() => setStep('preview')}
            disabled={requiredMissing.length > 0}
            style={styles.flexButton}
          />
        </View>
      </ScrollView>
    );
  }

  if (step === 'preview' && sheet && isCheckingExisting) {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.instructionsText}>Conferindo o que já foi lançado, pra não duplicar nada…</Text>
      </View>
    );
  }

  if (step === 'preview' && sheet) {
    return (
      <ScrollView contentContainerStyle={styles.stepContainer}>
        <Text style={styles.instructionsText}>
          {previewRows.length} de {sheet.rows.length} linha(s) prontas pra importar
          {previewDuplicates.length > 0 ? `, ${previewDuplicates.length} já estavam no aplicativo (não serão duplicadas)` : ''}
          {previewErrors.length > 0 ? `, ${previewErrors.length} com problema (não serão importadas)` : ''}
          {previewFooterCount > 0
            ? `, ${previewFooterCount} linha(s) de rodapé (ex.: total/média) ignorada(s) automaticamente`
            : ''}
          .
        </Text>
        {previewRows.length > 0 ? (
          <DataTable
            columns={previewColumns}
            data={previewRows.slice(0, 8).map((row, i) => ({ ...row, _previewKey: i }))}
            keyExtractor={(row) => String(row._previewKey)}
          />
        ) : null}
        {previewDuplicates.length > 0 ? (
          <Card style={styles.dupesCard}>
            <Text style={styles.instructionsTitle}>Já estavam no aplicativo (não serão duplicadas)</Text>
            {previewDuplicates.slice(0, 10).map((d) => (
              <Text key={d.row} style={styles.dupeLine}>
                Linha {d.row}: {d.message}
              </Text>
            ))}
            {previewDuplicates.length > 10 ? (
              <Text style={styles.dupeLine}>… e mais {previewDuplicates.length - 10} linha(s).</Text>
            ) : null}
          </Card>
        ) : null}
        {previewErrors.length > 0 ? (
          <Card style={styles.errorsCard}>
            <Text style={styles.instructionsTitle}>Linhas com problema</Text>
            {previewErrors.slice(0, 10).map((e) => (
              <Text key={e.row} style={styles.errorLine}>
                Linha {e.row}: {e.message}
              </Text>
            ))}
            {previewErrors.length > 10 ? (
              <Text style={styles.errorLine}>… e mais {previewErrors.length - 10} linha(s).</Text>
            ) : null}
          </Card>
        ) : null}
        <View style={styles.actionsRow}>
          <Button label="Voltar" variant="ghost" onPress={() => setStep('map')} style={styles.flexButton} />
          <Button
            label={`Importar ${previewRows.length} registro(s)`}
            onPress={handleConfirmImport}
            loading={isImporting}
            disabled={previewRows.length === 0}
            style={styles.flexButton}
          />
        </View>
      </ScrollView>
    );
  }

  if (step === 'done' && result) {
    return (
      <View style={styles.stepContainer}>
        <Card style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Importação concluída</Text>
          <Text style={styles.instructionsText}>
            {result.successCount} {result.successCount === 1 ? 'registro importado' : 'registros importados'} com
            sucesso.
            {duplicatesSkippedCount > 0
              ? ` ${duplicatesSkippedCount} ${duplicatesSkippedCount === 1 ? 'linha já estava' : 'linhas já estavam'} no aplicativo e não ${duplicatesSkippedCount === 1 ? 'foi duplicada' : 'foram duplicadas'}.`
              : ''}
          </Text>
        </Card>
        {result.errors.length > 0 ? (
          <Card style={styles.errorsCard}>
            <Text style={styles.instructionsTitle}>
              {result.errors.length} {result.errors.length === 1 ? 'linha não importada' : 'linhas não importadas'}
            </Text>
            {result.errors.slice(0, 15).map((e, i) => (
              <Text key={i} style={styles.errorLine}>
                Linha {e.row}: {e.message}
              </Text>
            ))}
          </Card>
        ) : null}
        <Button label="Concluir" onPress={onDone} />
      </View>
    );
  }

  return null;
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
  stepContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  instructionsCard: {
    gap: spacing.xs,
  },
  instructionsTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  instructionsText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  fileLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  errorsCard: {
    gap: spacing.xs,
    borderColor: colors.dangerLight,
    backgroundColor: colors.dangerLight,
  },
  errorLine: {
    ...typography.caption,
    color: colors.danger,
  },
  dupesCard: {
    gap: spacing.xs,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  dupeLine: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  });
}
