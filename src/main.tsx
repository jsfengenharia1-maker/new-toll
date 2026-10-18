import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

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
