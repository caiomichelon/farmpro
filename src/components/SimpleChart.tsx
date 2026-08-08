import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line as SvgLine, Polyline } from 'react-native-svg';

import { radius, spacing, typography, useColors, type Colors } from '../theme';

export type ChartType = 'barras' | 'linha' | 'pizza';

export interface ChartDatum {
  label: string;
  value: number;
}

const MAX_ITEMS = 12;

/** Gráfico simples (barras, linha ou pizza) sem depender de biblioteca de
 * gráficos — só react-native-svg (já suportado no Expo Go). Recebe pares
 * rótulo/valor já prontos; quem chama decide qual coluna virou o valor. */
export function SimpleChart({ type, data, color }: { type: ChartType; data: ChartDatum[]; color: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const limited = data.slice(0, MAX_ITEMS);
  const truncated = data.length > MAX_ITEMS;

  if (limited.length === 0) {
    return <Text style={styles.empty}>Sem dados numéricos suficientes pra desenhar o gráfico.</Text>;
  }

  return (
    <View style={styles.container}>
      {type === 'barras' ? <BarChart data={limited} color={color} styles={styles} /> : null}
      {type === 'linha' ? <LineChart data={limited} color={color} styles={styles} colors={colors} /> : null}
      {type === 'pizza' ? <PieChart data={limited} styles={styles} colors={colors} /> : null}
      {truncated ? <Text style={styles.truncatedNote}>Mostrando os {MAX_ITEMS} primeiros de {data.length} registros.</Text> : null}
    </View>
  );
}

function BarChart({ data, color, styles }: { data: ChartDatum[]; color: string; styles: ReturnType<typeof createStyles> }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <View style={styles.barList}>
      {data.map((d, i) => (
        <View key={`${d.label}-${i}`} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {d.label}
          </Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(Math.abs(d.value) / max) * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.barValue}>{formatValue(d.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function LineChart({
  data,
  color,
  styles,
  colors,
}: {
  data: ChartDatum[];
  color: string;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  const width = 320;
  const height = 160;
  const padding = 12;
  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2);
    return { x, y };
  });
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        <SvgLine x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.border} strokeWidth={1} />
        <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2} />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}
      </Svg>
      <View style={styles.lineLegend}>
        {data.map((d, i) => (
          <Text key={`${d.label}-${i}`} style={styles.lineLegendItem} numberOfLines={1}>
            {i + 1}. {d.label}: {formatValue(d.value)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const PIE_PALETTE_KEYS = ['pecuaria', 'lavoura', 'primary', 'success', 'warning', 'danger', 'accent'] as const;

function PieChart({ data, styles, colors }: { data: ChartDatum[]; styles: ReturnType<typeof createStyles>; colors: Colors }) {
  const size = 180;
  const radiusPx = 70;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radiusPx;
  const total = data.reduce((sum, d) => sum + Math.abs(d.value), 0) || 1;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const fraction = Math.abs(d.value) / total;
    const dashLength = fraction * circumference;
    const dashOffset = -cumulative * circumference;
    cumulative += fraction;
    const paletteColor = colors[PIE_PALETTE_KEYS[i % PIE_PALETTE_KEYS.length]];
    return { dashLength, dashOffset, color: paletteColor, d };
  });

  return (
    <View style={styles.pieRow}>
      <Svg width={size} height={size}>
        {segments.map((seg, i) => (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radiusPx}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
            strokeDashoffset={seg.dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      <View style={styles.pieLegend}>
        {segments.map((seg, i) => (
          <View key={i} style={styles.pieLegendRow}>
            <View style={[styles.pieLegendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.pieLegendText} numberOfLines={1}>
              {seg.d.label}: {formatValue(seg.d.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatValue(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    empty: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    truncatedNote: {
      ...typography.caption,
      color: colors.textMuted,
    },
    barList: {
      gap: spacing.sm,
    },
    barRow: {
      gap: 2,
    },
    barLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    barTrack: {
      height: 10,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: radius.sm,
    },
    barValue: {
      ...typography.captionMedium,
      color: colors.textPrimary,
    },
    lineLegend: {
      marginTop: spacing.sm,
      gap: 2,
    },
    lineLegendItem: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    pieRow: {
      alignItems: 'center',
      gap: spacing.md,
    },
    pieLegend: {
      gap: spacing.xs,
      alignSelf: 'stretch',
    },
    pieLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    pieLegendDot: {
      width: 10,
      height: 10,
      borderRadius: radius.full,
    },
    pieLegendText: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
    },
  });
}
