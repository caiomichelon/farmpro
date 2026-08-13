import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

/** Campos de desconto por umidade/impureza compartilhados entre as
 * agregações (por placa e por comprador informado na nota) — quanto peso
 * bruto virou peso líquido depois do desconto que o comprador aplicou. */
export interface QualityDiscountTotals {
  /** Soma do peso ANTES do desconto — só conta viagens que trouxeram esse
   * peso separado (senão não dá pra saber quanto foi descontado). */
  totalRawKg: number;
  /** Soma do que foi descontado (peso antes − peso líquido) nas viagens em
   * que dá pra calcular. */
  totalQualityLossKg: number;
  /** totalQualityLossKg / totalRawKg × 100 — null quando não há peso bruto
   * registrado em nenhuma viagem do grupo. */
  lossPercentage: number | null;
  /** Média da umidade (%) informada nas viagens do grupo — null quando
   * nenhuma viagem trouxe umidade. */
  avgHumidityPct: number | null;
}

export interface PlateReportRow extends QualityDiscountTotals {
  plate: string;
  trips: number;
  totalGrossKg: number;
  totalNetKg: number;
  totalSacas: number;
  drivers: string[];
}

export interface DriverReportRow {
  driver: string;
  trips: number;
  totalSacas: number;
  totalNetKg: number;
}

export interface BuyerReportRow {
  buyer: string;
  salesCount: number;
  totalSacas: number;
  totalValue: number;
  avgPricePerSaca: number;
}

/** Comprador informado direto na nota de caminhão (buyer_name), antes de
 * qualquer venda com preço ser registrada — é o que já vem pronto de uma
 * planilha com coluna "Comprador", sem precisar cadastrar venda nenhuma. */
export interface BuyerNoteReportRow extends QualityDiscountTotals {
  buyer: string;
  trips: number;
  totalSacas: number;
  totalNetKg: number;
}

/** Uma viagem/nota de caminhão individual — não agrupada, pra quem quer ver
 * exatamente quanto cada caminhão pesou em cada viagem, não só o total. */
export interface TripReportRow {
  id: string;
  plate: string;
  driver: string;
  buyer: string | null;
  harvestedAt: string;
  sacas: number;
  netKg: number;
  grossKg: number;
  /** Peso antes do desconto de umidade/impureza — null quando a planilha
   * não trouxe essa coluna separada. */
  rawNetKg: number | null;
  humidityPct: number | null;
  /** Quanto foi descontado (rawNetKg - netKg) — null quando não dá pra
   * calcular (falta o peso antes do desconto). */
  qualityLossKg: number | null;
  /** qualityLossKg / rawNetKg × 100 — null quando qualityLossKg é null. */
  qualityLossPct: number | null;
}

interface RawEntryRow {
  id: string;
  truck_plate: string | null;
  driver_name: string | null;
  buyer_name: string | null;
  gross_weight_kg: number | null;
  net_weight_kg: number | null;
  raw_net_weight_kg: number | null;
  humidity_pct: number | null;
  quantity_sacas: number;
  harvested_at: string;
}

interface RawSaleRow {
  quantity_sacas: number;
  price_per_saca: number;
  grain_buyers: { name: string } | null;
}

/** Relatório de logística de colheita — reagrupa TODOS os lançamentos já
 * feitos na fazenda (por caminhão/nota de pesagem e por venda), amarrados a
 * uma safra ou soltos direto na fazenda, por placa de caminhão, motorista e
 * comprador. Não inventa nenhum dado novo — só soma o que já foi lançado nas
 * telas de Colheita e Vendas, de um jeito fácil de olhar tudo junto. */
export function useHarvestLogisticsReport(farmId: string | undefined) {
  const [byPlate, setByPlate] = useState<PlateReportRow[]>([]);
  const [byDriver, setByDriver] = useState<DriverReportRow[]>([]);
  const [byBuyer, setByBuyer] = useState<BuyerReportRow[]>([]);
  const [byBuyerNote, setByBuyerNote] = useState<BuyerNoteReportRow[]>([]);
  const [trips, setTrips] = useState<TripReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [entriesBySeason, entriesDirect, salesBySeason, salesDirect] = await Promise.all([
        supabase
          .from('harvest_entries')
          .select(
            'id, truck_plate, driver_name, buyer_name, gross_weight_kg, net_weight_kg, raw_net_weight_kg, humidity_pct, quantity_sacas, harvested_at, plot_seasons!inner(plots!inner(farm_id))'
          )
          .eq('plot_seasons.plots.farm_id', farmId),
        supabase
          .from('harvest_entries')
          .select(
            'id, truck_plate, driver_name, buyer_name, gross_weight_kg, net_weight_kg, raw_net_weight_kg, humidity_pct, quantity_sacas, harvested_at'
          )
          .eq('farm_id', farmId),
        supabase
          .from('grain_sales')
          .select('quantity_sacas, price_per_saca, grain_buyers(name), plot_seasons!inner(plots!inner(farm_id))')
          .eq('plot_seasons.plots.farm_id', farmId),
        supabase.from('grain_sales').select('quantity_sacas, price_per_saca, grain_buyers(name)').eq('farm_id', farmId),
      ]);
      if (entriesBySeason.error) throw entriesBySeason.error;
      if (entriesDirect.error) throw entriesDirect.error;
      if (salesBySeason.error) throw salesBySeason.error;
      if (salesDirect.error) throw salesDirect.error;

      const entries = [
        ...((entriesBySeason.data ?? []) as unknown as RawEntryRow[]),
        ...((entriesDirect.data ?? []) as unknown as RawEntryRow[]),
      ];
      const sales = [
        ...((salesBySeason.data ?? []) as unknown as RawSaleRow[]),
        ...((salesDirect.data ?? []) as unknown as RawSaleRow[]),
      ];

      // Acumulador de desconto por umidade/impureza (peso bruto, quanto foi
      // descontado e a umidade informada) — usado tanto na agregação por
      // placa quanto por comprador informado na nota, então fica numa
      // função só pra não duplicar a lógica.
      interface QualityAcc {
        rawKg: number;
        qualityLossKg: number;
        humiditySum: number;
        humidityCount: number;
      }
      function newQualityAcc(): QualityAcc {
        return { rawKg: 0, qualityLossKg: 0, humiditySum: 0, humidityCount: 0 };
      }
      function accumulateQuality(acc: QualityAcc, e: RawEntryRow, netKg: number) {
        if (e.raw_net_weight_kg !== null) {
          const rawKg = Number(e.raw_net_weight_kg);
          acc.rawKg += rawKg;
          if (rawKg >= netKg) acc.qualityLossKg += rawKg - netKg;
        }
        if (e.humidity_pct !== null) {
          acc.humiditySum += Number(e.humidity_pct);
          acc.humidityCount += 1;
        }
      }
      function finishQuality(acc: QualityAcc): QualityDiscountTotals {
        return {
          totalRawKg: acc.rawKg,
          totalQualityLossKg: acc.qualityLossKg,
          lossPercentage: acc.rawKg > 0 ? (acc.qualityLossKg / acc.rawKg) * 100 : null,
          avgHumidityPct: acc.humidityCount > 0 ? acc.humiditySum / acc.humidityCount : null,
        };
      }

      const plateMap = new Map<
        string,
        { trips: number; grossKg: number; netKg: number; sacas: number; drivers: Set<string>; quality: QualityAcc }
      >();
      const driverMap = new Map<string, { trips: number; sacas: number; netKg: number }>();
      const buyerNoteMap = new Map<string, { trips: number; sacas: number; netKg: number; quality: QualityAcc }>();
      for (const e of entries) {
        const sacas = Number(e.quantity_sacas ?? 0);
        const netKg = Number(e.net_weight_kg ?? 0);
        const plate = (e.truck_plate ?? '').trim().toUpperCase();
        const driver = (e.driver_name ?? '').trim();
        const buyerNote = (e.buyer_name ?? '').trim();

        if (plate) {
          const acc = plateMap.get(plate) ?? { trips: 0, grossKg: 0, netKg: 0, sacas: 0, drivers: new Set<string>(), quality: newQualityAcc() };
          acc.trips += 1;
          acc.grossKg += Number(e.gross_weight_kg ?? 0);
          acc.netKg += netKg;
          acc.sacas += sacas;
          if (driver) acc.drivers.add(driver);
          accumulateQuality(acc.quality, e, netKg);
          plateMap.set(plate, acc);
        }

        if (driver) {
          const acc = driverMap.get(driver) ?? { trips: 0, sacas: 0, netKg: 0 };
          acc.trips += 1;
          acc.sacas += sacas;
          acc.netKg += netKg;
          driverMap.set(driver, acc);
        }

        if (buyerNote) {
          const acc = buyerNoteMap.get(buyerNote) ?? { trips: 0, sacas: 0, netKg: 0, quality: newQualityAcc() };
          acc.trips += 1;
          acc.sacas += sacas;
          acc.netKg += netKg;
          accumulateQuality(acc.quality, e, netKg);
          buyerNoteMap.set(buyerNote, acc);
        }
      }

      const buyerMap = new Map<string, { count: number; sacas: number; value: number }>();
      for (const s of sales) {
        const buyer = s.grain_buyers?.name?.trim() || 'Sem comprador definido';
        const sacas = Number(s.quantity_sacas ?? 0);
        const acc = buyerMap.get(buyer) ?? { count: 0, sacas: 0, value: 0 };
        acc.count += 1;
        acc.sacas += sacas;
        acc.value += sacas * Number(s.price_per_saca ?? 0);
        buyerMap.set(buyer, acc);
      }

      setByPlate(
        [...plateMap.entries()]
          .map(([plate, acc]) => ({
            plate,
            trips: acc.trips,
            totalGrossKg: acc.grossKg,
            totalNetKg: acc.netKg,
            totalSacas: acc.sacas,
            drivers: [...acc.drivers],
            ...finishQuality(acc.quality),
          }))
          .sort((a, b) => b.totalSacas - a.totalSacas)
      );
      setByDriver(
        [...driverMap.entries()]
          .map(([driver, acc]) => ({ driver, trips: acc.trips, totalSacas: acc.sacas, totalNetKg: acc.netKg }))
          .sort((a, b) => b.totalSacas - a.totalSacas)
      );
      setByBuyerNote(
        [...buyerNoteMap.entries()]
          .map(([buyer, acc]) => ({ buyer, trips: acc.trips, totalSacas: acc.sacas, totalNetKg: acc.netKg, ...finishQuality(acc.quality) }))
          .sort((a, b) => b.totalSacas - a.totalSacas)
      );
      setByBuyer(
        [...buyerMap.entries()]
          .map(([buyer, acc]) => ({
            buyer,
            salesCount: acc.count,
            totalSacas: acc.sacas,
            totalValue: acc.value,
            avgPricePerSaca: acc.sacas > 0 ? acc.value / acc.sacas : 0,
          }))
          .sort((a, b) => b.totalValue - a.totalValue)
      );

      // Uma linha por viagem — sem agrupar — pra quem quer conferir cada
      // caminhão individualmente, não só o total da placa. Agrupa por placa
      // e, dentro da mesma placa, ordena por data — assim as viagens de um
      // mesmo caminhão ficam juntas na planilha.
      setTrips(
        entries
          .map((e) => {
            const netKg = Number(e.net_weight_kg ?? 0);
            const rawNetKg = e.raw_net_weight_kg !== null ? Number(e.raw_net_weight_kg) : null;
            const qualityLossKg = rawNetKg !== null && rawNetKg >= netKg ? rawNetKg - netKg : null;
            const qualityLossPct = qualityLossKg !== null && rawNetKg !== null && rawNetKg > 0 ? (qualityLossKg / rawNetKg) * 100 : null;
            return {
              id: e.id,
              plate: (e.truck_plate ?? '').trim().toUpperCase() || '—',
              driver: (e.driver_name ?? '').trim() || '—',
              buyer: (e.buyer_name ?? '').trim() || null,
              harvestedAt: e.harvested_at,
              sacas: Number(e.quantity_sacas ?? 0),
              netKg,
              grossKg: Number(e.gross_weight_kg ?? 0),
              rawNetKg,
              humidityPct: e.humidity_pct !== null ? Number(e.humidity_pct) : null,
              qualityLossKg,
              qualityLossPct,
            };
          })
          .sort((a, b) => (a.plate === b.plate ? a.harvestedAt.localeCompare(b.harvestedAt) : a.plate.localeCompare(b.plate)))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o relatório.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { byPlate, byDriver, byBuyer, byBuyerNote, trips, isLoading, error, reload };
}
