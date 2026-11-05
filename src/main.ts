import Phaser from 'phaser';
import './register-sw';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { Sync } from './cloud/syncManager';
import { AccountScene } from './scenes/AccountScene';
import { ConflictScene } from './scenes/ConflictScene';
import { ChestScene } from './scenes/ChestScene';
import { EquipmentScene } from './scenes/EquipmentScene';
import { HeroScene } from './scenes/HeroScene';
import { PetScene } from './scenes/PetScene';
import { LootScene } from './scenes/LootScene';
import { MenuScene } from './scenes/MenuScene';
import { RunScene } from './scenes/RunScene';
import { TalentScene } from './scenes/TalentScene';
import { SkillPickScene } from './scenes/SkillPickScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  input: { activePointers: 3 },
  // Champs de saisie HTML (adresse e-mail, code) : Phaser n'a pas de champ texte natif.
  dom: { createContainer: true },
  scene: [BootScene, MenuScene, RunScene, SkillPickScene, LootScene, EquipmentScene, HeroScene, PetScene, ChestScene, TalentScene, AccountScene, ConflictScene],
});

// Synchro cloud (sans effet si le cloud n'est pas configuré ou si personne n'est connecté) :
// au lancement, puis chaque fois qu'on revient dans le jeu (avec un délai minimal entre deux essais).
void Sync.syncNow(true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void Sync.syncNow(false);
});
