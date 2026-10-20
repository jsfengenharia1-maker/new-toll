import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, replay, Sessao } from './index';
import { centroPilar, contornoPilar, lancesDoPilar, mascaraParaMundo } from '../building/types';
import { verificar } from '../building/verify';
import { compactarLog, lerEdificio } from '../building/file';
import { geometriaMascara } from '../building/pilares';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ret = (b: number, h: number) => ({ tipo: 'ret', b, h });
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };

describe('pilares', () => {
  it('ponto fixo no canto: o centro fica a meia seção, girando junto', () => {
    const p = { x: 0, y: 0, angulo: 0, ajuste: 'so' as const };
    expect(centroPilar(p, { tipo: 'ret', b: 0.2, h: 0.6 })).toEqual([0.1, 0.3]);
    const g = centroPilar({ ...p, angulo: 90 }, { tipo: 'ret', b: 0.2, h: 0.6 });
    expect(g[0]).toBeCloseTo(-0.3); expect(g[1]).toBeCloseTo(0.1);
    const c = contornoPilar({ ...p, ajuste: 'ne' }, { tipo: 'ret', b: 0.2, h: 0.6 });
    expect(Math.max(...c.map((q) => q[0]))).toBeCloseTo(0); expect(Math.max(...c.map((q) => q[1]))).toBeCloseTo(0);
  });

  it('inserir: nome automático, nasce na fundação e morre no topo; sobreposição recusada; encostar pode', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.2, 0.5) });
    const p1 = s.modelo.pilares[0];
    expect(p1).toMatchObject({ nome: 'P1', nasce: 'fundacao', morre: 'pav_8', ajuste: 'c' });
    expect(lancesDoPilar(s.modelo, p1).map((x) => x.nome)).toEqual(['Térreo', 'Tipo 1', 'Tipo 2', 'Tipo 3', 'Cobertura']);
    const r = s.executar('pilar.inserir', { x: 0.15, y: 0, secao: ret(0.2, 0.5) });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('PILAR_SOBREPOSTO');
    ok(s, 'pilar.inserir', { x: 0.2, y: 0, secao: ret(0.2, 0.5) }); // encostado
    // pilar que nasce no Tipo 2 não colide com um que morre no Tipo 1
    ok(s, 'pilar.inserir', { x: 5, y: 0, secao: ret(0.3, 0.3), morre: 'pav_4' });
    ok(s, 'pilar.inserir', { x: 5, y: 0, secao: ret(0.3, 0.3), nasce: 'pav_5' });
    expect(verificar(s.modelo).filter((d) => d.severidade === 'erro')).toEqual([]);
  });

  it('seção mínima, pilar-parede e lance com seção própria', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.12, 0.4) });
    ok(s, 'pilar.inserir', { x: 3, y: 0, secao: ret(0.15, 0.4) });
    ok(s, 'pilar.inserir', { x: 6, y: 0, secao: ret(0.2, 1.2) });
    const cods = verificar(s.modelo).map((d) => d.codigo);
    expect(cods).toEqual(['PILAR_SECAO_MINIMA', 'PILAR_SECAO_REDUZIDA', 'PILAR_PAREDE']);
    const p = s.modelo.pilares[0].id;
    ok(s, 'pilar.secaoLance', { id: p, pavimento: 'pav_8', secao: ret(0.2, 0.4) });
    ok(s, 'pilar.editar', { id: p, secao: ret(0.2, 0.4) });
    expect(verificar(s.modelo).map((d) => d.codigo)).toEqual(['PILAR_SECAO_REDUZIDA', 'PILAR_PAREDE']); // P1 corrigido
    ok(s, 'pilar.secaoLance', { id: p, pavimento: 'pav_8' });
    expect(s.modelo.pilares[0].secoes).toBeUndefined();
  });

  it('copiar em série, mover em grupo e renumerar (esquerda → direita, de cima para baixo)', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.2, 0.2) });
    ok(s, 'pilar.copiar', { ids: [s.modelo.pilares[0].id], dx: 4, dy: 0, vezes: 2 });
    ok(s, 'pilar.copiar', { ids: s.modelo.pilares.map((p) => p.id), dx: 0, dy: 5 });
    expect(s.modelo.pilares.map((p) => p.nome)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    ok(s, 'pilar.renumerar', {});
    const nome = (x: number, y: number) => s.modelo.pilares.find((p) => p.x === x && p.y === y)!.nome;
    expect([nome(0, 5), nome(4, 5), nome(8, 5), nome(0, 0), nome(8, 0)]).toEqual(['P1', 'P2', 'P3', 'P4', 'P6']);
    // mover os dois de baixo à esquerda para cima dos de cima: recusado; mover todos juntos: aceito
    const baixo = s.modelo.pilares.filter((p) => p.y === 0).map((p) => p.id);
    expect(s.executar('pilar.mover', { ids: baixo, dx: 0, dy: 5 }).ok).toBe(false);
    ok(s, 'pilar.mover', { ids: s.modelo.pilares.map((p) => p.id), dx: 1, dy: 1 });
  });

  it('remover pavimento ajusta nascimento e morte; pilar sem lance some', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: ret(0.2, 0.2), morre: 'pav_6' }); // até o Tipo 3
    ok(s, 'pilar.inserir', { x: 3, y: 0, secao: ret(0.2, 0.2), nasce: 'pav_6' }); // nasce no Tipo 3 (lance até a cobertura)
    ok(s, 'pilar.inserir', { x: 6, y: 0, secao: ret(0.2, 0.2), nasce: 'pav_5', morre: 'pav_6' });
    const r = ok(s, 'pavimento.remover', { id: 'pav_6' });
    expect(r.mensagem).toMatch(/P3/);
    expect(s.modelo.pilares.map((p) => [p.nome, p.nasce, p.morre])).toEqual([['P1', 'fundacao', 'pav_5'], ['P2', 'pav_5', 'pav_8']]);
    s.desfazer();
    expect(s.modelo.pilares).toHaveLength(3);
  });

  it('lote: um passo só; erro em qualquer item não altera nada', () => {
    const s = padrao();
    const n = s.log.length;
    ok(s, 'lote', { comandos: [0, 4, 8].map((x) => ({ nome: 'pilar.inserir', params: { x, y: 0, secao: ret(0.2, 0.4) } })) });
    expect(s.modelo.pilares.map((p) => p.nome)).toEqual(['P1', 'P2', 'P3']);
    expect(s.log.length).toBe(n + 1);
    const r = s.executar('lote', { comandos: [{ nome: 'pilar.inserir', params: { x: 12, y: 0, secao: ret(0.2, 0.4) } }, { nome: 'pilar.inserir', params: { x: 12.1, y: 0, secao: ret(0.2, 0.4) } }] });
    expect(r.ok).toBe(false);
    expect(r.erros[0].mensagem).toMatch(/^Item 2 \(pilar\.inserir\)/);
    expect(s.modelo.pilares).toHaveLength(3);
    s.desfazer();
    expect(s.modelo.pilares).toHaveLength(0);
  });
});

describe('máscara', () => {
  const GEO = { A: { linhas: [100, 100, 1100, 100], arcos: [600, 600, 50, 0, 360], textos: [] } };

  it('importar centraliza (cm → m) e alinhar por dois pares de pontos', () => {
    const s = padrao();
    ok(s, 'mascara.importar', { grupo: 'g_3', nome: 'Tipo', geo: GEO, escala: 0.01 });
    const m = s.modelo.mascaras[0];
    expect(mascaraParaMundo(m, 100, 100)).toEqual([0, 0]);
    expect(mascaraParaMundo(m, 1100, 100)).toEqual([10, 0]);
    // girar 90° em torno de (0,0) e levar a (2, 3); com escala: 10 m viram 5 m
    ok(s, 'mascara.alinhar', { id: m.id, de: [[0, 0], [10, 0]], para: [[2, 3], [2, 8]], escalar: true });
    const m2 = s.modelo.mascaras[0];
    const a = mascaraParaMundo(m2, 100, 100), z = mascaraParaMundo(m2, 1100, 100);
    expect(a[0]).toBeCloseTo(2); expect(a[1]).toBeCloseTo(3); expect(z[0]).toBeCloseTo(2); expect(z[1]).toBeCloseTo(8);
    expect(m2.rotacao).toBeCloseTo(90);
    const g = geometriaMascara(s.modelo, 'g_3');
    expect(g.segs).toHaveLength(4);
    expect(g.arcos[2]).toBeCloseTo(0.25); // raio 50 cm × escala 0,5
    ok(s, 'mascara.camadas', { id: m.id, camadas: ['A'], capturavel: false });
    expect(geometriaMascara(s.modelo, 'g_3').segs).toHaveLength(0);
    expect(geometriaMascara(s.modelo, 'g_3', false).segs).toHaveLength(4);
  });

  it('no arquivo, a geometria vai uma vez só e o log é expandido na leitura', () => {
    const s = padrao();
    ok(s, 'mascara.importar', { grupo: 'g_3', nome: 'Tipo', geo: GEO, escala: 0.01 });
    const log = compactarLog(s.modelo, s.log);
    const txt = JSON.stringify({ building: s.modelo, buildingLog: log });
    expect(txt.split('"linhas"').length - 1).toBe(1);
    const f = lerEdificio(JSON.parse(txt))!;
    expect(replay(f.buildingLog)).toEqual(f.building);
  });

  it('remover o último pavimento do grupo remove a máscara do grupo', () => {
    const s = padrao();
    ok(s, 'mascara.importar', { grupo: 'g_7', nome: 'Cob', geo: GEO, escala: 0.01 });
    ok(s, 'pavimento.remover', { id: 'pav_8' });
    expect(s.modelo.mascaras).toEqual([]);
  });
});
