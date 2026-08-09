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

/** Fileiras de sulcos de plantio — um "V" de linhas curtas repetido,
 * lembrando um talhão visto de longe. Gerado em código (não hardcoded)
 * pra dar pra ajustar quantidade/espaçamento num lugar só. */
function buildFurrowLines(count: number, startX: number, endX: number, y: number, tilt: number) {
  const lines: { x1: number; x2: number; y1: number; y2: number }[] = [];
  const step = (endX - startX) / (count - 1);
  for (let i = 0; i < count; i++) {
    const x = startX + step * i;
    lines.push({ x1: x, y1: y, x2: x + tilt, y2: y + 10 });
  }
  return lines;
}

/** Cenário de campo estilizado: colinas em camadas, sol com brilho
 * pulsante, sulcos de plantio e pássaros cruzando o céu — um desenho de
 * linha simples nas cores da própria paleta do app (sem gradiente, sem
 * foto, sem clichê de IA). Usado como fundo animado no hero do
 * login/signup e na tela de abertura. */
export function FarmScene({ variant = 'hero' }: FarmSceneProps) {
  const colors = useColors();
  const isCover = variant === 'cover';

  const entrance = useRef(new Animated.Value(0)).current;
  const sunPulse = useRef(new Animated.Value(0)).current;
  const bird1 = useRef(new Animated.Value(0)).current;
  const bird2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 900, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sunPulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(sunPulse, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bird1, { toValue: 1, duration: 10000, useNativeDriver: true }),
        Animated.timing(bird1, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(2600),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(4200),
        Animated.timing(bird2, { toValue: 1, duration: 12000, useNativeDriver: true }),
        Animated.timing(bird2, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(3200),
      ])
    ).start();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const furrows = useMemo(() => buildFurrowLines(9, 6, 96, isCover ? 78 : 46, 5), [isCover]);

  const sunGlowScale = sunPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const sunGlowOpacity = sunPulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.05] });
  // Faixa em pontos (não %) porque translateX com string percentual não é
  // suportado de forma confiável fora da web pelo driver nativo — a faixa
  // cobre a largura típica de tela de celular de sobra.
  const bird1X = bird1.interpolate({ inputRange: [0, 1], outputRange: [-24, 420] });
  const bird2X = bird2.interpolate({ inputRange: [0, 1], outputRange: [-24, 420] });

  const sunTop = isCover ? '30%' : '8%';
  const sunSize = isCover ? 34 : 26;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fill,
        { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {/* Sol com anéis de brilho — Views comuns (não SVG) pra animar com
          o driver nativo sem depender de props animadas do SVG. */}
      <View
        style={[
          styles.sunWrap,
          { top: sunTop, right: isCover ? '14%' : '10%', width: sunSize * 2.6, height: sunSize * 2.6 },
        ]}
      >
        <Animated.View
          style={[
            styles.sunGlow,
            {
              width: sunSize * 2.6,
              height: sunSize * 2.6,
              borderRadius: sunSize * 1.3,
              backgroundColor: colors.accent,
              opacity: sunGlowOpacity,
              transform: [{ scale: sunGlowScale }],
            },
          ]}
        />
        <View
          style={[
            styles.sunCore,
            { width: sunSize, height: sunSize, borderRadius: sunSize / 2, backgroundColor: colors.accent },
          ]}
        />
      </View>

      {/* Colinas em camadas + sulcos de plantio */}
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.svg}>
        <Path
          d={isCover ? 'M0,72 C22,60 45,80 68,66 C82,58 92,66 100,60 L100,100 L0,100 Z' : 'M0,82 C24,70 46,90 70,76 C84,68 92,76 100,70 L100,100 L0,100 Z'}
          fill={colors.primaryDark}
          opacity={0.85}
        />
        <Path
          d={isCover ? 'M0,86 C20,78 50,94 76,82 C88,76 94,84 100,80 L100,100 L0,100 Z' : 'M0,92 C20,86 50,100 76,90 C88,86 94,92 100,90 L100,100 L0,100 Z'}
          fill={colors.lavoura}
          opacity={0.9}
        />
        {furrows.map((line, index) => (
          <Line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={colors.textInverse}
            strokeWidth={0.6}
            opacity={0.16}
            strokeLinecap="round"
          />
        ))}
      </Svg>

      {/* Pássaros — dois traços em "M" cruzando o céu em velocidades
          diferentes, num loop com pausa entre passagens. */}
      <Animated.View style={[styles.bird, { top: isCover ? '18%' : '20%', transform: [{ translateX: bird1X }] }]}>
        <BirdMark color={colors.textInverse} />
      </Animated.View>
      <Animated.View style={[styles.bird, { top: isCover ? '26%' : '32%', transform: [{ translateX: bird2X }] }]}>
        <BirdMark color={colors.textInverse} size={0.75} />
      </Animated.View>
    </Animated.View>
  );
}

function BirdMark({ color, size = 1 }: { color: string; size?: number }) {
  return (
    <Svg width={16 * size} height={9 * size} viewBox="0 0 16 9">
      <Path d="M0,6 Q4,0 8,6 Q12,0 16,6" stroke={color} strokeWidth={1.3} fill="none" opacity={0.4} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  sunWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sunCore: {},
  bird: {
    position: 'absolute',
    left: 0,
  },
});
