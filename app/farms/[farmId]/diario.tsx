import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { EmptyState } from '../../../src/components/EmptyState';
import { PhotoPicker } from '../../../src/components/PhotoPicker';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { TextField } from '../../../src/components/TextField';
import { useFarmNotes } from '../../../src/hooks/useFarmNotes';
import type { FarmNote } from '../../../src/types/database';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function FarmDiaryScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { notes, isLoading, createNote, deleteNote } = useFarmNotes(farmId);

  const [noteText, setNoteText] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    // Localização é anexada em segundo plano, sem travar o registro se
    // negar a permissão — mesma ideia do ponto digital.
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

    const { error: createError } = await createNote({
      note_text: noteText,
      photo_url: photoUrl ?? undefined,
      latitude,
      longitude,
    });
    setIsSaving(false);
    if (createError) {
      setError(createError);
      return;
    }
    setNoteText('');
    setPhotoUrl(null);
  }

  function handleDelete(note: FarmNote) {
    deleteNote(note.id);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="📓 Diário de bordo" subtitle="Anote qualquer coisa rapidinho, sem precisar escolher lote ou talhão" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.formCard}>
            <TextField
              label="O que você quer registrar?"
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Ex.: Cerca do pasto 3 precisa de reparo"
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />
            <PhotoPicker label="Foto (opcional)" photoUrl={photoUrl} onChange={setPhotoUrl} folder="farm-notes" />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button label="Salvar nota" onPress={handleSave} loading={isSaving} />
          </Card>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : notes.length === 0 ? (
            <EmptyState text="Nenhuma anotação ainda. A primeira nota vira o começo do diário." />
          ) : (
            notes.map((note) => (
              <Card key={note.id} style={styles.noteCard}>
                <View style={styles.noteHeaderRow}>
                  <Text style={styles.noteDate}>{formatDateTime(note.created_at)}</Text>
                  <Text style={styles.deleteLink} onPress={() => handleDelete(note)}>
                    Excluir
                  </Text>
                </View>
                {note.note_text ? <Text style={styles.noteText}>{note.note_text}</Text> : null}
                {note.photo_url ? <Image source={{ uri: note.photo_url }} style={styles.notePhoto} /> : null}
                {note.latitude != null && note.longitude != null ? (
                  <Text style={styles.noteLocation}>
                    📍 {note.latitude.toFixed(5)}, {note.longitude.toFixed(5)}
                  </Text>
                ) : null}
              </Card>
            ))
          )}
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
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    formCard: {
      gap: spacing.md,
      borderRadius: radius.md,
    },
    notesInput: {
      height: 90,
      textAlignVertical: 'top',
      paddingTop: spacing.sm,
    },
    loading: {
      marginTop: spacing.xl,
    },
    noteCard: {
      gap: spacing.xs,
      borderRadius: radius.md,
    },
    noteHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    noteDate: {
      ...typography.caption,
      color: colors.textMuted,
    },
    deleteLink: {
      ...typography.captionMedium,
      color: colors.danger,
    },
    noteText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    notePhoto: {
      width: '100%',
      height: 180,
      borderRadius: radius.sm,
    },
    noteLocation: {
      ...typography.caption,
      color: colors.textMuted,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
