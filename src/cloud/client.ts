import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// L'URL et la clé publique (« anon » / « publishable ») viennent de variables d'environnement
// (.env.local en local, Variables du dépôt GitHub au déploiement) : rien n'est écrit dans le code.
// La clé « service_role » ou « secret » ne doit JAMAIS apparaître ici ni dans le dépôt.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Vrai si le cloud est configuré ; sinon le jeu fonctionne comme avant, sans compte. */
export const cloudEnabled: boolean = Boolean(url && key && /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url));

let client: SupabaseClient | null = null;

export function getCloud(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  client ??= createClient(url as string, key as string, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
