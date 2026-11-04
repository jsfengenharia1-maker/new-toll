// Alinhar, trava de alinhamento e deslocar paralelo (L9): posições exatas, propagação da trava, recusas, desfazer/refazer.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from './index';
import { contornoPilar, centroPilar, geometriaViga, type BuildingModel } from '../building/types';
import { candidatosRef, translacaoParaAlinhar } from '../geom/referencias';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const sec = { b: 0.2, h: 0.5 };
const pil = { tipo: 'ret', b: 0.3, h: 0.3 };
const norte = (b: BuildingModel, nome: string) => { const q = b.pilares.find((x) => x.nome === nome)!; return Math.max(...contornoPilar(q, q.secao).map((c) => c[1])); };
const P = (b: BuildingModel, nome: string) => b.pilares.find((x) => x.nome === nome)!;

/** P1 em (0,0) e P2 em (4, 0,13): faces norte em 0,15 e 0,28. */
function dois() {
  const s = padrao();
  ok(s, 'pilar.inserir', { x: 0, y: 0, secao: pil });
  ok(s, 'pilar.inserir', { x: 4, y: 0.13, secao: pil });
  return s;
}
// contornoPilar: canto 0 (-,-), 1 (+,-), 2 (+,+), 3 (-,+): face f2 = aresta do canto 2 ao 3 = norte
const refN = (id: string) => ({ k: 'pilar', id, parte: 'f2' }) as const;

describe('alinhar', () => {
  it('face norte de P2 coincide exatamente com a de P1; o ponto fixo e a seção não mudam', () => {
    const s = dois();
    const [p1, p2] = s.modelo.pilares;
    expect(norte(s.modelo, 'P1')).toBeCloseTo(0.15, 9);
    expect(norte(s.modelo, 'P2')).toBeCloseTo(0.28, 9);
    ok(s, 'editar.alinhar', { ref: refN(p1.id), alvo: refN(p2.id) });
    expect(norte(s.modelo, 'P2')).toBeCloseTo(0.15, 9);
    expect(P(s.modelo, 'P2').x).toBe(4); // só o y mudou
    expect(P(s.modelo, 'P2').y).toBeCloseTo(0.0, 9);
    expect(P(s.modelo, 'P2')).toMatchObject({ ajuste: 'c', angulo: 0, secao: pil });
    expect(s.modelo.restricoes).toBeUndefined(); // sem travar, nada guardado
    s.desfazer();
    expect(P(s.modelo, 'P2').y).toBeCloseTo(0.13, 9);
    s.refazer();
    expect(norte(s.modelo, 'P2')).toBeCloseTo(0.15, 9);
  });

  it('pelo centro: o eixo de P2 coincide com o eixo de P1 (ponto fixo no canto preservado)', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: pil, ajuste: 'so' });
    ok(s, 'pilar.inserir', { x: 5, y: 0.37, secao: { tipo: 'ret', b: 0.2, h: 0.5 }, ajuste: 'so' });
    const [a, z] = s.modelo.pilares;
    ok(s, 'editar.alinhar', { ref: { k: 'pilar', id: a.id, parte: 'cx' }, alvo: { k: 'pilar', id: z.id, parte: 'cx' } });
    const b = s.modelo;
    expect(centroPilar(P(b, 'P2'), P(b, 'P2').secao)[1]).toBeCloseTo(centroPilar(P(b, 'P1'), P(b, 'P1').secao)[1], 9);
    expect(P(b, 'P2').ajuste).toBe('so');
  });

  it('com distância: face a 0,10 m da referência (à esquerda)', () => {
    const s = dois();
    const [p1, p2] = s.modelo.pilares;
    // a face norte (f2) vai do canto 2 ao 3, sentido -x: a esquerda é -y, P2 fica 0,10 m abaixo da face de P1
    ok(s, 'editar.alinhar', { ref: refN(p1.id), alvo: refN(p2.id), distancia: 0.1 });
    expect(norte(s.modelo, 'P2')).toBeCloseTo(0.05, 9);
  });

  it('viga alinhada pela face ao eixo da malha; viga não paralela é recusada', () => {
    const s = padrao();
    ok(s, 'eixo.criar', { nome: 'A', p1: [0, 2], p2: [10, 2] });
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 2.37], [6, 2.37]], secao: sec });
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 5], [6, 6]], secao: sec });
    const [v1, v2] = s.modelo.vigas;
    const eixo = s.modelo.eixos[0];
    ok(s, 'editar.alinhar', { ref: { k: 'eixo', id: eixo.id }, alvo: { k: 'viga', id: v1.id, trecho: 0, parte: 'esq' } });
    const g = geometriaViga(s.modelo.vigas[0]);
    expect(g.esq[0][1]).toBeCloseTo(2, 9);
    expect(g.esq[1][1]).toBeCloseTo(2, 9);
    expect(s.modelo.vigas[0].pontos[0][0]).toBe(0); // translação só na normal
    const r = s.executar('editar.alinhar', { ref: { k: 'eixo', id: eixo.id }, alvo: { k: 'viga', id: v2.id, trecho: 0, parte: 'eixo' } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('ALINHAMENTO_RECUSADO');
    expect(r.erros[0].mensagem).toMatch(/paralelo/);
    expect(s.modelo.vigas[1].pontos).toEqual([[0, 5], [6, 6]]);
  });

  it('viga em polilinha: só o trecho escolhido é transladado', () => {
    const s = padrao();
    ok(s, 'eixo.criar', { nome: 'B', p1: [0, 1], p2: [10, 1] });
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 1.4], [4, 1.4], [4, 5]], secao: sec });
    const v = s.modelo.vigas[0];
    ok(s, 'editar.alinhar', { ref: { k: 'eixo', id: s.modelo.eixos[0].id }, alvo: { k: 'viga', id: v.id, trecho: 0, parte: 'eixo' } });
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 1], [4, 1], [4, 5]]);
  });

  it('recusa o mesmo elemento, referência inexistente e descritor inválido', () => {
    const s = dois();
    const [p1] = s.modelo.pilares;
    expect(s.executar('editar.alinhar', { ref: refN(p1.id), alvo: { k: 'pilar', id: p1.id, parte: 'f0' } }).erros[0].codigo).toBe('MESMO_ELEMENTO');
    expect(s.executar('editar.alinhar', { ref: { k: 'eixo', id: 'zzz' }, alvo: refN(p1.id) }).erros[0].codigo).toBe('ALINHAMENTO_RECUSADO');
    expect(s.executar('editar.alinhar', { ref: { k: 'pilar', id: p1.id, parte: 'x9' }, alvo: refN(p1.id) }).erros[0].codigo).toBe('REF_INVALIDA');
  });

  it('pilar girado 30° não é paralelo à face de outro: recusado', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: pil });
    ok(s, 'pilar.inserir', { x: 4, y: 0, secao: pil, angulo: 30 });
    const [a, z] = s.modelo.pilares;
    expect(s.executar('editar.alinhar', { ref: refN(a.id), alvo: refN(z.id) }).erros[0].mensagem).toMatch(/paralelo/);
  });
});

describe('trava de alinhamento (cadeado)', () => {
  it('travar ao alinhar: mover P1 de 0,5 m faz P2 acompanhar; desfazer volta os dois', () => {
    const s = dois();
    const [p1, p2] = s.modelo.pilares;
    ok(s, 'editar.alinhar', { ref: refN(p1.id), alvo: refN(p2.id), travar: true });
    expect(s.modelo.restricoes).toHaveLength(1);
    const r = ok(s, 'pilar.mover', { ids: [p1.id], dx: 0, dy: 0.5 });
    expect(r.mensagem).toMatch(/P2 acompanhou/);
    expect(P(s.modelo, 'P1').y).toBeCloseTo(0.5, 9);
    expect(norte(s.modelo, 'P2')).toBeCloseTo(norte(s.modelo, 'P1'), 9);
    expect(P(s.modelo, 'P2').y).toBeCloseTo(0.5, 9);
    expect(P(s.modelo, 'P2').x).toBe(4);
    s.desfazer(); // um só passo: o movimento e o acompanhamento
    expect(P(s.modelo, 'P1').y).toBeCloseTo(0, 9);
    expect(P(s.modelo, 'P2').y).toBeCloseTo(0, 9);
    s.refazer();
    expect(P(s.modelo, 'P2').y).toBeCloseTo(0.5, 9);
  });

  it('travar depois, com cadeado (restricao.alinhamento), mantém a distância atual; destravar solta', () => {
    const s = dois();
    const [p1, p2] = s.modelo.pilares;
    ok(s, 'restricao.alinhamento', { ref: refN(p1.id), alvo: refN(p2.id) });
    expect(s.modelo.restricoes![0].distancia).toBeCloseTo(-0.13, 9); // P2 está 0,13 m ao norte (direita da face, orientada para -x)
    ok(s, 'pilar.mover', { ids: [p1.id], dx: 1, dy: 1 });
    expect(norte(s.modelo, 'P2') - norte(s.modelo, 'P1')).toBeCloseTo(0.13, 9);
    ok(s, 'restricao.alinhamento', { alvo: refN(p2.id), remover: true });
    expect(s.modelo.restricoes).toBeUndefined();
    ok(s, 'pilar.mover', { ids: [p1.id], dx: 0, dy: 2 });
    expect(P(s.modelo, 'P2').y).toBeCloseTo(1.13, 9);
  });

  it('acompanha eixo da malha e viga de referência; cadeia A segue B, B segue C', () => {
    const s = padrao();
    ok(s, 'eixo.criar', { nome: 'A', p1: [0, 0], p2: [10, 0] });
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 3.3], [6, 3.3]], secao: sec });
    ok(s, 'pilar.inserir', { x: 8, y: 7, secao: pil });
    const eixo = s.modelo.eixos[0], v = s.modelo.vigas[0], q = s.modelo.pilares[0];
    ok(s, 'editar.alinhar', { ref: { k: 'eixo', id: eixo.id }, alvo: { k: 'viga', id: v.id, trecho: 0, parte: 'eixo' }, travar: true });
    ok(s, 'editar.alinhar', { ref: { k: 'viga', id: v.id, trecho: 0, parte: 'eixo' }, alvo: { k: 'pilar', id: q.id, parte: 'cx' }, travar: true });
    expect(s.modelo.vigas[0].pontos[0][1]).toBeCloseTo(0, 9);
    expect(centroPilar(s.modelo.pilares[0], pil as never)[1]).toBeCloseTo(0, 9);
    ok(s, 'eixo.editar', { id: eixo.id, p1: [0, 2], p2: [10, 2] });
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 2], [6, 2]]);
    expect(centroPilar(s.modelo.pilares[0], pil as never)[1]).toBeCloseTo(2, 9);
  });

  it('o elemento travado volta à posição se for movido sozinho; remover a referência solta a trava com aviso', () => {
    const s = dois();
    const [p1, p2] = s.modelo.pilares;
    ok(s, 'editar.alinhar', { ref: refN(p1.id), alvo: refN(p2.id), travar: true });
    const r = ok(s, 'pilar.mover', { ids: [p2.id], dx: 0, dy: 1 });
    expect(P(s.modelo, 'P2').y).toBeCloseTo(0, 9);
    expect(r.mensagem).toMatch(/acompanhou/);
    const r2 = ok(s, 'pilar.remover', { ids: [p1.id] });
    expect(r2.mensagem).toMatch(/Trava de alinhamento de P2 removida/);
    expect(s.modelo.restricoes).toBeUndefined();
  });

  it('recusa trava cíclica e restrição com elemento não paralelo', () => {
    const s = dois();
    const [p1, p2] = s.modelo.pilares;
    ok(s, 'editar.alinhar', { ref: refN(p1.id), alvo: refN(p2.id), travar: true });
    const r = s.executar('restricao.alinhamento', { ref: refN(p2.id), alvo: refN(p1.id) });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('TRAVA_CICLICA');
  });

  it('trava substitui a anterior do mesmo alvo (uma por alvo)', () => {
    const s = dois();
    ok(s, 'eixo.criar', { nome: 'A', p1: [0, 1], p2: [10, 1] });
    const [p1, p2] = s.modelo.pilares;
    ok(s, 'editar.alinhar', { ref: refN(p1.id), alvo: refN(p2.id), travar: true });
    ok(s, 'editar.alinhar', { ref: { k: 'eixo', id: s.modelo.eixos[0].id }, alvo: refN(p2.id), travar: true });
    expect(s.modelo.restricoes).toHaveLength(1);
    expect(s.modelo.restricoes![0].ref).toMatchObject({ k: 'eixo' });
  });
});

describe('referências', () => {
  it('translacaoParaAlinhar: perpendicular à referência; não paralelas devolvem null', () => {
    const ref = { p: [0, 0] as [number, number], u: [1, 0] as [number, number] };
    expect(translacaoParaAlinhar(ref, { p: [3, 2], u: [1, 0] })).toEqual([0, -2]);
    expect(translacaoParaAlinhar(ref, { p: [3, 2], u: [-1, 0] }, 0.5)).toEqual([0, -1.5]);
    expect(translacaoParaAlinhar(ref, { p: [3, 2], u: [Math.SQRT1_2, Math.SQRT1_2] })).toBeNull();
  });

  it('candidatos sob o cursor: faces e centro do pilar, eixo e faces de viga, em ordem de proximidade', () => {
    const s = dois();
    ok(s, 'eixo.criar', { nome: 'A', p1: [-1, 0.15], p2: [10, 0.15] });
    const b = s.modelo;
    const c = candidatosRef({ pilares: b.pilares, vigas: b.vigas, eixos: b.eixos }, [0, 0.14], 0.05);
    expect(c.map((x) => x.rotulo)).toEqual(expect.arrayContaining(['face de P1', 'eixo A']));
    expect(c[0].dist).toBeLessThanOrEqual(c[c.length - 1].dist);
    const dentro = candidatosRef({ pilares: b.pilares, vigas: b.vigas }, [0, 0], 0.05, { alvo: true });
    expect(dentro.map((x) => x.ref)).toEqual([{ k: 'pilar', id: b.pilares[0].id, parte: 'cx' }, { k: 'pilar', id: b.pilares[0].id, parte: 'cy' }]);
  });
});

describe('deslocar paralelo', () => {
  it('viga: 2,0 m à esquerda (move) e à direita; com copiar, cria V novo no mesmo grupo', () => {
    const s = padrao();
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [6, 0]], secao: sec });
    const v = s.modelo.vigas[0];
    ok(s, 'editar.deslocar', { vigas: [v.id], distancia: 2, copiar: true });
    expect(s.modelo.vigas).toHaveLength(2);
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 0], [6, 0]]);
    expect(s.modelo.vigas[1].pontos).toEqual([[0, 2], [6, 2]]);
    expect(s.modelo.vigas[1]).toMatchObject({ nome: 'V2', grupo: 'g_3', secao: sec });
    ok(s, 'editar.deslocar', { vigas: [v.id], distancia: 2, lado: 'dir' });
    expect(s.modelo.vigas[0].pontos).toEqual([[0, -2], [6, -2]]);
    s.desfazer();
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 0], [6, 0]]);
  });

  it('lado pelo ponto (cursor) e polilinha com cantos em esquadria', () => {
    const s = padrao();
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [4, 0], [4, 4]], secao: sec });
    const v = s.modelo.vigas[0];
    ok(s, 'editar.deslocar', { vigas: [v.id], distancia: 1, ponto: [2, -3] }); // abaixo = direita do traçado
    const p = s.modelo.vigas[0].pontos;
    expect(p[0]).toEqual([0, -1]);
    expect(p[1][0]).toBeCloseTo(5, 6); expect(p[1][1]).toBeCloseTo(-1, 6);
    expect(p[2][0]).toBeCloseTo(5, 6); expect(p[2][1]).toBeCloseTo(4, 6);
  });

  it('eixo (copiar e mover) e parede (a viga embutida acompanha)', () => {
    const s = padrao();
    ok(s, 'eixo.criar', { nome: 'A', p1: [0, 0], p2: [10, 0] });
    const e = s.modelo.eixos[0];
    ok(s, 'editar.deslocar', { eixos: [e.id], distancia: 3.5, copiar: true });
    expect(s.modelo.eixos.map((x) => [x.nome, x.p1[1]])).toEqual([['A', 0], ["A'", 3.5]]);
    ok(s, 'editar.deslocar', { eixos: [e.id], distancia: 1, lado: 'dir' });
    expect(s.modelo.eixos[0].p1).toEqual([0, -1]);
    ok(s, 'parede.criar', { pontos: [[0, 10], [5, 10]], espessura: 0.2 });
    const w = s.modelo.paredes![0];
    ok(s, 'editar.deslocar', { paredes: [w.id], distancia: 2, copiar: true });
    expect(s.modelo.paredes).toHaveLength(2);
    expect(s.modelo.paredes![1].pontos).toEqual([[0, 12], [5, 12]]);
    expect(s.modelo.paredes![1].nome).toBe('M2');
  });

  it('recusa seleção vazia, inexistente e parede que ficaria sobreposta a outra', () => {
    const s = padrao();
    expect(s.executar('editar.deslocar', { distancia: 1 }).erros[0].codigo).toBe('SELECAO_VAZIA');
    expect(s.executar('editar.deslocar', { vigas: ['x'], distancia: 1 }).erros[0].codigo).toBe('ELEMENTO_INEXISTENTE');
    ok(s, 'parede.criar', { pontos: [[0, 0], [5, 0]], espessura: 0.2 });
    ok(s, 'parede.criar', { pontos: [[0, 3], [5, 3]], espessura: 0.2 });
    const [w1] = s.modelo.paredes!;
    expect(s.executar('editar.deslocar', { paredes: [w1.id], distancia: 3 }).ok).toBe(false);
  });
});

describe('integração com fixação (alfinete)', () => {
  it('eixo fixado pode ser referência do alinhamento; pilar fixado não pode ser alinhado', () => {
    const s = padrao();
    ok(s, 'eixo.criar', { nome: 'A', p1: [0, 0], p2: [10, 0] });
    ok(s, 'pilar.inserir', { x: 4, y: 0.37, secao: pil });
    const eixo = s.modelo.eixos[0], q = s.modelo.pilares[0];
    ok(s, 'elemento.fixar', { ids: [eixo.id] });
    ok(s, 'editar.alinhar', { ref: { k: 'eixo', id: eixo.id }, alvo: { k: 'pilar', id: q.id, parte: 'cx' } });
    expect(centroPilar(s.modelo.pilares[0], pil as never)[1]).toBeCloseTo(0, 9);
    ok(s, 'elemento.fixar', { ids: [q.id] });
    const r = s.executar('editar.alinhar', { ref: { k: 'eixo', id: eixo.id }, alvo: { k: 'pilar', id: q.id, parte: 'cy' } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('ELEMENTO_FIXADO');
    expect(r.erros[0].elementos).toEqual([q.id]);
  });

  it('deslocar: eixo fixado não é deslocado, mas pode ser copiado', () => {
    const s = padrao();
    ok(s, 'eixo.criar', { nome: 'A', p1: [0, 0], p2: [10, 0] });
    const id = s.modelo.eixos[0].id;
    ok(s, 'elemento.fixar', { ids: [id] });
    const r = s.executar('editar.deslocar', { eixos: [id], distancia: 2 });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('ELEMENTO_FIXADO');
    ok(s, 'editar.deslocar', { eixos: [id], distancia: 2, copiar: true });
    expect(s.modelo.eixos).toHaveLength(2);
  });

  it('referência de uma trava cujo alvo está fixado não se move: comando recusado, modelo intacto', () => {
    const s = dois();
    const [p1, p2] = s.modelo.pilares;
    ok(s, 'editar.alinhar', { ref: refN(p1.id), alvo: refN(p2.id), travar: true });
    ok(s, 'elemento.fixar', { ids: [p2.id] });
    const antes = s.modelo;
    const r = s.executar('pilar.mover', { ids: [p1.id], dx: 0, dy: 0.5 });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('ELEMENTO_FIXADO');
    expect(r.erros[0].mensagem).toMatch(/P2 está fixado e travado/);
    expect(s.modelo).toBe(antes);
    ok(s, 'elemento.soltar', { ids: [p2.id] });
    ok(s, 'pilar.mover', { ids: [p1.id], dx: 0, dy: 0.5 });
    expect(P(s.modelo, 'P2').y).toBeCloseTo(0.5, 9);
  });

  it('editar.matriz copia elementos fixados (copiar não move)', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: pil });
    const id = s.modelo.pilares[0].id;
    ok(s, 'elemento.fixar', { ids: [id] });
    ok(s, 'editar.matriz', { pilares: [id], modo: 'linear', base: [0, 0], destino: [0, 3], referencia: 'ultimo', copias: 2 });
    expect(s.modelo.pilares).toHaveLength(3);
  });
});
