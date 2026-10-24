// V7d: formato e margens livres (K1.11.54), símbolos por estado do pilar (K1.4.57), escolha do mapa da folha de resultados (K1.11.62).
import { describe, expect, it } from 'vitest';
import { edificioExemplo } from './exemplo';
import { montarConjunto } from './conjunto';
import { areaDesenho, dimensoesFolha, margens, validarFolha, FORMATOS, LARGURA_LEGENDA, type Prancha } from './prancha';
import { escreverDxf } from './dxf';
import { escreverPdf } from './pdf';
import { svgPrancha } from './svg';
import { SIMBOLOS_PADRAO } from '../building/types';
import { primitivasDoSimbolo, simboloDoEstado, tracoDaPrimitiva } from './simbolos';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';

const formas = (s = edificioExemplo()) => montarConjunto(s.modelo, null, null, { tipos: 'formas' }).pranchas[0];
const caixaDe = (pr: Prancha, camada: string) => {
  const pts = pr.papel.filter((q) => q.t === 'pl' && q.c === camada).flatMap((q) => (q.t === 'pl' ? q.pts : []));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

describe('formato e margens livres (K1.11.54)', () => {
  it('padrão: A0 a A4 inalterados, margens 20 / 10 / 7', () => {
    expect(dimensoesFolha('A3')).toEqual([420, 297]);
    expect(margens('A1')).toEqual({ esq: 20, outras: 10 });
    expect(margens('A3')).toEqual({ esq: 20, outras: 7 });
  });

  it('folha livre 500 × 330 com margens 15 / 5: tamanho, moldura e janela da planta conferem', () => {
    const s = edificioExemplo();
    expect(s.executar('prancha.definir', { formato: 'livre', folha: { largura: 500, altura: 330, margemEsq: 15, margem: 5 } }).ok).toBe(true);
    const pr = formas(s);
    expect(pr.formato).toBe('livre');
    expect([pr.W, pr.H]).toEqual([500, 330]);
    const m = caixaDe(pr, 'FOLHA');
    expect([m.x0, m.y0, m.x1, m.y1]).toEqual([15, 5, 495, 325]);
    const j = pr.janela!;
    expect(j.x0).toBeGreaterThanOrEqual(15 + 5 - 1e-9);
    expect(j.x1).toBeLessThanOrEqual(500 - 5 - LARGURA_LEGENDA - 10 + 1e-9);
    expect(j.y0).toBeGreaterThanOrEqual(5 + 18 - 1e-9);
    expect(j.y1).toBeLessThanOrEqual(330 - 5 - 5 + 1e-9);
    expect(pr.papel.filter((q) => q.t === 'txt' && q.s === 'SCF').length).toBe(1);
  });

  it('as margens valem também nos formatos A0–A4 e não vazam para a montagem seguinte', () => {
    const s = edificioExemplo();
    expect(s.executar('prancha.definir', { formato: 'A1', folha: { margemEsq: 30, margem: 12 } }).ok).toBe(true);
    const m = caixaDe(formas(s), 'FOLHA');
    expect([m.x0, m.y0, m.x1, m.y1]).toEqual([30, 12, 841 - 12, 594 - 12]);
    expect(margens('A1')).toEqual({ esq: 20, outras: 10 });
    expect(dimensoesFolha('livre')).toEqual(FORMATOS.livre);
    expect(s.executar('prancha.definir', { folhaPadrao: true }).ok).toBe(true);
    expect(s.modelo.prancha!.folha).toBeUndefined();
    const p2 = caixaDe(formas(s), 'FOLHA');
    expect([p2.x0, p2.y0, p2.x1, p2.y1]).toEqual([20, 10, 841 - 10, 594 - 10]);
  });

  it('formato livre sem dimensões = A3, sem marcas de dobra; planta que não cabe gera aviso', () => {
    const s = edificioExemplo();
    expect(s.executar('prancha.definir', { formato: 'livre' }).ok).toBe(true);
    const pr = formas(s);
    expect([pr.W, pr.H]).toEqual([420, 297]);
    const finas = (p: Prancha) => p.papel.filter((q) => q.t === 'pl' && q.c === 'FOLHA-FINA' && q.pts.length === 2).length;
    s.executar('prancha.definir', { formato: 'A3' });
    expect(finas(pr)).toBeLessThan(finas(formas(s)));
    s.executar('prancha.definir', { formato: 'livre' });
    expect(s.executar('prancha.definir', { folha: { largura: 300, altura: 220 }, escala: 20 }).ok).toBe(true);
    expect(formas(s).avisos.some((a) => a.includes('não cabe'))).toBe(true);
  });

  it('validação: lados e margens fora dos limites e área útil insuficiente são recusados', () => {
    const s = edificioExemplo();
    expect(s.executar('prancha.definir', { folha: { largura: 100 } }).ok).toBe(false);
    expect(s.executar('prancha.definir', { folha: { margem: 150 } }).ok).toBe(false);
    const r = s.executar('prancha.definir', { folha: { largura: 300, altura: 200, margemEsq: 80, margem: 40 } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].mensagem).toContain('área útil');
    expect(validarFolha({ largura: 420, altura: 297 })).toEqual([]);
    expect(s.modelo.prancha?.folha).toBeUndefined();
    const a = areaDesenho('A3');
    expect(a.x1 - a.x0).toBeCloseTo(420 - 7 - LARGURA_LEGENDA - 10 - (20 + 5), 9);
  });

  it('PDF, SVG e DXF da folha livre saem com as dimensões do usuário', () => {
    const s = edificioExemplo();
    s.executar('prancha.definir', { formato: 'livre', folha: { largura: 500, altura: 330 } });
    const pr = formas(s);
    expect(Array.from(escreverPdf([pr]), (c) => String.fromCharCode(c)).join('')).toMatch(/MediaBox \[0 0 1417\.3\d* 935\.4\d*\]/);
    expect(svgPrancha(pr)).toContain('0 0 500 330');
    expect(escreverDxf(pr).length).toBeGreaterThan(1000);
  });
});

describe('símbolos por estado do pilar (K1.4.57)', () => {
  const c: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  it('chega usa "passa", morre usa "morre", nasce usa "nasce"', () => {
    const s = { passa: 'cruz', nasce: 'solido', morre: 'vazio' } as const;
    expect(simboloDoEstado('chega', s)).toBe('cruz');
    expect(simboloDoEstado('morre', s)).toBe('vazio');
    expect(simboloDoEstado('nasce', s)).toBe('solido');
    expect([simboloDoEstado('chega', SIMBOLOS_PADRAO), simboloDoEstado('nasce', SIMBOLOS_PADRAO)]).toEqual(['hachura', 'tracejado']);
  });
  it('traço do canvas de cada primitiva dos cinco símbolos', () => {
    const tr = (v: Parameters<typeof primitivasDoSimbolo>[0]) => primitivasDoSimbolo(v, c).map(tracoDaPrimitiva);
    expect(tr('hachura')).toEqual(['hachurado', 'contorno']);
    expect(tr('solido')).toEqual(['preenchido', 'contorno']);
    expect(tr('tracejado')).toEqual(['tracejado']);
    expect(tr('cruz')).toEqual(['contorno', 'fino', 'fino']);
    expect(tr('vazio')).toEqual(['contorno']);
  });
});

describe('folha de resultados: grandeza e hipótese escolhidas na obra (K1.11.62)', { timeout: 120000 }, () => {
  const s = edificioExemplo(), b0 = s.modelo, an = analisarEdificio(b0), dim = dimensionarEdificio(b0, an);
  it('padrão = deslocamento vertical na quase permanente; "Mx" na hipótese G muda o mapa; grandeza do radier recusada', () => {
    const padrao = montarConjunto(b0, an, dim, { tipos: 'resultados' }).pranchas;
    expect(padrao.length).toBeGreaterThan(0);
    expect(padrao[0].papel.some((q) => q.t === 'txt' && /DESLOCAMENTO VERTICAL/.test(q.s))).toBe(true);
    expect(s.executar('prancha.definir', { resultados: { grandeza: 'Mx', hipotese: 'caso:G' } }).ok).toBe(true);
    expect(s.modelo.prancha!.resultados).toEqual({ grandeza: 'Mx', hipotese: 'caso:G' });
    const mx = montarConjunto(s.modelo, an, dim, { tipos: 'resultados' }).pranchas;
    expect(mx.length).toBe(padrao.length);
    expect(mx[0].papel.some((q) => q.t === 'txt' && /MOMENTO MX/.test(q.s))).toBe(true);
    expect(mx[0].papel.some((q) => q.t === 'txt' && /DESLOCAMENTO VERTICAL/.test(q.s))).toBe(false);
    expect(s.executar('prancha.definir', { resultados: { grandeza: 'rW' } }).ok).toBe(false);
    expect(s.executar('prancha.definir', { resultados: { grandeza: 'xyz' } }).ok).toBe(false);
    expect(s.executar('prancha.definir', { resultados: { grandeza: '', hipotese: '' } }).ok).toBe(true);
    expect(s.modelo.prancha!.resultados).toBeUndefined();
  });
});
