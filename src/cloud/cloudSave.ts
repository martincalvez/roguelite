import type { SaveData } from '../types';
import { SAVE_VERSION } from '../state/SaveManager';
import { getCloud } from './client';

// Accès réseau à la table `saves` (voir docs/supabase/001_saves.sql). Toutes les fonctions attrapent leurs
// erreurs : un projet en pause ou un réseau coupé donne « unavailable », jamais une exception.
// Rien n'est journalisé (ni données, ni identifiants).

export interface RemoteSave {
  data: unknown;
  saveVersion: number;
  revision: number;
  updatedAt: string;
}

export type FetchResult = { ok: true; remote: RemoteSave | null } | { ok: false };
export type WriteResult = { ok: true; revision: number } | { ok: false; reason: 'raced' | 'unavailable' };

/** Identifiant du joueur connecté (lu en local), ou null. */
export async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await getCloud()?.auth.getSession() ?? { data: null };
    return data?.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchRemote(userId: string): Promise<FetchResult> {
  const cloud = getCloud();
  if (!cloud) return { ok: false };
  try {
    const { data, error } = await cloud
      .from('saves')
      .select('data, save_version, revision, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { ok: false };
    if (!data) return { ok: true, remote: null };
    return { ok: true, remote: { data: data.data, saveVersion: data.save_version, revision: data.revision, updatedAt: data.updated_at } };
  } catch {
    return { ok: false };
  }
}

/** Première écriture. Erreur 23505 (la ligne existe déjà) = un autre appareil est passé avant : « raced ». */
export async function insertFirst(userId: string, save: SaveData): Promise<WriteResult> {
  const cloud = getCloud();
  if (!cloud) return { ok: false, reason: 'unavailable' };
  try {
    const { data, error } = await cloud
      .from('saves')
      .insert({ user_id: userId, data: save, save_version: SAVE_VERSION })
      .select('revision')
      .single();
    if (error) return { ok: false, reason: error.code === '23505' ? 'raced' : 'unavailable' };
    return { ok: true, revision: data.revision };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Écriture conditionnelle : ne réussit que si la revision en base est toujours celle qu'on connaît. */
export async function pushConditional(userId: string, save: SaveData, knownRevision: number): Promise<WriteResult> {
  const cloud = getCloud();
  if (!cloud) return { ok: false, reason: 'unavailable' };
  try {
    const { data, error } = await cloud
      .from('saves')
      .update({ data: save, save_version: SAVE_VERSION })
      .eq('user_id', userId)
      .eq('revision', knownRevision)
      .select('revision');
    if (error) return { ok: false, reason: 'unavailable' };
    if (!data || data.length === 0) return { ok: false, reason: 'raced' };
    return { ok: true, revision: data[0].revision };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Supprime la ligne du joueur (pas son compte). */
export async function deleteRemote(userId: string): Promise<boolean> {
  const cloud = getCloud();
  if (!cloud) return false;
  try {
    const { error } = await cloud.from('saves').delete().eq('user_id', userId);
    return !error;
  } catch {
    return false;
  }
}
