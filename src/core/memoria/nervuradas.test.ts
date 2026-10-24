// Memória detalhada (MD fase 3): lajes nervuradas bidirecionais. As contas são refeitas a partir das `entradas` registradas
// (seção T com a linha neutra na mesa e na alma, regime de cisalhamento pelo intereixo, mínimos da Tabela 19.1 nas zonas
// maciças, ábacos) e comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { ResultadoNervurada } from '../building/nervuradasDim';
import type { BuildingModel } from '../building/types';
import { barArea } from '../concrete';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import type { PassoMemoria } from './registrador';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
const padrao = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };

/** Pano 6 × 6 com pilares nos cantos e vigas 20 × 60. */
function pano(tipo: Record<string, unknown>, q?: number, opcoes?: Record<string, number>, forma?: Record<string, unknown>): BuildingModel {
  const s = padrao(), a = 6;
  ok(s, 'lote', { comandos: [[0, 0], [a, 0], [0, a], [a, a]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.2, h: 0.6 } } });
  ok(s, 'lote', { comandos: [v([[0, 0], [a, 0]]), v([[0, a], [a, a]]), v([[0, 0], [0, a]]), v([[a, 0], [a, a]])] });
  if (forma) ok(s, 'forma.tipo', { acao: 'criar', id: 'f80', forma });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo });
  if (q !== undefined) ok(s, 'grupo.editar', { id: 'g_3', q });
  if (opcoes) ok(s, 'opcoes.definir', { valores: opcoes });
  return s.modelo;
}
/** Pano 12,5 × 12,5 sem vigas, pilares 50 × 50 a 6 m e ábacos gerados. */
function lisa(): BuildingModel {
  const s = padrao(), XS = [0.25, 6.25, 12.25];
  ok(s, 'vento.definir', { ativo: false });
  ok(s, 'lote', { comandos: XS.flatMap((x) => XS.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.5, h: 0.5 } } }))) });
  ok(s, 'laje.criar', { grupo: 'g_3', contorno: [[0, 0], [12.5, 0], [12.5, 12.5], [0, 12.5]], tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } });
  ok(s, 'abaco.gerar', { lajes: [s.modelo.lajes[0].id] });
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
interface Caso { nome: string; b: BuildingModel; dim: Dimensionamento; dimMem: Dimensionamento; mem: MemoriaDetalhada; n: ResultadoNervurada }
const CASOS: Caso[] = [];
function caso(nome: string, b: BuildingModel): Caso {
  const an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false }), r = memoriaDetalhada(b, { an });
  const c = { nome, b, dim, dimMem: r.dim, mem: r.memoria, n: dim.nervuradas![0] };
  CASOS.push(c);
  return c;
}
const T = { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 };
const F80 = { nome: 'Cubeta 80', tipo: 'recuperavel', altura: 0.3, intereixo: [0.8, 0.8], bw: [0.1, 0.1] };
// padrão; mesa fina e carga alta (linha neutra na alma); intereixo 80 cm (regime de viga, mesa, zonas maciças por Wood-Armer, fissuração do negativo); ábacos
const A = caso('padrão', pano(T));
const F40 = { nome: 'Cubeta 40', tipo: 'recuperavel', altura: 0.21, intereixo: [0.4, 0.4], bw: [0.2, 0.2] };
const B = caso('linha neutra na alma', pano({ ...T, forma: 'f80', hTotal: 0.25, capa: 0.04 }, 60, undefined, F40));
const C = caso('regime de viga e zonas maciças', pano({ ...T, forma: 'f80', hTotal: 0.36, capa: 0.06 }, 8, { nervuradaWoodArmer: 1, nervuradaMacicoViga: 0.4, nervuradaFissuraNegativo: 1 }, F80));
const D = caso('ábacos', lisa());

const el = (c: Caso) => `Laje ${c.n.nome}`;
const passosDe = (c: Caso, topico?: string | RegExp, e = el(c)) => c.mem.passos.filter((p) => p.elemento === e && (!topico || (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico))));
const achar = (c: Caso, topico: string | RegExp, desc: string): PassoMemoria => { const p = passosDe(c, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${String(topico)} / ${desc}`); return p; };
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const nome = (r: { dir: number; indice: number }) => `${r.dir === 0 ? 'X' : 'Y'}${r.indice + 1}`;

describe('MD3: nervuradas bidirecionais', () => {
  for (const c of CASOS) {
    it(`${c.nome}: dimensionamento idêntico com a memória ligada, etapas e campos`, () => {
      expect(c.dimMem.nervuradas).toEqual(c.dim.nervuradas);
      expect(c.dimMem.lajes).toEqual(c.dim.lajes);
      expect(c.dimMem.vigas).toEqual(c.dim.vigas);
      expect(c.mem.elementos).toContain(el(c));
      const ps = passosDe(c);
      expect(ps.length).toBeGreaterThan(60);
      expect(new Set(ps.map((p) => p.etapa))).toEqual(new Set(['cargas', 'esforcos', 'dimensionamento', 'detalhamento']));
      for (const p of ps) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
      expect(htmlMemoriaCorpo(c.mem)).toContain(el(c));
      expect(csvMemoria(c.mem).split('\n').length).toBeGreaterThan(c.mem.passos.length);
    });

    it(`${c.nome}: flexão positiva em T (linha neutra, C, As, mínimo, barras, largura)`, () => {
      let tot = 0;
      for (const r of c.n.nervuras) {
        const tp = `Nervura ${nome(r)} – flexão positiva`, ps = passosDe(c, tp);
        const amin = achar(c, tp, 'Armadura mínima da nervura');
        expect(rel(amin.resultado as number, 0.0015 * (num(amin, 'bf') * num(amin, 'hf') + num(amin, 'bw') * num(amin, 'hEnch')) * 1e4)).toBeLessThan(1e-9);
        const ln = ps.find((p) => p.descricao.startsWith('Linha neutra'));
        const nec = achar(c, tp, 'Armadura necessária') ;
        if (ln) {
          tot++;
          const s = num(ln, 'sigmaCd'), bf = num(ln, 'b'), lam = num(ln, 'lambda'), d = num(ln, 'd'), x = ln.resultado as number, Md = num(ln, 'Md');
          const tee = lam * x > num(ln, 'hf'), hf = num(ln, 'hf'), bw = num(ln, 'bw');
          const C_ = tee ? s * ((bf - bw) * hf + bw * lam * x) : s * bf * lam * x;
          const z = tee ? ((s * (bf - bw) * hf * hf / 2) + s * bw * lam * x * lam * x / 2) / C_ : lam * x / 2;
          expect(rel(C_ * (d - z) * 1000, Md), `${nome(r)} equilíbrio`).toBeLessThan(1e-7); // bisseção da linha neutra
          const pc = ps.find((p) => p.descricao.startsWith('Resultante de compressão'))!;
          expect(rel(pc.resultado as number, C_)).toBeLessThan(1e-9);
          const pa = ps.find((p) => p.descricao.startsWith('Armadura de tração') || p.descricao.startsWith('Armadura dupla: tração'))!;
          expect(rel((pa.resultado as number) * 1e4, num(nec, 'AsFlexao'))).toBeLessThan(1e-9);
          expect(rel(num(pa, 'C'), C_)).toBeLessThan(1e-9);
          expect(rel(num(pa, 'C') / num(pa, 'fyd'), pa.resultado as number)).toBeLessThan(1e-9);
        }
        expect(rel(nec.resultado as number, num(nec, 'M') > 0.01 ? Math.max(num(nec, 'AsFlexao'), num(nec, 'AsMin')) : 0)).toBeLessThan(1e-9);
        if (!r.concentracao) expect(rel(nec.resultado as number, r.inf.AsNec)).toBeLessThan(1e-9);
        // barras e largura mínima
        const bar = ps.find((p) => p.descricao.startsWith('Largura mínima'));
        if (bar) {
          const e = bar.entradas as Record<string, number>, esp = Math.max(0.02, e.phi / 1000, 1.2 * e.dmax);
          expect(rel(bar.resultado as number, 2 * (e.cob + e.phiEst / 1000) + (e.n * e.phi) / 1000 + (e.n - 1) * esp)).toBeLessThan(1e-9);
          expect(r.inf.reforco!.n).toBe(e.n);
          expect(r.inf.reforco!.phi).toBe(e.phi);
          expect(rel(r.inf.reforco!.As, e.n * barArea(e.phi) * 1e4)).toBeLessThan(1e-9);
        }
        const mu = achar(c, tp, 'Armadura inferior total');
        expect(rel(mu.resultado as number, r.inf.Mu)).toBeLessThan(1e-9);
        expect(rel(num(mu, 'AsTot'), r.inf.total)).toBeLessThan(1e-9);
        // momento último refeito: seção T (linha neutra na mesa ou na alma)
        if (r.inf.total > 0) {
          const T_ = num(mu, 'AsTot') / 1e4 * num(mu, 'fyd'), yLim = num(mu, 'lambda') * num(mu, 'xLimRatio') * num(mu, 'd'), s = num(mu, 'sigmaCd'), bf = num(mu, 'bf'), hf = num(mu, 'hf'), bw = num(mu, 'bw'), d = num(mu, 'd');
          let y = T_ / (s * bf), Mu: number;
          if (y <= hf) { y = Math.min(y, yLim); Mu = s * bf * y * (d - y / 2) * 1000; }
          else { const Rcf = s * (bf - bw) * hf, Rcw = Math.max(0, T_ - Rcf), yw = Math.min(Rcw / (s * bw), yLim); Mu = (Rcf * (d - hf / 2) + s * bw * yw * (d - yw / 2)) * 1000; }
          expect(rel(Mu, r.inf.Mu), `${nome(r)} Mu`).toBeLessThan(1e-9);
        }
      }
      expect(tot).toBeGreaterThan(0);
    });

    it(`${c.nome}: fissuração (w1, w2, wk), negativos e comprimentos`, () => {
      let nFiss = 0, nNeg = 0;
      for (const r of c.n.nervuras) {
        for (const ponta of [0, 1] as const) {
          const s = r.sup[ponta];
          if (!s) continue;
          nNeg++;
          const tp = `Nervura ${nome(r)} – negativo na ponta ${ponta ? 'final' : 'inicial'}`, ps = passosDe(c, tp);
          const amin = achar(c, tp, 'Armadura mínima da própria nervura');
          expect(rel(num(amin, 'AsMin'), 0.0015 * num(amin, 'bw') * num(amin, 'h') * 1e4)).toBeLessThan(1e-9);
          expect(rel(amin.resultado as number, Math.max(num(amin, 'AsFlexao'), num(amin, 'AsMin')))).toBeLessThan(1e-9);
          const comp = ps.find((p) => p.descricao.startsWith('Comprimento da armadura negativa'))!, e = comp.entradas as Record<string, number>;
          const arred = (v: number, cm: number) => Math.ceil(v / (cm / 100) - 1e-9) * (cm / 100);
          expect(rel(comp.resultado as number, Math.min(e.L, arred(e.ext + Math.max(e.d, (12 * e.phi) / 1000), e.arred)))).toBeLessThan(1e-9);
          expect(Math.abs(s.comprimento - (comp.resultado as number))).toBeLessThan(5e-4);
          const wkp = ps.find((p) => p.descricao.startsWith('Abertura característica'));
          if (wkp) {
            nFiss++;
            const w1 = achar(c, tp, 'Abertura w1'), w2 = achar(c, tp, 'Abertura w2');
            const k1 = (num(w1, 'phi') / (12.5 * 2.25)) * (num(w1, 'sigmaS') / num(w1, 'Es')) * ((3 * num(w1, 'sigmaS')) / num(w1, 'fctm'));
            const k2 = (num(w2, 'phi') / (12.5 * 2.25)) * (num(w2, 'sigmaS') / num(w2, 'Es')) * (4 / num(w2, 'rhoR') + 45);
            expect(rel(w1.resultado as number, k1)).toBeLessThan(1e-9);
            expect(rel(w2.resultado as number, k2)).toBeLessThan(1e-9);
            expect(rel(wkp.resultado as number, Math.min(k1, k2))).toBeLessThan(1e-9);
            expect(rel(wkp.resultado as number, s.wk)).toBeLessThan(1e-9);
          }
        }
        const tpP = `Nervura ${nome(r)} – flexão positiva`, pw = passosDe(c, tpP).find((p) => p.descricao.startsWith('Abertura característica'));
        if (pw) { nFiss++; expect(rel(pw.resultado as number, Math.min(num(pw, 'w1'), num(pw, 'w2')))).toBeLessThan(1e-9); expect(pw.resultado as number).toBeLessThanOrEqual(num(pw, 'wkLim') + 1e-9); }
      }
      if (c !== D) expect(nNeg).toBeGreaterThan(0);
      if (c === C) expect(nFiss).toBeGreaterThan(0);
    });

    it(`${c.nome}: cortante por regime de intereixo, seções e estribos`, () => {
      for (const k of [0, 1] as const) {
        const p = passosDe(c, 'Cargas e geometria').find((q) => q.descricao.startsWith(`Regime de cisalhamento e da mesa na direção ${k}`))!;
        const i = num(p, 'i'), bw = num(p, 'bw');
        expect(p.resultado).toBe(i <= 0.65 + 1e-9 ? 'laje' : i <= 0.9 + 1e-9 && bw >= 0.12 - 1e-9 ? 'laje' : i <= 1.1 + 1e-9 ? 'viga' : 'macica');
        expect(p.resultado).toBe(c.n.regime[k]);
      }
      for (const r of c.n.nervuras) {
        const tp = `Nervura ${nome(r)} – cortante`, v1 = achar(c, tp, 'Resistência sem armadura'), v2 = achar(c, tp, 'Resistência da biela');
        const k = Math.max(1, 1.6 - num(v1, 'd')), rho = Math.min(0.02, num(v1, 'AsTot') / (num(v1, 'bw') * num(v1, 'd')));
        expect(rel(num(v1, 'k'), k)).toBeLessThan(1e-9);
        expect(rel(num(v1, 'rho'), rho)).toBeLessThan(1e-9);
        expect(rel(v1.resultado as number, 0.25 * num(v1, 'fctd') * k * (1.2 + 40 * rho) * num(v1, 'bw') * num(v1, 'd') * 1000)).toBeLessThan(1e-9);
        expect(rel(v1.resultado as number, r.cortante.VRd1)).toBeLessThan(1e-9);
        expect(rel(v2.resultado as number, 0.27 * num(v2, 'av2') * num(v2, 'fcd') * num(v2, 'bw') * num(v2, 'd') * 1000)).toBeLessThan(1e-9);
        expect(rel(v2.resultado as number, r.cortante.VRd2)).toBeLessThan(1e-9);
        const sec = achar(c, tp, 'Seções de verificação');
        expect(num(sec, 'nSecoes')).toBe(r.cortante.secoes.length);
        r.cortante.secoes.forEach((s, j) => {
          expect(rel(num(sec, `V_${j}`), s.V) < 1e-9 || (s.V === 0 && num(sec, `V_${j}`) === 0)).toBe(true);
          const solido = num(sec, `solido_${j}`) === 1;
          expect(solido).toBe(!!s.solido);
          const preciso = solido ? false : sec.entradas.regime === 'laje' ? num(sec, `V_${j}`) > num(sec, 'VRd1') + 1e-9 : true;
          expect(num(sec, `estribo_${j}`) === 1).toBe(preciso);
          expect(s.estribo).toBe(preciso);
        });
        const est = passosDe(c, tp).find((p) => p.descricao.startsWith('Estribos pelo modelo I'));
        if (r.cortante.estribo) {
          expect(est).toBeDefined();
          const e = est!.entradas as Record<string, number>;
          expect(e.phi).toBe(r.cortante.estribo.phi);
          expect(e.s).toBe(r.cortante.estribo.s);
          expect(e.barras).toBe(r.cortante.estribo.barras);
          expect(rel(e.Vc, 0.6 * num(v1, 'fctd') * num(v1, 'bw') * num(v1, 'd') * 1000)).toBeLessThan(1e-9);
          expect(rel(e.aswS, Math.max(e.aswMin, Math.max(0, e.Vsd - e.Vc) / 1000 / (0.9 * e.d * e.fywd)))).toBeLessThan(1e-9);
        }
      }
    });

    it(`${c.nome}: mesa, zonas maciças, ábacos e quantitativo`, () => {
      const m = c.n.mesa, qd = achar(c, 'Mesa', 'Carga de cálculo da mesa');
      expect(rel(qd.resultado as number, num(qd, 'gg') * (num(qd, 'pp') + num(qd, 'gRev')) + num(qd, 'gq') * num(qd, 'q'))).toBeLessThan(1e-9);
      expect(rel(qd.resultado as number, m.qd)).toBeLessThan(1e-9);
      const md = achar(c, 'Mesa', m.exigida ? 'Momento negativo da mesa' : 'Flexão da mesa não exigida');
      expect(rel(md.resultado as number, (num(md, 'qd') * num(md, 'livre') ** 2) / 12)).toBeLessThan(1e-9);
      expect(rel(md.resultado as number, m.exigida ? m.Md : (m.qd * m.livre ** 2) / 12)).toBeLessThan(m.exigida ? 1e-9 : 1e-2);
      const as = achar(c, 'Mesa', 'Armadura da mesa');
      expect(rel(as.resultado as number, Math.max(num(as, 'AsMin'), num(as, 'AsFlexao')))).toBeLessThan(1e-9);
      expect(rel(num(as, 'AsMin'), Math.max(0.9, 0.5 * 0.0015 * num(as, 'hf') * 1e4))).toBeLessThan(1e-9);
      expect(rel(as.resultado as number, m.AsNec)).toBeLessThan(1e-9);
      const br = achar(c, 'Mesa', 'Barras de distribuição');
      expect(rel(br.resultado as number, m.AsAdotada)).toBeLessThan(1e-9);
      expect(rel(num(br, 'AsFi') / num(br, 's'), m.AsAdotada)).toBeLessThan(1e-9);
      expect(Math.max(0.05, Math.min(0.2, Math.floor((num(br, 'AsFi') / num(br, 'AsNec')) * 100 + 1e-9) / 100))).toBe(m.s);
      // quantitativo
      const tot = passosDe(c, 'Quantitativo de aço').find((p) => p.descricao.startsWith('Peso total'))!;
      expect(rel(tot.resultado as number, c.n.peso)).toBeLessThan(1e-9);
      const soma = Object.entries(tot.entradas).filter(([k2]) => k2.startsWith('m_')).reduce((t, [, v]) => t + (v as number), 0);
      expect(rel(soma, c.n.peso)).toBeLessThan(1e-9);
      expect(rel(c.n.posicoes.reduce((t, q) => t + q.n * q.comprimento * barArea(q.phi) * 7850, 0), c.n.peso)).toBeLessThan(1e-9);
    });
  }

  it('cobertura: linha neutra na mesa e na alma, regime de viga, zona maciça (Tabela 19.1), ábaco e fissuração do negativo', () => {
    const lnAlma = (c: Caso) => passosDe(c, /flexão positiva/).filter((p) => p.descricao.startsWith('Linha neutra') && num(p, 'lambda') * (p.resultado as number) > num(p, 'hf'));
    const lnMesa = (c: Caso) => passosDe(c, /flexão positiva/).filter((p) => p.descricao.startsWith('Linha neutra') && num(p, 'lambda') * (p.resultado as number) <= num(p, 'hf'));
    expect(lnMesa(A).length).toBeGreaterThan(0);
    expect(lnAlma(B).length, 'linha neutra na alma').toBeGreaterThan(0);
    expect(C.n.regime[0]).toBe('viga');
    expect(C.n.zonaMacica).toBeDefined();
    expect(D.n.abacos.length).toBeGreaterThan(0);
    expect(D.n.nervuras.some((r) => r.abacos.length > 0)).toBe(true);
    expect(passosDe(C, /negativo na ponta/).some((p) => p.descricao.startsWith('Fissuração do negativo'))).toBe(true);
  });

  it('zona maciça: mínimos da Tabela 19.1, necessário, malha e complemento', () => {
    const z = C.n.zonaMacica!, tp = 'Zona maciça (Wood-Armer)';
    const mn = achar(C, tp, 'Armadura mínima da laje maciça');
    expect(rel(num(mn, 'amin'), num(mn, 'rhoMin') * num(mn, 'h') * 1e4)).toBeLessThan(1e-9);
    for (const face of ['inf', 'sup'] as const) for (const k of [0, 1] as const) {
      const p = achar(C, `${tp} – ${face === 'inf' ? 'inferior' : 'superior'}, direção ${k}`, 'Armadura necessária');
      const nec = face === 'inf' ? z.AsNecInf[k] : z.AsNecSup[k], comp = face === 'inf' ? z.complementoInf[k] : z.complementoSup[k], malha = face === 'inf' ? z.AsMalhaInf[k] : z.AsMalhaSup[k];
      expect(rel(num(p, 'AsMin'), (face === 'inf' ? 0.67 : 1) * num(mn, 'amin'))).toBeLessThan(1e-9);
      expect(rel(num(p, 'AsNec'), Math.abs(num(p, 'M')) < 1e-3 ? num(p, 'AsMin') : Math.max(num(p, 'AsMin'), num(p, 'AsFlexao')))).toBeLessThan(1e-9);
      expect(rel(num(p, 'AsNec'), nec)).toBeLessThan(1e-9);
      expect(rel(p.resultado as number, Math.max(0, num(p, 'AsNec') - num(p, 'malha')))).toBeLessThan(1e-9);
      expect(rel(num(p, 'malha'), malha) < 1e-9 || malha === 0).toBe(true);
      expect(rel(p.resultado as number, comp) < 1e-9 || comp === 0).toBe(true);
      expect(num(p, 'M')).toBe(face === 'inf' ? z.Minf[k] : z.Msup[k]);
    }
  });

  it('ábaco: reforço, comprimento e cortante da banda maciça', () => {
    let n = 0;
    for (const r of D.n.nervuras) for (const a of r.abacos) {
      n++;
      const tp = `Nervura ${nome(r)} – ábaco ${a.abaco}`, ref = achar(D, tp, 'Armadura negativa necessária no ábaco');
      const AsNec = num(ref, 'hasBanda') ? Math.max(num(ref, 'AsFlexao'), num(ref, 'AsMin')) : 0, AsBorda = num(ref, 'hasBorda') ? Math.max(num(ref, 'AsFlexaoBorda'), num(ref, 'AsMin')) : 0;
      expect(rel(ref.resultado as number, Math.max(0, AsNec - num(ref, 'AsBase'), AsBorda)) < 1e-9 || ref.resultado === 0).toBe(true);
      expect(rel(AsNec, a.AsNec) < 1e-9 || AsNec === 0).toBe(true);
      expect(rel(AsBorda, a.AsBorda) < 1e-9 || AsBorda === 0).toBe(true);
      expect(rel(num(ref, 'AsBase'), a.AsBase) < 1e-9 || a.AsBase === 0).toBe(true);
      const cort = achar(D, tp, 'Cortante da banda maciça'), k = Math.max(1, 1.6 - num(cort, 'd')), rho = Math.min(0.02, num(cort, 'AsTop') / (num(cort, 'b') * num(cort, 'd')));
      expect(rel(cort.resultado as number, 0.25 * num(cort, 'fctd') * k * (1.2 + 40 * rho) * num(cort, 'b') * num(cort, 'd') * 1000)).toBeLessThan(1e-9);
      expect(rel(cort.resultado as number, a.VRd1)).toBeLessThan(1e-9);
      expect(rel(num(cort, 'VRd2'), 0.27 * num(cort, 'av2') * num(cort, 'fcd') * num(cort, 'b') * num(cort, 'd') * 1000)).toBeLessThan(1e-9);
      expect(rel(num(cort, 'VRd2'), a.VRd2)).toBeLessThan(1e-9);
      expect(num(cort, 'Vsd')).toBe(a.Vmax);
    }
    expect(n).toBeGreaterThan(0);
  });
});
