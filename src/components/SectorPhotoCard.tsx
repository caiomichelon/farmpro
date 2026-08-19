import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { radius, spacing, typography, useColors, type Colors } from '../theme';

interface SectorPhotoCardProps {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  credit: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

/** Cartão grande com foto, usado só na tela /setor (não é o SectorButton
 * genérico — aquele continua com fundo de cor sólida e é usado em telas
 * menores, tipo a home da fazenda). A foto vem de um arquivo local
 * (src/assets/images/sector), pra funcionar offline.
 *
 * resizeMode="contain" (não "cover") de propósito: com "cover" a foto
 * era cortada/ampliada pra preencher o cartão inteiro, tipo um zoom que
 * cortava o rosto do gado ou o broto da soja dependendo do formato da
 * tela. Com "contain" a foto inteira sempre aparece, sem cortar nada —
 * o espaço sobrando ao redor dela fica com a cor clara do setor, como
 * uma moldura. O título/subtítulo saem de cima da foto e vão pra uma
 * faixa sólida embaixo (mais legível que texto sobre foto). */
export function SectorPhotoCard({
  title,
  subtitle,
  image,
  credit,
  color,
  backgroundColor,
  onPress,
}: SectorPhotoCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={[styles.photoArea, { backgroundColor }]}>
        <Image source={image} style={styles.photo} resizeMode="contain" />
        <Text style={styles.credit}>{credit}</Text>
      </View>
      <View style={[styles.footer, { backgroundColor: color }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    pressed: {
      opacity: 0.9,
    },
    photoArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    credit: {
      position: 'absolute',
      bottom: spacing.xs,
      right: spacing.sm,
      fontSize: 9,
      color: colors.textSecondary,
      opacity: 0.65,
    },
    footer: {
      padding: spacing.lg,
    },
    title: {
      ...typography.heading,
      color: colors.textInverse,
      marginBottom: spacing.xs / 2,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textInverse,
      opacity: 0.92,
    },
  });
}
