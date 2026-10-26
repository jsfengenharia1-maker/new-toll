// Memória detalhada (MD fase 4): punção e cortante no entorno do pilar. As contas são refeitas a partir das `entradas` registradas
// (reações por caso, momentos, K da Tabela 19.2, segmentos dos contornos → u, centroide, e*, Wp, MSd1, τSd, τRd1/2/3, varredura de
// cortante, armadura) e comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { ResultadoPuncao } from '../building/puncao';
import type { BuildingModel } from '../building/types';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import type { PassoMemoria } from './registrador';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
const padrao = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;

interface Opt { q?: number; vento?: boolean; secao?: Record<string, unknown>; valores?: Record<string, number>; extra?: (s: Sessao) => void }
/** Laje lisa 12 × 12 m de h (m) em 3 × 3 pilares (4 de canto, 4 de borda e 1 interno). */
function lisa(h: number, o: Opt = {}): Sessao {
  const s = padrao(), xs = [0.25, 6, 11.75];
  if (!o.vento) ok(s, 'vento.definir', { ativo: false });
  if (o.q !== undefined) ok(s, 'grupo.editar', { id: 'g_3', q: o.q });
  ok(s, 'lote', { comandos: xs.flatMap((x) => xs.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: o.secao ?? { tipo: 'ret', b: 0.5, h: 0.5 } } }))) });
  ok(s, 'laje.criar', { grupo: 'g_3', contorno: [[0, 0], [12, 0], [12, 12], [0, 12]], tipo: { tipo: 'macica', h } });
  if (o.valores) ok(s, 'opcoes.definir', { valores: o.valores });
  o.extra?.(s);
  return s;
}
/** Nervurada 12,5 × 12,5 com pilares 50 × 50 a 6 m e ábacos gerados. */
function nervurada(q?: number): Sessao {
  const s = padrao(), XS = [0.25, 6.25, 12.25];
  ok(s, 'vento.definir', { ativo: false });
  if (q !== undefined) ok(s, 'grupo.editar', { id: 'g_3', q });
  ok(s, 'lote', { comandos: XS.flatMap((x) => XS.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.5, h: 0.5 } } }))) });
  ok(s, 'laje.criar', { grupo: 'g_3', contorno: [[0, 0], [12.5, 0], [12.5, 12.5], [0, 12.5]], tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } });
  ok(s, 'abaco.gerar', { lajes: [s.modelo.lajes[0].id] });
  return s;
}
/** Radier 8 × 7 m sob quatro pilares, com 1500 kN a mais no P1. */
function radier(): Sessao {
  const s = padrao();
  ok(s, 'vento.definir', { ativo: false });
  ok(s, 'lote', { comandos: [[1, 1], [7, 1], [7, 6], [1, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok(s, 'lote', { comandos: [[[1, 1], [7, 1]], [[1, 6], [7, 6]], [[1, 1], [1, 6]], [[7, 1], [7, 6]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
  ok(s, 'radier.criar', { contorno: [[0, 0], [8, 0], [8, 7], [0, 7]], h: 0.25, k: 40000, sigmaAdm: 300 });
  ok(s, 'carga.pilar', { pilar: s.modelo.pilares[0].id, pavimento: s.modelo.pavimentos[1].id, caso: 'Q', N: 400, Hx: 0, Hy: 0, Mx: 30, My: 20 });
  return s;
}

interface Caso { nome: string; b: BuildingModel; dim: Dimensionamento; dimMem: Dimensionamento; mem: MemoriaDetalhada }
const CASOS: Caso[] = [];
function caso(nome: string, s: Sessao): Caso {
  const b = s.modelo, an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false }), r = memoriaDetalhada(b, { an });
  const c = { nome, b, dim, dimMem: r.dim, mem: r.memoria };
  CASOS.push(c);
  return c;
}
const passosDe = (c: Caso, el: string, topico?: string) => c.mem.passos.filter((p) => p.elemento === el && (!topico || p.topico === topico));
const achar = (c: Caso, el: string, topico: string, desc: string): PassoMemoria => { const p = passosDe(c, el, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${el} / ${topico} / ${desc}`); return p; };
const todos = (c: Caso, el: string, topico: string, desc: string) => passosDe(c, el, topico).filter((x) => x.descricao.startsWith(desc));
const elDe = (r: ResultadoPuncao) => `Punção ${r.nome} · ${r.pavimento}`;

// L22: padrão (interno sem armadura, borda e canto com armadura); L16: laje fina e carregada (armadura no interno, biela nos de borda e canto);
// informada que cobre; informada parcial (soma-se à calculada); conectores; circulares; vento no modelo integrado e no separado (molas);
// viga chata; nervurada com ábaco; radier; abertura junto ao pilar
const L22 = caso('h = 22 cm', lisa(0.22));
const L16 = caso('h = 16 cm, q = 14', lisa(0.16, { q: 14 }));
const need = L16.dim.puncao!.find((r) => r.tipo === 'interno' && r.pavimento === 'Tipo 1')!.armadura!;
const COBRE = caso('armadura informada cobre', lisa(0.16, { q: 14, extra: (s) => ok(s, 'laje.puncao', { id: s.modelo.lajes[0].id, adicionar: [{ pilar: s.modelo.pilares[4].id, linhas: 40, barras: need.barras, phi: 8, s: need.sr }] }) }));
const PARCIAL = caso('armadura informada parcial', lisa(0.16, { q: 14, extra: (s) => ok(s, 'laje.puncao', { id: s.modelo.lajes[0].id, adicionar: [{ pilar: s.modelo.pilares[4].id, linhas: 6, barras: need.barras + 1, phi: 8, s: need.sr }] }) }));
const ANTERIOR = caso('h = 16 cm, q = 14, critério anterior de borda e canto', lisa(0.16, { q: 14, valores: { puncaoWpBorda: 0 } }));
const CONECT = caso('conectores', lisa(0.16, { q: 14, valores: { puncaoTipoArmadura: 1 } }));
const CIRC = caso('pilares circulares', lisa(0.2, { secao: { tipo: 'circ', d: 0.5 } }));
const VENTO = caso('vento, modelo integrado', lisa(0.2, { vento: true }));
const MOLAS = caso('vento, modelo separado (molas)', lisa(0.2, { vento: true, valores: { modeloGlobal: 0 } }));
const CHATA = caso('viga chata', lisa(0.2, { extra: (s) => ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 6], [12, 6]], secao: { b: 0.9, h: 0.25 } }) }));
const ABACO = caso('nervurada com ábaco', nervurada());
const ABACO20 = caso('nervurada com ábaco, q = 20 (armadura no ábaco; Vc cobre)', nervurada(20));
const ABACO30 = caso('nervurada com ábaco, q = 30 (armadura dentro e fora do ábaco)', nervurada(30));
const ABACO45 = caso('nervurada com ábaco, q = 45 (sem solução no C″)', nervurada(45));
const RAD = caso('radier', radier());
const FURO = caso('abertura junto ao pilar', lisa(0.22, { extra: (s) => ok(s, 'laje.abertura', { id: s.modelo.lajes[0].id, contorno: [[6.6, 5.9], [7.2, 5.9], [7.2, 6.1], [6.6, 6.1]] }) }));

// --------------------------------------------------------------- recálculo independente

type Seg = [number, number, number, number];
/** Comprimento, centroide, e* e Wp = ∫|e| dℓ (definição: integral exata do valor absoluto da distância ao centroide). */
function geometria(segs: Seg[], ang: number, centro: [number, number]) {
  const L = segs.map(([x0, y0, x1, y1]) => Math.hypot(x1 - x0, y1 - y0)), u = L.reduce((s, l) => s + l, 0);
  const cx = segs.reduce((s, q, i) => s + (L[i] * (q[0] + q[2])) / 2, 0) / u, cy = segs.reduce((s, q, i) => s + (L[i] * (q[1] + q[3])) / 2, 0) / u;
  const a = (ang * Math.PI) / 180, eixos = [[Math.cos(a), Math.sin(a)], [-Math.sin(a), Math.cos(a)]];
  const e = eixos.map((v) => Math.abs((cx - centro[0]) * v[0] + (cy - centro[1]) * v[1]));
  const Wp = eixos.map((v) => segs.reduce((s, q, i) => {
    const e1 = (q[0] - cx) * v[0] + (q[1] - cy) * v[1], e2 = (q[2] - cx) * v[0] + (q[3] - cy) * v[1];
    return s + (e1 * e2 >= 0 ? (L[i] * (Math.abs(e1) + Math.abs(e2))) / 2 : (L[i] * (e1 * e1 + e2 * e2)) / (2 * (Math.abs(e1) + Math.abs(e2))));
  }, 0));
  return { u, cx, cy, e, Wp };
}
/** Wp = ∫|e| dℓ com e medido a partir do centro do pilar (borda e canto pela NBR, 19.5.2.3), integral exata por segmento. */
function wpCentro(segs: Seg[], ang: number, centro: [number, number]) {
  const a = (ang * Math.PI) / 180, eixos = [[Math.cos(a), Math.sin(a)], [-Math.sin(a), Math.cos(a)]];
  return eixos.map((v) => segs.reduce((s, q) => {
    const L = Math.hypot(q[2] - q[0], q[3] - q[1]), e1 = (q[0] - centro[0]) * v[0] + (q[1] - centro[1]) * v[1], e2 = (q[2] - centro[0]) * v[0] + (q[3] - centro[1]) * v[1];
    return s + (e1 * e2 >= 0 ? (L * (Math.abs(e1) + Math.abs(e2))) / 2 : (L * (e1 * e1 + e2 * e2)) / (2 * (Math.abs(e1) + Math.abs(e2))));
  }, 0));
}
const coefK = (r: number) => {
  const T: [number, number][] = [[0.5, 0.45], [1, 0.6], [2, 0.7], [3, 0.8]];
  if (r <= 0.5) return 0.45;
  for (let i = 1; i < T.length; i++) if (r <= T[i][0]) return T[i - 1][1] + ((r - T[i - 1][0]) / (T[i][0] - T[i - 1][0])) * (T[i][1] - T[i - 1][1]);
  return 0.8;
};

/** Reações por caso e momentos até os eixos do pilar (laje): refaz FSd, Meu e Mev. */
function refazSolicitacao(c: Caso, el: string, r: ResultadoPuncao) {
  const tp = 'Solicitação (FSd e momentos)', fs = achar(c, el, tp, 'Força de punção de cálculo FSd');
  let F = 0;
  for (const k of Object.keys(fs.entradas)) if (k.startsWith('γ_')) F += num(fs, k) * num(fs, `R_${k.slice(2)}`);
  expect(rel(F, fs.resultado as number)).toBeLessThan(1e-9);
  expect(rel(F, r.F)).toBeLessThan(1e-9);
  const momento = (nome: 'Mx' | 'My', k: 0 | 1): number => {
    const molas = todos(c, el, tp, 'Momento transmitido pelo pilar à laje em torno de ' + (k === 0 ? 'x' : 'y'));
    if (molas.length) {
      const p = molas[0];
      let s = 0;
      for (const kk of Object.keys(p.entradas)) if (kk.startsWith('γ_')) s += Math.abs(num(p, kk) * num(p, 'k') * num(p, `θ_${kk.slice(2)}`));
      expect(rel(s, p.resultado as number)).toBeLessThan(1e-9);
      return s;
    }
    const g1 = todos(c, el, tp, `Momento ${nome} que a laje transmite`)[0];
    if (!g1) return 0;
    let s = 0;
    for (const kk of Object.keys(g1.entradas)) if (kk.startsWith('γ_')) s += Math.abs(num(g1, kk) * num(g1, `m_${kk.slice(2)}`));
    expect(rel(s, g1.resultado as number)).toBeLessThan(1e-9);
    const cv = todos(c, el, tp, `Momento ${nome} com vento`)[0];
    const comDes = (Mv: number) => {
      const dp = todos(c, el, tp, `Momento ${nome} com desaprumo`)[0];
      if (!dp) return Mv;
      const E = dp.entradas, gq = num(dp, 'gq');
      const soma = (pref: 'γ_' | 'γW_', mk: (id: string) => number) => Object.keys(E).filter((kk) => kk.startsWith(pref)).reduce((t, kk) => t + Math.abs(num(dp, kk) * mk(kk.slice(pref.length))), 0);
      const tomb = (pref: 'γ_' | 'γW_') => Math.abs(Object.keys(E).filter((kk) => kk.startsWith(pref)).reduce((t, kk) => t + num(dp, kk) * (num(dp, `md_${kk.slice(pref.length)}`) ?? 0), 0));
      let M = Mv, n = 0;
      expect(num(dp, 'thetaA')).toBeGreaterThan(0);
      for (let i = 1; E[`c${i}_tipo`] !== undefined; i++, n++) {
        const tipo = num(dp, `c${i}_tipo`), dir = num(dp, `c${i}_dir`), pref = tipo === 2 ? 'γW_' : 'γ_', fw = tipo === 1 ? gq * 0.6 : gq;
        const base = soma(pref, (id) => num(dp, `m_${id}`));
        const Md = tomb(pref), dec = String(E[`c${i}_decisao`]);
        expect(Math.abs(Md - num(dp, `c${i}_Md`))).toBeLessThan(1e-9 * Math.max(1, Md));
        let w = 0, d = 0;
        if (tipo === 0) { expect(dec).toBe('sem-vento'); d = soma(pref, (id) => num(dp, `mD${dir}_${id}`)); } else {
          const nv = String(E[`c${i}_vento`]), Mw = fw * num(dp, `M1_${nv}`);
          expect(Math.abs(Mw - num(dp, `c${i}_Mw`))).toBeLessThan(1e-9 * Math.max(1, Mw));
          const esperado = Md < 1e-9 ? 'sem-desaprumo' : 0.3 * Mw >= Md ? 'so-vento' : Mw < 0.3 * Md ? 'so-desaprumo' : 'ambos';
          expect(dec).toBe(esperado);
          if (dec !== 'so-desaprumo') w = fw * Math.abs(num(dp, `mW_${nv}`)) * num(dp, `amp_${nv}`);
          if (dec === 'so-desaprumo' || dec === 'ambos') d = soma(pref, (id) => num(dp, `mD${dir}_${id}`));
        }
        M = Math.max(M, base + w + d);
      }
      expect(n).toBeGreaterThan(0);
      expect(rel(M, dp.resultado as number)).toBeLessThan(1e-9);
      return M;
    };
    if (!cv) return comDes(s);
    let W = 0, M2 = 0;
    for (const kk of Object.keys(cv.entradas)) {
      if (kk.startsWith('amp_')) W = Math.max(W, Math.abs(num(cv, `mW_${kk.slice(4)}`)) * num(cv, kk));
      if (kk.startsWith('γW_')) M2 += Math.abs(num(cv, kk) * num(cv, `m_${kk.slice(3)}`));
    }
    expect(rel(W, num(cv, 'W'))).toBeLessThan(1e-9);
    expect(rel(M2, num(cv, 'M2'))).toBeLessThan(1e-9);
    const gq = Number(cv.expressao.match(/\+ ([\d,]+)·0,6/)?.[1].replace(',', '.'));
    expect(gq).toBeGreaterThan(0);
    const M = Math.max(s + gq * 0.6 * W, M2 + gq * W);
    expect(rel(M, cv.resultado as number)).toBeLessThan(1e-9);
    return comDes(M);
  };
  const Mx = momento('Mx', 0), My = momento('My', 1);
  const a = (r.angulo * Math.PI) / 180;
  const Meu = achar(c, el, tp, 'Momento com excentricidade ao longo de u'), Mev = achar(c, el, tp, 'Momento com excentricidade ao longo de v');
  expect(rel(Math.abs(Mx * Math.sin(a)) + Math.abs(My * Math.cos(a)), Meu.resultado as number)).toBeLessThan(1e-9);
  expect(rel(Math.abs(Mx * Math.cos(a)) + Math.abs(My * Math.sin(a)), Mev.resultado as number)).toBeLessThan(1e-9);
  expect(rel(Meu.resultado as number, r.M[0])).toBeLessThan(1e-9);
  expect(rel(Mev.resultado as number, r.M[1])).toBeLessThan(1e-9);
  return { Mx, My };
}

interface Ref {
  /** Contornos do resultado (C, C′ e, se houver, C″) na ordem dos tópicos "Contorno X". */
  contornos: (ResultadoPuncao['contornos'][number] | undefined)[];
  /** Sem K / cortante o resultado não os expõe (verificação fora do ábaco): refaz-se só das entradas. */
  d: number; rho: number; K?: [number, number]; tauRd1: number; tauRd2: number; tauRd3?: number;
  armadura?: ResultadoPuncao['armadura']; cortante?: ResultadoPuncao['cortante'];
  M: [number, number]; Msinal?: [number, number]; F: number; ap: { c1: number; c2: number; ang: number; centro: [number, number]; circular: boolean };
}

/** Refaz geometria, K, tensões resistentes, contornos, varredura de cortante e armadura de uma verificação. */
function refazVerificacao(c: Caso, el: string, rot: string, x: Ref, opt: { comC3?: boolean } = {}) {
  const T = (t: string) => `${t}${rot}`;
  // altura útil e taxa
  const pd = achar(c, el, T('Apoio, altura útil e taxa de armadura'), 'Altura útil');
  const d = Math.max(0.05, num(pd, 'h') - num(pd, 'c') - 0.01);
  expect(rel(d, pd.resultado as number)).toBeLessThan(1e-9);
  expect(rel(d, x.d)).toBeLessThan(1e-9);
  const pr = achar(c, el, T('Apoio, altura útil e taxa de armadura'), 'Taxa de armadura');
  let rho: number;
  if ('As0' in pr.entradas) {
    const h = num(pr, 'h'), b = [num(pr, 'b0'), num(pr, 'b1')], As = [num(pr, 'As0'), num(pr, 'As1')];
    const r2 = [0, 1].map((k) => Math.max(As[k], 0.0015 * h * b[k] * 1e4) / (1e4 * b[k] * d));
    rho = Math.min(0.02, Math.sqrt(r2[0] * r2[1]));
  } else rho = Math.min(0.02, (0.0015 * num(pr, 'h')) / d);
  expect(rel(rho, pr.resultado as number)).toBeLessThan(1e-9);
  expect(rel(rho, x.rho)).toBeLessThan(1e-9);
  // K
  const tk = T('Tipo de apoio e coeficiente K');
  const pc = todos(c, el, tk, 'Coeficiente K');
  let Kc: [number, number] = [0.6, 0.6];
  const ladoP = achar(c, el, tk, 'Lados livres'), nbr = num(ladoP, 'metodoNBR') === 1, sin = nbr ? [num(ladoP, 'sinalU'), num(ladoP, 'sinalV')] : [0, 0];
  if (nbr) {
    // borda (19.5.2.3): K1 = K(C1/C2) com C1 perpendicular à borda; K2 = K(C2/(2·C1)); canto (19.5.2.4): K(C1/C2) em cada direção
    expect(pc).toHaveLength(2);
    const cc = [x.ap.c1, x.ap.c2];
    const Kn = [0, 1].map((i) => (sin[i] ? coefK(cc[i] / cc[1 - i]) : sin[1 - i] ? coefK(cc[i] / (2 * cc[1 - i])) : coefK(cc[i] / cc[1 - i]))) as [number, number];
    for (const i of [0, 1]) { expect(rel(Kn[i], pc[i].resultado as number)).toBeLessThan(1e-9); if (x.K) expect(rel(Kn[i], x.K[i])).toBeLessThan(1e-9); }
    Kc = Kn;
  } else if (x.ap.circular) { expect(pc[0].resultado).toBe(0.6); if (x.K) expect(x.K).toEqual([0.6, 0.6]); }
  else {
    expect(pc).toHaveLength(2);
    const lado = achar(c, el, tk, 'Lados livres');
    const livU = num(lado, 'livreU'), livV = num(lado, 'livreV');
    const Ku = coefK(x.ap.c1 / x.ap.c2 / (livV ? 2 : 1)), Kv = coefK(x.ap.c2 / x.ap.c1 / (livU ? 2 : 1));
    expect(rel(Ku, pc[0].resultado as number)).toBeLessThan(1e-9);
    expect(rel(Kv, pc[1].resultado as number)).toBeLessThan(1e-9);
    if (x.K) { expect(rel(Ku, x.K[0])).toBeLessThan(1e-9); expect(rel(Kv, x.K[1])).toBeLessThan(1e-9); }
    Kc = [Ku, Kv];
  }
  // tensões resistentes
  const tr = T('Tensões resistentes');
  const fcdP = achar(c, el, tr, 'Resistência de cálculo do concreto'), fck = num(fcdP, 'fck'), fcd = fck / num(fcdP, 'gc');
  expect(rel(fcd, fcdP.resultado as number)).toBeLessThan(1e-9);
  const av2 = 1 - fck / 250;
  expect(rel(av2, achar(c, el, tr, 'Fator de compressão diagonal').resultado as number)).toBeLessThan(1e-9);
  const t2 = 0.27 * av2 * fcd, base = (1 + Math.sqrt(20 / (d * 100))) * Math.cbrt(100 * rho * fck), t1 = 0.13 * base, t3c = 0.1 * base;
  expect(rel(t2, achar(c, el, tr, 'Tensão resistente de compressão diagonal').resultado as number)).toBeLessThan(1e-9);
  expect(rel(t1, achar(c, el, tr, 'Tensão resistente de tração diagonal sem armadura').resultado as number)).toBeLessThan(1e-9);
  expect(rel(t3c, achar(c, el, tr, 'Parcela do concreto da tensão resistente').resultado as number)).toBeLessThan(1e-9);
  expect(rel(t2, x.tauRd2)).toBeLessThan(1e-9);
  expect(rel(t1, x.tauRd1)).toBeLessThan(1e-9);
  const fy = achar(c, el, tr, 'Tensão de escoamento de cálculo'), fywd = Math.min(num(fy, 'fyd'), num(fy, 'limite'));
  expect(rel(fywd, fy.resultado as number)).toBeLessThan(1e-9);
  // contornos
  const nomes = ['C', 'C′', 'C″'];
  const tausCalc: number[] = [];
  for (let k = 0; k < x.contornos.length; k++) {
    const ct = x.contornos[k];
    const tp = T(`Contorno ${nomes[k]}`), pu = achar(c, el, tp, `Contorno ${nomes[k]} a`);
    const segs = JSON.parse(pu.entradas.segmentos as string) as Seg[];
    expect(segs).toHaveLength(num(pu, 'trechos'));
    const g = geometria(segs, x.ap.ang, x.ap.centro);
    expect(rel(g.u, pu.resultado as number)).toBeLessThan(1e-9);
    if (nbr) {
      // borda e canto pela NBR: u* dos trechos do pilar reduzido; e* com sinal (para o interior) a partir do centroide de u*; Wp do
      // perímetro total em torno do centro do pilar
      const pa = achar(c, el, tp, 'Pilar reduzido');
      for (const i of [0, 1]) if (sin[i]) expect(rel(num(pa, i ? 'aV' : 'aU'), Math.min(1.5 * d, 0.5 * (i ? x.ap.c2 : x.ap.c1)))).toBeLessThan(1e-9);
      const pt = achar(c, el, tp, 'Perímetro total u'), segT = JSON.parse(pt.entradas.segmentosTotal as string) as Seg[];
      const gT = geometria(segT, x.ap.ang, x.ap.centro);
      expect(rel(gT.u, pt.resultado as number)).toBeLessThan(1e-9);
      expect(gT.u).toBeGreaterThanOrEqual(g.u - 1e-12);
      const ang = (x.ap.ang * Math.PI) / 180, eix = [[Math.cos(ang), Math.sin(ang)], [-Math.sin(ang), Math.cos(ang)]];
      const eS = [0, 1].map((i) => (sin[i] ? -sin[i] * ((g.cx - x.ap.centro[0]) * eix[i][0] + (g.cy - x.ap.centro[1]) * eix[i][1]) : 0));
      const Wc = wpCentro(segT, x.ap.ang, x.ap.centro);
      let Fa = x.F;
      const pf = todos(c, el, tp, 'FSd no contorno');
      if (pf.length) { Fa = Math.max(0, num(pf[0], 'F') - num(pf[0], 'qd') * num(pf[0], 'A')); expect(rel(Fa, pf[0].resultado as number)).toBeLessThan(1e-9); }
      const tF = Fa / (g.u * d), tM: number[] = [];
      for (const i of [0, 1]) {
        const pe = achar(c, el, tp, `Excentricidade e*${'uv'[i]}`), pw = achar(c, el, tp, `Módulo de resistência plástica Wp${'uv'[i]}`), pm = achar(c, el, tp, `Momento transmitido por cisalhamento na direção ${'uv'[i]}`);
        expect(Math.abs(eS[i] - (pe.resultado as number))).toBeLessThan(1e-9);
        if (ct) expect(Math.abs(eS[i] - ct.e[i])).toBeLessThan(1e-9);
        expect(rel(Wc[i], pw.resultado as number)).toBeLessThan(1e-9);
        if (ct) expect(rel(Wc[i], ct.Wp[i])).toBeLessThan(1e-9);
        // sentido do momento: radier traz o sinal (Msinal); laje, só módulos (incerto: pior dos dois sentidos)
        const Mint = x.Msinal && sin[i] ? -sin[i] * x.Msinal[i] : undefined;
        const m1 = !sin[i] ? x.M[i] : Mint === undefined ? Math.max(0, x.M[i] - Fa * eS[i], x.M[i] + Fa * eS[i]) : Mint >= 0 ? Math.max(0, Mint - Fa * eS[i]) : Math.max(0, x.M[i] + Fa * eS[i]);
        expect(Math.abs(m1 - (pm.resultado as number))).toBeLessThan(1e-9 * Math.max(1, m1));
        tM.push(Wc[i] > 1e-9 ? (Kc[i] * m1) / (Wc[i] * d) : 0);
      }
      const canto = sin[0] !== 0 && sin[1] !== 0;
      const tau = (canto ? Math.max(tF + tM[0], tF + tM[1]) : tF + tM[0] + tM[1]) / 1000;
      const ps = achar(c, el, tp, 'Tensão solicitante de cálculo');
      expect(rel(tau, ps.resultado as number)).toBeLessThan(1e-9);
      if (ct) { expect(rel(tau, ct.tau)).toBeLessThan(1e-9); expect(rel(g.u, ct.u)).toBeLessThan(1e-9); expect(ct.ok).toBe(ct.tau <= ct.limite + 1e-9); }
      tausCalc.push(tau);
      continue;
    }
    if (ct) { expect(rel(g.u, ct.u)).toBeLessThan(1e-9); expect(rel(num(pu, 'a'), ct.a)).toBeLessThan(1e-9); }
    let Fa = x.F;
    const pf = todos(c, el, tp, 'FSd no contorno');
    if (pf.length) { Fa = Math.max(0, num(pf[0], 'F') - num(pf[0], 'qd') * num(pf[0], 'A')); expect(rel(Fa, pf[0].resultado as number)).toBeLessThan(1e-9); }
    const M = x.ap.circular ? [Math.hypot(x.M[0], x.M[1]), 0] : x.M;
    const e = [0, 1].map((i) => achar(c, el, tp, `Excentricidade e*${'uv'[i]}`));
    const W = [0, 1].map((i) => achar(c, el, tp, `Módulo de resistência plástica Wp${'uv'[i]}`));
    const M1 = [0, 1].map((i) => achar(c, el, tp, `Momento transmitido por cisalhamento na direção ${'uv'[i]}`));
    let tau = Fa / (g.u * d);
    const parc = [Fa / (g.u * d) / 1000];
    for (let i = 0; i < 2; i++) {
      expect(rel(g.e[i], e[i].resultado as number)).toBeLessThan(1e-9);
      if (ct) expect(rel(g.e[i], ct.e[i])).toBeLessThan(1e-9);
      expect(rel(g.Wp[i], W[i].resultado as number)).toBeLessThan(1e-9);
      if (ct) expect(rel(g.Wp[i], ct.Wp[i])).toBeLessThan(1e-9);
      expect(rel(g.cx, num(e[i], 'cx'))).toBeLessThan(1e-9);
      const m1 = Math.max(0, M[i] - Fa * g.e[i]);
      expect(Math.abs(m1 - (M1[i].resultado as number))).toBeLessThan(1e-9 * Math.max(1, Math.abs(m1)));
      if (ct) expect(Math.abs(m1 - ct.M1[i])).toBeLessThan(1e-9 * Math.max(1, Math.abs(m1)));
      const tm = g.Wp[i] > 1e-9 ? (Kc[i] * m1) / (g.Wp[i] * d) : 0;
      tau += tm;
      parc.push(tm / 1000);
    }
    tau /= 1000;
    const ps = achar(c, el, tp, 'Tensão solicitante de cálculo');
    expect(rel(tau, ps.resultado as number)).toBeLessThan(1e-9);
    if (ct) { expect(rel(tau, ct.tau)).toBeLessThan(1e-9); expect(ct.ok).toBe(ct.tau <= ct.limite + 1e-9); }
    expect(rel(parc[0] + parc[1] + parc[2], tau)).toBeLessThan(1e-9);
    tausCalc.push(tau);
  }
  // varredura de cortante
  const tv = T('Cortante da laje no entorno do pilar (19.4.1)');
  const pv1 = achar(c, el, tv, 'Resistência ao cortante sem armadura'), fctd = num(pv1, 'fctd');
  expect(rel(fctd, 0.7 * 0.3 * Math.cbrt(fck * fck) / (fck / fcd))).toBeLessThan(1e-9);
  const vR1 = 0.25 * fctd * Math.max(1, 1.6 - d) * (1.2 + 40 * Math.min(0.02, rho)) * 1 * d * 1000;
  expect(rel(vR1, pv1.resultado as number)).toBeLessThan(1e-9);
  const vRd2 = 0.27 * av2 * fcd * 1000 * d;
  expect(rel(vRd2, achar(c, el, tv, 'Compressão diagonal do cortante').resultado as number)).toBeLessThan(1e-9);
  if (x.cortante) expect(rel(vRd2, x.cortante.vRd2)).toBeLessThan(1e-9);
  const pvc = achar(c, el, tv, 'Parcela do concreto na laje'), h = num(pvc, 'h'), v0 = 0.6 * fctd * d * 1000;
  const vc = h <= 0.15 ? vR1 : h >= 0.35 ? v0 : vR1 + ((h - 0.15) / 0.2) * (v0 - vR1);
  expect(rel(vc, pvc.resultado as number)).toBeLessThan(1e-9);
  const pS0 = todos(c, el, tv, 'Superfície ').filter((p) => /^Superfície \d+ a /.test(p.descricao));
  const sup = x.cortante?.superficies ?? pS0.map((p) => ({ a: num(p, 'a'), u: num(p, 'u'), A: num(p, 'A'), V: num(p, 'V'), v: p.resultado as number, vRd1: num(p, 'vRd1'), ok: num(p, 'V') / num(p, 'u') <= vR1 + 1e-9, Asw: 0 }));
  const pS = todos(c, el, tv, 'Superfície ').filter((p) => /^Superfície \d+ a /.test(p.descricao)), pA = todos(c, el, tv, 'Superfície ').filter((p) => /^Superfície \d+: armadura/.test(p.descricao));
  expect(pS).toHaveLength(sup.length);
  let sr = 0;
  const sRef = todos(c, el, T('Armadura de punção – dimensionamento'), 'Distância da primeira linha');
  if (sRef.length) sr = num(sRef[0], 'sr');
  let falhas = 0;
  sup.forEach((s, i) => {
    const p = pS[i], V = num(p, 'F') - num(p, 'qd') * num(p, 'A'), v = V / num(p, 'u');
    expect(rel(V, num(p, 'V'))).toBeLessThan(1e-9);
    expect(rel(v, p.resultado as number)).toBeLessThan(1e-9);
    expect(rel(v, s.v)).toBeLessThan(1e-9);
    expect(rel(num(p, 'u'), s.u)).toBeLessThan(1e-9);
    expect(rel(num(p, 'A'), s.A)).toBeLessThan(1e-9);
    expect(rel(vR1, s.vRd1)).toBeLessThan(1e-9);
    expect(s.ok).toBe(v <= vR1 + 1e-9);
    if (!s.ok) {
      const pa = pA[falhas++], srD = num(pa, 'sr');
      const Asw = (Math.max(0, V - vc * num(pa, 'u')) * srD * 1e4) / (0.9 * d * num(pa, 'fywd') * 1000);
      expect(rel(Asw, pa.resultado as number)).toBeLessThan(1e-9);
      if (x.cortante) expect(rel(Asw, s.Asw)).toBeLessThan(1e-9);
      expect(rel(num(pa, 'fywd'), fywd)).toBeLessThan(1e-9);
      if (sr) expect(rel(srD, sr)).toBeLessThan(1e-9);
    }
  });
  expect(pA).toHaveLength(falhas);
  // armadura
  const ts = T('Armadura de punção – dimensionamento');
  if (!passosDe(c, el, ts).length) return { tausCalc, fywd, d, rho };
  const arred = (q: number) => Math.floor(q / 0.005 + 1e-9) * 0.005;
  const p0 = achar(c, el, ts, 'Distância da primeira linha');
  const s0 = Math.max(0.02, arred(num(p0, 's0f') * d)), srC = Math.max(0.03, arred(num(p0, 'srf') * d));
  expect(rel(s0, num(p0, 's0'))).toBeLessThan(1e-9);
  expect(rel(srC, num(p0, 'sr'))).toBeLessThan(1e-9);
  const tent = todos(c, el, ts, 'Busca do número de anéis');
  let nb = 0;
  for (const t of tent) { if (num(t, 'tauSd') <= t1 + 1e-9) { nb = num(t, 'n'); break; } }
  const desf = achar(c, el, T('Situação'), 'Situação').entradas.desfecho;
  if (desf === 'semSolucaoC3' && !nb) { expect(tent).toHaveLength(14); return { tausCalc, fywd, d, rho }; }
  const pnb = todos(c, el, ts, 'Número de anéis exigido pela punção');
  if (pnb.length) expect(pnb[0].resultado).toBe(nb);
  const pp = todos(c, el, ts, 'Área de armadura por anel exigida pela punção')[0];
  let AswP = 0;
  if (pp) { AswP = (Math.max(0, num(pp, 'tauSd') - t3c) * num(pp, 'u') * srC * 1e4) / (1.5 * fywd); expect(rel(AswP, pp.resultado as number)).toBeLessThan(1e-9); expect(rel(num(pp, 'tauSd'), tausCalc[1])).toBeLessThan(1e-9); }
  const pcort = todos(c, el, ts, 'Cortante da laje: armadura transversal exigida')[0];
  let AswC = 0, nbC = 0;
  if (pcort) {
    for (const k of Object.keys(pcort.entradas)) if (k.startsWith('Asw_')) AswC = Math.max(AswC, num(pcort, k));
    nbC = Math.max(1, Math.ceil((num(pcort, 'aFalha') - s0) / srC) + 1);
    expect(rel(AswC, pcort.resultado as number)).toBeLessThan(1e-9);
    if (x.cortante) expect(rel(AswC, sup.filter((s) => !s.ok).reduce((m, s) => Math.max(m, s.Asw), 0))).toBeLessThan(1e-9);
  }
  const pnt = achar(c, el, ts, 'Anéis e área por anel necessários');
  const nbMax = Math.max(nb, nbC), AswReq = Math.max(AswP, AswC);
  expect(num(pnt, 'nbMax')).toBe(nbMax);
  expect(rel(AswReq, pnt.resultado as number)).toBeLessThan(1e-9);
  // reverificação de C″ na posição final (19.5.3.4): anéis acrescentados até τSd,C″ ≤ τRd1 (no máximo 14)
  const rv = todos(c, el, ts, 'Reverificação do contorno C″');
  let nbTot = nbMax;
  if (rv.length) {
    expect(num(rv[0], 'n')).toBe(nbMax);
    rv.forEach((p, i) => { expect(num(p, 'n')).toBe(nbMax + i); expect(rel(num(p, 'a'), s0 + (nbMax + i - 1) * srC + 2 * d)).toBeLessThan(1e-9); expect(rel(num(p, 'tauSd'), (p.resultado as number))).toBeLessThan(1e-9); });
    for (const p of rv.slice(0, -1)) expect(num(p, 'tauSd')).toBeGreaterThan(t1 + 1e-9);
    const ult = rv[rv.length - 1];
    nbTot = num(ult, 'n');
    if (desf === 'semSolucaoC3') { expect(nbTot).toBe(14); expect(num(ult, 'tauSd')).toBeGreaterThan(t1 + 1e-9); return { tausCalc, fywd, d, rho }; }
    expect(num(ult, 'tauSd')).toBeLessThanOrEqual(t1 + 1e-9);
    const pfin = achar(c, el, ts, 'Número final de anéis');
    expect(pfin.resultado).toBe(nbTot);
  }
  expect(desf).not.toBe('semSolucaoC3');
  const out = { tausCalc, fywd, d, rho, nbTot, AswReq, t3c, sr: srC, s0 };
  const pinf = todos(c, el, ts, 'Armadura informada pelo usuário')[0];
  if (!pinf) return out;
  const manAsw = num(pinf, 'AswInf'), manAneis = num(pinf, 'aneisInf');
  const AswAuto = manAneis >= nbTot ? Math.max(0, AswReq - manAsw) : AswReq;
  expect(rel(AswAuto, pinf.resultado as number) < 1e-9 || Math.abs(AswAuto - (pinf.resultado as number)) < 1e-12).toBe(true);
  const pesc = todos(c, el, ts, 'Espaçamento tangencial máximo')[0];
  if (!pesc) return { ...out, AswAuto };
  const sT = tausCalc[0] <= 0.63 * t2 ? 2 * d : 1.5 * d, nMin = Math.max(2, Math.ceil(num(pesc, 'uC2') / sT - 1e-9)), nCap = Math.max(nMin, Math.floor(num(pesc, 'u1') / 0.05));
  expect(rel(sT, num(pesc, 'sT'))).toBeLessThan(1e-9);
  expect(nMin).toBe(num(pesc, 'nMin'));
  expect(nCap).toBe(num(pesc, 'nCap'));
  const bit = todos(c, el, ts, 'Barras por anel com φ').map((p) => ({ phi: num(p, 'phi'), n: Math.max(nMin, Math.ceil(AswAuto / (num(p, 'pernas') * num(p, 'areaCm2')) - 1e-9)), pernas: num(p, 'pernas'), area: num(p, 'areaCm2'), res: p.resultado as number }));
  for (const b of bit) { expect(b.n).toBe(b.res); expect(rel(b.area, (Math.PI * (b.phi / 1000) ** 2 / 4) * 1e4)).toBeLessThan(1e-9); }
  const pref = bit.find((b) => b.n <= Math.max(nMin, 16));
  const esc = pref ?? [...bit].reverse().find((b) => b.n <= nCap);
  const arm = x.armadura;
  if (esc) {
    expect(arm).toBeDefined();
    expect(arm!.phi).toBe(esc.phi);
    expect(arm!.linhas).toBe(esc.n);
    expect(arm!.barras).toBe(nbTot);
    expect(rel(arm!.s0, s0)).toBeLessThan(1e-9);
    expect(rel(arm!.sr, srC)).toBeLessThan(1e-9);
    expect(arm!.total).toBe(esc.n * nbTot);
    const AswEf = esc.n * esc.pernas * esc.area + (manAneis >= nbTot ? manAsw : 0);
    const pef = achar(c, el, ts, 'Área efetiva por anel');
    expect(rel(AswEf, pef.resultado as number)).toBeLessThan(1e-9);
    expect(rel(AswEf, arm!.AswAnel)).toBeLessThan(1e-9);
    const ptr = achar(c, el, ts, 'Tensão resistente em C′ com a armadura');
    const tR3 = t3c + (1.5 * AswEf * fywd) / (srC * num(ptr, 'u') * 1e4);
    expect(rel(tR3, ptr.resultado as number)).toBeLessThan(1e-9);
    expect(rel(tR3, x.tauRd3!)).toBeLessThan(1e-9);
    // C″: 2d depois da última linha; tensão dentro de τRd1
    const pf = achar(c, el, ts, 'Verificação fora da armadura');
    expect(rel(s0 + (nbTot - 1) * srC + 2 * d, num(pf, 'a'))).toBeLessThan(1e-9);
    if (opt.comC3) expect(rel(num(pf, 'tauSd'), tausCalc[2])).toBeLessThan(1e-9);
    expect(pf.resultado).toBe('atende'); // C″ é reverificado na posição final: com anéis a mais pelo cortante também atende
    expect(num(pf, 'tauSd')).toBeLessThanOrEqual(t1 + 1e-9);
    const disp = passosDe(c, el, T('Armadura de punção – disposição'))[0];
    expect(disp.etapa).toBe('detalhamento');
    expect(num(disp, 'total')).toBe(arm!.total);
    expect(JSON.parse(disp.entradas.posicoes as string)).toEqual(JSON.parse(JSON.stringify(arm!.posicoes))); // o JSON não guarda o sinal do zero (-0)
  }
  return { ...out, AswAuto, escolha: esc };
}

const refDe = (r: ResultadoPuncao): Ref => ({ contornos: r.contornos, d: r.d, rho: r.rho, K: r.K, tauRd1: r.tauRd1, tauRd2: r.tauRd2, tauRd3: r.tauRd3, armadura: r.armadura, cortante: r.cortante, M: r.M, Msinal: r.Msinal, F: r.F, ap: { c1: r.c1, c2: r.c2, ang: r.angulo, centro: r.centro as [number, number], circular: r.circular } });

/** Punções com cadeia própria (as demais pavimentos de grelha idêntica só remetem). */
const proprias = (c: Caso, lista = c.dim.puncao ?? []) => lista.filter((r) => passosDe(c, elDe(r), 'Contorno C').length > 0 || passosDe(c, elDe(r), 'Contorno C – região interna (ábaco)').length > 0);

describe('MD4: punção', () => {
  for (const c of CASOS) {
    it(`${c.nome}: dimensionamento idêntico com a memória ligada; campos, HTML e CSV`, () => {
      expect(c.dimMem.puncao).toEqual(c.dim.puncao);
      expect(c.dimMem.lajes).toEqual(c.dim.lajes);
      expect(c.dimMem.radiers).toEqual(c.dim.radiers);
      expect(c.dimMem.nervuradas).toEqual(c.dim.nervuradas);
      expect(c.dimMem.vigas).toEqual(c.dim.vigas);
      expect(c.dimMem.pilares).toEqual(c.dim.pilares);
      const lista = c.nome === 'radier' ? c.dim.radiers!.flatMap((r) => r.puncao ?? []) : c.dim.puncao!;
      expect(lista.length).toBeGreaterThan(0);
      for (const r of lista) {
        const el = c.nome === 'radier' ? `Punção ${r.nome} · Radier ${r.lajeNome}` : elDe(r);
        expect(c.mem.elementos, el).toContain(el);
      }
      const ps = c.mem.passos.filter((p) => p.elemento.startsWith('Punção '));
      expect(ps.length).toBeGreaterThan(40);
      for (const p of ps) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
      expect(new Set(ps.map((p) => p.etapa))).toContain('esforcos');
      const html = htmlMemoriaCorpo(c.mem);
      expect(html).toContain('Contorno C′');
      expect(html).toContain('Solicitação (FSd e momentos)');
      const csv = csvMemoria(c.mem);
      expect(csv.split('\n').filter((l) => l.includes('Contorno C')).length).toBeGreaterThan(10);
      expect(JSON.parse(JSON.stringify(c.mem)).passos.filter((p: PassoMemoria) => p.topico.startsWith('Contorno C′')).length).toBeGreaterThan(0);
    });
  }

  const lajes: [string, Caso][] = [['h = 22 cm', L22], ['h = 16 cm, q = 14', L16], ['critério anterior de borda e canto', ANTERIOR], ['armadura informada cobre', COBRE], ['armadura informada parcial', PARCIAL], ['conectores', CONECT], ['pilares circulares', CIRC], ['vento, modelo integrado', VENTO], ['vento, modelo separado (molas)', MOLAS], ['viga chata', CHATA], ['abertura junto ao pilar', FURO]];
  for (const [nome, c] of lajes) {
    it(`${nome}: solicitação, K, tensões resistentes, contornos, varredura de cortante e armadura refeitos das entradas`, () => {
      const rs = proprias(c);
      expect(rs.length).toBeGreaterThanOrEqual(9);
      for (const r of rs) {
        const el = elDe(r);
        refazSolicitacao(c, el, r);
        refazVerificacao(c, el, '', refDe(r), { comC3: !!r.armadura });
      }
    });
  }

  it('cobertura: interno, borda e canto; sem armadura, calculada, informada que cobre e informada parcial; biela; molas e vento; circular; viga; abertura', () => {
    const tipos = new Set(CASOS.flatMap((c) => (c.dim.puncao ?? []).map((r) => `${r.tipo}/${r.status}`)));
    for (const k of ['interno/ok', 'interno/armadura', 'borda/armadura', 'borda/fail', 'canto/armadura', 'canto/fail']) expect(tipos.has(k), k).toBe(true);
    const desf = (c: Caso) => new Set(c.mem.passos.filter((p) => p.elemento.startsWith('Punção') && p.topico.startsWith('Situação')).map((p) => p.entradas.desfecho));
    expect(desf(L16).has('armadura')).toBe(true);
    expect(desf(L16).has('biela')).toBe(true);
    expect(desf(COBRE).has('informadaAtende')).toBe(true);
    const todosDesf = new Set(CASOS.flatMap((c) => [...desf(c)]));
    for (const k of ['ok', 'armadura', 'biela', 'informadaAtende', 'vcCobre', 'semSolucaoC3']) expect(todosDesf.has(k), k).toBe(true);
    // ábaco: armadura dentro e fora dele
    expect(ABACO30.dim.puncao!.some((r) => r.armaduraExterna && r.armadura)).toBe(true);
    expect(ABACO20.dim.puncao!.some((r) => r.armadura && !r.armaduraExterna)).toBe(true);
    // informada parcial: soma-se à calculada (anéis informados ≥ exigidos, Asw informada menor que a exigida)
    const ap = c2(PARCIAL);
    expect(ap.some((p) => num(p, 'AswInf') > 0 && num(p, 'aneisInf') >= num(p, 'nbTot') && (p.resultado as number) > 0)).toBe(true);
    // pilar circular: K = 0,6 e momento resultante
    expect(CIRC.mem.passos.some((p) => p.descricao.startsWith('Momento resultante do pilar circular'))).toBe(true);
    // molas de rotação (modelo separado) e momentos com vento (modelo integrado)
    expect(MOLAS.mem.passos.some((p) => p.descricao.startsWith('Momento transmitido pelo pilar à laje em torno de x'))).toBe(true);
    expect(VENTO.mem.passos.some((p) => /^Momento M[xy] com vento/.test(p.descricao))).toBe(true);
    // viga chata
    expect(CHATA.dim.puncao!.some((r) => r.origem === 'viga')).toBe(true);
    expect(CHATA.mem.passos.some((p) => p.descricao.startsWith('Taxa de armadura de flexão do apoio em viga chata'))).toBe(true);
    // conectores: 1 perna
    expect(CONECT.mem.passos.some((p) => p.descricao.includes('(1 perna por barra)'))).toBe(true);
    // abertura: o contorno perde trechos (nota na descrição) e há contornos com abertura no cálculo
    expect(FURO.mem.passos.some((p) => p.descricao.includes('Trechos junto a aberturas'))).toBe(true);
  });

  it('pilar interno sem momento: valores de mão (u = 2(c1+c2), Wp = c1²/2 + c1·c2 em C; τF = F/(u·d)); canto: e* = 0,125 m (anterior) e pelo pilar reduzido (NBR)', () => {
    const r = L22.dim.puncao!.find((x) => x.tipo === 'interno' && x.pavimento === 'Tipo 1')!;
    const el = elDe(r), pu = achar(L22, el, 'Contorno C', 'Contorno C a');
    expect(pu.resultado).toBeCloseTo(2 * (0.5 + 0.5), 12);
    expect(achar(L22, el, 'Contorno C', 'Módulo de resistência plástica Wpu').resultado).toBeCloseTo(0.5 * 0.5 / 2 + 0.25, 12);
    const uC2 = achar(L22, el, 'Contorno C′', 'Contorno C′ a').resultado as number;
    expect(uC2 / (2 * (0.5 + 0.5) + 2 * Math.PI * 2 * r.d)).toBeGreaterThan(0.999);
    expect(uC2 / (2 * (0.5 + 0.5) + 2 * Math.PI * 2 * r.d)).toBeLessThan(1);
    // critério anterior: em C, as duas faces internas do pilar 50×50 têm centroide a 0,375 m das bordas → |e*| = 0,125 m
    const rcA = ANTERIOR.dim.puncao!.find((x) => x.tipo === 'canto' && x.pavimento === 'Tipo 1')!;
    expect(achar(ANTERIOR, elDe(rcA), 'Contorno C', 'Excentricidade e*u').resultado).toBeCloseTo(0.125, 12);
    // NBR (19.5.2.4): pilar reduzido a × a junto ao canto, a = mín(1,5d; 0,5c); em C, u* = 2a (as duas faces internas do pilar reduzido),
    // centroide a 0,75a das bordas → e* = 0,75a − c/2 (negativo: o centroide de u* fica do lado da borda)
    const rc = L16.dim.puncao!.find((x) => x.tipo === 'canto' && x.pavimento === 'Tipo 1')!, a = Math.min(1.5 * rc.d, 0.25);
    expect(rc.d).toBeCloseTo(0.125, 12);
    expect(a).toBeCloseTo(0.1875, 12);
    expect(achar(L16, elDe(rc), 'Contorno C', 'Contorno C a').resultado).toBeCloseTo(2 * a, 12);
    expect(achar(L16, elDe(rc), 'Contorno C', 'Excentricidade e*u').resultado).toBeCloseTo(0.75 * a - 0.25, 12);
    expect(achar(L16, elDe(rc), 'Contorno C', 'Excentricidade e*v').resultado).toBeCloseTo(0.75 * a - 0.25, 12);
    // Wp em C em torno do centro do pilar, perímetro total (faces internas): C1²/4 + C1·C2/2 = 0,0625 + 0,125 = 0,1875 m² (fórmula de canto com d = 0)
    expect(achar(L16, elDe(rc), 'Contorno C', 'Módulo de resistência plástica Wpu').resultado).toBeCloseTo(0.25 * 0.25 + 0.125, 12);
    // borda: u* em C = 2a + c2; Wp1 = C1²/2 + C1·C2/2 = 0,25 m²; Wp2 = C2²/4 + C1·C2 = 0,3125 m² (fórmulas de borda com d = 0)
    const rb = L16.dim.puncao!.find((x) => x.tipo === 'borda' && x.pavimento === 'Tipo 1')!, elB = elDe(rb);
    expect(achar(L16, elB, 'Contorno C', 'Contorno C a').resultado).toBeCloseTo(2 * a + 0.5, 12);
    const W = [0, 1].map((i) => achar(L16, elB, 'Contorno C', `Módulo de resistência plástica Wp${'uv'[i]}`).resultado as number).sort((x, y) => x - y);
    expect(W[0]).toBeCloseTo(0.125 + 0.125, 12);
    expect(W[1]).toBeCloseTo(0.0625 + 0.25, 12);
  });

  for (const AB of [ABACO, ABACO20, ABACO30, ABACO45]) {
    it(`${AB.nome}: região interna (C, C′ com a altura do ábaco), fora do ábaco (C″ a 2·dLaje da borda) e geometria do ábaco, refeitas das entradas`, () => {
      const rs = proprias(AB);
      expect(rs.length).toBeGreaterThanOrEqual(9);
      let comExterna = 0;
      for (const r of rs) {
        const el = elDe(r);
        refazSolicitacao(AB, el, r);
        expect(r.abaco).toBeDefined();
        const ex = !!r.abaco!.externa, rotI = r.abaco!.id ? ' – região interna (ábaco)' : '';
        const ref = refDe(r);
        // região interna: C e C′ (e C″ da armadura interna quando não há verificação fora do ábaco)
        refazVerificacao(AB, el, rotI, { ...ref, contornos: ex ? r.contornos.slice(0, 2) : r.contornos }, { comC3: !ex && !!r.armadura });
        expect(passosDe(AB, el, 'Ábaco e regiões da verificação').length).toBeGreaterThan(0);
        if (ex) {
          comExterna++;
          const rect = r.abaco!.retangulo!, ext = r.abaco!.externa!, rotE = ' – fora do ábaco';
          expect(passosDe(AB, el, `Contorno C′${rotE}`).length).toBeGreaterThan(0);
          // o ábaco faz o papel do pilar: C″ a 2·dLaje da borda; altura útil e taxa da laje
          const refE: Ref = { contornos: [undefined, r.contornos[2]], d: r.abaco!.dLaje, rho: r.abaco!.rhoLaje, tauRd1: ext.tauRd1, tauRd2: r.tauRd2, tauRd3: ext.tauRd3, armadura: r.armaduraExterna, M: r.M, F: r.F, ap: { c1: rect.c1, c2: rect.c2, ang: rect.angulo, centro: rect.centro as [number, number], circular: false } };
          refazVerificacao(AB, el, rotE, refE, { comC3: false });
          const sit = achar(AB, el, `Situação${rotE}`, 'Situação');
          expect(sit.resultado).toBe(ext.status);
          if (r.armaduraExterna) expect(passosDe(AB, el, `Armadura de punção – disposição${rotE}`)[0].entradas.total).toBe(r.armaduraExterna.total);
        } else expect(passosDe(AB, el, 'Contorno C′ – fora do ábaco')).toHaveLength(0);
      }
      expect(comExterna).toBeGreaterThan(0);
      expect(AB.mem.passos.some((p) => p.descricao.startsWith('O contorno C′ (a 2·dAb da face) cai dentro do ábaco'))).toBe(true);
      expect(AB.mem.passos.some((p) => p.descricao.includes('Trechos sobre cubetas saem'))).toBe(true);
    });
  }
});

/** Passos "Armadura informada pelo usuário" do caso (todas as punções). */
function c2(c: Caso) { return c.mem.passos.filter((p) => p.elemento.startsWith('Punção') && p.descricao.startsWith('Armadura informada pelo usuário')); }

// ---------------------------------------------------------------- radier
describe('MD4: punção do radier', () => {
  it('combinação determinante, pé do pilar, reação do solo descontada, contornos e armadura refeitos das entradas', () => {
    expect(RAD.dimMem.radiers).toEqual(RAD.dim.radiers);
    const lista = RAD.dim.radiers![0].puncao!;
    expect(lista).toHaveLength(4);
    for (const r of lista) {
      const el = `Punção ${r.nome} · Radier ${r.lajeNome}`;
      expect(RAD.mem.elementos).toContain(el);
      const tp = 'Solicitação (FSd e momentos)';
      const comb = achar(RAD, el, tp, 'Combinação ELU determinante');
      expect(comb.resultado).toBe(r.combinacao);
      let maior = 0;
      for (const k of Object.keys(comb.entradas)) if (k.startsWith('τ_')) maior = Math.max(maior, num(comb, k));
      expect(rel(maior, num(comb, 'tauC2'))).toBeLessThan(1e-9);
      const soma = (campo: string, nome: string) => { const p = achar(RAD, el, tp, nome); let s = 0; for (const k of Object.keys(p.entradas)) if (k.startsWith('γ_')) s += num(p, k) * num(p, `${campo}_${k.slice(2)}`); expect(rel(s, p.resultado as number)).toBeLessThan(1e-9); return s; };
      const F = soma('N', 'Força de punção FSd'), Mx = soma('Mx', 'Momento no pé do pilar em torno de x'), My = soma('My', 'Momento no pé do pilar em torno de y');
      expect(rel(F, r.F)).toBeLessThan(1e-9);
      const a = (r.angulo * Math.PI) / 180, Mu = Mx * Math.cos(a) + My * Math.sin(a), Mv = -Mx * Math.sin(a) + My * Math.cos(a);
      expect(rel(Mu, achar(RAD, el, tp, 'Momento nos eixos do pilar: componente em torno de u').resultado as number) < 1e-9 || Math.abs(Mu) < 1e-9).toBe(true);
      expect(Math.abs(Math.abs(Mv) - r.M[0])).toBeLessThan(1e-9 * Math.max(1, r.M[0]));
      expect(Math.abs(Math.abs(Mu) - r.M[1])).toBeLessThan(1e-9 * Math.max(1, r.M[1]));
      const pq = achar(RAD, el, tp, 'Reação do solo sob o pilar');
      let q = 0;
      for (let i = 1; i <= num(pq, 'nNos'); i++) q += num(pq, `q_${i}`);
      q = Math.max(0, q / Math.max(1, num(pq, 'nNos')));
      expect(Math.abs(q - (pq.resultado as number))).toBeLessThan(1e-9 * Math.max(1, q));
      refazVerificacao(RAD, el, '', refDe(r), { comC3: !!r.armadura });
      // FSd reduzida pela reação do solo dentro de cada contorno
      expect(passosDe(RAD, el, 'Contorno C′').some((p) => p.descricao.startsWith('FSd no contorno'))).toBe(true);
    }
  });
});
