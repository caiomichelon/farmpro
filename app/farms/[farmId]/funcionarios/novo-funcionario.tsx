import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../src/components/Button';
import { ChipSelect } from '../../../../src/components/ChipSelect';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TextField } from '../../../../src/components/TextField';
import {
  EMPLOYEE_COST_TYPE_LABELS,
  EMPLOYEE_SECTOR_LABELS,
  EMPLOYEE_SECTOR_OPTIONS,
} from '../../../../src/data/employeeOptions';
import { useEmployees } from '../../../../src/hooks/useEmployees';
import type { EmployeeCostType, EmployeeSector } from '../../../../src/types/database';
import { colors, spacing, typography } from '../../../../src/theme';

const COST_TYPE_OPTIONS = Object.entries(EMPLOYEE_COST_TYPE_LABELS).map(([value, label]) => ({
  value: value as EmployeeCostType,
  label,
}));

export default function NewEmployeeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createEmployee } = useEmployees(farmId);

  const [fullName, setFullName] = useState('');
  const [sector, setSector] = useState<EmployeeSector | null>(null);
  const [role, setRole] = useState('');
  const [costType, setCostType] = useState<EmployeeCostType>('mensalista');
  const [costValue, setCostValue] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const costValueNumber = Number(costValue.replace(',', '.'));
    if (!fullName.trim() || !sector || !role.trim() || !costValueNumber || costValueNumber < 0) {
      setError('Preencha nome, setor, função e o custo associado.');
      return;
    }

    setIsSubmitting(true);
    const { error: createError } = await createEmployee({
      full_name: fullName.trim(),
      sector,
      role: role.trim(),
      cost_type: costType,
      cost_value: costValueNumber,
      cpf: cpf.trim() || undefined,
      phone: phone.trim() || undefined,
      birth_date: parseDate(birthDate) ?? undefined,
      address: address.trim() || undefined,
      emergency_contact_name: emergencyName.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
    });
    setIsSubmitting(false);

    if (createError) {
      setError(createError);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Novo funcionário" subtitle="Ficha completa" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Section title="Identificação">
            <TextField label="Nome completo" value={fullName} onChangeText={setFullName} placeholder="Ex.: José da Silva" />
            <TextField label="CPF" value={cpf} onChangeText={setCpf} placeholder="Opcional" keyboardType="numbers-and-punctuation" />
            <TextField label="Telefone" value={phone} onChangeText={setPhone} placeholder="Opcional" keyboardType="phone-pad" />
            <TextField label="Data de nascimento" value={birthDate} onChangeText={setBirthDate} placeholder="DD/MM/AAAA (opcional)" keyboardType="numbers-and-punctuation" />
            <TextField label="Endereço" value={address} onChangeText={setAddress} placeholder="Opcional" />
          </Section>

          <Section title="Trabalho">
            <ChipSelect
              label="Setor"
              options={EMPLOYEE_SECTOR_OPTIONS.map((s) => ({ value: s, label: EMPLOYEE_SECTOR_LABELS[s] }))}
              value={sector}
              onChange={setSector}
              accentColor={colors.funcionarios}
            />
            <TextField label="Função" value={role} onChangeText={setRole} placeholder="Ex.: Tratorista, Vaqueiro, Auxiliar administrativo" />
            <ChipSelect
              label="Tipo de custo"
              options={COST_TYPE_OPTIONS}
              value={costType}
              onChange={setCostType}
              accentColor={colors.funcionarios}
            />
            <TextField
              label={costType === 'diarista' ? 'Valor da diária' : costType === 'tarefa' ? 'Valor por tarefa' : 'Salário mensal'}
              value={costValue}
              onChangeText={setCostValue}
              placeholder="R$"
              keyboardType="decimal-pad"
            />
          </Section>

          <Section title="Contato de emergência">
            <TextField label="Nome" value={emergencyName} onChangeText={setEmergencyName} placeholder="Opcional" />
            <TextField label="Telefone" value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="Opcional" keyboardType="phone-pad" />
          </Section>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Salvar funcionário"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!fullName || !sector || !role || !costValue}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function parseDate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  form: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  section: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  sectionBody: {
    gap: spacing.lg,
  },
  error: {
    color: colors.danger,
  },
});
