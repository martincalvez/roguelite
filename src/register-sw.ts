// Enregistre le service worker uniquement sur HTTPS (GitHub Pages), jamais en développement local.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('sw.js');
  });
}
