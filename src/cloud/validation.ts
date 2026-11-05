// Validation et nettoyage des saisies du compte (pur, sans réseau).

/** Nettoie une variable de configuration : GitHub Actions peut conserver un retour de ligne final. */
export function normalizeEnvironmentValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

/** Accepte uniquement l'URL racine d'un projet Supabase, après nettoyage des espaces et retours de ligne. */
export function isValidSupabaseUrl(value: string | undefined): boolean {
  const normalized = normalizeEnvironmentValue(value);
  return Boolean(normalized && /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(normalized));
}

/** Adresse e-mail plausible (la vraie vérification est faite par Supabase). */
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Code reçu par e-mail : 6 chiffres (Supabase permet de 6 à 8), espaces tolérés. */
export function normalizeCode(value: string): string {
  return value.replace(/\s+/g, '');
}

export function isValidCode(value: string): boolean {
  return /^\d{6,8}$/.test(normalizeCode(value));
}
