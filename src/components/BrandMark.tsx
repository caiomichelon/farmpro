import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { radius, typography, useColors } from '../theme';

interface BrandMarkProps {
  /** Diâmetro do selo, em px. */
  size?: number;
  /** Anéis tipo "radar" pulsando ao redor do selo — usado na tela de
   * capa (primeiro impacto); desligado no hero do login/signup, que é
   * menor e convive com outros elementos na tela. */
  showRings?: boolean;
}

/** Selo circular "FP" com entrada em estouro (escala + giro) — a marca
 * visual reaproveitada na tela de capa e no hero do login/signup. */
export function BrandMark({ size = 64, showRings = false }: BrandMarkProps) {
  const colors = useColors();
  const entrance = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      useNativeDriver: true,
      speed: 10,
      bounciness: 14,
    }).start();

    if (showRings) {
      const loop = (value: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.timing(value, { toValue: 1, duration: 1800, delay, useNativeDriver: true })
        );
      loop(ring1, 200).start();
      loop(ring2, 1100).start();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = entrance.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '0deg'] });

  return (
    <View style={[styles.wrap, { width: size * 2.2, height: size * 2.2 }]}>
      {showRings ? (
        <>
          <Ring value={ring1} size={size} color={colors.textInverse} />
          <Ring value={ring2} size={size} color={colors.textInverse} />
        </>
      ) : null}
      <Animated.View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.textInverse,
            opacity: entrance,
            transform: [{ scale: entrance }, { rotate }],
          },
        ]}
      >
        <Animated.Text style={[styles.mark, { fontSize: size * 0.36, color: colors.primary }]}>FP</Animated.Text>
      </Animated.View>
    </View>
  );
}

function Ring({ value, size, color }: { value: Animated.Value; size: number; color: string }) {
  const scale = value.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const opacity = value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    fontFamily: typography.displayMd.fontFamily,
    letterSpacing: 0.5,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: radius.full,
  },
});
