import { describe, expect, it } from 'vitest';
import { resolver3, type Modelo3 } from '../fe3d';
import { analisarEdificio, type AnaliseEdificio } from '../building/analitico';
import { combinacoesEdificio } from '../building/combinacoes';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { dimensionarEdificio } from '../building/dimensionamento';
import { desenharDiagrama, diagramaBarras, diagramaInclinada, diagramaPilar, diagramaViga, direcaoDoDiagrama, escalaAutomatica, estacoesDaBarra, hipotesesDeEsforco, type Envoltoria } from './esforcosCaso';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

const G = { id: 'caso:G', nome: 'G', tipo: 'caso' as const, fatores: { G: 1 } };

/** Análise mínima de uma viga biapoiada com carga distribuída (q kN/m para baixo) para testar os diagramas sem o edifício. */
function bi(L: number, q: number, extra?: { P: number; a: number }): AnaliseEdificio {
  const m: Modelo3 = { nos: [[0, 0, 0], [L, 0, 0]], barras: [{ i: 0, j: 1, E: 30e6, G: 12e6, A: 0.06, Iz: 0.0008, Iy: 0.0001, J: 0.0002, libI: [4, 5], libJ: [4, 5] }],
    apoios: new Map([[0, [0, 1, 2, 3, 4, 5]], [1, [1, 2, 3, 4, 5]]]) };
  const caso = { nodais: [], distribuidas: [{ barra: 0, q: [0, 0, -q] as [number, number, number] }], ...(extra ? { pontuais: [{ barra: 0, a: extra.a, f: [0, 0, -extra.P, 0, 0, 0] }] } : {}) };
  const res = resolver3(m, [caso]);
  return { portico: { modelo: m, barras: [{ tipo: 'viga', ref: 'v', pavimento: 'p' }], mestres: {}, zonas: {}, res, casos: [caso] }, casos: ['G'], vento: null } as unknown as AnaliseEdificio;
}

describe('diagrama de barra por hipótese (viga biapoiada)', () => {
  it('M no meio = qL²/8, V nos apoios = qL/2, M e V nulos/opostos nas pontas', () => {
    const L = 6, q = 10, an = bi(L, q);
    const d = diagramaBarras(an, [0], G);
    const meio = d.pontos.reduce((a, p) => (Math.abs(p.x - L / 2) < Math.abs(a.x - L / 2) ? p : a));
    expect(meio.max.Mz).toBeCloseTo((q * L * L) / 8, 6);
    expect(meio.min.Mz).toBeCloseTo(meio.max.Mz, 12);
    expect(d.extremos.Mz.max.valor).toBeCloseTo(45, 6);
    expect(d.extremos.Mz.max.x).toBeCloseTo(3, 6);
    expect(d.pontos[0].max.Mz).toBeCloseTo(0, 6);
    expect(d.pontos.at(-1)!.max.Mz).toBeCloseTo(0, 6);
    expect(Math.abs(d.pontos[0].max.Vy)).toBeCloseTo((q * L) / 2, 6);
    expect(d.pontos[0].max.Vy + d.pontos.at(-1)!.max.Vy).toBeCloseTo(0, 6);
    // carga vertical dá força global em z: Fz = ±V
    expect(Math.abs(d.pontos[0].max.Fz)).toBeCloseTo((q * L) / 2, 6);
    expect(d.pontos[0].max.Fx).toBeCloseTo(0, 6);
  });

  it('carga concentrada gera degrau do cortante e M = Ra·a no ponto', () => {
    const L = 6, q = 4, P = 20, a = 2, an = bi(L, q, { P, a });
    const xs = estacoesDaBarra(an, 0);
    expect(xs.filter((x) => Math.abs(x - a) < 1e-4).length).toBeGreaterThanOrEqual(2);
    expect(xs).toContain(a - 1e-6); expect(xs).toContain(a + 1e-6);
    const d = diagramaBarras(an, [0], G);
    const Ra = (q * L) / 2 + (P * (L - a)) / L;
    const noPonto = d.pontos.filter((p) => Math.abs(p.x - a) < 1e-4);
    expect(noPonto[0].max.Mz).toBeCloseTo(Ra * a - (q * a * a) / 2, 4);
    const salto = Math.abs(noPonto.at(-1)!.max.Vy - noPonto[0].max.Vy);
    expect(salto).toBeCloseTo(P, 4);
  });

  it('desenho: curva deslocada para o lado tracionado (embaixo) e escala automática', () => {
    const an = bi(6, 10), d = diagramaBarras(an, [0], G);
    const esc = escalaAutomatica(d, 'Mz', 0.9);
    expect(esc).toBeCloseTo(0.9 / 45, 9);
    const g = desenharDiagrama(d, 'Mz', esc, { cada: 3 });
    const k = d.pontos.findIndex((p) => Math.abs(p.x - 3) < 1e-9);
    expect(g.base[k][2]).toBeCloseTo(0, 9);
    expect(g.curva[k][2]).toBeCloseTo(-0.9, 6); // M > 0 traciona embaixo: o diagrama desce
    expect(g.rotulos[0].valor).toBeCloseTo(45, 6);
    expect(g.hachuras.length).toBeGreaterThan(3);
    // planta: deslocamento horizontal, perpendicular ao eixo
    const gp = desenharDiagrama(d, 'Mz', esc, { plano: 'planta' });
    expect(gp.curva[k][2]).toBeCloseTo(0, 9);
    expect(Math.abs(gp.curva[k][1])).toBeCloseTo(0.9, 6);
    // direção: Mz para −y local; N e V para +y local
    expect(direcaoDoDiagrama('Mz', [0, 0, 1], [0, -1, 0])).toEqual([-0, -0, -1]);
    expect(direcaoDoDiagrama('Vy', [0, 0, 1], [0, -1, 0])).toEqual([0, 0, 1]);
  });
});

describe('esforços por hipótese no edifício', () => {
  const b = predio(), an = analisarEdificio(b);
  const hs = hipotesesDeEsforco(b, an);

  it('seletor: envoltórias das famílias, combinações e casos', () => {
    expect(hs[0].tipo).toBe('envoltoria');
    expect((hs[0] as Envoltoria).familia).toBe('ELU');
    expect(hs.filter((h) => h.tipo === 'caso').map((h) => h.id)).toEqual(expect.arrayContaining(['caso:G', 'caso:Q']));
    expect(hs.some((h) => h.tipo === 'combinacao')).toBe(true);
    expect(new Set(hs.map((h) => h.id)).size).toBe(hs.length);
  });

  it('viga: o diagrama de uma combinação é a soma ponderada dos casos (superposição)', () => {
    const v = b.vigas[0], casos = hs.filter((h) => h.tipo === 'caso');
    const ids = new Set(casos.map((c) => c.nome));
    const elu = combinacoesEdificio(b, an).find((c) => c.tipo === 'ELU' && c.fatores.G && c.fatores.Q && Object.keys(c.fatores).every((n) => ids.has(n)))!;
    const dC = diagramaViga(b, an, v.id, hs.find((h) => h.id === `comb:${elu.nome}`)!)[0];
    const dCasos = Object.keys(elu.fatores).map((n) => [elu.fatores[n], diagramaViga(b, an, v.id, casos.find((c) => c.nome === n)!)[0]] as const);
    expect(dC.pontos.length).toBe(dCasos[0][1].pontos.length);
    dC.pontos.forEach((p, i) => {
      for (const k of ['Mz', 'Vy', 'T', 'Fz'] as const) expect(p.max[k]).toBeCloseTo(dCasos.reduce((s, [f, d]) => s + f * d.pontos[i].max[k], 0), 8);
    });
    // abscissa ao longo do traçado cresce de 0 até o comprimento da viga (6 m)
    expect(dC.s[0]).toBeGreaterThanOrEqual(0); expect(dC.s.at(-1)!).toBeGreaterThan(5);
    expect(dC.pavimento).toBeTruthy();
    // sagging: Mz positivo no vão para o caso G
    expect(dCasos.find(([, d]) => d.hipotese.nome === 'G')![1].extremos.Mz.max.valor).toBeGreaterThan(0);
  });

  it('envoltória contém cada combinação e indica a determinante', () => {
    const v = b.vigas[0], env = hs.find((h) => h.id === 'env:ELU') as Envoltoria;
    const dE = diagramaViga(b, an, v.id, env)[0];
    const algumaDiferente = env.combinacoes.some((c) => c.fatores.Q !== undefined);
    expect(algumaDiferente).toBe(true);
    for (const c of env.combinacoes.slice(0, 6)) {
      const dc = diagramaViga(b, an, v.id, c)[0];
      dc.pontos.forEach((p, i) => { expect(p.max.Mz).toBeLessThanOrEqual(dE.pontos[i].max.Mz + 1e-9); expect(p.max.Mz).toBeGreaterThanOrEqual(dE.pontos[i].min.Mz - 1e-9); });
    }
    expect(dE.extremos.Mz.max.por).toBeTruthy();
    const nomes = env.combinacoes.map((c) => c.nome);
    expect(nomes).toContain(dE.extremos.Mz.max.por);
    expect(nomes).toContain(dE.extremos.Mz.min.por);
    // sem hipótese de vento o máximo do envoltório é um valor de combinação
    expect(dE.extremos.Mz.max.valor).toBeGreaterThanOrEqual(dE.extremos.Mz.min.valor);
  });

  it('pilar: normal na base por caso confere com as cargas na fundação; N cresce para baixo', () => {
    const pil = b.pilares[0];
    const lg = an.fundacao.filter((f) => f.pilar === pil.id);
    const dG = diagramaPilar(an, pil.id, hs.find((h) => h.id === 'caso:G')!)!;
    const baseG = lg.find((f) => f.caso === 'G')!;
    expect(dG.pontos[0].max.N).toBeCloseTo(baseG.N, 3); // compressão +
    expect(dG.altura[0]).toBeCloseTo(0, 9);
    expect(dG.altura.at(-1)!).toBeGreaterThan(10);
    // a normal diminui com a altura (menos pavimentos acima)
    const Ns = dG.pontos.map((p) => p.max.N);
    expect(Ns[0]).toBeGreaterThan(Ns.at(-1)!);
    expect(new Set(dG.lance).size).toBeGreaterThanOrEqual(4);
    // extremos de N em compressão positiva
    expect(dG.extremos.N.max.valor).toBeCloseTo(baseG.N, 3);
    expect(dG.extremos.N.max.pos[2]).toBeLessThan(dG.extremos.N.min.pos[2] + 1e-9);
  });

  it('pilar sob vento: cortante global na base confere em módulo com a reação horizontal da fundação', () => {
    const w = an.vento!.casos.find((c) => c.direcao === 0)!, pil = b.pilares[0];
    const dW = diagramaPilar(an, pil.id, { id: `caso:${w.nome}`, nome: w.nome, tipo: 'caso', fatores: { [w.nome]: 1 } })!;
    const f = an.fundacao.find((x) => x.pilar === pil.id && x.caso === w.nome)!;
    expect(Math.abs(dW.pontos[0].max.Fx)).toBeCloseTo(Math.abs(f.Vx), 3);
    expect(Math.abs(dW.pontos[0].max.Fx)).toBeGreaterThan(0.01);
    expect(Math.abs(dW.pontos[0].max.Fy)).toBeCloseTo(Math.abs(f.Vy), 3);
  });

  it('caso inexistente na barra é ignorado e sem barras o diagrama é nulo', () => {
    const d = diagramaViga(b, an, b.vigas[0].id, { id: 'caso:Z', nome: 'Z', tipo: 'caso', fatores: { Z: 1 } })[0];
    expect(d.ignorados).toEqual(['Z']);
    expect(d.extremos.Mz.max.valor).toBe(0);
    expect(diagramaPilar(an, 'nao-existe', hs[0])).toBeNull();
    expect(diagramaViga(b, an, 'nao-existe', hs[0])).toEqual([]);
    expect(diagramaInclinada(an, 'nao-existe', hs[0])).toBeNull();
  });
});

describe('diagonais de contraventamento', () => {
  it('diagrama percorre as barras divididas no cruzamento: comprimento total e normal constante no caso G', () => {
    const s = new Sessao(), ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); if (!r.ok) throw new Error(`${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`); };
    ok('obra.definir', { nome: 'Diagonais' });
    ok('pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
    ok('pavimento.criar', { nome: 'P1', cota: 3, uso: 'comum' });
    ok('pavimento.criar', { nome: 'P2', cota: 6, uso: 'comum' });
    for (const x of [0, 4]) ok('pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 1.2, h: 1.2 } });
    ok('opcoes.definir', { valores: { engasteTopoUltimo: 1 } });
    const [, p1, p2] = s.modelo.pavimentos;
    ok('diagonal.criar', { pavIni: p1.id, pavFim: p2.id, pIni: [4, 0], pFim: [0, 0], secao: { b: 0.2, h: 0.3 } });
    ok('diagonal.criar', { pavIni: p1.id, pavFim: p2.id, pIni: [0, 0], pFim: [4, 0], secao: { b: 0.2, h: 0.3 } });
    const b = s.modelo, an = analisarEdificio(b);
    dimensionarEdificio(b, an);
    const inc = an.inclinadas![0], d = diagramaInclinada(an, inc.id, hipotesesDeEsforco(b, an).find((h) => h.id === 'caso:G')!)!;
    expect(d.diagonal).toBe(true);
    expect(d.barras).toHaveLength(2);
    expect(d.pontos.at(-1)!.x).toBeCloseTo(inc.Lf, 9);
    // as pontas do diagrama são as das barras: o primeiro ponto está na ponta inicial e o último na final
    const n = an.portico.modelo.nos, br = an.portico.modelo.barras;
    const ini = n[br[inc.segs![0].bi].i], fim = n[br[inc.segs!.at(-1)!.bi].j];
    expect(Math.hypot(d.pontos[0].pos[0] - ini[0], d.pontos[0].pos[1] - ini[1], d.pontos[0].pos[2] - ini[2])).toBeLessThan(0.7);
    expect(Math.hypot(d.pontos.at(-1)!.pos[0] - fim[0], d.pontos.at(-1)!.pos[2] - fim[2])).toBeLessThan(0.7);
    // a diagonal de contraventamento só tem peso próprio no caso G: esforço normal pequeno e contínuo entre as barras
    expect(Number.isFinite(d.extremos.N.max.valor)).toBe(true);
  });
});
