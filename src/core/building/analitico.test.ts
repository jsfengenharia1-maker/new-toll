import { describe, expect, it } from 'vitest';
import { analisarEdificio, malhaLaje } from './analitico';
import { resolver3, type Modelo3, type Caso3 } from '../fe3d';
import { comandosEdificioPadrao, Sessao } from '../commands';
import type { P } from '../geom/faces';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };

/** Edifício de um vão: pilares nos cantos de a × b, vigas centradas nos eixos e laje maciça no grupo Tipo. */
function predio(a = 6, bb = 5, nx = 1, ny = 1) {
  const s = padrao();
  const xs = Array.from({ length: nx + 1 }, (_, i) => (i * a) / nx), ys = Array.from({ length: ny + 1 }, (_, j) => (j * bb) / ny);
  ok(s, 'lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  ok(s, 'lote', { comandos: [...ys.map((y) => v([[0, y], [a, y]])), ...xs.map((x) => v([[x, 0], [x, bb]]))] });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

/** Placa quadrada a × a pela grelha (J = 2I, ν = 0), com faixas de borda; apoiada ou engastada no contorno. */
function placa(sp: number, engastada: boolean) {
  const a = 6, h = 0.15, q = 10, E = 30e6, G = E / 2;
  const mm = malhaLaje([[0, 0], [a, 0], [a, a], [0, a]], 0, sp);
  const nos: [number, number, number][] = [], idx = new Map<string, number>();
  const no = (p: P) => { const k = `${p[0].toFixed(6)}:${p[1].toFixed(6)}`; if (!idx.has(k)) { idx.set(k, nos.length); nos.push([p[0], p[1], 0]); } return idx.get(k)!; };
  const m: Modelo3 = { nos, barras: [], apoios: new Map() };
  const caso: Caso3 = { nodais: [], distribuidas: [] };
  const barra = (i: number, j: number, w: number) => { const I = (w * h ** 3) / 12; m.barras.push({ i, j, E, G, A: w * h, Iz: I, Iy: I, J: 2 * I }); };
  for (const ln of mm.linhas) for (let j = 0; j + 1 < ln.pontos.length; j++) {
    barra(no(ln.pontos[j]), no(ln.pontos[j + 1]), ln.largura);
    caso.distribuidas.push({ barra: m.barras.length - 1, q: [0, 0, -q * ln.largura * 0.5] });
  }
  for (const e of mm.bordas) barra(no(e.a), no(e.z), sp / 2);
  const borda = (p: [number, number, number]) => [p[0], p[1]].some((v) => Math.abs(v) < 1e-9 || Math.abs(v - a) < 1e-9);
  nos.forEach((p, i) => m.apoios.set(i, borda(p) ? (engastada ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 5]) : [0, 1, 5]));
  const r = resolver3(m, [caso]);
  expect(r.erro).toBeUndefined();
  return -r.desloc[0][no([a / 2, a / 2]) * 6 + 2] / ((q * a ** 4) / ((E * h ** 3) / 12));
}

describe('grelha de laje (validação com Timoshenko)', () => {
  it('placa quadrada apoiada: α = 0,00406, erro < 5 % com malha de 50 e de 25 cm', () => {
    for (const sp of [0.5, 0.25]) expect(Math.abs(placa(sp, false) - 0.00406) / 0.00406).toBeLessThan(0.05);
  });
  it('placa quadrada engastada: α = 0,00126, erro < 5 % com malha de 25 cm', () => {
    expect(Math.abs(placa(0.25, true) - 0.00126) / 0.00126).toBeLessThan(0.05);
  });
});

describe('modelo analítico do edifício', () => {
  it('equilíbrio: soma das reações na fundação = cargas (G e Q); simetria', () => {
    const b = predio();
    const an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const soma = (c: 'G' | 'Q') => an.fundacao.filter((f) => f.caso === c).reduce((s, f) => s + f.N, 0);
    expect(soma('G')).toBeCloseTo(an.totais.G, 4);
    expect(soma('Q')).toBeCloseTo(an.totais.Q, 4);
    // Q: 1,5 kN/m² × laje (pelo eixo das vigas, 6 × 5) × 3 pavimentos do grupo Tipo
    expect(an.totais.Q).toBeCloseTo(1.5 * 30 * 3, 6);
    // G: laje 0,12 × 25 + revestimento 1,0; vigas 0,15 × 0,4 × 25 × 22 m; pilares 4 × 0,25² × 25 × 13,5 m
    expect(an.totais.G).toBeCloseTo(3 * ((0.12 * 25 + 1) * 30 + 0.15 * 0.4 * 25 * 22) + 4 * 0.0625 * 25 * 13.5, 6);
    const Ns = an.fundacao.filter((f) => f.caso === 'G').map((f) => f.N);
    for (const n of Ns) expect(n).toBeCloseTo(Ns[0], 3);
    // grelha de cada pavimento do grupo Tipo: reações = cargas
    for (const g of an.grelhas.filter((x) => x.res)) {
      const sr = Object.values(g.reacoes).reduce((s, r) => s + r.G, 0);
      expect(sr).toBeCloseTo(g.carga.G, 4);
    }
    // diafragma em todos os níveis com mais de um nó
    expect(Object.keys(an.portico.mestres)).toHaveLength(5);
  });

  it('vigas pela face e pilares retangulares: modelo monta e equilibra', () => {
    const s = padrao();
    ok(s, 'lote', { comandos: [[0.1, 0.2], [6, 0.2], [6, 5], [0.1, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
    ok(s, 'lote', { comandos: [
      { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0, 0], [6.1, 0]], secao: { b: 0.15, h: 0.5 }, alinhamento: 'dir' } },
      { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[6, 0], [6, 5]], secao: { b: 0.15, h: 0.5 } } },
      { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[6, 5], [0.1, 5]], secao: { b: 0.15, h: 0.5 } } },
      { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0.1, 5], [0.1, 0]], secao: { b: 0.15, h: 0.5 } } },
    ] });
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const soma = an.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(soma).toBeCloseTo(an.totais.G, 3);
  });

  it('porte: 10 pavimentos, 3 × 2 vãos, malha de 50 cm', () => {
    const s = padrao();
    ok(s, 'pavimento.repetir', { id: 'pav_6', vezes: 6 });
    const b0 = s.modelo;
    const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
    ok(s, 'lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
    const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } });
    ok(s, 'lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
    expect(b0.pavimentos.length).toBe(11);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    console.log(`porte: ${an.gdl} gdl, ${an.ms.toFixed(0)} ms`);
    expect(an.ms).toBeLessThan(10000);
  });
});
