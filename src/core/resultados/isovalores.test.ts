import { describe, expect, it } from 'vitest';
import { analisarEdificio } from '../building/analitico';
import { armaduraNecessariaLaje, dimensionarEdificio, woodArmer } from '../building/dimensionamento';
import { comandosEdificioPadrao, Sessao } from '../commands';
import {
  areaDasBandas, areaDoCampo, areaPoligono, bandas, campoDeFuncao, csvCampo, dxfIsolinhas, encadear, extremos, faixaExibida, gradeRetangular,
  isolinhas, legenda, niveisAutomaticos, niveisDefinidos, N_TOKENS_ISO, nosParaRotulo, svgIsovalores, tokenDoValor, triangularNos, type P,
} from './bandas';
import { campoDoRadier, campoDoPavimento, elementoNoPonto, GRANDEZAS_ISO, hipotesesDeLaje, pavimentosComMapa } from './isovalores';
import { hipoteseDeCaso } from './deformada';
import { armaduraNecessariaNervurada } from '../building/nervuradasDim';
import { arranjoNervuras, geometriaBidirecional, lajeComAbacos } from '../building/nervuradas';
import type { Laje } from '../building/types';

const retangulo = (a: number, b: number): P[] => [[0, 0], [a, 0], [a, b], [0, b]];

describe('V4: níveis, triangulação e isolinhas de campos analíticos', () => {
  it('níveis automáticos em escala 1-2-5, dentro da faixa e crescentes', () => {
    expect(niveisAutomaticos(0, 10, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(niveisAutomaticos(0, 1, 5)).toEqual([0.2, 0.4, 0.6, 0.8]);
    expect(niveisAutomaticos(-3.1, 6.8, 5)).toEqual([-2, 0, 2, 4, 6]);
    expect(niveisAutomaticos(0, 0.0123, 6)).toEqual([0.002, 0.004, 0.006, 0.008, 0.01, 0.012]);
    expect(niveisAutomaticos(5, 5)).toEqual([]);
    expect(niveisDefinidos([3, 1, 1, NaN, 2])).toEqual([1, 2, 3]);
  });

  it('Delaunay do retângulo: soma das áreas = área e todos os triângulos anti-horários', () => {
    const nos = gradeRetangular(0, 0, 6, 5, 12, 10);
    const t = triangularNos(nos, retangulo(6, 5));
    const c = { nos, valores: nos.map(() => 0), triangulos: t, grandeza: 'f', unidade: '' };
    expect(areaDoCampo(c)).toBeCloseTo(30, 9);
    expect(t.length / 3).toBe(2 * 12 * 10);
  });

  it('campo linear z = ax + by: isolinhas retas, equidistantes e perpendiculares ao gradiente', () => {
    const a = 2, b = 1;
    const nos = gradeRetangular(0, 0, 6, 5, 12, 10).map(([x, y], i) => [x + (i % 3) * 0.01, y] as P); // nós levemente irregulares
    const c = campoDeFuncao(nos, (x, y) => a * x + b * y, 'z', 'm');
    const niveis = niveisAutomaticos(...(Object.values(faixaExibida(c)) as [number, number]), 8);
    const il = isolinhas(c, niveis);
    expect(il.length).toBe(niveis.length);
    for (const l of il) {
      expect(l.segmentos.length).toBeGreaterThan(0);
      for (const [p, q] of l.segmentos) for (const pt of [p, q]) expect(a * pt[0] + b * pt[1]).toBeCloseTo(l.nivel, 6);
    }
    // distância entre isolinhas consecutivas = passo/|∇z|
    const passo = niveis[1] - niveis[0], dist = passo / Math.hypot(a, b);
    const d = (n: number) => Math.abs(n - il[0].nivel) / Math.hypot(a, b);
    il.forEach((l, k) => expect(d(l.nivel)).toBeCloseTo(k * dist, 9));
    // uma polilinha por nível (a linha reta atravessa o retângulo uma vez)
    for (const l of il.slice(1, -1)) expect(encadear(l.segmentos).length).toBe(1);
  });

  it('campo quadrático z = x² + y²: isolinha de nível r² é o círculo de raio r (malha fina)', () => {
    const nos = gradeRetangular(-3, -3, 3, 3, 60, 60);
    const c = campoDeFuncao(nos, (x, y) => x * x + y * y);
    const r = 2, [il] = isolinhas(c, [r * r]), linhas = encadear(il.segmentos);
    expect(linhas.length).toBe(1);
    const L = linhas[0];
    expect(Math.hypot(L[0][0] - L.at(-1)![0], L[0][1] - L.at(-1)![1])).toBeLessThan(1e-6); // fechada
    for (const [x, y] of L) expect(Math.hypot(x, y)).toBeGreaterThan(r * 0.995);
    for (const [x, y] of L) expect(Math.hypot(x, y)).toBeLessThan(r * 1.005 + 1e-3);
    expect(areaPoligono(L)).toBeCloseTo(Math.PI * r * r, 1);
  });

  it('bandas cobrem a área líquida (com furo) e não se sobrepõem', () => {
    const nos = gradeRetangular(0, 0, 6, 5, 24, 20);
    const furo: P[] = [[2, 2], [3, 2], [3, 3], [2, 3]];
    const c = campoDeFuncao(nos, (x, y) => Math.sin(x) + 0.3 * y, 'f', '', retangulo(6, 5), [furo]);
    expect(areaDoCampo(c)).toBeCloseTo(30 - 1, 9);
    const niveis = niveisAutomaticos(...(Object.values(faixaExibida(c)) as [number, number]), 9);
    const bs = bandas(c, niveis);
    expect(bs.length).toBe(niveis.length + 1);
    expect(areaDasBandas(bs)).toBeCloseTo(29, 6);
    // cada banda só contém valores dentro dos seus limites (conferido nos baricentros)
    for (const b of bs) for (const p of b.poligonos) {
      const g = p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]);
      const v = Math.sin(g[0]) + 0.3 * g[1], tol = 0.2;
      expect(v).toBeGreaterThan(b.de - tol); expect(v).toBeLessThan(b.ate + tol);
    }
  });

  it('extremos nos nós certos e limites restringem a faixa mantendo a ordem das cores', () => {
    const nos = gradeRetangular(0, 0, 4, 4, 8, 8);
    const c = campoDeFuncao(nos, (x, y) => (x - 1) ** 2 + (y - 2) ** 2);
    const e = extremos(c);
    expect(e.min!.pos).toEqual([1, 2]);
    expect(e.min!.valor).toBe(0);
    expect(e.max!.pos).toEqual([4, 0]); // (4−1)² + (0−2)² = 13 (empate com (4,4) → primeiro encontrado)
    expect(e.max!.valor).toBe(13);
    // limite mínimo: o extremo mínimo passa a ser o do nó mais próximo do limite
    expect(extremos(c, { min: 2 }).min!.valor).toBeGreaterThanOrEqual(2);
    expect(extremos(c, { max: 5 }).max!.valor).toBeLessThanOrEqual(5);
    // campo linear: com limites [2, 6] só aparece a região 2 ≤ x ≤ 6 (largura 4 sobre altura 5)
    const lin = campoDeFuncao(gradeRetangular(0, 0, 10, 5, 20, 10), (x) => x);
    const bs = bandas(lin, [3, 4, 5], { min: 2, max: 6 });
    expect(bs.map((b) => [b.de, b.ate])).toEqual([[2, 3], [3, 4], [4, 5], [5, 6]]);
    expect(areaDasBandas(bs)).toBeCloseTo(4 * 5, 9);
    expect(faixaExibida(lin, { min: 2, max: 6 })).toEqual({ lo: 2, hi: 6 });
    const tk = bs.map((b) => b.token);
    expect([...tk].sort((p, q) => p - q)).toEqual(tk); // ordem das cores mantida
    expect(tk[0]).toBeLessThan(tk.at(-1)!); expect(tk.at(-1)).toBeLessThanOrEqual(N_TOKENS_ISO);
    // só o limite mínimo: a faixa vai do limite ao máximo do campo
    expect(areaDasBandas(bandas(lin, [], { min: 7 }))).toBeCloseTo(3 * 5, 9);
    const sem = isolinhas(lin, [1, 3, 8], { min: 2, max: 6 });
    expect(sem.map((s) => s.nivel)).toEqual([3]);
  });

  it('token de cor: sequencial linear e divergente com o zero no token central', () => {
    expect(tokenDoValor(0, 0, 10, 'sequencial')).toBe(0);
    expect(tokenDoValor(10, 0, 10, 'sequencial')).toBe(N_TOKENS_ISO - 1);
    expect(tokenDoValor(5, 0, 10, 'sequencial')).toBe(5);
    expect(tokenDoValor(0, -4, 8)).toBe(5);
    expect(tokenDoValor(-4, -4, 8)).toBe(0);
    expect(tokenDoValor(8, -4, 8)).toBe(N_TOKENS_ISO - 1);
    expect(tokenDoValor(3, 3, 3)).toBe(5);
  });

  it('placa simplesmente apoiada (Navier): máximo de Mx no centro, 0,0479·q·a², isolinhas fechadas em torno do centro', () => {
    const a = 4, q = 10, nu = 0.3, N = 40;
    // Mx = (16 q a²/π⁴) ΣΣ (m² + ν n²) sen(mπx/a) sen(nπy/a) / (m n (m² + n²)²), m, n ímpares
    const mx = (x: number, y: number) => {
      let s = 0;
      for (let m = 1; m <= 41; m += 2) for (let n = 1; n <= 41; n += 2)
        s += ((m * m + nu * n * n) * Math.sin((m * Math.PI * x) / a) * Math.sin((n * Math.PI * y) / a)) / (m * n * (m * m + n * n) ** 2);
      return ((16 * q * a * a) / Math.PI ** 4) * s;
    };
    const c = campoDeFuncao(gradeRetangular(0, 0, a, a, N, N), mx, 'Mx', 'kN·m/m', retangulo(a, a));
    const e = extremos(c);
    expect(e.max!.pos).toEqual([a / 2, a / 2]);
    expect(e.max!.valor / (q * a * a)).toBeCloseTo(0.0479, 3);
    expect(e.min!.valor).toBeCloseTo(0, 6); // nos apoios
    const niveis = niveisAutomaticos(0, e.max!.valor, 6);
    for (const il of isolinhas(c, niveis)) {
      const linhas = encadear(il.segmentos);
      expect(linhas.length).toBe(1);
      const L = linhas[0];
      expect(Math.hypot(L[0][0] - L.at(-1)![0], L[0][1] - L.at(-1)![1])).toBeLessThan(1e-9);
      // contém o centro: o centro de massa da isolinha está no centro da placa
      const cx = L.reduce((s, p) => s + p[0], 0) / L.length, cy = L.reduce((s, p) => s + p[1], 0) / L.length;
      expect(cx).toBeCloseTo(a / 2, 1); expect(cy).toBeCloseTo(a / 2, 1);
    }
  });

  it('legenda, rótulos de valores e saídas (SVG, CSV e DXF)', () => {
    const c = campoDeFuncao(gradeRetangular(0, 0, 4, 2, 8, 4), (x, y) => x - y, 'f', 'kN', retangulo(4, 2));
    const niveis = niveisAutomaticos(-2, 4, 6);
    const lg = legenda(c, niveis);
    expect(lg.itens.length).toBe(niveis.length + 1);
    expect(lg.itens[0].de).toBe(-2); expect(lg.itens.at(-1)!.ate).toBe(4);
    expect(lg.minimo!.valor).toBe(-2); expect(lg.maximo!.valor).toBe(4);
    expect(lg.itens[0].rotulo).toMatch(/^-2 a /);
    const rot = nosParaRotulo(c, 1, 10);
    expect(rot.length).toBeGreaterThan(0);
    expect(rot.length).toBeLessThanOrEqual(10);
    for (const i of rot) for (const j of rot) if (i < j) expect(Math.hypot(c.nos[i][0] - c.nos[j][0], c.nos[i][1] - c.nos[j][1])).toBeGreaterThanOrEqual(1);
    const svg = svgIsovalores(c, { niveis, comValores: true });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('class="iso-banda"'); expect(svg).toContain('class="iso-linha"'); expect(svg).toContain('var(--iso-');
    expect(svgIsovalores(c, { niveis, cor: (t) => `#00000${t}`, comLegenda: false })).toContain('fill="#00000');
    const csv = csvCampo(c, false).trim().split('\n');
    expect(csv[0]).toBe('x (m);y (m);f (kN)');
    expect(csv.length).toBe(1 + 9 * 5);
    expect(csv.slice(1).every((l) => l.split(';').length === 3)).toBe(true);
    const dxf = dxfIsolinhas(c, niveis);
    expect(dxf.startsWith('0\nSECTION')).toBe(true);
    expect(dxf).toContain('ISOLINHAS'); expect(dxf).toContain('POLYLINE'); expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
    // um POLYLINE por polilinha e um VERTEX por ponto
    const ptsTotal = isolinhas(c, niveis).reduce((s, il) => s + encadear(il.segmentos).reduce((q, l) => q + l.length, 0), 0) + 4;
    expect((dxf.match(/\nVERTEX\n/g) ?? []).length).toBe(ptsTotal);
  });
});

// ---- campos sobre o edifício ----
function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.4 } } })) });
  s.executar('lote', { comandos: [[[0, 0], [6, 0]], [[0, 5], [6, 5]], [[0, 0], [0, 5]], [[6, 0], [6, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('V4: campos da laje do edifício', { timeout: 60000 }, () => {
  const b = predio(), an = analisarEdificio(b), dim = dimensionarEdificio(b, an);
  const pav = pavimentosComMapa(b, an)[0].id, l = dim.lajes[0];

  it('catálogo de grandezas e hipóteses', () => {
    expect(new Set(GRANDEZAS_ISO.map((g) => g.id)).size).toBe(GRANDEZAS_ISO.length);
    expect(GRANDEZAS_ISO.every((g) => g.rotulo && g.unidade)).toBe(true);
    expect(hipotesesDeLaje(b, an).length).toBeGreaterThan(2);
  });

  it('os triângulos cobrem a área líquida da laje (6 × 5 m) e as bandas somam o mesmo', () => {
    const { campo } = campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'MxInf' });
    expect(campo).not.toBeNull();
    expect(areaDoCampo(campo!)).toBeCloseTo(30, 6);
    const bs = bandas(campo!, niveisAutomaticos(...(Object.values(faixaExibida(campo!)) as [number, number]), 8));
    expect(areaDasBandas(bs)).toBeCloseTo(30, 6);
    expect(elementoNoPonto(campo!, 3, 2.5)).toBe(b.lajes[0].id);
    expect(elementoNoPonto(campo!, 30, 2.5)).toBeNull();
  });

  it('momentos de cálculo coincidem com o Wood-Armer do dimensionamento (máximos por direção)', () => {
    const maxCampo = (g: 'MxInf' | 'MyInf' | 'MxSup' | 'MySup') => faixaExibida(campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: g }).campo!);
    expect(maxCampo('MxInf').hi).toBeCloseTo(l.mPos[0], 9);
    expect(maxCampo('MyInf').hi).toBeCloseTo(l.mPos[1], 9);
    expect(maxCampo('MxSup').lo).toBeCloseTo(l.mNeg[0], 9);
    expect(maxCampo('MySup').lo).toBeCloseTo(l.mNeg[1], 9);
    expect(l.mPos[0]).toBeGreaterThan(0);
  });

  it('áreas de aço: máximo do mapa = armadura positiva do dimensionamento (sem aumento por fissuração)', () => {
    for (const k of [0, 1]) {
      const m = faixaExibida(campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: k ? 'AsInfY' : 'AsInfX' }).campo!);
      expect(m.hi).toBeLessThanOrEqual(l.As.pos[k] + 1e-9);
      expect(m.hi).toBeGreaterThan(0);
      if (!l.mensagens.some((t) => t.includes('Armadura aumentada'))) expect(m.hi).toBeCloseTo(l.As.pos[k], 6);
    }
    const env = faixaExibida(campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'AsInf' }).campo!);
    expect(env.hi).toBeCloseTo(Math.max(...l.As.pos), 6);
  });

  it('woodArmer isolado: cálculo nodal reproduz a função do dimensionamento', () => {
    const w = woodArmer(10, 6, 3);
    expect(w.inf).toEqual([13, 9]);
  });

  it('deslocamentos: z em mm (negativo para baixo), mínimo = maior flecha da grelha; combinação é linear nos casos', () => {
    const g = an.grelhas.find((x) => x.res)!;
    const h0 = hipoteseDeCaso(an.casos[0]), h1 = hipoteseDeCaso(an.casos[1]);
    const c0 = campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'uz', hipotese: h0 }).campo!;
    const esperado = Math.min(...g.modelo.nos.map((_, n) => g.res!.desloc[0][n * 6 + 2])) * 1000;
    expect(faixaExibida(c0).lo).toBeCloseTo(esperado, 9);
    expect(faixaExibida(c0).lo).toBeLessThan(0);
    const comb = { id: 'x', nome: 'x', tipo: 'combinacao' as const, fatores: { [an.casos[0]]: 1.4, [an.casos[1]]: 0.5 } };
    const c = campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'uz', hipotese: comb }).campo!;
    const c1 = campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'uz', hipotese: h1 }).campo!;
    c.valores.forEach((v, i) => expect(v).toBeCloseTo(1.4 * c0.valores[i] + 0.5 * c1.valores[i], 9));
  });

  it('esforços por hipótese: Mx linear nos casos, Q = √(Qx² + Qy²), simetria da laje retangular', () => {
    const h0 = hipoteseDeCaso(an.casos[0]), h1 = hipoteseDeCaso(an.casos[1]);
    const comb = { id: 'y', nome: 'y', tipo: 'combinacao' as const, fatores: { [an.casos[0]]: 2, [an.casos[1]]: 1 } };
    const f = (g: 'Mx' | 'Qx' | 'Qy' | 'Q', h: typeof h0) => campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: g, hipotese: h }).campo!;
    const m0 = f('Mx', h0), m1 = f('Mx', h1), mc = f('Mx', comb);
    mc.valores.forEach((v, i) => expect(v).toBeCloseTo(2 * m0.valores[i] + m1.valores[i], 9));
    const qx = f('Qx', h0), qy = f('Qy', h0), q = f('Q', h0);
    q.valores.forEach((v, i) => expect(v).toBeCloseTo(Math.hypot(qx.valores[i], qy.valores[i]), 9));
    // simetria em x (laje, carga e vigas simétricas): o campo de Mx no nó (x, y) é igual ao de (6 − x, y)
    const mapa = new Map(m0.nos.map((p, i) => [`${p[0].toFixed(3)}_${p[1].toFixed(3)}`, m0.valores[i]]));
    let comparados = 0;
    m0.nos.forEach((p, i) => { const e = mapa.get(`${(6 - p[0]).toFixed(3)}_${p[1].toFixed(3)}`); if (e !== undefined) { comparados++; expect(m0.valores[i]).toBeCloseTo(e, 3); } });
    expect(comparados).toBeGreaterThan(20);
  });

  it('pavimento sem grelha ou grandeza do radier sem radier devolvem aviso, sem campo', () => {
    expect(campoDoPavimento(b, an, dim, { pavimento: 'nao-existe', grandeza: 'uz' }).campo).toBeNull();
    expect(campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'rW' }).campo).toBeNull();
  });

  it('radier: campos de tensão e recalque (mm, negativo para baixo) sobre os nós da base elástica', () => {
    const nos = gradeRetangular(0, 0, 4, 3, 8, 6).map(([x, y]) => ({ x, y, sigma: 100 + 10 * x, sigmaMin: 20 - 5 * x, w: 0.002 * y }));
    const rb = { id: 'r1', nome: 'R1', nos };
    const bb = { fundacao: { radiers: [{ id: 'r1', contorno: retangulo(4, 3), furos: [] }] } };
    const d = { radiers: [rb] };
    const sig = campoDoRadier(bb as never, d as never, 'r1', 'rSigmaMax').campo!;
    expect(areaDoCampo(sig)).toBeCloseTo(12, 9);
    expect(extremos(sig).max!.valor).toBeCloseTo(140, 9);
    expect(extremos(campoDoRadier(bb as never, d as never, 'r1', 'rSigmaMin').campo!).min!.valor).toBeCloseTo(0, 9); // levantamento a partir de x = 4
    expect(extremos(campoDoRadier(bb as never, d as never, 'r1', 'rW').campo!).min!.valor).toBeCloseTo(-6, 9);
    // tensão acima da admissível dando-a como limite mínimo: só a região σ ≥ 120 (x ≥ 2) → 2 × 3 m²
    expect(areaDasBandas(bandas(sig, [], { min: 120 }))).toBeCloseTo(6, 9);
    expect(campoDoRadier(bb as never, d as never, 'nada', 'rW').campo).toBeNull();
  });
});

describe('V6f: taxa de armadura (cm²/m) em nervuradas bidirecionais', { timeout: 60000 }, () => {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [6, 6], [0, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  s.executar('lote', { comandos: [[[0, 0], [6, 0]], [[0, 6], [6, 6]], [[0, 0], [0, 6]], [[6, 0], [6, 6]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.2, h: 0.6 } } })) });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } });
  const b = s.modelo, an = analisarEdificio(b), dim = dimensionarEdificio(b, an), pav = pavimentosComMapa(b, an)[0].id;
  const l = b.lajes[0] as Laje;

  it('a envoltória das taxas existe nas nervuradas e é o máximo das duas direções', () => {
    const r = campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'AsInf' });
    expect(r.campo).not.toBeNull();
    expect(r.avisos.some((a) => a.includes('Nervuradas: taxa em cm²/m'))).toBe(true);
    const x = faixaExibida(campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'AsInfX' }).campo!), y = faixaExibida(campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'AsInfY' }).campo!);
    expect(faixaExibida(r.campo!).hi).toBeCloseTo(Math.max(x.hi, y.hi), 9);
    // piso: o mínimo de 0,15 % da nervura ÷ intereixo vale em todo nó
    expect(faixaExibida(r.campo!).lo).toBeGreaterThan(0.5);
  });

  it('cada nó reproduz a função de núcleo aplicada ao momento de cálculo (MxInf → AsInfX); zona maciça usa a laje maciça equivalente', () => {
    const m = campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'MxInf' }).campo!, a = campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'AsInfX' }).campo!;
    expect(a.valores.length).toBe(m.valores.length);
    const g = geometriaBidirecional(b, l.tipo as never), arr = arranjoNervuras(lajeComAbacos(b, l, g), g, an.opcoes.nervuradaMacicoViga);
    const equiv = { tipo: { tipo: 'macica', h: g.h }, cobrimento: l.cobrimento };
    let aliviados = 0, macicos = 0;
    a.valores.forEach((v, i) => {
      const alivi = arr.aliviada(a.nos[i]);
      if (alivi) { aliviados++; expect(v).toBeCloseTo(armaduraNecessariaNervurada(b, l, m.valores[i], 'inf', 0), 9); }
      else if (i < m.valores.length) { macicos++; expect(v).toBeCloseTo(armaduraNecessariaLaje(b, an, equiv, m.valores[i], 'inf'), 9); }
    });
    expect(aliviados).toBeGreaterThan(10);
    expect(macicos).toBeGreaterThan(3);
    // a superior só tem valor onde o momento superior é negativo; no resto fica 0
    const sup = campoDoPavimento(b, an, dim, { pavimento: pav, grandeza: 'AsSupX' }).campo!;
    expect(Math.min(...sup.valores)).toBe(0);
  });
});
