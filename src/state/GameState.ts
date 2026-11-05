// État permanent du joueur (entre les runs). Seul ce module modifie la sauvegarde.
import type { EquipSlot, ItemDef, ItemInstance, Rarity, RunRewards, SaveData, StatModifier, Stats } from '../types';
import { SaveManager } from './SaveManager';
import { RARITY_ORDER } from '../config';
import { getChest, getHero, getItem, getTalent, ITEMS } from '../data';
import { slotAccepts } from '../systems/equipment';
import { fusionResult, pickFusionInputs } from '../systems/fusion';
import { canAffordChest, openChest } from '../systems/chests';
import { newUid } from '../systems/loot';
import { talentState } from '../systems/talents';
import { passiveStatModifiers } from '../systems/skills';
import { canUpgrade, upgradeCost } from '../systems/upgrade';
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

  /** Arme actuellement équipée, avec sa définition. */
  equippedWeapon(): { instance: ItemInstance; def: ItemDef } | undefined {
    const instance = this.data.inventory.find((i) => i.uid === this.data.equipped.weapon);
    return instance ? { instance, def: getItem(instance.defId) } : undefined;
  }

  /** Équipe un objet dans un slot (il quitte son ancien slot). Renvoie faux si le slot ne l'accepte pas. */
  equipItem(uid: string, slot: EquipSlot): boolean {
    const item = this.data.inventory.find((i) => i.uid === uid);
    if (!item || !slotAccepts(slot, getItem(item.defId).slot)) return false;
    for (const key of Object.keys(this.data.equipped) as EquipSlot[]) {
      if (this.data.equipped[key] === uid) delete this.data.equipped[key];
    }
    this.data.equipped[slot] = uid;
    this.persist();
    return true;
  }

  /** Améliore un objet d'un niveau (or + parchemins de son type). Renvoie faux si impossible. */
  upgradeItem(uid: string): boolean {
    const item = this.data.inventory.find((i) => i.uid === uid);
    if (!item) return false;
    const type = getItem(item.defId).slot;
    if (!canUpgrade(item, this.data.gold, this.data.scrolls[type]).ok) return false;
    const cost = upgradeCost(item.level);
    this.data.gold -= cost.gold;
    this.data.scrolls[type] -= cost.scrolls;
    item.level++;
    this.persist();
    return true;
  }

  unequip(slot: EquipSlot): void {
    delete this.data.equipped[slot];
    this.persist();
  }

  /** Achète un niveau de talent (or). Renvoie faux si le talent est au max, verrouillé ou trop cher. */
  buyTalent(talentId: string): boolean {
    const def = getTalent(talentId);
    const level = this.data.talents[talentId] ?? 0;
    const state = talentState(def, level, this.data.gold, this.data.accountLevel);
    if (state.kind !== 'ok') return false;
    this.data.gold -= state.cost;
    this.data.talents[talentId] = level + 1;
    this.persist();
    return true;
  }

  /** Ouvre un coffre : débite le prix, ajoute l'objet tiré à l'inventaire. Renvoie l'objet, ou null si le joueur ne peut pas payer. */
  buyChest(chestId: string): ItemInstance | null {
    const chest = getChest(chestId);
    if (!canAffordChest(chest, this.data.gold, this.data.gems)) return null;
    this.data.gold -= chest.costGold ?? 0;
    this.data.gems -= chest.costGems ?? 0;
    const item = openChest(chest, ITEMS);
    this.data.inventory.push(item);
    this.persist();
    return item;
  }

  /** Ajoute les récompenses d'un run (or, XP de compte, objets, meilleur chapitre) et sauvegarde. */
  applyRunRewards(rewards: RunRewards): { levelBefore: number; levelAfter: number } {
    const d = this.data;
    const levelBefore = d.accountLevel;
    d.gold += Math.round(rewards.gold);
    d.gems += rewards.gems;
    d.accountXp += rewards.accountXp;
    while (d.accountXp >= accountXpToNext(d.accountLevel)) {
      d.accountXp -= accountXpToNext(d.accountLevel);
      d.accountLevel++;
    }
    d.inventory.push(...rewards.items);
    for (const type of Object.keys(rewards.scrolls) as (keyof typeof rewards.scrolls)[]) d.scrolls[type] += rewards.scrolls[type];
    if (rewards.clearedChapter !== null) d.bestChapter = Math.max(d.bestChapter, rewards.clearedChapter);
    this.persist();
    return { levelBefore, levelAfter: d.accountLevel };
  }

  /** Passifs actifs au début d'un run : ceux du héros et des objets équipés (selon leur rareté). */
  startingPassives(): string[] {
    return this.passiveIdsFor(this.data.equipped);
  }

  /** Passifs du héros, et ceux des objets d'un équipement (hypothétique ou réel) dont la rareté est atteinte. */
  private passiveIdsFor(equipped: Partial<Record<EquipSlot, string>>): string[] {
    const ids: string[] = [];
    const hero = getHero(this.data.selectedHero);
    if (hero.passive) ids.push(hero.passive);
    const equippedUids = new Set(Object.values(equipped));
    for (const item of this.data.inventory) {
      if (!equippedUids.has(item.uid)) continue;
      const owned = RARITY_ORDER.indexOf(item.rarity);
      for (const [rarity, passiveId] of Object.entries(getItem(item.defId).rarityPassives ?? {})) {
        if (passiveId && RARITY_ORDER.indexOf(rarity as Rarity) <= owned) ids.push(passiveId);
      }
    }
    return ids;
  }

  /**
   * Fusionne FUSION_COUNT objets identiques (même objet, même rareté) en un objet de rareté supérieure, niveau 1.
   * Si un objet consommé était équipé, le nouvel objet prend sa place. Renvoie le nouvel objet, ou null si impossible.
   */
  fuseItems(defId: string, rarity: Rarity): ItemInstance | null {
    const d = this.data;
    const inputs = pickFusionInputs(d.inventory, defId, rarity, new Set(Object.values(d.equipped)));
    if (!inputs) return null;
    const consumed = new Set(inputs.map((i) => i.uid));
    let inheritedSlot: EquipSlot | undefined;
    for (const slot of Object.keys(d.equipped) as EquipSlot[]) {
      if (consumed.has(d.equipped[slot] as string)) {
        inheritedSlot ??= slot;
        delete d.equipped[slot];
      }
    }
    d.inventory = d.inventory.filter((i) => !consumed.has(i.uid));
    const result = fusionResult(inputs, newUid);
    d.inventory.push(result);
    if (inheritedSlot) d.equipped[inheritedSlot] = result.uid;
    this.persist();
    return result;
  }

  /**
   * Stats du héros sélectionné avec équipement et talents. `extra` : modificateurs supplémentaires
   * (compétences du run), combinés dans le même calcul en couches.
   */
  heroStats(extra: StatModifier[] = []): Stats {
    return this.heroStatsWith(this.data.equipped, extra);
  }

  /** Comme heroStats(), mais pour un équipement hypothétique (aperçu avant d'équiper, sans sauvegarder). */
  heroStatsWith(equipped: Partial<Record<EquipSlot, string>>, extra: StatModifier[] = []): Stats {
    const hero = getHero(this.data.selectedHero);
    const equippedUids = new Set(Object.values(equipped));
    const items = this.data.inventory.filter((i) => equippedUids.has(i.uid));
    const mods = [
      ...items.flatMap(itemModifiers),
      ...talentModifiers(this.data.talents),
      ...passiveStatModifiers(this.passiveIdsFor(equipped)),
      ...extra,
    ];
    return computeStats(hero.base, mods);
  }
}

export const GameState = new GameStateImpl();
