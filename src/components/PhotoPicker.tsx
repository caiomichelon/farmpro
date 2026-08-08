import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { pickAndUploadFromCamera, pickAndUploadFromLibrary } from '../lib/photoUpload';
import { colors, radius, spacing, typography } from '../theme';

interface PhotoPickerProps {
  label: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
  /** Pasta de organização no storage (ex.: "employee-documents"). */
  folder: string;
  accentColor?: string;
}

/** Selecionar/tirar foto e anexar — usado em documentos de funcionário
 * (foto do ASO, CNH etc.) e em outros lugares que precisem de anexo visual.
 * Sobe direto pro Supabase Storage, sem passo manual nenhum. */
export function PhotoPicker({ label, photoUrl, onChange, folder, accentColor = colors.primary }: PhotoPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(source: 'library' | 'camera') {
    setError(null);
    setIsUploading(true);
    try {
      const url = source === 'library' ? await pickAndUploadFromLibrary(folder) : await pickAndUploadFromCamera(folder);
      if (url) onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível anexar a foto.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {photoUrl ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: photoUrl }} style={styles.thumbnail} />
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text style={[styles.removeLink, { color: colors.danger }]}>Remover</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionButton, { borderColor: accentColor }]}
            onPress={() => handlePick('library')}
            disabled={isUploading}
          >
            <Text style={[styles.actionText, { color: accentColor }]}>Escolher da galeria</Text>
          </Pressable>
          {Platform.OS !== 'web' ? (
            <Pressable
              style={[styles.actionButton, { borderColor: accentColor }]}
              onPress={() => handlePick('camera')}
              disabled={isUploading}
            >
              <Text style={[styles.actionText, { color: accentColor }]}>Tirar foto</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {isUploading ? <ActivityIndicator color={accentColor} style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionText: {
    ...typography.captionMedium,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  removeLink: {
    ...typography.captionMedium,
  },
  spinner: {
    marginTop: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
