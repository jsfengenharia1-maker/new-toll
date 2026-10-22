// Tema da interface: Sistema (segue o sistema operacional), Escuro ou Claro. A escolha fica em localStorage
// e vai para document.documentElement[data-theme] (Sistema = sem atributo, vale prefers-color-scheme).
export type TemaApp = 'sistema' | 'escuro' | 'claro';
const CHAVE = 'statikos:tema';
export const EVENTO_TEMA = 'statikos:tema';

export function temaSalvoApp(): TemaApp {
  try { const t = localStorage.getItem(CHAVE); return t === 'escuro' || t === 'claro' ? t : 'sistema'; } catch { return 'sistema'; }
}

/** Aplica o tema ao documento (sem salvar). */
export function aplicarTema(t: TemaApp): void {
  const el = document.documentElement;
  if (t === 'sistema') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', t === 'escuro' ? 'dark' : 'light');
}

/** Tema efetivo agora: 'escuro' ou 'claro' (resolve o Sistema pelo navegador). */
export function temaEfetivo(): 'escuro' | 'claro' {
  const a = document.documentElement.getAttribute('data-theme');
  if (a === 'dark') return 'escuro';
  if (a === 'light') return 'claro';
  try { return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro'; } catch { return 'escuro'; }
}

/** Salva, aplica e avisa os interessados (a planta segue o tema do app). */
export function definirTema(t: TemaApp): void {
  try { if (t === 'sistema') localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, t); } catch { /* sem armazenamento */ }
  aplicarTema(t);
  window.dispatchEvent(new Event(EVENTO_TEMA));
}

/** Chamado pelo main.tsx antes do render. */
export function iniciarTema(): void {
  aplicarTema(temaSalvoApp());
  try { window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => window.dispatchEvent(new Event(EVENTO_TEMA))); } catch { /* sem matchMedia */ }
}
