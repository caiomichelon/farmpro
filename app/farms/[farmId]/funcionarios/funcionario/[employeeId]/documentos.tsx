import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../src/components/Button';
import { Card } from '../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../src/components/ChipSelect';
import { EmptyState } from '../../../../../../src/components/EmptyState';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../src/components/TextField';
import { COMMON_DOCUMENT_TYPES } from '../../../../../../src/data/employeeOptions';
import { useEmployeeDocuments } from '../../../../../../src/hooks/useEmployeeDocuments';
import { DOCUMENT_ALERT_LABELS, getDocumentAlertStatus } from '../../../../../../src/lib/documentAlerts';
import type { EmployeeDocument } from '../../../../../../src/types/database';
import { colors, radius, spacing, typography } from '../../../../../../src/theme';

const ALERT_COLORS: Record<string, { bg: string; text: string }> = {
  vencido: { bg: colors.dangerLight, text: colors.danger },
  vence_em_breve: { bg: colors.warningLight, text: colors.warning },
  ok: { bg: colors.successLight, text: colors.success },
  sem_validade: { bg: colors.surfaceAlt, text: colors.textSecondary },
};

export default function EmployeeDocumentsScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { documents, isLoading, error, createDocument } = useEmployeeDocuments(employeeId);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Documentos" subtitle="Alertas de vencimento" />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.funcionarios} />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text="Nenhum documento cadastrado ainda." />}
          renderItem={({ item }) => <DocumentRow document={item} />}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        {isAdding ? (
          <NewDocumentForm
            onCancel={() => setIsAdding(false)}
            onCreate={async (values) => {
              const { error: createError } = await createDocument(values);
              if (!createError) setIsAdding(false);
              return createError;
            }}
          />
        ) : (
          <Button label="+ Novo documento" onPress={() => setIsAdding(true)} />
        )}
      </View>
    </SafeAreaView>
  );
}

function DocumentRow({ document }: { document: EmployeeDocument }) {
  const status = getDocumentAlertStatus(document.expiry_date);
  const colorSet = ALERT_COLORS[status];

  return (
    <Card style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle}>{document.document_type}</Text>
        <View style={[styles.statusBadge, { backgroundColor: colorSet.bg }]}>
          <Text style={[styles.statusBadgeText, { color: colorSet.text }]}>{DOCUMENT_ALERT_LABELS[status]}</Text>
        </View>
      </View>
      {document.expiry_date ? (
        <Text style={styles.cardMeta}>Validade: {formatDate(document.expiry_date)}</Text>
      ) : null}
      {document.document_number ? <Text style={styles.cardMeta}>Nº {document.document_number}</Text> : null}
    </Card>
  );
}

function NewDocumentForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: {
    document_type: string;
    document_number?: string;
    expiry_date?: string;
  }) => Promise<string | null>;
}) {
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!documentType.trim()) {
      setError('Escolha ou digite o tipo de documento.');
      return;
    }
    setIsSubmitting(true);
    const createError = await onCreate({
      document_type: documentType.trim(),
      document_number: documentNumber.trim() || undefined,
      expiry_date: parseDate(expiryDate) ?? undefined,
    });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <ChipSelect
        label="Tipo de documento"
        options={COMMON_DOCUMENT_TYPES.map((t) => ({ value: t, label: t }))}
        value={COMMON_DOCUMENT_TYPES.includes(documentType) ? documentType : null}
        onChange={setDocumentType}
        accentColor={colors.funcionarios}
      />
      <TextField label="Tipo (ou digite outro)" value={documentType} onChangeText={setDocumentType} placeholder="Ex.: ASO" />
      <TextField label="Número" value={documentNumber} onChangeText={setDocumentNumber} placeholder="Opcional" />
      <TextField label="Data de validade" value={expiryDate} onChangeText={setExpiryDate} placeholder="DD/MM/AAAA (opcional)" keyboardType="numbers-and-punctuation" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!documentType} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function parseDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusBadgeText: {
    ...typography.caption,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  form: {
    gap: spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
  },
});
