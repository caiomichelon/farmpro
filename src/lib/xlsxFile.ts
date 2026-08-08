import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx');

/** Escreve um workbook XLSX em disco e abre o compartilhar do sistema (ou
 * baixa direto, no navegador). Compartilhado entre a exportação completa da
 * fazenda e a exportação de uma planilha individual. */
export async function saveAndShareWorkbook(workbook: unknown, fileName: string): Promise<void> {
  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

  if (Platform.OS === 'web') {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = `${cacheDirectory}${fileName}`;
  await writeAsStringAsync(fileUri, base64, { encoding: EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar dados do FarmPro',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }
}

// Faixa Unicode "Combining Diacritical Marks" (U+0300–U+036F) construída via
// código-ponto (\u escape), não como caractere literal no arquivo — assim
// não depende de como o editor mostra/salva marcas combinantes invisíveis.
const DIACRITICS_PATTERN = /[̀-ͯ]/g;

/** Nome de arquivo seguro (sem acento/espaço) pra download/compartilhamento. */
export function safeFileSlug(name: string): string {
  const stripped = name.normalize('NFD').replace(DIACRITICS_PATTERN, '').replace(/[^a-zA-Z0-9]+/g, '-');
  return stripped || 'planilha';
}
