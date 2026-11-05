// Messages d'erreur du compte (purs). Règle de sécurité : on ne révèle jamais si une adresse e-mail
// possède un compte ; une adresse refusée donne exactement le même message qu'une adresse acceptée.

export interface AuthErrorLike {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
}

export type AuthStep = 'send' | 'verify';

export interface AuthOutcome {
  message: string;
  /** Vrai si l'on peut passer à l'étape suivante (saisie du code). */
  proceed: boolean;
}

const RATE_LIMIT_CODES = ['over_email_send_rate_limit', 'over_request_rate_limit', 'over_sms_send_rate_limit'];

export function isOfflineError(error: AuthErrorLike): boolean {
  return (
    error.name === 'AuthRetryableFetchError' ||
    error.status === 0 ||
    /failed to fetch|network|load failed|fetch failed/i.test(error.message ?? '')
  );
}

export function isRateLimited(error: AuthErrorLike): boolean {
  return error.status === 429 || (error.code !== undefined && RATE_LIMIT_CODES.includes(error.code));
}

/** Succès ou refus « inscription interdite » : même message, même suite (pas de fuite d'information). */
export const NEUTRAL_SENT = "Si cette adresse est autorisée, un code vient d'être envoyé. Regarde tes e-mails (et les indésirables).";

export function explainAuthError(error: AuthErrorLike | null, step: AuthStep): AuthOutcome {
  if (error === null) {
    return step === 'send' ? { message: NEUTRAL_SENT, proceed: true } : { message: 'Connecté.', proceed: true };
  }
  if (isOfflineError(error)) return { message: 'Pas de connexion. Réessaie quand le réseau est revenu.', proceed: false };
  if (isRateLimited(error)) return { message: 'Trop de demandes. Patiente quelques minutes avant de réessayer.', proceed: false };
  if (error.status !== undefined && error.status >= 500) {
    return { message: 'Le service est momentanément indisponible. Réessaie plus tard.', proceed: false };
  }
  if (step === 'send') return { message: NEUTRAL_SENT, proceed: true };
  return { message: 'Code faux ou expiré. Redemande un code si besoin.', proceed: false };
}
