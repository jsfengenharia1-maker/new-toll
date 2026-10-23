import { describe, expect, it } from 'vitest';
import { aplicarComando, comandosEdificioPadrao, Sessao } from '../commands';
import { geometriaCota, offsetDoPonto, planejarMovimento, resolverRef, textoCota, trechosCota } from './cotas';
import { cotasTemporarias, deltaDaCotaTemp, indiceCotasTemp, MAX_COTAS_TEMP, paramsFixarCotaTemp, paramsMoverCotaTemp } from '../geom/cotasTemp';
import { montarPrancha } from '../sheets/prancha';
import { montarPranchaLocacao } from '../sheets/locacao';
import type { BuildingModel, ElemCota } from './types';

const PIL = { tipo: 'ret', b: 0.3, h: 0.3 } as const;

/** Edifício padrão com pilares 30 × 30 nas posições dadas; devolve a sessão, o grupo da planta e os pilares. */
function sessao(pos: [number, number][]) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) expect(s.executar(c.nome, c.params, 'sistema').ok).toBe(true);
  for (const [x, y] of pos) expect(s.executar('pilar.inserir', { x, y, secao: PIL }).ok).toBe(true);
  return { s, grupo: s.modelo.grupos.find((g) => s.modelo.pavimentos.some((p) => p.grupo === g.id && p.nome.startsWith('Tipo')))!.id };
}
const el = (id: string): ElemCota => ({ tipo: 'pilar', id });
const nomeP = (b: BuildingModel, n: string) => b.pilares.find((p) => p.nome === n)!;
const xDe = (s: Sessao, n: string) => nomeP(s.modelo, n).x;

function criar(s: Sessao, grupo: string, ids: string[], partes: ('faceA' | 'faceB' | 'centro')[], extra: Record<string, unknown> = {}) {
  const r = s.executar('cota.criar', { grupo, refs: ids.map((id, i) => ({ elem: el(id), parte: partes[i] ?? 'centro' })), linha: { angulo: 0, offset: -1 }, ...extra });
  expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
  return s.modelo.cotas!.at(-1)!;
}

describe('cota permanente: referências associativas e série', () => {
  it('série de 4 pontos: centros de 4 pilares (5,00 m) e faces (4,70 / 0,30 / 4,70)', () => {
    const { s, grupo } = sessao([[0, 0], [5, 0], [10, 0], [15, 0]]);
    const ids = s.modelo.pilares.map((p) => p.id);
    const c = criar(s, grupo, ids, ['centro', 'centro', 'centro', 'centro']);
    expect(trechosCota(s.modelo, c).trechos.map((t) => t.valor)).toEqual([5, 5, 5]);
    const f = criar(s, grupo, [ids[0], ids[1], ids[1], ids[2]], ['faceB', 'faceA', 'faceB', 'faceA']);
    expect(trechosCota(s.modelo, f).trechos.map((t) => t.valor)).toEqual([4.7, 0.3, 4.7]);
    const base = criar(s, grupo, ids, ['centro', 'centro', 'centro', 'centro'], { estilo: 'baseline' });
    expect(trechosCota(s.modelo, base).trechos.map((t) => t.valor)).toEqual([5, 10, 15]);
    expect(textoCota(4.7)).toBe('470');
  });

  it('resolverRef: pilar retangular girado em 90°, circular e viga (eixo e faces)', () => {
    const { s, grupo } = sessao([[0, 0]]);
    const b0 = s.modelo, id = b0.pilares[0].id;
    expect(s.executar('pilar.editar', { id, secao: { tipo: 'ret', b: 0.2, h: 0.5 }, angulo: 90 }).ok).toBe(true);
    const b = s.modelo;
    // medida em x: o pilar girado 90° tem 0,50 m de largura em x
    expect(resolverRef(b, grupo, { elem: el(id), parte: 'faceA' }, 0)![0]).toBeCloseTo(-0.25, 9);
    expect(resolverRef(b, grupo, { elem: el(id), parte: 'faceB' }, 0)![0]).toBeCloseTo(0.25, 9);
    expect(resolverRef(b, grupo, { elem: el(id), parte: 'faceB' }, 90)![1]).toBeCloseTo(0.1, 9);
    expect(resolverRef(b, grupo, { elem: el(id), parte: 'centro' }, 0)).toEqual([0, 0]);
    expect(s.executar('pilar.editar', { id, secao: { tipo: 'circ', d: 0.4 } }).ok).toBe(true);
    expect(resolverRef(s.modelo, grupo, { elem: el(id), parte: 'faceB' }, 0)![0]).toBeCloseTo(0.2, 9);
    expect(s.executar('viga.tracar', { grupo, pontos: [[2, 0], [2, 4]], secao: { b: 0.2, h: 0.4 } }).ok).toBe(true);
    const v: ElemCota = { tipo: 'viga', id: s.modelo.vigas.at(-1)!.id };
    expect(resolverRef(s.modelo, grupo, { elem: v, parte: 'faceA' }, 0)![0]).toBeCloseTo(1.9, 9);
    expect(resolverRef(s.modelo, grupo, { elem: v, parte: 'eixo' }, 0)).toEqual([2, 2]);
    expect(resolverRef(s.modelo, grupo, { elem: v, parte: 'extremoJ' }, 0)).toEqual([2, 4]);
  });

  it('a cota acompanha o elemento movido e um elemento removido vira ponto livre com aviso (desfazer restaura)', () => {
    const { s, grupo } = sessao([[0, 0], [5, 0], [10, 0]]);
    const ids = s.modelo.pilares.map((p) => p.id);
    const c = criar(s, grupo, ids, ['centro', 'centro', 'centro']);
    expect(s.executar('pilar.mover', { ids: [ids[2]], dx: 1, dy: 0 }).ok).toBe(true);
    expect(trechosCota(s.modelo, s.modelo.cotas![0]).trechos.map((t) => t.valor)).toEqual([5, 6]);
    const r = s.executar('pilar.remover', { ids: [ids[1]] });
    expect(r.ok).toBe(true);
    expect(r.mensagem).toMatch(/foi removido; a referência 2 ficou no ponto \(5,000; 0,000\)/);
    const c2 = s.modelo.cotas![0];
    expect(c2.refs[1]).toEqual({ parte: 'centro', fixo: [5, 0], removido: true });
    expect(trechosCota(s.modelo, c2).trechos.map((t) => t.valor)).toEqual([5, 6]);
    expect(trechosCota(s.modelo, c2).avisos.join(' ')).toMatch(/elemento removido/);
    s.desfazer();
    expect(s.modelo.cotas![0].refs[1]).toEqual({ parte: 'centro', elem: el(ids[1]) });
    expect(c.id).toBe(s.modelo.cotas![0].id);
  });

  it('cota de grupo removido sai com o grupo; criar recusa referência inexistente e ponto sem elemento', () => {
    const { s, grupo } = sessao([[0, 0], [5, 0]]);
    const ids = s.modelo.pilares.map((p) => p.id);
    expect(aplicarComando(s.modelo, 'cota.criar', { grupo, refs: [{ elem: el('xx'), parte: 'centro' }, { elem: el(ids[0]), parte: 'centro' }], linha: { angulo: 0, offset: 1 } }).erros[0].codigo).toBe('COTA_REFERENCIA');
    expect(aplicarComando(s.modelo, 'cota.criar', { grupo, refs: [{ parte: 'centro' }, { elem: el(ids[0]), parte: 'centro' }], linha: { angulo: 0, offset: 1 } }).erros[0].codigo).toBe('COTA_REFERENCIA');
    expect(aplicarComando(s.modelo, 'cota.criar', { grupo: 'nao', refs: [{ elem: el(ids[0]), parte: 'centro' }, { elem: el(ids[1]), parte: 'centro' }], linha: { angulo: 0, offset: 1 } }).erros[0].codigo).toBe('GRUPO_INEXISTENTE');
    const livre = aplicarComando(s.modelo, 'cota.criar', { grupo, refs: [{ elem: el(ids[0]), parte: 'faceB' }, { fixo: [2, 0], parte: 'centro' }], linha: { angulo: 0, offset: 1 } });
    expect(livre.ok).toBe(true);
    expect(trechosCota(livre.modelo, livre.modelo.cotas![0]).trechos[0].valor).toBeCloseTo(1.85, 9);
  });

  it('geometria de desenho: chamadas, linha de cota e texto em cm; offset pela normal', () => {
    const { s, grupo } = sessao([[0, 0], [5, 0]]);
    const ids = s.modelo.pilares.map((p) => p.id);
    const c = criar(s, grupo, ids, ['faceB', 'faceA']);
    const g = geometriaCota(s.modelo, c);
    expect(g.textos.map((t) => t.s)).toEqual(['470']);
    expect(g.linhas[0][0][1]).toBe(-1);
    expect(g.chamadas).toHaveLength(2);
    expect(offsetDoPonto(0, [3, 7])).toBe(7);
    expect(offsetDoPonto(90, [3, 7])).toBe(-3);
  });
});

describe('mover pela cota: travadas propagam', () => {
  /** P1 (0), P2 (4), P3 (9) com as cotas travadas P1–P2 e P2–P3 (centros, direção x). */
  function cadeia() {
    const { s, grupo } = sessao([[0, 0], [4, 0], [9, 0]]);
    const ids = s.modelo.pilares.map((p) => p.id);
    criar(s, grupo, [ids[0], ids[1]], ['centro', 'centro'], { travada: true });
    criar(s, grupo, [ids[1], ids[2]], ['centro', 'centro'], { travada: true });
    return { s, grupo, ids };
  }

  it('cadeia de 3 elementos travados: mover o primeiro 1 m arrasta os outros 1 m, num só desfazer', () => {
    const { s, ids } = cadeia();
    const n0 = s.log.length;
    const r = s.executar('cota.mover', { alvo: el(ids[0]), delta: [1, 0] });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect(r.mensagem).toMatch(/acompanham por cota travada: P2, P3/);
    expect([xDe(s, 'P1'), xDe(s, 'P2'), xDe(s, 'P3')]).toEqual([1, 5, 10]);
    expect(s.log.length).toBe(n0 + 1);
    s.desfazer();
    expect([xDe(s, 'P1'), xDe(s, 'P2'), xDe(s, 'P3')]).toEqual([0, 4, 9]);
    s.refazer();
    expect([xDe(s, 'P1'), xDe(s, 'P2'), xDe(s, 'P3')]).toEqual([1, 5, 10]);
  });

  it('mover o elemento do meio leva os dois lados; movimento transversal à cota não propaga', () => {
    const { s, ids } = cadeia();
    expect(s.executar('cota.mover', { alvo: el(ids[1]), delta: [0, 2] }).ok).toBe(true);
    expect(nomeP(s.modelo, 'P2').y).toBe(2);
    expect([nomeP(s.modelo, 'P1').y, nomeP(s.modelo, 'P3').y]).toEqual([0, 0]);
    expect(s.executar('cota.mover', { alvo: el(ids[1]), delta: [-0.5, 0] }).ok).toBe(true);
    expect([xDe(s, 'P1'), xDe(s, 'P2'), xDe(s, 'P3')]).toEqual([-0.5, 3.5, 8.5]);
  });

  it('cota destravada não propaga', () => {
    const { s, ids } = cadeia();
    for (const c of s.modelo.cotas!) expect(s.executar('cota.travar', { id: c.id, travada: false }).ok).toBe(true);
    expect(s.executar('cota.mover', { alvo: el(ids[0]), delta: [1, 0] }).ok).toBe(true);
    expect([xDe(s, 'P1'), xDe(s, 'P2'), xDe(s, 'P3')]).toEqual([1, 4, 9]);
  });

  it('conflito: ponto livre numa cota travada recusa e diz qual cota impede', () => {
    const { s, grupo, ids } = cadeia();
    const c3 = criar(s, grupo, [ids[2], ids[2]], ['centro', 'centro']);
    expect(s.executar('cota.editar', { id: c3.id, refs: [{ elem: el(ids[2]), parte: 'centro' }, { fixo: [20, 0], parte: 'centro' }] }).ok).toBe(true);
    expect(s.executar('cota.travar', { id: c3.id, travada: true }).ok).toBe(true);
    const x0 = JSON.stringify(s.modelo.pilares);
    const r = s.executar('cota.mover', { alvo: el(ids[0]), delta: [1, 0] });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('COTA_TRAVADA_PONTO');
    expect(r.erros[0].mensagem).toMatch(/cota travada P3–ponto liga P3 a um ponto livre/);
    expect(r.erros[0].elementos).toEqual([c3.id]);
    expect(JSON.stringify(s.modelo.pilares)).toBe(x0);
  });

  it('conflito: ciclo de cotas travadas com a referência da cota editada', () => {
    const { s, grupo, ids } = cadeia();
    // cota destravada P1–P3 (face a face); editar o valor movendo P3 arrasta P2 e P1, que é a referência
    const c = criar(s, grupo, [ids[0], ids[2]], ['faceB', 'faceA']);
    const r = s.executar('cota.valor', { id: c.id, indice: 0, valor: 8 });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('COTA_TRAVADA_CONFLITO');
    expect(r.erros[0].mensagem).toMatch(/cota travada P1–P2 impede: P1 é a referência da cota editada e ficaria deslocado -?\d+(,\d)? cm/);
    expect(xDe(s, 'P3')).toBe(9);
  });

  it('conflito: dois caminhos com deslocamentos incompatíveis', () => {
    const { s, grupo } = sessao([[0, 0], [4, 0], [9, 0]]);
    const ids = s.modelo.pilares.map((p) => p.id);
    // P1–P2 travada a 45°, P1–P3 e P2–P3 travadas em x: P3 andaria 1 m (por P1) e 0,5 m (por P2)
    const mk = (a: string, z: string, ang: number) => s.executar('cota.criar', { grupo, refs: [{ elem: el(a), parte: 'centro' }, { elem: el(z), parte: 'centro' }], linha: { angulo: ang, offset: 0 }, travada: true }).ok;
    expect(mk(ids[0], ids[1], 45)).toBe(true);
    expect(mk(ids[0], ids[2], 0)).toBe(true);
    expect(mk(ids[1], ids[2], 0)).toBe(true);
    const pl = planejarMovimento(s.modelo, el(ids[0]), [1, 0]);
    expect(pl.movimentos).toEqual([]);
    expect(pl.erro!.codigo).toBe('COTA_TRAVADA_CONFLITO');
    expect(pl.erro!.mensagem).toMatch(/impede: P3 já anda 100 cm nessa direção e P2 anda 50 cm/);
    // movimento só em y: nenhuma cota o vê (45° só propaga a componente na sua direção, 0,5·(0, 1)·... → P2 anda em y)
    expect(planejarMovimento(s.modelo, el(ids[2]), [0, 1]).erro).toBeUndefined();
  });

  it('cota travada não tem o valor editado; destravada edita e move o elemento do fim', () => {
    const { s, ids } = cadeia();
    const c = s.modelo.cotas![0];
    const r = s.executar('cota.valor', { id: c.id, indice: 0, valor: 3 });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('COTA_TRAVADA');
    expect(s.executar('cota.travar', { id: c.id, travada: false }).ok).toBe(true);
    // P1–P2 destravada, P2–P3 travada: P2 vai a 3 e leva P3 (1 m para trás)
    const r2 = s.executar('cota.valor', { id: c.id, indice: 0, valor: 3 });
    expect(r2.ok, r2.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect([xDe(s, 'P1'), xDe(s, 'P2'), xDe(s, 'P3')]).toEqual([0, 3, 8]);
    // do início: P1 anda, P2 fica
    expect(s.executar('cota.valor', { id: c.id, indice: 0, valor: 4, mover: 'inicio' }).ok).toBe(true);
    expect([xDe(s, 'P1'), xDe(s, 'P2')]).toEqual([-1, 3]);
    expect(ids).toHaveLength(3);
  });

  it('sobreposição ao mover recusa (validar do pilar.mover) e nada muda', () => {
    const { s } = sessao([[0, 0], [5, 0]]);
    const ids = s.modelo.pilares.map((p) => p.id);
    const antes = JSON.stringify(s.modelo.pilares);
    const r = s.executar('cota.mover', { alvo: el(ids[0]), delta: [5, 0] });
    expect(r.ok).toBe(false);
    expect(r.erros[0].mensagem).toMatch(/Item 1 \(pilar\.mover\)/);
    expect(JSON.stringify(s.modelo.pilares)).toBe(antes);
    expect(s.executar('cota.mover', { alvo: el(ids[0]), delta: [0, 0] }).erros[0].codigo).toBe('DESLOCAMENTO_NULO');
  });

  it('eixo e abertura movem pelos comandos existentes', () => {
    const { s, grupo } = sessao([[0, 0]]);
    expect(s.executar('eixo.criar', { nome: 'A', p1: [3, -5], p2: [3, 5] }).ok).toBe(true);
    const eixo = s.modelo.eixos.at(-1)!;
    expect(s.executar('cota.mover', { alvo: { tipo: 'eixo', id: eixo.id }, delta: [0.5, 0] }).ok).toBe(true);
    expect(s.modelo.eixos.at(-1)!.p1).toEqual([3.5, -5]);
    expect(grupo).toBeTruthy();
  });
});

describe('cotas temporárias', () => {
  /** Pórtico 3 × 2 de 5 m com pilares 30 × 30. */
  function portico() {
    const xs = [0, 5, 10], ys = [0, 5];
    const r = sessao(ys.flatMap((y) => xs.map((x) => [x, y] as [number, number])));
    const ind = indiceCotasTemp(r.s.modelo, r.grupo);
    return { ...r, ind };
  }

  it('pilar do meio da fileira de baixo: vizinhos a 4,70 m (face a face) e 2 dimensões da seção; máximo de 6', () => {
    const { s, grupo, ind } = portico();
    const p = nomeP(s.modelo, 'P2');
    const cs = cotasTemporarias(s.modelo, ind, [el(p.id)]);
    expect(cs.length).toBeLessThanOrEqual(MAX_COTAS_TEMP);
    const viz = cs.filter((c) => c.tipo === 'vizinho');
    expect(viz.map((c) => [c.dir, c.valor]).sort()).toEqual([['xn', 4.7], ['xp', 4.7], ['yp', 4.7]]);
    expect(cs.filter((c) => c.tipo === 'secao').map((c) => c.valor)).toEqual([0.3, 0.3]);
    // referência por eixo (Tab): 5,00 m
    const eixo = cotasTemporarias(s.modelo, ind, [el(p.id)], { selecionado: 'eixo', vizinho: 'eixo' });
    expect(eixo.filter((c) => c.tipo === 'vizinho').map((c) => c.valor).sort()).toEqual([5, 5, 5]);
    expect(grupo).toBeTruthy();
  });

  it('eixo estrutural vizinho entra pela referência de eixo', () => {
    const { s, grupo } = sessao([[0, 0]]);
    expect(s.executar('eixo.criar', { nome: 'B', p1: [3, -5], p2: [3, 5] }).ok).toBe(true);
    const cs = cotasTemporarias(s.modelo, indiceCotasTemp(s.modelo, grupo), [el(s.modelo.pilares[0].id)]);
    const xp = cs.find((c) => c.dir === 'xp')!;
    expect(xp.valor).toBeCloseTo(2.85, 9);
    expect(xp.refViz!.parte).toBe('eixo');
  });

  it('editar o valor para 450 move o selecionado (a referência fica) e um desfazer restaura; valor que sobrepõe é recusado', () => {
    const { s, ind } = portico();
    const p = nomeP(s.modelo, 'P2'), n0 = s.log.length;
    const xp = cotasTemporarias(s.modelo, ind, [el(p.id)]).find((c) => c.dir === 'xp')!;
    expect(deltaDaCotaTemp(xp, 4.5)).toEqual([0.2, 0]);
    const r = s.executar('cota.mover', paramsMoverCotaTemp(xp, 4.5));
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect(xDe(s, 'P2')).toBeCloseTo(5.2, 9);
    expect(xDe(s, 'P3')).toBe(10);
    expect(s.log.length).toBe(n0 + 1);
    const novo = cotasTemporarias(s.modelo, indiceCotasTemp(s.modelo, ind.grupo), [el(p.id)]);
    expect(novo.find((c) => c.dir === 'xp')!.valor).toBeCloseTo(4.5, 9);
    expect(novo.find((c) => c.dir === 'xn')!.valor).toBeCloseTo(4.9, 9);
    s.desfazer();
    expect(xDe(s, 'P2')).toBe(5);
    const ruim = s.executar('cota.mover', paramsMoverCotaTemp(xp, -0.3));
    expect(ruim.ok).toBe(false);
    expect(xDe(s, 'P2')).toBe(5);
  });

  it('vários selecionados: 4 cotas do conjunto; todos andam o mesmo deslocamento', () => {
    const { s, ind } = portico();
    const a = nomeP(s.modelo, 'P1'), b2 = nomeP(s.modelo, 'P2');
    const cs = cotasTemporarias(s.modelo, ind, [el(a.id), el(b2.id)]);
    expect(cs.every((c) => c.tipo === 'vizinho')).toBe(true);
    const xp = cs.find((c) => c.dir === 'xp')!;
    expect(xp.valor).toBeCloseTo(4.7, 9);
    expect(paramsFixarCotaTemp(ind.grupo, xp)).toBeNull(); // conjunto: não há referência de um elemento só
    expect(s.executar('cota.mover', paramsMoverCotaTemp(xp, 4.2)).ok).toBe(true);
    expect([xDe(s, 'P1'), xDe(s, 'P2')]).toEqual([0.5, 5.5]);
  });

  it('fixar a cota temporária cria a permanente com o mesmo valor, que acompanha o pilar', () => {
    const { s, ind } = portico();
    const p = nomeP(s.modelo, 'P2');
    const xp = cotasTemporarias(s.modelo, ind, [el(p.id)]).find((c) => c.dir === 'xp')!;
    const par = paramsFixarCotaTemp(ind.grupo, xp)!;
    const r = s.executar('cota.criar', par);
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    const c = s.modelo.cotas![0];
    expect(trechosCota(s.modelo, c).trechos[0].valor).toBeCloseTo(4.7, 9);
    expect(c.linha.offset).toBeCloseTo(0.5, 9);
    expect(s.executar('pilar.mover', { ids: [p.id], dx: 0.4, dy: 0 }).ok).toBe(true);
    expect(trechosCota(s.modelo, s.modelo.cotas![0]).trechos[0].valor).toBeCloseTo(4.3, 9);
  });

  it('abertura selecionada: cotas até a ponta da parede e a abertura vizinha, movendo pela parede', () => {
    const { s, grupo } = sessao([[0, 0]]);
    const r = s.executar('parede.criar', { pontos: [[0, 10], [8, 10]], espessura: 0.2 });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    const w = s.modelo.paredes!.at(-1)!;
    const ra = s.executar('parede.abertura', { parede: w.id, tipo: 'porta', s: 2, largura: 1, altura: 1.2 });
    expect(ra.ok, ra.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect(s.executar('parede.abertura', { parede: w.id, tipo: 'janela', s: 5, largura: 1, altura: 0.5, peitoril: 0.5 }).ok).toBe(true);
    const [a1] = s.modelo.paredes!.at(-1)!.aberturas!;
    const ind = indiceCotasTemp(s.modelo, grupo);
    const cs = cotasTemporarias(s.modelo, ind, [{ tipo: 'abertura', id: a1.id, sub: w.id }]);
    expect(cs.map((c) => [c.dir, +c.valor.toFixed(3)]).sort()).toEqual([['xn', 2], ['xp', 2]]);
    const xp = cs.find((c) => c.dir === 'xp')!;
    expect(s.executar('cota.mover', paramsMoverCotaTemp(xp, 1.5)).ok).toBe(true);
    expect(s.modelo.paredes!.at(-1)!.aberturas![0].s).toBeCloseTo(2.5, 9);
  });
});

describe('cotas do usuário nas pranchas', () => {
  it('formas e locação trazem o valor da cota do usuário por padrão e a opção cotasUsuario = 0 as desliga', () => {
    const { s, grupo } = sessao([[0, 0], [5, 0], [10, 0]]);
    const ids = s.modelo.pilares.map((p) => p.id);
    // vigas para a planta de formas existir
    expect(s.executar('viga.tracar', { grupo, pontos: [[0, 0], [10, 0]], secao: { b: 0.2, h: 0.4 } }).ok).toBe(true);
    criar(s, grupo, [ids[0], ids[1]], ['faceB', 'faceA']);
    const textos = (m: BuildingModel) => montarPrancha(m, grupo).modelo.filter((q) => q.t === 'txt' && q.c === 'COTA').map((q) => (q as { s: string }).s);
    expect(textos(s.modelo)).toContain('470');
    const sem = (m: BuildingModel) => { const r = aplicarComando(m, 'prancha.definir', { armacao: { cotasUsuario: 0 } }); expect(r.ok).toBe(true); return r.modelo; };
    expect(textos(sem(s.modelo))).not.toContain('470');
    expect(sem(s.modelo).prancha!.armacao!.cotasUsuario).toBe(0);
    // locação: pilares nascem na fundação
    const loc = montarPranchaLocacao(s.modelo, null)!;
    expect(loc.modelo.filter((q) => q.t === 'txt' && q.c === 'COTA').map((q) => (q as { s: string }).s)).toContain('470');
    const loc0 = montarPranchaLocacao(sem(s.modelo), null)!;
    expect(loc0.modelo.filter((q) => q.t === 'txt' && q.c === 'COTA').map((q) => (q as { s: string }).s)).not.toContain('470');
  });
});
