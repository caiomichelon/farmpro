/** Gamificação leve do ponto digital — sequência de dias com pelo menos uma
 * batida registrada, e selos por marcos alcançados. Tudo derivado do
 * histórico de `time_entries` já carregado, sem tabela nova. */

export interface EmployeeGamificationBadge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  achieved: boolean;
}

export interface EmployeeGamificationResult {
  currentStreakDays: number;
  longestStreakDays: number;
  totalDaysWorked: number;
  badges: EmployeeGamificationBadge[];
}

const STREAK_MILESTONES = [
  { days: 7, emoji: '🔥', label: '1 semana em dia' },
  { days: 30, emoji: '🥉', label: '1 mês em dia' },
  { days: 90, emoji: '🥈', label: '3 meses em dia' },
  { days: 180, emoji: '🥇', label: 'Meio ano em dia' },
  { days: 365, emoji: '🏆', label: '1 ano em dia' },
];

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / msPerDay);
}

/** Recebe os registros de ponto (qualquer ordem) e devolve a sequência
 * atual, a maior sequência já alcançada, e os selos batidos. */
export function buildEmployeeGamification(entries: { recorded_at: string }[]): EmployeeGamificationResult {
  const distinctDays = Array.from(new Set(entries.map((e) => dateKey(e.recorded_at)))).sort();

  if (distinctDays.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      totalDaysWorked: 0,
      badges: STREAK_MILESTONES.map((m) => ({
        id: `streak-${m.days}`,
        emoji: m.emoji,
        label: m.label,
        description: `${m.days} dias seguidos com ponto batido`,
        achieved: false,
      })),
    };
  }

  // Maior sequência: percorre os dias distintos em ordem, quebrando quando
  // há um "buraco" de mais de 1 dia entre uma batida e a próxima.
  let longestStreakDays = 1;
  let runLength = 1;
  for (let i = 1; i < distinctDays.length; i++) {
    const gap = daysBetween(distinctDays[i], distinctDays[i - 1]);
    if (gap === 1) {
      runLength++;
    } else {
      runLength = 1;
    }
    longestStreakDays = Math.max(longestStreakDays, runLength);
  }

  // Sequência atual: só conta se o último dia registrado foi hoje ou ontem —
  // senão a sequência já quebrou e ninguém bateu ponto de novo ainda.
  const todayKey = dateKey(new Date().toISOString());
  const lastDay = distinctDays[distinctDays.length - 1];
  const gapToToday = daysBetween(todayKey, lastDay);

  let currentStreakDays = 0;
  if (gapToToday <= 1) {
    currentStreakDays = 1;
    for (let i = distinctDays.length - 1; i > 0; i--) {
      const gap = daysBetween(distinctDays[i], distinctDays[i - 1]);
      if (gap === 1) {
        currentStreakDays++;
      } else {
        break;
      }
    }
  }

  const badges: EmployeeGamificationBadge[] = STREAK_MILESTONES.map((m) => ({
    id: `streak-${m.days}`,
    emoji: m.emoji,
    label: m.label,
    description: `${m.days} dias seguidos com ponto batido`,
    achieved: longestStreakDays >= m.days,
  }));

  return {
    currentStreakDays,
    longestStreakDays,
    totalDaysWorked: distinctDays.length,
    badges,
  };
}
