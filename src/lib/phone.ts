import { Linking, Platform } from 'react-native';

/** Numero pulito per chiamate e SMS: solo cifre e un eventuale "+" iniziale. */
export function dialable(phone: string): string {
  const t = phone.trim();
  const digits = t.replace(/\D/g, '');
  if (t.startsWith('+')) return '+' + digits;
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  return digits;
}

/** Numero in formato internazionale senza "+", come lo vuole WhatsApp. Senza prefisso si assume l'Italia (+39). */
export function international(phone: string): string {
  const d = dialable(phone);
  if (d.startsWith('+')) return d.slice(1);
  return d.startsWith('39') && d.length > 10 ? d : '39' + d;
}

export type PhoneAction = 'call' | 'sms' | 'whatsapp';

export function phoneUrl(action: PhoneAction, phone: string): string {
  if (action === 'call') return `tel:${dialable(phone)}`;
  if (action === 'sms') return `sms:${dialable(phone)}`;
  return `https://wa.me/${international(phone)}`;
}

/** Apre il telefono, i messaggi o WhatsApp. Nel browser (PWA) tel: e sms: si aprono nella stessa finestra. */
export async function openPhone(action: PhoneAction, phone: string): Promise<boolean> {
  const url = phoneUrl(action, phone);
  try {
    if (Platform.OS === 'web') {
      if (action === 'whatsapp') window.open(url, '_blank', 'noopener');
      else window.location.href = url;
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
