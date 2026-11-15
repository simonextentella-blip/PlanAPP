-- PLANAPP: tabelle e regole di sicurezza.
-- Prima di premere "Run" cambia le due email qui sotto (riga "insert into planapp_team").

create table if not exists public.planapp_team (
  email text primary key
);
alter table public.planapp_team enable row level security;

insert into public.planapp_team (email) values
  ('EMAIL-DI-SIMONE'),
  ('EMAIL-DEL-COLLEGA')
on conflict do nothing;

create or replace function public.planapp_is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.planapp_team where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

create table if not exists public.planapp_records (
  collection text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.planapp_records enable row level security;
alter table public.planapp_records replica identity full;

drop policy if exists "planapp leggi" on public.planapp_records;
drop policy if exists "planapp aggiungi" on public.planapp_records;
drop policy if exists "planapp modifica" on public.planapp_records;
create policy "planapp leggi" on public.planapp_records for select to authenticated using (public.planapp_is_team());
create policy "planapp aggiungi" on public.planapp_records for insert to authenticated with check (public.planapp_is_team());
create policy "planapp modifica" on public.planapp_records for update to authenticated using (public.planapp_is_team()) with check (public.planapp_is_team());

do $$ begin
  alter publication supabase_realtime add table public.planapp_records;
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public) values ('planapp-photos', 'planapp-photos', false)
on conflict (id) do nothing;

drop policy if exists "planapp foto leggi" on storage.objects;
drop policy if exists "planapp foto carica" on storage.objects;
drop policy if exists "planapp foto cancella" on storage.objects;
create policy "planapp foto leggi" on storage.objects for select to authenticated using (bucket_id = 'planapp-photos' and public.planapp_is_team());
create policy "planapp foto carica" on storage.objects for insert to authenticated with check (bucket_id = 'planapp-photos' and public.planapp_is_team());
create policy "planapp foto cancella" on storage.objects for delete to authenticated using (bucket_id = 'planapp-photos' and public.planapp_is_team());
