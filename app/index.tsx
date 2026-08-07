import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../src/context/AuthContext';
import { colors, spacing, typography } from '../src/theme';

const MIN_DISPLAY_MS = 900;

/**
 * Tela de capa/entrada: nome do app + logo, antes de entrar nos setores.
 * Fica visível por um instante mínimo e depois leva para a seleção de
 * fazenda (se já autenticado) ou para o login.
 */
export default function CoverScreen() {
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
          <Text style={styles.subtitle}>Gestão técnica de lavoura e pecuária</Text>
        </Animated.View>
      </View>
    );
  }

  return <Redirect href={session ? '/farms' : '/auth/login'} />;
}

const styles = StyleSheet.create({
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
