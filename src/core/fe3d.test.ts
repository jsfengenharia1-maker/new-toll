import { describe, expect, it } from 'vitest';
import { resolver3, type Barra3, type Modelo3 } from './fe3d';

const E = 30e6, G = 12.5e6;
const ret = (b: number, h: number) => ({ A: b * h, Iz: (b * h ** 3) / 12, Iy: (h * b ** 3) / 12, J: 0.229 * h * b ** 3 }); // y local = altura h
const barra = (i: number, j: number, s = ret(0.2, 0.5), x: Partial<Barra3> = {}): Barra3 => ({ i, j, E, G, ...s, ...x });

describe('barras 3D', () => {
  it('balanço: flecha nas duas direções e giro de torção', () => {
    const s = ret(0.2, 0.5), L = 4, P = 10, T = 3;
    const m: Modelo3 = { nos: [[0, 0, 0], [L, 0, 0]], barras: [barra(0, 1, s)], apoios: new Map([[0, [0, 1, 2, 3, 4, 5]]]) };
    const r = resolver3(m, [{ nodais: [{ no: 1, f: [0, 5, -P, T, 0, 0] }], distribuidas: [] }]);
    const u = r.desloc[0];
    expect(u[8]).toBeCloseTo((-P * L ** 3) / (3 * E * s.Iz), 10); // uz: flexão no plano vertical (Iz com y local = Z)
    expect(u[7]).toBeCloseTo((5 * L ** 3) / (3 * E * s.Iy), 10); // uy: flexão lateral
    expect(u[9]).toBeCloseTo((T * L) / (G * s.J), 10);
    const R = r.reacoes[0].get(0)!;
    expect(R[2]).toBeCloseTo(P); expect(R[4]).toBeCloseTo(-P * L); // My = −P·L (P para baixo na ponta x = L)
  });

  it('viga biapoiada (liberações) com carga uniforme: momento qL²/8 e reações qL/2', () => {
    const q = -12, L = 6;
    const m: Modelo3 = { nos: [[0, 0, 0], [L / 2, 0, 0], [L, 0, 0]], barras: [barra(0, 1, undefined, { libI: [4, 5] }), barra(1, 2, undefined, { libJ: [4, 5] })],
      apoios: new Map([[0, [0, 1, 2, 3, 4, 5]], [2, [1, 2, 3, 4, 5]]]) };
    const r = resolver3(m, [{ nodais: [], distribuidas: [{ barra: 0, q: [0, 0, q] }, { barra: 1, q: [0, 0, q] }] }]);
    expect(r.erro).toBeUndefined();
    const f = r.esforcos[0][0];
    expect(f[11]).toBeCloseTo((-q * L * L) / 8, 6); // Mz na ponta j da 1ª barra = momento no meio do vão
    expect(r.reacoes[0].get(0)![2]).toBeCloseTo((-q * L) / 2);
    expect(r.reacoes[0].get(2)![2]).toBeCloseTo((-q * L) / 2);
    expect(f[5]).toBeCloseTo(0, 9); // liberado
  });

  it('trecho rígido: carga na ponta de um braço rígido equivale a força + momento', () => {
    const s = ret(0.3, 0.3), L = 3, P = 20, e = 0.5;
    // pilar em balanço vertical; a carga está num nó a 0,5 m em x, ligado por trecho rígido
    const m: Modelo3 = { nos: [[0, 0, 0], [0, 0, L]], barras: [barra(0, 1, s, { ref: [1, 0, 0] })], apoios: new Map([[0, [0, 1, 2, 3, 4, 5]]]) };
    const r1 = resolver3(m, [{ nodais: [{ no: 1, f: [0, 0, -P, 0, P * e, 0] }], distribuidas: [] }]);
    const m2: Modelo3 = { nos: [[0, 0, 0], [e, 0, L]], barras: [barra(0, 1, s, { ref: [1, 0, 0], offJ: [-e, 0, 0] })], apoios: new Map([[0, [0, 1, 2, 3, 4, 5]]]) };
    const r2 = resolver3(m2, [{ nodais: [{ no: 1, f: [0, 0, -P, 0, 0, 0] }], distribuidas: [] }]);
    expect(r2.reacoes[0].get(0)![4]).toBeCloseTo(r1.reacoes[0].get(0)![4], 9);
    expect(r2.desloc[0][6]).toBeCloseTo(r1.desloc[0][6], 12); // ux do topo do pilar (nó 1 do modelo 1) = ux do nó deslocado (o braço só translada)
  });

  it('diafragma rígido: pórtico de 4 pilares engastados e laje rígida; translação e torção', () => {
    const s = ret(0.3, 0.3), h = 3, H = 40;
    const nos: [number, number, number][] = [];
    const cantos = [[0, 0], [6, 0], [6, 4], [0, 4]];
    for (const [x, y] of cantos) nos.push([x, y, 0]);
    for (const [x, y] of cantos) nos.push([x, y, h]);
    nos.push([3, 2, h]); // mestre no centro
    const barras = cantos.map((_, k) => barra(k, k + 4, s, { ref: [1, 0, 0] }));
    // topo dos pilares sem giro (viga infinitamente rígida à flexão): prende rx e ry do topo
    const apoios = new Map<number, number[]>([...cantos.map((_, k) => [k, [0, 1, 2, 3, 4, 5]] as [number, number[]]), ...cantos.map((_, k) => [k + 4, [2, 3, 4]] as [number, number[]]), [8, [2, 3, 4]]]);
    const m: Modelo3 = { nos, barras, apoios, escravos: cantos.map((_, k) => ({ no: k + 4, mestre: 8 })) };
    const r = resolver3(m, [{ nodais: [{ no: 8, f: [H, 0, 0, 0, 0, 0] }], distribuidas: [] }, { nodais: [{ no: 8, f: [0, 0, 0, 0, 0, 10] }], distribuidas: [] }]);
    const k1 = (12 * E * s.Iz) / h ** 3;
    expect(r.desloc[0][8 * 6]).toBeCloseTo(H / (4 * k1), 10);
    for (let k = 0; k < 4; k++) expect(r.reacoes[0].get(k)![0]).toBeCloseTo(-H / 4, 6);
    // torção: giro θ = Mt / Σ k (x² + y²) (pilares quadrados: kx = ky), mais a rigidez à torção dos pilares
    const kt = 4 * k1 * (3 ** 2 + 2 ** 2) + (4 * G * s.J) / h;
    expect(r.desloc[1][8 * 6 + 5]).toBeCloseTo(10 / kt, 10);
  });

  it('estrutura instável é recusada com o gdl apontado', () => {
    const m: Modelo3 = { nos: [[0, 0, 0], [1, 0, 0]], barras: [barra(0, 1)], apoios: new Map([[0, [0, 1, 2]]]) };
    expect(resolver3(m, [{ nodais: [], distribuidas: [] }]).erro).toMatch(/instável/);
  });
});

describe('cargas concentradas no meio da barra', () => {
  it('força e momento em x = a equivalem a dividir a barra no ponto', () => {
    const s = ret(0.2, 0.5), L = 5, a = 1.7;
    const f = [3, -4, -10, 2, 5, -6];
    const apoios = new Map<number, number[]>([[0, [0, 1, 2, 3, 4, 5]], [2, [0, 1, 2, 3, 4, 5]]]);
    // barra inclinada no espaço para exercitar a rotação
    const d = [L / Math.sqrt(3), L / Math.sqrt(3), L / Math.sqrt(3)];
    const m1: Modelo3 = { nos: [[0, 0, 0], [(d[0] * a) / L, (d[1] * a) / L, (d[2] * a) / L], [d[0], d[1], d[2]]], barras: [barra(0, 1, s), barra(1, 2, s)], apoios };
    const r1 = resolver3(m1, [{ nodais: [{ no: 1, f }], distribuidas: [] }]);
    const m2: Modelo3 = { nos: [[0, 0, 0], [d[0], d[1], d[2]]], barras: [barra(0, 1, s)], apoios: new Map([[0, [0, 1, 2, 3, 4, 5]], [1, [0, 1, 2, 3, 4, 5]]]) };
    const r2 = resolver3(m2, [{ nodais: [], distribuidas: [], pontuais: [{ barra: 0, a, f }] }]);
    for (const [n1, n2] of [[0, 0], [2, 1]]) for (let g = 0; g < 6; g++) expect(r2.reacoes[0].get(n2)![g]).toBeCloseTo(r1.reacoes[0].get(n1)![g], 8);
  });
});
