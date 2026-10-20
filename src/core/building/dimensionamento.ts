// Dimensionamento do edifício (NBR 6118) a partir da análise: vigas (flexão e cortante pela envoltória ELU),
// pilares (pilar-padrão com curvatura aproximada nas duas direções e flexão oblíqua por fibras), lajes maciças
// (momentos por metro da grelha) e quantitativos. Cargas para o módulo Fundações.
import { baseBarra, type Caso3, type Modelo3, type V3 } from '../fe3d';
import { barArea, beamAsMin, beamFlexure, beamShear, chooseBars, gammaNFor, PHI_L } from '../concrete';
import { acoDe, cobrimentoLaje, cobrimentoPilar, cobrimentoViga, concretoDe, flambagemLance, gamas } from './materiais';
import { fiberAxialRange, fiberCapacity, fiberMesh, polyProps, circlePolygon, type FiberSection, type Pt, type RBar } from '../fiber';
import type { FLoad } from '../piles';
import type { AnaliseEdificio } from './analitico';
import { combinacoesEdificio, type CombinacaoEd } from './combinacoes';
import { propriedadesLaje, TRELICADAS, vaos } from './lajes';
import { casosDaObra, centroPilar, comprimentoPolilinha, dimsSecao, lancesDoPilar, pavimentosOrdenados, secaoNoLance, type BuildingModel } from './types';
import { areaPoligono } from '../geom/faces';
import { TAXAS } from './premissas';
export { TAXAS };

const AVISO_CA60 = 'CA-60 só existe até φ10: confira as bitolas maiores.';

// ---------------- esforços ao longo da barra ----------------

export interface Estacao { x: number; N: number; Vy: number; Vz: number; My: number; Mz: number }

/**
 * Esforços internos ao longo da parte flexível (eixos locais; N > 0 tração; Mz > 0 traciona a face y−,
 * isto é, nas vigas M > 0 traciona embaixo) a partir dos esforços de extremidade e das cargas na barra.
 */
export function esforcosAoLongo(m: Modelo3, bi: number, f: ArrayLike<number>, caso: Caso3 | undefined, xs: number[]): Estacao[] {
  const { R } = baseBarra(m, m.barras[bi]);
  const loc = (g: ArrayLike<number>, o = 0): V3 => [0, 1, 2].map((r) => R[r][0] * g[o] + R[r][1] * g[o + 1] + R[r][2] * g[o + 2]) as V3;
  let q: V3 = [0, 0, 0];
  for (const d of caso?.distribuidas ?? []) if (d.barra === bi) { const l = loc(d.q); q = [q[0] + l[0], q[1] + l[1], q[2] + l[2]]; }
  const pts = (caso?.pontuais ?? []).filter((p) => p.barra === bi).map((p) => ({ a: p.a, F: loc(p.f, 0), M: loc(p.f, 3) }));
  return xs.map((x) => {
    let Fx = f[0] + q[0] * x, Fy = f[1] + q[1] * x, Fz = f[2] + q[2] * x;
    let Mz = -f[5] + x * f[1] + (q[1] * x * x) / 2, My = -f[4] - x * f[2] - (q[2] * x * x) / 2;
    for (const p of pts) if (p.a < x - 1e-9) {
      Fx += p.F[0]; Fy += p.F[1]; Fz += p.F[2];
      Mz += p.F[1] * (x - p.a) - p.M[2];
      My += -p.F[2] * (x - p.a) - p.M[1];
    }
    return { x, N: -Fx, Vy: -Fy, Vz: -Fz, My, Mz };
  });
}

/** Esforços por caso de uma barra do pórtico: { G: estações, Q: …, W0°: … }. */
function porCaso(an: AnaliseEdificio, bi: number, xs: number[]): Record<string, Estacao[]> {
  const pm = an.portico, out: Record<string, Estacao[]> = {};
  if (!pm.res) return out;
  an.casos.forEach((c, ic) => (out[c] = esforcosAoLongo(pm.modelo, bi, pm.res!.esforcos[ic][bi], pm.casos?.[ic], xs)));
  (an.vento?.casos ?? []).forEach((cv, ic) => { if (pm.resVento) out[cv.nome] = esforcosAoLongo(pm.modelo, bi, pm.resVento.esforcos[ic][bi], pm.casosVento?.[ic], xs); });
  return out;
}

const comb = (pc: Record<string, Estacao[]>, c: CombinacaoEd, i: number, k: keyof Estacao) => Object.entries(c.fatores).reduce((s, [nome, f]) => s + f * (pc[nome]?.[i]?.[k] ?? 0), 0);

// ---------------- vigas ----------------

export interface ResultadoViga {
  viga: string; nome: string; grupo: string; b: number; h: number; L: number;
  Mpos: number; Mneg: number; V: number;
  AsInf: number; AsSup: number; barrasInf: string; barrasSup: string; estribo: string;
  status: 'ok' | 'fail'; mensagens: string[];
}

function dimensionarVigas(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[]): ResultadoViga[] {
  const c = concretoDe(b, 'viga'), aPos = acoDe(b, 'vigaPos'), aNeg = acoDe(b, 'vigaNeg'), aEst = acoDe(b, 'vigaEstribo'), gs = gamas(b).s;
  const out: ResultadoViga[] = [];
  const pm = an.portico;
  for (const v of b.vigas) {
    const membros = pm.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === 'viga' && t.ref === v.id).map(([, i]) => i);
    if (!membros.length) continue;
    let Mpos = 0, Mneg = 0, V = 0;
    for (const bi of membros) {
      const { L } = baseBarra(pm.modelo, pm.modelo.barras[bi]);
      const n = Math.max(4, Math.ceil(L / 0.25));
      const xs = Array.from({ length: n + 1 }, (_, k) => (k * L) / n);
      for (const p of pm.casos?.flatMap((cs) => cs.pontuais ?? []) ?? []) if (p.barra === bi) xs.push(Math.max(0, p.a - 1e-6), Math.min(L, p.a + 1e-6));
      xs.sort((a, z) => a - z);
      const pc = porCaso(an, bi, xs);
      for (const cb of elu) for (let i = 0; i < xs.length; i++) {
        const M = comb(pc, cb, i, 'Mz'), Vv = comb(pc, cb, i, 'Vy');
        Mpos = Math.max(Mpos, M); Mneg = Math.min(Mneg, M); V = Math.max(V, Math.abs(Vv));
      }
    }
    const sec = { kind: 'rect' as const, bw: v.secao.b, h: v.secao.h };
    // d da armadura positiva pela face inferior e da negativa pela superior (cobrimentos por face: materiais.ts)
    const cob = cobrimentoViga(b, v.cobrimento), dI = v.secao.h - cob.inf - 0.005 - 0.008, dS = v.secao.h - cob.sup - 0.005 - 0.008;
    const d2I = cob.sup + 0.005 + 0.008, d2S = cob.inf + 0.005 + 0.008, d = Math.min(dI, dS);
    const msgs: string[] = [];
    const flx = (M: number, dd: number, d2: number, fyd: number) => { const r = beamFlexure(sec, false, M, dd, d2, c, fyd); return Math.max(r.As, M ? beamAsMin(sec, false, dd, c, fyd) : 0); };
    const AsInf = Math.max(flx(Mpos, dI, d2I, aPos.fyd), beamAsMin(sec, false, dI, c, aPos.fyd)), AsSup = Mneg < 0 ? flx(-Mneg, dS, d2S, aNeg.fyd) : 0;
    const fi = beamFlexure(sec, false, Mpos, dI, d2I, c, aPos.fyd), fs = beamFlexure(sec, false, -Mneg, dS, d2S, c, aNeg.fyd);
    if (fi.double || fs.double) msgs.push('Armadura dupla (x limitado): aumente a altura.');
    const sh = beamShear(v.secao.b, d, V, c, aEst.fyk, gs);
    if (!sh.ok) msgs.push(`Biela comprimida: Vsd ${V.toFixed(1)} > VRd2 ${sh.VRd2.toFixed(1)} kN.`);
    const bi = chooseBars(AsInf, v.secao.b, cob.lat, 0.005, 0.019), bs = chooseBars(AsSup, v.secao.b, cob.lat, 0.005, 0.019);
    const txt = (x: ReturnType<typeof chooseBars>) => (x ? `${x.n} φ${String(x.phi).replace('.', ',')}${x.layers > 1 ? ` (${x.layers} camadas)` : ''}` : '—');
    if (!bi && AsInf > 0) msgs.push('Armadura inferior não cabe na largura.');
    if ((aPos.aco === 'CA-60' && (bi?.phi ?? 0) > 10) || (aNeg.aco === 'CA-60' && (bs?.phi ?? 0) > 10)) msgs.push(AVISO_CA60);
    out.push({
      viga: v.id, nome: v.nome, grupo: v.grupo, b: v.secao.b, h: v.secao.h, L: comprimentoPolilinha(v.pontos),
      Mpos, Mneg, V, AsInf, AsSup, barrasInf: txt(bi), barrasSup: AsSup ? txt(bs) : '—',
      estribo: sh.stirrup ? `φ${String(sh.stirrup.phi).replace('.', ',')} c/${Math.round(sh.stirrup.s * 100)}` : '—',
      status: msgs.some((x) => x.startsWith('Biela') || x.startsWith('Armadura inferior')) || !sh.ok ? 'fail' : 'ok', mensagens: msgs,
    });
  }
  return out;
}

// ---------------- pilares ----------------

export interface ResultadoPilar {
  pilar: string; nome: string; pavimento: string; secao: string; Nd: number; util: number; lambda: [number, number];
  /** Comprimentos de flambagem (m) nas direções u (ao longo de b) e v. */
  le: [number, number];
  armadura: string; As: number; estribo: string; status: 'ok' | 'fail' | 'review'; mensagens: string[];
}

/** Barras no contorno interno do retângulo b × h (u ao longo de b) ou do círculo, com espaçamento até `s`. */
function barrasPerimetro(poly: Pt[], circ: number | null, a: number, s: number, Ab: number): RBar[] {
  if (circ) { const rs = circ / 2 - a, n = Math.max(6, Math.ceil((2 * Math.PI * rs) / s)); return Array.from({ length: n }, (_, k) => ({ x: circ / 2 + rs * Math.cos((2 * Math.PI * k) / n), y: circ / 2 + rs * Math.sin((2 * Math.PI * k) / n), A: Ab })); }
  const [w, h] = [poly[1][0], poly[2][1]];
  const nx = Math.max(1, Math.ceil((w - 2 * a) / s - 1e-9)), ny = Math.max(1, Math.ceil((h - 2 * a) / s - 1e-9));
  const out: RBar[] = [];
  for (let i = 0; i <= nx; i++) { const x = a + ((w - 2 * a) * i) / nx; out.push({ x, y: a, A: Ab }, { x, y: h - a, A: Ab }); }
  for (let j = 1; j < ny; j++) { const y = a + ((h - 2 * a) * j) / ny; out.push({ x: a, y, A: Ab }, { x: w - a, y, A: Ab }); }
  return out;
}

function dimensionarPilares(b: BuildingModel, an: AnaliseEdificio, elu: CombinacaoEd[]): ResultadoPilar[] {
  const FYD = acoDe(b, 'pilarLong').fyd, acoLong = acoDe(b, 'pilarLong').aco;
  const pm = an.portico, out: ResultadoPilar[] = [];
  for (const p of b.pilares) for (const lance of lancesDoPilar(b, p)) {
    const c = concretoDe(b, 'pilar', lance.id), cob = cobrimentoPilar(b, p.cobrimento);
    const bi = pm.barras.findIndex((t) => t.tipo === 'pilar' && t.ref === p.id && t.pavimento === lance.id);
    if (bi < 0) continue;
    const s = secaoNoLance(p, lance.id), [w, h] = dimsSecao(s);
    const circ = s.tipo === 'circ' ? s.d : null;
    const { L } = baseBarra(pm.modelo, pm.modelo.barras[bi]);
    const pc = porCaso(an, bi, [0, L]);
    const poly: Pt[] = circ ? circlePolygon(circ) : [[0, 0], [w, 0], [w, h], [0, h]];
    const P = polyProps(poly), Ac = circ ? (Math.PI * circ * circ) / 4 : w * h;
    const iu = Math.sqrt(P.Iy / P.A), iv = Math.sqrt(P.Ix / P.A); // u ao longo de x da seção (b), v ao longo de y (h)
    // comprimento de flambagem por direção: ℓe = mín(ℓ0 + h; ℓ) × α (NBR 6118, 15.6; nós contraventados pelo diafragma)
    const fl = flambagemLance(b, p, lance.id), lamU = fl.leU / iu, lamV = fl.leV / iv, le: [number, number] = [fl.leU, fl.leV];
    const gn = gammaNFor(Math.min(w, h));
    const msgs: string[] = [];
    if (Math.max(lamU, lamV) > 200) { out.push({ pilar: p.id, nome: p.nome, pavimento: lance.nome, secao: secTxt(s), Nd: 0, util: 99, lambda: [lamU, lamV], le, armadura: '—', As: 0, estribo: '—', status: 'fail', mensagens: ['λ > 200.'] }); continue; }
    // solicitações por combinação: Nd (compressão +), momentos nas duas direções nas duas pontas (u: flexão com deslocamento ao longo de b → Mz local)
    const sol = elu.map((cb) => {
      const N0 = -comb(pc, cb, 0, 'N') * gn, NL = -comb(pc, cb, 1, 'N') * gn;
      return { nome: cb.nome, Nd: Math.max(N0, NL), Nt: Math.min(N0, NL), Mu: [comb(pc, cb, 0, 'Mz') * gn, comb(pc, cb, 1, 'Mz') * gn], Mv: [comb(pc, cb, 0, 'My') * gn, comb(pc, cb, 1, 'My') * gn] };
    });
    const NdMax = Math.max(0, ...sol.map((x) => x.Nd));
    const AsMin = Math.max((0.15 * NdMax) / 1000 / FYD, 0.004 * Ac), AsMax = 0.04 * Ac;
    // combinações determinantes (Nd máx./mín., maiores momentos em cada direção e a maior soma relativa)
    const am = (m: number[]) => Math.max(Math.abs(m[0]), Math.abs(m[1]));
    const comp = sol.filter((x) => x.Nd > 0), pick = new Set<number>();
    const arg = (f: (x: (typeof sol)[number]) => number) => comp.reduce((bi, x, i) => (f(x) > f(comp[bi]) ? i : bi), 0);
    if (comp.length) for (const f of [(x: (typeof sol)[number]) => x.Nd, (x: (typeof sol)[number]) => -x.Nd, (x: (typeof sol)[number]) => am(x.Mu), (x: (typeof sol)[number]) => am(x.Mv), (x: (typeof sol)[number]) => am(x.Mu) / w + am(x.Mv) / h]) pick.add(arg(f));
    const solD = [...pick].map((i) => comp[i]);
    // tração (N < 0 numa das pontas): mais tracionada e maiores momentos; sem efeitos de 2ª ordem nem M1d,mín
    const tra = sol.filter((x) => x.Nt < 0), pickT = new Set<number>();
    const argT = (f: (x: (typeof sol)[number]) => number) => tra.reduce((bi, x, i) => (f(x) > f(tra[bi]) ? i : bi), 0);
    if (tra.length) for (const f of [(x: (typeof sol)[number]) => -x.Nt, (x: (typeof sol)[number]) => am(x.Mu), (x: (typeof sol)[number]) => am(x.Mv)]) pickT.add(argT(f));
    const traD = [...pickT].map((i) => tra[i]);
    const mesh = fiberMesh(poly, circ ? 24 : 16);
    const direcao = (Nd: number, M: number[], hDir: number, lam: number, Le: number) => {
      const MA = Math.max(Math.abs(M[0]), Math.abs(M[1])), MB = Math.min(Math.abs(M[0]), Math.abs(M[1]));
      const M1min = Nd * (0.015 + 0.03 * hDir);
      // momentos internos com o mesmo sinal nas pontas = curvatura simples (MB/MA > 0); sinais opostos = curvatura dupla
      let ab = Math.max(0.4, Math.min(1, 0.6 + 0.4 * (MA > 0 ? (M[0] * M[1] > 0 ? MB / MA : -MB / MA) : 0)));
      if (MA < M1min) ab = 1;
      const lam1 = Math.max(35, Math.min(90, (25 + (12.5 * (MA / Math.max(Nd, 1e-9))) / hDir) / ab));
      const nu = Nd / 1000 / (Ac * c.fcd);
      const M2 = lam > lam1 ? ((Nd * Le * Le) / 10) * Math.min(0.005 / (hDir * (nu + 0.5)), 0.005 / hDir) : 0;
      const base = Math.max(MA, M1min);
      return { tot: Math.max(ab * base + M2, base), M1: base };
    };
    const avaliar = (bars: RBar[]) => {
      const S: FiberSection = { mesh, bars, cx: P.cx, cy: P.cy, c, fyd: FYD, poly };
      const { NRc, NRt } = fiberAxialRange(S);
      let util = 0;
      for (const x of traD) {
        if (x.Nt / 1000 < NRt) { util = Math.max(util, 99); continue; }
        const mu = am(x.Mu), mv = am(x.Mv);
        if (Math.hypot(mu, mv) < 1e-9) { util = Math.max(util, x.Nt / 1000 / NRt); continue; }
        const R = fiberCapacity(S, x.Nt / 1000, mu, mv);
        util = Math.max(util, R === null ? 99 : Math.hypot(mu, mv) / 1000 / R);
      }
      for (const x of solD) {
        if (x.Nd / 1000 > NRc) { util = Math.max(util, 99); continue; }
        const du = direcao(x.Nd, x.Mu, w, lamU, fl.leU), dv = direcao(x.Nd, x.Mv, h, lamV, fl.leV);
        // seção e armadura duplamente simétricas: um quadrante basta
        for (const [mu, mv] of [[du.tot, dv.M1], [du.M1, dv.tot]]) {
          const R = fiberCapacity(S, x.Nd / 1000, mu, mv);
          util = Math.max(util, R === null ? 99 : Math.hypot(mu, mv) / 1000 / R);
        }
      }
      return util;
    };
    let melhor: { util: number; txt: string; As: number; phi: number } | null = null;
    const tMin = circ ?? Math.min(w, h);
    busca: for (const phi of PHI_L) {
      if (phi < 10 || phi > 25 || phi / 1000 > tMin / 8) continue; // φ10 a φ25 (premissa dim-pilares)
      const a = cob + 0.005 + phi / 2000;
      for (const sp of [0.3, 0.25, 0.2, 0.15, 0.12, 0.1]) {
        const bars = barrasPerimetro(poly, circ, a, sp, barArea(phi));
        const As = bars.length * barArea(phi);
        if (As < AsMin || As > AsMax) continue;
        const u = avaliar(bars);
        if (!melhor || u < melhor.util || (u <= 1 && melhor.util <= 1 && As < melhor.As)) melhor = { util: u, txt: `${bars.length} φ${String(phi).replace('.', ',')}`, As, phi };
        if (u <= 1) break busca;
      }
    }
    if (!melhor) { out.push({ pilar: p.id, nome: p.nome, pavimento: lance.nome, secao: secTxt(s), Nd: NdMax, util: 99, lambda: [lamU, lamV], le, armadura: '—', As: 0, estribo: '—', status: 'fail', mensagens: ['Nenhuma armadura entre As,mín e 4 % cabe na seção.'] }); continue; }
    let status: ResultadoPilar['status'] = melhor.util <= 1 ? 'ok' : 'fail';
    if (Math.max(lamU, lamV) > 90) { status = 'review'; msgs.push('λ > 90: exige método mais refinado.'); }
    if (gn > 1) msgs.push(`γn = ${gn.toFixed(2)} (menor dimensão < 19 cm).`);
    if (tra.length) msgs.push(`Tração em ${tra.length} combinação(ões): até ${(-Math.min(...tra.map((x) => x.Nt))).toFixed(0)} kN (verificada sem 2ª ordem).`);
    if (acoLong === 'CA-60' && melhor.phi > 10) msgs.push(AVISO_CA60);
    if (melhor.util > 1) msgs.push('Não atende com até 4 % de armadura: aumente a seção.');
    const phiT = Math.max(5, melhor.phi / 4), sT = Math.min(0.2, Math.min(w, h), (12 * melhor.phi) / 1000);
    out.push({ pilar: p.id, nome: p.nome, pavimento: lance.nome, secao: secTxt(s), Nd: NdMax, util: melhor.util, lambda: [lamU, lamV], le, armadura: melhor.txt, As: melhor.As, estribo: `φ${String(phiT === 5 ? 5 : 6.3).replace('.', ',')} c/${Math.floor(sT * 100)}`, status, mensagens: msgs });
  }
  return out;
}
const secTxt = (s: { tipo: 'ret'; b: number; h: number } | { tipo: 'circ'; d: number }) => (s.tipo === 'ret' ? `${Math.round(s.b * 100)}×${Math.round(s.h * 100)}` : `ø${Math.round(s.d * 100)}`);

// ---------------- lajes ----------------

export interface ResultadoLaje {
  laje: string; nome: string; pavimento: string; tipo: string; h: number;
  /** Momentos de cálculo por metro (kN·m/m) nas direções 0 (da malha) e 1. */
  mPos: [number, number]; mNeg: [number, number];
  As: { pos: [number, number]; neg: [number, number] }; // cm²/m
  flecha: number; limite: number; status: 'ok' | 'fail'; mensagens: string[];
}

function dimensionarLajes(b: BuildingModel, an: AnaliseEdificio): ResultadoLaje[] {
  const c = concretoDe(b, 'laje'), fInf = acoDe(b, 'lajeInf').fyd, fSup = acoDe(b, 'lajeSup').fyd, gm = gamas(b);
  // natureza e ψ2 de cada caso, na ordem dos resultados da grelha
  const obra = casosDaObra(b), nat = an.casos.map((id) => obra.find((c) => c.id === id)?.natureza ?? 'G');
  const psiQP = an.casos.map((id) => { const c = obra.find((x) => x.id === id); return c?.natureza === 'Q' ? (c.psi?.[2] ?? b.norma.psiQ?.[2] ?? 0.3) : 0; });
  const out: ResultadoLaje[] = [];
  const af = 1.32; // fluência com t0 = 1 mês (premissa do pórtico)
  for (const g of an.grelhas) {
    if (!g.res) continue;
    const pav = b.pavimentos.find((p) => p.id === g.pavimento)!;
    for (const l of b.lajes.filter((x) => x.grupo === pav.grupo)) {
      const mPos: [number, number] = [0, 0], mNeg: [number, number] = [0, 0];
      const nos = new Set<number>();
      g.modelo.barras.forEach((br, i) => {
        const t = g.barras[i];
        if (t.tipo !== 'laje' || t.ref !== l.id || t.dir === undefined || !t.largura) return;
        nos.add(br.i); nos.add(br.j);
        for (const k of [0, 6]) {
          // momento interno nas pontas (sinal de viga: + traciona embaixo); γg·ΣG + γq·ΣQ (casos verticais da grelha)
          const Mi = (ic: number) => (k === 0 ? -g.res!.esforcos[ic][i][5] : g.res!.esforcos[ic][i][11]);
          const md = nat.reduce((t, n, ic) => t + (n === 'G' ? gm.g : n === 'Q' ? gm.q : 0) * Mi(ic), 0) / t.largura;
          mPos[t.dir] = Math.max(mPos[t.dir], md); mNeg[t.dir] = Math.min(mNeg[t.dir], md);
        }
      });
      if (!nos.size) continue;
      const pr = propriedadesLaje(l.tipo), msgs: string[] = [];
      let As = { pos: [0, 0] as [number, number], neg: [0, 0] as [number, number] };
      // quase permanente: permanentes + ψ2 das variáveis
      const fl = Math.max(...[...nos].map((n) => -nat.reduce((t, k, ic) => t + (k === 'G' ? 1 : k === 'Q' ? psiQP[ic] : 0) * g.res!.desloc[ic][n * 6 + 2], 0))) * (1 + af);
      const lim = Math.min(...vaos(l)) / 250;
      if (l.tipo.tipo === 'macica') {
        const h = l.tipo.h, cob = cobrimentoLaje(b, l.cobrimento), dI = h - cob.inf - 0.005, dS = h - cob.sup - 0.005;
        const sec = { kind: 'rect' as const, bw: 1, h };
        const amin = 0.0015 * h; // ρmín 0,15 % (fck ≤ 30) [a confirmar por fck]
        const a = (M: number, dd: number, fyd: number) => Math.max(amin, M ? beamFlexure(sec, false, Math.abs(M), dd, 0.02, c, fyd).As : 0) * 1e4;
        As = { pos: [a(mPos[0], dI, fInf), a(mPos[1], dI, fInf)], neg: [mNeg[0] < 0 ? a(mNeg[0], dS, fSup) : 0, mNeg[1] < 0 ? a(mNeg[1], dS, fSup) : 0] };
      } else {
        const cat = TRELICADAS[l.tipo.modelo] ?? TRELICADAS.H12;
        msgs.push(`Treliçada: momento por nervura (intereixo ${Math.round(cat.intereixo * 100)} cm) = ${(mPos[0] * cat.intereixo).toFixed(2)} kN·m; conferir armadura das vigotas com o fabricante.`);
      }
      if (fl > lim) msgs.push(`Flecha estimada ${(fl * 1000).toFixed(1)} mm > L/250 = ${(lim * 1000).toFixed(1)} mm (elástica × (1 + αf), sem fissuração).`);
      out.push({ laje: l.id, nome: l.nome, pavimento: pav.nome, tipo: pr.descricao, h: pr.h, mPos, mNeg, As, flecha: fl, limite: lim, status: fl > lim ? 'fail' : 'ok', mensagens: msgs });
    }
  }
  return out;
}

// ---------------- quantitativos ----------------

export interface Quantitativo { pavimento: string; concreto: { lajes: number; vigas: number; pilares: number }; forma: { lajes: number; vigas: number; pilares: number }; aco: number }


export function quantitativos(b: BuildingModel): Quantitativo[] {
  const ps = pavimentosOrdenados(b);
  return ps.map((pav, ip) => {
    const ls = b.lajes.filter((l) => l.grupo === pav.grupo), vs = b.vigas.filter((v) => v.grupo === pav.grupo);
    let cL = 0, fL = 0, cV = 0, fV = 0, cP = 0, fP = 0;
    for (const l of ls) {
      const A = Math.abs(areaPoligono(l.contorno)) - (l.furos ?? []).reduce((s, f) => s + Math.abs(areaPoligono(f)), 0);
      const t = l.tipo.tipo === 'macica' ? l.tipo.h : (() => { const k = TRELICADAS[l.tipo.modelo] ?? TRELICADAS.H12; return l.tipo.capa + (k.bw * k.hEnch) / k.intereixo; })();
      cL += A * t; fL += A;
    }
    for (const v of vs) { const L = comprimentoPolilinha(v.pontos); cV += v.secao.b * v.secao.h * L; fV += (v.secao.b + 2 * v.secao.h) * L; }
    const hPav = ip === 0 ? b.obra.profundidadeFundacao : pav.cota - ps[ip - 1].cota;
    for (const p of b.pilares) if (lancesDoPilar(b, p).some((x) => x.id === pav.id)) {
      const s = secaoNoLance(p, pav.id), [w, h] = dimsSecao(s);
      cP += (s.tipo === 'circ' ? (Math.PI * w * w) / 4 : w * h) * hPav; fP += (s.tipo === 'circ' ? Math.PI * w : 2 * (w + h)) * hPav;
    }
    return { pavimento: pav.nome, concreto: { lajes: cL, vigas: cV, pilares: cP }, forma: { lajes: fL, vigas: fV, pilares: fP }, aco: cL * TAXAS.lajes + cV * TAXAS.vigas + cP * TAXAS.pilares };
  });
}

// ---------------- fundação ----------------

/** Cargas características por pilar para o módulo Fundações (rara máx./mín., permanente, H e M da rara máx.). */
export function cargasParaFundacao(b: BuildingModel, an: AnaliseEdificio): FLoad[] {
  const combs = combinacoesEdificio(b, an).filter((x) => x.tipo === 'RARA');
  const porPilar = new Map<string, Record<string, AnaliseEdificio['fundacao'][number]>>();
  const permanentes = casosDaObra(b).filter((c) => c.natureza === 'G').map((c) => c.id);
  for (const f of an.fundacao) { const r = porPilar.get(f.pilar) ?? {}; r[f.caso] = f; porPilar.set(f.pilar, r); }
  let id = 0;
  return b.pilares.filter((p) => porPilar.has(p.id)).map((p) => {
    const r = porPilar.get(p.id)!;
    const v = (cb: CombinacaoEd, k: 'N' | 'Vx' | 'Vy' | 'Mx' | 'My') => Object.entries(cb.fatores).reduce((s, [n, f]) => s + f * (r[n]?.[k] ?? 0), 0);
    const ns = combs.map((cb) => v(cb, 'N'));
    const iMax = ns.indexOf(Math.max(...ns)), cMax = combs[iMax];
    const [cx, cy] = centroPilar(p, p.secao), [w, h] = dimsSecao(p.secao);
    const rot = Math.abs(Math.sin((p.angulo * Math.PI) / 180)) > 0.7;
    return {
      id: ++id, label: p.nome, Nk: +ns[iMax].toFixed(2), NkMin: +Math.min(...ns).toFixed(2), NkPerm: +permanentes.reduce((t, c) => t + (r[c]?.N ?? 0), 0).toFixed(2),
      Hx: +v(cMax, 'Vx').toFixed(2), Hy: +v(cMax, 'Vy').toFixed(2), Mx: +v(cMax, 'Mx').toFixed(2), My: +v(cMax, 'My').toFixed(2),
      x: +cx.toFixed(3), y: +cy.toFixed(3), ap: rot ? h : w, bp: rot ? w : h, source: `Edifício · ${cMax.nome}`,
    };
  });
}

// ---------------- tudo ----------------

export interface Dimensionamento { vigas: ResultadoViga[]; pilares: ResultadoPilar[]; lajes: ResultadoLaje[]; quantitativos: Quantitativo[]; combinacoes: number }

export function dimensionarEdificio(b: BuildingModel, an: AnaliseEdificio): Dimensionamento {
  const combs = combinacoesEdificio(b, an), elu = combs.filter((x) => x.tipo === 'ELU');
  return { vigas: dimensionarVigas(b, an, elu), pilares: dimensionarPilares(b, an, elu), lajes: dimensionarLajes(b, an), quantitativos: quantitativos(b), combinacoes: combs.length };
}
