// Memória detalhada (MD fase 3): vigotas das lajes treliçadas. As contas são refeitas a partir das `entradas` registradas e
// comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado.
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

/** Pavimento com lajes treliçadas entre vigas 15×45 em pilares 25×25 (vãos em x; 5 m em y; vigotas em x). */
function trelicadas(vaos: number[], opcoes?: Record<string, number>, q?: number): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
  if (q !== undefined) ok('grupo.editar', { id: 'g_3', q });
  if (opcoes) ok('opcoes.definir', { valores: opcoes });
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
interface Caso { nome: string; dim: Dimensionamento; dimMem: Dimensionamento; mem: MemoriaDetalhada; vs: ResultadoVigotas[] }
const CASOS: Caso[] = [];
function caso(nome: string, b: BuildingModel): Caso {
  const an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false }), r = memoriaDetalhada(b, { an });
  const c = { nome, dim, dimMem: r.dim, mem: r.memoria, vs: dim.vigotas ?? [] };
  CASOS.push(c);
  return c;
}
const A = caso('padrão, um vão', trelicadas([4.5]));
const B = caso('contínuas, redistribuição e montagem com escoras', trelicadas([4, 4, 4], { vigotaRedistribuir: 1, redistribuicao: 15, vigotaMontagem: 1, vigotaEscoraDist: 1.2 }));
const C = caso('montagem sem escora e carga alta', trelicadas([3.2], { vigotaMontagem: 1, vigotaEscoraDist: 0, vigotaMontagemLimite: 250 }, 6));

const passosDe = (c: Caso, r: ResultadoVigotas, topico?: string | RegExp) => c.mem.passos.filter((p) => p.elemento === `Laje ${r.nome}` && (!topico || (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico))));
const achar = (c: Caso, r: ResultadoVigotas, topico: string | RegExp, desc: string): PassoMemoria => { const p = passosDe(c, r, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${String(topico)} / ${desc}`); return p; };
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;

describe('MD3: vigotas treliçadas', () => {
  for (const c of CASOS) {
    it(`${c.nome}: dimensionamento idêntico com a memória ligada, etapas e exportações`, () => {
      expect(c.vs.length).toBeGreaterThan(0);
      expect(c.dimMem.vigotas).toEqual(c.dim.vigotas);
      expect(c.dimMem.lajes).toEqual(c.dim.lajes);
      expect(c.dimMem.vigas).toEqual(c.dim.vigas);
      for (const r of c.vs) {
        const ps = passosDe(c, r);
        expect(ps.length).toBeGreaterThan(40);
        expect(new Set(ps.map((p) => p.etapa))).toEqual(new Set(['cargas', 'esforcos', 'dimensionamento', 'detalhamento']));
        for (const p of ps) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
        expect(htmlMemoriaCorpo(c.mem)).toContain(`Laje ${r.nome}`);
      }
      expect(csvMemoria(c.mem).length).toBeGreaterThan(1000);
    });

    it(`${c.nome}: treliça, capa mínima, mínimos, flexão em T, adicional e comprimento`, () => {
      for (const r of c.vs) {
        const cm = achar(c, r, 'Geometria e treliça', 'Capa mínima');
        expect(rel(cm.resultado as number, Math.max(0.04, (num(cm, 'intereixo') - num(cm, 'bw')) / 15))).toBeLessThan(1e-9);
        expect(rel(cm.resultado as number, r.verificacaoCapa.minima)).toBeLessThan(1e-9);
        const tr = achar(c, r, 'Geometria e treliça', 'Banzo inferior');
        const AsB = 2 * barArea(num(tr, 'phi')) * 1e4;
        expect(rel(AsB, r.banzoInf.As)).toBeLessThan(1e-9);
        const AsTrel = AsB * (num(tr, 'fyd60') / num(tr, 'fydInf'));
        expect(rel(tr.resultado as number, AsTrel)).toBeLessThan(1e-9);
        expect(rel(num(tr, 'fyd60'), 600 / num(tr, 'gs'))).toBeLessThan(1e-9);
        const am = achar(c, r, 'Geometria e treliça', 'Armadura mínima por nervura');
        const AsMin = num(am, 'rhoMin') * (num(am, 'intereixo') * num(am, 'capa') + num(am, 'bw') * num(am, 'hEnch')) * 1e4;
        expect(rel(am.resultado as number, AsMin)).toBeLessThan(1e-9);
        r.grupos.forEach((g, gi) => {
          const tp = `Grupo ${gi + 1} – flexão positiva`, nec = achar(c, r, tp, 'Armadura necessária por nervura');
          const AsNec = Math.max(num(nec, 'AsFlexao'), num(nec, 'M') > 0 ? num(nec, 'AsMin') : 0);
          expect(rel(num(nec, 'AsNec'), AsNec)).toBeLessThan(1e-9);
          expect(rel(AsNec, g.positiva.AsNec)).toBeLessThan(1e-9);
          expect(rel(nec.resultado as number, Math.max(0, AsNec - num(nec, 'AsTrel')))).toBeLessThan(1e-9);
          expect(rel(nec.resultado as number, g.positiva.AsAdicional) < 1e-9 || g.positiva.AsAdicional === 0).toBe(true);
          expect(rel(num(nec, 'M'), g.esforcos.mPos)).toBeLessThan(1e-9);
          // linha neutra na seção T (mesa ou alma)
          const ln = passosDe(c, r, tp).find((p) => p.descricao.startsWith('Linha neutra'));
          if (ln) {
            const s = num(ln, 'sigmaCd'), bf = num(ln, 'b'), lam = num(ln, 'lambda'), d = num(ln, 'd'), x = ln.resultado as number, hf = num(ln, 'hf'), bw = num(ln, 'bw');
            const tee = lam * x > hf, C_ = tee ? s * ((bf - bw) * hf + bw * lam * x) : s * bf * lam * x;
            const z = tee ? (s * (bf - bw) * hf * hf / 2 + s * bw * lam * x * lam * x / 2) / C_ : lam * x / 2;
            expect(rel(C_ * (d - z) * 1000, num(ln, 'Md')), 'equilíbrio').toBeLessThan(1e-7);
          }
          const ad = passosDe(c, r, tp).find((p) => p.descricao.includes('adotada') || p.descricao.includes('bloqueada'))!;
          expect(num(ad, 'n')).toBe(g.positiva.barras?.n ?? 0);
          expect(rel(num(ad, 'comprimento'), g.positiva.comprimento)).toBeLessThan(1e-9);
          if (g.positiva.barras?.n) expect(rel(ad.resultado as number, g.positiva.barras.n * barArea(g.positiva.barras.phi) * 1e4)).toBeLessThan(1e-9);
        });
      }
    });

    it(`${c.nome}: redistribuição, negativos, cortante e maciçamento`, () => {
      let nNeg = 0;
      for (const r of c.vs) r.grupos.forEach((g, gi) => {
        const red = passosDe(c, r, `Grupo ${gi + 1} – esforços`).find((p) => p.descricao.startsWith('Redistribuição'));
        if (red) {
          const delta = Math.max(1 - num(red, 'pct') / 100, num(red, 'deltaMin'));
          expect(rel(num(red, 'delta'), delta)).toBeLessThan(1e-9);
          const m = [num(red, 'mNeg0'), num(red, 'mNeg1')], cont = [num(red, 'cont0'), num(red, 'cont1')];
          const dm = m.reduce((t, v, k) => t + (cont[k] && v < -1e-9 ? -v * (1 - delta) : 0), 0);
          expect(rel(red.resultado as number, num(red, 'mPos') + dm / 2)).toBeLessThan(1e-9);
          expect(rel(red.resultado as number, g.esforcos.mPos)).toBeLessThan(1e-9);
        }
        [0, 1].forEach((k) => {
          const n = g.negativos[k], pt = k ? 'final' : 'inicial';
          if (n) {
            nNeg++;
            const tp = `Grupo ${gi + 1} – negativo na ponta ${pt}`, mr = achar(c, r, tp, 'Momentos resistentes');
            const yv = num(mr, 'lambda') * num(mr, 'xLim') * num(mr, 'd'), mrd = (b: number) => num(mr, 'sigmaCd') * b * yv * (num(mr, 'd') - yv / 2) * 1000;
            expect(rel(mrd(num(mr, 'bw')), num(mr, 'MRdN'))).toBeLessThan(1e-9);
            expect(rel(mrd(num(mr, 'intereixo')), num(mr, 'MRdM'))).toBeLessThan(1e-9);
            expect(rel(num(mr, 'MRdN'), n.MRdNervura)).toBeLessThan(1e-9);
            expect(rel(num(mr, 'M'), -g.esforcos.mNeg[k])).toBeLessThan(1e-9);
            const cp = achar(c, r, tp, 'Comprimento do negativo'), e = cp.entradas as Record<string, number>;
            const lb = Math.max(e.lbBase * (e.AsEf > 0 ? Math.min(1, e.AsN / e.AsEf) : 1), 0.3 * e.lbBase, (10 * e.phi) / 1000, 0.1);
            const arred = (v: number, cm: number) => Math.ceil(v / (cm / 100) - 1e-9) * (cm / 100);
            expect(rel(Math.min(e.L, arred(Math.max(e.pct * e.L, e.x0 + e.al + lb), e.arred)), e.comprimento)).toBeLessThan(1e-9);
            expect(Math.abs(e.comprimento - n.comprimento)).toBeLessThan(5e-4);
            expect(Math.abs(e.x0 - n.x0)).toBeLessThan(5e-4);
          }
          const tc = `Grupo ${gi + 1} – cortante na ponta ${pt}`, cv = achar(c, r, tc, 'Resistências por nervura'), q = cv.entradas as Record<string, number>;
          const kk = Math.max(1, 1.6 - q.d), rho = Math.min(0.02, q.As1 / (q.bw * q.d)), av1 = Math.min(0.5, 0.7 - q.fck / 200);
          expect(rel(0.25 * q.fctd * kk * (1.2 + 40 * rho) * q.bw * q.d * 1000, q.V1)).toBeLessThan(1e-9);
          expect(rel(0.5 * av1 * q.fcd * q.bw * 0.9 * q.d * 1000, q.V2)).toBeLessThan(1e-9);
          expect(rel(q.V1, g.cortante[k].VRd1)).toBeLessThan(1e-9);
          expect(rel(q.V2, g.cortante[k].VRd2)).toBeLessThan(1e-9);
          expect(rel(q.Vsd, g.cortante[k].Vsd) < 1e-9 || q.Vsd === 0).toBe(true);
          const mc = achar(c, r, tc, 'Faixa maciçada');
          expect(rel(mc.resultado as number, Math.max(num(mc, 'flexao'), num(mc, 'cortante')))).toBeLessThan(1e-9);
          expect(Math.abs((mc.resultado as number) - g.macico[k])).toBeLessThan(5e-4);
        });
      });
      expect(nNeg).toBeGreaterThan(0);
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
          expect(rel(a.resultado as number, r.montagem.q)).toBeLessThan(1e-9);
          expect(e.escoras).toBe(e.dist > 0 && e.L > e.dist + 1e-9 ? Math.ceil(e.L / e.dist - 1e-9) - 1 : 0);
          expect(rel(e.vao, e.L / (e.escoras + 1))).toBeLessThan(1e-9);
          expect(rel(ef.limite, ef.vao / ef.divisor)).toBeLessThan(1e-9);
          expect(rel(f.resultado as number, r.montagem.flecha)).toBeLessThan(1e-9);
          // solução analítica da viga biapoiada sem escora: f = 5·q·L⁴/(384·EI)
          if (e.escoras === 0) expect(rel(f.resultado as number, (5 * ef.q * ef.L ** 4) / (384 * ef.EI))).toBeLessThan(1e-9);
        }
      }
    });
  }

  it('cobertura: redistribuição, montagem com e sem escora, linha neutra na mesa', () => {
    expect(passosDe(B, B.vs[0], /esforços/).some((p) => p.descricao.startsWith('Redistribuição'))).toBe(true);
    expect(B.vs[0].montagem!.escoras).toBeGreaterThan(0);
    expect(C.vs[0].montagem!.escoras).toBe(0);
    expect(passosDe(A, A.vs[0], /flexão positiva/).some((p) => p.descricao.startsWith('Linha neutra') && num(p, 'lambda') * (p.resultado as number) <= num(p, 'hf'))).toBe(true);
  });
});
