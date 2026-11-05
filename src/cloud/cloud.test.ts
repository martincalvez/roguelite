import { describe, expect, it } from 'vitest';
import { explainAuthError, isOfflineError, isRateLimited, MAX_CODE_ATTEMPTS, NEUTRAL_SENT } from './errors';
import {
  isValidCode,
  isValidEmail,
  isValidSupabaseUrl,
  normalizeCode,
  normalizeEmail,
  normalizeEnvironmentValue,
} from './validation';

describe('configuration Supabase', () => {
  it('retire les espaces et retours de ligne finaux des variables de build', () => {
    expect(normalizeEnvironmentValue('  https://projet.supabase.co\r\n')).toBe('https://projet.supabase.co');
    expect(normalizeEnvironmentValue('  sb_publishable_demo\n')).toBe('sb_publishable_demo');
    expect(normalizeEnvironmentValue('\r\n')).toBeUndefined();
  });

  it('valide l’URL Supabase après nettoyage et rejette les domaines non autorisés', () => {
    expect(isValidSupabaseUrl('https://projet.supabase.co\r')).toBe(true);
    expect(isValidSupabaseUrl(' https://projet.supabase.co/ \n')).toBe(true);
    expect(isValidSupabaseUrl('https://projet.supabase.co.evil.example')).toBe(false);
    expect(isValidSupabaseUrl(undefined)).toBe(false);
  });
});

describe('validation des saisies', () => {
  it('accepte une adresse plausible, refuse le reste', () => {
    expect(isValidEmail('moi@exemple.fr')).toBe(true);
    expect(isValidEmail('  moi@exemple.fr  ')).toBe(true);
    for (const bad of ['', 'moi', 'moi@', '@exemple.fr', 'moi@exemple', 'mo i@exemple.fr', 'a@b.c']) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
    expect(isValidEmail(`${'a'.repeat(250)}@exemple.fr`)).toBe(false);
  });

  it("normalise l'adresse (espaces, majuscules)", () => {
    expect(normalizeEmail('  Moi@Exemple.FR ')).toBe('moi@exemple.fr');
  });

  it('le code : 6 à 8 chiffres, espaces tolérés', () => {
    expect(isValidCode('123456')).toBe(true);
    expect(isValidCode('123 456')).toBe(true);
    expect(isValidCode('12345678')).toBe(true);
    for (const bad of ['', '12345', '123456789', 'abcdef', '12 34 5a']) expect(isValidCode(bad), bad).toBe(false);
    expect(normalizeCode(' 123 456 ')).toBe('123456');
  });
});

describe('explainAuthError', () => {
  it("envoi réussi ou refusé pour inscription fermée : exactement le même message (pas de fuite)", () => {
    const ok = explainAuthError(null, 'send');
    const refused = explainAuthError({ status: 422, code: 'otp_disabled', message: 'Signups not allowed for otp' }, 'send');
    expect(refused).toEqual(ok);
    expect(ok.message).toBe(NEUTRAL_SENT);
    expect(ok.proceed).toBe(true);
  });

  it('ne mentionne jamais le mot « compte » ni une adresse inconnue dans le message neutre', () => {
    expect(NEUTRAL_SENT.toLowerCase()).not.toMatch(/inconnu|n'existe|pas de compte|introuvable/);
  });

  it('hors ligne et trop de demandes : messages clairs, on ne passe pas à la suite', () => {
    const offline = explainAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, 'send');
    expect(offline.proceed).toBe(false);
    expect(offline.message).toMatch(/connexion/i);
    const limited = explainAuthError({ status: 429, code: 'over_email_send_rate_limit' }, 'send');
    expect(limited.proceed).toBe(false);
    expect(limited.message).toMatch(/trop de demandes/i);
  });

  it('erreur serveur : service indisponible', () => {
    expect(explainAuthError({ status: 503 }, 'verify').message).toMatch(/indisponible/i);
  });

  it('code faux ou expiré à la vérification', () => {
    const out = explainAuthError({ status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' }, 'verify');
    expect(out).toEqual({ message: 'Code faux ou expiré. Redemande un code si besoin.', proceed: false, wrongCode: true });
    // une panne réseau ou une limitation ne comptent pas comme un essai de code
    expect(explainAuthError({ status: 429 }, 'verify').wrongCode).toBeUndefined();
    expect(explainAuthError({ message: 'Failed to fetch' }, 'verify').wrongCode).toBeUndefined();
    expect(MAX_CODE_ATTEMPTS).toBe(5);
  });

  it('détecte hors ligne et limitation', () => {
    expect(isOfflineError({ message: 'TypeError: Failed to fetch' })).toBe(true);
    expect(isOfflineError({ status: 400 })).toBe(false);
    expect(isRateLimited({ status: 429 })).toBe(true);
    expect(isRateLimited({ code: 'over_request_rate_limit' })).toBe(true);
    expect(isRateLimited({ status: 400 })).toBe(false);
  });
});
