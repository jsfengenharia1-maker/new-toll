// Validação externa do bloco com vários pilares (FU8d): modelo sólido no OpenSees (stdBrick elástico, cabeças das estacas apoiadas,
// cargas dos pilares na área de cada um; `validation/opensees/bloco_multi.py` gera o JSON, commitado, fora do npm test).
// Compara as reações das estacas e a força dos tirantes (resultante de tração de σyy no corte y = 0 sob cada pilar) com as bielas e
// tirantes do Statikos (`designCap` com dois pilares sobre 4 estacas). Erros relativos: ver o comentário `ERROS`.
import { describe, expect, it } from 'vitest';
import { designCap } from './caps';
import { blockCoords, defaultFoundationParams } from './piles';
import ref from '../../validation/opensees/bloco_multi.json';

const p = defaultFoundationParams();
const coords = blockCoords(4, 1.2, false);

type Caso = (typeof ref.casos)[keyof typeof ref.casos];
function statikos(c: Caso) {
  const gf = p.gammaF;
  const cols = c.pilares.map((q, i) => ({ label: `P${i + 1}`, x: q.x, y: 0, ap: 0.3, bp: 0.3, Nk: q.N / gf }));
  const Nk = cols.reduce((a, q) => a + q.Nk, 0);
  const My = cols.reduce((a, q) => a + q.Nk * q.x, 0);
  return designCap({ n: 4, coords, D: ref.D, s: 1.2, Nk, Mx: 0, My, ap: 0.3, bp: 0.3, cols, fixed: { lx: ref.lx, ly: ref.ly, h: ref.h } }, p);
}
const rel = (a: number, b: number) => (a - b) / Math.abs(b);

export function comparar(nome: keyof typeof ref.casos) {
  const c = ref.casos[nome], r = statikos(c);
  const Tesq = Math.max(...r.ties.filter((t) => t.dir === 'y' && coords[t.a][0] < 0).map((t) => t.T));
  const Tdir = Math.max(...r.ties.filter((t) => t.dir === 'y' && coords[t.a][0] > 0).map((t) => t.T));
  const fe = { esq: c.corte_y0['x<0'].T, dir: c.corte_y0['x>0'].T };
  return { r, Tesq, Tdir, fe, errEsq: rel(Tesq, fe.esq), errDir: rel(Tdir, fe.dir), R: r.R, Rfe: c.reacoes };
}

/*
 * Erros relativos (Statikos − OpenSees)/OpenSees da força do tirante entre as estacas de cada pilar (OpenSeesPy 3.8.0, stdBrick
 * de 5 cm; 21/10/2026):
 *   simétrico   (800 + 800 kN):   pilar esquerdo +14,3 %   pilar direito +15,8 %     (reações das estacas idênticas: 560 kN)
 *   assimétrico (1000 + 400 kN):  pilar esquerdo +24,7 %   pilar direito +132 %      (todas as estacas com Rmáx = 700 kN no Statikos;
 *                                                          no sólido: 687 kN nas da esquerda e 293 kN nas da direita)
 * O Statikos fica a favor da segurança em todos os casos. No assimétrico a folga vem da regra herdada do bloco de um pilar
 * (momento em módulo: toda estaca com a reação máxima, pilares escalados ao mesmo total); a resultante de tração do corte do
 * sólido é uma medida elástica (depende da malha e de como a tração é separada da compressão: |T| e |C| diferem < 1 %).
 */
describe('bloco com dois pilares sobre 4 estacas × OpenSees (sólido)', () => {
  it('simétrico: cálculo manual (R = 560 kN, T = R·braço/d) e tirante do sólido a favor da segurança em até 20 %', () => {
    const c = ref.casos.simetrico, r = statikos(c);
    // cálculo manual: Nd = 1,4 × 1600 = 2240 kN em 4 estacas → R = 560 kN; biela do pilar à estaca a ap/4 do eixo: braço 0,6 − 0,075 = 0,525 m;
    // h = 0,65 m imposta, d = h − d′ = 0,65 − 0,10 = 0,55 m → T = 560 × 0,525/0,55 = 534,5 kN
    expect(r.h).toBe(0.65);
    expect(r.d).toBeCloseTo(0.55, 9);
    const T = (560 * 0.525) / 0.55;
    const e = comparar('simetrico');
    expect(e.Tesq).toBeCloseTo(T, 6);
    expect(e.Tdir).toBeCloseTo(T, 6);
    // reações das estacas: as do sólido são as do equilíbrio (560 kN) e as do Statikos
    for (let j = 0; j < 4; j++) { expect(e.R[j]).toBeCloseTo(560, 9); expect(Math.abs(e.Rfe[j] / 560 - 1)).toBeLessThan(1e-6); }
    // sólido: a tração do corte y = 0 equilibra a compressão (conferência do modelo) e o Statikos fica acima, até +20 %
    for (const lado of ['x<0', 'x>0'] as const) { const q = c.corte_y0[lado]; expect(Math.abs(q.T + q.C) / q.T).toBeLessThan(0.02); }
    expect(e.errEsq).toBeGreaterThan(0);
    expect(e.errEsq).toBeLessThan(0.2);
    expect(e.errDir).toBeGreaterThan(0);
    expect(e.errDir).toBeLessThan(0.2);
    // tirante em x descarregado no Statikos; no sólido a tração cruzando x = 0 é pequena (< 15 % de T)
    expect(r.ties.filter((t) => t.dir === 'x').every((t) => t.T < 1e-6)).toBe(true);
    const tx = c.corte_x0['y<0'].T + c.corte_x0['y>0'].T;
    expect(tx / (c.corte_y0['x<0'].T + c.corte_y0['x>0'].T)).toBeLessThan(0.15);
  });

  it('assimétrico: reações e tirantes a favor da segurança (momento em módulo: toda estaca com Rmáx); bielas somam 4·Rd', () => {
    const c = ref.casos.assimetrico, r = statikos(c), e = comparar('assimetrico');
    // cálculo manual da regra do Statikos: R = γf·(Nk/n + |My|·|x|/Σx²) = 1,4·(1400/4 + 360·0,6/1,44) = 1,4·(350 + 150) = 700 kN em todas
    for (const v of r.R) expect(v).toBeCloseTo(700, 9);
    expect(r.multi!.struts.reduce((a, q) => a + q.F, 0)).toBeCloseTo(2800, 3);
    // pilares escalados ao mesmo total: 1400·(2800/1960) = 2000 kN e 560·(2800/1960) = 800 kN
    const porPilar = [0, 1].map((i) => r.multi!.struts.filter((q) => q.col === i).reduce((a, q) => a + q.F, 0));
    expect(porPilar[0]).toBeCloseTo(2000, 3);
    expect(porPilar[1]).toBeCloseTo(800, 3);
    // sólido: reações do equilíbrio de corpo rígido (1960/4 ± 210 = 700 e 280 kN, com a rigidez finita do bloco: 687 e 293)
    expect(c.reacoes[0]).toBeCloseTo(687, 0);
    expect(c.reacoes[2]).toBeCloseTo(293, 0);
    expect(c.reacoes.reduce((a, v) => a + v, 0)).toBeCloseTo(1960, 3);
    // Statikos a favor da segurança em cada pilar (T e R)
    expect(Math.max(...r.R)).toBeGreaterThan(Math.max(...c.reacoes));
    expect(e.errEsq).toBeGreaterThan(0.1);
    expect(e.errEsq).toBeLessThan(0.35);
    expect(e.errDir).toBeGreaterThan(0.5);   // pilar pouco carregado: a regra de Rmáx em todas as estacas é muito conservadora
    expect(e.errDir).toBeLessThan(1.5);
  });
});
