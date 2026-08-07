import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { useAuth } from '../../src/context/AuthContext';
import { useFarms, type FarmSummary } from '../../src/hooks/useFarms';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function FarmSelectionScreen() {
  const { farms, isLoading, error, createFarm } = useFarms();
  const { signOut } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FarmPro</Text>
          <Text style={styles.title}>Suas fazendas</Text>
        </View>
        <Pressable onPress={signOut} hitSlop={12}>
          <Text style={styles.signOut}>Sair</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isCreating ? (
              <Text style={styles.emptyText}>Você ainda não cadastrou nenhuma fazenda.</Text>
            ) : null
          }
          renderItem={({ item }) => <FarmCard farm={item} onPress={() => router.push(`/farms/${item.id}`)} />}
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        {isCreating ? (
          <NewFarmForm
            onCancel={() => setIsCreating(false)}
            onCreate={async (values) => {
              const { error: createError } = await createFarm(values);
              if (!createError) setIsCreating(false);
              return createError;
            }}
          />
        ) : (
          <Button label="+ Nova fazenda" variant="secondary" onPress={() => setIsCreating(true)} />
        )}
      </View>
    </SafeAreaView>
  );
}

function FarmCard({ farm, onPress }: { farm: FarmSummary; onPress: () => void }) {
  const location = [farm.city, farm.state].filter(Boolean).join(' / ');
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <Text style={styles.cardTitle}>{farm.name}</Text>
      {location ? <Text style={styles.cardLocation}>{location}</Text> : null}
      <View style={styles.cardStatsRow}>
        <Text style={styles.cardStat}>{farm.totalHectares.toLocaleString('pt-BR')} ha</Text>
        <Text style={styles.cardStatDivider}>·</Text>
        <Text style={styles.cardStat}>
          {farm.totalPlots} {farm.totalPlots === 1 ? 'talhão' : 'talhões'}
        </Text>
      </View>
    </Pressable>
  );
}

function NewFarmForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: { name: string; city?: string; state?: string }) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    const createError = await onCreate({ name: name.trim(), city: city.trim(), state: state.trim() });
    setIsSubmitting(false);
    if (createError) setError(createError);
  }

  return (
    <View style={styles.form}>
      <TextField label="Nome da fazenda" value={name} onChangeText={setName} placeholder="Ex.: Fazenda Boa Vista" />
      <View style={styles.formRow}>
        <View style={{ flex: 2 }}>
          <TextField label="Cidade" value={city} onChangeText={setCity} placeholder="Opcional" />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="UF" value={state} onChangeText={setState} placeholder="Opcional" maxLength={2} autoCapitalize="characters" />
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.formActions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} disabled={!name} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.label,
    color: colors.textMuted,
  },
  title: {
    ...typography.displayMd,
    color: colors.textPrimary,
  },
  signOut: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  cardLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cardStat: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  cardStatDivider: {
    color: colors.textMuted,
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
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
