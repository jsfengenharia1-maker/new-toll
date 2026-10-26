// Cortes do edifício nas pranchas (V6a, C3.31 e C3.33): marcas nas plantas, folha de cortes e comando prancha.cortes.
import { describe, expect, it } from 'vitest';
import { readDxf } from 'nasjidwg';
import { aplicarComando } from '../commands';
import { edificioExemplo } from './exemplo';
import { montarConjunto } from './conjunto';
import { cortesAtivos, montarPranchasCortes, primitivasMarcasCorte, recortarPolilinha } from './cortes';
import { escreverDxf } from './dxf';
import { escreverPdf } from './pdf';
import { svgPrancha } from './svg';
import { desenharCorte } from '../vista3d/corte';
import { construirCena } from '../vista3d/cena';
import { peDireito, pavimentosOrdenados, type BuildingModel } from '../building/types';
import type { Prancha, Prim } from './prancha';

const txt = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

/** Exemplo com o corte longitudinal y = 4,5 (sobre os pilares do eixo central) ativado nas pranchas. */
function comCorte(extra: Record<string, unknown> = {}): BuildingModel {
  let b = edificioExemplo().modelo;
  let r = aplicarComando(b, 'corte.criar', { nome: 'Corte AA', pontos: [[-1, 4.5], [6, 4.5]], sentido: 'esq' });
  expect(r.ok).toBe(true);
  b = r.modelo;
  r = aplicarComando(b, 'prancha.cortes', { ids: [b.cortes![0].id], ...extra });
  expect(r.ok, JSON.stringify(r.erros)).toBe(true);
  return r.modelo;
}
const prims = (pr: Prancha, c: string): Prim[] => [...pr.modelo, ...pr.papel].filter((q) => q.c === c);
const caixa = (ps: [number, number][]) => ({ x0: Math.min(...ps.map((p) => p[0])), x1: Math.max(...ps.map((p) => p[0])), y0: Math.min(...ps.map((p) => p[1])), y1: Math.max(...ps.map((p) => p[1])) });

describe('recorte da linha de corte', () => {
  it('segmento horizontal e diagonal contra o retângulo', () => {
    expect(recortarPolilinha([[-5, 0], [5, 0]], [-1, -1, 2, 1])).toEqual([[[-1, 0], [2, 0]]]);
    const d = recortarPolilinha([[0, 0], [10, 10]], [2, 0, 6, 10]);
    expect(d).toHaveLength(1);
    expect(d[0][0][0]).toBeCloseTo(2, 9); expect(d[0][0][1]).toBeCloseTo(2, 9);
    expect(d[0][1][0]).toBeCloseTo(6, 9); expect(d[0][1][1]).toBeCloseTo(6, 9);
  });
  it('fora do retângulo: nada; poligonal em L contígua forma um só trecho', () => {
    expect(recortarPolilinha([[5, 5], [8, 5]], [0, 0, 2, 2])).toEqual([]);
    const l = recortarPolilinha([[0, 1], [3, 1], [3, 4]], [-1, 0, 5, 5]);
    expect(l).toEqual([[[0, 1], [3, 1], [3, 4]]]);
  });
});

describe('marcas de corte nas plantas', () => {
  it('linha recortada 12 mm além da geometria, traço de 10 mm e seta de visada para a esquerda do traçado', () => {
    const b = comCorte(), k = 0.05; // 1:50 → 0,05 m por mm
    const ps = primitivasMarcasCorte(b, k, [0, 0, 15, 9]);
    const linha = ps.filter((p) => p.c === 'CORTE');
    expect(linha).toHaveLength(1);
    // caixa [0,0,15,9] + 0,6 m: a linha y = 4,5 de x = -1 a 6 fica de x = -0,6 a 6
    const lp = (linha[0] as { pts: [number, number][] }).pts;
    expect(lp[0][0]).toBeCloseTo(-0.6, 9); expect(lp[0][1]).toBe(4.5); expect(lp[1]).toEqual([6, 4.5]);
    const marcas = ps.filter((p) => p.c === 'CORTE-MARCA') as { pts: [number, number][] }[];
    // por ponta: traço inward (0,5 m), haste da seta (0,5 m) e duas farpas
    expect(marcas).toHaveLength(8);
    expect(marcas[0].pts[1][0]).toBeCloseTo(-0.1, 9); expect(marcas[0].pts[1][1]).toBe(4.5);
    const haste = marcas[1].pts; // olhando para a esquerda de quem anda em +x: +y
    expect(haste[0][0]).toBeCloseTo(-0.6, 9);
    expect(haste[1][0]).toBeCloseTo(-0.6, 9); expect(haste[1][1]).toBeCloseTo(5, 9);
    expect(marcas[4].pts[0][0]).toBeCloseTo(6, 9);
    expect(marcas[4].pts[1][0]).toBeCloseTo(5.5, 9);
    const nomes = ps.filter((p) => p.t === 'txt') as { s: string }[];
    expect(nomes.map((n) => n.s)).toEqual(['Corte AA', 'Corte AA']);
  });

  it('sentido dir: a seta aponta para o outro lado; marca de 20 mm dobra o tamanho', () => {
    let b = comCorte({ marca: 20 });
    b = aplicarComando(b, 'corte.editar', { id: b.cortes![0].id, sentido: 'dir' }).modelo;
    const ps = primitivasMarcasCorte(b, 0.05, [0, 0, 15, 9]);
    const marcas = ps.filter((p) => p.c === 'CORTE-MARCA') as { pts: [number, number][] }[];
    expect(marcas[0].pts[1][0]).toBeCloseTo(0.4, 9); // -0,6 + 1,0
    expect(marcas[1].pts[1][1]).toBeCloseTo(3.5, 9); // 4,5 − 1,0
  });

  it('plantas restritas, corte inativo ou fora da planta: sem marca', () => {
    const b = comCorte({ plantas: ['g_3'] });
    expect(primitivasMarcasCorte(b, 0.05, [0, 0, 15, 9], 'g_3').length).toBeGreaterThan(0);
    expect(primitivasMarcasCorte(b, 0.05, [0, 0, 15, 9], 'outro_grupo')).toEqual([]);
    expect(primitivasMarcasCorte(b, 0.05, [100, 100, 110, 110], 'g_3')).toEqual([]);
    const off = aplicarComando(b, 'prancha.cortes', { ids: [] }).modelo;
    expect(primitivasMarcasCorte(off, 0.05, [0, 0, 15, 9])).toEqual([]);
  });

  it('planta de formas e locação levam a marca só com o corte ativo', () => {
    const b = comCorte(), sem = { ...b, prancha: { ...b.prancha!, cortes: undefined } };
    const f = montarConjunto(b, null, null, { tipos: ['formas', 'locacao'] }).pranchas;
    const f0 = montarConjunto(sem, null, null, { tipos: ['formas', 'locacao'] }).pranchas;
    expect(f).toHaveLength(f0.length);
    for (const pr of f) { expect(prims(pr, 'CORTE').length).toBeGreaterThan(0); expect(prims(pr, 'CORTE-MARCA').length).toBeGreaterThan(0); }
    for (const pr of f0) expect(prims(pr, 'CORTE')).toEqual([]);
  });
});

describe('folha de cortes', () => {
  it('um corte: folha SCT com a hachura de cada polígono seccionado e pilares na escala (largura 0,20 m = 4 mm em 1:50)', () => {
    const b = comCorte({ escala: 50 }), pr = montarPranchasCortes(b, null, null);
    expect(pr).toHaveLength(1);
    const f = pr[0];
    expect(f.tipo).toBe('cortes'); expect(f.escala).toBe(50); expect(f.titulo).toBe('Cortes');
    const des = desenharCorte(b, b.cortes![0], { cena: construirCena(b) });
    const hach = f.papel.filter((q) => q.t === 'hach') as { pts: [number, number][] }[];
    expect(hach).toHaveLength(des.cena.secoes.length);
    expect(des.cena.secoes.length).toBeGreaterThan(3);
    // pilares do eixo y = 4,5: seção de 0,20 m de largura → 4 mm; altura = pé-direito do lance × 20 mm/m
    const pil = des.cena.secoes.filter((s) => s.tipo === 'pilar');
    expect(pil.length).toBeGreaterThan(0);
    const alturas = hach.map((h) => caixa(h.pts)).filter((c) => Math.abs(c.x1 - c.x0 - 4) < 1e-6).map((c) => c.y1 - c.y0);
    expect(alturas.length).toBe(pil.length);
    for (const s of pil) expect(alturas.some((h) => Math.abs(h - peDireito(b, s.pavimento) * 20) < 1e-6)).toBe(true);
    // nível de cada pavimento: uma linha de eixo e a cota no texto
    const ps = pavimentosOrdenados(b);
    const textos = f.papel.filter((q) => q.t === 'txt').map((q) => (q as { s: string }).s);
    for (const p of ps) expect(textos.some((s) => s.startsWith(`${p.nome} (`))).toBe(true);
    expect(textos).toContain('CORTE AA');
    expect(textos).toContain('CORTES DO EDIFÍCIO');
    expect(f.elementos).toEqual(['Corte AA']);
  });

  it('escala automática escolhe a maior em que cabe; escala fixa maior vira mais folhas', () => {
    const b = comCorte();
    const auto = montarPranchasCortes(b, null, null);
    expect(auto).toHaveLength(1);
    expect([50, 75, 100, 125, 200]).toContain(auto[0].escala);
    const f20 = montarPranchasCortes(comCorte({ escala: 20 }), null, null);
    expect(f20.length).toBeGreaterThanOrEqual(1);
    expect(f20[0].escala).toBe(20);
  });

  it('dois cortes: uma folha com os dois e o quadro; nenhum ativo: nenhuma folha', () => {
    let b = comCorte({ escala: 100 });
    b = aplicarComando(b, 'corte.criar', { nome: 'Corte BB', pontos: [[2.5, -1], [2.5, 10]], sentido: 'dir', profundidade: 3 }).modelo;
    b = aplicarComando(b, 'prancha.cortes', { todos: true }).modelo;
    expect(cortesAtivos(b).map((c) => c.nome)).toEqual(['Corte AA', 'Corte BB']);
    const pr = montarPranchasCortes(b, null, null);
    expect(pr).toHaveLength(1);
    expect(pr[0].elementos).toEqual(['Corte AA', 'Corte BB']);
    const t = pr[0].papel.filter((q) => q.t === 'txt').map((q) => (q as { s: string }).s);
    expect(t).toContain('CORTE AA'); expect(t).toContain('CORTE BB');
    expect(t.some((s) => s.includes('até 3,00 m'))).toBe(true);
    expect(montarPranchasCortes(aplicarComando(b, 'prancha.cortes', { todos: false }).modelo, null, null)).toEqual([]);
  });

  it('conjunto: tipo cortes por nome; "todas" só inclui com corte ativo; numeração e escritores', () => {
    const b = comCorte({ escala: 100 });
    const so = montarConjunto(b, null, null, { tipos: 'cortes' });
    expect(so.pranchas).toHaveLength(1); expect(so.avisos).toEqual([]);
    const todas = montarConjunto(b, null, null, { tipos: 'todas' }).pranchas;
    expect(todas.some((p) => p.tipo === 'cortes')).toBe(true);
    const sem = montarConjunto(aplicarComando(b, 'prancha.cortes', { ids: [] }).modelo, null, null, { tipos: 'todas' });
    expect(sem.pranchas.some((p) => p.tipo === 'cortes')).toBe(false);
    expect(montarConjunto(aplicarComando(b, 'prancha.cortes', { ids: [] }).modelo, null, null, { tipos: 'cortes' }).avisos[0]).toMatch(/nenhum corte ativado/);
    const pr = so.pranchas[0];
    expect(txt(escreverPdf([pr]).slice(0, 5))).toBe('%PDF-');
    const dxf = readDxf(escreverDxf(pr, {}));
    expect(dxf).toBeTruthy();
    expect(svgPrancha(pr)).toContain('SCT');
  });
});

describe('comando prancha.cortes', () => {
  it('grava e volta ao padrão (valores iguais ao padrão não ficam no modelo)', () => {
    const b0 = edificioExemplo().modelo;
    const c = aplicarComando(b0, 'corte.criar', { pontos: [[0, 1], [6, 1]] }).modelo, id = c.cortes![0].id;
    const r = aplicarComando(c, 'prancha.cortes', { ids: [id], escala: 75, marca: 15, plantas: ['g_3'] });
    expect(r.ok).toBe(true);
    expect(r.modelo.prancha!.cortes).toEqual({ ids: [id], escala: 75, marca: 15, plantas: ['g_3'] });
    const v = aplicarComando(r.modelo, 'prancha.cortes', { escala: 0, marca: 10, plantas: [] });
    expect(v.modelo.prancha!.cortes).toEqual({ ids: [id] });
    expect(aplicarComando(v.modelo, 'prancha.cortes', { padrao: true }).modelo.prancha?.cortes).toBeUndefined();
  });
  it('recusa corte, grupo e marca inválidos', () => {
    const b = edificioExemplo().modelo;
    expect(aplicarComando(b, 'prancha.cortes', { ids: ['nao'] }).erros[0].codigo).toBe('CORTE_INEXISTENTE');
    expect(aplicarComando(b, 'prancha.cortes', { plantas: ['nao'] }).erros[0].codigo).toBe('GRUPO_INEXISTENTE');
    expect(aplicarComando(b, 'prancha.cortes', { marca: 2 }).ok).toBe(false);
    expect(aplicarComando(b, 'prancha.cortes', { escala: 33 }).ok).toBe(false);
  });
});
