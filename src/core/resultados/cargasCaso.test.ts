import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { TODAS_CLASSES_CARGA, cargasPorGrupoECaso, classeDoCaso, legendaDeCargas, metrosPorKNVento, setasDeVento, tabelaVento, ventoPorPavimento } from './cargasCaso';

function predio() {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('lote', { comandos: [[0, 0], [6, 0], [6, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  ok('lote', { comandos: [v([[0, 0], [6, 0]]), v([[0, 5], [6, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]])] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}

describe('cargas por caso (K1.11.11, K1.11.62)', () => {
  it('classes por natureza e por caso adicional; legenda só dos casos com carga', () => {
    const { s, ok } = predio();
    ok('caso.criar', { nome: 'Água', natureza: 'Q' });
    ok('caso.criar', { nome: 'Forro', natureza: 'G' });
    const b0 = s.modelo, [agua, forro] = b0.casos!;
    ok('carga.linha', { grupo: 'g_3', caso: 'G', valor: 5, pontos: [[0, 0], [6, 0]] });
    ok('carga.ponto', { grupo: 'g_3', caso: 'Q', valor: 10, ponto: [3, 2] });
    ok('carga.ponto', { grupo: 'g_3', caso: agua.id, valor: 7, ponto: [2, 2] });
    ok('carga.linha', { grupo: 'g_3', caso: forro.id, valor: 2, pontos: [[0, 5], [6, 5]] });
    const b = s.modelo;
    expect(classeDoCaso(b, 'G')).toBe('carga-caso-g');
    expect(classeDoCaso(b, 'Q')).toBe('carga-caso-q');
    expect(classeDoCaso(b, agua.id)).toBe('carga-caso-adic-0');
    expect(classeDoCaso(b, forro.id)).toBe('carga-caso-adic-1');
    expect(TODAS_CLASSES_CARGA).toContain(classeDoCaso(b, forro.id));
    expect(new Set(TODAS_CLASSES_CARGA).size).toBe(TODAS_CLASSES_CARGA.length);
    const leg = legendaDeCargas(b, 'g_3');
    expect(leg.map((e) => e.caso)).toEqual(['G', 'Q', agua.id, forro.id]);
    expect(leg.every((e) => e.n === 1)).toBe(true);
    expect(new Set(leg.map((e) => e.classe)).size).toBe(4);
    expect(legendaDeCargas(b, 'g_inexistente')).toEqual([]);
    const g = cargasPorGrupoECaso(b).filter((x) => x.grupo === 'g_3');
    expect(g.map((x) => x.caso)).toEqual(['G', 'Q', agua.id, forro.id]);
    expect(g.find((x) => x.caso === 'Q')!.total).toBe(10);
    expect(g.find((x) => x.caso === 'G')!.classe).toBe('carga-caso-g');
  });
});

describe('vento por pavimento (K1.5.32)', () => {
  const { s } = predio();
  const b = s.modelo, an = analisarEdificio(b);

  it('tabela por pavimento e direção; soma na base confere com o vento aplicado', () => {
    const linhas = ventoPorPavimento(b, an);
    expect(linhas.length).toBe(new Set(an.vento!.casos[0].forcas.map((f) => f.pavimento)).size);
    expect(linhas.length).toBeGreaterThanOrEqual(4);
    expect(linhas[0].cota).toBeLessThan(linhas.at(-1)!.cota);
    const t = tabelaVento(linhas);
    expect(t.cabecalho).toEqual(['W0°', 'W90°', 'W180°', 'W270°']);
    expect(t.linhas).toHaveLength(linhas.length);
    // soma de F por direção igual à soma das forças do caso no resultado da análise
    for (const [i, d] of [0, 90, 180, 270].entries()) {
      const cv = an.vento!.casos.find((c) => c.direcao === d && c.exc === 0)!;
      expect(t.base[i].F).toBeCloseTo(cv.forcas.reduce((a, f) => a + f.F, 0), 9);
    }
    // vento 0° empurra para +x e 180° para −x, com módulos iguais (coeficientes de arrasto iguais por sentido)
    expect(t.base[0].F).toBeGreaterThan(0); expect(t.base[2].F).toBeLessThan(0);
    // as forças crescem com a altura (S2): o último pavimento tem força maior que o primeiro por m de altura
    const q = linhas.map((l) => l.casos[0].zonas[0].q);
    expect(q.at(-1)!).toBeGreaterThan(q[0]);
  });

  it('setas em planta: origem na zona, sentido do vento e comprimento proporcional', () => {
    const l = ventoPorPavimento(b, an)[0], w0 = l.casos.find((c) => c.direcao === 0 && c.exc === 0)!, w90 = l.casos.find((c) => c.direcao === 90 && c.exc === 0)!;
    const s0 = setasDeVento(l, w0.caso, 0.1), s90 = setasDeVento(l, w90.caso, 0.1);
    expect(s0).toHaveLength(w0.zonas.length);
    expect(s0[0].para[0] - s0[0].de[0]).toBeCloseTo(0.1 * w0.zonas[0].F, 9);
    expect(s0[0].para[1]).toBeCloseTo(s0[0].de[1], 12);
    expect(s90[0].para[0]).toBeCloseTo(s90[0].de[0], 12);
    expect(s90[0].para[1] - s90[0].de[1]).toBeCloseTo(0.1 * w90.zonas[0].F, 9);
    expect(setasDeVento(l, 'inexistente', 1)).toEqual([]);
  });

  it('escala das setas: a maior força do caso fica com o comprimento pedido', () => {
    const l = ventoPorPavimento(b, an)[0], w0 = l.casos.find((c) => c.direcao === 0 && c.exc === 0)!;
    const k = metrosPorKNVento(l, w0.caso, 1.5), s = setasDeVento(l, w0.caso, k);
    expect(Math.max(...s.map((x) => Math.hypot(x.para[0] - x.de[0], x.para[1] - x.de[1])))).toBeCloseTo(1.5, 9);
    expect(metrosPorKNVento(l, 'inexistente', 1.5)).toBe(0);
  });

  it('sem vento ativo não há tabela', () => {
    const { s: s2, ok } = predio();
    ok('vento.definir', { ativo: false });
    expect(ventoPorPavimento(s2.modelo, analisarEdificio(s2.modelo))).toEqual([]);
  });
});
