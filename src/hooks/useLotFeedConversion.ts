import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

export interface LotFeedConversion {
  /** Kg de ração baixados do estoque com destino a este lote (soma das
   * saídas de itens categoria "ração" em unidade kg — saídas em outra
   * unidade, ex. saco, não entram na conta porque não dá pra converter
   * sem saber o peso do saco cadastrado). */
  totalKgRacao: number;
  /** Kg de peso vivo ganho pelo lote (peso atual - peso de entrada) ×
   * cabeças atuais — a mesma aproximação já usada no cálculo de @
   * estimadas do lote. */
  totalKgGanho: number;
  /** kg de ração / kg de peso ganho — quanto menor, mais eficiente.
   * Null quando ainda não há ganho de peso registrado pra dividir. */
  conversionRatio: number | null;
  /** true quando existem saídas de ração pro lote em unidade diferente de
   * kg (ex. "saco") que não entraram na soma — aviso pro usuário, não erro. */
  hasNonKgMovements: boolean;
}

/** Conversão alimentar de um lote de corte: kg de ração consumida por kg de
 * peso vivo ganho. Usa as movimentações de saída de estoque já lançadas
 * com esse lote selecionado — não precisa de nenhuma tela nova pra
 * registrar dado, só lê o que já existe. */
export function useLotFeedConversion(farmId: string | undefined, lotId: string | undefined, kgGanho: number) {
  const [data, setData] = useState<LotFeedConversion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId || !lotId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: racaoItems, error: itemsError } = await supabase
        .from('cattle_inventory_items')
        .select('id, unit')
        .eq('farm_id', farmId)
        .eq('category', 'racao');
      if (itemsError) throw itemsError;

      const racaoItemIds = (racaoItems ?? []).map((i) => i.id);
      if (racaoItemIds.length === 0) {
        setData({ totalKgRacao: 0, totalKgGanho: kgGanho, conversionRatio: null, hasNonKgMovements: false });
        return;
      }

      const { data: movements, error: movementsError } = await supabase
        .from('cattle_inventory_movements')
        .select('item_id, quantity')
        .eq('lot_id', lotId)
        .eq('type', 'saida')
        .in('item_id', racaoItemIds);
      if (movementsError) throw movementsError;

      const unitByItemId = new Map((racaoItems ?? []).map((i) => [i.id, i.unit]));
      let totalKgRacao = 0;
      let hasNonKgMovements = false;
      for (const m of movements ?? []) {
        if (unitByItemId.get(m.item_id) === 'kg') {
          totalKgRacao += Number(m.quantity);
        } else {
          hasNonKgMovements = true;
        }
      }

      setData({
        totalKgRacao,
        totalKgGanho: kgGanho,
        conversionRatio: kgGanho > 0 ? totalKgRacao / kgGanho : null,
        hasNonKgMovements,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível calcular a conversão alimentar.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId, lotId, kgGanho]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, isLoading, error, reload };
}
