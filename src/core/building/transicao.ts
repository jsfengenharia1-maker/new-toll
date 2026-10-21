// Pilares apoiados e transições (frente E1a): pilar que nasce sobre outro pilar, sobre viga (viga de transição) ou sobre
// laje. O elemento de apoio é detectado no pavimento em que o pilar nasce, pela sobreposição da seção da base do pilar
// com a do pilar que morre ali, com o corpo da viga ou com a laje que o contém. Sem dependência da análise.
import { areaPoligono, dentroPoligono } from '../geom/faces';
import { sobrepoe } from '../geom/poly';
import { centroNoLance, contornoNoLance, inicioDe, lancesDoPilar, trechosViga, type BuildingModel, type Pilar } from './types';
import type { Diagnostico } from './verify';

type P = [number, number];
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');

/** Elemento que apoia a base de um pilar que nasce acima da fundação. */
export type ApoioPilar =
  | { tipo: 'pilar'; /** Pilar de maior área em comum com a base (a ligação do modelo). */ principal: string; todos: string[]; /** Fração da base apoiada. */ fracao: number }
  | { tipo: 'viga'; vigas: string[] }
  | { tipo: 'laje'; laje: string };

/** Recorte de um polígono por um convexo (Sutherland-Hodgman); o polígono recortado pode ser qualquer simples. */
function recortar(sujeito: P[], clip: P[]): P[] {
  const ccw = areaPoligono(clip) >= 0;
  let out = sujeito;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], z = clip[(i + 1) % clip.length];
    const dentro = (p: P) => { const c = (z[0] - a[0]) * (p[1] - a[1]) - (z[1] - a[1]) * (p[0] - a[0]); return ccw ? c >= -1e-12 : c <= 1e-12; };
    const inter = (p: P, q: P): P => {
      const dx = q[0] - p[0], dy = q[1] - p[1], ex = z[0] - a[0], ey = z[1] - a[1], den = dx * ey - dy * ex;
      const t = den ? ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den : 0;
      return [p[0] + t * dx, p[1] + t * dy];
    };
    const entrada = out;
    out = [];
    for (let k = 0; k < entrada.length; k++) {
      const p = entrada[k], q = entrada[(k + 1) % entrada.length];
      if (dentro(q)) { if (!dentro(p)) out.push(inter(p, q)); out.push(q); } else if (dentro(p)) out.push(inter(p, q));
    }
  }
  return out;
}
/** Área da interseção de dois polígonos convexos (m²). */
export const areaComum = (a: P[], b: P[]) => { const r = recortar(a, b); return r.length > 2 ? Math.abs(areaPoligono(r)) : 0; };

/**
 * Apoio da base do pilar `p` no pavimento em que nasce: pilar(es) que morrem ali com seção sobreposta, senão viga do
 * grupo que toca o corpo, senão laje que contém o centro. `null` = sem apoio (ou o pilar começa na fundação/vínculo externo).
 */
export function apoioDoPilar(b: BuildingModel, p: Pilar): ApoioPilar | null {
  if (inicioDe(p) === 'fundacao') return null;
  const pav = b.pavimentos.find((x) => x.id === p.nasce), l0 = lancesDoPilar(b, p)[0];
  if (!pav || !l0) return null;
  const cont = contornoNoLance(p, l0.id), area = Math.abs(areaPoligono(cont)) || 1;
  const baixo = b.pilares
    .filter((q) => q.id !== p.id && q.morre === p.nasce && lancesDoPilar(b, q).some((x) => x.id === p.nasce))
    .map((q) => ({ q, a: areaComum(cont, contornoNoLance(q, p.nasce)) }))
    .filter((x) => x.a > 1e-6)
    .sort((x, y) => y.a - x.a);
  if (baixo.length) return { tipo: 'pilar', principal: baixo[0].q.id, todos: baixo.map((x) => x.q.id), fracao: Math.min(1, baixo.reduce((t, x) => t + x.a, 0) / area) };
  const vigas = b.vigas.filter((v) => v.grupo === pav.grupo && trechosViga(v).some((t) => sobrepoe(t, cont)));
  if (vigas.length) return { tipo: 'viga', vigas: vigas.map((v) => v.id) };
  const c = centroNoLance(p, l0.id);
  const laje = b.lajes.find((x) => x.grupo === pav.grupo && (dentroPoligono(c, x.contorno) || x.contorno.some((q) => dentroPoligono(q, cont)) || sobrepoe(x.contorno, cont)));
  return laje ? { tipo: 'laje', laje: laje.id } : null;
}

/** Apoio de cada pilar que nasce apoiado (id → apoio ou null se não achou). */
export function apoiosDosPilares(b: BuildingModel): Map<string, ApoioPilar | null> {
  const m = new Map<string, ApoioPilar | null>();
  for (const p of b.pilares) if (inicioDe(p) === 'apoiado' && p.nasce !== 'fundacao') m.set(p.id, apoioDoPilar(b, p));
  return m;
}

/** Pilares (ids) que se apoiam em cada pilar, pelo apoio principal. */
export function pilaresSobre(b: BuildingModel, apoios = apoiosDosPilares(b)): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [id, a] of apoios) if (a?.tipo === 'pilar') m.set(a.principal, [...(m.get(a.principal) ?? []), id]);
  return m;
}

/** Excentricidade (m) entre o centro da base do pilar e o do pilar de apoio no pavimento. */
export function excentricidadeApoio(b: BuildingModel, p: Pilar, q: Pilar): [number, number] {
  const l0 = lancesDoPilar(b, p)[0], a = centroNoLance(p, l0.id), z = centroNoLance(q, p.nasce);
  return [a[0] - z[0], a[1] - z[1]];
}

/** Letra sequencial (a, b, …, z, aa, …) de um índice a partir de 0. */
export const letraSequencial = (i: number): string => (i >= 26 ? letraSequencial(Math.floor(i / 26) - 1) : '') + String.fromCharCode(97 + (i % 26));

/** Referência automática de um pilar que nasce sobre outro: nome do de baixo + letra sequencial livre. */
export function nomeSobre(b: BuildingModel, baixo: Pilar): string {
  const usados = new Set(b.pilares.map((p) => p.nome));
  for (let i = 0; ; i++) { const n = `${baixo.nome}${letraSequencial(i)}`; if (!usados.has(n)) return n; }
}

/** Diagnósticos de lançamento dos pilares apoiados. */
export function diagnosticosTransicao(b: BuildingModel): Diagnostico[] {
  const d: Diagnostico[] = [];
  const nomePav = (id: string) => b.pavimentos.find((x) => x.id === id)?.nome ?? id;
  for (const p of b.pilares) {
    if (p.nasce === 'fundacao') {
      if (p.inicio === 'apoiado') d.push({ codigo: 'PILAR_INICIO', severidade: 'erro', elementos: [p.id], mensagem: `${p.nome} nasce na fundação e não pode ser apoiado em outro elemento.` });
      continue;
    }
    if (inicioDe(p) === 'fundacao') continue; // vínculo externo no pavimento em que nasce
    if (!lancesDoPilar(b, p).length) continue;
    const ap = apoioDoPilar(b, p);
    if (!ap) { d.push({ codigo: 'PILAR_NASCE_SEM_APOIO', severidade: 'erro', elementos: [p.id], mensagem: `${p.nome} nasce em ${nomePav(p.nasce)} sem pilar, viga ou laje embaixo (ou indique início na fundação).` }); continue; }
    if (ap.tipo === 'viga') {
      const nomes = ap.vigas.map((id) => b.vigas.find((v) => v.id === id)!.nome).join(', ');
      d.push({ codigo: 'PILAR_TRANSICAO', severidade: 'info', elementos: [p.id, ...ap.vigas], mensagem: `${p.nome} nasce sobre ${nomes} em ${nomePav(p.nasce)}: viga de transição com carga concentrada, verificada no dimensionamento.` });
    } else if (ap.tipo === 'laje') {
      d.push({ codigo: 'PILAR_SOBRE_LAJE', severidade: 'aviso', elementos: [p.id, ap.laje], mensagem: `${p.nome} nasce sobre a laje ${b.lajes.find((l) => l.id === ap.laje)!.nome} em ${nomePav(p.nasce)}: carga concentrada na laje, a conferir (flexão e punção).` });
    } else {
      const q = b.pilares.find((x) => x.id === ap.principal)!, e = excentricidadeApoio(b, p, q), ex = Math.hypot(e[0], e[1]);
      if (ap.fracao < 0.5) d.push({ codigo: 'PILAR_APOIO_PARCIAL', severidade: 'aviso', elementos: [p.id, ...ap.todos], mensagem: `${p.nome} apoia só ${fmt(ap.fracao * 100)} % da seção em ${q.nome}: a parte fora da projeção liga-se por trecho rígido.` });
      else if (ex > 1e-3) d.push({ codigo: 'PILAR_EXCENTRICO', severidade: 'info', elementos: [p.id, q.id], mensagem: `${p.nome} apoia em ${q.nome} com excentricidade de ${fmt(ex * 100)} cm: momento N·e transmitido ao pilar de baixo.` });
    }
  }
  return d;
}
