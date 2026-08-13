import { useCallback, useMemo } from 'react';

import { CATTLE_INVENTORY_CATEGORY_LABELS, CATTLE_INVENTORY_UNIT_LABELS } from '../data/cattleOptions';
import { LAVOURA_INVENTORY_CATEGORY_LABELS } from '../data/lavouraInventoryOptions';
import { computeExpirationStatus, type ExpirationStatus } from '../lib/inventoryExpiration';
import { useCattleInventoryItems } from './useCattleInventory';
import { useLavouraInventoryItems } from './useLavouraInventory';

export type FarmInventorySector = 'pecuaria' | 'lavoura';

export interface FarmInventoryItem {
  id: string;
  sector: FarmInventorySector;
  name: string;
  categoryLabel: string;
  unitLabel: string;
  currentQuantity: number;
  unitCost: number | null;
  totalValue: number | null;
  minQuantity: number | null;
  stockStatus: 'ok' | 'baixo' | 'critico' | 'sem_alerta';
  expirationDate: string | null;
  expirationStatus: ExpirationStatus;
  supplierId: string | null;
  photoUrl: string | null;
  location: string | null;
}

/** Junta o estoque da Pecuária e da Lavoura numa lista só — pra ter uma
 * visão consolidada de tudo que a fazenda tem guardado, com valor total,
 * alertas de estoque baixo e de validade vencendo, num lugar só (em vez de
 * ter que entrar em dois hubs diferentes pra montar esse quadro na
 * cabeça). Não junta as tabelas no banco — cada setor continua com sua
 * própria tela de cadastro/movimentação, só a leitura é consolidada aqui. */
export function useFarmInventory(farmId: string | undefined) {
  const cattle = useCattleInventoryItems(farmId);
  const lavoura = useLavouraInventoryItems(farmId);

  const items: FarmInventoryItem[] = useMemo(() => {
    const cattleItems: FarmInventoryItem[] = cattle.items.map((i) => ({
      id: i.id,
      sector: 'pecuaria',
      name: i.name,
      categoryLabel: CATTLE_INVENTORY_CATEGORY_LABELS[i.category],
      unitLabel: CATTLE_INVENTORY_UNIT_LABELS[i.unit],
      currentQuantity: i.currentQuantity,
      unitCost: i.unit_cost !== null ? Number(i.unit_cost) : null,
      totalValue: i.unit_cost !== null ? Number(i.unit_cost) * i.currentQuantity : null,
      minQuantity: i.min_quantity !== null ? Number(i.min_quantity) : null,
      stockStatus: i.stockStatus,
      expirationDate: i.expiration_date,
      expirationStatus: computeExpirationStatus(i.expiration_date),
      supplierId: i.supplier_id,
      photoUrl: i.photo_url,
      location: i.location,
    }));
    const lavouraItems: FarmInventoryItem[] = lavoura.items.map((i) => ({
      id: i.id,
      sector: 'lavoura',
      name: i.name,
      categoryLabel: LAVOURA_INVENTORY_CATEGORY_LABELS[i.category],
      unitLabel: CATTLE_INVENTORY_UNIT_LABELS[i.unit],
      currentQuantity: i.currentQuantity,
      unitCost: i.unit_cost !== null ? Number(i.unit_cost) : null,
      totalValue: i.unit_cost !== null ? Number(i.unit_cost) * i.currentQuantity : null,
      minQuantity: i.min_quantity !== null ? Number(i.min_quantity) : null,
      stockStatus: i.stockStatus,
      expirationDate: i.expiration_date,
      expirationStatus: computeExpirationStatus(i.expiration_date),
      supplierId: i.supplier_id,
      photoUrl: i.photo_url,
      location: i.location,
    }));
    return [...cattleItems, ...lavouraItems].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [cattle.items, lavoura.items]);

  const totalValue = items.reduce((sum, i) => sum + (i.totalValue ?? 0), 0);
  const lowStockCount = items.filter((i) => i.stockStatus === 'baixo' || i.stockStatus === 'critico').length;
  const expiringCount = items.filter((i) => i.expirationStatus === 'vencendo').length;
  const expiredCount = items.filter((i) => i.expirationStatus === 'vencido').length;

  const isLoading = cattle.isLoading || lavoura.isLoading;
  const error = cattle.error ?? lavoura.error;

  const reload = useCallback(async () => {
    await Promise.all([cattle.reload(), lavoura.reload()]);
  }, [cattle.reload, lavoura.reload]);

  return { items, totalValue, lowStockCount, expiringCount, expiredCount, isLoading, error, reload };
}
