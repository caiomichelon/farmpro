/** Estimativa educativa de crédito de carbono — combina práticas que a
 * fazenda já usa (plantio direto, cultura de cobertura, pastejo rotacionado,
 * manejo de dejetos) com a área/rebanho já cadastrados no app, usando
 * fatores de referência publicados (faixas conservadoras do Plano ABC/
 * Embrapa pra agricultura de baixo carbono no Brasil).
 *
 * IMPORTANTE: isso é uma ORDEM DE GRANDEZA pra o produtor entender o
 * potencial, não um número certificável. Créditos de carbono de verdade só
 * saem depois de medição e auditoria por uma certificadora (Verra, Gold
 * Standard etc.) — o app deixa isso explícito na tela, não só aqui. */

export interface CarbonPracticeInput {
  usesNoTill: boolean;
  usesCoverCrop: boolean;
  usesRotationalGrazing: boolean;
  usesManureManagement: boolean;
  lavouraHectares: number;
  pecuariaHectares: number;
  pecuariaHeadCount: number;
}

export interface CarbonEstimateLine {
  id: string;
  label: string;
  tCO2ePerYear: number;
}

export interface CarbonEstimateResult {
  lines: CarbonEstimateLine[];
  totalTCO2ePerYear: number;
}

// tCO2e por hectare/ano (ou por cabeça/ano) — faixas conservadoras da
// literatura de agricultura de baixo carbono, não específicas de bioma.
const FACTOR_NO_TILL_PER_HA = 0.5;
const FACTOR_COVER_CROP_PER_HA = 0.3;
const FACTOR_ROTATIONAL_GRAZING_PER_HA = 0.4;
const FACTOR_MANURE_MANAGEMENT_PER_HEAD = 0.05;

export function buildCarbonEstimate(input: CarbonPracticeInput): CarbonEstimateResult {
  const lines: CarbonEstimateLine[] = [];

  if (input.usesNoTill && input.lavouraHectares > 0) {
    lines.push({
      id: 'no_till',
      label: 'Plantio direto',
      tCO2ePerYear: input.lavouraHectares * FACTOR_NO_TILL_PER_HA,
    });
  }
  if (input.usesCoverCrop && input.lavouraHectares > 0) {
    lines.push({
      id: 'cover_crop',
      label: 'Cultura de cobertura',
      tCO2ePerYear: input.lavouraHectares * FACTOR_COVER_CROP_PER_HA,
    });
  }
  if (input.usesRotationalGrazing && input.pecuariaHectares > 0) {
    lines.push({
      id: 'rotational_grazing',
      label: 'Pastejo rotacionado',
      tCO2ePerYear: input.pecuariaHectares * FACTOR_ROTATIONAL_GRAZING_PER_HA,
    });
  }
  if (input.usesManureManagement && input.pecuariaHeadCount > 0) {
    lines.push({
      id: 'manure_management',
      label: 'Manejo de dejetos',
      tCO2ePerYear: input.pecuariaHeadCount * FACTOR_MANURE_MANAGEMENT_PER_HEAD,
    });
  }

  return {
    lines,
    totalTCO2ePerYear: lines.reduce((sum, l) => sum + l.tCO2ePerYear, 0),
  };
}
