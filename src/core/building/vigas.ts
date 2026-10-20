// Regras das vigas na planta: apoios (pilares e outras vigas), sobreposição, face do pilar e diagnósticos de lançamento.
import {
  contornoPilar, geometriaViga, lancesDoPilar, pavimentosDoGrupo, secaoNoLance, trechosViga,
  type BuildingModel, type Pilar, type Viga,
} from './types';
import type { Diagnostico } from './verify';
import { sobrepoe } from '../geom/poly';

type P = [number, number];
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');
/** Folga para considerar que encostar é apoiar (m). */
export const FOLGA_APOIO = 0.01;
/** Distância máxima entre a face da viga e a face paralela do pilar para sugerir o ajuste (m) [a confirmar]. */
export const TOL_FACE = 0.05;

export const vigasDoGrupo = (b: BuildingModel, grupo: string) => b.vigas.filter((v) => v.grupo === grupo);

/** Pilares que chegam ao pavimento (lance com topo nele): apoiam as vigas desse pavimento. */
export const pilaresQueChegam = (b: BuildingModel, pav: string) => b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === pav));

export function vigaTocaPilar(v: Viga, p: Pilar, pav: string): boolean {
  const c = contornoPilar(p, secaoNoLance(p, pav));
  return trechosViga(v, FOLGA_APOIO).some((t) => sobrepoe(t, c));
}

function distPontoPolilinha(p: P, pts: P[]) {
  let d = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
    d = Math.min(d, Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]));
  }
  return d;
}
function cruzam(a: P[], z: P[]) {
  const cr = (p: P, q: P, r: P) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  for (let i = 0; i + 1 < a.length; i++) for (let j = 0; j + 1 < z.length; j++) {
    const p1 = a[i], p2 = a[i + 1], q1 = z[j], q2 = z[j + 1];
    if (cr(p1, p2, q1) * cr(p1, p2, q2) < 0 && cr(q1, q2, p1) * cr(q1, q2, p2) < 0) return true;
  }
  return false;
}

/** Vigas se apoiam (cruzamento dos eixos ou ponta de uma dentro do corpo da outra)? */
export function vigasSeTocam(v: Viga, w: Viga): boolean {
  const ev = geometriaViga(v).eixo, ew = geometriaViga(w).eixo;
  if (cruzam(ev, ew)) return true;
  for (const e of [ev[0], ev[ev.length - 1]]) if (distPontoPolilinha(e, ew) <= w.secao.b / 2 + FOLGA_APOIO) return true;
  for (const e of [ew[0], ew[ew.length - 1]]) if (distPontoPolilinha(e, ev) <= v.secao.b / 2 + FOLGA_APOIO) return true;
  return false;
}

/** Duas vigas paralelas e sobrepostas no mesmo alinhamento? */
function vigasSobrepostas(v: Viga, w: Viga): boolean {
  for (const t of trechosViga(v, -FOLGA_APOIO)) for (const u of trechosViga(w, -FOLGA_APOIO)) if (sobrepoe(t, u, 0.005)) {
    // cruzamento em T ou em X não é sobreposição: exige paralelismo
    const d1 = [t[1][0] - t[0][0], t[1][1] - t[0][1]], d2 = [u[1][0] - u[0][0], u[1][1] - u[0][1]];
    const sen = Math.abs(d1[0] * d2[1] - d1[1] * d2[0]) / (Math.hypot(d1[0], d1[1]) * Math.hypot(d2[0], d2[1]) || 1);
    if (sen < 0.02) return true;
  }
  return false;
}

/**
 * Deslocamento (à esquerda do traçado) que encosta uma face da viga na face paralela de um pilar apoiado no trecho,
 * quando a distância entre as faces está entre 0 e `tol` e a viga não está centrada no pilar. 0 = nada a ajustar.
 */
export function ajusteFaceTrecho(v: Viga, i: number, pilares: { p: Pilar; pav: string }[], tol = TOL_FACE): number {
  const a = v.pontos[i], z = v.pontos[i + 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]);
  if (!L) return 0;
  const ux = (z[0] - a[0]) / L, uy = (z[1] - a[1]) / L, nx = -uy, ny = ux;
  const t = trechosViga(v, FOLGA_APOIO + tol)[i];
  const g = geometriaViga(v);
  const fEsq = (g.esq[i][0] - a[0]) * nx + (g.esq[i][1] - a[1]) * ny, fDir = (g.dir[i][0] - a[0]) * nx + (g.dir[i][1] - a[1]) * ny;
  let melhor = 0;
  for (const { p, pav } of pilares) {
    const s = secaoNoLance(p, pav);
    if (s.tipo !== 'ret') continue;
    const ang = (p.angulo * Math.PI) / 180;
    const paralelo = Math.abs(Math.abs(ux * Math.cos(ang) + uy * Math.sin(ang)) - 1) < 2e-4 || Math.abs(ux * Math.cos(ang) + uy * Math.sin(ang)) < 0.0141;
    if (!paralelo) continue;
    const c = contornoPilar(p, s);
    if (!sobrepoe(t, c)) continue;
    const proj = c.map((q) => (q[0] - a[0]) * nx + (q[1] - a[1]) * ny);
    const pMax = Math.max(...proj), pMin = Math.min(...proj);
    // face esquerda da viga com a face "de cima" do pilar; face direita com a "de baixo".
    // Viga centrada no pilar (folgas iguais dos dois lados) é intencional: não ajusta.
    const dE = pMax - fEsq, dD = pMin - fDir;
    if (Math.abs(dE + dD) < 1e-3) continue;
    for (const d of [dE, dD]) if (Math.abs(d) > 1e-4 && Math.abs(d) <= tol && (!melhor || Math.abs(d) < Math.abs(melhor))) melhor = d;
  }
  return melhor;
}

/** Diagnósticos das vigas e da ligação viga-pilar, por grupo e pavimento. */
export function diagnosticosVigas(b: BuildingModel): Diagnostico[] {
  const d: Diagnostico[] = [];
  for (const g of b.grupos) {
    const vs = vigasDoGrupo(b, g.id), pavs = pavimentosDoGrupo(b, g.id);
    if (!pavs.length) continue;
    // vigas sem apoio / com um apoio só (por pavimento do grupo; mensagem única por viga)
    for (const v of vs) {
      const semApoio: string[] = [], umApoio: string[] = [];
      let soViga = false;
      for (const pav of pavs) {
        const np = pilaresQueChegam(b, pav.id).filter((p) => vigaTocaPilar(v, p, pav.id)).length;
        const nv = vs.filter((w) => w.id !== v.id && vigasSeTocam(v, w)).length;
        if (np + nv === 0) semApoio.push(pav.nome);
        else if (np + nv === 1) { umApoio.push(pav.nome); soViga = np === 0; }
      }
      if (semApoio.length) d.push({ codigo: 'VIGA_SEM_APOIO', severidade: 'erro', elementos: [v.id], mensagem: `${v.nome} não se apoia em pilar nem em viga (${semApoio.join(', ')}).` });
      else if (umApoio.length) d.push({ codigo: 'VIGA_BALANCO', severidade: 'aviso', elementos: [v.id], mensagem: `${v.nome} tem um apoio só (balanço${soViga ? ' sobre viga: exige engaste por torção' : ''}) em ${umApoio.join(', ')}.` });
    }
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++)
      if (vigasSobrepostas(vs[i], vs[j])) d.push({ codigo: 'VIGAS_SOBREPOSTAS', severidade: 'erro', elementos: [vs[i].id, vs[j].id], mensagem: `${vs[i].nome} e ${vs[j].nome} se sobrepõem.` });
    // face do pilar
    for (const v of vs) {
      const ps = pavs.flatMap((pav) => pilaresQueChegam(b, pav.id).map((p) => ({ p, pav: pav.id })));
      const fora = v.pontos.slice(1).map((_, i) => ajusteFaceTrecho(v, i, ps)).filter((x) => x);
      if (fora.length) d.push({ codigo: 'VIGA_FORA_FACE', severidade: 'aviso', elementos: [v.id], mensagem: `Face de ${v.nome} a ${fmt(Math.abs(fora[0]) * 100)} cm da face do pilar.`, sugestao: { comando: 'viga.ajustarFaces', params: { grupo: g.id, ids: [v.id] }, texto: 'Encostar na face do pilar' } });
    }
    // pilares sem viga e pilares que nascem sem apoio
    if (vs.length) {
      const sem = new Map<string, string[]>();
      for (const pav of pavs)
        for (const p of pilaresQueChegam(b, pav.id))
          if (!vs.some((v) => vigaTocaPilar(v, p, pav.id))) sem.set(p.id, [...(sem.get(p.id) ?? []), pav.nome]);
      for (const [id, nomes] of sem) d.push({ codigo: 'PILAR_SEM_VIGA', severidade: 'aviso', elementos: [id], mensagem: `${b.pilares.find((p) => p.id === id)!.nome} não recebe viga em ${nomes.join(', ')}.` });
    }
    for (const pav of pavs)
      for (const p of b.pilares.filter((x) => x.nasce === pav.id)) {
        const c = contornoPilar(p, p.secao);
        const sobre = vs.filter((v) => trechosViga(v).some((t) => sobrepoe(t, c)));
        d.push(sobre.length
          ? { codigo: 'PILAR_TRANSICAO', severidade: 'erro', elementos: [p.id, ...sobre.map((v) => v.id)], mensagem: `${p.nome} nasce sobre ${sobre.map((v) => v.nome).join(', ')} em ${pav.nome}: viga de transição chega na V2.` }
          : { codigo: 'PILAR_NASCE_SEM_APOIO', severidade: 'erro', elementos: [p.id], mensagem: `${p.nome} nasce em ${pav.nome} sem viga embaixo.` });
      }
  }
  return d;
}

/** Nome V<n> seguinte no grupo. */
export const proximaViga = (b: BuildingModel, grupo: string) => Math.max(0, ...vigasDoGrupo(b, grupo).map((v) => { const m = /^V(\d+)$/.exec(v.nome); return m ? +m[1] : 0; })) + 1;

