export type ForageStatus = 'sem_registro' | 'em_dia' | 'proximo' | 'atrasado';

export interface ForageFarol {
  status: ForageStatus;
  heightCm: number | null;
  minHeightCm: number;
}

/** Diferente do cocho (que compara dias), aqui comparamos a altura medida
 * na última checagem com a altura mínima configurada no piquete. Uma folga
 * de 20% acima do mínimo ainda é "proximo" (perto de precisar de manejo). */
export function computeForageFarol(lastHeightCm: number | null, minHeightCm: number): ForageFarol {
  if (lastHeightCm === null) {
    return { status: 'sem_registro', heightCm: null, minHeightCm };
  }
  let status: ForageStatus;
  if (lastHeightCm < minHeightCm) status = 'atrasado';
  else if (lastHeightCm < minHeightCm * 1.2) status = 'proximo';
  else status = 'em_dia';
  return { status, heightCm: lastHeightCm, minHeightCm };
}
