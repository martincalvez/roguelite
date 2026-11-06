import { GameState } from '../state/GameState';

/**
 * Retours sonores courts, créés au Web Audio API : aucune piste externe, aucun poids réseau.
 * Le contexte ne démarre qu'après le premier geste du joueur, comme l'imposent iOS et Safari.
 */
export class ArcadeFeedback {
  private context?: AudioContext;
  private nextHitAt = 0;
  private nextKillAt = 0;
  private nextShotAt = 0;

  unlock(): void {
    if (!GameState.data.settings.sound || this.context) return;
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.context = new Ctor();
      void this.context.resume();
    } catch {
      // Le jeu reste silencieux si un navigateur ne propose pas le Web Audio API.
    }
  }

  hit(critical: boolean): void {
    const now = performance.now();
    if (now < this.nextHitAt) return;
    this.nextHitAt = now + (critical ? 44 : 76);
    this.tone(critical ? 690 : 430, critical ? 0.075 : 0.045, critical ? 'square' : 'triangle', critical ? 0.055 : 0.035, critical ? 1.32 : 0.84);
  }

  shot(critical: boolean): void {
    const now = performance.now();
    if (now < this.nextShotAt) return;
    this.nextShotAt = now + 96;
    this.tone(critical ? 560 : 330, 0.035, 'square', critical ? 0.036 : 0.022, critical ? 1.48 : 1.16);
  }

  enemyDown(boss: boolean): void {
    const now = performance.now();
    if (!boss && now < this.nextKillAt) return;
    this.nextKillAt = now + (boss ? 0 : 100);
    this.tone(boss ? 190 : 260, boss ? 0.26 : 0.07, boss ? 'sawtooth' : 'triangle', boss ? 0.09 : 0.04, boss ? 2.2 : 1.48);
    if (boss) this.vibrate([16, 28, 24]);
  }

  playerHurt(): void {
    this.tone(118, 0.13, 'sawtooth', 0.07, 0.62);
    this.vibrate(18);
  }

  levelUp(): void {
    this.tone(450, 0.2, 'square', 0.06, 2.25);
    this.vibrate(10);
  }

  wheelSpin(): void {
    this.tone(185, 0.12, 'triangle', 0.05, 1.85);
  }

  wheelReward(): void {
    this.tone(630, 0.21, 'square', 0.065, 1.7);
    this.vibrate([8, 18, 12]);
  }

  dispose(): void {
    if (this.context) void this.context.close();
    this.context = undefined;
  }

  private tone(frequency: number, duration: number, shape: OscillatorType, volume: number, bend: number): void {
    if (!GameState.data.settings.sound || this.context?.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, frequency * bend), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.015);
  }

  private vibrate(pattern: VibratePattern): void {
    if (GameState.data.settings.sound && 'vibrate' in navigator) navigator.vibrate?.(pattern);
  }
}
