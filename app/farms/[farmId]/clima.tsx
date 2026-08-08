import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { LocationMap } from '../../../src/components/LocationMap';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useFarm } from '../../../src/hooks/useFarms';
import { deriveWeatherRisks, fetchWeatherForecast, type DailyForecast, type WeatherRisk } from '../../../src/lib/weather';
import { radius, spacing, typography, useColors, type Colors } from '../../../src/theme';

function formatDateBR(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function ClimaScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  const { farm, isLoading: farmLoading, updateFarmLocation } = useFarm(farmId);

  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [risks, setRisks] = useState<WeatherRisk[]>([]);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);

  const hasLocation = farm?.latitude != null && farm?.longitude != null;

  useEffect(() => {
    if (!hasLocation || !farm) return;
    let cancelled = false;
    setIsLoadingForecast(true);
    fetchWeatherForecast(Number(farm.latitude), Number(farm.longitude)).then((data) => {
      if (cancelled) return;
      setForecast(data);
      setRisks(deriveWeatherRisks(data));
      setIsLoadingForecast(false);
    });
    return () => {
      cancelled = true;
    };
  }, [hasLocation, farm]);

  async function handleCaptureLocation() {
    if (!farmId) return;
    setIsCapturing(true);
    setCaptureError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCaptureError('Permissão de localização negada. Ative nas configurações do dispositivo.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const { error } = await updateFarmLocation(farmId, position.coords.latitude, position.coords.longitude);
      if (error) setCaptureError(error);
    } catch {
      setCaptureError('Não foi possível obter sua localização agora. Tente novamente.');
    } finally {
      setIsCapturing(false);
    }
  }

  if (farmLoading || !farm) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Clima" subtitle="Alertas proativos de geada, chuva, calor e vento" />

      <ScrollView contentContainerStyle={styles.content}>
        {!hasLocation ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Ative os alertas de clima</Text>
            <Text style={styles.infoText}>
              Toque no botão abaixo pra usar a localização atual da fazenda. A partir daí o FarmPro acompanha a
              previsão dos próximos dias e avisa sobre geada, chuva forte, calor extremo e vento — inclusive no
              aparelho, mesmo com o app fechado.
            </Text>
            {captureError ? <Text style={styles.error}>{captureError}</Text> : null}
            <Button label="Usar minha localização atual" onPress={handleCaptureLocation} loading={isCapturing} />
          </Card>
        ) : (
          <>
            {isLoadingForecast ? (
              <ActivityIndicator style={styles.loading} color={colors.primary} />
            ) : (
              <>
                {risks.length > 0 ? (
                  <View style={styles.risksSection}>
                    {risks.map((risk) => (
                      <View
                        key={risk.type}
                        style={[styles.riskCard, risk.severity === 'danger' ? styles.riskCardDanger : styles.riskCardWarning]}
                      >
                        <Text style={[styles.riskTitle, { color: risk.severity === 'danger' ? colors.danger : colors.warning }]}>
                          {risk.title}
                        </Text>
                        <Text style={styles.riskDescription}>{risk.description}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Card style={styles.successCard}>
                    <Text style={styles.cardTitle}>Sem riscos nos próximos dias</Text>
                    <Text style={styles.infoText}>Nenhuma geada, chuva forte, calor extremo ou vento forte previsto.</Text>
                  </Card>
                )}

                <Card style={styles.card}>
                  <Text style={styles.cardTitle}>Previsão</Text>
                  <View style={styles.forecastList}>
                    {forecast.map((day) => (
                      <View key={day.date} style={styles.forecastRow}>
                        <Text style={styles.forecastDate}>{formatDateBR(day.date)}</Text>
                        <Text style={styles.forecastTemp}>
                          {day.minTempC.toFixed(0)}° / {day.maxTempC.toFixed(0)}°C
                        </Text>
                        <Text style={styles.forecastRain}>💧 {day.precipitationProbabilityPct.toFixed(0)}%</Text>
                        <Text style={styles.forecastWind}>🌬️ {day.windSpeedMaxKmh.toFixed(0)} km/h</Text>
                      </View>
                    ))}
                  </View>
                </Card>

                <LocationMap points={[{ latitude: Number(farm.latitude), longitude: Number(farm.longitude), label: farm.name }]} />

                {captureError ? <Text style={styles.error}>{captureError}</Text> : null}
                <Button label="Atualizar localização" variant="secondary" onPress={handleCaptureLocation} loading={isCapturing} />
              </>
            )}
          </>
        )}
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
    loading: {
      marginTop: spacing.xxl,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    card: {
      gap: spacing.sm,
    },
    successCard: {
      gap: spacing.xs,
      borderColor: colors.successLight,
      backgroundColor: colors.successLight,
    },
    cardTitle: {
      ...typography.subheading,
      color: colors.textPrimary,
    },
    infoText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    risksSection: {
      gap: spacing.sm,
    },
    riskCard: {
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
      gap: 2,
    },
    riskCardDanger: {
      backgroundColor: colors.dangerLight,
      borderColor: colors.danger,
    },
    riskCardWarning: {
      backgroundColor: colors.warningLight,
      borderColor: colors.warning,
    },
    riskTitle: {
      ...typography.bodyMedium,
    },
    riskDescription: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    forecastList: {
      gap: spacing.xs,
    },
    forecastRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    forecastDate: {
      ...typography.captionMedium,
      color: colors.textPrimary,
      width: 40,
    },
    forecastTemp: {
      ...typography.caption,
      color: colors.textPrimary,
      flex: 1,
    },
    forecastRain: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    forecastWind: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
