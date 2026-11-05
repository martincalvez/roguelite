// Validation et nettoyage des saisies du compte (pur, sans réseau).

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
