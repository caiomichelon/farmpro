import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportWizard } from '../../../../src/components/ImportWizard';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { EMPLOYEE_COST_TYPE_LABELS, EMPLOYEE_SECTOR_LABELS } from '../../../../src/data/employeeOptions';
import { normalize, type ImportField } from '../../../../src/lib/spreadsheetImport';
import { useColors } from '../../../../src/theme';

const FIELDS: ImportField[] = [
  { key: 'full_name', label: 'Nome completo', required: true, kind: 'text', aliases: ['nome', 'funcionario'] },
  {
    key: 'sector',
    label: 'Setor',
    required: true,
    kind: 'enum',
    aliases: ['setor'],
    enumOptions: Object.entries(EMPLOYEE_SECTOR_LABELS).map(([value, label]) => ({ value, label })),
  },
  { key: 'role', label: 'Função', required: true, kind: 'text', aliases: ['cargo', 'funcao'] },
  {
    key: 'cost_type',
    label: 'Tipo de custo',
    required: true,
    kind: 'enum',
    aliases: ['tipo de pagamento'],
    enumOptions: Object.entries(EMPLOYEE_COST_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  { key: 'cost_value', label: 'Valor do custo', required: true, kind: 'number', aliases: ['salario', 'valor'] },
  { key: 'cpf', label: 'CPF', kind: 'text' },
  { key: 'phone', label: 'Telefone', kind: 'text', aliases: ['celular', 'contato'] },
  { key: 'admission_date', label: 'Data de admissão', kind: 'date', aliases: ['admissao'] },
  { key: 'birth_date', label: 'Data de nascimento', kind: 'date', aliases: ['nascimento'] },
  { key: 'address', label: 'Endereço', kind: 'text', aliases: ['endereco'] },
  { key: 'emergency_contact_name', label: 'Contato de emergência (nome)', kind: 'text' },
  { key: 'emergency_contact_phone', label: 'Contato de emergência (telefone)', kind: 'text' },
  { key: 'notes', label: 'Observações', kind: 'text', aliases: ['obs'] },
];

/** Assinatura pra reconhecer que duas linhas são "o mesmo funcionário".
 * CPF é o identificador mais confiável (único de verdade), então tem
 * prioridade quando preenchido — compara só os dígitos, pra "123.456.789-00"
 * bater com "12345678900". Sem CPF (comum em planilha de diarista/informal),
 * cai pra nome completo + data de admissão: dois funcionários diferentes
 * raramente têm nome E data de admissão idênticos. Se faltar CPF e data de
 * admissão também, não dá pra montar uma assinatura confiável — a linha
 * simplesmente não é checada contra duplicata nesse caso. */
function employeeDedupeKey(row: Record<string, unknown>): string | null {
  const cpfDigits = String(row.cpf ?? '').replace(/\D/g, '');
  if (cpfDigits) return `cpf:${cpfDigits}`;
  const name = normalize(String(row.full_name ?? ''));
  const admission = String(row.admission_date ?? '').trim();
  if (name && admission) return `name:${name}|${admission}`;
  return null;
}

export default function ImportEmployeesScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title="Importar funcionários" subtitle="De uma planilha Excel ou CSV" />
      <ImportWizard
        table="employees"
        fields={FIELDS}
        dedupeKey={employeeDedupeKey}
        accentColor={colors.funcionarios}
        fixedValues={{ farm_id: farmId }}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}
