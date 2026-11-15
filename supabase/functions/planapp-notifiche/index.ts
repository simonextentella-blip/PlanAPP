// PLANAPP: notifiche dei sopralluoghi.
// Funzione Supabase (Edge Function) chiamata:
//  - ogni ora dal cron del database (azione "daily"): dalle 7 del mattino (ora italiana),
//    una sola volta al giorno, manda a tutti i telefoni iscritti i sopralluoghi di oggi;
//  - dall'app (azione "key"): restituisce la chiave pubblica per iscriversi alle notifiche;
//  - dall'app (azione "test"): manda una notifica di prova al telefono che la chiede.
// Le chiavi VAPID vengono create da sola la prima volta e salvate nel database
// (tabella planapp_push_config, leggibile solo dal server): nessuna chiave da copiare a mano.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const TZ = 'Europe/Rome';
const SEND_HOUR = 7;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function vapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const { data } = await db.from('planapp_push_config').select('public_key, private_key').eq('id', 1).maybeSingle();
  if (data) return { publicKey: data.public_key, privateKey: data.private_key };
  const k = webpush.generateVAPIDKeys();
  await db.from('planapp_push_config').upsert({ id: 1, public_key: k.publicKey, private_key: k.privateKey }, { onConflict: 'id', ignoreDuplicates: true });
  const again = await db.from('planapp_push_config').select('public_key, private_key').eq('id', 1).single();
  if (again.error) throw again.error;
  return { publicKey: again.data.public_key, privateKey: again.data.private_key };
}

/** Data (YYYY-MM-DD) e ora di adesso in Italia. */
function romeNow(): { day: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

interface Sub {
  endpoint: string;
  subscription: webpush.PushSubscription;
}

/** Manda la notifica a ogni iscritto; toglie gli iscritti non più validi (app tolta, permesso revocato). */
async function sendAll(subs: Sub[], payload: object): Promise<number> {
  const keys = await vapidKeys();
  webpush.setVapidDetails('https://simonextentella-blip.github.io/PlanAPP/', keys.publicKey, keys.privateKey);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify(payload), { TTL: 12 * 3600, urgency: 'high' });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('planapp_push').delete().eq('endpoint', s.endpoint);
        else console.error('push fallita', code, (e as Error).message);
      }
    }),
  );
  return sent;
}

/** Testo della notifica con i sopralluoghi di oggi, o null se non ce ne sono. */
async function todayMessage(day: string): Promise<{ title: string; body: string } | null> {
  const { data, error } = await db
    .from('planapp_records')
    .select('data')
    .eq('collection', 'items')
    .eq('deleted', false)
    .eq('data->>type', 'sopralluogo')
    .eq('data->>date', day);
  if (error) throw error;
  const visits = (data ?? []).map((r) => r.data as { title?: string; time?: string | null; done?: boolean; clientId?: string | null }).filter((v) => !v.done);
  if (visits.length === 0) return null;

  const clientIds = [...new Set(visits.map((v) => v.clientId).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (clientIds.length) {
    const cl = await db.from('planapp_records').select('id, data').eq('collection', 'clients').in('id', clientIds);
    for (const c of cl.data ?? []) names.set(c.id, (c.data as { name?: string }).name ?? '');
  }
  visits.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
  const lines = visits.map((v) => {
    const client = v.clientId ? names.get(v.clientId) : '';
    const what = [v.title?.trim(), client && !v.title?.includes(client) ? client : ''].filter(Boolean).join(' · ') || 'Sopralluogo';
    return v.time ? `${v.time} ${what}` : what;
  });
  return {
    title: visits.length === 1 ? 'Oggi hai un sopralluogo' : `Oggi hai ${visits.length} sopralluoghi`,
    body: lines.join('\n'),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'daily';

    if (action === 'key') return json({ publicKey: (await vapidKeys()).publicKey });

    if (action === 'test') {
      // Solo verso un telefono già iscritto (l'iscrizione la può fare solo chi è nel team).
      const { data } = await db.from('planapp_push').select('endpoint, subscription').eq('endpoint', String(body.endpoint ?? '')).maybeSingle();
      if (!data) return json({ error: 'Telefono non iscritto alle notifiche' }, 404);
      const { day } = romeNow();
      const msg = await todayMessage(day);
      const sent = await sendAll([data as Sub], {
        title: 'Notifiche attive ✓',
        body: msg ? `Ogni mattina alle ${SEND_HOUR} ti arrivano i sopralluoghi del giorno. Oggi:\n${msg.body}` : `Ogni mattina alle ${SEND_HOUR} ti arrivano i sopralluoghi del giorno.`,
        tag: 'planapp-test',
      });
      return json({ sent });
    }

    // daily: chiamata ogni ora dal cron; manda una volta sola, dalle 7 in poi.
    const { day, hour } = romeNow();
    if (hour < SEND_HOUR) return json({ skipped: 'troppo presto', day, hour });
    const log = await db.from('planapp_push_log').insert({ day });
    if (log.error) return json({ skipped: 'già mandate oggi', day }); // chiave doppia: già fatto
    try {
      const msg = await todayMessage(day);
      if (!msg) return json({ skipped: 'nessun sopralluogo oggi', day });
      const { data: subs } = await db.from('planapp_push').select('endpoint, subscription');
      const sent = await sendAll((subs ?? []) as Sub[], { ...msg, tag: `planapp-${day}` });
      return json({ day, sent });
    } catch (e) {
      // Qualcosa è andato storto: si riprova all'ora dopo.
      await db.from('planapp_push_log').delete().eq('day', day);
      throw e;
    }
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
