import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
  onDone: () => void;
}

type Step = 'pick' | 'map' | 'preview' | 'done';

const NONE = '__none__';

export function ImportWizard({ table, fields, accentColor, fixedValues, computedFields, onDone }: ImportWizardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>('pick');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [pickError, setPickError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

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
    rowErrors: { row: number; message: string }[];
    footerCount: number;
  } {
    if (!sheet) return { valid: [], rowErrors: [], footerCount: 0 };
    const valid: Record<string, unknown>[] = [];
    const rowErrors: { row: number; message: string }[] = [];
    let footerCount = 0;

    // Colunas de data mapeadas — quando uma delas traz um rótulo tipo
    // "TOTAL" ou "MÉDIA UMIDADE" em vez de uma data de verdade, a linha é
    // um rodapé de resumo da planilha, não um registro — ignora sem contar
    // como "problema" (não é algo pra corrigir na planilha).
    const dateColIndexes = fields.filter((f) => f.kind === 'date').map((f) => mapping[f.key]);

    sheet.rows.forEach((rawRow, rowIndex) => {
      const isFooterRow = dateColIndexes.some(
        (colIndex) => colIndex !== null && colIndex !== undefined && looksLikeFooterLabel(rawRow[colIndex] ?? '')
      );
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
      } else {
        valid.push(mappedRow);
      }
    });

    return { valid, rowErrors, footerCount };
  }

  async function handleConfirmImport() {
    const { valid, rowErrors } = buildRows();
    setIsImporting(true);
    const insertResult = await bulkInsert(table, valid);
    setIsImporting(false);
    setResult({
      successCount: insertResult.successCount,
      errors: [...rowErrors, ...insertResult.errors.map((e) => ({ ...e, row: e.row }))],
    });
    setStep('done');
  }

  const requiredMissing = fields.filter((f) => f.required && mapping[f.key] === null);
  const {
    valid: previewRows,
    rowErrors: previewErrors,
    footerCount: previewFooterCount,
  } = sheet ? buildRows() : { valid: [], rowErrors: [], footerCount: 0 };

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

  if (step === 'preview' && sheet) {
    return (
      <ScrollView contentContainerStyle={styles.stepContainer}>
        <Text style={styles.instructionsText}>
          {previewRows.length} de {sheet.rows.length} linha(s) prontas pra importar
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
  });
}
