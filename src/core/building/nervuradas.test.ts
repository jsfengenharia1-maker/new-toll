// Lajes nervuradas bidirecionais (E3c): formas, peso e volume, rigidez equivalente da nervura em T contra a placa,
// grelha contra Navier, verificações da NBR, arranjo das nervuras e cubetas.
import { describe, expect, it } from 'vitest';
import { malhaLaje } from './analitico';
import { resolver3, type Caso3, type Modelo3 } from '../fe3d';
import { secaoT } from './tiposLaje';
import {
  alturaMacicaEquivalente, arranjoNervuras, avisosForma, formaPor, formasCatalogo, geometriaBidirecional, passoMalhaNervurada, propBarraNervurada, propBarraNervuradaMista,
  quantitativoNervurada, validarForma, verificarGeometria, type FormaLaje,
} from './nervuradas';
import { OPCOES_PADRAO_CALCULO, opcoesEmUso } from './opcoes';
import { edificioVazio } from './types';
import type { P } from '../geom/faces';

const T = { tipo: 'nervurada' as const, forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 };
const sistema = OPCOES_PADRAO_CALCULO, nbr = opcoesEmUso({}, 'nbr');

describe('formas e geometria (E3c)', () => {
  it('catálogo: geometrias genéricas, sem dado de fabricante, todas coerentes', () => {
    const fs = formasCatalogo();
    expect(fs.length).toBeGreaterThanOrEqual(4);
    for (const f of fs) { expect(f.id.startsWith('cat:')).toBe(true); expect(validarForma(f), f.id).toEqual([]); expect(f.nome).toContain('genérica'); }
    expect(fs.some((f) => f.tipo === 'perdida')).toBe(true);
    expect(formaPor(undefined, 'cat:rec-60-30')?.altura).toBe(0.3);
  });

  it('forma recuperável 60 × 60 (cubeta 50 × 50), h = 35, capa 5: volume e peso à mão', () => {
    const g = geometriaBidirecional(undefined, T);
    // fração da cubeta 0,25/0,36; volume = 0,05 + 0,30 × (1 − 0,6944) = 0,14167 m³/m²; peso = 25 × volume = 3,5417 kN/m²
    expect(g.cubeta).toBeCloseTo(0.25, 12);
    expect(g.fracVazio).toBeCloseTo(0.25 / 0.36, 12);
    expect(g.volume).toBeCloseTo(0.05 + 0.3 * (1 - 0.25 / 0.36), 12);
    expect(g.pp).toBeCloseTo(3.541666667, 6);
    expect(g.ppEnchimento).toBe(0);
    expect(g.recuperavel).toBe(true);
    expect(g.hEnch).toBeCloseTo(0.3, 12);
  });

  it('forma perdida em EPS soma o enchimento (0,2 kN/m³ × 0,30 × 0,6944); indicativos substituem o calculado', () => {
    const g = geometriaBidirecional(undefined, { tipo: 'nervurada', forma: 'cat:perd-eps-60-25', hTotal: 0.3, capa: 0.05 });
    expect(g.recuperavel).toBe(false);
    expect(g.ppEnchimento).toBeCloseTo(0.2 * 0.25 * (0.25 / 0.36), 9);
    expect(g.pp).toBeCloseTo(25 * (0.05 + 0.25 * (1 - 0.25 / 0.36)) + g.ppEnchimento, 9);
    const obra: FormaLaje = { id: 'x', nome: 'Indicativa', tipo: 'recuperavel', altura: 0.3, pecas: 4, intereixo: [0.6, 0.6], bw: [0.1, 0.1], pesoM2: 3.9, volume: 0.16 };
    const b = { ...edificioVazio(), tiposLaje: { formas: [obra] } };
    const gi = geometriaBidirecional(b, { ...T, forma: 'x' });
    expect(gi.pp).toBe(3.9);
    expect(gi.volume).toBe(0.16);
    expect(gi.pecas).toBe(4);
  });

  it('forma inexistente cai na primeira do catálogo, com aviso (a análise não para)', () => {
    const g = geometriaBidirecional(undefined, { ...T, forma: 'nao-existe' });
    expect(g.ausente).toMatch(/nao-existe/);
    expect(g.forma.id.startsWith('cat:')).toBe(true);
  });

  it('validação lógica da forma', () => {
    const base: FormaLaje = { id: 'a', nome: 'A', tipo: 'recuperavel', altura: 0.3, pecas: 1, intereixo: [0.6, 0.6], bw: [0.1, 0.1] };
    expect(validarForma(base)).toEqual([]);
    expect(validarForma({ ...base, bw: [0.7, 0.1] }).join(' ')).toMatch(/largura da nervura maior/);
    expect(validarForma({ ...base, altura: 0 }).join(' ')).toMatch(/Altura/);
    expect(validarForma({ ...base, tipo: 'perdida' }).join(' ')).toMatch(/enchimento/);
    expect(validarForma({ ...base, tipo: 'perdida', enchimento: 'nada' }).join(' ')).toMatch(/não existe/);
    expect(validarForma({ ...base, pecas: 0 }).join(' ')).toMatch(/peças/);
  });
});

describe('rigidez equivalente da nervura em T (E3c)', () => {
  const g = geometriaBidirecional(undefined, T);
  it('inércia da seção T à mão: yc = 0,2375 m, I = 6,906e-4 m⁴; altura maciça equivalente 24,0 cm', () => {
    const s = secaoT(0.6, 0.05, 0.1, 0.35);
    expect(s.yc).toBeCloseTo(0.2375, 9);
    expect(s.I).toBeCloseTo(6.90625e-4, 10);
    expect(alturaMacicaEquivalente(g, 0)).toBeCloseTo(0.23993, 4);
  });
  it('perfil NBR: faixa de 20 cm = 1/3 da nervura em T na zona aliviada e laje maciça na zona maciça', () => {
    const p = propBarraNervurada(g, 0, 0.2, false, nbr);
    expect(p.I).toBeCloseTo((0.2 / 0.6) * 6.90625e-4, 10);
    expect(p.A).toBeCloseTo((0.2 / 0.6) * (0.6 * 0.05 + 0.1 * 0.3), 10);
    const m = propBarraNervurada(g, 0, 0.2, true, nbr);
    expect(m.I).toBeCloseTo((0.2 * 0.35 ** 3) / 12, 12);
    expect(m.J).toBeCloseTo(2 * m.I * nbr.torcaoLaje, 12);
    // torção da zona aliviada = n × constante de torção do retângulo 10 × 35 (Saint-Venant) × redutor
    expect(p.J).toBeGreaterThan(0);
    expect(p.J).toBeLessThan(p.I);
  });
  it('padrão do sistema: metade da inércia da faixa maciça, igual nas duas zonas, torção = 2 × flexão', () => {
    const a = propBarraNervurada(g, 1, 0.2, false, sistema), m = propBarraNervurada(g, 1, 0.2, true, sistema);
    const Is = (0.2 * 0.35 ** 3) / 12;
    expect(a.I).toBeCloseTo(0.5 * Is, 12);
    expect(m.I).toBeCloseTo(0.5 * Is, 12);
    expect(a.J).toBeCloseTo(2 * a.I, 12);
    expect(m.J).toBeCloseTo(2 * m.I, 12);
  });
  it('mistura linear por fração maciça e passo da malha = 1/3 do intereixo', () => {
    const a = propBarraNervurada(g, 0, 0.2, false, nbr), m = propBarraNervurada(g, 0, 0.2, true, nbr), x = propBarraNervuradaMista(g, 0, 0.2, 0.25, nbr);
    expect(x.I).toBeCloseTo(0.75 * a.I + 0.25 * m.I, 14);
    expect(propBarraNervuradaMista(g, 0, 0.2, 0, nbr)).toEqual(a);
    expect(passoMalhaNervurada(g, sistema)).toBeCloseTo(0.2, 12);
    expect(passoMalhaNervurada(g, { nervuradaMalha: 0.5 })).toBeCloseTo(0.3, 12);
  });
});

/** Placa quadrada a × a apoiada no contorno, pela grelha com as propriedades da nervurada; flecha central adimensional w·D/(q·a⁴) (D = EI por metro de nervura). */
function placaNervurada(op: typeof sistema | typeof nbr, torcao0 = false) {
  const a = 6, q = 10, E = 30e6, G = E / 2, g = geometriaBidirecional(undefined, T), sp = passoMalhaNervurada(g, op);
  const mm = malhaLaje([[0, 0], [a, 0], [a, a], [0, a]], 0, sp);
  const nos: [number, number, number][] = [], idx = new Map<string, number>();
  const no = (p: P) => { const k = `${p[0].toFixed(6)}:${p[1].toFixed(6)}`; if (!idx.has(k)) { idx.set(k, nos.length); nos.push([p[0], p[1], 0]); } return idx.get(k)!; };
  const m: Modelo3 = { nos, barras: [], apoios: new Map() };
  const caso: Caso3 = { nodais: [], distribuidas: [] };
  const o = torcao0 ? { ...op, nervuradaTorcao: 0, torcaoLaje: 0 } : op;
  const barra = (i: number, j: number, k: 0 | 1, w: number) => { const p = propBarraNervurada(g, k, w, false, o); m.barras.push({ i, j, E, G, A: p.A, Iz: p.I, Iy: p.I, J: p.J }); };
  for (const ln of mm.linhas) for (let j = 0; j + 1 < ln.pontos.length; j++) {
    barra(no(ln.pontos[j]), no(ln.pontos[j + 1]), ln.dir, ln.largura);
    caso.distribuidas.push({ barra: m.barras.length - 1, q: [0, 0, -q * ln.largura * 0.5] });
  }
  for (const e of mm.bordas) barra(no(e.a), no(e.z), Math.abs(e.z[0] - e.a[0]) > 1e-9 ? 0 : 1, sp / 2);
  const borda = (p: [number, number, number]) => [p[0], p[1]].some((v) => Math.abs(v) < 1e-9 || Math.abs(v - a) < 1e-9);
  nos.forEach((p, i) => m.apoios.set(i, borda(p) ? [0, 1, 2, 5] : [0, 1, 5]));
  const r = resolver3(m, [caso]);
  expect(r.erro).toBeUndefined();
  const wc = -r.desloc[0][no([a / 2, a / 2]) * 6 + 2];
  const D = torcao0 ? (E * secaoT(g.i[0], g.capa, g.bw[0], g.h).I) / g.i[0] : o.nervuradaInercia * ((E * g.h ** 3) / 12);
  return (wc * D) / (q * a ** 4);
}

describe('grelha da nervurada contra a teoria de placas', () => {
  it('padrão do sistema (D = ½·E·h³/12, J = 2I, ν = 0): α = 0,00406 de Navier, erro < 5 %', () => {
    const alfa = placaNervurada(sistema);
    expect(Math.abs(alfa - 0.00406) / 0.00406).toBeLessThan(0.05);
  });
  it('seção T real sem torção (grelha ortótropa): α = 0,00820 da série de Navier, erro < 5 %', () => {
    const alfa = placaNervurada(nbr, true);
    expect(Math.abs(alfa - 0.0082042) / 0.0082042).toBeLessThan(0.05);
  });
});

describe('verificações geométricas da NBR 6118 (13.2.4.2) [item a confirmar]', () => {
  const geo = (forma: Partial<FormaLaje>, capa = 0.05, h = 0.35) => {
    const fm: FormaLaje = { id: 'v', nome: 'V', tipo: 'recuperavel', altura: h - capa, pecas: 1, intereixo: [0.6, 0.6], bw: [0.1, 0.1], ...forma };
    return geometriaBidirecional({ ...edificioVazio(), tiposLaje: { formas: [fm] } }, { tipo: 'nervurada', forma: 'v', hTotal: h, capa });
  };
  const cod = (g: ReturnType<typeof geo>, min = 0.04) => verificarGeometria(g, min).avisos.map((a) => a.codigo);
  it('mesa: ≥ 1/15 da distância livre e ≥ 4 cm (5 cm com tubulações)', () => {
    expect(cod(geo({}, 0.05))).toEqual([]);
    expect(cod(geo({}, 0.035, 0.335))).toContain('NERV_MESA');
    // livre 70 cm → 1/15 = 4,67 cm
    expect(cod(geo({ intereixo: [0.8, 0.8] }, 0.045, 0.345))).toContain('NERV_MESA');
    expect(cod(geo({ intereixo: [0.8, 0.8] }, 0.05, 0.35))).not.toContain('NERV_MESA');
    expect(cod(geo({}, 0.045, 0.345), 0.05)).toContain('NERV_MESA');
    expect(verificarGeometria(geo({}), 0.04).capaMin).toBeCloseTo(0.04, 12);
  });
  it('nervura: < 5 cm é erro; < 8 cm só informa a falta de armadura de compressão', () => {
    expect(cod(geo({ bw: [0.045, 0.1] }))).toContain('NERV_NERVURA');
    const c = cod(geo({ bw: [0.07, 0.1] }));
    expect(c).toContain('NERV_COMPRESSAO');
    expect(c).not.toContain('NERV_NERVURA');
  });
  it('espaçamento: ≤ 65 laje; 65–110 viga (laje até 90 cm com nervura ≥ 12 cm); > 110 mesa como maciça', () => {
    expect(verificarGeometria(geo({})).regime).toEqual(['laje', 'laje']);
    expect(verificarGeometria(geo({ intereixo: [0.8, 0.8] }, 0.06, 0.36)).regime).toEqual(['viga', 'viga']);
    expect(verificarGeometria(geo({ intereixo: [0.8, 0.8], bw: [0.12, 0.12] }, 0.06, 0.36)).regime).toEqual(['laje', 'laje']);
    expect(verificarGeometria(geo({ intereixo: [1, 1], bw: [0.12, 0.12] }, 0.07, 0.37)).regime).toEqual(['viga', 'viga']);
    const grande = verificarGeometria(geo({ intereixo: [1.2, 0.6] }, 0.09, 0.39));
    expect(grande.regime).toEqual(['macica', 'laje']);
    expect(grande.avisos.map((a) => [a.codigo, a.severidade])).toContainEqual(['NERV_ESPACAMENTO_MAX', 'erro']);
    expect(verificarGeometria(geo({ intereixo: [0.8, 0.8] }, 0.06, 0.36)).avisos.map((a) => [a.codigo, a.severidade])).toContainEqual(['NERV_ESPACAMENTO', 'aviso']);
    expect(cod(geo({}))).not.toContain('NERV_ESPACAMENTO');
  });
  it('cubeta de altura diferente de h − capa avisa', () => {
    const g = geo({ altura: 0.25 }, 0.05, 0.35);
    expect(avisosForma(g).map((a) => a.codigo)).toEqual(['NERV_FORMA']);
    expect(avisosForma(geo({}))).toEqual([]);
  });
});

describe('arranjo das nervuras e das cubetas', () => {
  const quadrado = (a: number, b = a): P[] => [[0, 0], [a, 0], [a, b], [0, b]];
  const g = geometriaBidirecional(undefined, T);
  it('pano 6 × 6, nervuras de 60 em 60 cm a partir do canto: 9 + 9 nervuras e 8 × 8 cubetas inteiras; resto maciço', () => {
    const arr = arranjoNervuras({ contorno: quadrado(6) }, g);
    expect(arr.nervuras.filter((n) => n.dir === 0)).toHaveLength(9);
    expect(arr.nervuras.filter((n) => n.dir === 1)).toHaveLength(9);
    expect(arr.cubetas).toHaveLength(64);
    expect(arr.nervuras.every((n) => Math.abs(n.L - 6) < 1e-9)).toBe(true);
    // zona aliviada = de 0,6 a 5,4 m; a margem de 60 cm é maciça
    expect(arr.aliviada([3, 3])).toBe(true);
    expect(arr.aliviada([0.3, 3])).toBe(false);
    expect(arr.aliviada([5.7, 3])).toBe(false);
    const q = quantitativoNervurada({ contorno: quadrado(6) }, g, arr);
    expect(q.cubetas).toBe(64);
    expect(q.areaMacica).toBeCloseTo(36 - 64 * 0.36, 9);
    expect(q.volumeConcreto).toBeCloseTo(36 * 0.35 - 64 * 0.25 * 0.3, 9);
    expect(q.ppMedio).toBeCloseTo((25 * (36 * 0.35 - 64 * 0.25 * 0.3)) / 36, 9);
    expect(q.areaFormaCubetas).toBeCloseTo(64 * (4 * 0.5 * 0.3 + 0.25), 9);
    expect(q.volumeEnchimento).toBe(0);
  });
  it('ponto de passagem desloca o arranjo; fração maciça simétrica nos eixos das nervuras', () => {
    const arr = arranjoNervuras({ contorno: quadrado(6), pontoNervuras: [0.3, 0.3] }, g);
    const ys = arr.nervuras.filter((n) => n.dir === 0).map((n) => n.c);
    expect(ys[0]).toBeCloseTo(0.3, 9);
    expect(ys.length).toBe(10);
    const sim = arranjoNervuras({ contorno: quadrado(6) }, g);
    // faixa de 20 cm centrada num eixo de nervura vizinho à margem: metade maciça
    expect(sim.fracMacica([3, 0.6], 0, 0.2)).toBeCloseTo(0.5, 12);
    expect(sim.fracMacica([3, 5.4], 0, 0.2)).toBeCloseTo(0.5, 12);
    expect(sim.fracMacica([3, 3], 0, 0.2)).toBe(0);
    expect(sim.fracMacica([0.3, 3], 0, 0.2)).toBe(1);
  });
  it('furo, zona maciça manual e faixa junto à viga tiram cubetas', () => {
    const base = arranjoNervuras({ contorno: quadrado(6) }, g).cubetas.length;
    const furo = arranjoNervuras({ contorno: quadrado(6), furos: [[[2.5, 2.5], [3.5, 2.5], [3.5, 3.5], [2.5, 3.5]]] }, g).cubetas.length;
    expect(furo).toBeLessThan(base);
    const zona = arranjoNervuras({ contorno: quadrado(6), zonasMacicas: [[[0.5, 0.5], [2.5, 0.5], [2.5, 2.5], [0.5, 2.5]]] }, g).cubetas.length;
    expect(zona).toBeLessThan(base);
    const faixa = arranjoNervuras({ contorno: quadrado(6) }, g, 1).cubetas.length;
    expect(faixa).toBeLessThan(base);
    // direção girada de 30°: continua com nervuras nas duas direções
    const gir = arranjoNervuras({ contorno: quadrado(6), direcao: 30 }, g);
    expect(gir.nervuras.some((n) => n.dir === 0)).toBe(true);
    expect(gir.nervuras.some((n) => n.dir === 1)).toBe(true);
    expect(gir.cubetas.length).toBeGreaterThan(0);
  });
  it('intereixos distintos em X e Y', () => {
    const fm: FormaLaje = { id: 'r', nome: 'R', tipo: 'recuperavel', altura: 0.3, pecas: 1, intereixo: [0.6, 0.9], bw: [0.1, 0.12] };
    const gr = geometriaBidirecional({ ...edificioVazio(), tiposLaje: { formas: [fm] } }, { ...T, forma: 'r' });
    const arr = arranjoNervuras({ contorno: quadrado(6, 4) }, gr);
    // nervuras da direção 0 a cada 0,6 em y (4 m → 6), da direção 1 a cada 0,9 em x (6 m → 6)
    expect(arr.nervuras.filter((n) => n.dir === 0)).toHaveLength(6);
    expect(arr.nervuras.filter((n) => n.dir === 1)).toHaveLength(6);
    expect(gr.cubeta).toBeCloseTo((0.9 - 0.12) * (0.6 - 0.1), 12);
  });
});
