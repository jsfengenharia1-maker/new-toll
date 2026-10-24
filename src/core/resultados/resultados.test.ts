import { describe, expect, it } from 'vitest';
import { analisarEdificio } from '../building/analitico';
import { combinacoesEdificio } from '../building/combinacoes';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { construirCena } from '../vista3d/cena';
import {
  PERIODO_ANIMACAO, deslocamentosHipotese, eixosDeformados, escalaAutomatica, fatorAnimacao, hipoteseDeCaso, hipoteseDeCombinacao,
  hipotesesDisponiveis, pontoDaBarra,
} from './deformada';
import { deformarCena, posicoesDeformadas, subdividir } from './deformadaCena';
import { campoDisperso } from './interpolacao';
import { consultaNo, csvDeslocamentos, maximosPilaresCombinados, maximosPorPano, tabelaDeslocamentosMalha } from './consultas';
import { valoresLegenda } from './bandas';
import { ehGravitacional, flechaDaHipotese, flechaEntrePontos, flechaEnvoltoria, flechaMaisDesfavoravel, perfilDeslocamentos } from './flechaPontos';

// ---- viga isolada: Hermite + carga uniforme = linha elástica exata ----
const E = 30e6, I = 0.0004, L = 6, q = 12, EI = E * I;
function viga(apoioJ: number[], apoioI: number[]) {
  const m: Modelo3 = { nos: [[0, 0, 0], [L, 0, 0]], barras: [{ i: 0, j: 1, E, G: E / 2.4, A: 0.1, Iy: I, Iz: I, J: 2 * I }], apoios: new Map([[0, apoioI], [1, apoioJ]]) };
  const caso: Caso3 = { nodais: [], distribuidas: [{ barra: 0, q: [0, 0, -q] }] };
  return { m, r: resolver3(m, [caso]) };
}

describe('V3: linha elástica da barra (Hermite + carga distribuída)', () => {
  it('viga biapoiada: flecha no meio = 5qL⁴/384EI', () => {
    const { m, r } = viga([1, 2, 3], [0, 1, 2, 3]);
    const p = pontoDaBarra(m, 0, r.desloc[0], 0.5, [0, 0, -q]);
    expect(p.u[2]).toBeCloseTo(-(5 * q * L ** 4) / (384 * EI), 9);
    // sem a parcela da carga, só o Hermite dos extremos: qL⁴/96EI (a diferença é a solução de engastamento perfeito)
    expect(pontoDaBarra(m, 0, r.desloc[0], 0.5).u[2]).toBeCloseTo(-(q * L ** 4) / (96 * EI), 9);
    // pontos fora do meio: w(x) = q x (L³ − 2L x² + x³)/(24EI)
    for (const t of [0.1, 0.25, 0.75]) {
      const x = t * L, esperado = -(q * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI);
      expect(pontoDaBarra(m, 0, r.desloc[0], t, [0, 0, -q]).u[2]).toBeCloseTo(esperado, 9);
    }
  });
  it('viga biengastada: flecha no meio = qL⁴/384EI e rotação nula nos apoios', () => {
    const { m, r } = viga([0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]);
    expect(pontoDaBarra(m, 0, r.desloc[0], 0.5, [0, 0, -q]).u[2]).toBeCloseTo(-(q * L ** 4) / (384 * EI), 9);
    expect(Math.abs(pontoDaBarra(m, 0, r.desloc[0], 0.0001, [0, 0, -q]).rot[1])).toBeLessThan(1e-5);
  });
  it('balanço com carga na ponta: Hermite exato, w(L/2) = 5PL³/48EI', () => {
    const P = 20, m: Modelo3 = { nos: [[0, 0, 0], [L, 0, 0]], barras: [{ i: 0, j: 1, E, G: E / 2.4, A: 0.1, Iy: I, Iz: I, J: 2 * I }], apoios: new Map([[0, [0, 1, 2, 3, 4, 5]]]) };
    const r = resolver3(m, [{ nodais: [{ no: 1, f: [0, 0, -P, 0, 0, 0] }], distribuidas: [] }]);
    expect(pontoDaBarra(m, 0, r.desloc[0], 0.5).u[2]).toBeCloseTo(-(5 * P * L ** 3) / (48 * EI), 9);
    expect(pontoDaBarra(m, 0, r.desloc[0], 1).u[2]).toBeCloseTo(-(P * L ** 3) / (3 * EI), 9);
  });
  it('escala automática (maior deslocamento = 5 % da altura) e animação sin(2πt/T)', () => {
    expect(escalaAutomatica(0.02, 12)).toBeCloseTo(30, 9);
    expect(escalaAutomatica(0, 12)).toBe(1);
    expect(fatorAnimacao(0)).toBeCloseTo(0, 12);
    expect(fatorAnimacao(PERIODO_ANIMACAO / 4)).toBeCloseTo(1, 12);
    expect(fatorAnimacao(PERIODO_ANIMACAO / 2)).toBeCloseTo(0, 9);
    expect(fatorAnimacao((3 * PERIODO_ANIMACAO) / 4)).toBeCloseTo(-1, 12);
    expect(fatorAnimacao(1.3, 4)).toBeCloseTo(fatorAnimacao(5.3, 4), 9);
  });
  it('subdivisão em 4: cada nível multiplica os triângulos por 4 e mantém a área', () => {
    const pos = [0, 0, 0, 2, 0, 0, 0, 2, 0], idx = [0, 1, 2];
    const s = subdividir(pos, idx, 2);
    expect(s.idx.length / 3).toBe(16);
    let area = 0;
    for (let t = 0; t < s.idx.length; t += 3) { const [a, b, c] = [0, 1, 2].map((k) => s.idx[t + k]); area += Math.abs((s.pos[b * 3] - s.pos[a * 3]) * (s.pos[c * 3 + 1] - s.pos[a * 3 + 1]) - (s.pos[c * 3] - s.pos[a * 3]) * (s.pos[b * 3 + 1] - s.pos[a * 3 + 1])) / 2; }
    expect(area).toBeCloseTo(2, 9);
  });
});

describe('V3: interpolação e flecha entre dois pontos', () => {
  const grade = () => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 12; i++) for (let j = 0; j <= 10; j++) pts.push([i * 0.5, j * 0.5]);
    return pts;
  };
  it('mínimos quadrados móveis reproduz campos de grau 2', () => {
    const f = (x: number, y: number) => 0.3 + 0.02 * x - 0.01 * y + 0.004 * x * x - 0.003 * x * y + 0.002 * y * y;
    const pts = grade(), c = campoDisperso(pts, pts.map(([x, y]) => f(x, y)));
    for (const [x, y] of [[1.23, 2.1], [3.3, 0.4], [5.9, 4.9], [0.1, 0.1]]) expect(c(x, y)).toBeCloseTo(f(x, y), 8);
    expect(c(2, 3)).toBeCloseTo(f(2, 3), 12); // sobre um nó
  });
  it('secante: parábola de flecha f no meio mais uma rampa dá f; razão L/f', () => {
    const Lp = 6, f = 0.012;
    const campo = (x: number) => -(f * 4 * x * (Lp - x)) / Lp ** 2 - 0.004 * x - 0.01; // uz (para cima +): afunda f e inclina
    const perfil = perfilDeslocamentos((x) => campo(x), [0, 1], [6, 1], 120);
    const r = flechaEntrePontos(perfil);
    expect(r.L).toBeCloseTo(6, 12);
    expect(r.flecha).toBeCloseTo(f, 9);
    expect(r.s).toBeCloseTo(3, 9);
    expect(r.razao).toBeCloseTo(6 / f, 6);
    expect(r.ok).toBe(f <= 6 / 250);
    expect(flechaEntrePontos(perfil, { amplificacao: 2.5 }).flecha).toBeCloseTo(2.5 * f, 9);
    // entre os pontos: diferença entre as extremidades; absoluta máxima: maior afundamento do perfil
    expect(flechaEntrePontos(perfil, { medida: 'entrePontos' }).flecha).toBeCloseTo(0.004 * 6, 9);
    const abs = flechaEntrePontos(perfil, { medida: 'absolutaMax' });
    expect(abs.flecha).toBeCloseTo(Math.max(...perfil.w), 12);
  });
  it('valores da legenda: extremos e intermediários (≤ 5)', () => {
    const it = (n: number) => Array.from({ length: n }, (_, k) => ({ de: k * 10, ate: (k + 1) * 10 }));
    expect(valoresLegenda(it(4))).toEqual([0, 10, 20, 30, 40]);
    expect(valoresLegenda(it(8))).toEqual([0, 20, 40, 60, 80]);
    expect(valoresLegenda(it(1))).toEqual([0, 10]);
    expect(valoresLegenda([])).toEqual([]);
  });
  it('limite ≤ 0 ou amplificação inválida não dá "atende": erro explícito', () => {
    const perfil = perfilDeslocamentos((x) => -0.01 * x * (6 - x) / 9, [0, 1], [6, 1], 60);
    for (const lim of [0, -250, NaN, Infinity]) {
      const r = flechaEntrePontos(perfil, { limite: lim });
      expect(r.ok).toBe(false); expect(r.erro).toMatch(/Limite/); expect(Number.isNaN(r.limiteM)).toBe(true);
    }
    for (const amplificacao of [0, -1, NaN]) {
      const r = flechaEntrePontos(perfil, { amplificacao });
      expect(r.ok).toBe(false); expect(r.erro).toMatch(/Amplificação/);
    }
    const bom = flechaEntrePontos(perfil, { limite: 250, amplificacao: 1 });
    expect(bom.erro).toBeUndefined(); expect(bom.limiteM).toBeCloseTo(6 / 250, 12);
  });
  it('tangente: balanço w = k·x² → flecha k·L² e razão 2L/f', () => {
    const k = 0.0005, Lp = 4;
    const perfil = perfilDeslocamentos((x) => -k * x * x, [0, 0], [Lp, 0], 80);
    const r = flechaEntrePontos(perfil, { referencia: 'tangente' });
    expect(r.inclinacaoInicial).toBeCloseTo(0, 6);
    expect(r.flecha).toBeCloseTo(k * Lp * Lp, 8);
    expect(r.razao).toBeCloseTo((2 * Lp) / (k * Lp * Lp), 4);
    expect(r.limiteM).toBeCloseTo((2 * Lp) / 250, 12);
    // com inclinação inicial: w = a·x + k·x² — a tangente descarta a parcela linear
    const p2 = perfilDeslocamentos((x) => -(0.01 * x + k * x * x), [0, 0], [Lp, 0], 80);
    expect(flechaEntrePontos(p2, { referencia: 'tangente' }).flecha).toBeCloseTo(k * Lp * Lp, 8);
    expect(flechaEntrePontos(p2, { referencia: 'secante' }).flecha).toBeLessThan(k * Lp * Lp);
  });
});

// ---- edifício de um vão: pilares nos cantos de 6 × 5, vigas 15×40 e laje maciça de 12 cm ----
function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  ok('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('V3: deformada, consultas e flecha no edifício', () => {
  const b = predio(), an = analisarEdificio(b);
  const pavTipo = b.pavimentos.find((p) => p.grupo === 'g_3')!;

  it('hipóteses: casos simples e combinações; combinação = soma ponderada dos casos', () => {
    const hs = hipotesesDisponiveis(b, an);
    expect(hs.filter((h) => h.tipo === 'caso').map((h) => h.fatores)).toContainEqual({ G: 1 });
    const comb = combinacoesEdificio(b, an).find((c) => c.tipo === 'QP')!;
    const dG = deslocamentosHipotese(an, hipoteseDeCaso('G')), dQ = deslocamentosHipotese(an, hipoteseDeCaso('Q')), dC = deslocamentosHipotese(an, hipoteseDeCombinacao(comb));
    expect(dG.portico).toStrictEqual(an.portico.res!.desloc[0]);
    const k = 7 * 6 + 2, fg = comb.fatores.G ?? 0, fq = comb.fatores.Q ?? 0;
    expect(dC.portico[k]).toBeCloseTo(fg * dG.portico[k] + fq * dQ.portico[k], 12);
    const g = an.grelhas.find((x) => x.pavimento === pavTipo.id)!, kg = 100 * 6 + 2;
    expect(dC.grelhas.get(pavTipo.id)![kg]).toBeCloseTo(fg * g.res!.desloc[0][kg] + fq * g.res!.desloc[1][kg], 12);
    expect(dG.ignorados).toEqual([]);
  });

  it('eixos deformados: 12 pontos por barra, ponta inicial = deslocamento do nó', () => {
    const h = hipoteseDeCaso('G'), eixos = eixosDeformados(an, h, 12), u = an.portico.res!.desloc[0];
    expect(eixos.length).toBeGreaterThan(50);
    for (const e of eixos.slice(0, 40)) {
      expect(e.delta.length).toBe(12);
      const bar = an.portico.modelo.barras[e.barra], oi = bar.offI ?? [0, 0, 0];
      if (oi.every((v) => v === 0)) expect(e.desl[2]).toBeCloseTo(u[bar.i * 6 + 2], 12);
    }
    expect(eixosDeformados(an, h, 3)[0].delta.length).toBe(8);
    expect(eixosDeformados(an, h, 40)[0].delta.length).toBe(16);
    expect(Math.max(...eixos.flatMap((e) => e.delta))).toBeGreaterThan(1e-5);
  });

  it('consulta por nó confere com a análise (casos e combinações)', () => {
    const c = consultaNo(b, an, null, { x: 0, y: 0, z: 3 })!;
    const u = an.portico.res!.desloc[0];
    expect(c.origem).toBe('portico');
    expect(c.distancia).toBeLessThan(1e-9);
    expect(c.casos.find((x) => x.nome === 'G')!.u[2]).toBeCloseTo(u[c.no * 6 + 2], 12);
    expect(c.combinacoes.length).toBeGreaterThan(3);
    expect(c.esforcos.length).toBeGreaterThan(0);
    const cl = consultaNo(b, an, null, { x: 3, y: 2.5, pavimento: pavTipo.id })!;
    const g = an.grelhas.find((x) => x.pavimento === pavTipo.id)!;
    expect(cl.origem).toBe('grelha');
    expect(cl.casos.find((x) => x.nome === 'G')!.u[2]).toBeCloseTo(g.res!.desloc[0][cl.no * 6 + 2], 12);
    expect(cl.casos.find((x) => x.nome === 'G')!.u[2]).toBeLessThan(0);
  });

  it('máximos por pano = maior |uz| dos nós da grelha dentro da laje; tabela e CSV', () => {
    const panos = maximosPorPano(b, an), g = an.grelhas.find((x) => x.pavimento === pavTipo.id)!;
    const doTipo = panos.filter((p) => p.pavimento === pavTipo.id);
    expect(doTipo.length).toBe(1);
    const bruto = Math.max(...g.modelo.nos.map((n, i) => (n[0] > 0.2 && n[0] < 5.8 && n[1] > 0.2 && n[1] < 4.8 ? Math.abs(g.res!.desloc[0][i * 6 + 2]) : 0)));
    expect(Math.abs(doTipo[0].casos.G.uz)).toBeGreaterThanOrEqual(bruto - 1e-12);
    expect(doTipo[0].casos.G.levantamento).toBe(false);
    const t = tabelaDeslocamentosMalha(b, an);
    expect(t.linhas.length).toBeGreaterThan(1000);
    expect(Math.abs(t.maximoPorCaso.G)).toBeGreaterThanOrEqual(Math.abs(doTipo[0].casos.G.uz) - 1e-12);
    const csv = csvDeslocamentos(t.linhas.slice(0, 3));
    expect(csv.split('\n').length).toBe(4);
    expect(csv.split('\n')[0]).toBe('Pavimento;Laje;No;X (m);Y (m);Caso;uz (mm)');
  });

  it('máximos dos pilares por pavimento: um por pavimento com pilares, valores finitos', () => {
    const m = maximosPilaresCombinados(b, an, 'FREQ');
    expect(m.length).toBeGreaterThanOrEqual(3);
    for (const p of m) { expect(Number.isFinite(p.x.valor)).toBe(true); expect(p.x.valor).toBeGreaterThanOrEqual(0); expect(p.y.distorcao).toBeGreaterThanOrEqual(0); }
    expect(m.some((p) => p.x.valor > 0 || p.y.valor > 0)).toBe(true);
  });

  it('flecha entre dois pontos da laje: perfil passa pelos nós e a secante vale |w(meio) − média das pontas|', () => {
    const h = hipoteseDeCaso('G');
    const r = flechaDaHipotese(an, h, pavTipo.id, [0.5, 2.5], [5.5, 2.5], {}, 100);
    const g = an.grelhas.find((x) => x.pavimento === pavTipo.id)!;
    // nó da grelha sobre a reta y = 2,5: o perfil o reproduz
    const k = g.modelo.nos.findIndex((n) => Math.abs(n[0] - 3) < 1e-9 && Math.abs(n[1] - 2.5) < 1e-9);
    if (k >= 0) {
      const i = r.perfil.x.findIndex((x) => Math.abs(x - 3) < 1e-9);
      expect(r.perfil.w[i]).toBeCloseTo(-g.res!.desloc[0][k * 6 + 2], 9);
    }
    const w = r.perfil.w, meio = w[50], pontas = (w[0] + w[100]) / 2;
    expect(r.resultado.flecha).toBeGreaterThan(0);
    expect(r.resultado.flecha).toBeCloseTo(Math.max(...w.map((v, i) => v - (w[0] + ((w[100] - w[0]) * i) / 100))), 12);
    expect(r.resultado.flecha).toBeGreaterThanOrEqual(meio - pontas - 1e-4);
    expect(r.resultado.L).toBeCloseTo(5, 12);
  });

  it('combinação gravitacional mais desfavorável: só casos G/Q e a de maior flecha vem primeiro', () => {
    const lista = flechaMaisDesfavoravel(b, an, pavTipo.id, [0.5, 2.5], [5.5, 2.5], { estado: 'flecha' });
    expect(lista.length).toBeGreaterThan(0);
    for (const x of lista) expect(ehGravitacional(an, { nome: x.hipotese.nome, tipo: 'QP', fatores: x.hipotese.fatores })).toBe(true);
    for (let i = 1; i < lista.length; i++) expect(Math.abs(lista[i - 1].resultado.flecha)).toBeGreaterThanOrEqual(Math.abs(lista[i].resultado.flecha));
    const raras = flechaMaisDesfavoravel(b, an, pavTipo.id, [0.5, 2.5], [5.5, 2.5], { combinacoes: combinacoesEdificio(b, an).filter((c) => c.tipo === 'RARA') });
    expect(raras.every((x) => Object.keys(x.hipotese.fatores).every((c) => an.casos.includes(c)))).toBe(true);
  });

  it('flecha pela envoltória (V6d): ordenada por |flecha| e cada item reproduz a flecha da combinação', () => {
    const a: [number, number] = [0.5, 2.5], z: [number, number] = [5.5, 2.5];
    for (const fam of ['RARA', 'FREQ', 'QP'] as const) {
      const lista = flechaEnvoltoria(b, an, fam, pavTipo.id, a, z);
      const combs = combinacoesEdificio(b, an).filter((c) => c.tipo === fam);
      expect(lista.length).toBe(combs.length);
      for (let i = 1; i < lista.length; i++) expect(Math.abs(lista[i - 1].resultado.flecha)).toBeGreaterThanOrEqual(Math.abs(lista[i].resultado.flecha));
      const c0 = combs.find((c) => `comb:${c.nome}` === lista[0].hipotese.id)!;
      expect(flechaDaHipotese(an, hipoteseDeCombinacao(c0), pavTipo.id, a, z).resultado.flecha).toBeCloseTo(lista[0].resultado.flecha, 12);
    }
    // a família ELU entra (informativa) e inclui as combinações com vento
    expect(flechaEnvoltoria(b, an, 'ELU', pavTipo.id, a, z).length).toBe(combinacoesEdificio(b, an).filter((c) => c.tipo === 'ELU').length);
  });

  it('cena deformada: malha refinada, topo do pilar acompanha o nó e escala automática = 5 % da altura', () => {
    const cena = construirCena(b), cd = deformarCena(cena, an, hipoteseDeCaso('G'));
    expect(cd.objetos.length).toBe(cena.objetos.length);
    expect(cd.dmax).toBeGreaterThan(1e-5);
    expect(cd.escalaAuto * cd.dmax).toBeCloseTo(0.05 * cd.altura, 9);
    const lajeOrig = cena.objetos.find((o) => o.tipo === 'laje' && !o.pendente)!, lajeDef = cd.objetos.find((o) => o.id === lajeOrig.id)!;
    expect(lajeDef.idx.length).toBeGreaterThan(lajeOrig.idx.length);
    // o centro da laje desce mais que os cantos
    const nv = lajeDef.pos.length / 3;
    let zc = 0, zk = 0, dc = Infinity;
    for (let v = 0; v < nv; v++) {
      const dd = Math.hypot(lajeDef.pos[v * 3] - 3, lajeDef.pos[v * 3 + 1] - 2.5);
      if (dd < dc && lajeDef.pos[v * 3 + 2] > pavTipo.cota - 0.001) { dc = dd; zc = lajeDef.desl[v * 3 + 2]; }
      if (Math.abs(lajeDef.pos[v * 3]) < 1e-6 && Math.abs(lajeDef.pos[v * 3 + 1]) < 1e-6) zk = lajeDef.desl[v * 3 + 2];
    }
    expect(zc).toBeLessThan(zk - 1e-6);
    const pos = posicoesDeformadas(lajeDef, 100, 1);
    expect(pos.length).toBe(lajeDef.pos.length);
    expect(posicoesDeformadas(lajeDef, 100, 0)[2]).toBeCloseTo(lajeDef.pos[2], 6);
  });
});
