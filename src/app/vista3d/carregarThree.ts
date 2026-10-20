// Carregamento sob demanda do three.js vendorizado (public/vendor, fora do HTML único). Sem o arquivo (artifact do
// claude.ai) ou sem WebGL, a vista cai para o isométrico estático em SVG.
import type * as THREE from 'three';
import { VENDOR_THREE } from '../../core/vista3d/vendor';

export type Three = typeof THREE;

let carga: Promise<Three> | null = null;
/** Importa o módulo por URL (uma vez); uma falha não fica guardada, para tentar de novo. */
export function carregarThree(): Promise<Three> {
  carga ??= import(/* @vite-ignore */ new URL(VENDOR_THREE, document.baseURI).href)
    .then((m) => m as Three)
    .catch((e) => { carga = null; throw e; });
  return carga;
}

/** O navegador oferece WebGL? */
export function temWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
