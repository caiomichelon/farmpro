import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeSlideIn } from '../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { useT } from '../../../../src/i18n';
import { radius, spacing, typography, useColors, type Colors } from '../../../../src/theme';

export default function PecuariaHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const t = useT();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('pecuariaHome.title')}
        subtitle={t('pecuariaHome.subtitle')}
        right={
          <Pressable onPress={() => router.push(`/farms/${farmId}`)} hitSlop={12}>
            <Text style={styles.headerLink}>🏠 Fazenda</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <FadeSlideIn>
          <AreaCard
            title={t('pecuariaHome.corteTitle')}
            description={t('pecuariaHome.corteDescription')}
            onPress={() => router.push(`/farms/${farmId}/pecuaria/corte`)}
            styles={styles}
          />
        </FadeSlideIn>
        <FadeSlideIn delay={70}>
          <AreaCard
            title={t('pecuariaHome.criaTitle')}
            description={t('pecuariaHome.criaDescription')}
            onPress={() => router.push(`/farms/${farmId}/pecuaria/cria`)}
            styles={styles}
          />
        </FadeSlideIn>
        <FadeSlideIn delay={140}>
          <AreaCard
            title={t('pecuariaHome.estoqueTitle')}
            description={t('pecuariaHome.estoqueDescription')}
            onPress={() => router.push(`/farms/${farmId}/pecuaria/estoque`)}
            styles={styles}
          />
        </FadeSlideIn>

        {/* Itens que não são exclusivos de nenhum setor (fornecedores,
            membros da fazenda, etc.) — moram aqui e em Lavoura, não na home
            da fazenda, que fica só com os dois setores. */}
        <View style={styles.moreSection}>
          <MoreRow
            icon="👨‍🌾"
            title={t('farmHome.employees')}
            subtitle={t('farmHome.employeesSubtitle')}
            onPress={() => router.push(`/farms/${farmId}/funcionarios`)}
            styles={styles}
          />
          <MoreRow
            icon="👷"
            title="Diaristas"
            subtitle="Mão de obra avulsa, sem cadastro fixo"
            onPress={() => router.push(`/farms/${farmId}/diaristas`)}
            styles={styles}
          />
          <MoreRow
            icon="✅"
            title="Tarefas do dia"
            subtitle="Crie, atribua e acompanhe o que precisa ser feito"
            onPress={() => router.push(`/farms/${farmId}/tarefas`)}
            styles={styles}
          />
          <MoreRow
            icon="📇"
            title="Fornecedores"
            subtitle="Agropecuária, veterinário, mecânico e mais"
            onPress={() => router.push(`/farms/${farmId}/fornecedores`)}
            styles={styles}
          />
          <MoreRow
            icon="👥"
            title={t('farmHome.members')}
            subtitle={t('farmHome.membersSubtitle')}
            onPress={() => router.push(`/farms/${farmId}/membros`)}
            styles={styles}
          />
          <MoreRow
            icon="🚗"
            title="Modo carro"
            subtitle="Painel com boletim automático e comando de voz"
            onPress={() => router.push(`/farms/${farmId}/modo-carro`)}
            styles={styles}
          />
          <MoreRow
            icon="📣"
            title="Boletim da fazenda"
            subtitle="Resumo falado do que importa hoje"
            onPress={() => router.push(`/farms/${farmId}/boletim`)}
            styles={styles}
          />
          <MoreRow
            icon="📤"
            title={t('farmHome.export')}
            subtitle={t('farmHome.exportSubtitle')}
            onPress={() => router.push(`/farms/${farmId}/exportar`)}
            styles={styles}
          />
          <MoreRow
            icon="🔧"
            title="Maquinário"
            subtitle="Tratores e implementos — manutenção em dia"
            onPress={() => router.push(`/farms/${farmId}/equipamentos`)}
            styles={styles}
          />
          <MoreRow
            icon="⛅"
            title="Clima"
            subtitle="Alertas de geada, chuva, calor e vento"
            onPress={() => router.push(`/farms/${farmId}/clima`)}
            styles={styles}
          />
          <MoreRow
            icon="🌙"
            title="Fechamento do dia"
            subtitle="Ponto, coletas e alertas antes de encerrar"
            onPress={() => router.push(`/farms/${farmId}/fechamento`)}
            styles={styles}
          />
          <MoreRow
            icon="🎙️"
            title="Ei FarmPro"
            subtitle="Pergunte por voz sobre clima, lotes e mais"
            onPress={() => router.push(`/farms/${farmId}/comando-de-voz`)}
            styles={styles}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Linha compacta pra um item que não é sobre Corte/Cria (funcionários,
 * fornecedores, etc.) — mesma cara das linhas "soltas" que a home da
 * fazenda tinha antes de ficar só com Lavoura/Pecuária. */
function MoreRow({
  icon,
  title,
  subtitle,
  onPress,
  styles,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.moreRow, pressed && styles.moreRowPressed]} onPress={onPress}>
      <Text style={styles.moreRowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.moreRowTitle}>{title}</Text>
        <Text style={styles.moreRowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.moreRowChevron}>→</Text>
    </Pressable>
  );
}

function AreaCard({
  title,
  description,
  onPress,
  styles,
}: {
  title: string;
  description: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.marker} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.pecuariaLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardPressed: {
    opacity: 0.85,
  },
  marker: {
    width: 28,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.pecuaria,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.pecuaria,
    marginBottom: spacing.xs / 2,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  headerLink: {
    ...typography.captionMedium,
    color: colors.pecuaria,
  },
  moreSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  moreRowPressed: {
    opacity: 0.8,
  },
  moreRowIcon: {
    fontSize: 20,
  },
  moreRowTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  moreRowSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreRowChevron: {
    ...typography.heading,
    color: colors.pecuaria,
  },
  });
}
