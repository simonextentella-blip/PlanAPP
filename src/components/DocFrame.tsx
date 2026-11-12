import { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

export const DOC_WIDTH = 794;

/** Mostra l'HTML del preventivo esattamente come nel PDF, rimpicciolito alla larghezza disponibile. */
export function DocFrame({ html, width }: { html: string; width: number }) {
  const scale = width / DOC_WIDTH;
  const [height, setHeight] = useState(1123);
  const page = html.replace('<head>', `<head><meta name="viewport" content="width=${DOC_WIDTH}, initial-scale=${scale}, maximum-scale=${scale}, user-scalable=no">`);
  return (
    <View style={{ width, height: height * scale, backgroundColor: '#fff' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: page }}
        scrollEnabled={false}
        injectedJavaScript="window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));true;"
        onMessage={(e) => setHeight(Number(e.nativeEvent.data) || 1123)}
        style={{ backgroundColor: '#fff' }}
      />
    </View>
  );
}
