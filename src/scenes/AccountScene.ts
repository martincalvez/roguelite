import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { currentUserEmail, confirmCode, requestCode, signOut } from '../cloud/auth';
import { cloudEnabled } from '../cloud/client';
import { isValidCode, isValidEmail } from '../cloud/validation';
import { clearScene } from '../ui/clearScene';

type View = 'loading' | 'disabled' | 'email' | 'code' | 'signedIn';

const STROKE = { stroke: '#1a1020', strokeThickness: 5 };
const RESEND_DELAY_MS = 60_000;

/**
 * Compte cloud : connexion par code à 6 chiffres reçu par e-mail (aucun mot de passe).
 * Les inscriptions sont fermées : seule une adresse créée à la main dans Supabase peut se connecter.
 * Rien ici ne journalise l'adresse, le code ou les jetons.
 */
export class AccountScene extends Phaser.Scene {
  private view: View = 'loading';
  private email = ''; // adresse en cours de connexion (mémoire uniquement)
  private signedInEmail = '';
  private message = '';
  private messageColor = COLORS.textMuted;
  private busy = false;
  private resendAt = 0;
  private emailInput?: HTMLInputElement;
  private codeInput?: HTMLInputElement;

  constructor() {
    super(SCENES.account);
  }

  create(): void {
    this.input.keyboard?.disableGlobalCapture(); // les touches du clavier doivent aller aux champs de saisie
    this.busy = false;
    this.message = '';
    this.view = cloudEnabled ? 'loading' : 'disabled';
    this.render();
    if (cloudEnabled) {
      void currentUserEmail().then((email) => {
        this.signedInEmail = email ?? '';
        this.view = email ? 'signedIn' : 'email';
        this.render();
      });
    }
  }

  private render(): void {
    clearScene(this);
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.text(cx, 60, 'COMPTE', { fontSize: '44px', color: COLORS.gold, fontStyle: 'bold', ...STROKE, strokeThickness: 8 }).setOrigin(0.5);
    this.add
      .text(24, 60, '← Retour', { fontSize: '26px', color: COLORS.text, padding: { x: 14, y: 28 } })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start(SCENES.menu));

    switch (this.view) {
      case 'disabled':
        this.paragraph(260, "Le cloud n'est pas configuré sur cette version du jeu.\n\nLe jeu fonctionne normalement : ta progression reste sur cet appareil.");
        break;
      case 'loading':
        this.paragraph(260, 'Chargement…');
        break;
      case 'email':
        this.paragraph(200, 'Connexion par e-mail\n(sans mot de passe)', 34);
        this.emailInput = this.field(330, 'email', 'ton@adresse.fr');
        this.button(470, '  Recevoir un code  ', COLORS.gold, () => void this.onRequestCode());
        this.status(610);
        break;
      case 'code':
        this.paragraph(200, 'Entre le code reçu par e-mail', 34);
        this.codeInput = this.field(330, 'code', '123456');
        this.button(470, '  Valider  ', COLORS.gold, () => void this.onConfirmCode());
        this.button(620, '  Renvoyer le code  ', '#d6f0dc', () => void this.onResend(), 30);
        this.button(750, '  Changer d\'adresse  ', '#d6f0dc', () => {
          this.view = 'email';
          this.message = '';
          this.render();
        }, 30);
        this.status(880);
        break;
      case 'signedIn':
        this.paragraph(230, 'Connecté', 40, '#5cff7a');
        this.paragraph(300, this.signedInEmail, 26);
        this.button(470, '  Se déconnecter  ', '#ff9a9a', () => void this.onSignOut());
        this.status(610);
        break;
    }
  }

  private paragraph(y: number, text: string, size = 28, color: string = COLORS.text): void {
    this.add
      .text(GAME_WIDTH / 2, y, text, { fontSize: `${size}px`, color, align: 'center', wordWrap: { width: 600 }, fontStyle: size >= 34 ? 'bold' : 'normal' })
      .setOrigin(0.5, 0);
  }

  private status(y: number): void {
    if (!this.message) return;
    this.add
      .text(GAME_WIDTH / 2, y, this.message, { fontSize: '24px', color: this.messageColor, align: 'center', wordWrap: { width: 600 }, fontStyle: 'bold' })
      .setOrigin(0.5, 0);
  }

  /** Gros bouton (hauteur ≥ 88 px). */
  private button(y: number, label: string, background: string, onClick: () => void, fontSize = 38): void {
    this.add
      .text(GAME_WIDTH / 2, y, label, { fontSize: `${fontSize}px`, color: '#14111a', backgroundColor: background, padding: { x: 26, y: 24 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onClick);
  }

  /** Champ de saisie HTML (taille de police ≥ 16 px pour éviter le zoom automatique sur iPhone). */
  private field(y: number, kind: 'email' | 'code', placeholder: string): HTMLInputElement {
    const style =
      'width:560px;height:72px;box-sizing:border-box;font-size:30px;padding:0 18px;border:5px solid #ffc83d;border-radius:14px;' +
      'background:#14111a;color:#ffffff;outline:none;text-align:center;font-family:sans-serif;';
    const dom = this.add.dom(GAME_WIDTH / 2, y, 'input', style);
    const input = dom.node as HTMLInputElement;
    input.placeholder = placeholder;
    if (kind === 'email') {
      input.type = 'email';
      input.autocomplete = 'email';
      input.setAttribute('autocapitalize', 'none');
      input.setAttribute('autocorrect', 'off');
      input.spellcheck = false;
      input.value = this.email;
    } else {
      input.type = 'text';
      input.inputMode = 'numeric';
      input.autocomplete = 'one-time-code';
      input.maxLength = 8;
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') (kind === 'email' ? void this.onRequestCode() : void this.onConfirmCode());
    });
    return input;
  }

  private say(text: string, ok = false): void {
    this.message = text;
    this.messageColor = ok ? '#5cff7a' : '#ff9a9a';
    this.render();
  }

  private async onRequestCode(): Promise<void> {
    if (this.busy) return;
    const value = this.emailInput?.value ?? this.email;
    if (!isValidEmail(value)) return this.say('Adresse e-mail invalide.');
    this.email = value.trim();
    this.busy = true;
    const outcome = await requestCode(this.email);
    this.busy = false;
    if (outcome.proceed) {
      this.resendAt = Date.now() + RESEND_DELAY_MS;
      this.view = 'code';
    }
    this.say(outcome.message, outcome.proceed);
  }

  private async onResend(): Promise<void> {
    const wait = Math.ceil((this.resendAt - Date.now()) / 1000);
    if (wait > 0) return this.say(`Patiente encore ${wait} s avant de redemander un code.`);
    await this.onRequestCodeFor(this.email);
  }

  private async onRequestCodeFor(email: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const outcome = await requestCode(email);
    this.busy = false;
    if (outcome.proceed) this.resendAt = Date.now() + RESEND_DELAY_MS;
    this.say(outcome.message, outcome.proceed);
  }

  private async onConfirmCode(): Promise<void> {
    if (this.busy) return;
    const code = this.codeInput?.value ?? '';
    if (!isValidCode(code)) return this.say('Le code doit contenir 6 chiffres.');
    this.busy = true;
    const outcome = await confirmCode(this.email, code);
    this.busy = false;
    if (outcome.proceed) {
      this.signedInEmail = this.email;
      this.view = 'signedIn';
    }
    this.say(outcome.message, outcome.proceed);
  }

  private async onSignOut(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    await signOut();
    this.busy = false;
    this.signedInEmail = '';
    this.email = '';
    this.view = 'email';
    this.say('Déconnecté.', true);
  }
}
