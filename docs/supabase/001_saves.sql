-- Sauvegarde cloud : une ligne par joueur. À coller dans Supabase → SQL Editor (une seule fois).
-- Ce fichier ne contient AUCUN secret : le schéma et les règles d'accès (RLS) sont publics sans danger.
--
-- Principes :
--   * chaque joueur connecté ne lit, n'écrit et ne supprime que SA ligne (RLS) ;
--   * updated_at et revision sont fixés PAR LE SERVEUR (trigger), jamais par le client ;
--   * revision augmente de 1 à chaque écriture : le jeu s'en sert pour détecter qu'un autre appareil
--     a écrit entre-temps (écriture conditionnelle : « update ... where revision = <celle que je connais> »).

create table if not exists public.saves (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  data         jsonb       not null,                 -- la sauvegarde du jeu (SaveData)
  save_version integer     not null,                 -- version du format (SAVE_VERSION)
  revision     integer     not null default 1,       -- compteur d'écritures, géré par le trigger
  updated_at   timestamptz not null default now(),   -- horodatage serveur, géré par le trigger
  constraint saves_data_size check (octet_length(data::text) <= 200000),  -- 200 Ko max : pas d'abus
  constraint saves_revision_positive check (revision >= 1)
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

-- Valeurs serveur : le client ne peut ni choisir revision ni updated_at, ni changer le propriétaire de la ligne.
create or replace function public.saves_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
  else
    new.user_id  := old.user_id;
    new.revision := old.revision + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists saves_before_write on public.saves;
create trigger saves_before_write
  before insert or update on public.saves
  for each row execute function public.saves_before_write();

-- ---------------------------------------------------------------------------------------------
-- Utilisation côté jeu (pour mémoire, rien à lancer ici)
--   Première écriture : insert (user_id, data, save_version). Si la ligne existe déjà (erreur 23505),
--     un autre appareil est passé avant : on refait la décision de synchro.
--   Écriture suivante : update ... set data, save_version where user_id = <moi> and revision = <connue>
--     retourne la nouvelle revision ; si 0 ligne est modifiée, la revision a bougé : refaire la décision.
-- ---------------------------------------------------------------------------------------------
-- VÉRIFICATIONS à lancer après la création (chacune doit donner le résultat indiqué)
-- ---------------------------------------------------------------------------------------------
-- 1. La RLS est bien active (attendu : rowsecurity = true)
--      select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'saves';
-- 2. Les 4 politiques existent (attendu : 4 lignes, rôle « authenticated » uniquement)
--      select policyname, cmd, roles from pg_policies where tablename = 'saves';
-- 3. Un visiteur non connecté ne peut rien lire (attendu : « permission denied for table saves »)
--      begin; set local role anon; select * from public.saves; rollback;
-- 4. Le trigger est en place (attendu : une ligne « saves_before_write »)
--      select tgname from pg_trigger where tgrelid = 'public.saves'::regclass and not tgisinternal;
-- 5. Il n'y a PAS de colonne d'horodatage fournie par le client (attendu : user_id, data, save_version,
--    revision, updated_at, et rien d'autre)
--      select column_name from information_schema.columns where table_schema = 'public' and table_name = 'saves';
-- 6. Les inscriptions publiques sont désactivées (Authentication → Sign In / Providers → « Allow new users
--    to sign up » décoché) : vérifier dans le tableau de bord, et dans le jeu qu'un e-mail inconnu est refusé.
-- 7. Isolation entre comptes : avec un second compte de test (créé à la main puis supprimé), le compte B ne
--    doit jamais voir ni modifier la ligne du compte A.
