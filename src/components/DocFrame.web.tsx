import { createElement, useState } from 'react';
import { View } from 'react-native';

export const DOC_WIDTH = 794;

/** Versione web: iframe con lo stesso HTML del PDF, rimpicciolito alla larghezza disponibile. */
export function DocFrame({ html, width }: { html: string; width: number }) {
  const scale = width / DOC_WIDTH;
  const [height, setHeight] = useState(Math.round(1123 * scale));
  const page = html.replace('</head>', `<style>html{zoom:${scale};overflow:hidden}</style></head>`);
  return (
    <View style={{ width, height, backgroundColor: '#fff' }}>
      {createElement('iframe', {
        srcDoc: page,
        title: 'Preventivo',
        scrolling: 'no',
        onLoad: (e: { currentTarget: HTMLIFrameElement }) => {
          const doc = e.currentTarget.contentDocument;
          if (doc) setHeight(doc.documentElement.scrollHeight + 2);
        },
        style: { width, height, border: 0, display: 'block' },
      })}
    </View>
  );
}
