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
import { useT } from '../../../../src/i18n';
import type { EmployeeCostType, EmployeeSector } from '../../../../src/types/database';
import { colors, spacing, typography } from '../../../../src/theme';

const COST_TYPE_OPTIONS = Object.entries(EMPLOYEE_COST_TYPE_LABELS).map(([value, label]) => ({
  value: value as EmployeeCostType,
  label,
}));

export default function NewEmployeeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { createEmployee } = useEmployees(farmId);
  const t = useT();

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
      setError(t('newEmployee.validationError'));
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
      <ScreenHeader title={t('newEmployee.title')} subtitle={t('newEmployee.subtitle')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Section title={t('newEmployee.sectionIdentification')}>
            <TextField label={t('newEmployee.fullName')} value={fullName} onChangeText={setFullName} placeholder={t('newEmployee.fullNamePlaceholder')} />
            <TextField label={t('newEmployee.cpf')} value={cpf} onChangeText={setCpf} placeholder={t('newEmployee.optional')} keyboardType="numbers-and-punctuation" />
            <TextField label={t('newEmployee.phone')} value={phone} onChangeText={setPhone} placeholder={t('newEmployee.optional')} keyboardType="phone-pad" />
            <TextField label={t('newEmployee.birthDate')} value={birthDate} onChangeText={setBirthDate} placeholder={t('newEmployee.birthDatePlaceholder')} keyboardType="numbers-and-punctuation" />
            <TextField label={t('newEmployee.address')} value={address} onChangeText={setAddress} placeholder={t('newEmployee.optional')} />
          </Section>

          <Section title={t('newEmployee.sectionWork')}>
            <ChipSelect
              label={t('newEmployee.sector')}
              options={EMPLOYEE_SECTOR_OPTIONS.map((s) => ({ value: s, label: EMPLOYEE_SECTOR_LABELS[s] }))}
              value={sector}
              onChange={setSector}
              accentColor={colors.funcionarios}
            />
            <TextField label={t('newEmployee.role')} value={role} onChangeText={setRole} placeholder={t('newEmployee.rolePlaceholder')} />
            <ChipSelect
              label={t('newEmployee.costType')}
              options={COST_TYPE_OPTIONS}
              value={costType}
              onChange={setCostType}
              accentColor={colors.funcionarios}
            />
            <TextField
              label={
                costType === 'diarista'
                  ? t('newEmployee.costValueDaily')
                  : costType === 'tarefa'
                  ? t('newEmployee.costValueTask')
                  : t('newEmployee.costValueMonthly')
              }
              value={costValue}
              onChangeText={setCostValue}
              placeholder="R$"
              keyboardType="decimal-pad"
            />
          </Section>

          <Section title={t('newEmployee.sectionEmergency')}>
            <TextField label={t('newEmployee.emergencyName')} value={emergencyName} onChangeText={setEmergencyName} placeholder={t('newEmployee.optional')} />
            <TextField label={t('newEmployee.emergencyPhone')} value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder={t('newEmployee.optional')} keyboardType="phone-pad" />
          </Section>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={t('newEmployee.save')}
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
