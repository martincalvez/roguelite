-- Tests d'isolation de la table public.saves. À coller dans Supabase → SQL Editor, puis « Run ».
-- AUCUNE donnée n'est modifiée : le script se termine volontairement par une erreur qui annule tout,
-- et c'est le TEXTE de cette erreur qui contient les résultats (une ligne par test : OK ou ECHEC).
-- Il simule deux joueurs : A = ton vrai compte (le premier utilisateur), B = un joueur imaginaire.
-- Ce fichier ne contient aucun secret.

do $$
declare
  a uuid;
  b uuid := gen_random_uuid();
  res text := '';
  n integer;
  r integer;
  rev_after integer;
  upd timestamptz;
  ok boolean;
  no_rls text;
begin
  select id into a from auth.users order by created_at limit 1;
  if a is null then
    raise exception 'Aucun utilisateur : crée ton compte avant de lancer ce test.';
  end if;

  -- Préparation (en administrateur) : une ligne de test pour A. Tout sera annulé à la fin.
  delete from public.saves where user_id = a;
  insert into public.saves (user_id, data, save_version) values (a, '{"gold": 1}', 2);
  select revision into r from public.saves where user_id = a;

  -- T1 : un visiteur non connecté (rôle anon) ne peut rien lire
  begin
    set local role anon;
    perform 1 from public.saves limit 1;
    res := res || E'T1  visiteur non connecté ne peut pas lire : ECHEC\n';
  exception when others then
    res := res || case when sqlstate = '42501' then E'T1  visiteur non connecté ne peut pas lire : OK\n'
                       else E'T1  visiteur : ECHEC (code ' || sqlstate || E')\n' end;
  end;
  reset role;

  -- On se met à la place du joueur B (imaginaire, connecté)
  perform set_config('request.jwt.claims', json_build_object('sub', b::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  set local role authenticated;

  -- T2 : B ne voit pas la ligne de A
  select count(*) into n from public.saves where user_id = a;
  res := res || case when n = 0 then E'T2  B ne voit pas la sauvegarde de A : OK\n' else E'T2  B voit la sauvegarde de A : ECHEC\n' end;

  -- T3 : B ne peut pas écrire une ligne au nom de A
  begin
    insert into public.saves (user_id, data, save_version) values (a, '{"gold": 9999}', 2);
    res := res || E'T3  B écrit au nom de A : ECHEC\n';
  exception when others then
    res := res || case when sqlstate = '42501' then E'T3  B ne peut pas écrire au nom de A : OK\n'
                       else E'T3  B écrit au nom de A : refusé mais code inattendu ' || sqlstate || E'\n' end;
  end;

  -- T4 : B ne peut pas modifier la ligne de A
  update public.saves set data = '{"gold": 9999}' where user_id = a;
  get diagnostics n = row_count;
  res := res || case when n = 0 then E'T4  B ne peut pas modifier la sauvegarde de A : OK\n' else E'T4  B modifie la sauvegarde de A : ECHEC\n' end;

  -- T5 : B ne peut pas supprimer la ligne de A
  delete from public.saves where user_id = a;
  get diagnostics n = row_count;
  res := res || case when n = 0 then E'T5  B ne peut pas supprimer la sauvegarde de A : OK\n' else E'T5  B supprime la sauvegarde de A : ECHEC\n' end;

  -- Contrôle en administrateur : la ligne de A est intacte
  reset role;
  select (data->>'gold') = '1' into ok from public.saves where user_id = a;
  res := res || case when coalesce(ok, false) then E'T6  la sauvegarde de A est intacte : OK\n' else E'T6  la sauvegarde de A a été touchée : ECHEC\n' end;

  -- On se met à la place du joueur A (toi, connecté)
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;

  -- T7 : A voit sa propre ligne
  select count(*) into n from public.saves where user_id = a;
  res := res || case when n = 1 then E'T7  A voit sa propre sauvegarde : OK\n' else E'T7  A ne voit pas sa sauvegarde : ECHEC\n' end;

  -- T8 : le client ne peut imposer ni revision ni updated_at (le serveur les fixe)
  update public.saves set revision = 500, updated_at = timestamptz '2000-01-01', data = '{"gold": 2}'
    where user_id = a returning revision, updated_at into rev_after, upd;
  res := res || case when rev_after = r + 1 then E'T8  la revision est fixée par le serveur (+1) : OK\n' else E'T8  revision imposée par le client : ECHEC (' || rev_after || E')\n' end;
  res := res || case when upd > now() - interval '1 minute' then E'T9  updated_at est fixé par le serveur : OK\n' else E'T9  updated_at imposé par le client : ECHEC\n' end;

  -- T10 : le client ne peut pas donner sa ligne à quelqu'un d'autre
  begin
    update public.saves set user_id = b where user_id = a;
  exception when others then
    null; -- un refus est acceptable aussi
  end;
  select count(*) into n from public.saves where user_id = b;
  res := res || case when n = 0 then E'T10 la ligne ne peut pas changer de propriétaire : OK\n' else E'T10 changement de propriétaire possible : ECHEC\n' end;

  -- T11 : limite de taille (200 Ko)
  begin
    update public.saves set data = jsonb_build_object('x', repeat('a', 300000)) where user_id = a;
    res := res || E'T11 une sauvegarde de 300 Ko est acceptée : ECHEC\n';
  exception when check_violation then
    res := res || E'T11 une sauvegarde de 300 Ko est refusée : OK\n';
  end;

  -- T12 : une seconde première-insertion pour soi est refusée (le jeu sait alors qu'un autre appareil est passé avant)
  begin
    insert into public.saves (user_id, data, save_version) values (a, '{"gold": 3}', 2);
    res := res || E'T12 doublon d''insertion accepté : ECHEC\n';
  exception when unique_violation then
    res := res || E'T12 doublon d''insertion refusé (23505) : OK\n';
  end;

  -- Retour en administrateur : la sécurité par ligne est active, et aucune table publique n'en est dépourvue
  reset role;
  select relrowsecurity into ok from pg_class where oid = 'public.saves'::regclass;
  res := res || case when ok then E'T13 la sécurité par ligne est active sur saves : OK\n' else E'T13 sécurité par ligne inactive : ECHEC\n' end;
  select string_agg(tablename, ', ') into no_rls from pg_tables where schemaname = 'public' and not rowsecurity;
  res := res || case when no_rls is null then E'T14 toutes les tables publiques ont la sécurité par ligne : OK\n' else E'T14 tables publiques SANS sécurité par ligne : ' || no_rls || E' : ECHEC\n' end;

  raise exception E'RÉSULTATS (l''erreur est voulue : elle annule tout, rien n''a été modifié) :\n%', res;
end
$$;
