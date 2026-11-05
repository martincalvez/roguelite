// État permanent du joueur (entre les runs). Seul ce module modifie la sauvegarde.
import type { RunRewards, SaveData, StatModifier, Stats } from '../types';
import { SaveManager } from './SaveManager';
import { RARITY_ORDER } from '../config';
import { getHero, getItem } from '../data';
import { accountXpToNext } from '../systems/progression';
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

  /** Ajoute les récompenses d'un run (or, XP de compte, objets, meilleur chapitre) et sauvegarde. */
  applyRunRewards(rewards: RunRewards): { levelBefore: number; levelAfter: number } {
    const d = this.data;
    const levelBefore = d.accountLevel;
    d.gold += Math.round(rewards.gold);
    d.accountXp += rewards.accountXp;
    while (d.accountXp >= accountXpToNext(d.accountLevel)) {
      d.accountXp -= accountXpToNext(d.accountLevel);
      d.accountLevel++;
    }
    d.inventory.push(...rewards.items);
    if (rewards.clearedChapter !== null) d.bestChapter = Math.max(d.bestChapter, rewards.clearedChapter);
    this.persist();
    return { levelBefore, levelAfter: d.accountLevel };
  }

  /** Passifs actifs au début d'un run : celui du héros, et ceux des objets équipés dont la rareté est atteinte. */
  startingPassives(): string[] {
    const ids: string[] = [];
    const hero = getHero(this.data.selectedHero);
    if (hero.passive) ids.push(hero.passive);
    const equippedUids = new Set(Object.values(this.data.equipped));
    for (const item of this.data.inventory) {
      if (!equippedUids.has(item.uid)) continue;
      const owned = RARITY_ORDER.indexOf(item.rarity);
      for (const [rarity, passiveId] of Object.entries(getItem(item.defId).rarityPassives ?? {})) {
        if (passiveId && RARITY_ORDER.indexOf(rarity as (typeof RARITY_ORDER)[number]) <= owned) ids.push(passiveId);
      }
    }
    return ids;
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
