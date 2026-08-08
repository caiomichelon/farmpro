// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx');

import { safeFileSlug, saveAndShareWorkbook } from './xlsxFile';

/** Exporta exatamente o que está numa DataTable (colunas + linhas já
 * formatadas como texto) pra um .xlsx de uma aba só — o "botão do lado da
 * planilha" que gera a planilha de Excel com os dados daquela tela. */
export async function exportRowsToXlsx(title: string, headers: string[], rows: string[][]): Promise<void> {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31) || 'Planilha');

  const fileName = `farmpro-${safeFileSlug(title)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  await saveAndShareWorkbook(workbook, fileName);
}
