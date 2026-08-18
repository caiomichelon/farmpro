import { Redirect } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '../src/components/BrandMark';
import { FarmScene } from '../src/components/FarmScene';
import { SectorDotsCluster } from '../src/components/SectorDotsCluster';
import { useAuth } from '../src/context/AuthContext';
import { useT } from '../src/i18n';
import { spacing, typography, useColors, type Colors } from '../src/theme';

const MIN_DISPLAY_MS = 1800;

/**
 * Tela de capa/entrada: selo com anéis pulsando, nome do app entrando
 * com estouro e os três pontos de setor "chegando" por último — a
 * primeira coisa que a pessoa vê, então a sequência é mais elaborada do
 * que uma simples aparição. Fica visível por um instante mínimo (tempo
 * suficiente pra sequência inteira rodar) e depois leva para a seleção
 * de fazenda (se já autenticado) ou para o login.
 */
export default function CoverScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { session, isLoading } = useAuth();
  const titleProgress = useRef(new Animated.Value(0)).current;
  const subtitleProgress = useRef(new Animated.Value(0)).current;
  const dotsProgress = useRef(new Animated.Value(0)).current;
  const [minDisplayElapsed, setMinDisplayElapsed] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(280),
      Animated.spring(titleProgress, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 12 }),
      Animated.timing(subtitleProgress, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(dotsProgress, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();

    const timeout = setTimeout(() => setMinDisplayElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, [titleProgress, subtitleProgress, dotsProgress]);

  if (isLoading || !minDisplayElapsed) {
    return (
      <View style={styles.container}>
        <FarmScene variant="cover" />
        <BrandMark size={76} showRings />
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleProgress,
              transform: [
                { scale: titleProgress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                { translateY: titleProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              ],
            },
          ]}
        >
          FarmPro
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }),
              transform: [{ translateY: subtitleProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            },
          ]}
        >
          {t('cover.subtitle')}
        </Animated.Text>
        <Animated.View
          style={{
            opacity: dotsProgress,
            marginTop: spacing.xl,
            transform: [{ translateY: dotsProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
          }}
        >
          <SectorDotsCluster size={9} />
        </Animated.View>
      </View>
    );
  }

  return <Redirect href={session ? '/setor' : '/auth/login'} />;
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    title: {
      ...typography.displayLg,
      color: colors.textInverse,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    subtitle: {
      ...typography.body,
      color: colors.textInverse,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
}
