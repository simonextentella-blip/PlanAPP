/**
 * Versione web (PWA): il browser non sa creare un PDF da solo, ma la sua finestra di stampa sì.
 * Stampiamo il preventivo da un iframe nascosto: su iPhone in alto c'è il tasto Condividi
 * (WhatsApp, Mail, File…), su Android/computer si sceglie "Salva come PDF".
 * Il titolo diventa il nome del file PDF.
 */
export async function sharePdf(html: string, title: string): Promise<string> {
  const safeTitle = title.replace(/[\\/:*?"<>|]+/g, '-');
  const page = html.replace('<head>', `<head><title>${safeTitle.replace(/</g, '')}</title>`);

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return 'Non riesco ad aprire la stampa su questo browser.';
  }
  doc.open();
  doc.write(page);
  doc.close();

  // Aspetta che il logo (immagine incorporata) sia pronto, così finisce nel PDF.
  await Promise.all(
    Array.from(doc.images).map((img) => (img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r))))),
  );

  // Il titolo della pagina principale è quello che alcuni browser usano come nome del file.
  const prevTitle = document.title;
  document.title = safeTitle;
  const cleanup = () => {
    document.title = prevTitle;
    setTimeout(() => frame.remove(), 1000);
  };
  win.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(cleanup, 120000);

  win.focus();
  win.print();
  return isIos() ? 'Nella stampa tocca Condividi (in alto) per mandare il PDF su WhatsApp, Mail o salvarlo in File.' : 'Nella stampa scegli “Salva come PDF”, poi invialo da dove vuoi.';
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
