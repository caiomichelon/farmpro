import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Gera um PDF a partir de HTML e compartilha (nativo) ou abre o diálogo de
 * impressão do navegador (web — não há como gerar um arquivo .pdf direto no
 * browser com o expo-print, então a saída ali é "Salvar como PDF" pela
 * própria caixa de impressão do sistema). Compartilhado por todos os
 * relatórios do app (banco, lote etc.) — só muda o HTML e o título da
 * caixa de compartilhamento. */
export async function generatePdfReport(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });
  }
}
