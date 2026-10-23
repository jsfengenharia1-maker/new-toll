// Vista permanente da obra (L4): posição dos textos de referência e tipos de texto visíveis na planta.
import { pontoInterno } from '../geom/faces';
import { contornoNoLance, lanceNoPavimento, type BuildingModel, type RefPos, type TipoTexto } from './types';

export const TIPOS_TEXTO_TODOS: TipoTexto[] = ['nomes', 'secoes', 'cotas', 'cargas', 'niveis'];
export const ROTULO_TEXTO: Record<TipoTexto, string> = { nomes: 'Nomes', secoes: 'Seções', cotas: 'Cotas', cargas: 'Cargas', niveis: 'Níveis' };

/** Deslocamento e rotação do texto de referência do elemento (nulo = posição automática). */
export const refDe = (b: Pick<BuildingModel, 'vista'>, id: string): RefPos | undefined => b.vista?.refs?.[id];
/** Ponto de ancoragem do texto de referência já com o deslocamento do usuário (m, eixos da planta). */
export function pontoRef(b: Pick<BuildingModel, 'vista'>, id: string, p: [number, number]): [number, number] {
  const r = refDe(b, id);
  return r ? [p[0] + r.dx, p[1] + r.dy] : p;
}
/** Tipos de texto visíveis (ausente na obra = todos). */
export const textosVisiveis = (b: Pick<BuildingModel, 'vista'>): TipoTexto[] => b.vista?.textos ?? TIPOS_TEXTO_TODOS;
/** Deslocamento do texto a partir dos dois cliques: onde o texto está e para onde vai, somado ao que já havia. */
export function deslocamentoPorCliques(b: Pick<BuildingModel, 'vista'>, id: string, textoEm: [number, number], novoLocal: [number, number]): { dx: number; dy: number } {
  const r = refDe(b, id);
  return { dx: +((r?.dx ?? 0) + novoLocal[0] - textoEm[0]).toFixed(4), dy: +((r?.dy ?? 0) + novoLocal[1] - textoEm[1]).toFixed(4) };
}

export interface AncoraRef { id: string; tipo: 'pilar' | 'viga' | 'laje'; ponto: [number, number] }
/**
 * Pontos onde a planta desenha o texto de referência de cada elemento do pavimento, já com o deslocamento do usuário
 * (pilar: canto superior direito do contorno; viga: meio do trecho mais longo; laje: ponto interno). Servem à ferramenta
 * de mover referências (dois cliques) e à seleção do texto pelo clique.
 */
export function ancorasRef(b: BuildingModel, pavimento: string): AncoraRef[] {
  const pav = b.pavimentos.find((p) => p.id === pavimento);
  if (!pav) return [];
  const out: AncoraRef[] = [];
  const mv = (id: string, p: [number, number]): [number, number] => pontoRef(b, id, p);
  for (const p of b.pilares) {
    const l = lanceNoPavimento(b, p, pavimento);
    if (!l) continue;
    const c = contornoNoLance(p, l);
    out.push({ id: p.id, tipo: 'pilar', ponto: mv(p.id, [Math.max(...c.map((q) => q[0])), Math.max(...c.map((q) => q[1]))]) });
  }
  for (const v of b.vigas.filter((x) => x.grupo === pav.grupo)) {
    let k = 0, Lm = 0;
    for (let i = 0; i + 1 < v.pontos.length; i++) { const L = Math.hypot(v.pontos[i + 1][0] - v.pontos[i][0], v.pontos[i + 1][1] - v.pontos[i][1]); if (L > Lm) { Lm = L; k = i; } }
    out.push({ id: v.id, tipo: 'viga', ponto: mv(v.id, [(v.pontos[k][0] + v.pontos[k + 1][0]) / 2, (v.pontos[k][1] + v.pontos[k + 1][1]) / 2]) });
  }
  for (const l of b.lajes.filter((x) => x.grupo === pav.grupo)) out.push({ id: l.id, tipo: 'laje', ponto: mv(l.id, pontoInterno(l.contorno as [number, number][])) });
  return out;
}
/** A âncora mais próxima de `w` dentro do raio (m), ou null. */
export function ancoraMaisProxima(ancoras: AncoraRef[], w: [number, number], raio: number): AncoraRef | null {
  let melhor: AncoraRef | null = null, d0 = raio;
  for (const a of ancoras) { const d = Math.hypot(a.ponto[0] - w[0], a.ponto[1] - w[1]); if (d <= d0) { d0 = d; melhor = a; } }
  return melhor;
}
