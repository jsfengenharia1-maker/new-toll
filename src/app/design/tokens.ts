// Ponte entre o design system (arquivos .css desta pasta) e o código que precisa da cor em JS:
// figuras SVG em texto (memoriais), desenho em Canvas 2D (planta). Nenhum valor de cor fica no TS.
import MEMORIAL_CSS from './memorial.css?raw';
import IMPRESSAO_APP_CSS from './impressao-app.css?raw';

export { MEMORIAL_CSS, IMPRESSAO_APP_CSS };

/** Custom properties declaradas no primeiro bloco `:root { … }` de um texto CSS. */
export function lerTokens(css: string): Record<string, string> {
  const bloco = /:root\s*\{([^}]*)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const m of bloco.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const MEMO = lerTokens(MEMORIAL_CSS);

/** Token do papel (memorial.css), sem o prefixo `--m-`: `memo('ink')`. */
export function memo(nome: string): string {
  const v = MEMO[`m-${nome}`];
  if (v === undefined) throw new Error(`token --m-${nome} não existe em memorial.css`);
  return v;
}

/** Valor resolvido de uma custom property da interface (global.css), lido do documento. */
export function cssVar(nome: string, el?: Element | null): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(el ?? document.documentElement).getPropertyValue(`--${nome}`).trim();
}
