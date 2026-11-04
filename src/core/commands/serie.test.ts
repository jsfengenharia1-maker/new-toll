import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from './index';
import { cruzamentosDosEixos, passoPolar, transformacoesMatriz } from './serie';

const SEC = { tipo: 'ret' as const, b: 0.2, h: 0.4 };
const VIGA = { b: 0.15, h: 0.4 };
function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const falha = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, n).toBe(false); return r.erros.map((e) => e.codigo); };
/** Malha 3 × 3 eixos: x = 0, 4, 8 (eixos 1, 2, 3) e y = 0, 3, 6 (A, B, C). */
function malha(): Sessao { const s = padrao(); ok(s, 'eixo.malha', { dx: [4, 4], dy: [3, 3] }); return s; }
const xy = (s: Sessao) => s.modelo.pilares.map((p) => [p.x, p.y]);

describe('cruzamentos dos eixos', () => {
  it('malha 3 × 3: nove cruzamentos exatos, por y e depois x', () => {
    const c = cruzamentosDosEixos(malha().modelo);
    expect(c.map((q) => q.ponto)).toEqual([[0, 0], [4, 0], [8, 0], [0, 3], [4, 3], [8, 3], [0, 6], [4, 6], [8, 6]]);
    expect(c.every((q) => q.eixos.length === 2)).toBe(true);
  });
  it('eixos inclinados e paralelos: só os pares secantes, nos pontos exatos', () => {
    const s = padrao();
    ok(s, 'eixo.criar', { nome: 'a', p1: [0, 0], p2: [10, 10] });
    ok(s, 'eixo.criar', { nome: 'b', p1: [0, 10], p2: [10, 0] });
    ok(s, 'eixo.criar', { nome: 'c', p1: [0, 1], p2: [10, 11] }); // paralelo a 'a'
    expect(cruzamentosDosEixos(s.modelo).map((q) => q.ponto)).toEqual([[5, 5], [4.5, 5.5]]);
  });
  it('segmentos que não se encontram não geram cruzamento', () => {
    const s = padrao();
    ok(s, 'eixo.criar', { nome: 'a', p1: [0, 0], p2: [1, 0] });
    ok(s, 'eixo.criar', { nome: 'b', p1: [3, -1], p2: [3, 1] });
    expect(cruzamentosDosEixos(s.modelo)).toEqual([]);
  });
});

describe('pilar.nosEixos', () => {
  it('malha 3 × 3 → 9 pilares nos cruzamentos, com seção, ponto fixo e ângulo', () => {
    const s = malha();
    const r = ok(s, 'pilar.nosEixos', { secao: SEC, ajuste: 'so', angulo: 90 });
    expect(xy(s)).toEqual([[0, 0], [4, 0], [8, 0], [0, 3], [4, 3], [8, 3], [0, 6], [4, 6], [8, 6]]);
    expect(s.modelo.pilares.map((p) => p.nome)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']);
    expect(s.modelo.pilares.every((p) => p.angulo === 90 && p.ajuste === 'so' && p.secao.tipo === 'ret' && p.nasce === 'fundacao')).toBe(true);
    expect(r.mensagem).toContain('9 pilar');
  });
  it('só os eixos escolhidos: eixos 1, 2 e A → 2 cruzamentos', () => {
    const s = malha();
    const id = (n: string) => s.modelo.eixos.find((e) => e.nome === n)!.id;
    ok(s, 'pilar.nosEixos', { eixos: [id('1'), id('2'), id('A')], secao: SEC });
    expect(xy(s)).toEqual([[0, 0], [4, 0]]);
    expect(falha(s, 'pilar.nosEixos', { eixos: [id('1')], secao: SEC })).toEqual(['EIXOS_INSUFICIENTES']);
    expect(falha(s, 'pilar.nosEixos', { eixos: [id('1'), 'nao'], secao: SEC })).toEqual(['EIXO_INEXISTENTE']);
  });
  it('pula cruzamentos onde já há pilar e avisa na mensagem', () => {
    const s = malha();
    ok(s, 'pilar.inserir', { x: 4, y: 3, secao: SEC });
    ok(s, 'pilar.inserir', { x: 8.05, y: 6, secao: SEC }); // seção sobreposta ao cruzamento (8; 6)
    const r = ok(s, 'pilar.nosEixos', { secao: SEC });
    expect(s.modelo.pilares.length).toBe(2 + 7);
    expect(r.mensagem).toContain('2 cruzamento(s) pulado(s)');
    expect(r.mensagem).toContain('(4; 3)');
    expect(falha(s, 'pilar.nosEixos', { secao: SEC })).toEqual(['CRUZAMENTOS_OCUPADOS']);
  });
  it('sem cruzamentos (eixos paralelos) é recusado', () => {
    const s = padrao();
    ok(s, 'eixo.malha', { dx: [4, 4], dy: [] });
    expect(falha(s, 'pilar.nosEixos', { secao: SEC })).toEqual(['SEM_CRUZAMENTOS']);
  });
  it('desfazer remove os nove pilares num só passo', () => {
    const s = malha();
    ok(s, 'pilar.nosEixos', { secao: SEC });
    s.desfazer();
    expect(s.modelo.pilares.length).toBe(0);
  });
});

describe('viga.nosEixos', () => {
  const comPilares = () => { const s = malha(); ok(s, 'pilar.nosEixos', { secao: SEC }); return s; };
  it('malha 3 × 3 com pilares → 6 vigas contínuas, uma por eixo, do primeiro ao último pilar, alinhadas pelo eixo', () => {
    const s = comPilares();
    const r = ok(s, 'viga.nosEixos', { grupo: 'g_3', secao: VIGA });
    const vs = s.modelo.vigas;
    expect(vs.length).toBe(6);
    expect(vs.map((v) => v.pontos)).toEqual([[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[8, 0], [8, 6]], [[0, 0], [8, 0]], [[0, 3], [8, 3]], [[0, 6], [8, 6]]]);
    expect(vs.every((v) => v.alinhamento === 'centro' && v.secao.b === 0.15 && v.grupo === 'g_3')).toBe(true);
    expect(vs.map((v) => v.nome)).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
    expect(r.mensagem).toContain('V1');
  });
  it('trechos já cobertos por viga existente não se repetem', () => {
    const s = comPilares();
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [8, 0]], secao: VIGA });
    ok(s, 'viga.nosEixos', { grupo: 'g_3', secao: VIGA });
    expect(s.modelo.vigas.length).toBe(1 + 5);
    expect(falha(s, 'viga.nosEixos', { grupo: 'g_3', secao: VIGA })).toEqual(['SEM_TRECHOS']);
  });
  it('apoio pode ser viga transversal: eixo em x = 2 entre as vigas de y = 0, 3 e 6', () => {
    const s = comPilares();
    ok(s, 'viga.nosEixos', { grupo: 'g_3', secao: VIGA, eixos: s.modelo.eixos.filter((e) => ['A', 'B', 'C'].includes(e.nome)).map((e) => e.id) });
    ok(s, 'eixo.criar', { nome: 'M', p1: [2, -1], p2: [2, 7] });
    const m = s.modelo.eixos.find((e) => e.nome === 'M')!;
    ok(s, 'viga.nosEixos', { grupo: 'g_3', secao: VIGA, eixos: [m.id] });
    expect(s.modelo.vigas.at(-1)!.pontos).toEqual([[2, 0], [2, 6]]);
  });
  it('o trecho interrompido por viga existente gera vigas separadas só nos trechos livres', () => {
    const s = comPilares();
    // cobre o trecho do eixo 2 (x = 4) entre y = 3 e y = 6
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[4, 3], [4, 6]], secao: VIGA });
    const e2 = s.modelo.eixos.find((e) => e.nome === '2')!;
    ok(s, 'viga.nosEixos', { grupo: 'g_3', secao: VIGA, eixos: [e2.id] });
    expect(s.modelo.vigas.map((v) => v.pontos)).toEqual([[[4, 3], [4, 6]], [[4, 0], [4, 3]]]);
  });
  it('recusa grupo ou eixo inexistente e obra sem apoios', () => {
    const s = malha();
    expect(falha(s, 'viga.nosEixos', { grupo: 'x', secao: VIGA })).toEqual(['GRUPO_INEXISTENTE']);
    expect(falha(s, 'viga.nosEixos', { grupo: 'g_3', secao: VIGA, eixos: ['nao'] })).toEqual(['EIXO_INEXISTENTE']);
    expect(falha(s, 'viga.nosEixos', { grupo: 'g_3', secao: VIGA })).toEqual(['SEM_TRECHOS']);
  });
});

describe('editar.matriz', () => {
  function modelo() {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 0, y: 0, secao: SEC });
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [4, 0]], secao: VIGA });
    ok(s, 'laje.criar', { grupo: 'g_3', contorno: [[10, 0], [12, 0], [12, 2], [10, 2]] });
    ok(s, 'carga.ponto', { grupo: 'g_3', ponto: [1, 1], valor: 10 });
    return s;
  }
  const sel = (s: Sessao) => ({ pilares: [s.modelo.pilares[0].id], vigas: [s.modelo.vigas[0].id], lajes: [s.modelo.lajes[0].id], cargas: [s.modelo.cargas[0].id] });

  it('linear "até o último": 4 cópias entre (0; 0) e (8; 0) → x = 2, 4, 6, 8', () => {
    const s = modelo();
    const r = ok(s, 'editar.matriz', { pilares: [s.modelo.pilares[0].id], modo: 'linear', base: [0, 0], destino: [8, 0], referencia: 'ultimo', copias: 4 });
    expect(xy(s)).toEqual([[0, 0], [2, 0], [4, 0], [6, 0], [8, 0]]);
    expect(s.modelo.pilares.map((p) => p.nome)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(r.mensagem).toContain('4 cópia');
  });
  it('linear "passo": destino é a distância entre cópias → x = 3, 6, 9', () => {
    const s = modelo();
    ok(s, 'editar.matriz', { pilares: [s.modelo.pilares[0].id], modo: 'linear', base: [1, 1], destino: [4, 1], copias: 3 });
    expect(xy(s)).toEqual([[0, 0], [3, 0], [6, 0], [9, 0]]);
  });
  it('linear em y: vigas, lajes e cargas copiadas com coordenadas exatas e números seguintes', () => {
    const s = modelo();
    ok(s, 'editar.matriz', { ...sel(s), modo: 'linear', base: [0, 0], destino: [0, 5], copias: 2 });
    const m = s.modelo;
    expect(m.vigas.map((v) => v.pontos)).toEqual([[[0, 0], [4, 0]], [[0, 5], [4, 5]], [[0, 10], [4, 10]]]);
    expect(m.vigas.map((v) => v.nome)).toEqual(['V1', 'V2', 'V3']);
    expect(m.lajes.map((l) => l.contorno[0])).toEqual([[10, 0], [10, 5], [10, 10]]);
    expect(m.lajes.map((l) => l.nome)).toEqual(['L1', 'L2', 'L3']);
    expect(m.cargas.map((c) => c.pontos[0])).toEqual([[1, 1], [1, 6], [1, 11]]);
    expect(m.cargas.map((c) => c.valor)).toEqual([10, 10, 10]);
    expect(xy(s)).toEqual([[0, 0], [0, 5], [0, 10]]);
  });
  it('polar 360° com 3 cópias: 4 posições a 90° (raio 2); a cópia gira junto', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 2, y: 0, secao: SEC });
    ok(s, 'editar.matriz', { pilares: [s.modelo.pilares[0].id], modo: 'polar', centro: [0, 0], angulo: 360, copias: 3 });
    const q = s.modelo.pilares;
    expect(q.length).toBe(4);
    [[0, 2, 90], [-2, 0, 180], [0, -2, 270]].forEach(([x, y, a], i) => {
      expect(q[i + 1].x).toBeCloseTo(x, 9); expect(q[i + 1].y).toBeCloseTo(y, 9); expect(q[i + 1].angulo).toBeCloseTo(a, 9);
    });
  });
  it('polar com ângulo total 90° e 3 cópias → 30°, 60°, 90°; "entre cópias" 45° com 2 → 45°, 90°', () => {
    const s = padrao();
    ok(s, 'pilar.inserir', { x: 2, y: 0, secao: SEC });
    ok(s, 'editar.matriz', { pilares: [s.modelo.pilares[0].id], modo: 'polar', centro: [0, 0], angulo: 90, copias: 3 });
    expect(s.modelo.pilares.slice(1).map((p) => p.angulo)).toEqual([30, 60, 90]);
    expect(s.modelo.pilares[1].x).toBeCloseTo(2 * Math.cos(Math.PI / 6), 9);
    expect(s.modelo.pilares[1].y).toBeCloseTo(1, 9);
    const t = padrao();
    ok(t, 'pilar.inserir', { x: 2, y: 0, secao: SEC });
    ok(t, 'editar.matriz', { pilares: [t.modelo.pilares[0].id], modo: 'polar', centro: [0, 0], angulo: 45, tipoAngulo: 'entre', copias: 2 });
    expect(t.modelo.pilares.slice(1).map((p) => p.angulo)).toEqual([45, 90]);
    expect(t.modelo.pilares[2].x).toBeCloseTo(0, 9);
    expect(t.modelo.pilares[2].y).toBeCloseTo(2, 9);
  });
  it('passo polar e transformações puras', () => {
    expect(passoPolar(360, 'total', 5)).toBe(60);
    expect(passoPolar(180, 'total', 4)).toBe(45);
    expect(passoPolar(30, 'entre', 7)).toBe(30);
    const ts = transformacoesMatriz({ modo: 'linear', base: [0, 0], destino: [9, 3], referencia: 'ultimo', copias: 3 });
    expect(ts.map((t) => t.ponto([1, 1]))).toEqual([[4, 2], [7, 3], [10, 4]]);
  });
  it('recusa seleção vazia, deslocamento nulo, ângulo nulo e cópia sobre pilar existente', () => {
    const s = modelo();
    expect(falha(s, 'editar.matriz', { modo: 'linear', base: [0, 0], destino: [1, 0] })).toEqual(['SELECAO_VAZIA']);
    const p = [s.modelo.pilares[0].id];
    expect(falha(s, 'editar.matriz', { pilares: p, modo: 'linear', base: [0, 0], destino: [0, 0] })).toEqual(['DESLOCAMENTO_NULO']);
    expect(falha(s, 'editar.matriz', { pilares: p, modo: 'polar', centro: [1, 1], angulo: 0 })).toEqual(['ANGULO_NULO']);
    expect(falha(s, 'editar.matriz', { pilares: p, modo: 'linear', base: [0, 0], destino: [0.1, 0] })).toEqual(['PILAR_SOBREPOSTO']);
    expect(falha(s, 'editar.matriz', { pilares: ['x'], modo: 'linear', base: [0, 0], destino: [1, 0] })).toEqual(['ELEMENTO_INEXISTENTE']);
    expect(s.modelo.pilares.length).toBe(1);
  });
});
