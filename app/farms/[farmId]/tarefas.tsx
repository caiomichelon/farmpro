import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { EmptyState } from '../../../src/components/EmptyState';
import { TextField } from '../../../src/components/TextField';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useEmployeeTasks, type EmployeeTaskSummary } from '../../../src/hooks/useEmployeeTasks';
import { useEmployees } from '../../../src/hooks/useEmployees';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

const GENERAL_OPTION = '__geral__';

function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function isOverdue(task: EmployeeTaskSummary): boolean {
  if (task.done_at) return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

export default function EmployeeTasksScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { tasks, isLoading, createTask, toggleDone, deleteTask } = useEmployeeTasks(farmId);
  const { employees } = useEmployees(farmId);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string>(GENERAL_OPTION);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employeeOptions = [
    { value: GENERAL_OPTION, label: 'Geral (sem responsável)' },
    ...employees.map((e) => ({ value: e.id, label: e.full_name })),
  ];

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    const { error: createError } = await createTask({
      title,
      employee_id: assignee === GENERAL_OPTION ? undefined : assignee,
    });
    setIsSaving(false);
    if (createError) {
      setError(createError);
      return;
    }
    setTitle('');
    setAssignee(GENERAL_OPTION);
    setIsAdding(false);
  }

  const pending = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => t.done_at);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="✅ Tarefas do dia"
        subtitle={`${pending.length} ${pending.length === 1 ? 'pendente' : 'pendentes'} · ${done.length} concluída(s)`}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {isAdding ? (
          <Card style={styles.card}>
            <TextField label="O que precisa ser feito?" value={title} onChangeText={setTitle} placeholder="Ex.: Consertar cerca do pasto 3" />
            <ChipSelect label="Responsável" options={employeeOptions} value={assignee} onChange={setAssignee} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.formButtons}>
              <Button label="Cancelar" variant="ghost" onPress={() => setIsAdding(false)} style={{ flex: 1 }} />
              <Button label="Criar tarefa" onPress={handleSave} loading={isSaving} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : (
          <Button label="+ Nova tarefa" onPress={() => setIsAdding(true)} />
        )}

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : tasks.length === 0 ? (
          <EmptyState text="Nenhuma tarefa lançada ainda." />
        ) : (
          <>
            {pending.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pendentes</Text>
                {pending.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} colors={colors} styles={styles} />
                ))}
              </View>
            ) : null}
            {done.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Concluídas</Text>
                {done.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} colors={colors} styles={styles} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  colors,
  styles,
}: {
  task: EmployeeTaskSummary;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  const done = Boolean(task.done_at);
  const overdue = isOverdue(task);

  return (
    <Card style={styles.taskCard}>
      <Pressable style={styles.checkbox} onPress={() => onToggle(task.id, !done)} hitSlop={8}>
        <View style={[styles.checkboxBox, done && styles.checkboxBoxDone]}>{done ? <Text style={styles.checkboxMark}>✓</Text> : null}</View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>{task.title}</Text>
        <Text style={[styles.taskMeta, overdue && { color: colors.danger }]}>
          {task.employeeName ?? 'Geral'} · {formatDateBR(task.due_date)}
          {overdue ? ' · atrasada' : ''}
        </Text>
      </View>
      <Pressable onPress={() => onDelete(task.id)} hitSlop={8}>
        <Text style={styles.deleteLink}>Excluir</Text>
      </Pressable>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    card: {
      gap: spacing.md,
      borderRadius: radius.md,
    },
    formButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    loading: {
      marginTop: spacing.xl,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    taskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
    },
    checkbox: {
      padding: spacing.xs,
    },
    checkboxBox: {
      width: 24,
      height: 24,
      borderRadius: radius.sm,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxBoxDone: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    checkboxMark: {
      color: colors.textInverse,
      fontWeight: 'bold',
    },
    taskTitle: {
      ...typography.bodyMedium,
      color: colors.textPrimary,
    },
    taskTitleDone: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    taskMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    deleteLink: {
      ...typography.caption,
      color: colors.danger,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
