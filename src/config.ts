// Constantes globales. Les chiffres d'équilibrage vivent dans src/data/*.json, pas ici.
import type { ItemSlotType, Rarity } from './types';

/** Résolution logique, mode portrait. Phaser met à l'échelle selon l'écran. */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

/** Mise en page de l'écran de combat : bandeau HUD en haut, arène entourée de murs. */
export const HUD_HEIGHT = 120;
export const WALL_THICKNESS = 20;
export const ARENA = {
  x: WALL_THICKNESS,
  y: HUD_HEIGHT + WALL_THICKNESS,
  width: GAME_WIDTH - WALL_THICKNESS * 2,
  height: GAME_HEIGHT - HUD_HEIGHT - WALL_THICKNESS * 2,
};

/** Joystick virtuel flottant (réglages d'interface, pas d'équilibrage). */
export const JOYSTICK = {
  radius: 90,
  deadZone: 0.1, // fraction du rayon
  baseAlpha: 0.25,
  knobAlpha: 0.5,
};

export const COLORS = {
  background: 0x1f4d35, // bandeau HUD et bords de l'écran : vert forêt profond
  floor: 0x8fd16a, // sol : herbe vive en damier
  floorAlt: 0x84c75f,
  wall: 0x7a5233, // murs : bois / pierre chaude
  wallEdge: 0x4a301c,
  text: '#ffffff',
  textMuted: '#d6f0dc',
  gold: '#ffc83d',
  hp: 0xff4d5e,
  xp: 0x5cff7a,
};

/** Taille d'une case du damier du sol (décor). */
export const FLOOR_TILE = 85;

/** Types d'objets, donc de parchemins. */
export const SCROLL_TYPES: ItemSlotType[] = ['weapon', 'armor', 'ring', 'amulet', 'pet'];

export const SLOT_TYPE_LABEL: Record<ItemSlotType, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  ring: 'Anneau',
  amulet: 'Amulette',
  pet: 'Familier',
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

/** Multiplicateur des stats d'un objet selon sa rareté */
export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  rare: 1.3,
  epic: 1.7,
  legendary: 2.2,
  mythic: 3,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b8b8b8',
  rare: '#5b95e6',
  epic: '#b06be6',
  legendary: '#f0a640',
  mythic: '#e65b5b',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
  mythic: 'Mythique',
};

/** +X % de stats par niveau d'objet au-delà du niveau 1 */
export const ITEM_GROWTH_PER_LEVEL = 0.08;

/** Nombre d'objets identiques (même def, même rareté) pour une fusion */
export const FUSION_COUNT = 3;

/** Taille maximale des pools d'objets (réglage technique, pas d'équilibrage). */
export const POOLS = {
  enemies: 40,
  enemyProjectiles: 120,
  playerProjectiles: 60,
  floatingTexts: 30,
  xpOrbs: 60,
};

export const SCENES = {
  boot: 'Boot',
  menu: 'Menu',
  run: 'Run',
  skillPick: 'SkillPick',
  loot: 'Loot',
  equipment: 'Equipment',
  chests: 'Chests',
} as const;
