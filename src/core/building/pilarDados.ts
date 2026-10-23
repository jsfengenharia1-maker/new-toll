// Ponto fixo do pilar sem mover o contorno (C4.26), dados copiados de outro pilar (C4.28) e cópia de dados entre panos (C7.8; L4).
import { centroNoLance, centroPilar, type Ajuste, type Laje, type Pilar, type SecaoPilar } from './types';

const r10 = (v: number) => Math.round(v * 1e10) / 1e10;

/** Ponto (x, y) que, com o ponto fixo `ajuste`, deixa o centro da seção em `centro`. */
export function pontoParaCentro(centro: [number, number], ajuste: Ajuste, angulo: number, secao: SecaoPilar): [number, number] {
  const [cx, cy] = centroPilar({ x: 0, y: 0, angulo, ajuste }, secao); // deslocamento do centro em relação ao ponto fixo
  return [centro[0] - cx, centro[1] - cy];
}

/**
 * Muda o ponto fixo do pilar para `ajuste`. Com `mantem`, recalcula x, y (e dx, dy dos lances com geometria própria)
 * para o contorno de cada lance não se mover; sem `mantem`, só troca o ponto fixo e o pilar se desloca.
 */
export function mudarPontoFixo(p: Pilar, ajuste: Ajuste, mantem: boolean): void {
  if (!mantem) { p.ajuste = ajuste; for (const s of p.secoes ?? []) delete s.ajuste; return; }
  const lances = new Map<string, [number, number]>();
  for (const s of p.secoes ?? []) lances.set(s.pavimento, centroNoLance(p, s.pavimento));
  const c0 = centroPilar(p, p.secao);
  const [x, y] = pontoParaCentro(c0, ajuste, p.angulo, p.secao);
  p.x = r10(x); p.y = r10(y); p.ajuste = ajuste;
  for (const s of p.secoes ?? []) {
    const c = lances.get(s.pavimento)!;
    const ang = s.angulo ?? p.angulo;
    const [xl, yl] = pontoParaCentro(c, ajuste, ang, s.secao);
    delete s.ajuste;
    const dx = r10(xl - p.x), dy = r10(yl - p.y);
    if (dx) s.dx = dx; else delete s.dx;
    if (dy) s.dy = dy; else delete s.dy;
  }
}

/** Dados de um pilar existente que o pilar novo herda (seções por lance, engastes, flambagem, cobrimento, fck, travamentos, tabela). */
export const CAMPOS_DADOS_PILAR = ['secao', 'angulo', 'ajuste', 'nasce', 'morre', 'secoes', 'fck', 'engastes', 'flambagem', 'cobrimento', 'apoiosIntermediarios', 'tabela'] as const;
export function dadosDoPilar(p: Pilar): Partial<Pilar> {
  const out: Record<string, unknown> = {};
  for (const k of CAMPOS_DADOS_PILAR) if (p[k] !== undefined) out[k] = JSON.parse(JSON.stringify(p[k]));
  return out as Partial<Pilar>;
}

// ---------------- cópia de dados entre panos (C7.8) ----------------

export interface CampoCopiaLaje {
  rotulo: string;
  /** Copia o campo de `de` para `para`; devolve um aviso quando não pôde (ou null). */
  copiar(de: Laje, para: Laje): string | null;
  /** Aviso antes de copiar (ex.: plano de inclinação entre panos de inclinações diferentes). */
  alerta?(de: Laje, para: Laje): string | null;
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const sinc = (l: Laje, k: keyof Laje, v: unknown) => { if (v === undefined) delete l[k]; else (l as unknown as Record<string, unknown>)[k] = clone(v); };

/**
 * Campos que `laje.copiarDados` sabe copiar. Extensível: a E3f acrescenta `plano` (inclinação) aqui, com `alerta` para
 * desligar a cópia entre panos de inclinações diferentes.
 */
export const CAMPOS_COPIA_LAJE: Record<string, CampoCopiaLaje> = {
  tipo: { rotulo: 'Tipo (maciça ou treliçada)', copiar: (a, z) => { z.tipo = clone(a.tipo); return null; } },
  direcao: { rotulo: 'Direção das vigotas', copiar: (a, z) => { sinc(z, 'direcao', a.direcao); return null; } },
  nivel: { rotulo: 'Desnível', copiar: (a, z) => { sinc(z, 'nivel', a.nivel); return null; } },
  engastes: {
    rotulo: 'Engastes das bordas',
    copiar: (a, z) => {
      if (a.engasteBordas && a.engasteBordas.length !== z.contorno.length) return `${z.nome}: número de bordas diferente (${a.contorno.length} × ${z.contorno.length}); engastes não copiados.`;
      sinc(z, 'engasteBordas', a.engasteBordas); sinc(z, 'vigotasBiapoiadas', a.vigotasBiapoiadas); return null;
    },
  },
  cobrimento: { rotulo: 'Cobrimento', copiar: (a, z) => { sinc(z, 'cobrimento', a.cobrimento); return null; } },
  tabela: { rotulo: 'Tabela de armadura', copiar: (a, z) => { sinc(z, 'tabela', a.tabela); return null; } },
  armaduraBase: { rotulo: 'Armadura base', copiar: (a, z) => { sinc(z, 'base', a.base); return null; } },
};
