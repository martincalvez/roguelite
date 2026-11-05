// Service worker : seulement en ligne sur HTTPS (GitHub Pages), pas pendant le développement local.
// Fichier séparé (et non un script dans index.html) pour que la politique de sécurité n'autorise que 'self'.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
