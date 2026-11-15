-- PLANAPP: notifiche dei sopralluoghi.
-- Da eseguire UNA volta in Supabase → SQL Editor → New query → incolla tutto → Run.
-- Prima va creata la funzione "planapp-notifiche" (Edge Functions), vedi le istruzioni.

-- Telefoni iscritti alle notifiche (uno per ogni telefono/browser che le attiva).
create table if not exists public.planapp_push (
  endpoint text primary key,
  subscription jsonb not null,
  email text,
  user_name text,
  updated_at timestamptz not null default now()
);
alter table public.planapp_push enable row level security;
drop policy if exists "planapp push leggi" on public.planapp_push;
drop policy if exists "planapp push aggiungi" on public.planapp_push;
drop policy if exists "planapp push modifica" on public.planapp_push;
drop policy if exists "planapp push togli" on public.planapp_push;
create policy "planapp push leggi" on public.planapp_push for select to authenticated using (public.planapp_is_team());
create policy "planapp push aggiungi" on public.planapp_push for insert to authenticated with check (public.planapp_is_team());
create policy "planapp push modifica" on public.planapp_push for update to authenticated using (public.planapp_is_team()) with check (public.planapp_is_team());
create policy "planapp push togli" on public.planapp_push for delete to authenticated using (public.planapp_is_team());

-- Chiavi delle notifiche: le crea da sola la funzione. Nessuna regola = la legge solo il server.
create table if not exists public.planapp_push_config (
  id int primary key,
  public_key text not null,
  private_key text not null
);
alter table public.planapp_push_config enable row level security;

-- Giorni in cui la notifica è già partita (così arriva una volta sola al giorno).
create table if not exists public.planapp_push_log (
  day text primary key,
  sent_at timestamptz not null default now()
);
alter table public.planapp_push_log enable row level security;

-- Sveglia: ogni ora (al minuto 5) chiama la funzione; lei manda solo dalle 7, una volta al giorno.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin
  perform cron.unschedule('planapp-notifiche');
exception when others then null; end $$;

select cron.schedule(
  'planapp-notifiche',
  '5 * * * *',
  $$ select net.http_post(
       url := 'https://esdttwlooasbgqzeskjs.supabase.co/functions/v1/planapp-notifiche',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"action": "daily"}'::jsonb
     ); $$
);
