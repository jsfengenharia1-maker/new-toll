import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { calcularCorridas, contornoCorrida, resumoCorrida } from './sapataCorrida';
import { dimensionarEdificio } from './dimensionamento';
import { concretoDe } from './materiais';
import { pilaresNaBase } from './baseElastica';
import { revisarEdificio } from './revisao';
import { edificioVazio } from './types';
import { filtrarDim } from '../../cli/mcp';
import { dimensionar } from '../../cli/run';
import { montarPranchasFundacao, quantitativosFundacao } from '../sheets/fundacao';
import { escreverDxf } from '../sheets/dxf';
import { escreverPdf } from '../sheets/pdf';
import { montarConjunto } from '../sheets/conjunto';

function sessao() {
  const s = new Sessao(edificioVazio());
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
  return { s, ok };
}

describe('sapata corrida sob parede (FU7a): dimensionamento rígido por metro', () => {
  it('carga linear G = 250 + Q = 100 kN/m, σadm 200 kN/m²: B, h, CEB-70 e armadura conferidos à mão', () => {
    const { s, ok } = sessao();
    ok('fundacao.terreno', { sigmaAdm: 200 });
    ok('corrida.criar', { pontos: [[0, 0], [10, 0]], bw: 0.2 });
    ok('carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [10, 0]], valor: 250, caso: 'G' });
    ok('carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [10, 0]], valor: 100, caso: 'Q' });
    const [r] = calcularCorridas(s.modelo, null);
    expect(r.modo).toBe('parede');
    expect(r.mensagens).toEqual([]);
    expect(r.carga!.Nk).toBeCloseTo(350, 6); // rara com Q principal: G + Q
    // B: (Nk + W)/B ≤ σadm. B = 1,85 m: balanço (1,85 − 0,20)/2 = 0,825 m, h rígida = 2·0,825/3 = 0,55 m, h0 = 0,20 m;
    // seção = 0,20·0,55 + 1,65·(0,55 + 0,20)/2 = 0,72875 m² → W = 25·0,72875 = 18,22 kN/m; (350 + 18,22)/1,85 = 199,04 ≤ 200.
    // B = 1,80 m: h = 0,55 (0,533 → 0,55), seção 0,71 m², W = 17,75 → 367,75/1,80 = 204,3 > 200.
    expect(r.B).toBeCloseTo(1.85, 9);
    expect(r.h).toBeCloseTo(0.55, 9);
    expect(r.h0).toBeCloseTo(0.2, 9);
    expect(r.carga!.W).toBeCloseTo(25 * 0.72875, 6);
    expect(r.pressao!.sigmaMax).toBeCloseTo((350 + 25 * 0.72875) / 1.85, 6);
    // CEB-70: Nd = 1,4·350 = 490 kN/m; pd = 490/1,85 = 264,86 kPa; seção de referência a 0,15·0,20 = 0,03 m da face: l = 0,855 m;
    // Md = pd·l²/2 = 96,81 kN·m/m
    const t = r.transversal!;
    expect(t.Md).toBeCloseTo((490 / 1.85) * 0.855 ** 2 / 2, 6);
    expect(t.Md).toBeCloseTo(96.81, 2);
    // flexão (d = 0,55 − 0,05 − 0,01 = 0,49 m; fcd = 30/1,4; bloco retangular): x = 1,25d[1 − √(1 − Md/(0,425·d²·fcd))], As = Md/(fyd(d − 0,4x))
    const d = 0.49, fcd = 30 / 1.4, x = 1.25 * d * (1 - Math.sqrt(1 - 0.09681 / (0.425 * d * d * fcd))), As = 0.09681 / ((500 / 1.15) * (d - 0.4 * x)) * 1e4;
    expect(t.As).toBeCloseTo(As, 2); // 4,60 cm²/m
    // taxa mínima 0,15 %·1 m·h = 8,25 cm²/m governa; φ12,5 c/14 (8,77 cm²/m; φ10 c/9,5 fica abaixo de 10 cm)
    expect(t.AsMin).toBeCloseTo(8.25, 9);
    expect(t.AsAdot).toBeCloseTo(8.25, 9);
    expect(t.barras!.phi).toBe(12.5);
    expect(t.barras!.s).toBeCloseTo(0.14, 9);
    // distribuição: o maior entre 20 % da principal (1,75), 0,9 cm²/m e 0,5·ρmín·h = 4,125 cm²/m → φ10 c/19
    expect(t.distribuicao.As).toBeCloseTo(4.125, 9);
    expect(t.distribuicao.barras).toMatchObject({ phi: 10, s: 0.19 });
    // volume = seção × L; status ok
    expect(r.volume).toBeCloseTo(7.2875, 6);
    expect(r.status).toBe('ok');
  });

  it('seção de referência de alvenaria (25 % de bw) reduz o momento; fixa (B informada) só verifica', () => {
    const { s, ok } = sessao();
    ok('fundacao.terreno', { sigmaAdm: 200 });
    ok('corrida.criar', { pontos: [[0, 0], [6, 0]], bw: 0.2, alvenaria: true });
    ok('corrida.criar', { pontos: [[0, 3], [6, 3]], bw: 0.2, B: 1.2 });
    ok('carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [6, 0]], valor: 100, caso: 'G' });
    ok('carga.linha', { grupo: 'fundacao', pontos: [[0, 3], [6, 3]], valor: 150, caso: 'G' });
    const [a, f] = calcularCorridas(s.modelo, null);
    // alvenaria: l = balanço + 0,25·0,20; pd = 1,4·100/B
    expect(a.transversal!.l).toBeCloseTo(a.transversal!.balanco + 0.05, 9);
    expect(a.transversal!.Md).toBeCloseTo(((1.4 * 100) / a.B) * a.transversal!.l ** 2 / 2, 6);
    // B = 1,20 m imposta com 150 kN/m: 150 + W > 200·1,2 = 240? (150 + ~11)/1,2 = 134 ≤ 200: atende, B fica 1,20
    expect(f.fixa).toBe(true);
    expect(f.B).toBe(1.2);
    expect(f.status).toBe('ok');
    // B imposta pequena demais: erro de largura
    expect(s.executar('corrida.editar', { id: s.modelo.fundacao!.corridas![1].id, B: 0.5 }).ok).toBe(true);
    const [, g] = calcularCorridas(s.modelo, null);
    expect(g.status).toBe('fail');
    expect(g.mensagens[0]).toMatch(/nenhuma largura atende/);
  });

  it('aba de um lado: sem cintas a pressão excêntrica não atende (erro); com cintas a reação é uniforme e sai o momento N·e', () => {
    const { s, ok } = sessao();
    ok('fundacao.terreno', { sigmaAdm: 200 });
    ok('corrida.criar', { pontos: [[0, 0], [8, 0]], bw: 0.2, aba: 'esq' });
    ok('carga.linha', { grupo: 'fundacao', pontos: [[0, 0], [8, 0]], valor: 100, caso: 'G' });
    let [r] = calcularCorridas(s.modelo, null);
    expect(r.status).toBe('fail');
    expect(r.mensagens.join(' ')).toMatch(/aba de um lado exige viga de equilíbrio/);
    const id = s.modelo.fundacao!.corridas![0].id;
    ok('corrida.editar', { id, equilibrio: true });
    [r] = calcularCorridas(s.modelo, null);
    expect(r.status, r.mensagens.join(' ')).toBe('ok');
    // reação uniforme: B = (Nk + W)/σadm; e = (B − bw)/2; cinta = Nk·e
    expect(r.pressao!.sigmaMax).toBeLessThanOrEqual(200 + 1e-6);
    expect(r.cinta).toBeCloseTo(r.carga!.Nk * ((r.B - 0.2) / 2), 6);
    // geometria: aba à esquerda do sentido (+y), apoio rente à face direita
    const ys = contornoCorrida(s.modelo.fundacao!.corridas![0], r.B).map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(-0.1, 9);
    expect(Math.max(...ys)).toBeCloseTo(r.B - 0.1, 9);
    // revisão: o erro da corrida sem cintas vira FUND_CORRIDA_EXC
    ok('corrida.editar', { id, limpar: ['equilibrio'] });
    const dim = { vigas: [], pilares: [], lajes: [], quantitativos: [], combinacoes: 0, corridas: calcularCorridas(s.modelo, null) };
    const rv = revisarEdificio(s.modelo, null, dim);
    expect(rv.itens.some((x) => x.codigo === 'FUND_CORRIDA_EXC' && x.id === id)).toBe(true);
  });

  it('sem carga, sem σadm e sem sondagem: mensagens com código; cargas sobre a corrida não viram "fora das vigas e elementos"', () => {
    const { s, ok } = sessao();
    ok('corrida.criar', { pontos: [[0, 0], [5, 0]] });
    let [r] = calcularCorridas(s.modelo, null);
    expect(r.mensagens[0]).toMatch(/^Fundação sem σadm/);
    ok('fundacao.terreno', { sigmaAdm: 150 });
    [r] = calcularCorridas(s.modelo, null);
    expect(r.mensagens[0]).toMatch(/sem carga/);
    expect(revisarEdificio(s.modelo, null, { vigas: [], pilares: [], lajes: [], quantitativos: [], combinacoes: 0, corridas: [r] }).itens.some((x) => x.codigo === 'FUND_CORRIDA_SEM_CARGA')).toBe(true);
    ok('fundacao.terreno', { sigmaModo: 'sondagem' });
    [r] = calcularCorridas(s.modelo, null);
    expect(r.mensagens[0]).toMatch(/^Fundação sem sondagem/);
  });
});

describe('sapata corrida sob pilares (FU7a): viga sobre base elástica na análise global', () => {
  /** Seção T invertida por fórmula: aba B × h0 embaixo e nervura bw × (h − h0) em cima, I pelo centroide. */
  const inerciaT = (B: number, bw: number, h: number, h0: number) => {
    const a1 = B * h0, a2 = bw * (h - h0), y1 = h0 / 2, y2 = h0 + (h - h0) / 2, yc = (a1 * y1 + a2 * y2) / (a1 + a2);
    return (B * h0 ** 3) / 12 + a1 * (y1 - yc) ** 2 + (bw * (h - h0) ** 3) / 12 + a2 * (y2 - yc) ** 2;
  };
  const uz = (an: ReturnType<typeof analisarEdificio>, caso: string, no: number) => an.portico.res!.desloc[an.casos.indexOf(caso)][no * 6 + 2];

  it('3 pilares num trecho longo × Hetényi por superposição (w e M nos pilares)', () => {
    const { s, ok } = sessao();
    ok('opcoes.definir', { valores: { radierMalha: 0.25 } });
    const B = 1, bw = 0.4, h = 0.8, h0 = 0.3, k = 50000;
    ok('corrida.criar', { pontos: [[0, 0], [60, 0]], bw, B, h, h0, k });
    for (const x of [26, 30, 34]) ok('pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    const P = 800;
    for (const p of s.modelo.pilares) ok('carga.pilar', { pilar: p.id, caso: 'Q', N: P });
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    expect(pilaresNaBase(b).map((x) => x.tipo)).toEqual(['viga', 'viga', 'viga']);
    const be = an.baseElastica!;
    const E = concretoDe(b, 'fundacao').Ecs * 1000, EI = E * inerciaT(B, bw, h, h0), kb = k * B, lam = (kb / (4 * EI)) ** 0.25;
    const f = (d: number) => Math.exp(-lam * d) * (Math.cos(lam * d) + Math.sin(lam * d));
    const g = (d: number) => Math.exp(-lam * d) * (Math.cos(lam * d) - Math.sin(lam * d));
    const xs = [26, 30, 34];
    for (const [i, p] of b.pilares.entries()) {
      const no = be.pilares[p.id].no;
      const w = -uz(an, 'Q', no), esperado = xs.reduce((t, xj) => t + (P * lam) / (2 * kb) * f(Math.abs(xs[i] - xj)), 0);
      expect(Math.abs(w - esperado) / esperado, `w no pilar ${i}`).toBeLessThan(0.003);
    }
    // momento no pilar do meio: M = Σ P/(4λ)·g(|d|) (+ traciona embaixo)
    const no = be.pilares[b.pilares[1].id].no, ic = an.casos.indexOf('Q');
    const Ms = be.barras.filter((x) => x.ref === b.fundacao!.corridas![0].id).flatMap((x) => { const br = an.portico.modelo.barras[x.bi], e = an.portico.res!.esforcos[ic][x.bi]; return br.i === no ? [-e[5]] : br.j === no ? [e[11]] : []; });
    const M0 = xs.reduce((t, xj) => t + (P / (4 * lam)) * g(Math.abs(30 - xj)), 0);
    expect(Ms.length).toBe(2);
    for (const M of Ms) expect(Math.abs(M - M0) / M0).toBeLessThan(0.01);
    // equilíbrio das molas = cargas aplicadas na base
    expect(be.nos.reduce((t, n) => t - n.kMola * uz(an, 'Q', n.no), 0)).toBeCloseTo(3 * P, 5);
  });

  it('resultado: tensões, flexão da viga em T, flexão transversal da aba, revisão e MCP', () => {
    const { s, ok } = sessao();
    ok('fundacao.terreno', { sigmaAdm: 250 });
    ok('corrida.criar', { pontos: [[0, 0], [12, 0]], bw: 0.4, B: 1.4, h: 0.7 });
    for (const x of [1, 6, 11]) ok('pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    for (const p of s.modelo.pilares) { ok('carga.pilar', { pilar: p.id, caso: 'G', N: 400 }); ok('carga.pilar', { pilar: p.id, caso: 'Q', N: 150 }); }
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const dim = dimensionarEdificio(b, an);
    const r = dim.corridas![0];
    expect(r.modo).toBe('pilares');
    expect(r.longitudinal!.Md.sup).toBeGreaterThan(0);
    expect(r.longitudinal!.nos.length).toBeGreaterThan(10);
    expect(r.pressao!.sigmaMax).toBeGreaterThan(0);
    // aba: h0 pela rigidez do balanço (1,4 − 0,4)/2 = 0,5 → 2·0,5/3 = 0,33 → 0,35 m
    expect(r.h0).toBeCloseTo(0.35, 9);
    // flexão transversal: pd = 1,4·(σmáx − 25·A/B); Md = pd·l²/2 com l = 0,5 + 0,15·0,4
    const pesoP = (25 * (1.4 * 0.35 + 0.4 * 0.35)) / 1.4, pd = 1.4 * (r.pressao!.sigmaMax - pesoP), l = 0.5 + 0.06;
    expect(r.transversal!.Md).toBeCloseTo((pd * 1.4 * l * l) / 2 / 1.4, 3);
    expect(r.transversal!.barras).not.toBeNull();
    // o pilar sobre a corrida não pede elemento de fundação próprio
    const rv = revisarEdificio(b, an, dim);
    expect(rv.itens.some((x) => x.codigo === 'FUND_PILAR_SEM_ELEMENTO')).toBe(false);
    // MCP: só o resumo
    const fd = filtrarDim(b, dimensionar(b), undefined, false, true) as { corridas?: ReturnType<typeof resumoCorrida>[] };
    expect(fd.corridas?.length).toBe(1);
    expect(JSON.stringify(fd.corridas)).not.toContain('"nos"');
    expect(JSON.stringify(fd.corridas)).not.toContain('contorno');
    // fundação isolada sob pilar da corrida é recusada
    expect(s.executar('fundacao.criar', { pilar: b.pilares[0].id, tipo: 'sapata' }).erros[0]?.codigo).toBe('PILAR_NA_BASE_ELASTICA');
  });
});

describe('sapata corrida: pranchas do tipo fundação', () => {
  it('sob parede e sob pilares: locação, detalhamento (planta de um trecho e corte), quantitativos, DXF e PDF', () => {
    const { s, ok } = sessao();
    ok('fundacao.terreno', { sigmaAdm: 200 });
    ok('corrida.criar', { pontos: [[0, 0], [10, 0]], bw: 0.2 });
    ok('corrida.criar', { pontos: [[0, 8], [10, 8]], bw: 0.2 });
    ok('corrida.criar', { pontos: [[0, 12], [14, 12]], bw: 0.3, aba: 'dir', equilibrio: true });
    for (const y of [0, 8]) ok('carga.linha', { grupo: 'fundacao', pontos: [[0, y], [10, y]], valor: 180, caso: 'G' });
    ok('carga.linha', { grupo: 'fundacao', pontos: [[0, 12], [14, 12]], valor: 90, caso: 'G' });
    ok('corrida.criar', { pontos: [[20, 0], [32, 0]], bw: 0.4, B: 1.4, h: 0.7 });
    for (const x of [21, 26, 31]) { ok('pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } }); }
    for (const p of s.modelo.pilares) { ok('carga.pilar', { pilar: p.id, caso: 'G', N: 350 }); ok('carga.pilar', { pilar: p.id, caso: 'Q', N: 120 }); }
    const b = s.modelo, an = analisarEdificio(b), dim = dimensionarEdificio(b, an);
    expect(dim.corridas!.length).toBe(4);
    expect(dim.corridas!.map((c) => c.modo)).toEqual(['parede', 'parede', 'parede', 'pilares']);
    const prs = montarPranchasFundacao(b, an, dim);
    const nomes = prs.map((p) => p.titulo);
    expect(nomes.some((t) => /sapatas corridas — locação/.test(t)), nomes.join(' | ')).toBe(true);
    const det = prs.filter((p) => /^Fundação — sapatas corridas/.test(p.titulo) && !/locação/.test(p.titulo));
    expect(det.length).toBeGreaterThan(0);
    // as duas sapatas iguais sob parede viram "SC1=SC2" com o multiplicador
    expect(det.flatMap((p) => p.elementos ?? [])).toContain('SC1');
    const tabela = det.flatMap((p) => p.aco?.tabela ?? []);
    expect(tabela.length).toBeGreaterThan(3);
    expect(JSON.stringify(det.map((p) => p.papel))).toContain('SC1=SC2');
    expect(JSON.stringify(det.map((p) => p.papel))).toContain('CORTE TRANSVERSAL');
    // quantitativos incluem a linha das sapatas corridas
    const q = quantitativosFundacao(b, an, dim);
    expect(q.linhas.filter((l) => l.tipo === 'Sapata corrida').length).toBe(3);
    expect(q.linhas.find((l) => l.nomes.includes('SC1'))!.quant).toBe(2);
    expect(q.linhas.reduce((t, l) => t + l.aco, 0)).toBeGreaterThan(0);
    for (const p of det) expect(escreverDxf(p).length).toBeGreaterThan(1000);
    expect(escreverPdf(prs).length).toBeGreaterThan(1000);
    // conjunto: o tipo fundação sai com as folhas das corridas
    const cj = montarConjunto(b, an, dim, { tipos: ['fundacao'] });
    expect(cj.pranchas.some((p) => /sapatas corridas/.test(p.titulo))).toBe(true);
  });
});
