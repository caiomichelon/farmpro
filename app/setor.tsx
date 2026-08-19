import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeSlideIn } from '../src/components/FadeSlideIn';
import { SectorDotsCluster } from '../src/components/SectorDotsCluster';
import { SectorPhotoCard } from '../src/components/SectorPhotoCard';
import { useT } from '../src/i18n';
import { spacing, typography, useColors, type Colors } from '../src/theme';

const lavouraImage = require('../src/assets/images/sector/lavoura.jpg');
const pecuariaImage = require('../src/assets/images/sector/pecuaria.jpg');

/** Primeira tela depois do login — escolhe o SETOR antes da fazenda, não o
 * contrário. Quem trabalha só com lavoura nunca vê fazenda de pecuária na
 * lista (e vice-versa); quem tem fazenda mista (com os dois) vê ela nos
 * dois caminhos. Isso substitui a lista de fazendas como ponto de entrada
 * — a lista "de tudo" continua existindo, só como opção secundária aqui
 * embaixo, pra quem quiser ver todas de uma vez. */
export default function SectorSelectionScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ScrollView (em vez de View fixa) com flexGrow:1 no conteúdo:
          em tela normal os cartões continuam esticando pra preencher a
          tela toda (minHeight do buttonWrap nunca é atingido), mas em
          aparelho com pouca altura (tela curta) o conteúdo passa a
          rolar em vez de espremer a foto ou cortar o texto — sem isso,
          minHeight nos cartões só ia gerar overflow escondido. */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FadeSlideIn>
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <Text style={styles.eyebrow}>{t('farms.eyebrow')}</Text>
              <Pressable onPress={() => router.push('/ajustes')} hitSlop={12}>
                <Text style={styles.settingsIcon}>{t('farms.settings')}</Text>
              </Pressable>
            </View>
            <Text style={styles.title}>{t('sector.title')}</Text>
            <Text style={styles.subtitle}>{t('sector.subtitle')}</Text>
            <View style={styles.dotsRow}>
              <SectorDotsCluster size={8} />
            </View>
          </View>
        </FadeSlideIn>

        <View style={styles.content}>
          {/* style={{ flex: 1 }} no FadeSlideIn é essencial aqui — sem ele, o
              Animated.View que ele cria não repassa o flex:1 do SectorButton
              pro layout em coluna, e os dois cartões colapsavam e ficavam se
              sobrepondo em vez de dividir a tela. */}
          <FadeSlideIn delay={60} style={styles.buttonWrap}>
            <SectorPhotoCard
              title={`🌱 ${t('farmHome.lavoura')}`}
              subtitle={t('sector.lavouraSubtitle')}
              image={lavouraImage}
              credit={t('sector.lavouraCredit')}
              color={colors.lavoura}
              backgroundColor={colors.lavouraLight}
              onPress={() => router.push('/farms?sector=lavoura')}
            />
          </FadeSlideIn>
          <FadeSlideIn delay={110} style={styles.buttonWrap}>
            <SectorPhotoCard
              title={`🐄 ${t('farmHome.pecuaria')}`}
              subtitle={t('sector.pecuariaSubtitle')}
              image={pecuariaImage}
              credit={t('sector.pecuariaCredit')}
              color={colors.pecuaria}
              backgroundColor={colors.pecuariaLight}
              onPress={() => router.push('/farms?sector=pecuaria')}
            />
          </FadeSlideIn>
        </View>

        <Pressable style={styles.allFarmsLink} onPress={() => router.push('/farms')} hitSlop={12}>
          <Text style={styles.allFarmsLinkText}>{t('sector.viewAllFarms')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.xs,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    eyebrow: {
      ...typography.label,
      color: colors.textInverse,
      opacity: 0.7,
    },
    title: {
      ...typography.displayMd,
      color: colors.textInverse,
    },
    subtitle: {
      ...typography.body,
      color: colors.textInverse,
      opacity: 0.85,
    },
    settingsIcon: {
      ...typography.bodyMedium,
      color: colors.textInverse,
      opacity: 0.9,
    },
    dotsRow: {
      marginTop: spacing.sm,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      padding: spacing.xl,
      gap: spacing.lg,
    },
    buttonWrap: {
      flex: 1,
      minHeight: 260,
    },
    allFarmsLink: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    allFarmsLinkText: {
      ...typography.captionMedium,
      color: colors.textSecondary,
    },
  });
}
