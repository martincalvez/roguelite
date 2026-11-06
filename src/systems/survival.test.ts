import { describe, expect, it } from 'vitest';
import { getEnemy, SURVIVAL } from '../data';
import { hasSurvivalFire, hasSurvivalRunes, hasSurvivalTurrets, survivalRoom } from './survival';

describe('mode Survie', () => {
  it('fournit 50 étapes avec une halte à 5 et un boss à chaque dizaine', () => {
    expect(SURVIVAL.roomCount).toBe(50);
    expect(survivalRoom(5).type).toBe('angel');
    for (const wave of [10, 20, 30, 40, 50]) expect(survivalRoom(wave).type).toBe('boss');
  });

  it('fait monter la pression, change les ennemis et borne la difficulté', () => {
    expect(survivalRoom(20).difficulty).toBeGreaterThan(survivalRoom(1).difficulty!);
    expect(survivalRoom(21).enemies?.[0].id).not.toBe(survivalRoom(1).enemies?.[0].id);
    expect(survivalRoom(50).difficulty).toBeLessThanOrEqual(SURVIVAL.difficultyCap);
  });

  it('ne référence que des ennemis et des boss existants', () => {
    for (let wave = 1; wave <= SURVIVAL.roomCount; wave++) {
      for (const group of survivalRoom(wave).enemies ?? []) expect(() => getEnemy(group.id)).not.toThrow();
    }
  });

  it('place les feux sur des salles de combat, jamais sur les haltes ou les boss', () => {
    expect(hasSurvivalFire(4)).toBe(true);
    expect(hasSurvivalFire(5)).toBe(false);
    expect(hasSurvivalFire(10)).toBe(false);
  });

  it('ajoute des tourelles à cadence régulière, jamais dans une halte ou face à un boss', () => {
    expect(hasSurvivalTurrets(2)).toBe(true);
    expect(hasSurvivalTurrets(7)).toBe(true);
    expect(hasSurvivalTurrets(5)).toBe(false);
    expect(hasSurvivalTurrets(10)).toBe(false);
  });

  it('charge des runes au sol hors des haltes et des boss', () => {
    expect(hasSurvivalRunes(3)).toBe(true);
    expect(hasSurvivalRunes(9)).toBe(true);
    expect(hasSurvivalRunes(5)).toBe(false);
    expect(hasSurvivalRunes(15)).toBe(false);
  });
});
