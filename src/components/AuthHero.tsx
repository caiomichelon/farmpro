import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { spacing, typography, useColors, type Colors } from '../theme';
import { BrandMark } from './BrandMark';
import { FarmScene } from './FarmScene';
import { SectorDotsCluster } from './SectorDotsCluster';

interface AuthHeroProps {
  title: string;
  tagline: string;
}

/** Cabeçalho animado do login/signup — selo + título entrando com
 * estouro, linha de destaque "desenhando" embaixo do título, tagline
 * escalonada e o trio de pontos dos setores fechando a sequência.
 * Compartilhado pelas duas telas pra manter a mesma primeira impressão. */
export function AuthHero({ title, tagline }: AuthHeroProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const titleProgress = useRef(new Animated.Value(0)).current;
  const underline = useRef(new Animated.Value(0)).current;
  const taglineProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.spring(titleProgress, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
      // width não é suportado pelo native driver — só essa etapa roda em JS.
      Animated.timing(underline, { toValue: 1, duration: 360, useNativeDriver: false }),
      Animated.timing(taglineProgress, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [titleProgress, underline, taglineProgress]);

  return (
    <View style={styles.hero}>
      <FarmScene variant="hero" />
      <BrandMark size={40} showRings />
      <Animated.Text
        style={[
          styles.heroTitle,
          {
            opacity: titleProgress,
            transform: [
              { scale: titleProgress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              { translateY: titleProgress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            ],
          },
        ]}
      >
        {title}
      </Animated.Text>
      <Animated.View
        style={[
          styles.underline,
          { width: underline.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) },
        ]}
      />
      <Animated.Text
        style={[
          styles.heroTagline,
          {
            opacity: taglineProgress,
            transform: [{ translateY: taglineProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          },
        ]}
      >
        {tagline}
      </Animated.Text>
      <View style={styles.dotsRow}>
        <SectorDotsCluster size={8} />
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    hero: {
      backgroundColor: colors.primary,
      paddingTop: spacing.xxxl + spacing.xl,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.xl,
      gap: spacing.xs,
      alignItems: 'flex-start',
      position: 'relative',
      overflow: 'hidden',
    },
    heroTitle: {
      ...typography.displayLg,
      color: colors.textInverse,
      marginTop: spacing.md,
    },
    underline: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.accent,
      marginLeft: 2,
      marginTop: 2,
    },
    heroTagline: {
      ...typography.body,
      color: colors.textInverse,
      opacity: 0.85,
      marginTop: spacing.sm,
    },
    dotsRow: {
      marginTop: spacing.md,
    },
  });
}
