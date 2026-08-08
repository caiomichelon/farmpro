/** Tenta extrair um número de uma célula já formatada pra exibição (ex.:
 * "R$ 1.234,56", "30.00 kg/dia", "12.3%", "180 dias", "—"). Não é uma
 * validação rigorosa — é heurística o bastante pra decidir "essa coluna dá
 * pra virar gráfico" a partir do texto que a própria DataTable já mostra,
 * sem precisar duplicar o valor bruto em cada tela. */
export function parseNumericCell(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;

  if (trimmed.includes('R$')) {
    // Formato pt-BR: ponto separa milhar, vírgula é decimal.
    const cleaned = trimmed.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const match = trimmed.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

export interface ChartableColumn {
  key: string;
  label: string;
}

/** Colunas cujo texto renderizado é numérico na maioria das linhas —
 * candidatas a virar eixo de valor num gráfico. Pula a primeira coluna
 * (convenção do app: sempre é o identificador/nome da linha, o rótulo). */
export function findChartableColumns<T>(
  columns: { key: string; label: string; render: (row: T) => string }[],
  data: T[]
): ChartableColumn[] {
  if (data.length === 0) return [];
  const sample = data.slice(0, 30);

  return columns.slice(1).filter((col) => {
    const values = sample.map((row) => parseNumericCell(col.render(row)));
    const numericCount = values.filter((v) => v !== null).length;
    return numericCount >= Math.ceil(sample.length * 0.6);
  });
}
