import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

export type UniversalSearchResultType = 'animal' | 'lot' | 'cow' | 'plot' | 'employee';

export interface UniversalSearchResult {
  type: UniversalSearchResultType;
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

const TYPE_LABELS: Record<UniversalSearchResultType, string> = {
  animal: 'Animal (Corte)',
  lot: 'Lote (Corte)',
  cow: 'Matriz (Cria)',
  plot: 'Talhão (Lavoura)',
  employee: 'Funcionário',
};

export { TYPE_LABELS };

/** Busca simultânea em animais, lotes, matrizes, talhões e funcionários da
 * fazenda — uma lupa só pra achar qualquer coisa, sem precisar saber em
 * qual setor está. Só dispara com 2+ caracteres, com debounce leve. */
export function useUniversalSearch(farmId: string | undefined, query: string) {
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!farmId || trimmed.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const like = `%${trimmed}%`;
        const [animals, lots, cows, plots, employees] = await Promise.all([
          supabase.from('cattle_animals').select('id, tag_number').eq('farm_id', farmId).ilike('tag_number', like).limit(5),
          supabase.from('cattle_lots').select('id, name').eq('farm_id', farmId).ilike('name', like).limit(5),
          supabase.from('breeding_cows').select('id, identification').eq('farm_id', farmId).ilike('identification', like).limit(5),
          supabase.from('plots').select('id, name').eq('farm_id', farmId).ilike('name', like).limit(5),
          supabase.from('employees').select('id, full_name, role').eq('farm_id', farmId).ilike('full_name', like).limit(5),
        ]);

        if (cancelled) return;

        const combined: UniversalSearchResult[] = [
          ...(animals.data ?? []).map((a) => ({
            type: 'animal' as const,
            id: a.id,
            label: a.tag_number,
            sublabel: TYPE_LABELS.animal,
            href: `/farms/${farmId}/pecuaria/corte/animal/${a.id}`,
          })),
          ...(lots.data ?? []).map((l) => ({
            type: 'lot' as const,
            id: l.id,
            label: l.name,
            sublabel: TYPE_LABELS.lot,
            href: `/farms/${farmId}/pecuaria/corte/lote/${l.id}`,
          })),
          ...(cows.data ?? []).map((c) => ({
            type: 'cow' as const,
            id: c.id,
            label: c.identification,
            sublabel: TYPE_LABELS.cow,
            href: `/farms/${farmId}/pecuaria/cria/matriz/${c.id}`,
          })),
          ...(plots.data ?? []).map((p) => ({
            type: 'plot' as const,
            id: p.id,
            label: p.name,
            sublabel: TYPE_LABELS.plot,
            href: `/farms/${farmId}/lavoura/talhao/${p.id}`,
          })),
          ...(employees.data ?? []).map((e) => ({
            type: 'employee' as const,
            id: e.id,
            label: e.full_name,
            sublabel: `${TYPE_LABELS.employee} · ${e.role}`,
            href: `/farms/${farmId}/funcionarios/funcionario/${e.id}`,
          })),
        ];

        setResults(combined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [farmId, query]);

  return { results, isLoading };
}
