// Estabilidade e equilíbrio dos modelos em que barras se ligam a cascas (24/10/2026). Com o giro no plano das cascas
// estabilizado de forma relativa (kGiro: γ·∫(θn − ω)², sem mola ao chão), o gdl de giro no plano de um nó de casca sem
// barra tem rigidez pequena (≈ γ·A/30) mas não é mecanismo: o pivô quase não cai em relação à diagonal. O critério de
// pivô nulo absoluto (1e-11 da maior diagonal) o reprovava quando havia ligações rígidas por penalidade no modelo
// (lado curto do pilar-parede em barra: maior diagonal 1,2e13 → tolerância 119 > pivô 104 do canto livre da parede).
// `pivoNulo` (math.ts) exige também perda de dígitos em relação à diagonal original da linha.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { BandLDL, pivoNulo } from '../math';
import { SparseLDL } from '../sparseldl';
import { analisarEdificio } from './analitico';
import type { BuildingModel } from './types';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const nomePav = (b: BuildingModel, nome: string) => b.pavimentos.find((p) => p.nome === nome)!.id;

function padrao(opcoes: Record<string, unknown> = {}): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('obra.definir', { profundidadeFundacao: 1 });
  for (const n of ['Cobertura', 'Tipo 3', 'Tipo 2']) s.executar('pavimento.remover', { id: s.modelo.pavimentos.find((p) => p.nome === n)!.id });
  ok(s, 'fundacao.terreno', { sigmaAdm: 300 });
  if (Object.keys(opcoes).length) ok(s, 'opcoes.definir', { valores: opcoes });
  return s;
}

function pp(s: Sessao, vertices: number[][], extra: Record<string, unknown> = {}) {
  ok(s, 'pilarParede.tipo', { nome: 'PP', vertices, esq: 0.1, dir: 0.1 });
  ok(s, 'pilarParede.inserir', { tipo: s.modelo.tiposPilarParede!.at(-1)!.id, x: 0, y: 0, angulo: 0, morre: nomePav(s.modelo, 'Tipo 1'), ...extra });
}

/**
 * Análise do edifício sem erro e, no pórtico montado (cascas, barras, ligações rígidas, molas, diafragma), um caso só
 * com forças nodais nos nós do nível mais alto (horizontal em x e y e vertical excêntrica): resíduo de força e de momento
 * (em torno da origem) de cargas + reações dos apoios + forças das molas (−k·u), relativo à maior carga aplicada.
 */
function residuoGlobal(b: BuildingModel) {
  const an = analisarEdificio(b);
  expect(an.erro).toBeUndefined();
  const md: Modelo3 = an.portico.modelo;
  const zmax = Math.max(...md.nos.map((n) => n[2]));
  const mestres = new Set(Object.values(an.portico.mestres));
  const topo = md.nos.map((n, i) => [n, i] as const).filter(([n, i]) => Math.abs(n[2] - zmax) < 1e-9 && !mestres.has(i)).map(([, i]) => i);
  expect(topo.length).toBeGreaterThan(1);
  const xs = topo.map((i) => md.nos[i][0]), xm = (Math.min(...xs) + Math.max(...xs)) / 2, n = topo.length;
  const caso: Caso3 = { nodais: topo.map((i) => ({ no: i, f: [60 / n, 40 / n, (md.nos[i][0] <= xm ? -400 : -50) / n, 0, 0, 0] })), distribuidas: [] };
  const r = resolver3(md, [caso]);
  expect(r.erro).toBeUndefined();
  const t = [0, 0, 0, 0, 0, 0], ap = [0, 0, 0, 0, 0, 0];
  const somar = (no: number, f: ArrayLike<number>, acc: number[]) => {
    const [x, y, z] = md.nos[no];
    for (let k = 0; k < 6; k++) acc[k] += f[k];
    acc[3] += y * f[2] - z * f[1]; acc[4] += z * f[0] - x * f[2]; acc[5] += x * f[1] - y * f[0];
  };
  for (const c of caso.nodais) { somar(c.no, c.f, t); somar(c.no, c.f, ap); }
  for (const [no, f] of r.reacoes[0]) somar(no, f, t);
  // as reações de `resolver3` nos gdl com mola não incluem a força da mola (convenção de corridaParede.ts): −k·u
  for (const m of md.molas ?? []) { const f = [0, 0, 0, 0, 0, 0]; f[m.gdl] = -m.k * r.desloc[0][m.no * 6 + m.gdl]; somar(m.no, f, t); }
  const esc = Math.max(...ap.map(Math.abs));
  return { rel: t.map((v) => Math.abs(v) / esc), an };
}

describe('pivô nulo: mecanismo × gdl de rigidez pequena (critério com perda de dígitos)', () => {
  it('pivoNulo: zero e cancelamento são nulos; pivô ≈ diagonal original não é, mesmo abaixo de 1e-11 da escala', () => {
    const tol = 1e-11 * 1.2e13;
    expect(pivoNulo(0, 0, tol)).toBe(true);
    expect(pivoNulo(1e-3, 107, tol)).toBe(true); // perdeu 5 dígitos e está abaixo da tolerância
    expect(pivoNulo(103.85, 107.35, tol)).toBe(false); // giro no plano do canto livre da parede (caso do pilar-parede em L)
    expect(pivoNulo(1e-6, 1e-6, tol)).toBe(true); // nível de arredondamento da escala (< 1e-16 · 1,2e13)
    expect(pivoNulo(200, 1e13, tol)).toBe(false); // acima da tolerância: critério antigo, passa
  });

  for (const [nome, fat] of [['banda', (n: number, f: (set: (i: number, j: number, v: number) => void) => void, sc: number) => new BandLDL(n, n, f, sc)], ['esparsa', (n: number, f: (set: (i: number, j: number, v: number) => void) => void, sc: number) => new SparseLDL(n, f, sc)]] as const) {
    it(`${nome}: mecanismo (duas molas de penalidade em série sem apoio) continua instável`, () => {
      const k = 1e13; // [[k, −k], [−k, k]]: corpo rígido
      const L = fat(2, (set) => { set(0, 0, k); set(1, 1, k); set(1, 0, -k); }, k);
      expect(L.singularRow).toBeGreaterThanOrEqual(0);
    });
    it(`${nome}: gdl de rigidez 100 ao lado de penalidade 1e13 resolve exato (u = F/k)`, () => {
      const L = fat(3, (set) => { set(0, 0, 2e13); set(1, 1, 1e13); set(1, 0, -1e13); set(2, 2, 100); }, 2e13);
      expect(L.singularRow).toBe(-1);
      const u = L.solve([0, 0, 50]);
      expect(u[2]).toBeCloseTo(0.5, 12);
    });
    it(`${nome}: mola fraca em série com penalidade (k = 1e4 após 1e13) segue o critério antigo e resolve`, () => {
      const L = fat(2, (set) => { set(0, 0, 1e13); set(1, 1, 1e13 + 1e4); set(1, 0, -1e13); }, 1e13);
      expect(L.singularRow).toBe(-1);
      const u = L.solve([0, 1]);
      expect(u[1]).toBeCloseTo(1e-4, 9);
    });
  }
});

describe('barras ligadas a cascas: análise estável e equilíbrio global de força e momento', () => {
  // Sem ligações rígidas o resíduo fica em 1e-11 a 1e-13. Com o lado curto em barra, as ligações rígidas por penalidade
  // (E·100, A = I = J = 10, ℓ ≈ 0,3 m: diagonal 1,2e13) põem o piso do arredondamento em eps·‖K‖·‖u‖ ≈ 1e-8 da carga.
  const lim = (nome: string) => (/lado curto|lados curtos/.test(nome) ? 1e-7 : 1e-9);
  const casos: [string, () => Sessao][] = [
    ['pilar-parede em L com o lado curto em barra, base engastada', () => { const s = padrao(); pp(s, [[0, 0], [3, 0], [3, 0.6]]); return s; }],
    ['pilar-parede em L com o lado curto em barra, base rotulada', () => { const s = padrao(); pp(s, [[0, 0], [3, 0], [3, 0.6]], { vinculoBase: 'rotula' }); return s; }],
    ['pilar-parede em L, base em molas e molas no lado curto em barra (FU7d)', () => { const s = padrao({ fundParedeK: 1e5 }); pp(s, [[0, 0], [3, 0], [3, 0.6]], { vinculoBase: 'molas' }); return s; }],
    ['pilar-parede em L, base em molas e lado curto engastado (fundParedeBarraMola = 0)', () => { const s = padrao({ fundParedeK: 1e5, fundParedeBarraMola: 0 }); pp(s, [[0, 0], [3, 0], [3, 0.6]], { vinculoBase: 'molas' }); return s; }],
    ['pilar-parede em U com os dois lados curtos em barra, base em molas', () => { const s = padrao({ fundParedeK: 1e5 }); pp(s, [[0, 0.6], [0, 0], [3, 0], [3, 0.6]], { vinculoBase: 'molas' }); return s; }],
    ['pilar-parede reto com viga apoiada ao longo e vão até um pilar', () => {
      const s = padrao(), t1 = nomePav(s.modelo, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
      pp(s, [[0, 0], [4, 0]]);
      ok(s, 'pilar.inserir', { x: 7, y: 0, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
      ok(s, 'viga.tracar', { grupo: g, pontos: [[1, 0], [7, 0]], secao: { b: 0.2, h: 0.5 } });
      return s;
    }],
    ['pilar-parede reto com viga chegando perpendicular ao meio (torção da viga no giro da parede)', () => {
      const s = padrao(), t1 = nomePav(s.modelo, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
      pp(s, [[0, 0], [4, 0]]);
      ok(s, 'pilar.inserir', { x: 2, y: 5, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
      ok(s, 'viga.tracar', { grupo: g, pontos: [[2, 0], [2, 5]], secao: { b: 0.2, h: 0.5 } });
      return s;
    }],
    ['parede com viga embutida', () => {
      const s = padrao(), t1 = nomePav(s.modelo, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
      ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: t1 });
      ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.4 } });
      ok(s, 'viga.embutir', { viga: s.modelo.vigas.at(-1)!.id, parede: s.modelo.paredes![0].id });
      return s;
    }],
    ['parede com viga embutida, modelo clássico (modeloGlobal 0)', () => {
      const s = padrao({ modeloGlobal: 0 }), t1 = nomePav(s.modelo, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
      ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: t1 });
      ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.4 } });
      ok(s, 'viga.embutir', { viga: s.modelo.vigas.at(-1)!.id, parede: s.modelo.paredes![0].id });
      return s;
    }],
    ['parede com viga apoiada (não embutida)', () => {
      const s = padrao(), t1 = nomePav(s.modelo, 'Tipo 1'), g = s.modelo.pavimentos.find((p) => p.id === t1)!.grupo;
      ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: t1 });
      ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.4 } });
      return s;
    }],
    ['parede com base em sapata corrida (molas de Winkler)', () => {
      const s = padrao({ fundParedeK: 1e5 });
      ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: nomePav(s.modelo, 'Tipo 1'), base: { tipo: 'sapataCorrida' } });
      return s;
    }],
    ['parede com base em viga de fundação (viga sobre base elástica nos nós da casca)', () => {
      const s = padrao({ fundParedeK: 1e5 });
      ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: nomePav(s.modelo, 'Tipo 1'), base: { tipo: 'viga', largura: 0.6, altura: 0.5 } });
      return s;
    }],
  ];
  it('nós com ligação rígida (opção ligacaoBarraCasca = 1): só onde a barra sai da casca; barras ao longo da casca não ligam', () => {
    const n = (nome: string) => analisarEdificio(casos.find(([c]) => c === nome)![1]().modelo).portico.modelo.ligacoesCasca?.length ?? 0;
    expect(n('pilar-parede em L com o lado curto em barra, base engastada')).toBe(2); // trecho rígido do lado curto, um por nível (Tipo 1 + nível intermediário)
    expect(n('pilar-parede reto com viga chegando perpendicular ao meio (torção da viga no giro da parede)')).toBe(1);
    expect(n('pilar-parede reto com viga apoiada ao longo e vão até um pilar')).toBe(1); // só na ponta de onde a viga sai
    expect(n('parede com viga embutida')).toBe(0);
    expect(n('parede com viga apoiada (não embutida)')).toBe(0);
    expect(n('parede com base em viga de fundação (viga sobre base elástica nos nós da casca)')).toBe(0);
  });
  for (const [nome, montar] of casos) {
    it(nome, () => {
      const { rel } = residuoGlobal(montar().modelo);
      for (let k = 0; k < 6; k++) expect(rel[k], `componente ${k}`).toBeLessThan(lim(nome));
    });
  }
});

describe('ligação rígida barra–casca no plano (opção ligacaoBarraCasca, 25/10/2026): viga entre duas paredes no seu plano', () => {
  // paredes de 3 m (eixos [0, 3] e [9, 12]) e viga 20 × 50 de x = 3 a x = 9 só com o peso próprio (2,5 kN/m): qL²/12 = 7,5 kN·m
  function montar(lig: number, modeloGlobal: number) {
    const s = padrao({ ligacaoBarraCasca: lig, modeloGlobal }), t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!;
    ok(s, 'parede.criar', { pontos: [[0, 0], [3, 0]], espessura: 0.2, morre: t1.id });
    ok(s, 'parede.criar', { pontos: [[9, 0], [12, 0]], espessura: 0.2, morre: t1.id });
    ok(s, 'viga.tracar', { grupo: t1.grupo, pontos: [[3, 0], [9, 0]], secao: { b: 0.2, h: 0.5 } });
    return s;
  }
  const Mref = (25 * 0.2 * 0.5 * 36) / 12;
  for (const [rot, mg] of [['modelo clássico', 0], ['modelo integrado', 1]] as const) {
    it(`${rot}: rígida → momento negativo nas faces ≈ qL²/12 (95 a 100 %); giro (anterior) → bem menor; equilíbrio`, () => {
      const faces = (lig: number) => {
        const an = analisarEdificio(montar(lig, mg).modelo);
        expect(an.erro).toBeUndefined();
        const vb = an.portico.barras.flatMap((t, i) => (t.tipo === 'viga' ? [i] : [])).sort((a, c) => an.portico.modelo.nos[an.portico.modelo.barras[a].i][0] - an.portico.modelo.nos[an.portico.modelo.barras[c].i][0]);
        const f0 = an.portico.res!.esforcos[0][vb[0]], f1 = an.portico.res!.esforcos[0][vb.at(-1)!];
        return { Mi: Math.abs(f0[5]), Mj: Math.abs(f1[11]), n: an.portico.modelo.ligacoesCasca?.length ?? 0, b: montar(lig, mg).modelo };
      };
      const rig = faces(1), giro = faces(0);
      expect(rig.n).toBeGreaterThanOrEqual(2);
      expect(giro.n).toBe(0);
      for (const M of [rig.Mi, rig.Mj]) { expect(M / Mref).toBeGreaterThan(0.95); expect(M / Mref).toBeLessThan(1); }
      for (const M of [giro.Mi, giro.Mj]) expect(M / Mref).toBeLessThan(0.75);
      const { rel } = residuoGlobal(rig.b);
      for (let k = 0; k < 6; k++) expect(rel[k], `componente ${k}`).toBeLessThan(1e-7);
    });
  }
});
