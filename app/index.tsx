import { Redirect } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../src/context/AuthContext';
import { useT } from '../src/i18n';
import { spacing, typography, useColors, type Colors } from '../src/theme';

const MIN_DISPLAY_MS = 900;

/**
 * Tela de capa/entrada: nome do app + logo, antes de entrar nos setores.
 * Fica visível por um instante mínimo e depois leva para a seleção de
 * fazenda (se já autenticado) ou para o login.
 */
export default function CoverScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { session, isLoading } = useAuth();
  const opacity = useRef(new Animated.Value(0)).current;
  const [minDisplayElapsed, setMinDisplayElapsed] = useState(false);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(() => setMinDisplayElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, [opacity]);

  if (isLoading || !minDisplayElapsed) {
    return (
      <View style={styles.container}>
        <Animated.View style={{ opacity, alignItems: 'center' }}>
          <Text style={styles.logoMark}>FP</Text>
          <Text style={styles.title}>FarmPro</Text>
          <Text style={styles.subtitle}>{t('cover.subtitle')}</Text>
        </Animated.View>
      </View>
    );
  }

  return <Redirect href={session ? '/farms' : '/auth/login'} />;
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoMark: {
      ...typography.displayLg,
      color: colors.textInverse,
      textAlign: 'center',
      opacity: 0.9,
    },
    title: {
      ...typography.displayMd,
      color: colors.textInverse,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textInverse,
      opacity: 0.75,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
}
