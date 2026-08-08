import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { TextField } from '../../../src/components/TextField';
import { useFarm } from '../../../src/hooks/useFarms';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FarmVaultScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading, updateFarmVault } = useFarm(farmId);

  const [isEditing, setIsEditing] = useState(false);
  const [successorName, setSuccessorName] = useState('');
  const [successorRelationship, setSuccessorRelationship] = useState('');
  const [successorPhone, setSuccessorPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [vaultNotes, setVaultNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setSuccessorName(farm?.successor_name ?? '');
    setSuccessorRelationship(farm?.successor_relationship ?? '');
    setSuccessorPhone(farm?.successor_phone ?? '');
    setEmergencyContactName(farm?.emergency_contact_name ?? '');
    setEmergencyContactPhone(farm?.emergency_contact_phone ?? '');
    setVaultNotes(farm?.vault_notes ?? '');
    setError(null);
    setIsEditing(true);
  }

  async function handleSave() {
    if (!farmId) return;
    if (!successorName.trim() && !emergencyContactName.trim() && !vaultNotes.trim()) {
      setError('Preencha pelo menos o sucessor, um contato de emergência ou uma nota.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const { error: saveError } = await updateFarmVault(farmId, {
      successor_name: successorName.trim() || null,
      successor_relationship: successorRelationship.trim() || null,
      successor_phone: successorPhone.trim() || null,
      emergency_contact_name: emergencyContactName.trim() || null,
      emergency_contact_phone: emergencyContactPhone.trim() || null,
      vault_notes: vaultNotes.trim() || null,
    });
    setIsSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setIsEditing(false);
  }

  if (isLoading || !farm) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const hasVaultData = Boolean(farm.successor_name || farm.emergency_contact_name || farm.vault_notes);

  if (isEditing || !hasVaultData) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title="🔒 Cofre da fazenda" subtitle="Sucessor, contato de emergência e notas importantes" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.introText}>
              Se algo acontecer com você, quem você confia deve saber tocar a fazenda. Preencha o que fizer sentido — nada aqui é
              obrigatório.
            </Text>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Sucessor designado</Text>
              <TextField label="Nome" value={successorName} onChangeText={setSuccessorName} placeholder="Quem assume a fazenda" />
              <TextField
                label="Parentesco/relação"
                value={successorRelationship}
                onChangeText={setSuccessorRelationship}
                placeholder="Ex.: Filho, sócio, gerente de confiança"
              />
              <TextField
                label="Telefone"
                value={successorPhone}
                onChangeText={setSuccessorPhone}
                placeholder="Opcional"
                keyboardType="phone-pad"
              />
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Contato de emergência</Text>
              <TextField label="Nome" value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="Quem acionar numa emergência" />
              <TextField
                label="Telefone"
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                placeholder="Opcional"
                keyboardType="phone-pad"
              />
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Notas importantes</Text>
              <TextField
                label="O que quem assumir precisa saber"
                value={vaultNotes}
                onChangeText={setVaultNotes}
                placeholder="Ex.: onde estão os documentos, contatos de fornecedores/banco, contas e dívidas em aberto, senha do sistema de irrigação..."
                multiline
                numberOfLines={6}
                style={styles.notesInput}
              />
            </Card>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button label="Salvar cofre" onPress={handleSave} loading={isSaving} />
            {hasVaultData ? <Button label="Cancelar" variant="ghost" onPress={() => setIsEditing(false)} /> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="🔒 Cofre da fazenda" subtitle="Sucessor, contato de emergência e notas importantes" />
      <ScrollView contentContainerStyle={styles.content}>
        {farm.successor_name ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Sucessor designado</Text>
            <Text style={styles.fieldValue}>{farm.successor_name}</Text>
            {farm.successor_relationship ? <Text style={styles.fieldHint}>{farm.successor_relationship}</Text> : null}
            {farm.successor_phone ? <Text style={styles.fieldHint}>📞 {farm.successor_phone}</Text> : null}
          </Card>
        ) : null}

        {farm.emergency_contact_name ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Contato de emergência</Text>
            <Text style={styles.fieldValue}>{farm.emergency_contact_name}</Text>
            {farm.emergency_contact_phone ? <Text style={styles.fieldHint}>📞 {farm.emergency_contact_phone}</Text> : null}
          </Card>
        ) : null}

        {farm.vault_notes ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Notas importantes</Text>
            <Text style={styles.notesText}>{farm.vault_notes}</Text>
          </Card>
        ) : null}

        {farm.vault_updated_at ? <Text style={styles.updatedAt}>Atualizado em {formatDateTime(farm.vault_updated_at)}</Text> : null}

        <Button label="Editar cofre" variant="secondary" onPress={startEditing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    loading: {
      marginTop: spacing.xxl,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    introText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    card: {
      gap: spacing.md,
      borderRadius: radius.md,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    fieldValue: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    fieldHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    notesText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    notesInput: {
      height: 120,
      textAlignVertical: 'top',
      paddingTop: spacing.sm,
    },
    updatedAt: {
      ...typography.caption,
      color: colors.textMuted,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
