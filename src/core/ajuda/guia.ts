// Guia rápido (C1.13): reúne as ajudas das abas, ferramentas, barras e opções, gerado dos mesmos dados do modo de ajuda.
// As ajudas dos diálogos (grupo "janelas") não entram.
import { GRUPOS_AJUDA, todasAjudas, type Ajuda } from './catalogo';

export interface SecaoGuia { grupo: string; rotulo: string; itens: Ajuda[] }

export function guiaRapido(): SecaoGuia[] {
  const todas = todasAjudas();
  return GRUPOS_AJUDA.filter((g) => g.noGuia).map((g) => ({ grupo: g.id, rotulo: g.rotulo, itens: todas.filter((a) => a.grupo === g.id) })).filter((s) => s.itens.length);
}

/** Total de itens do guia (para conferir contra o catálogo). */
export const totalNoGuia = (g: SecaoGuia[] = guiaRapido()) => g.reduce((s, x) => s + x.itens.length, 0);
