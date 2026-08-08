import { useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, typography, useColors, type Colors } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const variantStyles = useMemo(() => createVariantStyles(colors), [colors]);
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value: number) {
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => !isDisabled && animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        disabled={isDisabled}
        style={[styles.base, variantStyles[variant], isDisabled && styles.disabled, style]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.textInverse : colors.primary} />
        ) : (
          <Text style={[styles.label, variant === 'primary' ? styles.labelInverse : styles.labelDefault]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    base: {
      height: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      ...typography.bodyMedium,
    },
    labelInverse: {
      color: colors.textInverse,
    },
    labelDefault: {
      color: colors.primary,
    },
  });
}

function createVariantStyles(colors: Colors): Record<Variant, StyleProp<ViewStyle>> {
  return {
    primary: { backgroundColor: colors.primary },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    ghost: { backgroundColor: 'transparent' },
  };
}
