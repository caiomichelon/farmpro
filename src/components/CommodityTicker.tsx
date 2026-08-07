import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { getCommodityQuotes, type CommodityQuote } from '../data/commodities';
import { colors, spacing, typography } from '../theme';

const PIXELS_PER_SECOND = 36;

/**
 * Barra de commodities fixa, com rolagem automática contínua (efeito
 * "letreiro"). Os dados hoje vêm de `getCommodityQuotes` (mock) — ver
 * src/data/commodities.ts para o que falta pra virar tempo real.
 */
export function CommodityTicker() {
  const [quotes, setQuotes] = useState<CommodityQuote[]>([]);
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getCommodityQuotes().then(setQuotes);
  }, []);

  useEffect(() => {
    if (rowWidth === 0) return;

    translateX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -rowWidth,
        duration: (rowWidth / PIXELS_PER_SECOND) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [rowWidth, translateX]);

  if (quotes.length === 0) {
    return <View style={styles.container} />;
  }

  const handleFirstRowLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
        <QuoteRow quotes={quotes} onLayout={handleFirstRowLayout} />
        <QuoteRow quotes={quotes} />
      </Animated.View>
    </View>
  );
}

function QuoteRow({ quotes, onLayout }: { quotes: CommodityQuote[]; onLayout?: (e: LayoutChangeEvent) => void }) {
  return (
    <View style={styles.row} onLayout={onLayout}>
      {quotes.map((quote) => (
        <QuoteItem key={quote.id} quote={quote} />
      ))}
    </View>
  );
}

function QuoteItem({ quote }: { quote: CommodityQuote }) {
  const isUp = quote.changePercent >= 0;
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{quote.label}</Text>
      <Text style={styles.price}>
        R$ {quote.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        <Text style={styles.unit}> /{quote.unit}</Text>
      </Text>
      <Text style={[styles.change, { color: isUp ? '#8FD19E' : '#E8A79C' }]}>
        {isUp ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    backgroundColor: colors.primaryDark,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textInverse,
    opacity: 0.7,
  },
  price: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
  unit: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.6,
  },
  change: {
    ...typography.captionMedium,
  },
});
