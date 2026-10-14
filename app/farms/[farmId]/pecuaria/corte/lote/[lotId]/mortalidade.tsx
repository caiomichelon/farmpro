import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { ChipSelect } from '../../../../../../../src/components/ChipSelect';
import { FadeSlideIn } from '../../../../../../../src/components/FadeSlideIn';
import { PhotoPicker } from '../../../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { TextField } from '../../../../../../../src/components/TextField';
import { MORTALITY_CATEGORY_SUGGESTIONS, MORTALITY_CAUSE_SUGGESTIONS } from '../../../../../../../src/data/cattleOptions';
import { useCattleAnimals } from '../../../../../../../src/hooks/useCattleAnimals';
import { useCattleMortalityEvents } from '../../../../../../../src/hooks/useCattleMortality';
import { useProfile } from '../../../../../../../src/hooks/useProfile';
import { useT } from '../../../../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

export default function MortalityScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId, lotId } = useLocalSearchParams<{ farmId: string; lotId: string }>();
  const { createEvent } = useCattleMortalityEvents(lotId);
  const { animals } = useCattleAnimals(lotId);
  const { profile } = useProfile();
  const t = useT();

  const activeAnimals = animals.filter((a) => a.status === 'ativo');

  const [animalId, setAnimalId] = useState<string | null>(null);
  const [headCount, setHeadCount] = useState('');
  const [cause, setCause] = useState('');
  const [category, setCategory] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photographer, setPhotographer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setPhotographer(profile.full_name);
  }, [profile?.full_name]);

  function handlePickAnimal(value: string) {
    // Um animal rastreado específico é sempre exatamente 1 cabeça — trava o
    // campo pra não dar pra digitar outro número por engano.
    setAnimalId(value);
    setHeadCount('1');
  }

  async function handleSubmit() {
    const value = Number(headCount);
    if (!value || value <= 0) {
      setError(t('mortality.validationError'));
      return;
    }
    if (!photoUrl) {
      setError(t('mortality.photoRequiredError'));
      return;
    }
    setError(null);
    setIsSubmitting(true);

    // Localização é a evidência de que quem registrou passou de verdade no
    // pasto/curral — mesma ideia do ponto digital e das coletas de campo.
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({});
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
    } catch {
      // Sem localização disponível agora — segue sem ela.
    }

    const { error: createError, queued } = await createEvent({
      head_count: value,
      cause: cause.trim() || undefined,
      animal_id: animalId ?? undefined,
      category: category.trim() || undefined,
      photo_url: photoUrl,
      photographer: photographer.trim() || undefined,
      latitude,
      longitude,
    });
    setIsSubmitting(false);
    if (createError) {
      setError(createError);
      return;
    }
    if (queued) {
      Alert.alert(t('mortality.offlineTitle'), t('mortality.offlineMessage'));
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title={t('mortality.title')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={40}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('mortality.sectionTitle')}</Text>
              {activeAnimals.length > 0 ? (
                <ChipSelect
                  label={t('mortality.animalLabel')}
                  options={activeAnimals.map((a) => ({ value: a.id, label: a.tag_number }))}
                  value={animalId}
                  onChange={handlePickAnimal}
                  accentColor={colors.danger}
                />
              ) : null}
              <TextField
                label={t('mortality.headCount')}
                value={headCount}
                onChangeText={(value) => {
                  setAnimalId(null);
                  setHeadCount(value);
                }}
                placeholder="Ex.: 2"
                keyboardType="number-pad"
                editable={!animalId}
              />
              <ChipSelect
                label={t('mortality.categorySuggestionsLabel')}
                options={MORTALITY_CATEGORY_SUGGESTIONS.map((c) => ({ value: c, label: c }))}
                value={category}
                onChange={setCategory}
                accentColor={colors.danger}
              />
              <TextField label={t('mortality.category')} value={category} onChangeText={setCategory} placeholder={t('mortality.optional')} />
              <ChipSelect
                label={t('mortality.causeSuggestionsLabel')}
                options={MORTALITY_CAUSE_SUGGESTIONS.map((c) => ({ value: c, label: c }))}
                value={cause}
                onChange={setCause}
                accentColor={colors.danger}
              />
              <TextField label={t('mortality.cause')} value={cause} onChangeText={setCause} placeholder={t('mortality.optional')} />
            </Card>
          </FadeSlideIn>

          <FadeSlideIn delay={80}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('mortality.evidenceSectionTitle')}</Text>
              <PhotoPicker label={t('mortality.photoLabel')} photoUrl={photoUrl} onChange={setPhotoUrl} farmId={farmId} folder="cattle-mortality" accentColor={colors.danger} />
              <TextField
                label={t('mortality.photographerLabel')}
                value={photographer}
                onChangeText={setPhotographer}
                placeholder={t('mortality.photographerPlaceholder')}
              />
              <Text style={styles.locationNote}>{t('mortality.locationNote')}</Text>
            </Card>
          </FadeSlideIn>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('mortality.save')} onPress={handleSubmit} loading={isSubmitting} disabled={!headCount} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
    card: {
      gap: spacing.md,
      backgroundColor: colors.dangerLight,
      borderRadius: radius.md,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    locationNote: {
      ...typography.caption,
      color: colors.textMuted,
    },
    error: { color: colors.danger },
  });
}
