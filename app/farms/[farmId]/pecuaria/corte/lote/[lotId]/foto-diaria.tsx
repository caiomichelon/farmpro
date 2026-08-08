import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../../../../../src/components/Button';
import { Card } from '../../../../../../../src/components/Card';
import { EmptyState } from '../../../../../../../src/components/EmptyState';
import { PhotoPicker } from '../../../../../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../../../../../src/components/ScreenHeader';
import { useCattleLot } from '../../../../../../../src/hooks/useCattleLots';
import { useCattleLotPhotos } from '../../../../../../../src/hooks/useCattleLotPhotos';
import { radius, spacing, typography, useColors, type Colors } from '../../../../../../../src/theme';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function DailyPhotoScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const { lot } = useCattleLot(lotId);
  const { photos, isLoading, addPhoto } = useCattleLotPhotos(lotId);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!photoUrl) return;
    setIsSaving(true);
    setError(null);
    const { error: saveError } = await addPhoto(photoUrl);
    setIsSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setPhotoUrl(null);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Foto diária" subtitle={lot ? `Lote ${lot.name} — acompanhe a evolução visual` : 'Acompanhe a evolução visual'} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <PhotoPicker label="Foto de hoje" photoUrl={photoUrl} onChange={setPhotoUrl} folder="cattle-lot-photos" accentColor={colors.pecuaria} />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button label="Salvar foto do dia" onPress={handleSave} loading={isSaving} disabled={!photoUrl} />
        </Card>

        <Text style={styles.sectionTitle}>Linha do tempo ({photos.length})</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.pecuaria} />
        ) : photos.length === 0 ? (
          <EmptyState text="Nenhuma foto registrada ainda. Comece hoje pra ver a evolução com o tempo." />
        ) : (
          <View style={styles.grid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.gridItem}>
                <Image source={{ uri: photo.photo_url }} style={styles.gridImage} />
                <Text style={styles.gridDate}>{formatDate(photo.taken_at)}</Text>
              </View>
            ))}
          </View>
        )}
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
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    card: {
      gap: spacing.sm,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    gridItem: {
      width: '31%',
      gap: 2,
    },
    gridImage: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceAlt,
    },
    gridDate: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
