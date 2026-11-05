// Constantes globales. Les chiffres d'équilibrage vivent dans src/data/*.json, pas ici.
import type { Rarity } from './types';

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
  background: 0x14111a,
  floor: 0x1f1a26,
  wall: 0x3a3346,
  text: '#ece4d4',
  textMuted: '#9b91a6',
  gold: '#f0a640',
  hp: 0xd94b4b,
  xp: 0x8bd17c,
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

export const SCENES = {
  boot: 'Boot',
  menu: 'Menu',
  run: 'Run',
} as const;
