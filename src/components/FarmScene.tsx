import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

import { useColors } from '../theme';

interface FarmSceneProps {
  /** 'hero' é mais baixo e o sol fica mais pra cima do quadro (o hero do
   * login/signup corta a cena); 'cover' é a tela cheia, sol mais centrado
   * verticalmente. */
  variant?: 'hero' | 'cover';
}

/** Fileiras de sulcos de plantio — traços retos e grossos, tipo terra
 * arada de verdade vista de longe (não um hachurado fino e delicado).
 * Gerado em código (não hardcoded) pra dar pra ajustar quantidade/
 * espaçamento num lugar só. */
function buildFurrowLines(count: number, startX: number, endX: number, y: number, tilt: number) {
  const lines: { x1: number; x2: number; y1: number; y2: number }[] = [];
  const step = (endX - startX) / (count - 1);
  for (let i = 0; i < count; i++) {
    const x = startX + step * i;
    lines.push({ x1: x, y1: y, x2: x + tilt, y2: y + 14 });
  }
  return lines;
}

/**
 * Cenário de campo: relevo com contorno mais duro (não onda suave de
 * ilustração genérica), sol chapado sem brilho difuso, sulcos de plantio
 * grossos e bem marcados — deliberadamente sem o acabamento
 * "arredondado/suave/pulsante" de ilustração de app padrão. Usado como
 * fundo animado no hero do login/signup e na tela de abertura.
 */
export function FarmScene({ variant = 'hero' }: FarmSceneProps) {
  const colors = useColors();
  const isCover = variant === 'cover';

  const entrance = useRef(new Animated.Value(0)).current;
  const bird1 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 900, useNativeDriver: true }).start();

    // Só um pássaro, cruzando devagar e bem de leve — presença mínima, não
    // um bando "fofinho" de ilustração de onboarding.
    Animated.loop(
      Animated.sequence([
        Animated.delay(3000),
        Animated.timing(bird1, { toValue: 1, duration: 13000, useNativeDriver: true }),
        Animated.timing(bird1, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(4000),
      ])
    ).start();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const furrows = useMemo(() => buildFurrowLines(7, 4, 98, isCover ? 74 : 42, 7), [isCover]);

  const bird1X = bird1.interpolate({ inputRange: [0, 1], outputRange: [-24, 420] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fill,
        { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {/* Sol chapado, sem brilho difuso: um círculo de verdade (View, não
          dentro do SVG — o viewBox esticado não-uniformemente deformaria
          um círculo em oval). Estático, sem pulsar — mais gráfico do que
          "pôr do sol suave de ilustração de app". */}
      <View
        style={[
          styles.sun,
          {
            top: isCover ? '24%' : '5%',
            right: isCover ? '15%' : '11%',
            width: isCover ? 34 : 26,
            height: isCover ? 34 : 26,
            borderRadius: isCover ? 17 : 13,
            backgroundColor: colors.accent,
          },
        ]}
      />

      {/* Relevo em camadas + sulcos de plantio, no mesmo SVG —
          contornos irregulares (não curva única suave) e cores chapadas,
          sem gradiente nem brilho difuso. */}
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.svg}>
        <Path
          d={
            isCover
              ? 'M0,64 L14,58 L27,66 L41,52 L56,62 L70,50 L84,58 L100,48 L100,100 L0,100 Z'
              : 'M0,76 L14,70 L27,78 L41,66 L56,74 L70,64 L84,72 L100,62 L100,100 L0,100 Z'
          }
          fill={colors.primaryDark}
        />
        <Path
          d={
            isCover
              ? 'M0,76 L16,70 L30,79 L46,68 L60,77 L76,67 L88,75 L100,66 L100,100 L0,100 Z'
              : 'M0,86 L16,80 L30,90 L46,80 L60,88 L76,78 L88,86 L100,79 L100,100 L0,100 Z'
          }
          fill={colors.pecuaria}
        />
        <Path
          d={
            isCover
              ? 'M0,85 L18,80 L34,90 L50,81 L66,89 L82,80 L92,86 L100,81 L100,100 L0,100 Z'
              : 'M0,93 L18,89 L34,98 L50,91 L66,97 L82,90 L92,95 L100,92 L100,100 L0,100 Z'
          }
          fill={colors.lavoura}
        />
        {furrows.map((line, index) => (
          <Line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={colors.textInverse}
            strokeWidth={1.6}
            opacity={0.4}
            strokeLinecap="square"
          />
        ))}
      </Svg>

      {/* Um único traço de pássaro — presença mínima, sem "bando fofinho". */}
      <Animated.View style={[styles.bird, { top: isCover ? '20%' : '22%', transform: [{ translateX: bird1X }] }]}>
        <BirdMark color={colors.textInverse} />
      </Animated.View>
    </Animated.View>
  );
}

function BirdMark({ color }: { color: string }) {
  return (
    <Svg width={14} height={6} viewBox="0 0 14 6">
      <Path d="M0,5 L3.5,0.5 L7,5 L10.5,0.5 L14,5" stroke={color} strokeWidth={1.4} fill="none" opacity={0.35} strokeLinecap="square" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  sun: {
    position: 'absolute',
  },
  bird: {
    position: 'absolute',
    left: 0,
  },
});
