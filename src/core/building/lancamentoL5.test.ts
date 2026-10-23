// L5: ferramentas de lançamento (geometria pura e comandos).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { areaPoligono, type P } from '../geom/faces';
import { geometriaViga } from './types';
import { verificar } from './verify';
import { analisarEdificio } from './analitico';
import { direcaoPorPontos, direcaoPorViga, pontaProlongada, retanguloNoAngulo, retanguloPorLado, verticeMaisProximo } from './lancamentoL5';
import { panosDoGrupo } from './lajes';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const sec = { b: 0.15, h: 0.4 };
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const proximo = (a: P, b: P) => dist(a, b) < 1e-5;

/** Planta 8 × 5 fechada por quatro vigas pelo eixo, com uma viga em x = 3 e lajes maciças detectadas. */
function planta(tipo?: Record<string, unknown>) {
  const s = padrao();
  ok(s, 'lote', { comandos: [
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0, 0], [8, 0]], secao: sec } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[8, 0], [8, 5]], secao: sec } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[8, 5], [0, 5]], secao: sec } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0, 5], [0, 0]], secao: sec } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[3, 0], [3, 5]], secao: sec } },
  ] });
  ok(s, 'laje.detectarPanos', { grupo: 'g_3', ...(tipo ? { tipo } : {}) });
  return s;
}

describe('L5: geometria pura', () => {
  it('retângulo por dois cantos (ângulo zero) e por um lado e um ponto oposto (qualquer ângulo)', () => {
    const r0 = retanguloPorLado([4, 3], [0, 0])!;
    expect(r0).toEqual([[0, 0], [4, 0], [4, 3], [0, 3]]);
    expect(areaPoligono(r0)).toBeCloseTo(12, 9);
    // lado a 30° de 6 m e ponto do lado oposto a 2,5 m (para qualquer lado)
    const a = (30 * Math.PI) / 180, c1: P = [1, 1], c2: P = [1 + 6 * Math.cos(a), 1 + 6 * Math.sin(a)];
    for (const lado of [1, -1]) {
      const c3: P = [1 + 3 * Math.cos(a) - lado * 2.5 * Math.sin(a), 1 + 3 * Math.sin(a) + lado * 2.5 * Math.cos(a)];
      const r = retanguloPorLado(c1, c2, c3)!;
      expect(areaPoligono(r)).toBeCloseTo(15, 4); // anti-horário
      for (let i = 0; i < 4; i++) {
        const u = [r[(i + 1) % 4][0] - r[i][0], r[(i + 1) % 4][1] - r[i][1]], v = [r[(i + 2) % 4][0] - r[(i + 1) % 4][0], r[(i + 2) % 4][1] - r[(i + 1) % 4][1]];
        expect(Math.abs(u[0] * v[0] + u[1] * v[1])).toBeLessThan(1e-4);
      }
    }
    expect(retanguloPorLado([0, 0], [0, 0.01])).toBeNull();
    expect(retanguloPorLado([0, 0], [4, 0], [2, 0])).toBeNull();
  });

  it('retângulo no ângulo dado: diagonal c1-c2 e lados rotacionados', () => {
    expect(retanguloNoAngulo([0, 0], [2, 2], 45)).toBeNull(); // diagonal alinhada com o ângulo: lado nulo
    const q = retanguloNoAngulo([0, 0], [4, 2], 30)!;
    // vértices opostos preservados: c1 e c2 estão no retângulo
    expect(areaPoligono(q)).toBeGreaterThan(0);
    const w = dist(q[0], q[1]), h = dist(q[1], q[2]);
    expect(Math.hypot(w, h)).toBeCloseTo(Math.hypot(4, 2), 4); // a diagonal do retângulo é a distância c1-c2
    expect(direcaoPorPontos(q[0], q[1])).toBeCloseTo(30, 4);
  });

  it('direção por dois pontos, por viga (paralela e perpendicular), vértice de inserção e ponta prolongada', () => {
    expect(direcaoPorPontos([0, 0], [1, 1])).toBeCloseTo(45, 9);
    expect(direcaoPorPontos([1, 1], [0, 0])).toBeCloseTo(45, 9);
    expect(direcaoPorPontos([0, 0], [-1, 0])).toBe(0);
    const pts: P[] = [[0, 0], [4, 0], [4, 3]];
    expect(direcaoPorViga(pts, 'paralela', [1, 1])).toBe(0);
    expect(direcaoPorViga(pts, 'perpendicular', [1, 1])).toBe(90);
    expect(direcaoPorViga(pts, 'paralela', [3.9, 2])).toBe(90);
    expect(direcaoPorViga(pts, 'perpendicular', [3.9, 2])).toBe(0);
    expect(verticeMaisProximo([[0, 0], [4, 0], [4, 3], [0, 3]], [3.8, 2.7])).toBe(2);
    expect(pontaProlongada([0, 0], [4, 0], 1.5)).toEqual([5.5, 0]);
    expect(pontaProlongada([0, 0], [4, 0], -1)).toEqual([3, 0]);
    expect(pontaProlongada([0, 0], [4, 0], -3.99)).toBeNull();
  });
});

describe('L5: vigas', () => {
  it('contorno retangular com ângulo zero: quatro vigas do lado de fora, face interna na linha clicada', () => {
    const s = padrao();
    const r = ok(s, 'viga.contornoRetangular', { grupo: 'g_3', c1: [0, 0], c2: [8, 5], secao: sec });
    expect(s.modelo.vigas).toHaveLength(4);
    // a linha clicada é a face interna de cada viga (o corpo fica fora) e as pontas se cruzam nos cantos
    const faces = s.modelo.vigas.map((v) => geometriaViga(v).esq);
    expect(faces[0].map((q) => q[1])).toEqual([0, 0]); expect(faces[1].map((q) => q[0])).toEqual([8, 8]);
    expect(faces[2].map((q) => q[1])).toEqual([5, 5]); expect(faces[3].map((q) => q[0])).toEqual([0, 0]);
    const eixos = s.modelo.vigas.map((v) => geometriaViga(v).eixo);
    for (let i = 0; i < 4; i++) expect(proximo(eixos[i][1] as P, eixos[(i + 1) % 4][0] as P)).toBe(true);
    // o corpo fica fora: a face direita está 15 cm para fora
    const ext = geometriaViga(s.modelo.vigas[0]).dir;
    expect(ext[0][1]).toBeCloseTo(-0.15, 9);
    expect(r.diff!.criados).toHaveLength(4);
    // um passo só no desfazer
    s.desfazer();
    expect(s.modelo.vigas).toHaveLength(0);
  });

  it('contorno retangular em qualquer ângulo (dois cantos de um lado e um ponto do oposto)', () => {
    const s = padrao();
    const a = (25 * Math.PI) / 180, c1: P = [2, 1], c2: P = [2 + 7 * Math.cos(a), 1 + 7 * Math.sin(a)], c3: P = [2 - 4 * Math.sin(a) + 3 * Math.cos(a), 1 + 4 * Math.cos(a) + 3 * Math.sin(a)];
    ok(s, 'viga.contornoRetangular', { grupo: 'g_3', c1, c2, c3, secao: sec });
    expect(s.modelo.vigas).toHaveLength(4);
    const f = s.modelo.vigas.map((v) => geometriaViga(v).eixo);
    for (let i = 0; i < 4; i++) expect(proximo(f[i][1] as P, f[(i + 1) % 4][0] as P)).toBe(true); // contorno fechado
    const ret = f.map((x) => x[0] as P);
    expect(areaPoligono(ret)).toBeCloseTo(7.15 * 4.15, 4); // eixos 7,5 cm fora da linha clicada
    expect(panosDoGrupo(s.modelo, 'g_3')).toHaveLength(1);
  });

  it('contorno retangular alinhado pela face externa dos pilares', () => {
    const s = padrao();
    for (const [x, y] of [[0, 0], [8, 0], [8, 5], [0, 5]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok(s, 'viga.contornoRetangular', { grupo: 'g_3', c1: [0, 0], c2: [8, 5], secao: sec });
    const xs = s.modelo.vigas.flatMap((v) => [...geometriaViga(v).esq, ...geometriaViga(v).dir]);
    expect(Math.min(...xs.map((q) => q[0]))).toBeCloseTo(-0.15, 6);
    expect(Math.max(...xs.map((q) => q[0]))).toBeCloseTo(8.15, 6);
    expect(Math.min(...xs.map((q) => q[1]))).toBeCloseTo(-0.15, 6);
    expect(Math.max(...xs.map((q) => q[1]))).toBeCloseTo(5.15, 6);
    // os eixos se cruzam nos cantos: o contorno fecha um pano
    expect(panosDoGrupo(s.modelo, 'g_3')).toHaveLength(1);
    const dados = s.executar('viga.contornoRetangular', { grupo: 'g_3', c1: [0, 0], c2: [0, 0.01], secao: sec });
    expect(dados.ok).toBe(false);
  });

  it('deslocamento entre a linha clicada e a de ajuste, e modo simples', () => {
    const s = padrao();
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [4, 0], [4, 3]], secao: sec, deslocamentoClique: 10 });
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 0.1], [3.9, 0.1], [3.9, 3]]);
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 5], [4, 5]], secao: sec, deslocamentoClique: -25 });
    expect(s.modelo.vigas[1].pontos).toEqual([[0, 4.75], [4, 4.75]]);
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[10, 0], [14, 0], [14, 3], [14, 6]], secao: sec, simples: true, deslocamentoClique: 5 });
    expect(s.modelo.vigas.slice(2).map((v) => v.pontos)).toEqual([[[10, 0.05], [14, 0.05]], [[13.95, 3], [13.95, 6]]]);
    expect(s.modelo.vigas.slice(2).map((v) => v.nome)).toEqual(['V3', 'V4']);
    expect(s.executar('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [1, 0], [2, 0]], secao: sec, simples: true }).erros[0].codigo).toBe('SIMPLES_PONTOS_IMPARES');
    s.desfazer();
    expect(s.modelo.vigas).toHaveLength(2);
  });

  it('prolongar por comprimento fixo (e aparar) e arrastando a extremidade', () => {
    const s = padrao();
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [4, 0]], secao: sec });
    const id = s.modelo.vigas[0].id;
    ok(s, 'viga.prolongar', { id, extremidade: 'fim', ate: { comprimento: 1.5 } });
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 0], [5.5, 0]]);
    ok(s, 'viga.prolongar', { id, extremidade: 'ini', ate: { comprimento: -0.5 } });
    expect(s.modelo.vigas[0].pontos).toEqual([[0.5, 0], [5.5, 0]]);
    ok(s, 'viga.prolongar', { id, extremidade: 'ini', ate: { comprimento: 0.5 } });
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 0], [5.5, 0]]);
    expect(s.executar('viga.prolongar', { id, extremidade: 'fim', ate: { comprimento: -6 } }).ok).toBe(false);
    ok(s, 'viga.prolongar', { id, extremidade: 'fim', ate: { ponto: [7, 2] } }); // arrastar: projeta o ponto na direção
    expect(s.modelo.vigas[0].pontos).toEqual([[0, 0], [7, 0]]);
  });
});

describe('L5: panos', () => {
  it('panos a definir: detectados em planta fechada, erro clicável e cálculo bloqueado até atribuir o tipo', () => {
    const s = planta();
    s.desfazer(); // sem lajes
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', definir: true });
    expect(s.modelo.lajes).toHaveLength(2);
    expect(s.modelo.lajes.every((l) => l.definir)).toBe(true);
    const erros = verificar(s.modelo).filter((d) => d.codigo === 'DEFINIR_PANO');
    expect(erros).toHaveLength(2);
    expect(erros.every((e) => e.severidade === 'erro' && e.elementos.length === 1 && s.modelo.lajes.some((l) => l.id === e.elementos[0]))).toBe(true);
    for (const [x, y] of [[0, 0], [8, 0], [8, 5], [0, 5]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toMatch(/^DEFINIR_PANO/);
    // atribuir o tipo a uma não basta; às duas, o bloqueio some
    ok(s, 'laje.editar', { id: s.modelo.lajes[0].id, tipo: { tipo: 'macica', h: 0.12 } });
    expect(s.modelo.lajes[0].definir).toBeUndefined();
    expect(verificar(s.modelo).filter((d) => d.codigo === 'DEFINIR_PANO')).toHaveLength(1);
    ok(s, 'laje.atribuir', { ids: [s.modelo.lajes[1].id], tipo: { tipo: 'macica', h: 0.12 } });
    expect(verificar(s.modelo).filter((d) => d.codigo === 'DEFINIR_PANO')).toEqual([]);
    expect(analisarEdificio(s.modelo).erro ?? '').not.toMatch(/DEFINIR_PANO/);
  });

  it('direção do pano por uma viga (paralela e perpendicular) e por dois pontos; ponto de inserção', () => {
    const s = planta({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 });
    const l = s.modelo.lajes[1]; // 3..8 × 0..5
    const v = s.modelo.vigas[0]; // y = 0, horizontal
    ok(s, 'laje.editar', { id: l.id, direcaoPor: { viga: v.id, relacao: 'paralela' } });
    expect(s.modelo.lajes[1].direcao).toBe(0);
    ok(s, 'laje.editar', { id: l.id, direcaoPor: { viga: v.id, relacao: 'perpendicular' } });
    expect(s.modelo.lajes[1].direcao).toBe(90);
    ok(s, 'laje.editar', { id: l.id, direcaoPor: { pontos: [[0, 0], [1, 1]] } });
    expect(s.modelo.lajes[1].direcao).toBeCloseTo(45, 9);
    expect(s.executar('laje.editar', { id: l.id, direcaoPor: {} }).ok).toBe(false);
    expect(s.executar('laje.editar', { id: l.id, direcaoPor: { pontos: [[1, 1], [1, 1]] } }).ok).toBe(false);
    // ponto de inserção: vértice mais próximo do ponto clicado
    const c = s.modelo.lajes[1].contorno as P[];
    ok(s, 'laje.editar', { id: l.id, insercaoPonto: [c[2][0] + 0.01, c[2][1]] });
    expect(s.modelo.lajes[1].insercao).toBe(2);
    ok(s, 'laje.editar', { id: l.id, insercao: 0 });
    expect(s.modelo.lajes[1].insercao).toBeUndefined();
    expect(s.executar('laje.editar', { id: l.id, insercao: 9 }).ok).toBe(false);
  });
});

describe('L5: aberturas retangulares', () => {
  it('ângulo zero com viga de borda alta: geometria, quatro vigas e sem pano novo', () => {
    const s = planta();
    const l = s.modelo.lajes[1], n0 = s.modelo.vigas.length;
    ok(s, 'laje.aberturaRetangular', { id: l.id, modo: 'zero', c2: [4, 1], c1: [5.5, 3], borda: 'alta' });
    const f = s.modelo.lajes[1].furos!;
    expect(f).toHaveLength(1);
    expect(areaPoligono(f[0] as P[])).toBeCloseTo(1.5 * 2, 9);
    expect(s.modelo.vigas.length).toBe(n0 + 4);
    expect(s.modelo.vigas.slice(n0).every((v) => v.secao.h === 0.4 && v.secao.b === 0.15 && !v.chata)).toBe(true);
    expect(s.modelo.lajes[1].furosBorda).toEqual(['alta']);
    // a região fechada pelas vigas de borda não é pano novo
    expect(verificar(s.modelo).filter((d) => d.codigo === 'PANO_SEM_LAJE')).toEqual([]);
    expect(s.executar('laje.detectarPanos', { grupo: 'g_3' }).erros[0].codigo).toBe('SEM_PANOS_NOVOS');
    expect(panosDoGrupo(s.modelo, 'g_3').length).toBeGreaterThan(2);
    s.desfazer();
    expect(s.modelo.vigas).toHaveLength(n0);
    expect(s.modelo.lajes[1].furos).toBeUndefined();
  });

  it('viga de borda chata: altura da laje; borda nenhuma: só o furo; fora da laje: erro', () => {
    const s = planta({ tipo: 'macica', h: 0.12 });
    const l = s.modelo.lajes[1], n0 = s.modelo.vigas.length;
    ok(s, 'laje.aberturaRetangular', { id: l.id, modo: 'zero', c1: [4, 1], c2: [5, 2], borda: 'chata', secaoBorda: { b: 0.12, h: 0.12 } });
    const novas = s.modelo.vigas.slice(n0);
    expect(novas).toHaveLength(4);
    expect(novas.every((v) => v.chata === true && v.secao.h === 0.12 && v.secao.b === 0.12)).toBe(true);
    ok(s, 'laje.aberturaRetangular', { id: l.id, modo: 'zero', c1: [6, 1], c2: [7, 2] });
    expect(s.modelo.vigas).toHaveLength(n0 + 4);
    expect(s.modelo.lajes[1].furos).toHaveLength(2);
    expect(s.modelo.lajes[1].furosBorda).toEqual(['chata', 'nenhuma']);
    expect(s.executar('laje.aberturaRetangular', { id: l.id, modo: 'zero', c1: [7, 4], c2: [9, 6] }).erros[0].codigo).toBe('ABERTURA_FORA');
    expect(s.executar('laje.aberturaRetangular', { id: l.id, modo: 'zero', c1: [4.5, 1.5], c2: [5.5, 2.5] }).erros[0].codigo).toBe('ABERTURA_FORA'); // sobre outra abertura
  });

  it('modos paralela a uma viga, nas nervuras e qualquer ângulo', () => {
    const s = planta({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 });
    const l = s.modelo.lajes[1];
    // viga inclinada de referência (fora da laje não importa: só dá o ângulo)
    ok(s, 'viga.tracar', { grupo: 'g_3', pontos: [[4, 4.5], [7, 4.5 + 3 * Math.tan((20 * Math.PI) / 180)]], secao: sec });
    // a viga inclinada mexe nos panos; usa uma laje independente fora do edifício
    const sl = padrao();
    ok(sl, 'laje.criar', { grupo: 'g_3', contorno: [[20, 0], [30, 0], [30, 10], [20, 10]], tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 }, direcao: 30 });
    ok(sl, 'viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [5, 5 * Math.tan((20 * Math.PI) / 180)]], secao: sec });
    const lj = sl.modelo.lajes[0], vref = sl.modelo.vigas[0];
    ok(sl, 'laje.aberturaRetangular', { id: lj.id, modo: 'viga', viga: vref.id, c1: [22, 2], c2: [26, 5] });
    const fv = sl.modelo.lajes[0].furos![0] as P[];
    expect(direcaoPorPontos(fv[0], fv[1])).toBeCloseTo(20, 4);
    expect(dist(fv[0], fv[2])).toBeCloseTo(dist([22, 2], [26, 5]), 4);
    ok(sl, 'laje.aberturaRetangular', { id: lj.id, modo: 'nervuras', c1: [22, 6], c2: [26, 9] });
    const fn = sl.modelo.lajes[0].furos![1] as P[];
    expect(direcaoPorPontos(fn[0], fn[1])).toBeCloseTo(30, 4);
    ok(sl, 'laje.aberturaRetangular', { id: lj.id, modo: 'qualquer', c1: [27, 1], c2: [29, 2], c3: [28.5, 4] });
    const fq = sl.modelo.lajes[0].furos![2] as P[];
    expect(Math.abs(areaPoligono(fq))).toBeGreaterThan(2);
    expect(sl.executar('laje.aberturaRetangular', { id: lj.id, modo: 'qualquer', c1: [27, 1], c2: [29, 2] }).ok).toBe(false);
    expect(sl.executar('laje.aberturaRetangular', { id: lj.id, modo: 'viga', c1: [27, 1], c2: [29, 2] }).ok).toBe(false);
    expect(l.id).toBeTruthy();
    // pano vazio (maciço/a definir): nervuras = paralela aos eixos gerais
    const sm = padrao();
    ok(sm, 'laje.criar', { grupo: 'g_3', contorno: [[0, 0], [10, 0], [10, 10], [0, 10]], definir: true });
    ok(sm, 'laje.aberturaRetangular', { id: sm.modelo.lajes[0].id, modo: 'nervuras', c1: [2, 2], c2: [5, 4] });
    expect(areaPoligono(sm.modelo.lajes[0].furos![0] as P[])).toBeCloseTo(6, 9);
    expect((sm.modelo.lajes[0].furos![0] as P[])[1]).toEqual([5, 2]);
  });
});

describe('L5: cargas', () => {
  it('carga de superfície numa laje inteira, também copiando de uma carga existente', () => {
    const s = planta();
    const l = s.modelo.lajes[0];
    ok(s, 'carga.areaNaLaje', { laje: l.id, valor: 2, caso: 'Q' });
    const c = s.modelo.cargas.at(-1)!;
    expect(c).toMatchObject({ grupo: 'g_3', caso: 'Q', tipo: 'area', valor: 2 });
    expect(areaPoligono(c.pontos)).toBeCloseTo(areaPoligono(l.contorno as P[]), 9);
    ok(s, 'carga.areaNaLaje', { laje: s.modelo.lajes[1].id, copiarDe: c.id });
    expect(s.modelo.cargas.at(-1)).toMatchObject({ caso: 'Q', valor: 2, tipo: 'area' });
    expect(areaPoligono(s.modelo.cargas.at(-1)!.pontos)).toBeCloseTo(areaPoligono(s.modelo.lajes[1].contorno as P[]), 9);
    ok(s, 'carga.areaNaLaje', { laje: l.id, copiarDe: c.id, valor: 5, caso: 'G' });
    expect(s.modelo.cargas.at(-1)).toMatchObject({ caso: 'G', valor: 5 });
    expect(s.executar('carga.areaNaLaje', { laje: l.id }).ok).toBe(false);
    expect(s.executar('carga.areaNaLaje', { laje: l.id, valor: 1, caso: 'XX' }).ok).toBe(false);
  });

  it('cargas lineares ao longo do eixo das vigas: uma a uma e por janela de captura', () => {
    const s = planta();
    const v = s.modelo.vigas[0];
    ok(s, 'carga.aoLongoDaViga', { vigas: [v.id], valor: 6.5, caso: 'G' });
    expect(s.modelo.cargas.at(-1)).toMatchObject({ tipo: 'linha', valor: 6.5, caso: 'G', pontos: [[0, 0], [8, 0]] });
    const n0 = s.modelo.cargas.length;
    const r = ok(s, 'carga.aoLongoDaViga', { grupo: 'g_3', janela: [[-1, -1], [9, 0.5]], valor: 3, caso: 'G' });
    expect(s.modelo.cargas.length).toBe(n0 + 1); // só a viga y = 0 está inteira na janela
    expect(r.diff!.criados).toHaveLength(1);
    const r2 = ok(s, 'carga.aoLongoDaViga', { grupo: 'g_3', janela: [[-1, -1], [9, 6]], valor: 1, caso: 'Q' });
    expect(r2.diff!.criados).toHaveLength(5);
    s.desfazer();
    expect(s.modelo.cargas.length).toBe(n0 + 1);
    expect(s.executar('carga.aoLongoDaViga', { grupo: 'g_3', janela: [[50, 50], [60, 60]], valor: 1 }).erros[0].codigo).toBe('SEM_VIGAS');
    expect(s.executar('carga.aoLongoDaViga', { valor: 1 }).ok).toBe(false);
  });
});
