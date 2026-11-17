import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** App installata (iOS/Android): crea il PDF e apre il foglio di condivisione. Ritorna un messaggio da mostrare, o ''. */
export async function sharePdf(html: string, title: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) return 'Condivisione non disponibile su questo dispositivo.';
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
  return '';
}
