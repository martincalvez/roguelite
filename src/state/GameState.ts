// État permanent du joueur (entre les runs). Seul ce module modifie la sauvegarde.
import type { SaveData, StatModifier, Stats } from '../types';
import { SaveManager } from './SaveManager';
import { getHero } from '../data';
import { computeStats, itemModifiers, talentModifiers } from '../systems/stats';

class GameStateImpl {
  data: SaveData = SaveManager.load();

  persist(): void {
    SaveManager.save(this.data);
  }

  addGold(amount: number): void {
    this.data.gold += Math.round(amount);
    this.persist();
  }

  /**
   * Stats du héros sélectionné avec équipement et talents. `extra` : modificateurs supplémentaires
   * (compétences du run), combinés dans le même calcul en couches.
   */
  heroStats(extra: StatModifier[] = []): Stats {
    const hero = getHero(this.data.selectedHero);
    const equippedUids = new Set(Object.values(this.data.equipped));
    const items = this.data.inventory.filter((i) => equippedUids.has(i.uid));
    const mods = [...items.flatMap(itemModifiers), ...talentModifiers(this.data.talents), ...extra];
    return computeStats(hero.base, mods);
  }
}

export const GameState = new GameStateImpl();
