import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { PhotoPicker } from '../../../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import {
  CATTLE_FIELD_COLLECTION_CATEGORY_OPTIONS,
  CATTLE_FIELD_COLLECTION_STATUS_OPTIONS,
} from '../../../../../../../src/data/cattleOptions';
import { useCattleFieldCollections } from '../../../../../../../src/hooks/useCattleFieldCollections';
import type { CattleFieldCollectionCategory, CattleFieldCollectionStatus } from '../../../../../../../src/types/database';
import { spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

export default function NewFieldCollectionScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { createCollection } = useCattleFieldCollections(lotId);

  const [category, setCategory] = useState<CattleFieldCollectionCategory>('rebanho');
  const [status, setStatus] = useState<CattleFieldCollectionStatus>('dentro_padrao');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [headCount, setHeadCount] = useState('');
  const [levelPct, setLevelPct] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    // Localização é a evidência de que quem preencheu passou de verdade no
    // pasto/curral do lote — mesma ideia do ponto digital. Se o usuário
    // negar a permissão, a coleta ainda é salva (só sem GPS), pra não
    // travar o registro por causa disso.
    let latitude: number | undefined;
    let longitude: number | undefined;
    let locationAccuracy: number | undefined;
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus === 'granted') {
        const position = await Location.getCurrentPositionAsync({});
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationAccuracy = position.coords.accuracy ?? undefined;
      }
    } catch {
      // Sem localização disponível agora — segue sem ela.
    }

    const { error: createError, queued } = await createCollection({
      category,
      status,
      notes: notes.trim() || undefined,
      photo_url: photoUrl ?? undefined,
      latitude,
      longitude,
      location_accuracy_m: locationAccuracy,
      head_count: category === 'rebanho' && headCount.trim() ? Number(headCount) : undefined,
      level_pct: category === 'aguada' && levelPct.trim() ? Number(levelPct) : undefined,
    });
    setIsSubmitting(false);
    if (createError) {
      setError(createError);
      return;
    }
    if (queued) {
      Alert.alert('Sem sinal', 'Coleta guardada no aparelho — vai sincronizar sozinha quando a conexão voltar.');
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Nova coleta de campo" subtitle="Checagem rápida do pasto/curral do lote" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ChipSelect
            label="Categoria"
            options={CATTLE_FIELD_COLLECTION_CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
            accentColor={colors.pecuaria}
          />
          <ChipSelect
            label="Situação"
            options={CATTLE_FIELD_COLLECTION_STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            accentColor={colors.pecuaria}
          />
          {category === 'rebanho' ? (
            <TextField
              label="Quantas cabeças você contou?"
              value={headCount}
              onChangeText={setHeadCount}
              placeholder="Opcional — ajuda a pegar sumiço de gado"
              keyboardType="numeric"
            />
          ) : null}
          {category === 'aguada' ? (
            <TextField
              label="Nível do cocho/aguada (%)"
              value={levelPct}
              onChangeText={setLevelPct}
              placeholder="Opcional — ex.: 30"
              keyboardType="numeric"
            />
          ) : null}
          <TextField label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" />
          <PhotoPicker label="Foto (opcional)" photoUrl={photoUrl} onChange={setPhotoUrl} farmId={farmId} folder="cattle-field-collections" accentColor={colors.pecuaria} />
          <Text style={styles.locationNote}>Sua localização atual é anexada automaticamente como evidência da visita.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Salvar coleta" onPress={handleSubmit} loading={isSubmitting} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    form: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    locationNote: {
      ...typography.caption,
      color: colors.textMuted,
    },
    error: {
      color: colors.danger,
    },
  });
}
