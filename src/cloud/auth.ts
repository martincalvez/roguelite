import { explainAuthError, type AuthOutcome } from './errors';
import { getCloud } from './client';
import { normalizeCode, normalizeEmail } from './validation';

// Rappel : ne jamais journaliser l'adresse e-mail, le code ou les jetons de session (pas de console.log ici).

const NOT_CONFIGURED: AuthOutcome = { message: "Le compte n'est pas configuré.", proceed: false };

/**
 * Envoie un code à 6 chiffres. `shouldCreateUser: false` : seules les adresses déjà créées à la main
 * dans le tableau de bord Supabase peuvent se connecter (inscriptions fermées).
 */
export async function requestCode(email: string): Promise<AuthOutcome> {
  const cloud = getCloud();
  if (!cloud) return NOT_CONFIGURED;
  try {
    const { error } = await cloud.auth.signInWithOtp({ email: normalizeEmail(email), options: { shouldCreateUser: false } });
    return explainAuthError(error, 'send');
  } catch (e) {
    return explainAuthError(e as Error, 'send');
  }
}

export async function confirmCode(email: string, code: string): Promise<AuthOutcome> {
  const cloud = getCloud();
  if (!cloud) return NOT_CONFIGURED;
  try {
    const { error } = await cloud.auth.verifyOtp({ email: normalizeEmail(email), token: normalizeCode(code), type: 'email' });
    return explainAuthError(error, 'verify');
  } catch (e) {
    return explainAuthError(e as Error, 'verify');
  }
}

/** Adresse du compte connecté (lue en local, sans réseau si la session est valide), ou null. */
export async function currentUserEmail(): Promise<string | null> {
  const cloud = getCloud();
  if (!cloud) return null;
  try {
    const { data } = await cloud.auth.getSession();
    return data.session?.user.email ?? null;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await getCloud()?.auth.signOut();
  } catch {
    // hors ligne : la session locale est quand même supprimée par la bibliothèque
  }
}
