// Aba Modificar: fixar (alfinete), corresponder propriedades e mover/copiar lajes, cargas e paredes.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { lerEdificio } from './file';
import { ancoraDoElemento, bloqueioPorFixacao, elementoDe } from './fixacao';
import { normalizarEdificio } from './types';

function obra(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) expect(s.executar(c.nome, c.params, 'sistema').ok).toBe(true);
  const grupo = s.modelo.grupos.find((g) => g.nome === 'Tipo')!.id;
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('eixo.malha', { dx: [4], dy: [3] });
  for (const [x, y] of [[0, 0], [4, 0], [8, 0]]) ok('pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.3 } });
  ok('pilar.inserir', { x: 0, y: 6, secao: { tipo: 'ret', b: 0.3, h: 0.5 } });
  ok('laje.criar', { grupo, contorno: [[10, 0], [14, 0], [14, 3], [10, 3]] });
  ok('laje.criar', { grupo, contorno: [[20, 0], [23, 0], [23, 3], [20, 3]], tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
  ok('carga.ponto', { grupo, ponto: [1, 1], valor: 10 });
  ok('carga.area', { grupo, contorno: [[10, 0], [14, 0], [14, 3], [10, 3]], valor: 2, caso: 'Q' });
  return s;
}
const grupoTipo = (s: Sessao) => s.modelo.grupos.find((g) => g.nome === 'Tipo')!.id;

describe('fixar (alfinete)', () => {
  it('elemento fixado não é movido, girado, espelhado, apagado nem editado em posição; solto, volta a obedecer', () => {
    const s = obra();
    const [p1, p2] = s.modelo.pilares;
    expect(s.executar('elemento.fixar', { ids: [p1.id] }).ok).toBe(true);
    expect(s.modelo.fixados).toEqual([p1.id]);
    const antes = s.modelo;
    for (const [nome, p] of [
      ['pilar.mover', { ids: [p1.id, p2.id], dx: 1, dy: 0 }],
      ['pilar.remover', { ids: [p1.id] }],
      ['editar.girar', { pilares: [p1.id], centro: [0, 0], angulo: 90 }],
      ['editar.espelhar', { pilares: [p1.id], eixo: [[2, 0], [2, 5]] }],
      ['pilar.editar', { id: p1.id, x: 0.5, y: 0 }],
      ['lote', { comandos: [{ nome: 'pilar.mover', params: { ids: [p1.id], dx: 1, dy: 0 } }] }],
    ] as const) {
      const r = s.executar(nome, p);
      expect(r.ok, nome).toBe(false);
      expect(r.erros[0].codigo, nome).toBe('ELEMENTO_FIXADO');
      expect(r.erros[0].elementos, nome).toContain(p1.id);
    }
    expect(s.modelo).toBe(antes); // nada mudou
    // o que não é geometria, a cópia espelhada e os não fixados seguem livres
    expect(s.executar('pilar.mover', { ids: [p2.id], dx: 0, dy: 0.5 }).ok).toBe(true);
    expect(s.executar('pilar.editar', { id: p1.id, cobrimento: 4 }).ok).toBe(true);
    expect(s.executar('editar.espelhar', { pilares: [p1.id], eixo: [[2, 0], [2, 5]], copiar: true }).ok).toBe(true);
    expect(s.executar('elemento.soltar', { ids: [p1.id] }).ok).toBe(true);
    expect(s.modelo.fixados).toBeUndefined();
    expect(s.executar('pilar.mover', { ids: [p1.id], dx: 0, dy: 0.5 }).ok).toBe(true);
  });

  it('a mensagem nomeia o elemento e o verbo', () => {
    const s = obra();
    const p1 = s.modelo.pilares[0];
    s.executar('elemento.fixar', { ids: [p1.id] });
    const r = s.executar('pilar.remover', { ids: [p1.id] });
    expect(r.erros[0].mensagem).toBe(`Elemento fixado (${p1.nome}): não pode ser apagado. Solte-o antes (Soltar).`);
    expect(bloqueioPorFixacao(s.modelo, 'ref.mover', { id: p1.id })).toEqual([]); // o texto de referência não é o elemento
  });

  it('padrão útil: `tipos` fixa todos os eixos e gabaritos; eixos fixados não se movem pela ferramenta Mover (eixo.editar)', () => {
    const s = obra();
    const n = s.modelo.eixos.length;
    expect(n).toBeGreaterThan(0);
    expect(s.executar('elemento.fixar', { tipos: ['eixos', 'mascaras'] }).ok).toBe(true);
    expect(s.modelo.fixados).toHaveLength(n);
    const e = s.modelo.eixos[0];
    expect(s.executar('eixo.editar', { id: e.id, p1: [e.p1[0] + 1, e.p1[1]], p2: [e.p2[0] + 1, e.p2[1]] }).erros[0]?.codigo).toBe('ELEMENTO_FIXADO');
    expect(s.executar('eixo.remover', { ids: [e.id] }).erros[0]?.codigo).toBe('ELEMENTO_FIXADO');
    expect(s.executar('eixo.editar', { id: e.id, nome: 'Eixo A' }).ok).toBe(true); // só o nome
    expect(s.executar('elemento.soltar', { todos: true }).ok).toBe(true);
    expect(s.modelo.fixados).toBeUndefined();
  });

  it('refs inexistentes e solicitações vazias são recusadas; fixar é idempotente e não é cálculo', () => {
    const s = obra();
    expect(s.executar('elemento.fixar', { ids: ['nao_existe'] }).erros[0].codigo).toBe('ELEMENTO_INEXISTENTE');
    expect(s.executar('elemento.fixar', {}).erros[0].codigo).toBe('SELECAO_VAZIA');
    expect(s.executar('elemento.soltar', { todos: true }).erros[0].codigo).toBe('NENHUM_FIXADO');
    const rev = s.revCalculo;
    const id = s.modelo.pilares[0].id;
    s.executar('elemento.fixar', { ids: [id] });
    s.executar('elemento.fixar', { ids: [id] });
    expect(s.modelo.fixados).toEqual([id]);
    expect(s.revCalculo).toBe(rev);
    expect(elementoDe(s.modelo, id)?.tipo).toBe('pilar');
    expect(ancoraDoElemento(s.modelo, id, grupoTipo(s))).toEqual([0, 0]);
  });

  it('arquivos antigos (sem `fixados`) abrem; lista inválida é normalizada; desfazer volta ao estado anterior', () => {
    const s = obra();
    const b = s.modelo;
    expect(b.fixados).toBeUndefined();
    expect(normalizarEdificio(b).fixados).toBeUndefined();
    expect(normalizarEdificio({ ...b, fixados: ['a', 'a', 3 as unknown as string, 'b'] }).fixados).toEqual(['a', 'b']);
    expect(normalizarEdificio({ ...b, fixados: 'x' as unknown as string[] }).fixados).toBeUndefined();
    s.executar('elemento.fixar', { ids: [b.pilares[0].id] });
    s.desfazer();
    expect(s.modelo.fixados).toBeUndefined();
    s.refazer();
    const lido = lerEdificio(JSON.parse(JSON.stringify({ building: s.modelo, buildingLog: s.log })));
    expect(lido?.building.fixados).toEqual([b.pilares[0].id]);
  });
});

describe('mover e copiar lajes, cargas e paredes', () => {
  it('laje.mover desloca contorno e recusa pano sobre outro', () => {
    const s = obra();
    const [l1, l2] = s.modelo.lajes;
    expect(s.executar('laje.mover', { ids: [l1.id], dx: 0, dy: 10 }).ok).toBe(true);
    expect(s.modelo.lajes[0].contorno).toEqual([[10, 10], [14, 10], [14, 13], [10, 13]]);
    const r = s.executar('laje.mover', { ids: [l2.id], dx: -9.5, dy: 10.1 });
    expect(r.erros[0].codigo).toBe('LAJE_EXISTENTE');
    expect(r.erros[0].mensagem).toContain('ficaria sobre L1');
    expect(s.executar('laje.mover', { ids: [l2.id], dx: 0, dy: 0 }).erros[0].codigo).toBe('DESLOCAMENTO_NULO');
  });

  it('laje.copiar cria as cópias em série com os próximos números, mesmo tipo, e sem armadura editada', () => {
    const s = obra();
    const l2 = s.modelo.lajes[1];
    expect(s.executar('laje.copiar', { ids: [l2.id], dx: 0, dy: 10, vezes: 2 }).ok).toBe(true);
    const ls = s.modelo.lajes;
    expect(ls).toHaveLength(4);
    expect(ls.slice(2).map((l) => l.nome)).toEqual(['L3', 'L4']);
    expect(ls[2].contorno).toEqual([[20, 10], [23, 10], [23, 13], [20, 13]]);
    expect(ls[3].contorno).toEqual([[20, 20], [23, 20], [23, 23], [20, 23]]);
    expect(ls[2].tipo).toEqual(l2.tipo);
    expect(ls[2].id).not.toBe(l2.id);
    // a cópia cairia sobre a original
    expect(s.executar('laje.copiar', { ids: [l2.id], dx: 1, dy: 1, vezes: 1 }).erros[0].codigo).toBe('LAJE_EXISTENTE');
  });

  it('carga.mover e carga.copiar valem para pontual, linear e de área', () => {
    const s = obra();
    const [pt, ar] = s.modelo.cargas;
    expect(s.executar('carga.mover', { ids: [pt.id, ar.id], dx: 1, dy: 2 }).ok).toBe(true);
    expect(s.modelo.cargas[0].pontos).toEqual([[2, 3]]);
    expect(s.modelo.cargas[1].pontos[0]).toEqual([11, 2]);
    expect(s.executar('carga.copiar', { ids: [pt.id], dx: 0, dy: 1, vezes: 3 }).ok).toBe(true);
    const copias = s.modelo.cargas.slice(2);
    expect(copias.map((c) => c.pontos[0])).toEqual([[2, 4], [2, 5], [2, 6]]);
    expect(copias.every((c) => c.valor === 10 && c.caso === pt.caso && c.grupo === pt.grupo)).toBe(true);
    expect(new Set(s.modelo.cargas.map((c) => c.id)).size).toBe(5);
    expect(s.executar('carga.mover', { ids: ['x'], dx: 1, dy: 1 }).erros[0].codigo).toBe('CARGA_INEXISTENTE');
  });

  it('parede.copiar leva a viga embutida e dá o próximo número; fixada, a parede não se move', () => {
    const s = obra();
    const grupo = grupoTipo(s);
    expect(s.executar('parede.criar', { pontos: [[30, 0], [36, 0]], espessura: 0.2 }).ok).toBe(true);
    const w = s.modelo.paredes![0];
    expect(s.executar('parede.copiar', { ids: [w.id], dx: 0, dy: 5, vezes: 2 }).ok).toBe(true);
    const ws = s.modelo.paredes!;
    expect(ws.map((x) => x.nome)).toEqual([w.nome, 'M2', 'M3']);
    expect(ws[2].pontos).toEqual([[30, 10], [36, 10]]);
    expect(s.executar('parede.copiar', { ids: [w.id], dx: 0, dy: 0, vezes: 1 }).erros[0].codigo).toBe('DESLOCAMENTO_NULO');
    void grupo;
    s.executar('elemento.fixar', { ids: [w.id] });
    expect(s.executar('parede.mover', { ids: [w.id], dx: 1, dy: 0 }).erros[0].codigo).toBe('ELEMENTO_FIXADO');
  });
});

describe('corresponder propriedades', () => {
  it('seção de pilar de um para vários destinos; posição e outros campos ficam', () => {
    const s = obra();
    const [p1, p2, p3, p4] = s.modelo.pilares;
    expect(p4.secao).toEqual({ tipo: 'ret', b: 0.3, h: 0.5 });
    const r = s.executar('editar.corresponder', { origem: p4.id, destinos: [p1.id, p2.id, p3.id], campos: ['secao'] });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    for (const q of s.modelo.pilares.slice(0, 3)) expect(q.secao).toEqual({ tipo: 'ret', b: 0.3, h: 0.5 });
    expect(s.modelo.pilares.slice(0, 3).map((q) => [q.x, q.y])).toEqual([[0, 0], [4, 0], [8, 0]]);
    expect(s.modelo.pilares[0].cobrimento).toBeUndefined();
    s.desfazer();
    expect(s.modelo.pilares[0].secao).toEqual({ tipo: 'ret', b: 0.2, h: 0.3 });
  });

  it('cobrimento e tabela só copiam o escolhido; campo ausente na origem limpa o do destino', () => {
    const s = obra();
    const [p1, p2] = s.modelo.pilares;
    s.executar('pilar.editar', { id: p1.id, cobrimento: 4 });
    s.executar('pilar.editar', { id: p2.id, cobrimento: 2.5 });
    expect(s.executar('editar.corresponder', { origem: p1.id, destinos: [p2.id], campos: ['cobrimento'] }).ok).toBe(true);
    expect(s.modelo.pilares[1].cobrimento).toBe(4);
    s.executar('pilar.editar', { id: p1.id, cobrimento: 0 });
    expect(s.modelo.pilares[0].cobrimento).toBeUndefined();
    s.executar('editar.corresponder', { origem: p1.id, destinos: [p2.id], campos: ['cobrimento'] });
    expect(s.modelo.pilares[1].cobrimento).toBeUndefined();
  });

  it('cargas do pilar: as da origem substituem as do destino nos lances em comum', () => {
    const s = obra();
    const [p1, p2] = s.modelo.pilares;
    const lance = s.modelo.pavimentos.find((x) => x.id !== 'fundacao' && x.nome === 'Tipo 1')!.id;
    s.executar('carga.pilar', { pilar: p1.id, pavimento: lance, caso: 'Q', N: 50 });
    s.executar('carga.pilar', { pilar: p2.id, pavimento: lance, caso: 'G', N: 99 });
    const r = s.executar('editar.corresponder', { origem: p1.id, destinos: [p2.id], campos: ['cargas'] });
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    const doP2 = (s.modelo.cargasPilar ?? []).filter((c) => c.pilar === p2.id);
    expect(doP2.map((c) => [c.caso, c.N])).toEqual([['Q', 50]]);
    expect((s.modelo.cargasPilar ?? []).filter((c) => c.pilar === p1.id)).toHaveLength(1);
  });

  it('tipo de laje: pano a definir recebe o tipo da origem e a direção das nervuradas', () => {
    const s = obra();
    const [l1, l2] = s.modelo.lajes;
    expect(s.executar('editar.corresponder', { origem: l2.id, destinos: [l1.id], campos: ['tipo'] }).ok).toBe(true);
    expect(s.modelo.lajes[0].tipo).toEqual({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 });
    expect(s.modelo.lajes[0].direcao).toBeDefined(); // treliçada é unidirecional: direção do menor vão
  });

  it('seção da viga (b × h) e recusas: tipos diferentes, origem como destino, campo de outro tipo, pilar que invade outro', () => {
    const s = obra();
    const grupo = grupoTipo(s);
    s.executar('viga.tracar', { grupo, pontos: [[0, 0], [4, 0]], secao: { b: 0.15, h: 0.4 } });
    s.executar('viga.tracar', { grupo, pontos: [[4, 0], [8, 0]], secao: { b: 0.2, h: 0.6 } });
    const [v1, v2] = s.modelo.vigas;
    expect(s.executar('editar.corresponder', { origem: v2.id, destinos: [v1.id], campos: ['secao'] }).ok).toBe(true);
    expect(s.modelo.vigas[0].secao).toEqual({ b: 0.2, h: 0.6 });
    const [p1, , , p4] = s.modelo.pilares;
    void p4;
    expect(s.executar('editar.corresponder', { origem: p1.id, destinos: [v1.id], campos: ['secao'] }).erros[0].codigo).toBe('DESTINO_INVALIDO');
    expect(s.executar('editar.corresponder', { origem: p1.id, destinos: [p1.id], campos: ['secao'] }).erros[0].codigo).toBe('DESTINO_INVALIDO');
    expect(s.executar('editar.corresponder', { origem: p1.id, destinos: [p4.id], campos: ['tipo'] }).erros[0].codigo).toBe('CAMPO_INVALIDO');
    // um pilar largo (2,5 × 0,3 m) longe dos outros: com a seção dele, um pilar a 1 m de P2 (4; 0) o cobriria
    expect(s.executar('pilar.inserir', { x: 0, y: 10, secao: { tipo: 'ret', b: 2.5, h: 0.3 } }).ok).toBe(true);
    const largo = s.modelo.pilares.at(-1)!;
    expect(s.executar('pilar.inserir', { x: 3, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.3 } }).ok).toBe(true);
    const perto = s.modelo.pilares.at(-1)!;
    const r = s.executar('editar.corresponder', { origem: largo.id, destinos: [perto.id], campos: ['secao'] });
    expect(r.erros[0]?.codigo).toBe('PILAR_SOBREPOSTO');
    expect(s.modelo.pilares.at(-1)!.secao).toEqual({ tipo: 'ret', b: 0.2, h: 0.3 });
  });
});
