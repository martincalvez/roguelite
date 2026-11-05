// Types partagés : toutes les données du jeu (JSON) respectent ces interfaces.

export type StatKey =
  | 'maxHp'
  | 'attack'
  | 'attackSpeed' // tirs par seconde
  | 'moveSpeed' // pixels par seconde
  | 'critChance' // 0..1
  | 'critDamage' // multiplicateur, ex. 2 = x2
  | 'projectileSpeed'
  | 'dodge'; // 0..1

export type Stats = Record<StatKey, number>;

/** flat : s'ajoute à la base ; percent : 0.1 = +10 % du total après les flats */
export interface StatModifier {
  stat: StatKey;
  type: 'flat' | 'percent';
  value: number;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemSlotType = 'weapon' | 'armor' | 'ring' | 'amulet' | 'pet';
export type EquipSlot = 'weapon' | 'armor' | 'ring1' | 'ring2' | 'amulet' | 'pet';

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlotType;
  description: string;
  /** stats au niveau 1, rareté commune */
  modifiers: StatModifier[];
  /** passif débloqué à partir d'une rareté (id de PassiveDef) */
  rarityPassives?: Partial<Record<Rarity, string>>;
  /** pour les armes : comportement de tir */
  weapon?: { projectile: 'arrow' | 'bolt' | 'shuriken'; pierce?: number; spread?: number };
}

/** Un objet possédé par le joueur */
export interface ItemInstance {
  uid: string;
  defId: string;
  rarity: Rarity;
  level: number;
}

export type SkillEffect =
  | { kind: 'stat'; modifiers: StatModifier[] }
  | { kind: 'multishot'; value: number }
  | { kind: 'diagonal' }
  | { kind: 'rear' }
  | { kind: 'ricochet'; value: number }
  | { kind: 'pierce'; value: number }
  | { kind: 'heal'; value: number } // fraction des PV max
  | { kind: 'burn'; dps: number; duration: number }
  | { kind: 'freeze'; slow: number; duration: number }
  | { kind: 'orb'; count: number; damage: number };

/** Compétence de run (choix 1 parmi 3) */
export interface SkillDef {
  id: string;
  name: string;
  description: string;
  maxStacks: number;
  weight: number; // probabilité relative d'apparition
  effect: SkillEffect;
}

export type EnemyBehavior = 'melee' | 'shooter' | 'spreader' | 'boss';

export interface EnemyDef {
  id: string;
  name: string;
  behavior: EnemyBehavior;
  hp: number;
  damage: number;
  speed: number;
  xp: number;
  gold: number;
  radius: number;
  color: string; // placeholder tant qu'il n'y a pas de sprite
  fireRate?: number; // tirs par seconde
  projectileSpeed?: number;
  projectileCount?: number;
  keepDistance?: number; // px : distance que garde un tireur par rapport au joueur
  spreadAngle?: number; // degrés : ouverture de l'éventail d'un 'spreader'
}

export type RoomType = 'combat' | 'angel' | 'miniboss' | 'boss';

export interface RoomDef {
  type: RoomType;
  enemies?: { id: string; count: number }[];
}

export interface ChapterDef {
  id: string;
  name: string;
  /** multiplicateur de PV/dégâts des ennemis */
  difficulty: number;
  rooms: RoomDef[];
}

export interface HeroDef {
  id: string;
  name: string;
  description: string;
  base: Stats;
  passive?: string; // id de PassiveDef
  unlockCostGems: number;
}

export interface PassiveDef {
  id: string;
  name: string;
  description: string;
  effect: SkillEffect;
}

export interface TalentDef {
  id: string;
  name: string;
  maxLevel: number;
  costGold: number[]; // coût par niveau
  perLevel: StatModifier;
}

export interface Settings {
  alwaysShoot: boolean; // false = tir auto seulement à l'arrêt (façon Archero)
  sound: boolean;
}

export interface SaveData {
  version: number;
  updatedAt: number; // timestamp ms, utile pour la synchro cloud
  gold: number;
  gems: number;
  accountLevel: number;
  accountXp: number;
  inventory: ItemInstance[];
  equipped: Partial<Record<EquipSlot, string>>; // EquipSlot -> uid
  talents: Record<string, number>; // talentId -> niveau
  unlockedHeroes: string[];
  selectedHero: string;
  bestChapter: number;
  bestWave: number;
  settings: Settings;
}

/** Réglages de combat communs (modifiables sans toucher au code). */
export interface CombatConfig {
  invulnerabilityMs: number; // durée d'invulnérabilité du joueur après un coup ou une esquive
}
