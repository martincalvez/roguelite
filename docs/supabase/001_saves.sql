-- Sauvegarde cloud : une ligne par joueur. À coller dans Supabase → SQL Editor (une seule fois).
-- Ce fichier ne contient AUCUN secret : le schéma et les règles d'accès (RLS) sont publics sans danger.

create table if not exists public.saves (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  data              jsonb   not null,              -- la sauvegarde du jeu (SaveData)
  save_version      integer not null,              -- version du format (SAVE_VERSION)
  client_updated_at bigint  not null,              -- horodatage du joueur en ms (« la plus récente gagne »)
  updated_at        timestamptz not null default now(),  -- horodatage serveur, fiable
  constraint saves_data_size check (octet_length(data::text) <= 200000)  -- 200 Ko max : pas d'abus
);

-- Sécurité : tout est interdit par défaut, puis on autorise chaque joueur sur SA ligne uniquement.
alter table public.saves enable row level security;

drop policy if exists "saves_select_own" on public.saves;
drop policy if exists "saves_insert_own" on public.saves;
drop policy if exists "saves_update_own" on public.saves;
drop policy if exists "saves_delete_own" on public.saves;

create policy "saves_select_own" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "saves_insert_own" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "saves_update_own" on public.saves
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "saves_delete_own" on public.saves
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Aucun accès pour les visiteurs non connectés (rôle anon), même avec la clé publique.
revoke all on public.saves from anon;
grant select, insert, update, delete on public.saves to authenticated;

-- Horodatage serveur mis à jour à chaque modification.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saves_set_updated_at on public.saves;
create trigger saves_set_updated_at before update on public.saves
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- VÉRIFICATIONS à lancer après la création (chacune doit donner le résultat indiqué)
-- ---------------------------------------------------------------------------------------------
-- 1. La RLS est bien active (attendu : rowsecurity = true)
--      select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'saves';
-- 2. Les 4 politiques existent (attendu : 4 lignes, toutes « authenticated »)
--      select policyname, cmd, roles from pg_policies where tablename = 'saves';
-- 3. Un visiteur non connecté ne peut rien lire (attendu : « permission denied for table saves »)
--      begin; set local role anon; select * from public.saves; rollback;
-- 4. Isolation entre joueurs : à tester dans le jeu avec DEUX comptes (le joueur B ne doit jamais voir
--    ni modifier la sauvegarde du joueur A).
