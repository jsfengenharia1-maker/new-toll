import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { revisarEdificio } from './revisao';
import { edificioVazio, type BuildingModel } from './types';
import { concretoDe } from './materiais';
import { gradeRadier, pilaresNaBase, radierSemCarga, resumoBaseElastica } from './baseElastica';
import { calcularFundacaoEdificio } from './fundacao';
import { filtrarDim } from '../../cli/mcp';
import ref from '../../../validation/opensees/radier.json';
import { montarPranchasFundacao } from '../sheets/fundacao';
import { escreverDxf } from '../sheets/dxf';
import { escreverPdf } from '../sheets/pdf';
import { dimensionar } from '../../cli/run';

function sessao(b: BuildingModel = edificioVazio()) {
  const s = new Sessao(b);
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  return { s, ok };
}

/** Uz de um nó num caso (m). */
const uz = (an: ReturnType<typeof analisarEdificio>, caso: string, no: number) => an.portico.res!.desloc[an.casos.indexOf(caso)][no * 6 + 2];

describe('base elástica (FU6): validação analítica', () => {
  it('viga longa sobre base elástica com carga concentrada no meio = Hetényi (w0 = Pλ/2kb, M0 = P/4λ)', () => {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('opcoes.definir', { valores: { radierMalha: 0.25 } });
    ok('vigaElastica.criar', { pontos: [[0, 0], [40, 0]], b: 1, h: 1, k: 50000 });
    ok('pilar.inserir', { x: 20, y: 0, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    const P = 1000;
    ok('carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'Q', N: P });
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const be = an.baseElastica!;
    expect(pilaresNaBase(b).map((x) => x.tipo)).toEqual(['viga']);
    const E = concretoDe(b, 'fundacao').Ecs * 1000, EI = (E * 1 * 1 ** 3) / 12, kb = 50000 * 1, lam = (kb / (4 * EI)) ** 0.25;
    const w0 = (P * lam) / (2 * kb), M0 = P / (4 * lam);
    const no = be.pilares[b.pilares[0].id].no;
    const w = -uz(an, 'Q', no);
    expect(Math.abs(w - w0) / w0).toBeLessThan(0.001); // 0,01 % com malha 0,25 m
    // momento no meio: ponta das barras que chegam ao nó do pilar (+ traciona embaixo)
    const ic = an.casos.indexOf('Q'), bs = be.barras.filter((x) => x.tipo === 'viga');
    const Ms = bs.flatMap((x) => { const br = an.portico.modelo.barras[x.bi], e = an.portico.res!.esforcos[ic][x.bi]; return br.i === no ? [-e[5]] : br.j === no ? [e[11]] : []; });
    expect(Ms.length).toBe(2);
    for (const M of Ms) expect(Math.abs(M - M0) / M0).toBeLessThan(0.005); // 0,07 % com malha 0,25 m (0,3 % com 0,5 m)
    // equilíbrio: soma das molas = carga
    const R = be.nos.reduce((t, n) => t - n.kMola * uz(an, 'Q', n.no), 0);
    expect(R).toBeCloseTo(P, 6);
    // a 1,5/λ do meio, w = w0·e^(−λx)(cos λx + sen λx)
    const x = 1.5 / lam, alvo = be.nos.reduce((m, n) => (Math.abs(n.x - 20 - x) < Math.abs(m.x - 20 - x) ? n : m), be.nos[0]), lx = lam * (alvo.x - 20);
    expect(-uz(an, 'Q', alvo.no)).toBeCloseTo(w0 * Math.exp(-lx) * (Math.cos(lx) + Math.sin(lx)), 5);
  });

  it('radier com carga uniforme: recalque q/k em todos os nós (sem flexão) e malha passando pelos pilares', () => {
    const { s, ok } = sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    ok('lote', { comandos: [[1, 1], [7, 1], [7, 6], [1, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
    ok('lote', { comandos: [[[1, 1], [7, 1]], [[1, 6], [7, 6]], [[1, 1], [1, 6]], [[7, 1], [7, 6]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
    ok('caso.criar', { nome: 'Piso', natureza: 'Q' });
    const caso = s.modelo.casos![0].id;
    ok('radier.criar', { contorno: [[0, 0], [8, 0], [8, 7], [0, 7]], h: 0.4, k: 40000, sigmaAdm: 300 });
    ok('carga.area', { grupo: 'fundacao', contorno: [[-1, -1], [9, -1], [9, 8], [-1, 8]], valor: 20, caso });
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const be = an.baseElastica!;
    expect(Object.keys(be.pilares).length).toBe(4);
    // nós no centro dos pilares (as linhas da grade passam por eles)
    for (const p of b.pilares) { const n = an.portico.modelo.nos[be.pilares[p.id].no]; expect(Math.hypot(n[0] - p.x, n[1] - p.y)).toBeLessThan(1e-6); }
    // área de influência soma a área do radier
    expect(be.nos.reduce((t, n) => t + n.area, 0)).toBeCloseTo(56, 6);
    for (const n of be.nos) expect(-uz(an, caso, n.no)).toBeCloseTo(20 / 40000, 9);
    // peso próprio também uniforme (γh/k)
    const ws = be.nos.map((n) => -uz(an, 'G', n.no));
    expect(Math.min(...ws)).toBeGreaterThan(0);
    // tensões nas raras e resumo; pilares sem vínculo externo (fundacao = esforços no pé do pilar)
    const dim = dimensionarEdificio(b, an);
    const r = dim.radiers![0];
    expect(r.sigmaMax).toBeGreaterThan(0);
    expect(r.sigmaMin).toBeGreaterThan(0);
    expect(r.nos.length).toBe(be.nos.length);
    expect(r.As.pos[0]).toBeGreaterThanOrEqual(0.15 * 40 - 1e-9); // ρmín 0,15 % de 40 cm
    expect(dim.detalhesRadier![0].posicoes.filter((x) => x.face === 'inf').length).toBeGreaterThan(0);
    expect(dim.detalhesRadier![0].posicoes.filter((x) => x.face === 'sup').length).toBeGreaterThan(0);
    expect(resumoBaseElastica(r)).not.toHaveProperty('nos');
    const fG = an.fundacao.filter((x) => x.caso === 'G' && b.pilares.some((p) => p.id === x.pilar));
    expect(fG.length).toBe(4);
    // equilíbrio do caso G: molas = carga dos pilares + peso do radier
    const molas = be.nos.reduce((t, n) => t - n.kMola * uz(an, 'G', n.no), 0);
    expect(molas).toBeCloseTo(fG.reduce((t, x) => t + x.N, 0) + be.cargas.G, 3);
    // revisão: sem FUND_PILAR_SEM_ELEMENTO para pilares sobre o radier
    const rv = revisarEdificio(b, an, dim);
    expect(rv.itens.some((x) => x.codigo === 'FUND_PILAR_SEM_ELEMENTO')).toBe(false);
    // MCP: só o resumo
    const fd = filtrarDim(b, dimensionar(b), undefined, false, true) as { radiers?: unknown[] };
    expect(fd.radiers?.length).toBe(1);
    expect(JSON.stringify(fd.radiers)).not.toContain('"nos"');
    // pranchas do tipo fundação: folhas da base elástica (malhas inferior e superior) e quantitativos
    const prs = montarPranchasFundacao(b, an, dim);
    const fl = prs.filter((p) => p.titulo.includes('base elástica'));
    expect(fl.length).toBe(2);
    expect(fl[0].aco?.tabela.length).toBeGreaterThan(0);
    expect(JSON.stringify(prs.at(-1)!.papel)).toContain('Radier');
    expect(escreverDxf(fl[0]).length).toBeGreaterThan(1000);
    expect(escreverPdf(prs).length).toBeGreaterThan(1000);
  });

  it('erros e avisos: tensão acima da σadm, levantamento, apoios mistos e pilar sobre a base sem elemento próprio', () => {
    const { s, ok } = sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    ok('lote', { comandos: [[0, 0], [5, 0], [10, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
    ok('viga.tracar', { grupo: 'g_3', pontos: [[0, 0], [10, 0]], secao: { b: 0.15, h: 0.5 } });
    ok('vigaElastica.criar', { pontos: [[-0.5, 0], [5.5, 0]], b: 0.6, h: 0.6, k: 20000, sigmaAdm: 20 });
    const [P1, P2, P3] = s.modelo.pilares;
    // P1 e P2 sobre a viga, P3 com vínculo externo: apoios mistos
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    expect(Object.keys(an.baseElastica!.pilares).sort()).toEqual([P1.id, P2.id].sort());
    expect(an.avisos.some((a) => a.startsWith('Apoios mistos'))).toBe(true);
    const dim = dimensionarEdificio(s.modelo, an);
    const v = dim.vigasElasticas![0];
    expect(v.mensagens.some((m) => m.startsWith('Fundação: tensão no solo')), v.mensagens.join(' ')).toBe(true);
    expect(v.status).toBe('fail');
    const rv = revisarEdificio(s.modelo, an, dim);
    expect(rv.itens.some((x) => x.codigo === 'FUND_RADIER_TENSAO' && x.id === v.id)).toBe(true);
    expect(rv.itens.some((x) => x.codigo === 'FUND_APOIOS_MISTOS')).toBe(true);
    // fundação própria sob pilar da viga: recusada
    ok('fundacao.terreno', { sigmaAdm: 200 });
    expect(s.executar('fundacao.criar', { pilar: P1.id, tipo: 'sapata' }).erros[0]?.codigo).toBe('PILAR_NA_BASE_ELASTICA');
    expect(s.executar('fundacao.criar', { pilar: P3.id, tipo: 'sapata' }).ok).toBe(true);
    void P2;
    // levantamento: carga para cima na ponta da viga (rara com Q principal) — erro, sem iteração
    ok('carga.ponto', { grupo: 'fundacao', ponto: [-0.4, 0], valor: -400, caso: 'Q' });
    const an2 = analisarEdificio(s.modelo), dim2 = dimensionarEdificio(s.modelo, an2);
    const v2 = dim2.vigasElasticas![0];
    expect(v2.sigmaMin).toBeLessThan(0);
    expect(revisarEdificio(s.modelo, an2, dim2).itens.some((x) => x.codigo === 'FUND_LEVANTAMENTO' && x.id === v2.id)).toBe(true);
  });

  it('carga do nível de fundação sobre o radier entra na análise (revisão de cálculo) e sai das vigas/elementos', () => {
    const { s, ok } = sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    ok('pilar.inserir', { x: 2, y: 2, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    const r0 = s.revCalculo;
    ok('carga.ponto', { grupo: 'fundacao', ponto: [2, 2], valor: 10, caso: 'Q' });
    expect(s.revCalculo).toBe(r0); // sem base elástica: só fundações
    ok('radier.criar', { contorno: [[0, 0], [4, 0], [4, 4], [0, 4]] });
    const r1 = s.revCalculo;
    ok('carga.ponto', { grupo: 'fundacao', ponto: [1, 1], valor: 10, caso: 'Q' });
    expect(s.revCalculo).toBe(r1 + 1);
    const an = analisarEdificio(s.modelo);
    expect(an.baseElastica!.cargasUsadas.length).toBe(2);
    expect(an.baseElastica!.cargas.Q).toBeCloseTo(20, 9);
    const f = calcularFundacaoEdificio(s.modelo, an);
    expect(f.avisos.some((a) => a.startsWith('Carga no nível de fundação fora'))).toBe(false);
  });

  it('radier com carga concentrada no centro × placa do OpenSees (ShellMITC4 + molas): grelha com torção plena a ±5 %', () => {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('opcoes.definir', { valores: { radierMalha: ref.malha, torcaoLaje: 1 } });
    ok('radier.criar', { contorno: [[0, 0], [ref.L, 0], [ref.L, ref.L], [0, ref.L]], h: ref.h, k: ref.k });
    ok('pilar.inserir', { x: ref.L / 2, y: ref.L / 2, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    ok('carga.pilar', { pilar: s.modelo.pilares[0].id, caso: 'Q', N: ref.P });
    const b = s.modelo, an = analisarEdificio(b), be = an.baseElastica!;
    expect(concretoDe(b, 'fundacao').Ecs * 1000).toBeCloseTo(ref.E, 3);
    const w = (x: number, y: number) => { const n = be.nos.reduce((m, q) => (Math.hypot(q.x - x, q.y - y) < Math.hypot(m.x - x, m.y - y) ? q : m), be.nos[0]); return -uz(an, 'Q', n.no); };
    // centro −2,2 % e quarto do vão +3,0 % (placa: grelha de Hambly com J = 2I)
    expect(Math.abs(w(ref.L / 2, ref.L / 2) - ref.resultados.w_centro) / ref.resultados.w_centro).toBeLessThan(0.05);
    expect(Math.abs(w(ref.L / 4, ref.L / 2) - ref.resultados.w_quarto) / ref.resultados.w_quarto).toBeLessThan(0.05);
    // canto levanta nos dois (análise linear)
    expect(w(0, 0)).toBeLessThan(0);
    expect(ref.resultados.w_canto).toBeLessThan(0);
  });

  it('arranques com cargas sobre o radier e sobre a viga: cargas nos nós da base (equilíbrio das molas)', () => {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('pilar.inserir', { x: 20, y: 20, secao: { tipo: 'ret', b: 0.3, h: 0.3 } });
    ok('radier.criar', { contorno: [[0, 0], [4, 0], [4, 4], [0, 4]] });
    ok('vigaElastica.criar', { pontos: [[10, 0], [16, 0]] });
    ok('pilar.inserir', { x: 2, y: 2, secao: { tipo: 'ret', b: 0.2, h: 0.2 }, nasce: 'fundacao', morre: 'fundacao' });
    ok('pilar.inserir', { x: 13, y: 0, secao: { tipo: 'ret', b: 0.2, h: 0.2 }, nasce: 'fundacao', morre: 'fundacao' });
    const [, A1, A2] = s.modelo.pilares;
    ok('carga.pilar', { pilar: A1.id, caso: 'Q', N: 300 });
    ok('carga.pilar', { pilar: A2.id, caso: 'Q', N: 200 });
    const an = analisarEdificio(s.modelo), be = an.baseElastica!;
    expect(be.cargas.Q).toBeCloseTo(500, 9);
    for (const ref of [s.modelo.fundacao!.radiers![0].id, s.modelo.fundacao!.vigasElasticas![0].id]) {
      const R = be.nos.filter((n) => n.ref === ref).reduce((t, n) => t - n.kMola * uz(an, 'Q', n.no), 0);
      expect(R).toBeCloseTo(ref.startsWith('rad') ? 300 : 200, 6);
    }
  });

  it('grade do radier: linhas pelos pontos dados, larguras cobrindo a área e furo fora', () => {
    const g = gradeRadier([[0, 0], [6, 0], [6, 4], [0, 4]], [[[2, 1], [3, 1], [3, 2], [2, 2]]], 0, 0.5, [[1.3, 2.7]]);
    expect(g.area).toBeCloseTo(23, 9);
    const pts = g.linhas.flatMap((l) => l.pontos);
    expect(pts.some((p) => Math.hypot(p[0] - 1.3, p[1] - 2.7) < 1e-9)).toBe(true);
    expect(pts.some((p) => p[0] > 2 + 1e-6 && p[0] < 3 - 1e-6 && p[1] > 1 + 1e-6 && p[1] < 2 - 1e-6)).toBe(false);
  });
});

describe('radier sem carga: definir a carga na hora (FU8c, C10.23)', () => {
  it('radier.carga lança G e Q de área sobre o contorno num só passo; o aviso some e a carga entra na análise', () => {
    const { s, ok } = sessao();
    ok('pavimento.criar', { nome: 'Térreo', cota: 0 });
    ok('fundacao.terreno', { sigmaAdm: 200 });
    ok('radier.criar', { contorno: [[0, 0], [6, 0], [6, 4], [0, 4]], h: 0.4 });
    ok('pilar.inserir', { x: 3, y: 2, secao: { tipo: 'ret', b: 0.4, h: 0.4 }, nasce: 'fundacao' });
    const r = s.modelo.fundacao!.radiers![0];
    expect(radierSemCarga(s.modelo, r)).toBe(true);
    const an0 = analisarEdificio(s.modelo);
    expect(an0.avisos.some((a) => /^Radier sem cargas/.test(a))).toBe(true);
    // validação: sem valor e radier inexistente
    expect(s.executar('radier.carga', { id: r.id }).ok).toBe(false);
    expect(s.executar('radier.carga', { id: 'xx', G: 5 }).ok).toBe(false);
    const rc = s.revCalculo;
    ok('radier.carga', { id: r.id, G: 5, Q: 2 });
    expect(s.revCalculo).toBe(rc + 1); // muda a análise global (molas)
    const cs = s.modelo.cargas.filter((c) => c.grupo === 'fundacao');
    expect(cs.map((c) => [c.caso, c.tipo, c.valor])).toEqual([['G', 'area', 5], ['Q', 'area', 2]]);
    expect(radierSemCarga(s.modelo, r)).toBe(false);
    expect(analisarEdificio(s.modelo).avisos.some((a) => /^Radier sem cargas/.test(a))).toBe(false);
    // um passo só no histórico: desfazer remove as duas cargas
    s.desfazer();
    expect(s.modelo.cargas.filter((c) => c.grupo === 'fundacao')).toHaveLength(0);
  });
});
