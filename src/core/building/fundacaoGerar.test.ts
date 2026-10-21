// FU4 (núcleo): geração automática de fundações (tipo, posição, associadas, vigas de equilíbrio e de travamento).
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, replay, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { calcularFundacaoEdificio, cargasPorPilar } from './fundacao';
import { distanciaEntrePoligonos, planejarFundacoes } from './fundacaoGerar';
import { classificar } from './revisao';
import type { BuildingModel } from './types';

const LEITURAS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35].map((N) => ({ N, solo: 'silteArenoso' }));

/** Edifício padrão com pilares 30 × 30 nos pontos dados, terreno e uma estaca de capacidade informada. */
function obra(pontos: [number, number][], cap = 500) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('lote', { comandos: pontos.map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('sondagem.criar', { nome: 'SP-01', x: 2, y: 2, nivelAgua: 12, leituras: LEITURAS });
  ok('fundacao.terreno', { sigmaAdm: 250, estacas: [{ id: 'e_hc', tipo: 'helice', D: 40, modo: 'informada', capacidade: cap }] });
  return { s, ok, P: s.modelo.pilares };
}

/** Grade 3 × 3 de pilares a cada 4 m, com vigas e lajes (para a análise). */
function grade3() {
  const pts: [number, number][] = [];
  for (const y of [0, 4, 8]) for (const x of [0, 4, 8]) pts.push([x, y]);
  const o = obra(pts);
  const vigas: [[number, number], [number, number]][] = [];
  for (const y of [0, 4, 8]) { vigas.push([[0, y], [4, y]], [[4, y], [8, y]]); }
  for (const x of [0, 4, 8]) { vigas.push([[x, 0], [x, 4]], [[x, 4], [x, 8]]); }
  o.ok('lote', { comandos: vigas.map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } })) });
  o.ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return o;
}

const porNome = (b: BuildingModel, nome: string) => b.pilares.find((p) => p.nome === nome)!;
const elementoDe = (b: BuildingModel, pilar: string) => b.fundacao!.elementos.find((e) => e.pilares.includes(pilar))!;

describe('geração automática (FU4): posição pelos pilares em frente', () => {
  it('grade 3 × 3: 4 cantos, 4 divisas, 1 centrado; equilíbrio de cada divisa e canto até o pilar em frente do lado oposto', () => {
    const { s, ok } = obra([0, 4, 8].flatMap((y) => [0, 4, 8].map((x) => [x, y] as [number, number])));
    const r = ok('fundacao.gerar', {});
    const b = s.modelo, fe = b.fundacao!;
    expect(fe.elementos).toHaveLength(9);
    const pos = (x: number, y: number) => { const p = b.pilares.find((q) => q.x === x && q.y === y)!; return elementoDe(b, p.id); };
    for (const [x, y, lado] of [[0, 0, [-1, -1]], [8, 0, [1, -1]], [8, 8, [1, 1]], [0, 8, [-1, 1]]] as const) { expect(pos(x, y).posicao).toBe('canto'); expect(pos(x, y).lado).toEqual(lado); }
    for (const [x, y, lado] of [[4, 0, [0, -1]], [8, 4, [1, 0]], [4, 8, [0, 1]], [0, 4, [-1, 0]]] as const) { expect(pos(x, y).posicao).toBe('divisa'); expect(pos(x, y).lado).toEqual(lado); }
    expect(pos(4, 4).posicao).toBe('centrada');
    expect(fe.elementos.every((e) => e.tipo === 'sapata' && e.pilares.length === 1)).toBe(true);
    // equilíbrio: 2 por canto + 1 por divisa = 12, todas de equilíbrio e sem duplicata
    const vs = fe.vigas!;
    expect(vs).toHaveLength(12);
    expect(vs.every((v) => v.tipo === 'equilibrio')).toBe(true);
    const chave = (v: { ini: string; fim: string }) => [v.ini, v.fim].sort().join('|');
    expect(new Set(vs.map(chave)).size).toBe(12);
    // pontas são elementos (não pilares) e a divisa do meio vai até o pilar central
    const central = pos(4, 4).id, borda = pos(4, 0).id;
    expect(vs.some((v) => chave(v) === [borda, central].sort().join('|'))).toBe(true);
    // o canto (0, 0) liga aos vizinhos (4, 0) e (0, 4)
    const c0 = pos(0, 0).id;
    expect(vs.filter((v) => v.ini === c0 || v.fim === c0).map((v) => (v.ini === c0 ? v.fim : v.ini)).sort()).toEqual([pos(4, 0).id, pos(0, 4).id].sort());
    expect(r.mensagem).toMatch(/9 sapatas/);
    expect(r.mensagem).toMatch(/4 de divisa/);
    expect(r.mensagem).toMatch(/4 de canto/);
  });

  it('distância de visão D e ângulo A: pilar fora do cone não conta como em frente', () => {
    const { s } = obra([[0, 0], [5, 2]]);
    const b = s.modelo;
    // 21,8° de desvio: fora do cone de 30° (±15°); dentro de A = 60°
    const padrao = planejarFundacoes(b);
    const p0 = (pl: typeof padrao) => pl.passos.find((p) => p.nome === 'fundacao.criar' && p.params.pilar === porNome(b, 'P1').id)!.params;
    expect(p0(padrao).posicao).toBe('centrada');
    const largo = planejarFundacoes(b, { anguloVisao: 60 });
    expect(p0(largo).posicao).toBe('divisa');
    expect(p0(largo).lado).toEqual([-1, 0]);
    // desalinhamento ≥ D: com D = 1,5 m o pilar a 2 m do eixo sai da visão, mesmo com A = 60°
    expect(p0(planejarFundacoes(b, { anguloVisao: 60, distanciaVisao: 1.5 })).posicao).toBe('centrada');
    // as opções valem como padrão
    const s2 = new Sessao(b);
    expect(s2.executar('opcoes.definir', { valores: { gerarAnguloVisao: 60 } }).ok).toBe(true);
    expect(p0(planejarFundacoes(s2.modelo)).posicao).toBe('divisa');
  });

  it('limite poligonal a menos de gerarDistLimite da face faz o elemento de divisa, mesmo com pilar em frente', () => {
    const { s, ok } = obra([[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]]);
    ok('limite.criar', { pontos: [[-10, 4.4], [10, 4.4]], nome: 'Divisa N' });
    ok('fundacao.gerar', { vigasEquilibrio: false });
    const b = s.modelo;
    const [r4] = [porNome(b, 'P5')];
    const e = elementoDe(b, r4.id);
    // P5 (4; 4) tem a face +y a 0,25 m do limite: divisa em +y
    expect(e.posicao).toBe('divisa');
    expect(e.lado).toEqual([0, 1]);
    // sem o limite, P5 teria divisa em +y por não ter pilar acima: o limite só confirma; o de baixo (P2) tem P5 em frente
    expect(elementoDe(b, porNome(b, 'P2').id).lado).toEqual([0, -1]);
  });

  it('camada da máscara como divisa', () => {
    const { s, ok } = obra([[0, 0], [4, 0], [0, 4], [4, 4], [8, 0], [8, 4]]);
    ok('mascara.importar', { grupo: 'g_3', nome: 'Terreno', geo: { DIVISA: { linhas: [900, -500, 900, 900], arcos: [], textos: [] } }, escala: 0.01 });
    // divisa em x = 9 m: pilares com x = 8 têm a face +x a 0,85 m: fora da distância padrão (0,5), dentro com 1 m
    const sem = planejarFundacoes(s.modelo, { camadasDivisa: ['DIVISA'] });
    expect(sem.passos.find((p) => p.params.pilar === porNome(s.modelo, 'P5').id)!.params.lado).toEqual([1, -1]);
    const t = new Sessao(s.modelo);
    t.executar('opcoes.definir', { valores: { gerarDistLimite: 1 } });
    const p5 = planejarFundacoes(t.modelo, { camadasDivisa: ['DIVISA'] }).passos.find((p) => p.params.pilar === porNome(s.modelo, 'P5').id)!.params;
    expect(p5.lado).toEqual([1, -1]);
    // P6 (8; 4) tem pilar acima? não: canto/ divisa em +y e +x
  });
});

describe('geração automática (FU4): tipo e associação', () => {
  it('tipo automático: sapata com σadm boa, bloco com σadm baixa; tubulão só centrado', () => {
    const { s, ok } = obra([[0, 0], [4, 0], [4, 4], [0, 4]]);
    const elementos = (pl: ReturnType<typeof planejarFundacoes>) => pl.passos.filter((p) => p.nome === 'fundacao.criar');
    expect(elementos(planejarFundacoes(s.modelo)).every((p) => p.params.tipo === 'sapata')).toBe(true);
    ok('fundacao.terreno', { sigmaAdm: 100 });
    const pl = planejarFundacoes(s.modelo);
    expect(pl.passos.filter((p) => p.nome === 'fundacao.criar').every((p) => p.params.tipo === 'bloco' && (p.params.estaca as { id: string }).id === 'e_hc')).toBe(true);
    // pelo SPT (N̄/50): leituras 4..35 a 1,5 m: a média das 3 camadas abaixo da cota de assentamento
    ok('fundacao.terreno', { sigmaModo: 'sondagem' });
    // (N̄ das camadas abaixo da cota de assentamento ≈ 8 → ≈ 160 kN/m², acima do mínimo de 150)
    expect(elementos(planejarFundacoes(s.modelo)).every((p) => p.params.tipo === 'sapata')).toBe(true);
    ok('opcoes.definir', { valores: { gerarSigmaMin: 200 } });
    expect(elementos(planejarFundacoes(s.modelo)).every((p) => p.params.tipo === 'bloco')).toBe(true);
    // sem estaca cadastrada: sempre sapata
    ok('fundacao.terreno', { sigmaAdm: 100, sigmaModo: 'informada', estacas: [] });
    expect(elementos(planejarFundacoes(s.modelo)).every((p) => p.params.tipo === 'sapata')).toBe(true);
    // tubulão: centrado, com aviso nos de divisa e de canto
    const tb = planejarFundacoes(s.modelo, { tipo: 'tubulao' });
    expect(tb.passos.filter((p) => p.nome === 'fundacao.criar').every((p) => p.params.tipo === 'tubulao' && p.params.posicao === 'centrada')).toBe(true);
    expect(tb.avisos.some((a) => /tubulão só centrado/.test(a))).toBe(true);
    expect(s.executar('fundacao.gerar', { tipo: 'tubulao' }).ok).toBe(true);
    expect(s.modelo.fundacao!.elementos.every((e) => e.tipo === 'tubulao')).toBe(true);
  });

  it('pilares com bordas a menos de 1 m viram sapata associada; a 1,2 m ficam separados', () => {
    // 30 × 30: centros a 1,1 m → bordas a 0,8 m; centros a 1,5 m → 1,2 m
    const { s, ok } = obra([[0, 0], [1.1, 0], [8, 0], [9.5, 0], [4, 5]]);
    expect(distanciaEntrePoligonos([[0, 0], [1, 0], [1, 1], [0, 1]], [[1.5, 0], [2.5, 0], [2.5, 1], [1.5, 1]])).toBeCloseTo(0.5, 9);
    const r = ok('fundacao.gerar', { vigasEquilibrio: false });
    const b = s.modelo;
    const grupos = b.fundacao!.elementos.filter((e) => e.pilares.length > 1);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].pilares).toEqual([porNome(b, 'P1').id, porNome(b, 'P2').id]);
    expect(grupos[0].posicao).toBe('centrada');
    expect(b.fundacao!.elementos).toHaveLength(4);
    expect(r.mensagem).toMatch(/1 associado/);
    // distância de associação maior (3 m): os dois pares próximos
    const t = new Sessao(obra([[0, 0], [1.1, 0], [8, 0], [9.5, 0], [4, 5]]).s.modelo);
    expect(t.executar('fundacao.gerar', { vigasEquilibrio: false, distanciaAssociada: 1.5 }).ok).toBe(true);
    expect(t.modelo.fundacao!.elementos.filter((e) => e.pilares.length > 1)).toHaveLength(2);
    // associadas: false mantém tudo separado
    const u = new Sessao(obra([[0, 0], [1.1, 0]]).s.modelo);
    expect(u.executar('fundacao.gerar', { associadas: false, vigasEquilibrio: false }).ok).toBe(true);
    expect(u.modelo.fundacao!.elementos.every((e) => e.pilares.length === 1)).toBe(true);
  });

  it('bloco: grupo com um bloco vira bloco com vários pilares; sobreposição estimada pelas cargas', () => {
    const { s, ok } = obra([[0, 0], [1.6, 0]]);
    ok('fundacao.terreno', { sigmaAdm: 100 }); // → bloco
    // sem cargas: 1,3 m entre bordas, fora da distância 1 m
    expect(s.modelo.fundacao).toBeDefined();
    expect(planejarFundacoes(s.modelo, { vigasEquilibrio: false }).contagem.associadas).toBe(0);
    // com cargas altas: 6 estacas por pilar (lado estimado ≈ 2,5 m) → blocos se sobrepõem
    const ids = s.modelo.pilares.map((p) => p.id);
    const pl = planejarFundacoes(s.modelo, { vigasEquilibrio: false, cargas: ids.map((pilar) => ({ pilar, Nk: 2500 })) });
    expect(pl.contagem.associadas).toBe(1);
    const c = pl.passos.find((p) => p.nome === 'fundacao.criar')!.params;
    expect(c.tipo).toBe('bloco');
    expect(c.pilares).toEqual(ids);
    ok('fundacao.gerar', { vigasEquilibrio: false, cargas: ids.map((pilar) => ({ pilar, Nk: 2500 })) });
    const e = s.modelo.fundacao!.elementos;
    expect(e).toHaveLength(1);
    expect(e[0].tipo).toBe('bloco');
    expect(e[0].pilares).toEqual(ids);
  });
});

describe('geração automática (FU4): comando', () => {
  it('um passo só: desfaz de uma vez, replay reproduz e a segunda chamada não tem o que gerar', () => {
    const { s } = obra([[0, 0], [4, 0], [8, 0], [0, 4], [4, 4], [8, 4]]);
    const antes = s.modelo, n0 = s.log.length;
    const r = s.executar('fundacao.gerar', {});
    expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    expect(s.log.length).toBe(n0 + 1);
    const gerado = s.modelo;
    expect(gerado.fundacao!.elementos).toHaveLength(6);
    expect(gerado.fundacao!.vigas!.length).toBeGreaterThan(0);
    expect(replay(s.log)).toEqual(gerado);
    s.desfazer();
    expect(s.modelo).toEqual(antes);
    s.refazer();
    expect(s.modelo).toEqual(gerado);
    const r2 = s.executar('fundacao.gerar', {});
    expect(r2.ok).toBe(false);
    expect(r2.erros[0].codigo).toBe('NADA_A_GERAR');
    // só os pilares escolhidos; os demais ficam
    const t = new Sessao(antes);
    expect(t.executar('fundacao.gerar', { pilares: [antes.pilares[0].id], vigasEquilibrio: false }).ok).toBe(true);
    expect(t.modelo.fundacao!.elementos).toHaveLength(1);
    expect(t.executar('fundacao.gerar', { pilares: ['inexistente'] }).erros[0].codigo).toBe('PILAR_INEXISTENTE');
    // pilares que já têm elemento são preservados; os novos entram e ligam aos antigos
    expect(t.executar('fundacao.gerar', {}).ok).toBe(true);
    expect(t.modelo.fundacao!.elementos).toHaveLength(6);
    // não toca a estrutura: só revFundacao muda
    const u = new Sessao(antes), c0 = u.revCalculo, f0 = u.revFundacao;
    u.executar('fundacao.gerar', {});
    expect(u.revCalculo).toBe(c0);
    expect(u.revFundacao).toBe(f0 + 1);
  });

  it('bloco sem estaca cadastrada é recusado com a mensagem do passo', () => {
    const { s, ok } = obra([[0, 0], [4, 0]]);
    ok('fundacao.terreno', { estacas: [] });
    const r = s.executar('fundacao.gerar', { tipo: 'bloco' });
    expect(r.ok).toBe(false);
    expect(r.erros[0].mensagem).toMatch(/Passo 1/);
  });
});

describe('geração automática (FU4): resultado calculado', () => {
  it('grade 3 × 3: as divisas e os cantos ficam com viga de equilíbrio (sem FUND_EXC_SEM_VIGA) e a alavanca sai', () => {
    const { s, ok } = grade3();
    ok('fundacao.gerar', {});
    const b = s.modelo, an = analisarEdificio(b);
    const calc = calcularFundacaoEdificio(b, an);
    const codigos = calc.elementos.flatMap((r) => r.mensagens.map((m) => ({ r: r.nome, c: classificar(m).codigo })));
    expect(codigos.filter((x) => x.c === 'FUND_EXC_SEM_VIGA'), JSON.stringify(codigos)).toEqual([]);
    expect(codigos.filter((x) => x.c === 'FUND_SEM_SOLUCAO')).toEqual([]);
    const equilibrados = calc.elementos.filter((r) => r.alavanca);
    expect(equilibrados).toHaveLength(8);
    for (const r of equilibrados) expect(r.alavanca!.R).toBeGreaterThan(r.alavanca!.N);
    expect(calc.vigas).toHaveLength(12);
  });

  it('bloco de 1 estaca centrado recebe duas vigas de travamento ortogonais e some o aviso FUND_SEM_TRAVA', () => {
    const { s, ok } = grade3();
    const central = porNome(s.modelo, 'P5');
    // sapatas já lançadas nos demais pilares; só o central é gerado, como bloco
    for (const p of s.modelo.pilares) if (p.id !== central.id) ok('fundacao.criar', { pilar: p.id, tipo: 'sapata', posicao: 'centrada' });
    const an = analisarEdificio(s.modelo);
    const Nk = cargasPorPilar(s.modelo, an).get(central.id)!.Nk;
    ok('fundacao.terreno', { estacas: [{ id: 'e_hc', tipo: 'helice', D: 40, modo: 'informada', capacidade: Math.ceil(Nk * 2) }] });
    // sem cargas: não estima as estacas e avisa
    const sem = planejarFundacoes(s.modelo, { pilares: [central.id], tipo: 'bloco' });
    expect(sem.contagem.travamento).toBe(0);
    expect(sem.avisos.some((a) => /Travamento dos blocos/.test(a))).toBe(true);
    const cargas = [...cargasPorPilar(s.modelo, an)].map(([pilar, l]) => ({ pilar, Nk: l.Nk }));
    ok('fundacao.gerar', { pilares: [central.id], tipo: 'bloco', cargas });
    const b = s.modelo, el = elementoDe(b, central.id);
    expect(el.tipo).toBe('bloco');
    const vs = b.fundacao!.vigas!.filter((v) => v.ini === el.id || v.fim === el.id);
    expect(vs).toHaveLength(2);
    expect(vs.every((v) => v.tipo === 'travamento')).toBe(true);
    // direções ortogonais: um vizinho em x e outro em y
    const outro = (v: { ini: string; fim: string }) => b.pilares.find((p) => p.id === (b.fundacao!.elementos.find((e) => e.id === (v.ini === el.id ? v.fim : v.ini))?.pilares[0] ?? ''))!;
    const dirs = vs.map((v) => { const o = outro(v); return [o.x - central.x, o.y - central.y]; });
    expect(Math.abs(dirs[0][0] * dirs[1][1] - dirs[0][1] * dirs[1][0])).toBeGreaterThan(0.7 * 16);
    const calc = calcularFundacaoEdificio(b, an);
    const r = calc.elementos.find((x) => x.id === el.id)!;
    expect(r.dims.n).toBe(1);
    expect(r.mensagens.filter((m) => classificar(m).codigo === 'FUND_SEM_TRAVA')).toEqual([]);
    // sem as vigas de travamento, o cálculo avisa
    const t = new Sessao(s.modelo);
    t.executar('vigaFundacao.remover', { ids: vs.map((v) => v.id) });
    const r2 = calcularFundacaoEdificio(t.modelo, an).elementos.find((x) => x.id === el.id)!;
    expect(r2.mensagens.some((m) => classificar(m).codigo === 'FUND_SEM_TRAVA')).toBe(true);
  });

  it('bloco de 2 estacas recebe viga de travamento perpendicular à linha das estacas', () => {
    const { s, ok } = grade3();
    const central = porNome(s.modelo, 'P5');
    for (const p of s.modelo.pilares) if (p.id !== central.id) ok('fundacao.criar', { pilar: p.id, tipo: 'sapata', posicao: 'centrada' });
    const an = analisarEdificio(s.modelo);
    const Nk = cargasPorPilar(s.modelo, an).get(central.id)!.Nk;
    ok('fundacao.terreno', { estacas: [{ id: 'e_hc', tipo: 'helice', D: 40, modo: 'informada', capacidade: Math.ceil(Nk * 0.7) }] });
    const cargas = [...cargasPorPilar(s.modelo, an)].map(([pilar, l]) => ({ pilar, Nk: l.Nk }));
    ok('fundacao.gerar', { pilares: [central.id], tipo: 'bloco', cargas });
    const b = s.modelo, el = elementoDe(b, central.id);
    const vs = b.fundacao!.vigas!.filter((v) => v.ini === el.id || v.fim === el.id);
    expect(vs).toHaveLength(1);
    const calc = calcularFundacaoEdificio(b, an);
    const r = calc.elementos.find((x) => x.id === el.id)!;
    expect(r.dims.n).toBe(2);
    expect(r.mensagens.filter((m) => classificar(m).codigo === 'FUND_SEM_TRAVA'), r.mensagens.join(' | ')).toEqual([]);
  });
});
