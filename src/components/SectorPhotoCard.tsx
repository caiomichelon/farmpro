import { useMemo } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { radius, spacing, typography, useColors, type Colors } from '../theme';

interface SectorPhotoCardProps {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  credit: string;
  onPress: () => void;
}

/** Cartão grande com foto de fundo, usado só na tela /setor (não é o
 * SectorButton genérico — aquele continua com fundo de cor sólida e é
 * usado em telas menores, tipo a home da fazenda). A foto vem de um
 * arquivo local (src/assets/images/sector), pra funcionar offline, com
 * overlay escuro em gradiente (via camadas semi-transparentes) pra
 * garantir contraste do texto em cima de qualquer foto. O crédito da
 * foto (obrigatório pela licença Creative Commons) fica discreto no
 * canto inferior. */
export function SectorPhotoCard({ title, subtitle, image, credit, onPress }: SectorPhotoCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <ImageBackground source={image} style={styles.image} imageStyle={styles.imageRounded}>
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.credit}>{credit}</Text>
      </ImageBackground>
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
    image: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    imageRounded: {
      // Sem width/height 100% explícitos aqui, o RN Web renderiza a
      // imagem local (require()) no tamanho intrínseco do arquivo (ex.:
      // 1280x850) em vez de preencher o cartão — cortando um zoom
      // enorme e aleatório em vez de um "cover" centralizado de verdade.
      width: '100%',
      height: '100%',
      borderRadius: radius.lg,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(20, 18, 12, 0.36)',
    },
    content: {
      padding: spacing.lg,
    },
    title: {
      ...typography.heading,
      color: colors.textInverse,
      textShadowColor: 'rgba(0, 0, 0, 0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
      marginBottom: spacing.xs / 2,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textInverse,
      opacity: 0.92,
      textShadowColor: 'rgba(0, 0, 0, 0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    credit: {
      position: 'absolute',
      bottom: spacing.xs,
      right: spacing.sm,
      fontSize: 9,
      color: colors.textInverse,
      opacity: 0.55,
    },
  });
}
