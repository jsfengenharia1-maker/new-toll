// Símbolos do pilar que passa, nasce ou morre no pavimento (V5, K1.4.57), selecionáveis em `b.prancha.simbolos`.
// Hachuras e símbolos próprios: a confirmar.
import { SIMBOLOS_PADRAO, type SimboloPilar, type SimbolosPilar } from '../building/types';
import type { P } from '../geom/faces';
import type { Prim } from './prancha';

export const SIMBOLOS: { v: SimboloPilar; rotulo: string }[] = [
  { v: 'hachura', rotulo: 'Hachura' }, { v: 'tracejado', rotulo: 'Contorno tracejado' }, { v: 'cruz', rotulo: 'Cruz (X)' }, { v: 'solido', rotulo: 'Preenchido' }, { v: 'vazio', rotulo: 'Contorno' },
];

export const simbolosEmUso = (s?: Partial<SimbolosPilar>): SimbolosPilar => ({ ...SIMBOLOS_PADRAO, ...(s ?? {}) });

/** Primitivas (m, no modelo) do contorno do pilar com o símbolo escolhido. */
export function primitivasDoSimbolo(simbolo: SimboloPilar, contorno: P[]): Prim[] {
  const xs = contorno.map((p) => p[0]), ys = contorno.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  switch (simbolo) {
    case 'hachura': return [{ t: 'hach', c: 'PILAR-HACH', pts: contorno }, { t: 'pl', c: 'PILAR', pts: contorno, fechada: true }];
    case 'solido': return [{ t: 'hach', c: 'PILAR', pts: contorno }, { t: 'pl', c: 'PILAR', pts: contorno, fechada: true }];
    case 'tracejado': return [{ t: 'pl', c: 'PILAR-NASCE', pts: contorno, fechada: true }];
    case 'cruz': return [{ t: 'pl', c: 'PILAR', pts: contorno, fechada: true }, { t: 'pl', c: 'PILAR-HACH', pts: [[x0, y0], [x1, y1]] }, { t: 'pl', c: 'PILAR-HACH', pts: [[x0, y1], [x1, y0]] }];
    default: return [{ t: 'pl', c: 'PILAR', pts: contorno, fechada: true }];
  }
}
