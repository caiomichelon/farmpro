import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';

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

/** Altura mínima reservada pra faixa de título/subtítulo embaixo da
 * foto — título (26) + subtítulo (18) + respiro entre eles (2) +
 * padding em cima/embaixo (spacing.lg * 2). Sem essa reserva, em
 * aparelhos com tela mais curta (baixa altura em relação à largura) um
 * quadrado de foto do tamanho da largura toda pode sobrar mais alto do
 * que o cartão inteiro tem de espaço, e o texto acaba espremido a
 * praticamente zero. */
const FOOTER_MIN_HEIGHT = 92;
const MIN_PHOTO_SIZE = 96;

/** Cartão grande com foto, usado só na tela /setor (não é o SectorButton
 * genérico — aquele continua com fundo de cor sólida e é usado em telas
 * menores, tipo a home da fazenda). A foto vem de um arquivo local
 * (src/assets/images/sector), pra funcionar offline.
 *
 * A área da foto é um QUADRADO com resizeMode="cover", mas o tamanho
 * desse quadrado é calculado em JS (via onLayout, medindo o cartão de
 * verdade) em vez de vir só da largura via aspectRatio fixo — isso
 * evita os dois problemas que já tentamos antes:
 *   - "cover" esticado pro tamanho que sobrar no flex: o corte dependia
 *     do formato da tela do aparelho (varia MUITO entre celulares), daí
 *     às vezes cortava o bicho quase inteiro, ficando torto/pela metade.
 *   - "contain": a foto inteira aparecia, mas pequena, com moldura vazia.
 *   - quadrado com aspectRatio fixo baseado só na largura: em tela
 *     baixa (pouca altura), o quadrado (do tamanho da largura) podia
 *     ser mais alto do que o cartão inteiro tinha de espaço, espremendo
 *     o texto de baixo a quase nada.
 * Medindo a altura de verdade do cartão e limitando o quadrado a caber
 * nela (reservando espaço mínimo pro texto), a foto fica sempre no
 * maior tamanho possível sem cortar o assunto de forma estranha nem
 * empurrar o texto pra fora. */
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
  const [cardSize, setCardSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCardSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const photoSize = cardSize
    ? Math.max(MIN_PHOTO_SIZE, Math.min(cardSize.width, cardSize.height - FOOTER_MIN_HEIGHT))
    : null;

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.photoArea,
          { backgroundColor },
          photoSize != null ? { width: photoSize, height: photoSize } : { width: '100%', aspectRatio: 1 },
        ]}
      >
        <Image source={image} style={styles.photo} resizeMode="cover" />
        <View style={styles.creditChip}>
          <Text style={styles.credit}>{credit}</Text>
        </View>
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
      alignSelf: 'center',
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    creditChip: {
      position: 'absolute',
      bottom: spacing.xs,
      right: spacing.xs,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
    },
    credit: {
      fontSize: 9,
      color: colors.textInverse,
    },
    footer: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.lg,
      minHeight: FOOTER_MIN_HEIGHT,
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
