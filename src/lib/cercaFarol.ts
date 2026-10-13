import type { PlotCercaStatus } from '../types/database';

export type CercaFarolStatus = PlotCercaStatus | 'sem_registro';

export function computeCercaFarol(lastStatus: PlotCercaStatus | null): CercaFarolStatus {
  return lastStatus ?? 'sem_registro';
}
