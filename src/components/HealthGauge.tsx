import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { HealthLevel } from '../lib/farmHealthScore';
import { radius, spacing, typography, useColors, type Colors } from '../theme';

const LEVEL_LABELS: Record<HealthLevel, string> = {
  otimo: 'Ótima',
  bom: 'Boa',
  atencao: 'Atenção',
  critico: 'Crítica',
};

function levelColorOf(colors: Colors, level: HealthLevel): string {
  return { otimo: colors.success, bom: colors.lavoura, atencao: colors.warning, critico: colors.danger }[level];
}

/** Barra tipo termômetro — número grande + selo de nível + trilha
 * colorida que enche animando até a nota. As duas marcações na trilha
 * (40 e 70) mostram onde começam as faixas "atenção" e "boa". */
export function HealthGauge({ score, level, compact }: { score: number; level: HealthLevel; compact?: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = useRef(new Animated.Value(0)).current;
  const levelColor = levelColorOf(colors, level);

  useEffect(() => {
    const anim = Animated.timing(progress, { toValue: score, duration: 700, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [score, progress]);

  const widthPct = progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.scoreNumber, compact && styles.scoreNumberCompact]}>{score}</Text>
        <View style={[styles.levelBadge, { backgroundColor: `${levelColor}22`, borderColor: levelColor }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>{LEVEL_LABELS[level]}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthPct, backgroundColor: levelColor }]} />
        <View style={[styles.tick, { left: '40%' }]} />
        <View style={[styles.tick, { left: '70%' }]} />
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    scoreNumber: {
      ...typography.displayMd,
      color: colors.textPrimary,
    },
    scoreNumberCompact: {
      ...typography.heading,
    },
    levelBadge: {
      borderRadius: radius.full,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
    },
    levelText: {
      ...typography.captionMedium,
    },
    track: {
      height: 14,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.full,
    },
    tick: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: colors.border,
    },
  });
}
