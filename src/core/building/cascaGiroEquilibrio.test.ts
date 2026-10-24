// Equilíbrio de momento das cascas (pilar-parede e parede) com a estabilização do giro no plano (correção do `kGiro`, 24/10/2026):
// a mola de giro estava presa ao chão (rigidez nodal absoluta) e tirava ~0,13 % do momento da base do equilíbrio. Agora ela é
// relativa (penaliza θn − ω no elemento) e os modos de corpo rígido (inclusive a rotação em torno da normal) ficam livres.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { rigidezCasca, type Casca3 } from '../casca';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { torcaoRet } from './analitico';
import { geometriaParedes } from './pilarParede';
import { incluirParedes } from './pilarParedeModelo';
import { opcoesEmUso } from './opcoes';

const E = 3e7, nu = 0.2;

function montar(tipo: 'L' | 'parede', malha: number) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 3 });
  const t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id;
  if (tipo === 'L') {
    s.executar('pilarParede.tipo', { vertices: [[0, 0], [3, 0], [3, 2]], esq: 0.1, dir: 0.1 });
    expect(s.executar('pilarParede.inserir', { tipo: s.modelo.tiposPilarParede![0].id, x: 0, y: 0, morre: t1 }).ok).toBe(true);
  } else {
    expect(s.executar('parede.criar', { pontos: [[0, 0], [4, 0]], espessura: 0.2, morre: t1 }).ok).toBe(true);
  }
  const b = s.modelo, geo = geometriaParedes(b, { ...opcoesEmUso(b.opcoes), malhaCasca: malha })!;
  const pm: Modelo3 = { nos: [], barras: [], apoios: new Map() }, casos: Caso3[] = [{ nodais: [], distribuidas: [] }];
  incluirParedes({ b, geo, pm, casosV: casos, noPilar: new Map(), Ec: () => E, Ev: E, Gv: E / 2.4, nu, gama: 0, ret: (bb, h) => ({ A: bb * h, I: (bb * h ** 3) / 12, J: torcaoRet(bb, h) }), peso: () => {}, etiqueta: () => {}, hViga: 0.25, iG: 0 });
  return { pm, casos };
}

/** Resíduo de força e de momento (em torno da origem) de cargas nodais + reações. */
function residuo(pm: Modelo3, casos: Caso3, reacoes: Map<number, ArrayLike<number>>) {
  const soma = (lista: { no: number; f: ArrayLike<number> }[]) => {
    const t = [0, 0, 0, 0, 0, 0];
    for (const { no, f } of lista) {
      const [x, y, z] = pm.nos[no];
      for (let k = 0; k < 6; k++) t[k] += f[k];
      t[3] += y * f[2] - z * f[1]; t[4] += z * f[0] - x * f[2]; t[5] += x * f[1] - y * f[0];
    }
    return t;
  };
  const a = soma(casos.nodais), r = soma([...reacoes].map(([no, f]) => ({ no, f })));
  return { aplicado: a, res: a.map((v, k) => v + r[k]) };
}

// Força lateral no plano + carga vertical excêntrica nos nós do topo (z = 3), a vertical só na metade de x menor.
function carregar(pm: Modelo3, casos: Caso3[], fx: number, fy: number, fz: number) {
  const topo = pm.nos.map((n, i) => [n, i] as const).filter(([n]) => Math.abs(n[2] - 3) < 1e-9).map(([, i]) => i);
  const xs = topo.map((i) => pm.nos[i][0]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  for (const i of topo) {
    const w = 1 / topo.length;
    const exc = pm.nos[i][0] < xmin + 0.5 * (xmax - xmin) ? 2 * fz * w : 0;
    casos[0].nodais.push({ no: i, f: [fx * w, fy * w, exc, 0, 0, 0] });
  }
}

describe('equilíbrio de momento das cascas com a estabilização do giro relativa', () => {
  for (const tipo of ['L', 'parede'] as const) {
    for (const [rot, fx, fy, fz] of [['força lateral em x', 100, 0, 0], ['força lateral em y', 0, 80, 0], ['carga vertical excêntrica', 0, 0, -500], ['lateral + excêntrica', 60, 40, -400]] as const) {
      it(`${tipo === 'L' ? 'pilar-parede em L' : 'parede'}, ${rot}: reações + cargas fecham em força e momento (1e-9)`, () => {
        const { pm, casos } = montar(tipo, 1);
        carregar(pm, casos, fx, fy, fz);
        const r = resolver3(pm, casos);
        expect(r.erro).toBeUndefined();
        const { aplicado, res } = residuo(pm, casos[0], r.reacoes[0]);
        const esc = Math.max(...aplicado.map(Math.abs), 1);
        for (let k = 0; k < 6; k++) expect(Math.abs(res[k]) / esc, `componente ${k}`).toBeLessThan(1e-9);
      });
    }
  }

  it('elemento isolado: resultante de força e momento de K·u é nula para qualquer deslocamento (equilíbrio do elemento)', () => {
    const nos: [number, number, number][] = [[0.2, 0.1, 0.3], [1.3, 0.4, 0.5], [0.5, 1.2, 0.9], [0.75, 0.25, 0.4], [0.9, 0.8, 0.7], [0.35, 0.65, 0.6]];
    const c: Casca3 = { nos: [0, 1, 2, 3, 4, 5], E, nu, h: 0.15 };
    const e = rigidezCasca(nos, c);
    const u = Float64Array.from({ length: 36 }, (_, i) => Math.sin(1.7 * i + 0.3) * 1e-3);
    const f = Array.from({ length: 36 }, (_, a) => Array.from({ length: 36 }, (_, b) => e.K[a * 36 + b] * u[b]).reduce((s, v) => s + v, 0));
    const t = [0, 0, 0, 0, 0, 0];
    nos.forEach(([x, y, z], i) => {
      const g = f.slice(6 * i, 6 * i + 6);
      for (let k = 0; k < 6; k++) t[k] += g[k];
      t[3] += y * g[2] - z * g[1]; t[4] += z * g[0] - x * g[2]; t[5] += x * g[1] - y * g[0];
    });
    const esc = Math.max(...f.map(Math.abs));
    for (let k = 0; k < 6; k++) expect(Math.abs(t[k]) / esc, `componente ${k}`).toBeLessThan(1e-9);
  });
});
