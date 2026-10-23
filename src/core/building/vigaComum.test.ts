// Frente E2b: viga comum a dois grupos (modelo, comandos, sincronização e análise com barra única no pórtico).
import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { circuloDoArco, comprimentoDesenvolvido } from './curvas';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { pavimentosDoGrupo } from './types';
import { pavimentoAlvoComum, resumoVigasComuns } from './vigaComum';

const ok = (s: Sessao, nome: string, p: Record<string, unknown>) => { const r = s.executar(nome, p); if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };

type ModoComum = 'comum' | 'unico' | 'sem';
/**
 * Duas baias de 5 × 5 m lado a lado (x de 0 a 5 e de 5 a 10), pilares de 30 × 30 cm. A baia da esquerda é do grupo Tipo
 * (cotas 3, 6 e 9); a da direita, do grupo Cobertura (cota 12); acima há o Ático (cota 15), para os pilares das duas baias terem o mesmo
 * trecho acima (a rigidez das molas dos pilares nas grelhas fica igual nos dois níveis). Modos: `comum` = a viga do meio (V) no Tipo, comum à
 * Cobertura; `unico` = tudo no grupo Tipo (a viga única equivalente); `sem` = baia da direita sem lajes.
 */
function doisGrupos(modo: ModoComum) {
  const s = new Sessao();
  for (const c of [
    { nome: 'obra.definir', params: { nome: 'Dois grupos' } },
    { nome: 'pavimento.criar', params: { nome: 'Térreo', cota: 0, uso: 'comum' } },
    { nome: 'grupo.criar', params: { nome: 'Tipo', uso: 'residencial' } },
    { nome: 'pavimento.criar', params: { nome: 'Tipo 1', cota: 3, grupo: 'g_3' } },
    { nome: 'pavimento.repetir', params: { id: 'pav_4', vezes: 2 } },
    { nome: 'pavimento.criar', params: { nome: 'Cobertura', cota: 12, uso: 'cobertura' } },
    { nome: 'pavimento.criar', params: { nome: 'Ático', cota: 15, uso: 'cobertura' } },
  ]) ok(s, c.nome, c.params);
  const gt = s.modelo.grupos.find((g) => g.nome === 'Tipo')!, tipo = gt.id, cob = s.modelo.grupos.find((g) => g.nome === 'Cobertura')!.id;
  ok(s, 'grupo.editar', { id: cob, gRev: gt.gRev, q: gt.q });
  for (const [x, y] of [[0, 0], [5, 0], [10, 0], [0, 5], [5, 5], [10, 5]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
  const v = (grupo: string, pontos: number[][], nome: string) => ({ nome: 'viga.tracar', params: { grupo, pontos, secao: { b: 0.15, h: 0.5 }, nome } });
  const gB = modo === 'unico' ? tipo : cob;
  ok(s, 'lote', { comandos: [
    v(tipo, [[0, 0], [5, 0]], 'VA1'), v(tipo, [[0, 5], [5, 5]], 'VA2'), v(tipo, [[0, 0], [0, 5]], 'VA3'), v(tipo, [[5, 0], [5, 5]], 'V'),
    v(gB, [[5, 0], [10, 0]], 'VB1'), v(gB, [[5, 5], [10, 5]], 'VB2'), v(gB, [[10, 0], [10, 5]], 'VB3'),
  ] });
  if (modo === 'comum') ok(s, 'viga.comum', { id: s.modelo.vigas.find((x) => x.nome === 'V')!.id, grupo: cob });
  ok(s, 'laje.detectarPanos', { grupo: tipo, tipo: { tipo: 'macica', h: 0.12 } });
  if (modo === 'comum') ok(s, 'laje.detectarPanos', { grupo: gB, tipo: { tipo: 'macica', h: 0.12 } });
  return { s, tipo, cob };
}

describe('viga comum a dois grupos: modelo, comandos e sincronização', () => {
  it('cria a viga associada no outro grupo, igual à origem, e a mantém igual quando a origem muda', () => {
    const { s, tipo, cob } = doisGrupos('comum');
    const o = s.modelo.vigas.find((x) => x.nome === 'V' && x.grupo === tipo)!, w = s.modelo.vigas.find((x) => x.comumDe === o.id)!;
    expect(o.comum).toEqual({ grupo: cob });
    expect(w.grupo).toBe(cob);
    expect(w.pontos).toEqual(o.pontos);
    expect(w.secao).toEqual(o.secao);
    ok(s, 'viga.editar', { id: o.id, secao: { b: 0.2, h: 0.6 }, alinhamento: 'esq' });
    const w2 = s.modelo.vigas.find((x) => x.comumDe === o.id)!;
    expect(w2.secao).toEqual({ b: 0.2, h: 0.6 });
    expect(w2.alinhamento).toBe('esq');
    ok(s, 'viga.mover', { ids: [o.id], dx: 0, dy: 0.5 });
    expect(s.modelo.vigas.find((x) => x.comumDe === o.id)!.pontos[0][1]).toBeCloseTo(0.5, 6);
    expect(s.modelo.vigas.filter((x) => x.comumDe === o.id)).toHaveLength(1);
    const q = resumoVigasComuns(s.modelo);
    expect(q).toHaveLength(1);
    expect(q[0].grupoAssociado).toBe('Cobertura');
    expect(q[0].pavimentos).toEqual([{ associado: 'Cobertura', origem: pavimentosDoGrupo(s.modelo, tipo).at(-1)!.nome }]);
  });
  it('a viga associada não se edita (geometria), não se divide, não se une e não se remove sozinha', () => {
    const { s, tipo } = doisGrupos('comum');
    const w = s.modelo.vigas.find((x) => x.comumDe)!, o = s.modelo.vigas.find((x) => x.nome === 'V' && x.grupo === tipo)!;
    expect(s.executar('viga.editar', { id: w.id, secao: { b: 0.3, h: 0.5 } }).ok).toBe(false);
    expect(s.executar('viga.editar', { id: w.id, nome: 'X1' }).ok).toBe(true); // nome e armadura são livres
    expect(s.executar('viga.dividir', { id: w.id, ponto: [5, 2] }).ok).toBe(false);
    expect(s.executar('viga.remover', { ids: [w.id] }).ok).toBe(false);
    expect(s.executar('viga.unir', { ids: [o.id, s.modelo.vigas.find((x) => x.nome === 'VA1')!.id] }).ok).toBe(false);
    expect(s.executar('viga.comum', { id: o.id, grupo: 'g_1' }).ok).toBe(false); // já é comum
    expect(s.executar('viga.comum', { id: w.id, grupo: tipo }).ok).toBe(false); // a associada não gera outra
  });
  it('remover a origem remove a associada; desfazer devolve as duas', () => {
    const { s, tipo } = doisGrupos('comum');
    const n0 = s.modelo.vigas.length, o = s.modelo.vigas.find((x) => x.nome === 'V' && x.grupo === tipo)!;
    ok(s, 'viga.remover', { ids: [o.id] });
    expect(s.modelo.vigas).toHaveLength(n0 - 2);
    expect(s.desfazer()).not.toBeNull();
    expect(s.modelo.vigas).toHaveLength(n0);
    expect(s.modelo.vigas.some((x) => x.comumDe)).toBe(true);
  });
  it('desfazer a viga comum (a partir da associada) devolve as duas vigas originais, independentes', () => {
    const { s, tipo, cob } = doisGrupos('comum');
    const w = s.modelo.vigas.find((x) => x.comumDe)!;
    ok(s, 'viga.comumDesfazer', { id: w.id });
    const o = s.modelo.vigas.find((x) => x.nome === 'V' && x.grupo === tipo)!;
    expect(o.comum).toBeUndefined();
    const w2 = s.modelo.vigas.find((x) => x.id === w.id)!;
    expect(w2.comumDe).toBeUndefined();
    expect(w2.grupo).toBe(cob);
    ok(s, 'viga.editar', { id: o.id, secao: { b: 0.25, h: 0.5 } });
    expect(s.modelo.vigas.find((x) => x.id === w.id)!.secao).toEqual({ b: 0.15, h: 0.5 }); // independentes
    expect(s.executar('viga.comumDesfazer', { id: o.id }).ok).toBe(false); // não é mais comum
  });
  it('comum em parte do comprimento: a viga é dividida e só a parte indicada vira comum; outra parte a outro grupo', () => {
    const { s, tipo, cob } = doisGrupos('sem');
    ok(s, 'grupo.criar', { nome: 'Terceiro' });
    const terc = s.modelo.grupos.find((g) => g.nome === 'Terceiro')!.id;
    const o = s.modelo.vigas.find((x) => x.nome === 'V' && x.grupo === tipo)!;
    const n0 = s.modelo.vigas.length;
    ok(s, 'viga.comum', { id: o.id, grupo: cob, de: 1, ate: 3 });
    // dividida em 3 partes (0–1, 1–3, 3–5); a do meio é comum, mais a associada
    const naLinha = () => s.modelo.vigas.filter((x) => x.grupo === tipo && x.pontos.every((p) => p[0] === 5));
    expect(naLinha()).toHaveLength(3);
    expect(s.modelo.vigas).toHaveLength(n0 + 2 + 1);
    const meio = naLinha().find((x) => x.comum)!;
    expect(meio.pontos.map((p) => p[1])).toEqual([1, 3]);
    expect(naLinha().filter((x) => x.comum)).toHaveLength(1);
    // a última parte vira comum a outro grupo
    const ultima = naLinha().find((x) => x.pontos[1][1] === 5)!;
    ok(s, 'viga.comum', { id: ultima.id, grupo: terc });
    expect(s.modelo.vigas.filter((x) => x.comumDe)).toHaveLength(2);
    expect(new Set(s.modelo.vigas.filter((x) => x.comumDe).map((x) => x.grupo))).toEqual(new Set([cob, terc]));
    // trecho invertido / fora do comprimento
    const primeira = naLinha().find((x) => x.pontos[0][1] === 0)!;
    expect(s.executar('viga.comum', { id: primeira.id, grupo: cob, de: 0.5, ate: 0.2 }).ok).toBe(false);
    expect(s.executar('viga.comum', { id: primeira.id, grupo: cob, ate: 99 }).ok).toBe(false);
    // desfazer os dois comandos devolve a viga inteira
    expect(s.desfazer()).not.toBeNull();
    expect(s.desfazer()).not.toBeNull();
    expect(naLinha()).toHaveLength(1);
  });
  it('a associada também recusa atribuir seção em lote; comum em parte de uma viga curva divide o arco e a associada o acompanha', () => {
    const { s, tipo, cob } = doisGrupos('sem');
    const w0 = ok(s, 'viga.comum', { id: s.modelo.vigas.find((x) => x.nome === 'VA1')!.id, grupo: cob }) && s.modelo.vigas.find((x) => x.comumDe)!;
    expect(s.executar('viga.atribuir', { ids: [w0.id], campo: 'secao', valor: { b: 0.3, h: 0.6 } }).ok).toBe(false);
    ok(s, 'viga.comumDesfazer', { id: w0.id });
    // viga curva em arco de 5 m de raio (de 0 a 90°), comum só entre 2 e 5 m do desenvolvimento
    ok(s, 'viga.tracar', { grupo: tipo, pontos: [[20, 0], [15, 5]], passagens: [[15 + 5 * Math.cos(Math.PI / 4), 5 * Math.sin(Math.PI / 4)]], secao: { b: 0.2, h: 0.5 }, nome: 'VC' });
    const vc = s.modelo.vigas.find((x) => x.nome === 'VC')!;
    expect(vc.arcos).toHaveLength(1);
    ok(s, 'viga.comum', { id: vc.id, grupo: cob, de: 2, ate: 5 });
    const partes = s.modelo.vigas.filter((x) => x.grupo === tipo && x.pontos.every((p) => p[0] >= 14.99));
    expect(partes).toHaveLength(3);
    const meio = partes.find((x) => x.comum)!, assoc = s.modelo.vigas.find((x) => x.comumDe === meio.id)!;
    expect(assoc.arcos).toEqual(meio.arcos);
    expect(assoc.pontos).toEqual(meio.pontos);
    expect(meio.arcos).toBeDefined();
    expect(comprimentoDesenvolvido(meio)).toBeCloseTo(3, 1);
    expect(partes.reduce((t, x) => t + comprimentoDesenvolvido(x), 0)).toBeCloseTo((5 * Math.PI) / 2, 1);
    for (const x of partes) { expect(x.arcos).toBeDefined(); expect(circuloDoArco(x, x.arcos![0])!.R).toBeCloseTo(5, 2); }
  });
  it('copiar a viga comum para outro grupo (ou em série) não leva o vínculo', () => {
    const { s, tipo } = doisGrupos('comum');
    const o = s.modelo.vigas.find((x) => x.nome === 'V' && x.grupo === tipo)!;
    ok(s, 'grupo.criar', { nome: 'Outro' });
    const novo = s.modelo.grupos.find((g) => g.nome === 'Outro')!.id;
    ok(s, 'viga.copiarParaGrupos', { ids: [o.id], grupos: [novo] });
    const c = s.modelo.vigas.find((x) => x.grupo === novo)!;
    expect(c.comum).toBeUndefined();
    expect(c.comumDe).toBeUndefined();
    ok(s, 'viga.copiar', { ids: [o.id], dx: 0, dy: 10 });
    expect(s.modelo.vigas.filter((x) => x.comum)).toHaveLength(1);
  });
  it('pavimento alvo: o de menor cota igual ou acima; se não há, o mais alto abaixo', () => {
    const { s, tipo } = doisGrupos('comum');
    const o = s.modelo.vigas.find((x) => x.nome === 'V' && x.grupo === tipo)!;
    const pavs = pavimentosDoGrupo(s.modelo, tipo);
    expect(pavimentoAlvoComum(s.modelo, { cota: 4 }, o)!.id).toBe(pavs[1].id); // 6 m
    expect(pavimentoAlvoComum(s.modelo, { cota: 6 }, o)!.id).toBe(pavs[1].id);
    expect(pavimentoAlvoComum(s.modelo, { cota: 12 }, o)!.id).toBe(pavs[2].id); // nada acima de 12: o mais alto (9 m)
    expect(pavimentoAlvoComum(s.modelo, { cota: 0 }, o)!.id).toBe(pavs[0].id);
  });
});

/** Carga vertical total sobre a viga (kN) = soma dos cortantes nas duas pontas (a viga corre ao longo de y) no pavimento e caso dados. */
function cargaNaViga(s: Sessao, nome: string, cota: number, caso = 'G') {
  const an = analisarEdificio(s.modelo);
  expect(an.erro).toBeUndefined();
  const pav = s.modelo.pavimentos.find((p) => p.cota === cota)!;
  const v = s.modelo.vigas.find((x) => x.nome === nome && x.grupo === pav.grupo)!;
  const ic = an.casos.indexOf(caso), pm = an.portico, nos = pm.modelo.nos;
  const barras = pm.barras.map((t, bi) => ({ t, bi })).filter(({ t }) => t.tipo === 'viga' && t.ref === v.id && t.pavimento === pav.id);
  const ys = barras.flatMap(({ bi }) => [nos[pm.modelo.barras[bi].i][1], nos[pm.modelo.barras[bi].j][1]]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let P = 0;
  for (const { bi } of barras) {
    const br = pm.modelo.barras[bi], e = pm.res!.esforcos[ic][bi];
    if (Math.abs(nos[br.i][1] - y0) < 1e-6 || Math.abs(nos[br.i][1] - y1) < 1e-6) P += Math.abs(e[1]);
    if (Math.abs(nos[br.j][1] - y0) < 1e-6 || Math.abs(nos[br.j][1] - y1) < 1e-6) P += Math.abs(e[7]);
  }
  return { P, an };
}

describe.each([[0, 'modelo separado'], [1, 'modelo integrado']])('viga comum a dois grupos: análise, %s', (modeloGlobal) => {
  // lajes articuladas na viga em todos os modelos (engasteLajes = 0): a laje de outro nível não é contínua com a deste, e a viga única
  // equivalente fica com a mesma premissa de apoio simples para as duas lajes
  const com = (modo: ModoComum) => { const r = doisGrupos(modo); ok(r.s, 'viga.editar', { id: r.s.modelo.vigas.find((x) => x.nome === 'V')!.id, engasteLajes: 0 }); ok(r.s, 'opcoes.definir', { valores: { modeloGlobal } }); return r; };
  it('a viga associada não é barra do pórtico; a origem recebe as lajes dos dois grupos', () => {
    const { s, cob } = com('comum');
    const an = analisarEdificio(s.modelo);
    const w = s.modelo.vigas.find((x) => x.comumDe)!;
    expect(an.portico.barras.some((t) => t.tipo === 'viga' && t.ref === w.id)).toBe(false);
    const pavB = s.modelo.pavimentos.find((p) => p.grupo === cob)!;
    expect(an.portico.barras.some((t) => t.tipo === 'viga' && t.pavimento === pavB.id && t.ref === s.modelo.vigas.find((x) => x.nome === 'VB1')!.id)).toBe(true);
    expect(an.avisos.filter((a) => a.startsWith('Viga comum:'))).toHaveLength(0);
  });
  it('carga sobre a viga comum ≈ viga única com as lajes dos dois grupos (até 10 %: a associada flexa só com o seu lado, a distribuição das reações difere)', () => {
    const c = cargaNaViga(com('comum').s, 'V', 9).P, uni = cargaNaViga(com('unico').s, 'V', 9).P, sem = cargaNaViga(com('sem').s, 'V', 9).P;
    expect(c).toBeGreaterThan(1.5 * sem); // a laje do outro grupo chega à viga
    expect(Math.abs(c - uni) / uni).toBeLessThan(0.1);
    const q1 = cargaNaViga(com('comum').s, 'V', 9, 'Q').P, q2 = cargaNaViga(com('unico').s, 'V', 9, 'Q').P;
    expect(Math.abs(q1 - q2) / q2).toBeLessThan(0.1);
  });
  it('desfeita a viga comum, voltam as duas vigas independentes e a carga sobre a origem cai', () => {
    const { s } = com('comum');
    const antes = cargaNaViga(s, 'V', 9).P;
    ok(s, 'viga.comumDesfazer', { id: s.modelo.vigas.find((x) => x.comum)!.id });
    const depois = cargaNaViga(s, 'V', 9).P;
    expect(depois).toBeLessThan(0.7 * antes);
  });
  it('dimensionamento: a associada não é dimensionada; a origem informa a viga comum', () => {
    const { s } = com('comum');
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    const w = s.modelo.vigas.find((x) => x.comumDe)!, o = s.modelo.vigas.find((x) => x.comum)!;
    expect(dim.vigas.some((r) => r.viga === w.id)).toBe(false);
    const r = dim.vigas.find((x) => x.viga === o.id)!;
    expect(r.mensagens.some((m) => m.startsWith('Viga comum com o grupo Cobertura'))).toBe(true);
  });
});
