import Phaser from 'phaser';

const FONT_FAMILY = 'Lilita One';
const INK = '#171221';

/** Charge la fonte localement : elle reste disponible dans le jeu installé et hors ligne. */
export async function loadGameFont(): Promise<void> {
  const font = new FontFace(FONT_FAMILY, `url("${import.meta.env.BASE_URL}assets/fonts/LilitaOne-Regular.ttf")`);
  await font.load();
  (document.fonts as FontFaceSet & { add(face: FontFace): void }).add(font);
}

/** Applique la typographie ronde et le contour des références à tous les textes Phaser. */
export function installGameTextTheme(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const originalText = factory.text;
  factory.text = function (x, y, text, style) {
    return originalText.call(this, x, y, text, {
      fontFamily: FONT_FAMILY,
      stroke: INK,
      strokeThickness: 2,
      shadow: { offsetX: 0, offsetY: 3, color: '#100b1b', blur: 1, fill: true },
      ...style,
    });
  };
}
