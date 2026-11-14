// Versione web (PWA): usa la Contact Picker API del browser.
// Funziona su Chrome per Android; su iPhone (Safari) e computer non esiste, quindi il pulsante resta nascosto.

type BrowserContact = { name?: string[]; tel?: string[]; email?: string[] };
type ContactsManager = { select(props: string[], opts?: { multiple?: boolean }): Promise<BrowserContact[]> };

function manager(): ContactsManager | undefined {
  return typeof navigator !== 'undefined' ? (navigator as unknown as { contacts?: ContactsManager }).contacts : undefined;
}

export const CAN_IMPORT_CONTACTS = !!manager();

export type PickedContact = { name: string; phone: string; email: string };

export async function pickContact(): Promise<PickedContact | null> {
  const m = manager();
  if (!m) throw new Error('Per importare un cliente serve il permesso ai contatti. Su questo telefono il browser non lo consente.');
  const [c] = await m.select(['name', 'tel', 'email'], { multiple: false });
  if (!c) return null;
  const first = (a?: string[]) => (a ?? []).map((s) => s.trim()).find(Boolean) ?? '';
  return { name: first(c.name), phone: first(c.tel), email: first(c.email) };
}
