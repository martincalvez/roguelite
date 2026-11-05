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

export type WeaponProjectile = 'arrow' | 'bolt' | 'shuriken';

export interface PetAppearance {
  form: 'owl' | 'dragon' | 'spirit';
  bodyColor: string;
  accentColor: string;
  eyeColor: string;
}

export interface HeroAppearance {
  form: 'ranger' | 'mage';
  outfitColor: string;
  accentColor: string;
  hairColor: string;
  eyeColor: string;
}

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
  weapon?: { projectile: WeaponProjectile; pierce?: number; spread?: number };
  /** pour les familiers : silhouette et palette du sprite généré au démarrage */
  petAppearance?: PetAppearance;
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

/** Réglages d'un boss : il alterne ruée, cercle de projectiles et salve visée. */
export interface BossConfig {
  cycleMs: number; // délai entre deux attaques
  warnMs: number; // avertissement visuel avant chaque attaque
  chargeSpeed: number; // px/s pendant la ruée
  chargeMs: number; // durée de la ruée
  volleyCount: number; // tirs de la salve visée
  volleyIntervalMs: number; // délai entre deux tirs de la salve
}

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
  boss?: BossConfig; // obligatoire si behavior === 'boss'
}

export type RoomType = 'combat' | 'angel' | 'miniboss' | 'boss';

export interface RoomDef {
  type: RoomType;
  /** Multiplicateur de PV des ennemis de la salle (en plus de celui du chapitre) ; les dégâts suivent en partie (COMBAT.roomDamageShare). */
  difficulty?: number;
  enemies?: { id: string; count: number }[];
}

export interface ChapterDef {
  id: string;
  name: string;
  /** multiplicateur de PV/dégâts des ennemis */
  difficulty: number;
  visual: {
    wallColor: string;
    wallEdgeColor: string;
    floorColor: string;
    floorAltColor: string;
    accentColor: string;
  };
  rooms: RoomDef[];
}

export interface HeroDef {
  id: string;
  name: string;
  description: string;
  base: Stats;
  passive?: string; // id de PassiveDef
  unlockCostGems: number;
  appearance: HeroAppearance;
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
  requiredAccountLevel: number; // niveau de compte minimal pour acheter ce talent
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
  scrolls: Record<ItemSlotType, number>; // parchemins d'amélioration par type d'objet
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
  flashMs: number; // flash blanc d'un ennemi touché
  knockbackSpeed: number; // px/s : recul d'un ennemi touché
  knockbackMs: number; // durée du recul (l'ennemi ne se déplace pas pendant ce temps)
  shakeMs: number; // tremblement d'écran quand le joueur est touché
  shakeIntensity: number;
  deathParticles: number; // particules à la mort d'un ennemi
  multishotSpacing: number; // px entre deux projectiles parallèles (Tir multiple)
  diagonalAngleDeg: number; // angle des tirs en diagonale
  statusTickMs: number; // intervalle des dégâts de brûlure
  orbHitCooldownMs: number; // délai entre deux coups d'un orbe protecteur sur un même ennemi
  orbRadius: number; // distance des orbes au héros
  orbSpeedDegPerSec: number; // vitesse de rotation des orbes
  projectileSpeedMultiplier: Record<WeaponProjectile, number>; // vitesse du tir selon l'arme (bolt lent, shuriken rapide)
  roomDamageShare: number; // part du multiplicateur de salle appliquée aux dégâts des ennemis (0 = aucun, 1 = autant que les PV)
  angelRareMaxWeight: number; // salle de l'ange : une compétence "rare" a un poids d'apparition ≤ à cette valeur
}

/** Progression pendant un run. */
export interface ProgressionConfig {
  /** XP nécessaire pour passer du niveau n+1 au suivant (index 0 : niveau 1 → 2). Au-delà : dernière valeur. */
  xpPerLevel: number[];
  orbMagnetSpeed: number; // px/s : vitesse des orbes d'XP aspirés vers le héros
  accountXpPerRoom: number; // XP de compte gagnée par salle terminée
  accountXpVictoryBonus: number; // bonus d'XP de compte si le chapitre est terminé
  /** XP de compte pour passer du niveau n+1 au suivant (index 0 : niveau 1 → 2). Au-delà : dernière valeur. */
  accountXpPerLevel: number[];
}

/** Butin de fin de run. */
export interface LootConfig {
  itemCountWeights: number[]; // poids du nombre d'objets lâchés (index = nombre : 0, 1, 2…)
  victoryMinItems: number; // nombre minimal d'objets en cas de victoire
  rarityWeights: Record<Rarity, number>;
  scrollCountWeights: number[]; // poids du nombre de parchemins lâchés (index = nombre : 0, 1, 2…)
  victoryScrollBonus: number; // parchemins en plus en cas de victoire
  gemsPerBoss: number; // gemmes par boss ou mini-boss tué
  gemsVictoryBonus: number; // gemmes en plus en cas de victoire
}

/** Amélioration d'objet (or + parchemins du type de l'objet). */
export interface UpgradeConfig {
  maxLevelByRarity: Record<Rarity, number>;
  goldBase: number; // coût en or du passage niveau 1 → 2
  goldGrowth: number; // multiplicateur du coût en or à chaque niveau
  scrollBase: number; // parchemins pour le passage niveau 1 → 2
  scrollPerLevel: number; // parchemins en plus par niveau
}

/** Coffre ouvrable depuis le menu (payé en or ou en gemmes). */
export interface ChestDef {
  id: string;
  name: string;
  costGold?: number;
  costGems?: number;
  minRarity?: Rarity; // rareté minimale garantie
  rarityWeights: Record<Rarity, number>;
}

/** Récompenses d'un run, ajoutées à la sauvegarde en une fois. */
export interface RunRewards {
  gold: number;
  accountXp: number;
  items: ItemInstance[];
  scrolls: Record<ItemSlotType, number>;
  gems: number;
  clearedChapter: number | null; // numéro du chapitre terminé (1 = ch1), null si défaite
}
