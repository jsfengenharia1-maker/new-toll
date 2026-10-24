// Memória detalhada (MD fase 3b): vigotas por ficha (armadas, protendidas) e nervuradas moldadas no local. As contas são refeitas a
// partir das `entradas` registradas e comparadas com o dimensionamento (erro relativo ≤ 1e-9; a bisseção da armadura equivalente a
// 1e-7); a memória ligada não muda o resultado.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { ResultadoVigotas } from '../building/vigotas';
import type { BuildingModel } from '../building/types';
import { barArea } from '../concrete';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import type { PassoMemoria } from './registrador';

type Ok = (n: string, p: Record<string, unknown>) => void;
interface Opc { vaos?: number[]; carga?: number; biapoiada?: boolean; minimos?: boolean; opcoes?: Record<string, number>; extra?: (ok: Ok, s: Sessao) => void }
/** Pavimento com lajes de vigotas na direção x (vãos informados, 5 m em y), vigas 15×45 e pilares 25×25. */
function pav(tipo: Record<string, unknown>, o: Opc = {}): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok: Ok = (n, p) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const vaos = o.vaos ?? [4], xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]), L = xs.at(-1)!;
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo });
  if (o.biapoiada) ok('laje.editar', { id: s.modelo.lajes[0].id, vigotasBiapoiadas: true });
  if (o.carga) ok('carga.area', { grupo: 'g_3', contorno: [[0, 0], [L, 0], [L, 5], [0, 5]], valor: o.carga });
  if (!o.minimos) ok('opcoes.definir', { valores: { vigotaMomentoMinPositivo: 0, vigotaMomentoMinNegativo: 0 } });
  if (o.opcoes) ok('opcoes.definir', { valores: o.opcoes });
  o.extra?.(ok, s);
  return s.modelo;
}
const ARMADA = { tipo: 'vigotas', ficha: 'ex:armada', serie: 'A12' }, PROT = { tipo: 'vigotas', ficha: 'ex:protendida', serie: 'P16' };
const MOLDADA = { tipo: 'moldada', capa: 0.05, intereixo: 0.5, bw: 0.1, h: 0.25, enchimento: 'eps' };

const TOPICO = 'Geometria da laje';
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
interface Caso { nome: string; dim: Dimensionamento; dimMem: Dimensionamento; mem: MemoriaDetalhada; vs: ResultadoVigotas[]; moldada: boolean }
const CASOS: Caso[] = [];
function caso(nome: string, b: BuildingModel, moldada = false): Caso {
  const an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false }), r = memoriaDetalhada(b, { an });
  const c = { nome, dim, dimMem: r.dim, mem: r.memoria, vs: dim.vigotas ?? [], moldada };
  CASOS.push(c);
  return c;
}
const A1 = caso('armada, tipo A1', pav(ARMADA, { biapoiada: true, carga: 1 }));
const A2 = caso('armada, adicional e negativos em duas parcelas', pav(ARMADA, { vaos: [4, 4], carga: 4 }));
const A3 = caso('armada biapoiada com adicional, redistribuição e montagem', pav(ARMADA, { vaos: [4, 4], carga: 5, opcoes: { vigotaRedistribuir: 1, redistribuicao: 15, vigotaMontagem: 1, vigotaEscoraDist: 0 } }));
const A4 = caso('armada, vigotas dupla, manual e editada', pav(ARMADA, { biapoiada: true, carga: 3, extra: (ok, s) => { const id = s.modelo.lajes[0].id; ok('vigota.multipla', { id, indice: 3, n: 2 }); ok('vigota.momentos', { id, indices: [6], pos: 4.2, neg: [-0.5, -0.8], v: [3.1, 3.3] }); ok('vigota.editar', { id, de: 0, ate: 0, tipo: 'A2', inf: { n: 1, phi: 8, percentual: 60 }, transversal: { phi: 5, s: 0.2 } }); } }));
const A5 = caso('armada biapoiada, adicional automático', pav(ARMADA, { biapoiada: true, carga: 6 }));
const P1 = caso('protendida, serviço', pav(PROT, { vaos: [4, 4], carga: 5 }));
const P2 = caso('protendida, CAA III (rara)', pav(PROT, { carga: 3, extra: (ok, s) => ok('laje.exposicao', { ids: [s.modelo.lajes[0].id], caa: 'III' }) }));
const M1 = caso('moldada, armadura calculada', pav(MOLDADA, { biapoiada: true, carga: 6 }), true);
const M2 = caso('moldada, estribos e vigotas contínuas', pav(MOLDADA, { vaos: [4, 4], carga: 12 }), true);
const M3 = caso('moldada, armadura atribuída', pav(MOLDADA, { biapoiada: true, carga: 6, extra: (ok, s) => ok('laje.editar', { id: s.modelo.lajes[0].id, armaduraMoldada: { inf: { n: 2, phi: 12.5 }, estribo: { phi: 5, s: 0.15 } } }) }), true);

const el = (r: ResultadoVigotas) => `Laje ${r.nome}`;
const passosDe = (c: Caso, r: ResultadoVigotas, topico?: string | RegExp) => c.mem.passos.filter((p) => p.elemento === el(r) && (!topico || (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico))));
const achar = (c: Caso, r: ResultadoVigotas, topico: string | RegExp, desc: string): PassoMemoria => { const p = passosDe(c, r, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${String(topico)} / ${desc}`); return p; };
const tem = (c: Caso, r: ResultadoVigotas, topico: string | RegExp, desc: string) => passosDe(c, r, topico).find((x) => x.descricao.startsWith(desc));
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
/** Tópicos-base das unidades de cálculo, na ordem em que o dimensionamento as gera. */
const unidades = (c: Caso, r: ResultadoVigotas): string[] => {
  const tps: string[] = [];
  for (const p of passosDe(c, r)) { const m = /^((?:Grupo|Vigota) \d+) – esforços$/.exec(p.topico); if (m && !tps.includes(m[1])) tps.push(m[1]); }
  return tps;
};
/** Momento resistente da seção T (mesmo critério de `momentoResistenteT`), refeito aqui a partir das entradas. */
function muT(e: { sigmaCd: number; lambda: number; xLim: number; bf: number; hf: number; bw: number; d: number; fyd: number }, As: number): number {
  const T = As * e.fyd, yLim = e.lambda * e.xLim * e.d;
  let y = T / (e.sigmaCd * e.bf);
  if (y <= e.hf) { y = Math.min(y, yLim); return e.sigmaCd * e.bf * y * (e.d - y / 2) * 1000; }
  const Rcf = e.sigmaCd * (e.bf - e.bw) * e.hf, Rcw = Math.max(0, T - Rcf), yw = Math.min(Rcw / (e.sigmaCd * e.bw), yLim);
  return (Rcf * (e.d - e.hf / 2) + e.sigmaCd * e.bw * yw * (e.d - yw / 2)) * 1000;
}
const arred = (v: number, cm: number) => Math.ceil(v / (cm / 100) - 1e-9) * (cm / 100);

describe('MD3b: vigotas por ficha e moldadas', () => {
  for (const c of CASOS) {
    it(`${c.nome}: dimensionamento idêntico com a memória ligada, etapas e exportações`, () => {
      expect(c.vs.length).toBeGreaterThan(0);
      expect(c.dimMem.vigotas).toEqual(c.dim.vigotas);
      expect(c.dimMem.lajes).toEqual(c.dim.lajes);
      expect(c.dimMem.vigas).toEqual(c.dim.vigas);
      for (const r of c.vs) {
        const ps = passosDe(c, r);
        expect(ps.length).toBeGreaterThan(25);
        expect(new Set(ps.map((p) => p.etapa))).toEqual(new Set(['cargas', 'esforcos', 'dimensionamento', 'detalhamento']));
        for (const p of ps) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
        expect(unidades(c, r)).toHaveLength(r.grupos.length);
        expect(htmlMemoriaCorpo(c.mem)).toContain(el(r));
        expect(tem(c, r, TOPICO, 'Banzo inferior')).toBeUndefined();
      }
      expect(csvMemoria(c.mem).length).toBeGreaterThan(1000);
    });

    it(`${c.nome}: base, capa mínima, mínimos, flexão em T e armadura necessária`, () => {
      for (const r of c.vs) {
        const cm = achar(c, r, TOPICO, 'Capa mínima');
        expect(rel(cm.resultado as number, r.verificacaoCapa.minima)).toBeLessThan(1e-9);
        const am = achar(c, r, TOPICO, 'Armadura mínima por nervura');
        const AsMin = num(am, 'rhoMin') * (num(am, 'intereixo') * num(am, 'capa') + num(am, 'bw') * num(am, 'hEnch')) * 1e4;
        expect(rel(am.resultado as number, AsMin)).toBeLessThan(1e-9);
        const al = achar(c, r, 'Materiais e alturas úteis', 'Alturas úteis');
        expect(rel(num(al, 'h') - num(al, 'cobInf') - 0.005, r.d.inf)).toBeLessThan(1e-3);
        unidades(c, r).forEach((tp, gi) => {
          const g = r.grupos[gi], tpP = `${tp} – flexão positiva`, nec = achar(c, r, tpP, 'Armadura necessária por nervura');
          const AsNec = Math.max(num(nec, 'AsFlexao'), num(nec, 'M') > 0 ? num(nec, 'AsMin') : 0);
          expect(rel(AsNec, num(nec, 'AsNec'))).toBeLessThan(1e-9);
          expect(rel(AsNec, g.positiva.AsNec)).toBeLessThan(1e-9);
          expect(rel(num(nec, 'M'), g.esforcos.mPos)).toBeLessThan(1e-9);
          const ln = passosDe(c, r, tpP).find((p) => p.descricao.startsWith('Linha neutra'));
          if (ln) {
            const s = num(ln, 'sigmaCd'), bf = num(ln, 'b'), lam = num(ln, 'lambda'), d = num(ln, 'd'), x = ln.resultado as number, hf = num(ln, 'hf'), bw = num(ln, 'bw');
            const tee = lam * x > hf, C_ = tee ? s * ((bf - bw) * hf + bw * lam * x) : s * bf * lam * x;
            const z = tee ? (s * (bf - bw) * hf * hf / 2 + s * bw * lam * x * lam * x / 2) / C_ : lam * x / 2;
            expect(rel(C_ * (d - z) * 1000, num(ln, 'Md')), 'equilíbrio').toBeLessThan(1e-7);
          }
        });
      }
    });

    it(`${c.nome}: ${c.moldada ? 'armadura inferior da moldada' : 'tipo da série, serviço, adicional e parcelas'}`, () => {
      for (const r of c.vs) unidades(c, r).forEach((tp, gi) => {
        const g = r.grupos[gi], tpP = `${tp} – flexão positiva`;
        if (c.moldada) {
          const a = achar(c, r, tpP, 'Armadura inferior'), e = a.entradas as Record<string, number>;
          if (e.n) {
            expect(rel(e.n * barArea(e.phi) * 1e4, e.As)).toBeLessThan(1e-9);
            const need = 2 * (e.cob + e.phiEst / 1000) + (e.n * e.phi) / 1000 + (e.n - 1) * e.ah;
            expect(rel(need, e.need)).toBeLessThan(1e-9);
            expect(e.cabe).toBe(e.bw >= e.need - 1e-9 ? 1 : 0);
            expect(e.ah).toBe(Math.max(0.02, e.phi / 1000, 1.2 * 0.019));
            const mu = achar(c, r, tpP, 'Momento resistente da nervura'), q = mu.entradas as Record<string, number>;
            expect(rel(muT({ sigmaCd: q.sigmaCd, lambda: q.lambda, xLim: q.xLim, bf: q.bf, hf: q.hf, bw: q.bw, d: q.d, fyd: q.fyd }, q.As / 1e4), g.ficha!.positivo.Mu)).toBeLessThan(1e-9);
            expect(rel(mu.resultado as number, g.ficha!.positivo.Mu)).toBeLessThan(1e-9);
            expect(e.n).toBe(g.positiva.barras!.n);
          }
          return;
        }
        const ts = achar(c, r, tpP, 'Tipo da série'), t = ts.entradas as Record<string, number>;
        const n = t.n, mus = [...Array(n).keys()].map((i) => t[`Mu_${i}`]), ok = [...Array(n).keys()].map((i) => t[`servOk_${i}`] === 1);
        let idx = mus.findIndex((m, i) => m >= t.Md - 1e-9 && ok[i]);
        if (t.atribuido >= 0) idx = t.atribuido; else if (idx < 0) idx = n - 1;
        expect(t.idx).toBe(idx);
        expect(ts.resultado).toBe(mus[idx]);
        expect(rel(mus[idx], g.ficha!.positivo.Mu)).toBeLessThan(1e-9);
        expect(rel(t.Md, g.esforcos.mPos)).toBeLessThan(1e-9);
        const eq = achar(c, r, tpP, 'Armadura inferior equivalente'), q = eq.entradas as Record<string, number>;
        expect(rel(muT({ sigmaCd: q.sigmaCd, lambda: q.lambda, xLim: q.xLim, bf: q.bf, hf: q.hf, bw: q.bw, d: q.d, fyd: q.fyd }, q.AsBase / 1e4), q.Mu), 'bisseção').toBeLessThan(1e-7);
        expect(rel(q.AsBase, g.positiva.AsTrelica)).toBeLessThan(1e-9);
        const sv = tem(c, r, tpP, 'Serviço da protensão');
        expect(!!sv).toBe(!!g.ficha!.servico);
        if (sv && g.ficha!.servico) {
          const e = sv.entradas as Record<string, number | string>;
          expect(rel((e.servMax as number) / (e.escala as number), e.Ms as number)).toBeLessThan(1e-9);
          expect(rel(e.Ms as number, g.ficha!.servico.Mserv)).toBeLessThan(1e-9);
          expect(e.ok === 1).toBe(e.Madm === 'n/d' || (e.Ms as number) <= (e.Madm as number) + 1e-9);
          expect(e.ok === 1).toBe(g.ficha!.servico.ok);
        }
        const ad = tem(c, r, tpP, 'Armadura adicional automática');
        if (ad && num(ad, 'n')) {
          const AsT = (q.AsBase + num(ad, 'As')) / 1e4;
          expect(rel(muT({ sigmaCd: q.sigmaCd, lambda: q.lambda, xLim: q.xLim, bf: q.bf, hf: q.hf, bw: q.bw, d: q.d, fyd: q.fyd }, AsT), num(ad, 'MuTot'))).toBeLessThan(1e-9);
          expect(num(ad, 'MuTot')).toBeGreaterThanOrEqual(num(ad, 'Md') - 1e-9);
          expect(rel(num(ad, 'n') * barArea(num(ad, 'phi')) * 1e4, num(ad, 'As'))).toBeLessThan(1e-9);
          const cp = achar(c, r, tpP, 'Comprimento da parcela adicional'), w = cp.entradas as Record<string, number>;
          expect(rel(w.reg + 2 * (w.lb + w.d), w.ext)).toBeLessThan(1e-9);
          expect(w.curta).toBe(w.ext < 0.7 * w.L ? 1 : 0);
        }
        const ps = passosDe(c, r, tpP).find((p) => p.descricao.startsWith('Armadura adicional adotada') || p.descricao.startsWith('Sem armadura adicional') || p.descricao.startsWith('Vigota protendida'))!;
        expect(num(ps, 'nParcelas')).toBe(g.ficha!.parcelas.length);
        g.ficha!.parcelas.forEach((pc, i) => { expect(num(ps, `n_${i}`)).toBe(pc.n); expect(num(ps, `comp_${i}`)).toBe(pc.comprimento); });
        expect(rel(ps.resultado as number, g.positiva.AsAdicional)).toBeLessThan(1e-9);
        expect(rel(num(ps, 'MuTotal'), g.ficha!.positivo.MuTotal)).toBeLessThan(1e-9);
        const ap = achar(c, r, tpP, 'Aproveitamento');
        expect(rel(ap.resultado as number, g.ficha!.positivo.aprov)).toBeLessThan(1e-9);
        const fo = tem(c, r, tpP, 'Parcela curta: fora dela');
        if (fo) expect(num(fo, 'fora') === 1 || num(fo, 'MuSemCurta') > 0).toBe(true);
      });
    });

    it(`${c.nome}: esforços da unidade, redistribuição, negativos, cortante e maciçamento`, () => {
      for (const r of c.vs) unidades(c, r).forEach((tp, gi) => {
        const g = r.grupos[gi];
        const red = passosDe(c, r, `${tp} – esforços`).find((p) => p.descricao.startsWith('Redistribuição'));
        if (red) {
          const delta = Math.max(1 - num(red, 'pct') / 100, num(red, 'deltaMin'));
          expect(rel(num(red, 'delta'), delta)).toBeLessThan(1e-9);
          const m = [num(red, 'mNeg0'), num(red, 'mNeg1')], cont = [num(red, 'cont0'), num(red, 'cont1')];
          const dm = m.reduce((t, v, k) => t + (cont[k] && v < -1e-9 ? -v * (1 - delta) : 0), 0);
          expect(rel(red.resultado as number, num(red, 'mPos') + dm / 2)).toBeLessThan(1e-9);
        }
        const mu = tem(c, r, `${tp} – esforços`, 'Vigota ') ?? passosDe(c, r, `${tp} – esforços`).find((p) => /conjunto de \d vigotas|atribuídos pelo usuário/.test(p.descricao));
        if (mu && mu.entradas.dp !== undefined) {
          const e = mu.entradas as Record<string, number>;
          expect(rel(e.dp, Math.max(0, e.pesoLinear - e.ppNerv) * e.gg)).toBeLessThan(1e-9);
          expect(rel((e.mPosG + (e.dp * e.L * e.L) / 8) / e.n, e.mPos)).toBeLessThan(1e-9);
          expect(rel((e.mNeg0G - (e.dp * e.L * e.L) / 12) / e.n, e.mNeg0) < 1e-9 || e.mNeg0 === 0).toBe(true);
          expect(rel((e.v0G + (e.dp * e.L) / 2) / e.n, e.v0)).toBeLessThan(1e-9);
          expect(rel(e.mPos, g.esforcos.mPos)).toBeLessThan(1e-9);
        }
        [0, 1].forEach((k) => {
          const n = g.negativos[k], pt = k ? 'final' : 'inicial', tn = `${tp} – negativo na ponta ${pt}`, tc = `${tp} – cortante na ponta ${pt}`;
          expect(!!tem(c, r, tn, 'Momentos')).toBe(!!n);
          if (n) {
            const mr = achar(c, r, tn, 'Momentos'), e = mr.entradas as Record<string, number | string>;
            if (e.fonte === 'calculado') {
              const yv = (e.lambda as number) * (e.xLim as number) * (e.d as number), f = (b: number) => (e.sigmaCd as number) * b * yv * ((e.d as number) - yv / 2) * 1000;
              expect(rel(f(e.bw as number), e.MRdN as number)).toBeLessThan(1e-9);
              expect(rel(f(e.intereixo as number), e.MRdM as number)).toBeLessThan(1e-9);
            }
            expect(rel(e.MRdN as number, n.MRdNervura)).toBeLessThan(1e-9);
            expect(rel(e.M as number, -g.esforcos.mNeg[k])).toBeLessThan(1e-9);
            const ad = achar(c, r, tn, 'Armadura negativa necessária'), a = ad.entradas as Record<string, number>;
            expect(rel(Math.max(a.AsFlexao, a.AsMin), a.AsN)).toBeLessThan(1e-9);
            expect(rel(a.AsN, n.AsNec)).toBeLessThan(1e-9);
            const cp = achar(c, r, tn, 'Comprimento do negativo'), w = cp.entradas as Record<string, number>;
            const lbN = w.lbBase * Math.min(1, w.AsN / w.AsEf), auto = Math.min(w.L, arred(Math.max(w.pct * w.L, w.x0 + w.al + lbN), w.arred));
            expect(rel(auto, w.comprimento)).toBeLessThan(1e-9);
            expect(Math.abs(w.comprimentoFinal - n.comprimento)).toBeLessThan(5e-4);
            const dv = tem(c, r, tn, 'Duas parcelas');
            expect(!!dv).toBe((n.parcelas?.length ?? 0) === 2);
            if (dv) {
              const d = dv.entradas as Record<string, number>;
              expect(d.nA).toBe(Math.ceil(n.barras!.n / 2));
              expect(rel(d.AsA, d.nA * barArea(n.barras!.phi))).toBeLessThan(1e-9);
              expect(rel(muT({ sigmaCd: d.sigmaCd, lambda: d.lambda, xLim: d.xLim, bf: d.bw, hf: d.h, bw: d.bw, d: d.d, fyd: d.fyd }, d.AsA), d.MRdA)).toBeLessThan(1e-9);
              expect(rel(Math.min(d.C, arred(Math.max(d.xB + d.al + d.lb, 0.1), d.arred)), d.compB)).toBeLessThan(1e-9);
              expect(Math.abs(d.compB - n.parcelas![1].comprimento)).toBeLessThan(5e-4);
              expect(Math.abs(d.comprimento - n.parcelas![0].comprimento)).toBeLessThan(5e-4);
            }
          }
          const cv = achar(c, r, tc, 'Resistências calculadas'), q = cv.entradas as Record<string, number>;
          const kk = Math.max(1, 1.6 - q.d), rho = Math.min(0.02, q.As1 / (q.bw * q.d)), av1 = Math.min(0.5, 0.7 - q.fck / 200);
          expect(rel(0.25 * q.fctd * kk * (1.2 + 40 * rho) * q.bw * q.d * 1000, q.V1)).toBeLessThan(1e-9);
          expect(rel(0.5 * av1 * q.fcd * q.bw * 0.9 * q.d * 1000, q.V2)).toBeLessThan(1e-9);
          expect(rel(q.V2, g.cortante[k].VRd2)).toBeLessThan(1e-9);
          const vf = achar(c, r, tc, 'Verificação do cortante'), v = vf.entradas as Record<string, number>;
          expect(rel(v.min, Math.min(v.V1, v.V2))).toBeLessThan(1e-9);
          expect(rel(v.V1, g.cortante[k].VRd1)).toBeLessThan(1e-9);
          expect(rel(v.Vsd, g.cortante[k].Vsd) < 1e-9 || v.Vsd === 0).toBe(true);
          const fi = tem(c, r, tc, 'VRd1 da ficha');
          if (fi) {
            const f = fi.entradas as Record<string, number | string>;
            const desc = f.VRd1Desc !== 'n/d' && (f.Mend as number) <= (f.Mdesc as number);
            expect(rel(fi.resultado as number, desc ? (f.VRd1Desc as number) : (f.VRd1Ficha as number))).toBeLessThan(1e-9);
          }
          const ed = tem(c, r, tc, 'Estribo atribuído (φ');
          if (ed) {
            const e = ed.entradas as Record<string, number>;
            const Vc = 0.6 * e.fctd * e.bw * e.d * 1000, Vsw = ((2 * barArea(e.phi)) / e.s) * 0.9 * e.d * e.fywd * 1000;
            expect(rel(Vc, e.Vc)).toBeLessThan(1e-9);
            expect(rel(Vsw, e.Vsw)).toBeLessThan(1e-9);
            expect(rel(Math.max(e.V1pre, Vc) + Vsw, e.V1)).toBeLessThan(1e-9);
          }
          const sh = tem(c, r, tc, 'Vsd > VRd1');
          if (sh) {
            const e = sh.entradas as Record<string, number>;
            expect(rel(0.27 * e.av2 * e.fcd * e.bw * e.d * 1000, e.VRd2)).toBeLessThan(1e-9);
            expect(rel(0.6 * e.fctd * e.bw * e.d * 1000, e.Vc)).toBeLessThan(1e-9);
            expect(rel((0.2 * e.fctm / e.fywk) * e.bw, e.aswMin)).toBeLessThan(1e-9);
            expect(rel(Math.max(e.aswMin, Math.max(0, e.Vsd / 1000 - e.Vc / 1000) / (0.9 * e.d * e.fywd)), e.aswS)).toBeLessThan(1e-9);
            const ct = g.cortante[k].estribo;
            expect(e.phi).toBe(ct?.phi ?? 0);
            expect(e.barras).toBe(ct?.barras ?? 0);
          }
          const mc = achar(c, r, tc, 'Faixa maciçada');
          expect(Math.abs((mc.resultado as number) - g.macico[k])).toBeLessThan(5e-4);
        });
      });
    });

    it(`${c.nome}: montagem sobre escoras, distribuição na capa e quantitativo`, () => {
      for (const r of c.vs) {
        const dist = passosDe(c, r, 'Distribuição na capa'), ad = dist.find((p) => p.descricao.startsWith('Armadura de distribuição'))!, br = dist.find((p) => p.descricao.startsWith('Barras'))!;
        expect(rel(ad.resultado as number, Math.max(0.2 * num(ad, 'AsPrinc'), 0.9, 0.5 * 0.0015 * num(ad, 'hf') * 1e4))).toBeLessThan(1e-9);
        expect(rel(ad.resultado as number, r.distribuicao.AsNec)).toBeLessThan(1e-9);
        expect(Math.max(0.05, Math.min(0.33, Math.floor((num(br, 'AsFi') / num(br, 'AsDist')) * 100 + 1e-9) / 100))).toBe(r.distribuicao.s);
        const tot = passosDe(c, r, 'Quantitativo de aço').find((p) => p.descricao.startsWith('Peso total'))!;
        expect(rel(tot.resultado as number, r.peso)).toBeLessThan(1e-9);
        expect(rel(r.posicoes.reduce((t, q) => t + q.n * q.comprimento * barArea(q.phi) * 7850, 0), r.peso)).toBeLessThan(1e-9);
        const mq = passosDe(c, r, 'Montagem sobre escoras');
        expect(mq.length > 0).toBe(!!r.montagem);
        if (r.montagem) {
          const [a, f] = mq, e = a.entradas as Record<string, number>, ef = f.entradas as Record<string, number>;
          expect(rel(a.resultado as number, (e.pp + e.construcao) * e.intereixo)).toBeLessThan(1e-9);
          expect(rel(f.resultado as number, r.montagem.flecha)).toBeLessThan(1e-9);
          if (e.escoras === 0) expect(rel(f.resultado as number, (5 * ef.q * ef.L ** 4) / (384 * ef.EI))).toBeLessThan(1e-9);
        }
      }
    });
  }

  it('cobertura: tipos, adicional, duas parcelas, serviço, dupla, manual, editada, estribos e atribuída', () => {
    const todos = (c: Caso) => c.vs.flatMap((r) => passosDe(c, r));
    const tem2 = (c: Caso, re: RegExp) => todos(c).some((p) => re.test(p.descricao));
    expect(tem2(A1, /^Tipo da série/)).toBe(true);
    expect(tem2(A2, /^Duas parcelas/)).toBe(true);
    expect(tem2(A5, /^Armadura adicional automática: menor/)).toBe(true);
    expect(tem2(A3, /^Redistribuição/)).toBe(true);
    expect(A3.vs[0].montagem).toBeTruthy();
    expect(tem2(A4, /conjunto de 2 vigotas/)).toBe(true);
    expect(tem2(A4, /Esforços atribuídos pelo usuário/)).toBe(true);
    expect(tem2(A4, /Estribo atribuído \(φ/)).toBe(true);
    expect(tem2(A4, /\(atribuída pelo usuário\)/)).toBe(true);
    expect(tem2(P1, /^Serviço da protensão/)).toBe(true);
    expect(tem2(P1, /^Nível de protensão/)).toBe(true);
    expect(P2.vs[0].protensao?.combinacao).toBe('rara');
    expect(tem2(M1, /^Armadura inferior: primeira combinação/)).toBe(true);
    expect(tem2(M2, /^Vsd > VRd1/)).toBe(true);
    expect(tem2(M3, /^Armadura inferior atribuída/)).toBe(true);
  });
});
