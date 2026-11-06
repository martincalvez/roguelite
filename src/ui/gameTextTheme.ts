import Phaser from 'phaser';

const FONT_FAMILY = 'Lilita One';
const INK = '#171221';
const SHADOW = '#090614';

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
      stroke: INK,
      strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 4, color: SHADOW, blur: 0, fill: true },
      fontStyle: 'bold',
      resolution: 2,
      ...style,
      // Certains menus forçaient encore Arial : les références utilisent une seule
      // typographie ronde et épaisse sur tout le jeu, même sur écran Retina.
      fontFamily: FONT_FAMILY,
    });
  };
}
