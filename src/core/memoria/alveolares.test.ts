// Memória detalhada (MD fase 3b): lajes alveolares. As contas são refeitas a partir das `entradas` registradas (envoltória por
// metro com média ponderada nas placas, mínimos e redistribuição, verificação pela ficha, negativos, comprimentos, apoios e
// quantitativos) e comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import type { ResultadoAlveolar } from '../building/alveolaresDim';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { BuildingModel } from '../building/types';
import { barArea } from '../concrete';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import type { PassoMemoria } from './registrador';

type Ok = (n: string, p: Record<string, unknown>) => void;
const ALV = (placa = 'A25-1') => ({ tipo: 'alveolar', ficha: 'ex:alveolar', placa });
const L = 4.8;
interface Opc { Lx?: number; Ly?: number; carga?: number; meio?: boolean; opcoes?: Record<string, number>; antes?: (ok: Ok, s: Sessao) => void; extra?: (ok: Ok, s: Sessao) => void }
/** Pano de `Lx` × `Ly` m (padrão 6 × 4,8: placas em y), vigas 40×200 em pilares 40×40; `meio` = viga e pilares em y = Ly/2 (dois panos). */
function pav(tipo: Record<string, unknown>, o: Opc = {}): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok: Ok = (n, p) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const Lx = o.Lx ?? 6, Ly = o.Ly ?? L, ys = o.meio ? [0, Ly / 2, Ly] : [0, Ly];
  ok('lote', { comandos: ys.flatMap((y) => [0, Lx].map((x) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.4, h: 0.4 } } }))) });
  const vigas = [...ys.map((y) => [[0, y], [Lx, y]]), [[0, 0], [0, Ly]], [[Lx, 0], [Lx, Ly]]];
  ok('lote', { comandos: vigas.map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.4, h: 2 } } })) });
  o.antes?.(ok, s);
  ok('laje.detectarPanos', { grupo: 'g_3', tipo });
  if (o.carga) ok('carga.area', { grupo: 'g_3', caso: 'G', contorno: [[-0.3, -0.3], [Lx + 0.3, -0.3], [Lx + 0.3, Ly + 0.3], [-0.3, Ly + 0.3]], valor: o.carga });
  if (o.opcoes) ok('opcoes.definir', { valores: o.opcoes });
  o.extra?.(ok, s);
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
interface Caso { nome: string; dim: Dimensionamento; dimMem: Dimensionamento; mem: MemoriaDetalhada; rs: ResultadoAlveolar[] }
const CASOS: Caso[] = [];
function caso(nome: string, b: BuildingModel): Caso {
  const an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false }), r = memoriaDetalhada(b, { an });
  const c = { nome, dim, dimMem: r.dim, mem: r.memoria, rs: dim.alveolares ?? [] };
  CASOS.push(c);
  return c;
}
const dois = (placa: string, processo: number, carga = 3, extra?: Opc['extra'], opcoes: Record<string, number> = {}) => pav(ALV(placa), { meio: true, Ly: 2 * L, carga, opcoes: { alveolarProcesso: processo, ...opcoes }, extra });
const A = caso('biapoiada A25-2, serviço e positivo', pav(ALV('A25-2'), { carga: 5 }));
const B = caso('A25-1 insuficiente: escolha da placa', pav(ALV('A25-1'), { carga: 5 }));
const C = caso('dois tramos, processo 0 (escorado)', dois('A25-3', 0));
const D = caso('dois tramos, duas fases com redistribuição', dois('A25-3', 2, 3, undefined, { alveolarRedistribuir: 1, redistribuicao: 15 }));
const E = caso('negativo editado', dois('A25-3', 1, 3, (ok, s) => ok('laje.alveolar', { ids: s.modelo.lajes.map((l) => l.id), negativos: { inicio: { phi: 8, s: 0.2, percentual: 30 }, fim: { phi: 8, s: 0.2, percentual: 30 } } })));
const F = caso('negativo alto: pela seção', dois('A25-3', 0, 9));
const FICHA_CORT = { nome: 'Cortante baixo', placas: [{ id: 'X1', altura: 0.25, capa: 0.05, largura: 1.2, larguraMin: 0.3, apoioMin: 0.07, apoioMax: 0.15, pesoM2: 2.8, positivo: { Mu: 200, Mfis: 100, EI: 20000, EIfis: 9000 }, VRd: 20 }] };
const G = caso('cortante insuficiente', pav({ tipo: 'alveolar', ficha: 'fx', placa: 'X1' }, { carga: 5, antes: (ok) => ok('ficha.alveolar', { acao: 'criar', id: 'fx', ficha: FICHA_CORT }) }));
const H = caso('ficha sem dados do fabricante', pav({ tipo: 'alveolar', ficha: 'cat:alveolar-generica', placa: 'GEN-20' }, { carga: 5 }));
const I = caso('placa de borda cortada', pav(ALV('A25-2'), { Lx: 5.5, carga: 3 }));

const el = (r: ResultadoAlveolar) => `Laje ${r.nome}`;
const passosDe = (c: Caso, r: ResultadoAlveolar, topico?: string | RegExp) => c.mem.passos.filter((p) => p.elemento === el(r) && (!topico || (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico))));
const achar = (c: Caso, r: ResultadoAlveolar, topico: string | RegExp, desc: string): PassoMemoria => { const p = passosDe(c, r, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${String(topico)} / ${desc}`); return p; };
const tem = (c: Caso, r: ResultadoAlveolar, topico: string | RegExp, desc: string) => passosDe(c, r, topico).find((x) => x.descricao.startsWith(desc));
const E_ = (p: PassoMemoria) => p.entradas as Record<string, number>;
const arred = (v: number, cm: number) => Math.ceil(v / (cm / 100) - 1e-9) * (cm / 100);
function media(fs: { t: number; w: number; v: number; ov: number }[], t0: number, t1: number): number {
  let s = 0, w = 0;
  for (const f of fs) { s += f.ov * f.v; w += f.ov; }
  if (w > 1e-9) return s / w;
  return fs.reduce((b, f) => (Math.abs(f.t - (t0 + t1) / 2) < Math.abs(b.t - (t0 + t1) / 2) ? f : b), fs[0]).v;
}
function muT(e: { sigmaCd: number; lambda: number; xLim: number; bf: number; hf: number; bw: number; d: number; fyd: number }, As: number): number {
  const T = As * e.fyd, yLim = e.lambda * e.xLim * e.d;
  let y = T / (e.sigmaCd * e.bf);
  if (y <= e.hf) { y = Math.min(y, yLim); return e.sigmaCd * e.bf * y * (e.d - y / 2) * 1000; }
  const Rcf = e.sigmaCd * (e.bf - e.bw) * e.hf, Rcw = Math.max(0, T - Rcf), yw = Math.min(Rcw / (e.sigmaCd * e.bw), yLim);
  return (Rcf * (e.d - e.hf / 2) + e.sigmaCd * e.bw * yw * (e.d - yw / 2)) * 1000;
}

describe('MD3b: lajes alveolares', () => {
  for (const c of CASOS) {
    it(`${c.nome}: dimensionamento idêntico com a memória ligada, etapas e exportações`, () => {
      expect(c.rs.length).toBeGreaterThan(0);
      expect(c.dimMem.alveolares).toEqual(c.dim.alveolares);
      expect(c.dimMem.lajes).toEqual(c.dim.lajes);
      expect(c.dimMem.vigas).toEqual(c.dim.vigas);
      for (const r of c.rs) {
        const ps = passosDe(c, r);
        expect(ps.length).toBeGreaterThan(14);
        expect(new Set(ps.map((p) => p.etapa)).size).toBeGreaterThanOrEqual(3);
        for (const p of ps) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
        expect(htmlMemoriaCorpo(c.mem)).toContain(el(r));
      }
      expect(csvMemoria(c.mem).length).toBeGreaterThan(1000);
    });

    it(`${c.nome}: placa, cargas, alinhamentos (mínimos e redistribuição), médias nas placas e envoltória`, () => {
      for (const r of c.rs) {
        const pp = achar(c, r, 'Placa e cargas', 'Laje alveolar'), ep = E_(pp);
        expect(rel(ep.ppPlaca + 25 * ep.volume, r.pp)).toBeLessThan(1e-9);
        expect(rel(pp.resultado as number, r.pp)).toBeLessThan(1e-9);
        const q = achar(c, r, 'Placa e cargas', 'Cargas do pano'), eq = E_(q);
        expect(rel(eq.gg * (eq.pp + eq.perm) + eq.gq * eq.var, eq.qELU)).toBeLessThan(1e-9);
        expect(rel(eq.pp + eq.perm + eq.psiS * eq.var, eq.qSrv)).toBeLessThan(1e-9);
        const fx = passosDe(c, r, 'Esforços por metro').filter((p) => p.descricao.startsWith('Alinhamento'));
        expect(fx.length).toBeGreaterThan(0);
        for (const f of fx) {
          const e = E_(f), p = (e.v0 + e.v1) / e.L, m0 = p * e.L * e.L;
          expect(rel(e.divisorPos > 0 ? m0 / e.divisorPos : 0, e.pisoPos) < 1e-9 || e.pisoPos === 0).toBe(true);
          expect(rel(e.divisorNeg > 0 ? -m0 / e.divisorNeg : 0, e.pisoNeg) < 1e-9 || e.pisoNeg === 0).toBe(true);
          expect(rel(Math.max(e.mPosA, e.pisoPos), e.mPosM)).toBeLessThan(1e-9);
          expect(rel(Math.min(e.mNegA0, e.pisoNeg), e.mNegM0)).toBeLessThan(1e-9);
          expect(rel(Math.min(e.mNegA1, e.pisoNeg), e.mNegM1)).toBeLessThan(1e-9);
          if (e.aplicada) {
            expect(rel(Math.max(1 - e.pct / 100, e.deltaMin), e.delta)).toBeLessThan(1e-9);
            const m = [e.mNegM0, e.mNegM1], cont = [e.cont0, e.cont1];
            const dm = m.reduce((t, v, k) => t + (cont[k] && v < -1e-9 ? -v * (1 - e.delta) : 0), 0);
            expect(rel(e.mPosM + dm / 2, e.mPos)).toBeLessThan(1e-9);
            expect(rel(m[0] * (cont[0] && m[0] < -1e-9 ? e.delta : 1), e.mNeg0) < 1e-9 || e.mNeg0 === 0).toBe(true);
          } else { expect(e.mPos).toBe(e.mPosM); expect(e.mNeg0).toBe(e.mNegM0); expect(e.mNeg1).toBe(e.mNegM1); }
        }
        const pls = passosDe(c, r, 'Esforços por metro').filter((p) => p.descricao.startsWith('Placa '));
        expect(pls.length).toBe(r.placas.length);
        pls.forEach((pl) => {
          const e = E_(pl);
          for (const id of ['mPos', 'mNeg0', 'mNeg1', 'v0', 'v1', 'mEnd0', 'mEnd1']) {
            const fs = [...Array(e.n).keys()].map((i) => ({ t: e[`t_${i}`], w: e[`w_${i}`], v: e[`${id}_${i}`], ov: e[`ov_${i}`] }));
            fs.forEach((f) => expect(rel(f.ov, Math.max(0, Math.min(e.t1, f.t + f.w / 2) - Math.max(e.t0, f.t - f.w / 2))) < 1e-9 || f.ov === 0).toBe(true));
            expect(rel(media(fs, e.t0, e.t1), e[`r_${id}`]) < 1e-9 || Math.abs(e[`r_${id}`]) < 1e-12).toBe(true);
          }
          const fsS = [...Array(e.nS).keys()].map((i) => ({ t: e[`tS_${i}`], w: e[`wS_${i}`], v: e[`ms_${i}`], ov: e[`ovS_${i}`] }));
          expect(rel(media(fsS, e.t0, e.t1), e.ms) < 1e-9 || Math.abs(e.ms) < 1e-12).toBe(true);
        });
        const env = achar(c, r, 'Esforços por metro', 'Envoltória do pano'), ee = E_(env), n = ee.nPlacas;
        const col = (k: string) => [...Array(n).keys()].map((i) => ee[`${k}_${i}`]);
        expect(ee.mPos).toBe(Math.max(...col('pmPos')));
        expect(ee.mNeg0).toBe(Math.min(...col('pmNeg0')));
        expect(ee.v0).toBe(Math.max(...col('pv0')));
        expect(ee.Ms).toBe(Math.max(...col('pms')));
        expect(rel(ee.mPos, r.envoltoria.mPos)).toBeLessThan(1e-9);
        expect(rel(ee.mNeg0, r.envoltoria.mNeg[0])).toBeLessThan(1e-9);
        expect(rel(ee.v1, r.envoltoria.v[1])).toBeLessThan(1e-9);
      }
    });

    it(`${c.nome}: flexão, serviço, negativos, cortante, escolha, apoios, capa e quantitativo`, () => {
      for (const r of c.rs) {
        const dem = achar(c, r, 'Flexão positiva e serviço', 'Demanda da placa'), d = E_(dem);
        expect(rel(d.mPos * d.ratioELU, d.dMPos)).toBeLessThan(1e-9);
        expect(rel(d.ms * d.ratioServico, d.dMs)).toBeLessThan(1e-9);
        expect(rel(d.dMPos, r.positivo.Md)).toBeLessThan(1e-9);
        const fl = tem(c, r, 'Flexão positiva e serviço', 'Flexão positiva');
        expect(!!fl).toBe(r.positivo.Mu !== null);
        if (fl) { const e = E_(fl); expect(rel(fl.resultado as number, e.Md / e.Mu)).toBeLessThan(1e-9); expect(rel(e.Mu, r.positivo.Mu!)).toBeLessThan(1e-9); expect(e.ok === 1).toBe(e.Md <= e.Mu + 1e-9); }
        const sv = tem(c, r, 'Flexão positiva e serviço', 'Serviço da protensão');
        expect(!!sv).toBe(!!r.servico);
        if (sv && r.servico) {
          const e = sv.entradas as Record<string, number | string>;
          expect(rel(e.Ms as number, r.servico.Ms)).toBeLessThan(1e-9);
          if (e.Madm !== 'n/d') { expect(rel(e.Madm as number, r.servico.Madm!)).toBeLessThan(1e-9); expect(e.ok === 1).toBe((e.Ms as number) <= (e.Madm as number) + 1e-9); }
        }
        for (const k of [0, 1] as const) {
          const t = `Ponta ${k ? 'final' : 'inicial'}`, n = r.negativos[k];
          const cv = achar(c, r, t, 'Cortante resistente da flexão positiva'), e = cv.entradas as Record<string, number | string>;
          const desc = e.VRd !== 'n/d' && e.VRdDesc !== 'n/d' && e.Mdesc !== 'n/d' && (e.mEnd as number) <= (e.Mdesc as number) + 1e-9;
          expect(e.VRdPos).toBe(desc ? e.VRdDesc : e.VRd);
          const semNeg = !!tem(c, r, t, 'Sem negativo de cálculo');
          expect(semNeg).toBe(!n && !tem(c, r, t, 'Momento negativo de cálculo'));
          if (n) {
            const m = achar(c, r, t, 'Momento negativo de cálculo');
            expect(rel(m.resultado as number, -(k ? r.envoltoria.mNeg[1] : r.envoltoria.mNeg[0]))).toBeLessThan(1e-9);
            const li = tem(c, r, t, 'Linhas de armadura negativa'), ed = tem(c, r, t, 'Negativo atribuído'), se = tem(c, r, t, 'Armadura negativa:') ?? tem(c, r, t, 'Flexão exige');
            expect(Number(!!li) + Number(!!ed) + Number(!!se)).toBe(1);
            if (li) {
              const q = E_(li), Md = q.M;
              const ok = (i: number) => q[`Mu_${i}`] >= Md - 1e-9 && (q[`VRd_${i}`] === ('n/d' as unknown as number) || q[`VRd_${i}`] >= q.Vd - 1e-9);
              let idx = [...Array(q.n).keys()].find(ok);
              if (idx === undefined) idx = [...Array(q.n).keys()].find((i) => q[`Mu_${i}`] >= Md - 1e-9);
              expect(q.phi).toBe(q[`phi_${idx}`]);
              expect(q.s).toBe(q[`s_${idx}`]);
              expect(q.Mu).toBe(q[`Mu_${idx}`]);
              expect(n.fonte).toBe('ficha');
              expect(n.phi).toBe(q.phi);
            }
            if (ed) { expect(n.fonte).toBe('editado'); expect(E_(ed).ok === 1).toBe(n.ok); }
            if (se) {
              expect(n.fonte).toBe('secao');
              const q = se.entradas as Record<string, number | string>;
              if (q.AsFlexao !== 'n/d') {
                expect(rel(Math.max(q.AsFlexao as number, q.AsMin as number), q.alvo as number)).toBeLessThan(1e-9);
                expect(rel(0.0015 * (q.capa as number), q.AsMin as number)).toBeLessThan(1e-9);
                if (q.phi) {
                  expect(rel((Math.PI * (q.phi as number) ** 2) / 4e6 / (q.s as number), q.AsAdotada as number)).toBeLessThan(1e-9);
                  expect(q.AsAdotada as number).toBeGreaterThanOrEqual((q.alvo as number) - 1e-12);
                  const mu = achar(c, r, t, 'Momento último do negativo'), em = E_(mu);
                  expect(rel(muT({ sigmaCd: em.sigmaCd, lambda: em.lambda, xLim: em.xLim, bf: em.bf, hf: em.hf, bw: em.bw, d: em.d, fyd: em.fyd }, em.As), em.Mu)).toBeLessThan(1e-9);
                  expect(rel(em.Mu, n.Mu)).toBeLessThan(1e-9);
                }
              }
            }
            const cp = achar(c, r, t, 'Comprimento do negativo'), w = E_(cp);
            expect(rel(Math.min(w.Lk, arred(Math.max(w.pct * w.Lk, w.x0 + w.al + w.lb), w.arred)), w.auto)).toBeLessThan(1e-9);
            expect(rel(w.al, w.decalagem * w.d)).toBeLessThan(1e-9);
            expect(w.barras).toBe(w.s ? Math.ceil(w.B / w.s - 1e-6) : 0);
            expect(Math.abs(w.final - n.comprimento)).toBeLessThan(5e-4);
            expect(w.barras).toBe(n.barras);
            const nc = achar(c, r, t, 'Cortante na flexão negativa'), eC = E_(nc);
            expect(eC.ok === 1).toBe(r.cortante[k].ok);
            expect(rel(eC.Vd, r.cortante[k].Vd)).toBeLessThan(1e-9);
          } else {
            const sn = achar(c, r, t, 'Sem negativo de cálculo');
            expect(E_(sn).ok === 1).toBe(r.cortante[k].ok);
          }
        }
        const ec = achar(c, r, 'Escolha da placa', 'Placas da ficha'), e = ec.entradas as Record<string, number | string>;
        expect(e.n).toBe(r.candidatas.length);
        r.candidatas.forEach((q, i) => { expect(e[`placa_${i}`]).toBe(q.placa); expect(e[`adequada_${i}`]).toBe(q.adequada ? 1 : 0); expect(e[`escolhida_${i}`]).toBe(q.escolhida ? 1 : 0); });
        expect(ec.resultado).toBe(r.placaEscolhida ?? 'nenhuma');
        // apoios e comprimentos das peças
        const apoios = passosDe(c, r, 'Placas e apoios').filter((p) => p.descricao.startsWith('Placa '));
        expect(apoios.length).toBe(r.placas.length);
        apoios.forEach((ap, i) => {
          const q = E_(ap), pl = r.placas[i];
          expect(rel(Math.ceil((q.Lmax - q.bI / 2 - q.bF / 2 + q.adotI + q.adotF) * 100 - 1e-9) / 100, q.comprimento)).toBeLessThan(1e-9);
          expect(q.comprimento).toBe(pl.comprimento);
          const disp = (b: number, comp: number) => (b > 0 ? (comp ? b / 2 - q.junta / 2 : b - 0.02) : null);
          const dI = disp(q.bI, q.compI), dF = disp(q.bF, q.compF);
          expect(dI === null ? 'n/d' : dI).toBeCloseTo(q.dispI === ('n/d' as unknown as number) ? 'n/d' as never : q.dispI, 12);
          expect(dF === null ? 'n/d' : dF).toBeCloseTo(q.dispF === ('n/d' as unknown as number) ? 'n/d' as never : q.dispF, 12);
          const ad = (d: number | null) => (d === null ? q.apoioMin : Math.max(0, Math.min(q.apoioMax, d)));
          expect(ad(dI)).toBeCloseTo(q.adotI, 12);
          expect(ad(dF)).toBeCloseTo(q.adotF, 12);
          expect(q.adotI).toBe(pl.apoios[0].adotado);
        });
        const cap = achar(c, r, 'Capa', 'Capa de concreto'), eCap = E_(cap);
        expect(rel(eCap.rhoMin * eCap.espessura * 1e4, r.capaVerificacao.AsMinTela)).toBeLessThan(1e-9);
        expect((eCap.ok === 1)).toBe(r.capaVerificacao.ok);
        const qt = achar(c, r, 'Quantitativo', 'Placas do pano'), eQ = E_(qt);
        expect(rel(eQ.areaPlacas * eQ.pesoM2, eQ.pesoPlacas)).toBeLessThan(1e-9);
        expect(rel(eQ.areaPano * eQ.volume, eQ.concretoLocal)).toBeLessThan(1e-9);
        expect(rel(eQ.pesoPlacas, r.quantitativo.pesoPlacas)).toBeLessThan(1e-9);
        expect(rel(eQ.concretoLocal, r.quantitativo.concretoLocal)).toBeLessThan(1e-9);
        expect(eQ.n).toBe(r.quantitativo.numeroPlacas);
        passosDe(c, r, 'Quantitativo').filter((p) => p.descricao.startsWith('Aço dos negativos')).forEach((p, i) => {
          const q = E_(p);
          expect(rel(q.comprimento * barArea(q.phi) * 7850, q.peso)).toBeLessThan(1e-9);
          expect(rel(q.peso, r.quantitativo.negativos[i].peso)).toBeLessThan(1e-9);
        });
      }
    });
  }

  it('cobertura: ficha, edição, seção, redistribuição, duas fases, cortante, cortada, sem dados', () => {
    const tem2 = (c: Caso, re: RegExp) => c.rs.some((r) => passosDe(c, r).some((p) => re.test(p.descricao)));
    expect(tem2(A, /^Serviço da protensão/)).toBe(true);
    expect(tem2(B, /^Placas da ficha/)).toBe(true);
    expect(B.rs[0].trocar).toBe(true);
    expect(tem2(C, /^Linhas de armadura negativa/)).toBe(true);
    expect(D.rs[0].processo).toBe(2);
    expect(tem2(D, /logo|fase 1/)).toBe(true);
    expect(tem2(D, /redistribuição/)).toBe(true);
    expect(tem2(E, /^Negativo atribuído/)).toBe(true);
    expect(tem2(F, /^Armadura negativa:/)).toBe(true);
    expect(G.rs[0].cortante[0].ok).toBe(false);
    expect(tem2(H, /^A ficha da placa não informa/)).toBe(true);
    expect(I.rs[0].placas.some((p) => p.cortada)).toBe(true);
  });
});
