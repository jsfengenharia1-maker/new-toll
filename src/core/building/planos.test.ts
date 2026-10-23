// Frente E3f: planos inclinados, rampas e desníveis. Geometria dos planos, coerência viga-pano, armadura dobrada, croqui,
// comandos, e o modelo de cálculo 3D dos panos e vigas inclinados (modelo integrado) contra a solução analítica do pórtico
// de duas águas (método das forças) e contra o modelo integrado sem condensação.
import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { coeficientesPlano, croquiPavimento, dobraDaBarra, faceSuperiorDaViga, inclinacaoDoPlano, inclinacaoPercentual, marcaDeDobra, planosNoMemorial, pontosDeControle, secaoNoPlano, setaDeclividade, textoInclinacao, vigasIncoerentes, zPlano, capturaPlano, diagnosticosPlanos, cotaDaLaje, esforcosDosPlanos } from './planos';
import { verificar } from './verify';
import type { BuildingModel, DefinicaoPlano } from './types';
import { resolver3 } from '../fe3d';
import ref from '../../../validation/opensees/inclinada.json';

const ok = (s: Sessao, nome: string, p: Record<string, unknown>) => { const r = s.executar(nome, p); if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };

describe('planos: definição e cota', () => {
  it('plano por três pontos reproduz o desnível dos vértices', () => {
    const def: DefinicaoPlano = { tipo: 'tresPontos', pontos: [[0, 0, 0.2], [5, 0, 1.2], [0, 4, -0.6]] };
    const c = coeficientesPlano(def)!;
    for (const q of def.pontos) expect(zPlano(c, [q[0], q[1]])).toBeCloseTo(q[2], 12);
    expect(c.a).toBeCloseTo(0.2, 12); expect(c.b).toBeCloseTo(-0.2, 12);
    expect(coeficientesPlano({ tipo: 'tresPontos', pontos: [[0, 0, 0], [1, 1, 1], [2, 2, 5]] })).toBeNull();
  });
  it('reta horizontal + inclinação e máxima declividade dão o mesmo plano', () => {
    // reta horizontal de (0,0) a (0,4) na cota 0,5, subindo para a esquerda (−x) a 30 %; o mesmo pela máxima declividade de (0,0) a (−1,0)
    const r = coeficientesPlano({ tipo: 'retaHorizontal', pontos: [[0, 0], [0, 4]], desnivel: 0.5, inclinacao: 30 })!;
    const m = coeficientesPlano({ tipo: 'maximaDeclividade', pontos: [[0, 0], [-1, 0]], desnivel: 0.5, inclinacao: 30 })!;
    for (const k of ['a', 'b', 'c'] as const) expect(r[k]).toBeCloseTo(m[k], 12);
    expect(zPlano(r, [-2, 7])).toBeCloseTo(0.5 + 0.6, 12);
    expect(zPlano(r, [0, 9])).toBeCloseTo(0.5, 12);
    const i = inclinacaoDoPlano(r);
    expect(i.percentual).toBeCloseTo(30, 10);
    expect(i.graus).toBeCloseTo(16.69924423, 6);
    expect(i.descendente![0]).toBeCloseTo(1, 12); // desce para +x
    expect(inclinacaoPercentual(45, 'graus')).toBeCloseTo(100, 4);
    expect(pontosDeControle({ id: 'p', nome: 'P', grupo: 'g', def: { tipo: 'maximaDeclividade', pontos: [[0, 0], [2, 0]], desnivel: 1, inclinacao: -50 } }).map((x) => x.z)).toEqual([1, 0]);
  });
});

/** Pórtico de duas águas: pilares em x = 0 e x = L (y = 0), altura h, e dois caibros (vigas) até a cumeeira em x = L/2, a f acima. */
function duasAguas(L = 8, h = 3, f = 1.5) {
  const s = new Sessao();
  ok(s, 'obra.definir', { nome: 'Duas águas' });
  ok(s, 'pavimento.criar', { nome: 'Cobertura', cota: h, uso: 'comum' });
  for (const x of [0, L]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.2 } });
  const g = s.modelo.pavimentos[0].grupo, a = L / 2, inc = (f / a) * 100;
  ok(s, 'viga.tracar', { grupo: g, pontos: [[0, 0], [a, 0]], secao: { b: 0.2, h: 0.6 } });
  ok(s, 'viga.tracar', { grupo: g, pontos: [[a, 0], [L, 0]], secao: { b: 0.2, h: 0.6 } });
  ok(s, 'plano.criar', { grupo: g, nome: 'Água 1', tipo: 'maximaDeclividade', pontos: [[0, 0], [a, 0]], desnivel: 0, inclinacao: inc });
  ok(s, 'plano.criar', { grupo: g, nome: 'Água 2', tipo: 'maximaDeclividade', pontos: [[L, 0], [a, 0]], desnivel: 0, inclinacao: inc });
  const [v1, v2] = s.modelo.vigas, [p1, p2] = s.modelo.planos!;
  ok(s, 'plano.atribuir', { plano: p1.id, vigas: [v1.id] });
  ok(s, 'plano.atribuir', { plano: p2.id, vigas: [v2.id] });
  const b: BuildingModel = { ...s.modelo, obra: { ...s.modelo.obra, profundidadeFundacao: h }, pilares: s.modelo.pilares.map((p) => ({ ...p, vinculoBase: { tipo: 'molas' as const, kry: 0 } })) };
  return { s, b, L, h, f, a };
}

/** Empuxo do pórtico de duas águas com apoios articulados (método das forças, flexão e normal; carga w por m de projeção). */
function empuxoAnalitico(L: number, h: number, f: number, w: number, EIc: number, EIr: number, EAr: number) {
  const a = L / 2, s = Math.hypot(a, f), cos = a / s, sin = f / s, VA = (w * L) / 2, n = 4000;
  let d11 = 0, d10 = 0;
  // pilares: M1 = −y, M0 = 0
  d11 += 2 * (h ** 3 / 3) / EIc;
  // caibros (simetria: o dobro do esquerdo), abscissa x em planta
  for (let k = 0; k < n; k++) {
    const x = ((k + 0.5) * a) / n, ds = (a / n) / cos, y = h + (f * x) / a;
    const M1 = -y, M0 = VA * x - (w * x * x) / 2, N1 = -cos, N0 = -(VA - w * x) * sin;
    d11 += 2 * ((M1 * M1) / EIr + (N1 * N1) / EAr) * ds;
    d10 += 2 * ((M0 * M1) / EIr + (N0 * N1) / EAr) * ds;
  }
  return -d10 / d11;
}

describe('pórtico de duas águas (vigas em planos inclinados) contra o método das forças', () => {
  it('empuxo horizontal e reações verticais com apoios articulados', () => {
    const { b, L, h, f, a } = duasAguas();
    const an = analisarEdificio(b, { engasteTopoUltimo: 1 });
    expect(an.erro).toBeUndefined();
    expect(an.planos?.[0].barras.length).toBeGreaterThan(0);
    const pm = an.portico.modelo, tags = an.portico.barras;
    const caibro = pm.barras[tags.findIndex((t) => t.tipo === 'viga')], pilar = pm.barras[tags.findIndex((t) => t.tipo === 'pilar')];
    // nó da cumeeira fora do diafragma, na cota h + f
    expect(pm.nos.some((p) => Math.abs(p[0] - a) < 1e-9 && Math.abs(p[2] - (h + f)) < 1e-9)).toBe(true);
    const w = 25 * 0.2 * 0.6 * Math.hypot(a, f) / a; // peso por m de projeção
    const H = empuxoAnalitico(L, h, f, w, pilar.E * pilar.Iy, caibro.E * caibro.Iz, caibro.E * caibro.A);
    const ig = an.casos.indexOf('G');
    const reac = an.fundacao.filter((r) => r.caso === 'G');
    expect(reac).toHaveLength(2);
    const [rA, rB] = [...reac].sort((x, y) => (b.pilares.find((p) => p.id === x.pilar)!.x - b.pilares.find((p) => p.id === y.pilar)!.x));
    expect(H).toBeGreaterThan(0);
    expect(rA.Vx).toBeCloseTo(H, 4);
    expect(rB.Vx).toBeCloseTo(-H, 4);
    // verticais: metade do peso dos caibros mais o pilar
    const pesoPilar = 25 * 0.04 * h;
    expect(rA.N).toBeCloseTo(w * a + pesoPilar, 6);
    expect(an.portico.res!.desloc[ig].length).toBeGreaterThan(0);
    // memorial: empuxo no topo do pilar (= −H, a reação da base equilibra) e caibros comprimidos (N ≈ −H·cos θ − V·sen θ no beiral)
    const ef = esforcosDosPlanos(an);
    const emp = ef.empuxos.find((x) => x.caso === 'G' && x.pilar === rA.pilar)!;
    expect(emp.Hx).toBeCloseTo(-H, 4);
    const nc = ef.normais.find((x) => x.caso === 'G' && x.tipo === 'viga')!;
    const s0 = Math.hypot(a, f), Nbeiral = -(H * a + w * a * f) / s0;
    expect(nc.Nmin).toBeCloseTo(Nbeiral, 2);
  });

  it('planoDiafragma = 1 prende as pontas no plano; 0 deixa abrir', () => {
    const { b, L, h } = duasAguas();
    const desl = (pd: number) => {
      const an = analisarEdificio(b, { engasteTopoUltimo: 1, planoDiafragma: pd });
      expect(an.erro).toBeUndefined();
      const pm = an.portico.modelo, ig = an.casos.indexOf('G');
      const topo = (x: number) => pm.nos.findIndex((p) => Math.abs(p[0] - x) < 1e-9 && Math.abs(p[1]) < 1e-9 && Math.abs(p[2] - h) < 1e-9);
      return an.portico.res!.desloc[ig][topo(L) * 6] - an.portico.res!.desloc[ig][topo(0) * 6];
    };
    expect(desl(0)).toBeGreaterThan(1e-5);
    expect(Math.abs(desl(1))).toBeLessThan(1e-12);
  });

  it('modelo separado: aviso e pano na projeção', () => {
    const { b } = duasAguas();
    const an = analisarEdificio(b, { modeloGlobal: 0 });
    expect(an.planos).toBeUndefined();
    expect(an.avisos.some((x) => x.startsWith('Plano: no modelo separado'))).toBe(false); // só vigas: o aviso é dos panos
  });
});

describe('rampa de garagem em grupo intermediário', () => {
  it('rampa de 0,5 m a 2,5 m entre o subsolo e o térreo: pilares próprios, equilíbrio e pano fora do diafragma', () => {
    const s = new Sessao();
    ok(s, 'obra.definir', { nome: 'Rampa' });
    ok(s, 'pavimento.criar', { nome: 'Subsolo', cota: 0, uso: 'comum' });
    ok(s, 'pavimento.criar', { nome: 'Rampa', cota: 1.5, uso: 'comum' });
    ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 3, uso: 'comum' });
    const rampa = s.modelo.pavimentos[1];
    for (const [x, y] of [[0, 0], [3, 0], [0, 6], [3, 6]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 }, morre: rampa.id });
    const g = rampa.grupo, sec = { b: 0.15, h: 0.4 };
    for (const pts of [[[0, 0], [3, 0]], [[0, 6], [3, 6]], [[0, 0], [0, 6]], [[3, 0], [3, 6]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: sec });
    ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [3, 0], [3, 6], [0, 6]], tipo: { tipo: 'macica', h: 0.15 } });
    ok(s, 'plano.criar', { grupo: g, nome: 'Rampa', tipo: 'maximaDeclividade', pontos: [[0, 0], [0, 6]], desnivel: -1, inclinacao: 100 / 3 });
    const pl = s.modelo.planos![0];
    ok(s, 'plano.atribuir', { plano: pl.id, lajes: [s.modelo.lajes[0].id] });
    ok(s, 'plano.corrigirVigas', { vigas: [...new Set(vigasIncoerentes(s.modelo).map((x) => x.viga))] });
    expect(verificar(s.modelo).filter((d) => d.codigo.startsWith('PLANO'))).toEqual([]);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const soma = an.fundacao.filter((r) => r.caso === 'G').reduce((t, r) => t + r.N, 0);
    expect(soma).toBeCloseTo(an.totais.G, 6);
    // topos dos pilares no plano: 0,5 m (y = 0) e 2,5 m (y = 6)
    const zs = an.portico.modelo.nos.filter((n) => [0, 3].includes(n[0]) && [0, 6].includes(n[1]) && n[2] > 0.1).map((n) => +n[2].toFixed(6));
    expect(new Set(zs)).toEqual(new Set([0.5, 2.5]));
    // o peso próprio entra por área inclinada: 25·0,15·(1/cos α) por m² de projeção
    const k = Math.hypot(1, 1 / 3);
    expect(an.cargasPavimento[rampa.id].G).toBeGreaterThan(25 * 0.15 * k * 18);
  });
});

/** Telhado de duas águas com lajes: 4 pilares, vigas de beiral horizontais, caibros e cumeeira inclinados, dois panos. */
function telhado(planoDiafragma = 0) {
  const s = new Sessao();
  ok(s, 'obra.definir', { nome: 'Telhado' });
  ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
  ok(s, 'pavimento.criar', { nome: 'Cobertura', cota: 3, uso: 'comum' });
  const g = s.modelo.pavimentos[1].grupo;
  for (const [x, y] of [[0, 0], [6, 0], [0, 5], [6, 5], [3, 0], [3, 5]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } });
  const sec = { b: 0.15, h: 0.4 };
  for (const pts of [[[0, 0], [0, 5]], [[6, 0], [6, 5]], [[0, 0], [3, 0]], [[3, 0], [6, 0]], [[0, 5], [3, 5]], [[3, 5], [6, 5]], [[3, 0], [3, 5]]]) ok(s, 'viga.tracar', { grupo: g, pontos: pts, secao: sec });
  ok(s, 'laje.criar', { grupo: g, contorno: [[0, 0], [3, 0], [3, 5], [0, 5]], tipo: { tipo: 'macica', h: 0.1 } });
  ok(s, 'laje.criar', { grupo: g, contorno: [[3, 0], [6, 0], [6, 5], [3, 5]], tipo: { tipo: 'macica', h: 0.1 } });
  ok(s, 'plano.criar', { grupo: g, nome: 'Água 1', tipo: 'retaHorizontal', pontos: [[0, 5], [0, 0]], desnivel: 0, inclinacao: 40 });
  ok(s, 'plano.criar', { grupo: g, nome: 'Água 2', tipo: 'retaHorizontal', pontos: [[6, 0], [6, 5]], desnivel: 0, inclinacao: 40 });
  const [pl1, pl2] = s.modelo.planos!, [l1, l2] = s.modelo.lajes;
  ok(s, 'plano.atribuir', { plano: pl1.id, lajes: [l1.id] });
  ok(s, 'plano.atribuir', { plano: pl2.id, lajes: [l2.id] });
  return { s, g, pl1, pl2, l1, l2, opcoes: { planoDiafragma } };
}

describe('telhado de duas águas com lajes inclinadas', () => {
  it('vigas incoerentes detectadas e corrigidas por clique', () => {
    const { s } = telhado();
    const inc = vigasIncoerentes(s.modelo);
    // caibros (bordas x = const... não: os caibros são as vigas de y = 0 e y = 5) e a cumeeira x = 3 ficam incoerentes; beirais x = 0 e 6 não
    const nomes = new Set(inc.map((x) => s.modelo.vigas.find((v) => v.id === x.viga)!.pontos.map((p) => p.join(',')).join(' ')));
    expect(nomes.has('0,0 0,5')).toBe(false);
    expect(nomes.has('3,0 3,5')).toBe(true);
    expect(verificar(s.modelo).some((d) => d.codigo === 'PLANO_VIGA')).toBe(true);
    const ids = [...new Set(inc.map((x) => x.viga))];
    ok(s, 'plano.corrigirVigas', { vigas: ids });
    expect(vigasIncoerentes(s.modelo)).toEqual([]);
    expect(verificar(s.modelo).some((d) => d.codigo === 'PLANO_VIGA')).toBe(false);
    // cumeeira: dois planos diferentes, não gira e ganha altura (meia largura × 40 %)
    const cum = s.modelo.vigas.find((v) => v.pontos[0][0] === 3 && v.pontos[1][0] === 3)!;
    const sec = secaoNoPlano(s.modelo, cum)!;
    expect(sec.gira).toBe(false);
    expect(sec.alturaExtra).toBeCloseTo(0.075 * 0.4, 9);
    // beiral: um pano, gira com a inclinação transversal (40 %)
    const beiral = s.modelo.vigas.find((v) => v.pontos[0][0] === 0 && v.pontos[1][0] === 0)!;
    const sb = secaoNoPlano(s.modelo, beiral)!;
    expect(sb.gira).toBe(true);
    expect(Math.abs(sb.angulo)).toBeCloseTo(21.80140949, 6);
    expect(faceSuperiorDaViga(s.modelo, cum).linhas[0][0][0]).toBeCloseTo(3 - 0.075, 12);
  });

  it('equilíbrio vertical: peso por área inclinada e variável na projeção; empuxo simétrico', () => {
    const { s, l1 } = telhado();
    ok(s, 'plano.corrigirVigas', { vigas: [...new Set(vigasIncoerentes(s.modelo).map((x) => x.viga))] });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const k = Math.hypot(1, 0.4);
    const ig = an.casos.indexOf('G'), iq = an.casos.indexOf(an.casos.find((c) => c.startsWith('Q'))!);
    // reações verticais = cargas (G: pórtico inteiro; o total da análise inclui o peso por área inclinada)
    const soma = (c: string) => an.fundacao.filter((r) => r.caso === c).reduce((t, r) => t + r.N, 0);
    expect(soma('G')).toBeCloseTo(an.totais.G, 6);
    const grupo = s.modelo.grupos.find((x) => x.id === l1.grupo)!;
    expect(soma(an.casos[iq])).toBeCloseTo(grupo.q * 30, 6); // variável na projeção: q × 6 × 5
    // a parcela da laje no G é 25·h·k + gRev·k por m² de projeção
    const pesoLajes = (25 * 0.1 + grupo.gRev) * k * 30;
    expect(an.totais.G).toBeGreaterThan(pesoLajes);
    // empuxo: horizontais da base simétricas (soma nula) e diferentes de zero nos pilares de beiral
    const hx = an.fundacao.filter((r) => r.caso === 'G').map((r) => ({ x: s.modelo.pilares.find((p) => p.id === r.pilar)!.x, Vx: r.Vx }));
    expect(hx.reduce((t, r) => t + r.Vx, 0)).toBeCloseTo(0, 6);
    const esq = hx.filter((r) => r.x === 0).reduce((t, r) => t + r.Vx, 0), dir = hx.filter((r) => r.x === 6).reduce((t, r) => t + r.Vx, 0);
    expect(esq).toBeCloseTo(-dir, 6);
    expect(Math.abs(esq)).toBeGreaterThan(0.1);
    // esforços normais nas barras de laje (pórtico) e resultados devolvidos à grelha
    expect(an.portico.barras.some((t) => t.tipo === 'laje')).toBe(true);
    const g = an.grelhas.find((x) => x.res && x.barras.some((t) => t.ref === l1.id))!;
    const bi = g.barras.findIndex((t) => t.ref === l1.id && t.dir !== undefined);
    expect(Math.abs(g.res!.esforcos[ig][bi][5]) + Math.abs(g.res!.esforcos[ig][bi][11])).toBeGreaterThan(0);
  });

  it('modelo integrado condensado = modelo sem condensação (com as junções e as barras 3D)', () => {
    const { s } = telhado();
    // cumeeira e caibros incoerentes ficam horizontais: as lajes inclinadas encontram vigas na grelha (junções)
    const an = analisarEdificio(s.modelo, {}, { cheio: true });
    expect(an.erro).toBeUndefined();
    const ch = an.cheio!;
    const r = resolver3(ch.modelo, ch.casos);
    expect(r.erro).toBeUndefined();
    const ig = an.casos.indexOf('G');
    const reacoesBase = (desl: Float64Array) => s.modelo.pilares.map((p) => { const k = an.portico.modelo.nos.findIndex((n) => Math.abs(n[0] - p.x) < 1e-9 && Math.abs(n[1] - p.y) < 1e-9 && Math.abs(n[2] - 3) < 1e-9); return desl[k * 6 + 2]; });
    const a = reacoesBase(an.portico.res!.desloc[ig]), c = reacoesBase(r.desloc[ig]);
    a.forEach((v, i) => expect(v).toBeCloseTo(c[i], 10));
  });

  it('dobra da armadura na cumeeira: comprimentos verdadeiros de cada lado e marca da dobra', () => {
    const { s, g } = telhado();
    const d = dobraDaBarra(s.modelo, g, [2, 2.5], [4, 2.5]);
    expect(d.trechos).toHaveLength(2);
    expect(d.trechos[0].comprimento).toBeCloseTo(Math.hypot(1, 0.4), 12);
    expect(d.trechos[1].comprimento).toBeCloseTo(Math.hypot(1, 0.4), 12);
    expect(d.dobras).toHaveLength(1);
    expect(d.dobras[0].ponto[0]).toBeCloseTo(3, 12);
    expect(d.dobras[0].angulo).toBeCloseTo(2 * 21.80140949, 6);
    expect(d.total).toBeCloseTo(2 * Math.hypot(1, 0.4), 12);
    const m = marcaDeDobra(d.dobras[0].ponto, [1, 0], 0.1);
    expect(m[0]).toEqual([3, 2.45]);
  });

  it('seta, texto de inclinação, croqui, captura e memorial', () => {
    const { s, g } = telhado(), l1 = s.modelo.lajes[0];
    const seta = setaDeclividade(s.modelo, l1)!;
    expect(seta.direcao[0]).toBeCloseTo(-1, 12); // água 1 desce para o beiral x = 0
    expect(textoInclinacao(s.modelo, l1)).toBe('+0,60 i = 40,0 %');
    expect(cotaDaLaje(s.modelo, l1)([3, 1])).toBeCloseTo(1.2, 12);
    const cq = croquiPavimento(s.modelo, g, 60)!;
    expect(cq.largura).toBeCloseTo(60, 9);
    expect(cq.altura).toBeCloseTo(50, 9);
    expect(cq.setas).toHaveLength(2);
    expect(cq.pilares).toHaveLength(6);
    expect(capturaPlano(s.modelo, g, [0.07, 2])).toMatchObject({ tipo: 'face' });
    expect(capturaPlano(s.modelo, g, [0.01, 2])).toMatchObject({ tipo: 'eixo' });
    const mem = planosNoMemorial(s.modelo);
    expect(mem.map((x) => x.lajes)).toEqual([[l1.nome], [s.modelo.lajes[1].nome]]);
    expect(mem[0].percentual).toBeCloseTo(40, 10);
  });

  it('nervuras oblíquas à declividade, apoio em muro e desnível entre panos geram avisos', () => {
    const { s, l1, l2, pl1 } = telhado();
    ok(s, 'laje.atribuir', { ids: [l1.id], tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
    ok(s, 'laje.editar', { id: l1.id, direcao: 30 });
    expect(diagnosticosPlanos(s.modelo).some((d) => d.codigo === 'PLANO_NERVURAS')).toBe(true);
    ok(s, 'laje.editar', { id: l1.id, direcao: 0 });
    expect(diagnosticosPlanos(s.modelo).some((d) => d.codigo === 'PLANO_NERVURAS')).toBe(false);
    // desnível: a água 2 desce 20 cm (vigas comuns aos dois panos ficam com desnível)
    ok(s, 'plano.editar', { id: s.modelo.planos![1].id, desnivel: -0.2 });
    expect(diagnosticosPlanos(s.modelo).some((d) => d.codigo === 'DESNIVEL_VIGA' && d.elementos.includes(l2.id))).toBe(true);
    expect(pl1.id).toBeTruthy();
  });
});

describe('comandos dos planos', () => {
  it('criar, editar, atribuir, remover e pano a definir', () => {
    const { s, l1, pl1 } = telhado();
    ok(s, 'plano.editar', { id: pl1.id, inclinacao: 45, unidade: 'graus', nome: 'Norte' });
    const p = s.modelo.planos![0];
    expect(p.nome).toBe('Norte');
    expect(inclinacaoDoPlano(coeficientesPlano(p.def)!).percentual).toBeCloseTo(100, 4);
    expect(s.executar('plano.criar', { grupo: l1.grupo, tipo: 'tresPontos', pontos: [[0, 0, 0], [1, 1, 0], [2, 2, 0]] }).ok).toBe(false);
    ok(s, 'laje.aDefinir', { ids: [l1.id], espessura: 0.12, plano: pl1.id });
    const l = s.modelo.lajes.find((x) => x.id === l1.id)!;
    expect(l.definir).toBe(true); expect(l.espessuraDefinir).toBe(0.12); expect(l.plano).toBe(pl1.id);
    expect(analisarEdificio(s.modelo).erro).toMatch(/^DEFINIR_PANO/);
    ok(s, 'plano.remover', { ids: [pl1.id] });
    expect(s.modelo.lajes.find((x) => x.id === l1.id)!.plano).toBeUndefined();
    ok(s, 'plano.atribuir', { lajes: [s.modelo.lajes[1].id] });
    expect(s.modelo.lajes[1].plano).toBeUndefined();
  });
});

describe('validação externa: OpenSees (validation/opensees/inclinada.py)', () => {
  it('telhado com panos inclinados: deslocamentos do modelo cheio iguais aos do OpenSees (erro relativo < 1e-8)', async () => {
    const { s } = telhado();
    ok(s, 'plano.corrigirVigas', { vigas: [...new Set(vigasIncoerentes(s.modelo).map((x) => x.viga))] });
    const an = analisarEdificio(s.modelo, { engasteTopoUltimo: 1 }, { cheio: true });
    const ch = an.cheio!;
    const PROC = 'node:process', FS = 'node:fs';
    const env = ((await import(/* @vite-ignore */ PROC)) as { env: Record<string, string | undefined> }).env;
    if (env.GERAR_OPENSEES) {
      const fs = (await import(/* @vite-ignore */ FS)) as { writeFileSync: (p: string, d: string) => void };
      const m = ch.modelo, c = ch.casos[0];
      fs.writeFileSync('validation/opensees/inclinada.modelo.json', JSON.stringify({
        nos: m.nos, apoios: [...m.apoios], escravos: m.escravos,
        barras: m.barras.map((b) => ({ i: b.i, j: b.j, E: b.E, G: b.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, Ay: b.Ay ?? null, ref: b.ref ?? null, offI: b.offI ?? null, offJ: b.offJ ?? null, eng: !!(b.engI?.length || b.engJ?.length || b.libI?.length || b.libJ?.length) })),
        nodais: c.nodais, distribuidas: c.distribuidas,
      }));
    }
    expect(ch.modelo.barras.every((b) => !b.engI?.length && !b.engJ?.length && !b.libI?.length && !b.libJ?.length)).toBe(true);
    expect(an.portico.barras.some((t) => t.tipo === 'laje')).toBe(true);
    const r = resolver3(ch.modelo, [ch.casos[0]]);
    const u = r.desloc[0], R = ref as { nos: number; desloc: number[][] };
    expect(R.nos).toBe(ch.modelo.nos.length);
    let e = 0, mx = 0;
    R.desloc.forEach((d, n) => { for (let k = 0; k < 6; k++) { e = Math.max(e, Math.abs(u[n * 6 + k] - d[k])); mx = Math.max(mx, Math.abs(d[k])); } });
    expect(e / mx).toBeLessThan(1e-8);
  }, 120000);
});
