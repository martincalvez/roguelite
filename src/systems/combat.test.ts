import { describe, expect, it } from 'vitest';
import { damageAmount, rollCrit, rollDodge } from './combat';

describe('combat', () => {
  it('un coup est critique quand le tirage est sous la chance', () => {
    expect(rollCrit(0.05, () => 0.04)).toBe(true);
    expect(rollCrit(0.05, () => 0.05)).toBe(false);
    expect(rollCrit(0, () => 0)).toBe(false);
    expect(rollCrit(1, () => 0.999)).toBe(true);
  });

  it('les dégâts sont multipliés par critDamage en cas de critique, arrondis', () => {
    expect(damageAmount(30, false, 2)).toBe(30);
    expect(damageAmount(30, true, 2)).toBe(60);
    expect(damageAmount(33, true, 1.5)).toBe(50); // 49,5 arrondi
  });

  it("l'esquive suit le même principe", () => {
    expect(rollDodge(0.3, () => 0.29)).toBe(true);
    expect(rollDodge(0.3, () => 0.3)).toBe(false);
    expect(rollDodge(0, () => 0)).toBe(false);
  });
});
