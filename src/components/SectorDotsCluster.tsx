import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { spacing, useColors } from '../theme';

/**
 * Trio de pontos animados nas cores dos três setores (lavoura, pecuária,
 * funcionários) — a "assinatura" visual do app. Entram escalonados com um
 * leve estouro (spring) e depois ficam "respirando" (bob sutil) em loop,
 * dando vida às telas de abertura/login sem depender de gradiente ou lib
 * nova — só a `Animated` API do React Native.
 */
export function SectorDotsCluster({ size = 10 }: { size?: number }) {
  const colors = useColors();
  const dotColors = [colors.lavoura, colors.pecuaria, colors.funcionarios];
  const progressList = useRef(dotColors.map(() => new Animated.Value(0))).current;
  const bobList = useRef(dotColors.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const entrances = progressList.map((progress, index) =>
      Animated.spring(progress, {
        toValue: 1,
        delay: index * 110,
        useNativeDriver: true,
        speed: 14,
        bounciness: 12,
      })
    );

    Animated.stagger(110, entrances).start(() => {
      progressList.forEach((_, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(bobList[index], {
              toValue: 1,
              duration: 900,
              delay: index * 160,
              useNativeDriver: true,
            }),
            Animated.timing(bobList[index], {
              toValue: 0,
              duration: 900,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.row}>
      {dotColors.map((color, index) => (
        <Animated.View
          key={color}
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: progressList[index],
              transform: [
                { scale: progressList[index] },
                {
                  translateY: bobList[index].interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {},
});
