import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/design/global.css';
import App from './App';
import { iniciarTema } from './app/design/tema';

iniciarTema();

// Partes carregadas sob demanda têm nome com hash: depois de uma nova publicação, uma aba aberta com a versão antiga pede arquivos
// que não existem mais. Recarrega uma vez para pegar a versão nova (o trabalho fica salvo no navegador); sem laço se o erro persistir.
window.addEventListener('vite:preloadError', (e) => {
  try {
    // só as partes do próprio app (assets/): os vendors opcionais (three, IFC, DWG) falham de propósito no artifact e têm o seu caminho alternativo
    if (!String((e as Event & { payload?: { message?: string } }).payload?.message ?? '').includes('/assets/')) return;
    if (sessionStorage.getItem('statikos:recarregou')) return;
    sessionStorage.setItem('statikos:recarregou', '1');
    e.preventDefault();
    location.reload();
  } catch { /* sem sessionStorage: segue o erro normal */ }
});
window.addEventListener('load', () => { setTimeout(() => { try { sessionStorage.removeItem('statikos:recarregou'); } catch { /* ok */ } }, 10000); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Funcionamento offline (PWA): só no build publicado, em https ou localhost, e fora de iframe
// (dentro do artifact do claude.ai o app roda num iframe de outra origem: lá não se registra nada).
const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if (import.meta.env.PROD && secure && window.self === window.top && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
