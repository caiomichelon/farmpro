import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

interface FadeSlideInProps {
  children: React.ReactNode;
  /** Atraso antes de começar, em ms — pra escalonar vários blocos em
   * sequência (ex.: hero, depois form, depois rodapé). */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Entrada animada simples (opacidade 0→1 + sobe 16px→0) só com a
 * `Animated` API do React Native — sem lib nova, funciona igual em
 * web/iOS/Android/Expo Go. Usada nas telas de abertura e nos hubs
 * principais pra tirar aquele "aparece tudo travado" de tela nova. */
export function FadeSlideIn({ children, delay = 0, style }: FadeSlideInProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
