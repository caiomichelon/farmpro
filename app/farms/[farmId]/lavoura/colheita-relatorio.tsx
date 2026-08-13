import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../../../src/components/Card';
import { DataTable, type DataTableColumn } from '../../../../src/components/DataTable';
import { EmptyState } from '../../../../src/components/EmptyState';
import { FadeSlideIn } from '../../../../src/components/FadeSlideIn';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import {
  useHarvestLogisticsReport,
  type BuyerNoteReportRow,
  type BuyerReportRow,
  type DriverReportRow,
  type PlateReportRow,
  type TripReportRow,
} from '../../../../src/hooks/useHarvestLogisticsReport';
import { spacing, typography, useColors, type Colors } from '../../../../src/theme';

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function kg(value: number): string {
  return `${Math.round(value).toString()} kg`;
}

function pct(value: number | null): string {
  return value !== null ? `${value.toFixed(1)}%` : '—';
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Relatório de logística da colheita — a mesma nota de caminhão que já é
 * lançada em Colheita, só que agrupada por placa, por motorista e por
 * comprador. Sempre olha a fazenda inteira (todas as safras + lançamentos
 * soltos), já que um caminhão passa por vários talhões/safras ao longo da
 * colheita. */
export default function HarvestLogisticsReportScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { byPlate, byDriver, byBuyer, byBuyerNote, trips, isLoading, error, reload } = useHarvestLogisticsReport(farmId);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const plateColumns: DataTableColumn<PlateReportRow>[] = [
    { key: 'plate', label: 'Placa', width: 110, render: (r) => r.plate },
    { key: 'trips', label: 'Viagens', width: 90, render: (r) => String(r.trips) },
    { key: 'sacas', label: 'Sacas', width: 100, render: (r) => r.totalSacas.toFixed(1) },
    { key: 'net', label: 'Peso líquido', width: 130, render: (r) => kg(r.totalNetKg) },
    { key: 'gross', label: 'Peso bruto', width: 130, render: (r) => kg(r.totalGrossKg) },
    { key: 'rawKg', label: 'Peso antes do desconto', width: 170, render: (r) => (r.totalRawKg > 0 ? kg(r.totalRawKg) : '—') },
    { key: 'qualityLoss', label: 'Perdido em impureza/umidade', width: 190, render: (r) => (r.totalRawKg > 0 ? kg(r.totalQualityLossKg) : '—') },
    { key: 'lossPct', label: '% perdido', width: 100, render: (r) => pct(r.lossPercentage) },
    { key: 'humidity', label: 'Umidade média', width: 130, render: (r) => pct(r.avgHumidityPct) },
    { key: 'drivers', label: 'Motorista(s)', width: 200, render: (r) => (r.drivers.length > 0 ? r.drivers.join(', ') : '—') },
  ];

  const tripColumns: DataTableColumn<TripReportRow>[] = [
    { key: 'plate', label: 'Placa', width: 110, render: (r) => r.plate },
    { key: 'date', label: 'Data', width: 100, render: (r) => formatDate(r.harvestedAt) },
    { key: 'driver', label: 'Motorista', width: 180, render: (r) => r.driver },
    { key: 'buyer', label: 'Comprador', width: 140, render: (r) => r.buyer ?? '—' },
    { key: 'sacas', label: 'Sacas', width: 100, render: (r) => r.sacas.toFixed(1) },
    { key: 'net', label: 'Peso líquido', width: 130, render: (r) => (r.netKg > 0 ? kg(r.netKg) : '—') },
    { key: 'gross', label: 'Peso bruto', width: 130, render: (r) => (r.grossKg > 0 ? kg(r.grossKg) : '—') },
    { key: 'humidity', label: 'Umidade', width: 100, render: (r) => (r.humidityPct !== null ? `${r.humidityPct.toFixed(1)}%` : '—') },
    { key: 'rawNet', label: 'Peso antes do desconto', width: 160, render: (r) => (r.rawNetKg !== null ? kg(r.rawNetKg) : '—') },
    {
      key: 'loss',
      label: 'Perda por umidade/impureza',
      width: 180,
      render: (r) => (r.qualityLossKg !== null ? kg(r.qualityLossKg) : '—'),
    },
    { key: 'lossPct', label: '% perdido', width: 100, render: (r) => pct(r.qualityLossPct) },
  ];

  const buyerNoteColumns: DataTableColumn<BuyerNoteReportRow>[] = [
    { key: 'buyer', label: 'Comprador', width: 160, render: (r) => r.buyer },
    { key: 'trips', label: 'Viagens', width: 90, render: (r) => String(r.trips) },
    { key: 'sacas', label: 'Sacas', width: 100, render: (r) => r.totalSacas.toFixed(1) },
    { key: 'net', label: 'Peso líquido', width: 130, render: (r) => kg(r.totalNetKg) },
    { key: 'rawKg', label: 'Peso antes do desconto', width: 170, render: (r) => (r.totalRawKg > 0 ? kg(r.totalRawKg) : '—') },
    { key: 'qualityLoss', label: 'Impureza/umidade descontada', width: 190, render: (r) => (r.totalRawKg > 0 ? kg(r.totalQualityLossKg) : '—') },
    { key: 'lossPct', label: '% descontado', width: 110, render: (r) => pct(r.lossPercentage) },
    { key: 'humidity', label: 'Umidade média', width: 130, render: (r) => pct(r.avgHumidityPct) },
  ];

  const driverColumns: DataTableColumn<DriverReportRow>[] = [
    { key: 'driver', label: 'Motorista', width: 180, render: (r) => r.driver },
    { key: 'trips', label: 'Viagens', width: 90, render: (r) => String(r.trips) },
    { key: 'sacas', label: 'Sacas', width: 100, render: (r) => r.totalSacas.toFixed(1) },
    { key: 'net', label: 'Peso líquido', width: 130, render: (r) => kg(r.totalNetKg) },
  ];

  const buyerColumns: DataTableColumn<BuyerReportRow>[] = [
    { key: 'buyer', label: 'Comprador', width: 160, render: (r) => r.buyer },
    { key: 'sales', label: 'Vendas', width: 90, render: (r) => String(r.salesCount) },
    { key: 'sacas', label: 'Sacas vendidas', width: 130, render: (r) => r.totalSacas.toFixed(1) },
    { key: 'value', label: 'Valor total', width: 140, render: (r) => currency(r.totalValue) },
    { key: 'avgPrice', label: 'Preço médio/saca', width: 150, render: (r) => currency(r.avgPricePerSaca) },
  ];

  const isEmpty =
    byPlate.length === 0 && byDriver.length === 0 && byBuyer.length === 0 && byBuyerNote.length === 0 && trips.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Relatório de caminhões e compradores"
        subtitle="Toda a colheita da fazenda, agrupada por placa, motorista e comprador"
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.lavoura} />
      ) : isEmpty ? (
        <EmptyState text="Ainda não há notas de caminhão ou vendas lançadas pra gerar esse relatório." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {byPlate.length > 0 ? (
            <FadeSlideIn delay={40}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Por caminhão (placa)</Text>
                <Text style={styles.sectionHelp}>Total de cada placa — some as viagens da tabela abaixo</Text>
                <DataTable columns={plateColumns} data={byPlate} keyExtractor={(r) => r.plate} title="Por caminhão" />
              </View>
            </FadeSlideIn>
          ) : null}

          {trips.length > 0 ? (
            <FadeSlideIn delay={65}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notas individuais (cada viagem)</Text>
                <Text style={styles.sectionHelp}>Quanto cada caminhão pesou, viagem por viagem — agrupado por placa</Text>
                <DataTable columns={tripColumns} data={trips} keyExtractor={(r) => r.id} title="Notas individuais" />
              </View>
            </FadeSlideIn>
          ) : null}

          {byDriver.length > 0 ? (
            <FadeSlideIn delay={90}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Por motorista</Text>
                <DataTable columns={driverColumns} data={byDriver} keyExtractor={(r) => r.driver} title="Por motorista" />
              </View>
            </FadeSlideIn>
          ) : null}

          {byBuyerNote.length > 0 ? (
            <FadeSlideIn delay={115}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Por comprador (informado na nota)</Text>
                <Text style={styles.sectionHelp}>Direto da nota de caminhão — não depende de venda registrada</Text>
                <DataTable columns={buyerNoteColumns} data={byBuyerNote} keyExtractor={(r) => r.buyer} title="Por comprador (nota)" />
              </View>
            </FadeSlideIn>
          ) : null}

          {byBuyer.length > 0 ? (
            <FadeSlideIn delay={140}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Por comprador (vendas registradas)</Text>
                <Text style={styles.sectionHelp}>Com preço — só aparece depois que a venda é lançada em "Vincular venda"</Text>
                <DataTable columns={buyerColumns} data={byBuyer} keyExtractor={(r) => r.buyer} title="Vendas por comprador" />
              </View>
            </FadeSlideIn>
          ) : null}

          <FadeSlideIn delay={180}>
            <Card style={styles.footnoteCard}>
              <Text style={styles.footnote}>
                Junta tudo que já foi lançado em Colheita e Vendas — de qualquer safra ou solto direto na fazenda —
                sem inventar nenhum valor novo. "Sacas" aqui é sempre a quantidade lançada na nota de cada caminhão.
                O que foi "perdido em impureza/umidade" é a diferença entre o peso antes do desconto e o peso líquido
                usado pra fixação, e o "% perdido"/"% descontado" é essa diferença dividida pelo peso antes do
                desconto — tudo isso só aparece quando a nota trouxe os dois pesos (antes e depois do desconto).
              </Text>
            </Card>
          </FadeSlideIn>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { marginTop: spacing.xxl },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xl },
    section: { gap: spacing.sm },
    sectionTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    sectionHelp: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: -spacing.xs,
    },
    footnoteCard: {
      gap: spacing.xs,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
  });
}
