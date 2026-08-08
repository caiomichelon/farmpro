/**
 * Previsão do tempo pros alertas proativos de clima — usa a API pública
 * do Open-Meteo (sem chave, com CORS liberado, então funciona tanto no
 * app nativo quanto no `expo start --web`). Falha sempre em silêncio: se
 * a fazenda não tem localização definida ou a API está fora do ar, os
 * alertas de clima simplesmente não aparecem — o resto do app segue normal.
 */

const FETCH_TIMEOUT_MS = 5000;

// Limiares dos alertas — referência prática pra pecuária/lavoura, não
// meteorologia de precisão: geada mata pastagem/muda sensível, chuva forte
// atrapalha pulverização/colheita, calor extremo estressa o gado, vento
// forte faz a calda do defensivo derivar.
const FROST_MAX_TEMP_C = 3;
const HEAVY_RAIN_MIN_MM = 20;
const HEAVY_RAIN_MIN_PROBABILITY_PCT = 80;
const EXTREME_HEAT_MIN_TEMP_C = 36;
const STRONG_WIND_MIN_KMH = 30;

/** Só olha os próximos dias — alerta de clima é sempre acionável no curto
 * prazo, não faz sentido avisar com 1 semana de antecedência (a previsão
 * muda). */
const LOOKAHEAD_DAYS = 4;

export interface DailyForecast {
  date: string;
  minTempC: number;
  maxTempC: number;
  precipitationSumMm: number;
  precipitationProbabilityPct: number;
  windSpeedMaxKmh: number;
}

export async function fetchWeatherForecast(latitude: number, longitude: number): Promise<DailyForecast[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max` +
      `&timezone=auto&forecast_days=${LOOKAHEAD_DAYS + 1}`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return [];
    const json = await response.json();
    const daily = json?.daily;
    if (!daily?.time) return [];

    const windKey = daily.wind_speed_10m_max ? 'wind_speed_10m_max' : 'windspeed_10m_max';

    return (daily.time as string[]).map((date: string, i: number) => ({
      date,
      minTempC: Number(daily.temperature_2m_min?.[i] ?? 0),
      maxTempC: Number(daily.temperature_2m_max?.[i] ?? 0),
      precipitationSumMm: Number(daily.precipitation_sum?.[i] ?? 0),
      precipitationProbabilityPct: Number(daily.precipitation_probability_max?.[i] ?? 0),
      windSpeedMaxKmh: Number(daily[windKey]?.[i] ?? 0),
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export type WeatherRiskType = 'geada' | 'chuva_forte' | 'calor_extremo' | 'vento_forte';
export type WeatherRiskSeverity = 'danger' | 'warning';

export interface WeatherRisk {
  type: WeatherRiskType;
  date: string;
  severity: WeatherRiskSeverity;
  title: string;
  description: string;
}

function formatDateBR(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Um risco por tipo (o primeiro dia em que ele aparece nos próximos dias)
 * — evita inundar a central de alertas com o mesmo aviso repetido dia após
 * dia da mesma previsão. */
export function deriveWeatherRisks(forecast: DailyForecast[]): WeatherRisk[] {
  const risks: WeatherRisk[] = [];
  const relevant = forecast.slice(0, LOOKAHEAD_DAYS);

  const frostDay = relevant.find((d) => d.minTempC <= FROST_MAX_TEMP_C);
  if (frostDay) {
    risks.push({
      type: 'geada',
      date: frostDay.date,
      severity: 'danger',
      title: 'Risco de geada',
      description: `Mínima de ${frostDay.minTempC.toFixed(0)}°C prevista pra ${formatDateBR(frostDay.date)} — considere recolher o gado de áreas baixas e proteger mudas sensíveis.`,
    });
  }

  const rainDay = relevant.find(
    (d) => d.precipitationSumMm >= HEAVY_RAIN_MIN_MM || d.precipitationProbabilityPct >= HEAVY_RAIN_MIN_PROBABILITY_PCT
  );
  if (rainDay) {
    risks.push({
      type: 'chuva_forte',
      date: rainDay.date,
      severity: 'warning',
      title: 'Chuva forte prevista',
      description: `${rainDay.precipitationSumMm.toFixed(0)} mm previstos pra ${formatDateBR(rainDay.date)} (${rainDay.precipitationProbabilityPct.toFixed(0)}% de chance) — segure pulverização e colheita nesse dia.`,
    });
  }

  const heatDay = relevant.find((d) => d.maxTempC >= EXTREME_HEAT_MIN_TEMP_C);
  if (heatDay) {
    risks.push({
      type: 'calor_extremo',
      date: heatDay.date,
      severity: 'warning',
      title: 'Calor extremo previsto',
      description: `Máxima de ${heatDay.maxTempC.toFixed(0)}°C prevista pra ${formatDateBR(heatDay.date)} — reforce água nos cochos e sombra pro gado.`,
    });
  }

  const windDay = relevant.find((d) => d.windSpeedMaxKmh >= STRONG_WIND_MIN_KMH);
  if (windDay) {
    risks.push({
      type: 'vento_forte',
      date: windDay.date,
      severity: 'warning',
      title: 'Vento forte previsto',
      description: `Rajadas de até ${windDay.windSpeedMaxKmh.toFixed(0)} km/h previstas pra ${formatDateBR(windDay.date)} — evite pulverização (risco de deriva).`,
    });
  }

  return risks;
}
