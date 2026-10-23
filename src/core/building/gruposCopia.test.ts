import { describe, expect, it } from 'vitest';
import { replay, Sessao } from '../commands';
import { contornoNoLance, edificioVazio, lancesDoPilar, type BuildingModel } from './types';
import { areasDoGrupo, conteudoDoGrupo, sugerirGrupos } from './gruposCopia';
import { avaliarNumeracao, porticosDoGrupo } from './porticos';
import { verificar } from './verify';

const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const ret = { tipo: 'ret', b: 0.2, h: 0.5 };

/** Térreo, grupo A (A1, A2) e grupo B (B1, B2) com a mesma planta quando copiados; 4 pilares que morrem em A2 e um que sobe até B2. */
function obra() {
  const s = new Sessao();
  ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
  ok(s, 'grupo.criar', { nome: 'A', uso: 'residencial' });
  const gA = s.modelo.grupos.find((g) => g.nome === 'A')!.id;
  ok(s, 'pavimento.criar', { nome: 'A1', cota: 3, grupo: gA });
  ok(s, 'pavimento.repetir', { id: s.modelo.pavimentos.find((p) => p.nome === 'A1')!.id, vezes: 1 });
  ok(s, 'grupo.criar', { nome: 'B', uso: 'residencial' });
  const gB = s.modelo.grupos.find((g) => g.nome === 'B')!.id;
  ok(s, 'pavimento.criar', { nome: 'B1', cota: 9, grupo: gB });
  ok(s, 'pavimento.repetir', { id: s.modelo.pavimentos.find((p) => p.nome === 'B1')!.id, vezes: 1 });
  const pav = (n: string) => s.modelo.pavimentos.find((p) => p.nome === n)!.id;
  const topoA = pav('A2'), topoB = s.modelo.pavimentos.find((p) => p.cota === 12)!.id;
  for (const [x, y] of [[0, 0], [4, 0], [4, 3], [0, 3]]) ok(s, 'pilar.inserir', { x, y, secao: ret, morre: topoA });
  ok(s, 'pilar.inserir', { x: 8, y: 0, secao: ret, morre: topoB });
  ok(s, 'viga.tracar', { grupo: gA, pontos: [[0, 0], [4, 0]], secao: { b: 0.15, h: 0.4 } });
  ok(s, 'viga.tracar', { grupo: gA, pontos: [[4, 0], [4, 3]], secao: { b: 0.15, h: 0.4 } });
  ok(s, 'viga.tracar', { grupo: gA, pontos: [[4, 3], [0, 3]], secao: { b: 0.15, h: 0.4 } });
  ok(s, 'viga.tracar', { grupo: gA, pontos: [[0, 3], [0, 0]], secao: { b: 0.15, h: 0.4 } });
  ok(s, 'laje.criar', { grupo: gA, contorno: [[0, 0], [4, 0], [4, 3], [0, 3]] });
  ok(s, 'carga.area', { grupo: gA, contorno: [[0, 0], [4, 0], [4, 3], [0, 3]], valor: 1 });
  return { s, gA, gB, pav, topoA, topoB };
}

const chaveVigas = (b: BuildingModel, g: string) => b.vigas.filter((v) => v.grupo === g).map((v) => JSON.stringify([v.nome, v.pontos, v.secao])).sort();

describe('grupo.copiarConteudo', () => {
  it('copiar A para B reproduz o grupo: vigas, lajes e cargas iguais, revisão sem erro novo', () => {
    const { s, gA, gB } = obra();
    const errosAntes = verificar(s.modelo).filter((d) => d.severidade === 'erro').length;
    const r = ok(s, 'grupo.copiarConteudo', { de: gA, para: gB });
    expect(r.mensagem).toMatch(/copiados: .*4 vigas/);
    const m = s.modelo;
    expect(m.vigas.filter((v) => v.grupo === gB).length).toBe(4);
    expect(chaveVigas(m, gB)).toEqual(chaveVigas(m, gA));
    const lj = (g: string) => m.lajes.filter((l) => l.grupo === g).map((l) => JSON.stringify([l.nome, l.contorno, l.tipo]));
    expect(lj(gB)).toEqual(lj(gA));
    expect(m.cargas.filter((c) => c.grupo === gB).map((c) => [c.valor, c.pontos])).toEqual(m.cargas.filter((c) => c.grupo === gA).map((c) => [c.valor, c.pontos]));
    expect(verificar(m).filter((d) => d.severidade === 'erro').length).toBe(errosAntes);
    expect(conteudoDoGrupo(m, gB).vigas).toBe(4);
  });

  it('pilares: o que morre em A2 ganha cópia apoiada em B; o que sobe até B2 é coincidente e fica como está', () => {
    const { s, gA, gB, topoA, topoB } = obra();
    const antes = s.modelo.pilares.length;
    ok(s, 'grupo.copiarConteudo', { de: gA, para: gB, tipos: ['pilares'] });
    const m = s.modelo;
    expect(m.pilares.length).toBe(antes + 4);
    const novos = m.pilares.slice(antes);
    for (const p of novos) {
      expect(p.nasce).toBe(topoA);
      expect(p.morre).toBe(topoB);
      expect(lancesDoPilar(m, p).map((l) => l.nome)).toEqual(['B1', 'B2']);
    }
    // segunda vez soma nada
    const r2 = ok(s, 'grupo.copiarConteudo', { de: gA, para: gB, tipos: ['pilares'] });
    expect(s.modelo.pilares.length).toBe(antes + 4);
    expect(r2.mensagem).toMatch(/nada copiado/);
  });

  it('as cargas dos pilares acompanham as cópias; ids determinísticos e replay iguais', () => {
    const { s, gA, gB, topoA } = obra();
    const p0 = s.modelo.pilares[0].id;
    ok(s, 'carga.pilar', { pilar: p0, pavimento: topoA, caso: 'Q', N: 10, Hx: 3 });
    const base = s.modelo;
    ok(s, 'grupo.copiarConteudo', { de: gA, para: gB });
    // A1 e A2 correspondem a B1 e B2: a carga do lance A2 vai ao lance B2 da cópia
    const cps = s.modelo.cargasPilar ?? [];
    expect(cps.length).toBe(2);
    expect(cps[1].pavimento).toBe(s.modelo.pavimentos.find((x) => x.nome === 'B2')!.id);
    expect([cps[1].N, cps[1].Hx]).toEqual([10, 3]);
    const s2 = new Sessao(base);
    ok(s2, 'grupo.copiarConteudo', { de: gA, para: gB });
    expect(s2.modelo).toEqual(s.modelo);
    expect(replay(s.log, edificioVazio())).toEqual(s.modelo);
  });

  it('substituir apaga o que o destino tem; desfazer volta ao modelo anterior em um passo', () => {
    const { s, gA, gB } = obra();
    ok(s, 'viga.tracar', { grupo: gB, pontos: [[1, 1], [2, 1]], secao: { b: 0.15, h: 0.4 } });
    const antes = s.modelo;
    ok(s, 'grupo.copiarConteudo', { de: gA, para: gB, tipos: ['vigas'], modo: 'substituir' });
    expect(s.modelo.vigas.filter((v) => v.grupo === gB).length).toBe(4);
    expect(s.modelo.vigas.some((v) => v.grupo === gB && v.pontos[0][0] === 1)).toBe(false);
    s.desfazer();
    expect(s.modelo).toEqual(antes);
  });

  it('erros: grupo igual ou sem conteúdo', () => {
    const { s, gA, gB } = obra();
    expect(s.executar('grupo.copiarConteudo', { de: gA, para: gA }).ok).toBe(false);
    expect(s.executar('grupo.copiarConteudo', { de: gB, para: gA, tipos: ['vigas'] }).ok).toBe(false);
  });
});

describe('pavimento.unir e sugerirGrupos', () => {
  it('une pavimentos e avisa a contagem do grupo que esvazia', () => {
    const { s, gA, gB, pav } = obra();
    ok(s, 'grupo.copiarConteudo', { de: gA, para: gB });
    const r = ok(s, 'pavimento.unir', { ids: [pav('A1'), pav('A2'), pav('B1'), pav('B2')], grupo: gA });
    expect(r.mensagem).toMatch(/grupo “B” removido \(4 viga\(s\), 1 laje\(s\), 1 carga\(s\)\)/);
    expect(s.modelo.grupos.some((g) => g.id === gB)).toBe(false);
    expect(s.modelo.pavimentos.filter((p) => p.grupo === gA).length).toBe(4);
  });

  it('sugere quebrar onde pilar morre e juntar onde a planta e os elementos verticais coincidem', () => {
    const { s, gA, gB, pav } = obra();
    ok(s, 'grupo.copiarConteudo', { de: gA, para: gB });
    // junta B em A: o pilar que morre em A2 pede a quebra entre A2 e B1
    ok(s, 'pavimento.unir', { ids: [pav('A1'), pav('A2'), pav('B1'), pav('B2')], grupo: gA });
    const sug = sugerirGrupos(s.modelo);
    expect(sug.quebras.map((q) => q.entre)).toEqual([[pav('A2'), pav('B1')]]);
    expect(sug.quebras[0].codigo).toBe('GRUPO_QUEBRA');
    expect(sug.grupos.map((g) => g.pavimentos.length)).toEqual([3, 2]);
  });

  it('sugere juntar grupos consecutivos iguais', () => {
    const { s, gA, pav } = obra();
    ok(s, 'grupo.criar', { nome: 'A2g', uso: 'residencial' });
    const g2 = s.modelo.grupos.find((g) => g.nome === 'A2g')!.id;
    ok(s, 'pavimento.editar', { id: pav('A2'), grupo: g2 });
    ok(s, 'grupo.copiarConteudo', { de: gA, para: g2 });
    const sug = sugerirGrupos(s.modelo);
    expect(sug.juncoes.some((j) => j.pavimentos.join() === [pav('A1'), pav('A2')].join())).toBe(true);
  });
});

describe('areasDoGrupo', () => {
  it('lajes, vigas e pilares somam; total >= vigas + lajes', () => {
    const { s, gA } = obra();
    const a = areasDoGrupo(s.modelo, gA);
    expect(a.lajes).toBeCloseTo(12, 9);
    expect(a.vigas).toBeCloseTo((4 + 3 + 4 + 3) * 0.15, 9);
    expect(a.pilares).toBeCloseTo(5 * 0.2 * 0.5, 9); // os 4 que morrem em A2 e o que sobe até B2
    expect(a.total).toBeGreaterThanOrEqual(a.vigas + a.lajes);
    expect(a.total).toBeCloseTo(a.lajes + a.vigas + a.pilares + a.muros, 12);
    expect(a.pavimentos).toBe(2);
    expect(a.totalGrupo).toBeCloseTo(2 * a.total, 12);
  });
});

describe('pilar.pontoFixo', () => {
  it('mantém o contorno de todos os lances (tolerância 1e-9)', () => {
    const { s, topoA } = obra();
    const id = s.modelo.pilares[0].id;
    ok(s, 'pilar.editar', { id, angulo: 30, ajuste: 'ne' });
    ok(s, 'pilar.secaoLance', { id, pavimento: topoA, secao: { tipo: 'ret', b: 0.3, h: 0.6 }, dx: 0.1, dy: -0.05 });
    const antes = s.modelo.pilares[0];
    const lances = lancesDoPilar(s.modelo, antes).map((l) => l.id);
    const c0 = lances.map((l) => contornoNoLance(antes, l));
    for (const aj of ['c', 'so', 'n', 'l'] as const) {
      ok(s, 'pilar.pontoFixo', { ids: [id], ajuste: aj });
      const p = s.modelo.pilares[0];
      expect(p.ajuste).toBe(aj);
      lances.forEach((l, i) => contornoNoLance(p, l).forEach((q, k) => { expect(q[0]).toBeCloseTo(c0[i][k][0], 9); expect(q[1]).toBeCloseTo(c0[i][k][1], 9); }));
    }
  });

  it('sem manter a posição só troca o ponto fixo', () => {
    const { s } = obra();
    const p0 = s.modelo.pilares[0];
    ok(s, 'pilar.pontoFixo', { ids: [p0.id], ajuste: 'so', mantemPosicao: false });
    expect([s.modelo.pilares[0].x, s.modelo.pilares[0].y, s.modelo.pilares[0].ajuste]).toEqual([p0.x, p0.y, 'so']);
  });
});

describe('pilar novo com os dados de outro e cargas', () => {
  it('pilar.inserir copiarDe leva seção, lances e (opcional) cargas; pilar.copiar incluirCargas', () => {
    const { s, topoA } = obra();
    const id = s.modelo.pilares[0].id;
    ok(s, 'pilar.flambagem', { ids: [id], pavimentos: [topoA], au: 0.8 });
    ok(s, 'pilar.secaoLance', { id, pavimento: topoA, secao: { tipo: 'ret', b: 0.3, h: 0.6 } });
    ok(s, 'carga.pilar', { pilar: id, pavimento: topoA, caso: 'Q', N: 5, Hx: 2 });
    ok(s, 'pilar.inserir', { x: 20, y: 20, copiarDe: id, incluirCargas: true });
    const novo = s.modelo.pilares.at(-1)!;
    expect(novo.secao).toEqual(s.modelo.pilares[0].secao);
    expect(novo.secoes).toEqual(s.modelo.pilares[0].secoes);
    expect(novo.flambagem).toEqual(s.modelo.pilares[0].flambagem);
    expect([novo.x, novo.y]).toEqual([20, 20]);
    expect(s.modelo.cargasPilar!.filter((c) => c.pilar === novo.id).map((c) => [c.N, c.Hx])).toEqual([[5, 2]]);
    ok(s, 'pilar.inserir', { x: 30, y: 30, copiarDe: id });
    expect(s.modelo.cargasPilar!.filter((c) => c.pilar === s.modelo.pilares.at(-1)!.id)).toEqual([]);
    ok(s, 'pilar.copiar', { ids: [id], dx: 0, dy: 10, vezes: 2, incluirCargas: true });
    expect(s.modelo.cargasPilar!.length).toBe(1 + 1 + 2);
    expect(s.executar('pilar.inserir', { x: 1, y: 1 }).ok).toBe(false);
  });
});

describe('laje.copiarDados', () => {
  it('copia só os campos escolhidos, de outro grupo', () => {
    const { s, gA, gB } = obra();
    ok(s, 'grupo.copiarConteudo', { de: gA, para: gB, tipos: ['lajes'] });
    const la = s.modelo.lajes.find((l) => l.grupo === gA)!, lb = s.modelo.lajes.find((l) => l.grupo === gB)!;
    ok(s, 'laje.editar', { id: la.id, tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 }, cobrimento: 4, engasteBordas: [0, 1, 1, 1] });
    ok(s, 'laje.copiarDados', { de: la.id, para: [lb.id], campos: ['tipo', 'engastes'] });
    const n = s.modelo.lajes.find((l) => l.id === lb.id)!;
    expect(n.tipo).toEqual({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 });
    expect(n.engasteBordas).toEqual([0, 1, 1, 1]);
    expect(n.cobrimento).toBeUndefined();
    expect(s.executar('laje.copiarDados', { de: la.id, para: [la.id], campos: ['tipo'] }).ok).toBe(false);
    expect(s.executar('laje.copiarDados', { de: la.id, para: [lb.id], campos: ['plano'] }).ok).toBe(true); // E3f: o plano de inclinação passou a ser copiável
  });
});

describe('referências e vista', () => {
  it('ref.mover acumula no mapa da vista, restaurar apaga, vista.textos guarda só o que difere', () => {
    const { s } = obra();
    const id = s.modelo.pilares[0].id;
    ok(s, 'ref.mover', { id, dx: 0.5, dy: -0.2 });
    ok(s, 'ref.mover', { id, rot: 90 });
    expect(s.modelo.vista!.refs![id]).toEqual({ dx: 0.5, dy: -0.2, rot: 90 });
    ok(s, 'ref.mover', { id, restaurar: true });
    expect(s.modelo.vista).toBeUndefined();
    ok(s, 'vista.textos', { textos: ['nomes', 'niveis'] });
    expect(s.modelo.vista!.textos).toEqual(['nomes', 'niveis']);
    ok(s, 'vista.textos', { textos: ['nomes', 'secoes', 'cotas', 'cargas', 'niveis'] });
    expect(s.modelo.vista).toBeUndefined();
    expect(s.executar('ref.mover', { id: 'nao' , dx: 1 }).ok).toBe(false);
  });

  it('não muda a revisão de cálculo', () => {
    const { s } = obra();
    const rev = s.revCalculo;
    ok(s, 'vista.textos', { textos: ['nomes'] });
    ok(s, 'ref.mover', { id: s.modelo.pilares[0].id, dx: 1 });
    expect(s.revCalculo).toBe(rev);
  });
});

describe('portico.renumerar', () => {
  it('numera vigas ao longo dos pórticos e avalia a numeração anterior', () => {
    const s = new Sessao();
    ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
    ok(s, 'pavimento.criar', { nome: 'T1', cota: 3, uso: 'residencial' });
    const g = s.modelo.grupos.at(-1)!.id;
    // verticais primeiro, horizontais depois, e um pórtico horizontal em dois trechos
    for (const pts of [[[0, 0], [0, 6]], [[0, 0], [3, 0]], [[3, 0], [6, 0]], [[0, 6], [6, 6]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: { b: 0.15, h: 0.4 } });
    expect(avaliarNumeracao(s.modelo, g).map((e) => e.codigo)).toEqual(['NUMERACAO_FORA_DE_ORDEM']);
    const ps = porticosDoGrupo(s.modelo, g);
    expect(ps.length).toBe(3); // dois horizontais (um com 2 vigas) e um vertical
    expect(ps.map((p) => p.vigas.length)).toEqual([1, 2, 1]);
    const r = ok(s, 'portico.renumerar', { grupo: g });
    expect(r.mensagem).toMatch(/3 pórtico\(s\) e 4 viga\(s\)/);
    const nome = (pts: number[][]) => s.modelo.vigas.find((v) => JSON.stringify(v.pontos) === JSON.stringify(pts))!.nome;
    expect(nome([[0, 6], [6, 6]])).toBe('V1');
    expect(nome([[0, 0], [3, 0]])).toBe('V2');
    expect(nome([[3, 0], [6, 0]])).toBe('V3');
    expect(nome([[0, 0], [0, 6]])).toBe('V4');
    expect(avaliarNumeracao(s.modelo, g)).toEqual([]);
  });
});
