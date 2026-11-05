import Phaser from 'phaser';
import { ARENA, JOYSTICK } from '../config';

/**
 * Joystick flottant : apparaît là où le doigt (ou le clic maintenu) touche la moitié basse
 * de l'arène. `vector` va de 0 à 1 en intensité, zone morte déjà retirée.
 */
export class VirtualJoystick {
  readonly vector = new Phaser.Math.Vector2();
  private pointerId = -1;
  private enabled = true;
  private readonly origin = new Phaser.Math.Vector2();
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene) {
    this.base = scene.add
      .circle(0, 0, JOYSTICK.radius, 0xffffff, JOYSTICK.baseAlpha)
      .setStrokeStyle(3, 0xffffff, 0.5)
      .setDepth(1000)
      .setVisible(false);
    this.knob = scene.add
      .circle(0, 0, JOYSTICK.radius * 0.4, 0xffffff, JOYSTICK.knobAlpha)
      .setDepth(1001)
      .setVisible(false);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
    });
  }

  /** Désactivé (écran de fin) : plus aucune entrée et le joystick disparaît. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.pointerId = -1;
      this.vector.set(0, 0);
      this.base.setVisible(false);
      this.knob.setVisible(false);
    }
  }

  get active(): boolean {
    return this.pointerId !== -1;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.active) return;
    if (pointer.y < ARENA.y + ARENA.height / 2) return; // moitié basse seulement
    this.pointerId = pointer.id;
    this.origin.set(pointer.x, pointer.y);
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.knob.setPosition(pointer.x, pointer.y).setVisible(true);
    this.vector.set(0, 0);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOYSTICK.radius);
    const angle = Math.atan2(dy, dx);

    this.knob.setPosition(
      this.origin.x + Math.cos(angle) * clamped,
      this.origin.y + Math.sin(angle) * clamped,
    );

    const raw = clamped / JOYSTICK.radius;
    if (raw < JOYSTICK.deadZone) {
      this.vector.set(0, 0);
      return;
    }
    const intensity = (raw - JOYSTICK.deadZone) / (1 - JOYSTICK.deadZone);
    this.vector.set(Math.cos(angle) * intensity, Math.sin(angle) * intensity);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = -1;
    this.vector.set(0, 0);
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }
}
