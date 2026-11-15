import { supabase } from './supabase';
import type { PushState } from './push';

export type { PushState } from './push';

/**
 * Notifiche dei sopralluoghi nell'app web (PWA).
 * Il telefono si iscrive con il service worker (public/sw.js) e l'iscrizione viene salvata
 * in Supabase (tabella planapp_push). Ogni mattina la funzione "planapp-notifiche" manda
 * a tutti gli iscritti i sopralluoghi del giorno.
 * Su iPhone funziona solo se l'app è aperta dall'icona sulla schermata Home (iOS 16.4 o più).
 */
const FN = 'planapp-notifiche';
const KEY_CACHE = 'planapp.push.key.v1';

const supported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const standalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return navigator.serviceWorker.ready;
}

async function publicKey(): Promise<string> {
  try {
    const cached = localStorage.getItem(KEY_CACHE);
    if (cached) return cached;
  } catch {}
  if (!supabase) throw new Error('App non collegata');
  const { data, error } = await supabase.functions.invoke(FN, { body: { action: 'key' } });
  if (error || !data?.publicKey) throw new Error('chiave');
  try {
    localStorage.setItem(KEY_CACHE, data.publicKey);
  } catch {}
  return data.publicKey;
}

function keyBytes(b64url: string): Uint8Array {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function save(sub: PushSubscription, email: string, userName: string) {
  if (!supabase) return;
  const json = sub.toJSON();
  const { error } = await supabase
    .from('planapp_push')
    .upsert({ endpoint: sub.endpoint, subscription: json, email, user_name: userName, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function pushState(): Promise<PushState> {
  if (!supabase) return 'unsupported';
  if (isIOS() && !standalone()) return 'install';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await registration();
  if (!reg) return 'unsupported';
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Chiede il permesso e iscrive questo telefono. Restituisce un messaggio d'errore o null. */
export async function enablePush(email: string, userName: string): Promise<string | null> {
  try {
    // Il permesso va chiesto subito, dentro il tocco del pulsante (lo vuole iPhone).
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'Permesso negato: senza permesso le notifiche non possono arrivare.';
    const reg = await registration();
    if (!reg) return 'Questo browser non supporta le notifiche.';
    const key = await publicKey();
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      // Iscrizione vecchia fatta con un'altra chiave: si rifà.
      const cur = sub.options?.applicationServerKey;
      if (cur && btoaBytes(new Uint8Array(cur)) !== btoaBytes(keyBytes(key))) {
        await sub.unsubscribe();
        sub = null;
      }
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) as BufferSource });
    await save(sub, email, userName);
    return null;
  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    if (m === 'chiave') return 'Il servizio notifiche non risponde: va prima creata la funzione su Supabase.';
    if (m.toLowerCase().includes('fetch') || m.toLowerCase().includes('network')) return 'Nessuna connessione. Riprova quando c’è campo.';
    return `Non sono riuscito ad attivare le notifiche (${m}).`;
  }
}

const btoaBytes = (b: Uint8Array) => btoa(String.fromCharCode(...b));

export async function disablePush(): Promise<void> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase?.from('planapp_push').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Manda una notifica di prova a questo telefono. */
export async function testPush(): Promise<string | null> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub || !supabase) return 'Prima attiva le notifiche.';
  const { data, error } = await supabase.functions.invoke(FN, { body: { action: 'test', endpoint: sub.endpoint } });
  if (error) return 'La prova non è partita. Riprova tra poco.';
  return data?.sent ? null : 'La prova non è arrivata: disattiva e riattiva le notifiche.';
}

/** All'apertura dell'app: se le notifiche sono attive, ricorda il telefono al server (nome aggiornato). */
export async function refreshPush(email: string, userName: string): Promise<void> {
  try {
    if (!supported() || Notification.permission !== 'granted') return;
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await save(sub, email, userName);
  } catch {}
}
