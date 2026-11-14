import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { Platform } from 'react-native';

/** La rubrica del telefono esiste solo su iPhone e Android, non nell'anteprima web. */
export const CAN_IMPORT_CONTACTS = Platform.OS === 'ios' || Platform.OS === 'android';

export type PickedContact = { name: string; phone: string; email: string };

/** Preferisce il cellulare, poi il primo numero disponibile. */
function bestPhone(phones: { label?: string; number?: string }[] = []): string {
  const valid = phones.filter((p) => p.number?.trim());
  const mobile = valid.find((p) => /mobile|cell|iphone/i.test(p.label ?? ''));
  return (mobile ?? valid[0])?.number?.trim() ?? '';
}

/**
 * Apre la rubrica del telefono e restituisce nome, telefono ed email del contatto scelto.
 * Restituisce `null` se l'utente annulla. Lancia un errore con un messaggio in italiano se non è possibile.
 */
export async function pickContact(): Promise<PickedContact | null> {
  const perm = await requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Per importare un cliente serve il permesso ai contatti. Puoi attivarlo nelle Impostazioni del telefono.');
  }
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const d = await contact.getDetails([
    ContactField.FULL_NAME,
    ContactField.GIVEN_NAME,
    ContactField.FAMILY_NAME,
    ContactField.COMPANY,
    ContactField.PHONES,
    ContactField.EMAILS,
  ] as const);
  const name = (d.fullName || [d.givenName, d.familyName].filter(Boolean).join(' ') || d.company || '').trim();
  return { name, phone: bestPhone(d.phones ?? []), email: d.emails?.find((e) => e.address?.trim())?.address?.trim() ?? '' };
}
