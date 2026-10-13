import type { PlotAguadaStatus } from '../types/database';

export type AguadaFarolStatus = PlotAguadaStatus | 'sem_registro';

/** Farol da aguada — ao contrário do cocho (que vence por dias passados),
 * aqui a cor é sempre o status reportado na checagem mais recente: alguém
 * olhou e disse se está boa, precisa de atenção, ou ruim. Sem checagem
 * nenhuma ainda = sem_registro (cinza). */
export function computeAguadaFarol(lastStatus: PlotAguadaStatus | null): AguadaFarolStatus {
  return lastStatus ?? 'sem_registro';
}
