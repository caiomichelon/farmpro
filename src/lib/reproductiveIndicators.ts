/** Taxa de desmame por ano de parto: dos partos registrados naquele ano,
 * quantos já têm desmame lançado. Não pondera por número de bezerros
 * (calf_count) — conta por parto, que é como o desmame é registrado. */

export interface CalvingInput {
  id: string;
  calving_date: string;
}

export interface WeaningInput {
  calving_id: string;
}

export interface WeaningRateByYear {
  year: number;
  totalCalvings: number;
  totalWeaned: number;
  weaningRatePct: number;
}

export interface WeaningRateOverall {
  totalCalvings: number;
  totalWeaned: number;
  weaningRatePct: number | null;
  byYear: WeaningRateByYear[];
}

export function computeWeaningRate(calvings: CalvingInput[], weanings: WeaningInput[]): WeaningRateOverall {
  const weanedCalvingIds = new Set(weanings.map((w) => w.calving_id));

  const byYearMap = new Map<number, { totalCalvings: number; totalWeaned: number }>();
  for (const c of calvings) {
    const year = new Date(c.calving_date).getFullYear();
    const entry = byYearMap.get(year) ?? { totalCalvings: 0, totalWeaned: 0 };
    entry.totalCalvings += 1;
    if (weanedCalvingIds.has(c.id)) entry.totalWeaned += 1;
    byYearMap.set(year, entry);
  }

  const byYear: WeaningRateByYear[] = Array.from(byYearMap.entries())
    .map(([year, v]) => ({
      year,
      totalCalvings: v.totalCalvings,
      totalWeaned: v.totalWeaned,
      weaningRatePct: (v.totalWeaned / v.totalCalvings) * 100,
    }))
    .sort((a, b) => b.year - a.year);

  const totalCalvings = calvings.length;
  const totalWeaned = calvings.filter((c) => weanedCalvingIds.has(c.id)).length;

  return {
    totalCalvings,
    totalWeaned,
    weaningRatePct: totalCalvings > 0 ? (totalWeaned / totalCalvings) * 100 : null,
    byYear,
  };
}
