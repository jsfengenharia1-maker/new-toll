// V7e: radier por hipótese e combinação (C12.11), limite por diâmetro (C12.13) e deslocamento do radier por pano (K1.11.20).
// Validação analítica: radier de molas de Winkler com carga uniforme q: w = q/k e σ = q em todo nó (sem flexão).
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from '../building/analitico';
import { combinacoesEdificio } from '../building/combinacoes';
import { dimensionarEdificio } from '../building/dimensionamento';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { gradeRetangular, extremos, type P } from './bandas';
import { areaAcimaDoLimite, areaPorMetro, BITOLAS_LIMITE_MM, campoDoRadier, csvRadierHipoteses, espacamentoParaArea, tabelaRadierPorHipotese, GRANDEZAS_ISO } from './isovalores';
import { hipoteseDeCaso, hipoteseDeCombinacao, hipotesesDisponiveis } from './deformada';
import { casosDoPortico, maximosPorRadier } from './consultas';

const K = 40000, Q = 20, SUC = -100;

function radierUniforme() {
  const s = new Sessao();
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  ok('lote', { comandos: [[1, 1], [7, 1], [7, 6], [1, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('lote', { comandos: [[[1, 1], [7, 1]], [[1, 6], [7, 6]], [[1, 1], [1, 6]], [[7, 1], [7, 6]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.5 } } })) });
  ok('caso.criar', { nome: 'Piso', natureza: 'Q' });
  const piso = s.modelo.casos![0].id;
  ok('radier.criar', { contorno: [[0, 0], [8, 0], [8, 7], [0, 7]], h: 0.4, k: K, sigmaAdm: 300 });
  ok('carga.area', { grupo: 'fundacao', contorno: [[-1, -1], [9, -1], [9, 8], [-1, 8]], valor: Q, caso: piso });
  return { s, ok, piso };
}

describe('V7e: radier por hipótese e combinação', () => {
  const { s, ok, piso } = radierUniforme();
  const b = s.modelo, an = analisarEdificio(b), dim = dimensionarEdificio(b, an), id = b.fundacao!.radiers![0].id;

  it('caso de carga uniforme: σ = q e deslocamento = −q/k em todos os nós (solução de Winkler)', () => {
    expect(an.erro).toBeUndefined();
    const sig = campoDoRadier(b, dim, id, 'rSigma', { an, hipotese: hipoteseDeCaso(piso, 'Piso') }).campo!;
    expect(sig.valores.length).toBe(an.baseElastica!.nos.length);
    for (const v of sig.valores) expect(v).toBeCloseTo(Q, 6);
    const w = campoDoRadier(b, dim, id, 'rWh', { an, hipotese: hipoteseDeCaso(piso, 'Piso') }).campo!;
    for (const v of w.valores) expect(v).toBeCloseTo((-Q / K) * 1000, 9);
    expect(sig.unidade).toBe('kPa');
    expect(w.unidade).toBe('mm');
    expect(sig.rotulo).toContain('Piso');
  });

  it('a envoltória das combinações raras = a tensão máxima e mínima do dimensionamento, nó a nó', () => {
    const raras = combinacoesEdificio(b, an).filter((c) => c.tipo === 'RARA');
    expect(raras.length).toBeGreaterThan(0);
    const r = dim.radiers![0];
    const campos = raras.map((c) => campoDoRadier(b, dim, id, 'rSigma', { an, hipotese: hipoteseDeCombinacao(c) }).campo!);
    r.nos.forEach((n, i) => {
      expect(Math.max(...campos.map((c) => c.valores[i]))).toBeCloseTo(n.sigma, 6);
      expect(Math.min(...campos.map((c) => c.valores[i]))).toBeCloseTo(n.sigmaMin, 6);
    });
    // grandezas de envoltória inalteradas
    expect(extremos(campoDoRadier(b, dim, id, 'rSigmaMax').campo!).max!.valor).toBeCloseTo(r.sigmaMax, 6);
  });

  it('sem análise ou sem hipótese, avisa; hipótese omitida usa a primeira', () => {
    expect(campoDoRadier(b, dim, id, 'rSigma').campo).toBeNull();
    expect(campoDoRadier(b, dim, 'nada', 'rSigma', { an }).campo).toBeNull();
    const h0 = hipotesesDisponiveis(b, an)[0];
    expect(campoDoRadier(b, dim, id, 'rWh', { an }).campo!.rotulo).toContain(h0.nome);
  });

  it('tabela por hipótese: caso Piso, envoltória das raras e CSV', () => {
    const t = tabelaRadierPorHipotese(b, an, id);
    const l = t.find((x) => x.id === `caso:${piso}`)!;
    expect(l.sigmaMax).toBeCloseTo(Q, 6);
    expect(l.sigmaMin).toBeCloseTo(Q, 6);
    expect(l.recalque).toBeCloseTo((Q / K) * 1000, 9);
    expect(l.levantamento).toBe(0);
    expect(l.invalida).toBe(false);
    const r = dim.radiers![0], rar = new Set(combinacoesEdificio(b, an).filter((c) => c.tipo === 'RARA').map((c) => `comb:${c.nome}`));
    const linhasRara = t.filter((x) => rar.has(x.id));
    expect(linhasRara.length).toBe(rar.size);
    expect(Math.max(...linhasRara.map((x) => x.sigmaMax))).toBeCloseTo(r.sigmaMax, 6);
    expect(Math.min(...linhasRara.map((x) => x.sigmaMin))).toBeCloseTo(r.sigmaMin, 6);
    expect(Math.max(...linhasRara.map((x) => x.recalque))).toBeCloseTo(r.recalque * 1000, 6);
    const csv = csvRadierHipoteses(t);
    expect(csv.split('\n')[0]).toBe('Hipótese;Tipo;σ máx (kPa);σ mín (kPa);Recalque (mm);Levantamento (mm);Situação');
    expect(csv.split('\n').length).toBe(t.length + 1);
  });

  it('as grandezas do radier por hipótese existem e pedem hipótese', () => {
    for (const g of ['rSigma', 'rWh']) { const i = GRANDEZAS_ISO.find((x) => x.id === g)!; expect(i.grupo).toBe('radier'); expect(i.porHipotese).toBe(true); }
    expect(GRANDEZAS_ISO.find((x) => x.id === 'rSigmaMax')!.porHipotese).toBe(false);
  });

  it('levantamento: caso de sucção sobe o radier (uz = +|q|/k) e a combinação com ele fica inválida', () => {
    ok('caso.criar', { nome: 'Sucção', natureza: 'Q' });
    const suc = s.modelo.casos!.find((c) => c.nome === 'Sucção')!.id;
    ok('carga.area', { grupo: 'fundacao', contorno: [[-1, -1], [9, -1], [9, 8], [-1, 8]], valor: SUC, caso: suc });
    const b2 = s.modelo, an2 = analisarEdificio(b2), dim2 = dimensionarEdificio(b2, an2), id2 = b2.fundacao!.radiers![0].id;
    const t = tabelaRadierPorHipotese(b2, an2, id2);
    const ls = t.find((x) => x.id === `caso:${suc}`)!;
    expect(ls.levantamento).toBeCloseTo((-SUC / K) * 1000, 9);
    expect(ls.sigmaMin).toBeCloseTo(SUC, 6);
    expect(ls.invalida).toBe(false); // caso isolado não é hipótese de projeto
    expect(t.some((x) => x.tipo === 'combinacao' && x.invalida)).toBe(true);
    // deslocamento do radier por pano: o máximo do nó em cada caso, com levantamento marcado
    const [m] = maximosPorRadier(b2, an2);
    expect(m.tipo).toBe('radier');
    expect(m.casos[piso].uz).toBeCloseTo(-Q / K, 9);
    expect(m.casos[piso].levantamento).toBe(false);
    expect(m.casos[suc].uz).toBeCloseTo(-SUC / K, 9);
    expect(m.casos[suc].levantamento).toBe(true);
    expect(Object.keys(m.casos)).toEqual(casosDoPortico(an2).filter((c) => m.casos[c]));
    expect(campoDoRadier(b2, dim2, id2, 'rWh', { an: an2, hipotese: hipoteseDeCaso(suc, 'Sucção') }).campo!.valores[0]).toBeCloseTo((-SUC / K) * 1000, 9);
  });
});

describe('V7e: deslocamento por pano do radier (K1.11.20)', () => {
  it('máximo = maior |uz| dos nós do radier, com a posição do nó', () => {
    const { s, piso } = radierUniforme();
    const b = s.modelo, an = analisarEdificio(b), ms = maximosPorRadier(b, an);
    expect(ms.length).toBe(1);
    const be = an.baseElastica!, ic = an.casos.indexOf('G');
    const bruto = Math.max(...be.nos.map((n) => Math.abs(an.portico.res!.desloc[ic][n.no * 6 + 2])));
    expect(Math.abs(ms[0].casos.G.uz)).toBeCloseTo(bruto, 12);
    expect(be.nos.some((n) => n.x === ms[0].casos.G.x && n.y === ms[0].casos.G.y)).toBe(true);
    expect(ms[0].casos[piso].uz).toBeCloseTo(-Q / K, 9);
    // obra sem radier: nada
    const vazio = new Sessao();
    for (const c of comandosEdificioPadrao()) vazio.executar(c.nome, c.params, 'sistema');
    expect(maximosPorRadier(vazio.modelo, analisarEdificio(vazio.modelo))).toEqual([]);
  });
});

describe('V7e: limite por diâmetro (C12.13)', () => {
  it('área de aço por metro = π·φ²/4 · 100/s', () => {
    expect(areaPorMetro(10, 20)).toBeCloseTo(3.92699, 4);
    expect(areaPorMetro(12.5, 15)).toBeCloseTo(8.18123, 4);
    expect(areaPorMetro(8, 10)).toBeCloseTo(5.02655, 4);
    expect(areaPorMetro(16, 12.5)).toBeCloseTo(16.0850, 3);
    expect(BITOLAS_LIMITE_MM).toContain(12.5);
  });
  it('maior espaçamento (múltiplo de 2,5 cm, até 30) em que a bitola atende a taxa', () => {
    expect(espacamentoParaArea(10, 4)).toBe(17.5); // φ10 c/20 = 3,93 < 4; c/17,5 = 4,49
    expect(espacamentoParaArea(10, 1)).toBe(30);
    expect(espacamentoParaArea(6.3, 40)).toBeNull();
    for (const s of [10, 12.5, 15, 20]) expect(espacamentoParaArea(12.5, areaPorMetro(12.5, s))).toBe(s);
  });
  it('região acima do limite: campo linear σ = 100 + 10x em 4 × 3 m, limite 120 → metade da área', () => {
    const nos: P[] = gradeRetangular(0, 0, 4, 3, 8, 6);
    const rb = { id: 'r1', nome: 'R1', nos: nos.map(([x, y]) => ({ x, y, sigma: 100 + 10 * x, sigmaMin: 0, w: 0 })) };
    const bb = { fundacao: { radiers: [{ id: 'r1', contorno: [[0, 0], [4, 0], [4, 3], [0, 3]], furos: [] }] } };
    const c = campoDoRadier(bb as never, { radiers: [rb] } as never, 'r1', 'rSigmaMax').campo!;
    const r = areaAcimaDoLimite(c, 120);
    expect(r.total).toBeCloseTo(12, 9);
    expect(r.area).toBeCloseTo(6, 9);
    expect(r.fracao).toBeCloseTo(0.5, 9);
    expect(areaAcimaDoLimite(c, 1000).area).toBe(0);
    expect(areaAcimaDoLimite(c, 0).fracao).toBeCloseTo(1, 9);
  });
});
