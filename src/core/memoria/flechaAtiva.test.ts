// K1.11.46: flecha ativa das vigas do edifício (NBR 6118, 13.3, Tabela 13.3): passos da memória detalhada refeitos à mão
// com as etapas padrão (alvenaria aos 60 dias) e flechas por vão no resultado.
import { beforeAll, describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import type { PassoMemoria } from './registrador';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}
// ξ(t) da NBR 6118, Tabela 17.1 (t em meses; ∞ = 2)
const xi = (dias: number) => (dias === Infinity ? 2 : 0.68 * 0.996 ** (dias / 30) * (dias / 30) ** 0.32);
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));

let dim: Dimensionamento, mem: MemoriaDetalhada;
beforeAll(() => {
  const b = predio(), an = analisarEdificio(b);
  const r = memoriaDetalhada(b, { an });
  mem = r.memoria; dim = r.dim;
  // memória ligada não altera o resultado (inclui flechasVaos)
  const sem = dimensionarEdificio(b, an, { fundacao: false });
  expect(JSON.stringify(dim.vigas.map((v) => v.flechasVaos))).toBe(JSON.stringify(sem.vigas.map((v) => v.flechasVaos)));
}, 120000);

const tf = 'Flecha (ELS-DEF)';
const ps = (el: string): PassoMemoria[] => mem.passos.filter((p) => p.elemento === el && p.topico === tf);

describe('flecha ativa das vigas (K1.11.46)', () => {
  it('passos da memória refeitos à mão: instantânea após as paredes + diferida desde máx(ti, tp)', () => {
    let n = 0;
    for (const r of dim.vigas) {
      const p = ps(`Viga ${r.nome}`), fa = p.find((x) => x.descricao === 'Flecha ativa');
      if (!fa || !r.flechas) continue;
      n++;
      const inst = p.find((x) => x.descricao.startsWith('Flechas instantâneas por categoria'))!.entradas as Record<string, number>;
      const rho = p.find((x) => x.descricao.startsWith('Coeficiente de fluência'))!.entradas.rho as number;
      const qInst = p.find((x) => x.descricao.startsWith('Flecha instantânea (variável'))!.descricao.includes('inteira') ? inst.q : inst.qqp;
      // etapas padrão: pp 28 d, alvenaria 60 d, revestimento 120 d, ψ2·Q 365 d; paredes aos 60 d
      const tp = 60, den = 1 + 50 * rho;
      const fiA = inst.alvenaria + inst.revestimento + qInst;
      const soma = inst.pp * (2 - xi(tp)) + inst.alvenaria * (2 - xi(60)) + inst.revestimento * (2 - xi(120)) + inst.qqp * (2 - xi(365));
      const fdA = soma / den;
      const pi = p.find((x) => x.descricao.startsWith('Flecha ativa do vão'))!, pd = p.find((x) => x.descricao.startsWith('Flecha diferida da ativa'))!;
      expect(pi.entradas.tp).toBe(tp);
      expect(rel(pi.resultado as number, fiA)).toBeLessThan(1e-9);
      expect(rel(pd.resultado as number, fdA)).toBeLessThan(1e-9);
      expect(rel(fa.resultado as number, fiA + fdA)).toBeLessThan(1e-9);
      expect(rel(fa.resultado as number, r.flechas.ativa)).toBeLessThan(1e-9);
      expect(fa.entradas.limite as number).toBeCloseTo(r.flechas.limites.ativa, 12);
    }
    expect(n).toBeGreaterThan(0);
  });
  it('flechas por vão: o pior de cada tipo é o resumo da viga, a ativa não passa da total e o limite é ℓ/500 e 10 mm', () => {
    for (const r of dim.vigas) {
      const vs = r.flechasVaos!;
      expect(vs.length).toBeGreaterThan(0);
      expect(Math.max(...vs.map((x) => x.total))).toBeCloseTo(r.flecha, 12);
      expect(Math.max(...vs.map((x) => x.ativa))).toBeCloseTo(r.flechas!.ativa, 12);
      for (const x of vs) {
        expect(x.ativa).toBeLessThanOrEqual(x.total + 1e-12);
        expect(x.limites.ativa).toBeCloseTo(Math.min(((x.balanco ? 2 : 1) * x.L) / 500, 0.01), 12);
      }
    }
  });
});
