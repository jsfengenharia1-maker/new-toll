// Lajes: catálogo de treliçadas, peso próprio, direção do menor vão, panos pelo eixo das vigas,
// alvenaria a partir das paredes da máscara e diagnósticos de lajes e cargas.
import { geometriaViga, mascaraNoGrupo, mascaraParaMundo, type BuildingModel, type Laje, type TipoLaje } from './types';
import type { Diagnostico } from './verify';
import { eixosDasParedes } from './paredesBase';
import { areaPoligono, dentroPoligono, faces, pontoInterno, type P } from '../geom/faces';
import { GAMA_CONCRETO, ehNervurada, errosTipoLaje, geometriaNervurada, modelosTrelicadas, type FonteLajes } from './tiposLaje';

/**
 * Treliçadas unidirecionais com EPS [a confirmar com o fabricante]: altura do enchimento, intereixo, largura média da
 * nervura e capa padrão (m). Catálogo de fábrica; a versão em uso (editável) vem da biblioteca de normas
 * (`lajes.trelicadas`) por `modelosTrelicadas(b)`.
 */
export const TRELICADAS: Record<string, { hEnch: number; intereixo: number; bw: number; capa: number }> = Object.fromEntries(
  Object.entries(modelosTrelicadas()).map(([k, { hEnch, intereixo, bw, capa }]) => [k, { hEnch, intereixo, bw, capa }]));
export { GAMA_CONCRETO };
export const GAMA_EPS = 0.2; // kN/m³ [a confirmar]; em uso: tabela `lajes.enchimentos`

/** Altura total (m) e peso próprio (kN/m²) do tipo de laje (nervuradas: pelo catálogo, ficha ou geometria da obra `b`). */
export function propriedadesLaje(t: TipoLaje, b?: FonteLajes): { h: number; pp: number; descricao: string } {
  if (t.tipo === 'macica') return { h: t.h, pp: GAMA_CONCRETO * t.h, descricao: `maciça h=${Math.round(t.h * 100)}` };
  const g = geometriaNervurada(b, t);
  return { h: g.h, pp: g.pp, descricao: g.descricao };
}

/** Direção (graus) do menor vão: entre as direções das arestas, a de menor extensão do polígono. */
export function direcaoMenorVao(contorno: P[]): number {
  let melhor = 0, ext = Infinity;
  for (let i = 0; i < contorno.length; i++) {
    const a = contorno[i], z = contorno[(i + 1) % contorno.length];
    const ang = Math.atan2(z[1] - a[1], z[0] - a[0]), ux = Math.cos(ang), uy = Math.sin(ang);
    const pr = contorno.map((q) => q[0] * ux + q[1] * uy), e = Math.max(...pr) - Math.min(...pr);
    if (e < ext - 1e-9) { ext = e; melhor = ((ang * 180) / Math.PI + 360) % 180; }
  }
  return +melhor.toFixed(6);
}

/** Vãos (m) da laje na direção das vigotas e na perpendicular. */
export function vaos(l: Pick<Laje, 'contorno' | 'direcao'>): [number, number] {
  const d = ((l.direcao ?? direcaoMenorVao(l.contorno)) * Math.PI) / 180;
  const ext = (ux: number, uy: number) => { const pr = l.contorno.map((q) => q[0] * ux + q[1] * uy); return Math.max(...pr) - Math.min(...pr); };
  return [ext(Math.cos(d), Math.sin(d)), ext(-Math.sin(d), Math.cos(d))];
}

/**
 * Eixos das vigas do grupo como segmentos, com as pontas levadas até o eixo da viga em que se apoiam
 * (vigas alinhadas pela face têm o eixo deslocado: sem isso, cantos e "T" não fechariam).
 */
export function eixosDasVigas(b: BuildingModel, grupo: string, soEstruturais = false): [P, P][] {
  const vs = b.vigas.filter((v) => v.grupo === grupo && (!soEstruturais || v.estrutural !== false)).map((v) => ({ v, e: geometriaViga(v).eixo.map((q) => [q[0], q[1]] as P) }));
  const folga = 0.01;
  for (const A of vs) for (const k of [0, A.e.length - 1]) {
    const E = A.e[k], V = k === 0 ? A.e[1] : A.e[A.e.length - 2];
    const dx = E[0] - V[0], dy = E[1] - V[1];
    let melhor: P | null = null, dm = Infinity;
    for (const B of vs) {
      if (B === A) continue;
      for (let i = 0; i + 1 < B.e.length; i++) {
        const c = B.e[i], f = B.e[i + 1], ex = f[0] - c[0], ey = f[1] - c[1], den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) continue;
        const t = ((c[0] - V[0]) * ey - (c[1] - V[1]) * ex) / den, u = ((c[0] - V[0]) * dy - (c[1] - V[1]) * dx) / den;
        const X: P = [V[0] + t * dx, V[1] + t * dy], d = Math.hypot(X[0] - E[0], X[1] - E[1]);
        const alcance = (A.v.secao.b + B.v.secao.b) / 2 + folga, Lb = Math.hypot(ex, ey);
        if (d <= alcance && d < dm && u >= -alcance / Lb && u <= 1 + alcance / Lb) { dm = d; melhor = X; }
      }
    }
    if (melhor) A.e[k] = melhor;
  }
  const segs: [P, P][] = [];
  for (const { e } of vs) for (let i = 0; i + 1 < e.length; i++) segs.push([e[i], e[i + 1]]);
  return segs;
}

/** Panos (regiões fechadas) formados pelo eixo das vigas do grupo. */
export function panosDoGrupo(b: BuildingModel, grupo: string): P[][] {
  // paredes de concreto (E1c) também fecham panos
  return faces(b.paredes?.length ? [...eixosDasVigas(b, grupo), ...eixosDasParedes(b, grupo)] : eixosDasVigas(b, grupo), { tol: 0.01, areaMin: 0.05 });
}

export const areaLaje = (l: Pick<Laje, 'contorno' | 'furos'>) => Math.abs(areaPoligono(l.contorno)) - (l.furos ?? []).reduce((s, f) => s + Math.abs(areaPoligono(f)), 0);

function lajesSeSobrepoem(a: Laje, z: Laje): boolean {
  const ia = pontoInterno(a.contorno), iz = pontoInterno(z.contorno);
  if (dentroPoligono(ia, z.contorno) || dentroPoligono(iz, a.contorno)) return true;
  const cr = (p: P, q: P, r: P) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  for (let i = 0; i < a.contorno.length; i++) for (let j = 0; j < z.contorno.length; j++) {
    const p1 = a.contorno[i], p2 = a.contorno[(i + 1) % a.contorno.length], q1 = z.contorno[j], q2 = z.contorno[(j + 1) % z.contorno.length];
    if (cr(p1, p2, q1) * cr(p1, p2, q2) < -1e-9 && cr(q1, q2, p1) * cr(q1, q2, p2) < -1e-9) return true;
  }
  return false;
}

/** O contorno da laje coincide com um pano fechado por vigas? */
const ehPano = (l: Laje, panos: P[][]) => panos.some((p) => Math.abs(Math.abs(areaPoligono(p)) - Math.abs(areaPoligono(l.contorno))) < 1e-3 && dentroPoligono(pontoInterno(l.contorno), p));

export function diagnosticosLajes(b: BuildingModel): Diagnostico[] {
  const d: Diagnostico[] = [];
  for (const g of b.grupos) {
    const ls = b.lajes.filter((l) => l.grupo === g.id);
    const panos = panosDoGrupo(b, g.id);
    for (const p of panos) {
      const q = pontoInterno(p);
      if (!ls.some((l) => dentroPoligono(q, l.contorno) || (l.furos ?? []).some((f) => dentroPoligono(q, f)))) d.push({ codigo: 'PANO_SEM_LAJE', severidade: 'aviso', elementos: [], mensagem: `Região fechada por vigas sem laje em “${g.nome}” (${String(+Math.abs(areaPoligono(p)).toFixed(2)).replace('.', ',')} m²).`, sugestao: { comando: 'laje.criar', params: { grupo: g.id, ponto: [+q[0].toFixed(4), +q[1].toFixed(4)] }, texto: 'Criar laje maciça h=10 neste pano' } });
    }
    for (const l of ls) if (l.definir)
      d.push({ codigo: 'DEFINIR_PANO', severidade: 'erro', elementos: [l.id], mensagem: `${l.nome} é um pano a definir (?): atribua o tipo da laje antes de calcular.`, sugestao: { comando: 'laje.editar', params: { id: l.id, tipo: { tipo: 'macica', h: 0.1 } }, texto: `Definir ${l.nome} como maciça h=10` } });
    for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++)
      if (lajesSeSobrepoem(ls[i], ls[j])) d.push({ codigo: 'LAJES_SOBREPOSTAS', severidade: 'erro', elementos: [ls[i].id, ls[j].id], mensagem: `${ls[i].nome} e ${ls[j].nome} se sobrepõem.` });
    for (const l of ls) for (const x of errosTipoLaje(b, l.tipo)) d.push({ codigo: x.codigo, severidade: 'erro', elementos: [l.id], mensagem: `${l.nome}: ${x.mensagem}` });
    for (const l of ls) if (ehNervurada(l.tipo) && !ehPano(l, panos))
      d.push({ codigo: 'TRELICADA_SEM_APOIO', severidade: 'erro', elementos: [l.id], mensagem: `${l.nome} é treliçada e não está fechada por vigas (balanço ou contorno livre não é permitido).` });
  }
  for (const c of b.cargas) if (c.grupo !== 'fundacao' && !b.grupos.some((g) => g.id === c.grupo)) d.push({ codigo: 'CARGA_SEM_GRUPO', severidade: 'erro', elementos: [c.id], mensagem: 'Carga em grupo inexistente.' });
  return d;
}

/** Peso específico da alvenaria com revestimento (kN/m³) por tipo de bloco [a confirmar]. */
export const BLOCOS: Record<string, { rotulo: string; gama: number }> = {
  ceramico: { rotulo: 'bloco cerâmico', gama: 13 },
  concreto: { rotulo: 'bloco de concreto', gama: 14 },
};

/**
 * Eixos das paredes desenhadas por duas linhas paralelas numa camada da máscara: pares paralelos com
 * afastamento entre `emin` e `emax` (m) e trecho comum ≥ `lmin` viram o segmento médio do trecho comum.
 */
export function paredesDaMascara(b: BuildingModel, grupo: string, camada: string, emin = 0.05, emax = 0.35, lmin = 0.2): { a: P; z: P; e: number }[] {
  const segs: [P, P][] = [];
  for (const m of b.mascaras.filter((x) => mascaraNoGrupo(x, grupo))) {
    const g = m.geo[camada];
    if (!g) continue;
    for (let k = 0; k < g.linhas.length; k += 4) segs.push([mascaraParaMundo(m, g.linhas[k], g.linhas[k + 1]), mascaraParaMundo(m, g.linhas[k + 2], g.linhas[k + 3])]);
  }
  const out: { a: P; z: P; e: number }[] = [];
  const usado = new Set<number>(); // cada linha forma no máximo uma parede (a do par mais próximo)
  for (let i = 0; i < segs.length; i++) {
    if (usado.has(i)) continue;
    const [a, z] = segs[i], L = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (L < lmin) continue;
    const ux = (z[0] - a[0]) / L, uy = (z[1] - a[1]) / L, nx = -uy, ny = ux;
    let melhor: { j: number; e: number; t0: number; t1: number } | null = null;
    for (let j = 0; j < segs.length; j++) {
      if (j === i || usado.has(j)) continue;
      const [c, f] = segs[j], M = Math.hypot(f[0] - c[0], f[1] - c[1]);
      if (M < lmin || Math.abs(((f[0] - c[0]) * ux + (f[1] - c[1]) * uy) / M) < 0.9998) continue; // paralelo (≈ 1°)
      const e = (c[0] - a[0]) * nx + (c[1] - a[1]) * ny, e2 = (f[0] - a[0]) * nx + (f[1] - a[1]) * ny;
      if (Math.abs(e - e2) > 0.005 || Math.abs(e) < emin || Math.abs(e) > emax) continue;
      const s0 = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy, s1 = (f[0] - a[0]) * ux + (f[1] - a[1]) * uy;
      const t0 = Math.max(0, Math.min(s0, s1)), t1 = Math.min(L, Math.max(s0, s1));
      if (t1 - t0 < lmin) continue;
      if (!melhor || Math.abs(e) < Math.abs(melhor.e)) melhor = { j, e, t0, t1 };
    }
    if (!melhor) continue;
    usado.add(i); usado.add(melhor.j);
    const h = melhor.e / 2;
    const p = (t: number): P => [+(a[0] + ux * t + nx * h).toFixed(4), +(a[1] + uy * t + ny * h).toFixed(4)];
    out.push({ a: p(melhor.t0), z: p(melhor.t1), e: +Math.abs(melhor.e).toFixed(4) });
  }
  return out;
}
