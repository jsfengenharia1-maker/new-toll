// R7d: armadura base (barras e tela soldada), reforço = necessária − base, painéis de tela e armaduras predefinidas.
// O baseline `detalhamentoLajes.base.json` foi gerado pelo código anterior à R7d: sem base nem predefinidas (e com as
// opções novas nos valores da NBR) o detalhamento das lajes tem de ser idêntico.
import { describe, expect, it } from 'vitest';
import base from './detalhamentoLajes.base.json';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { barArea } from '../concrete';
import { analisarEdificio } from './analitico';
import { resumoTelasLajes, type DetalheLaje } from './detalhamentoLajes';
import { dimensionarEdificio } from './dimensionamento';
import { OPCOES_INFO, opcoesEmUso, padraoDe } from './opcoes';
import { edificioExemplo } from '../sheets/exemplo';
import { revisarEdificio } from './revisao';
import { areaTela, PAINEL_TELA, telaPor, TELAS } from './telasSoldadas';

function lajes(vaos: number[], furo = false, nbr = false) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  if (furo) ok('laje.abertura', { id: s.modelo.lajes[0].id, contorno: [[1, 1.5], [2, 1.5], [2, 2.5], [1, 2.5]] });
  if (nbr) ok('opcoes.definir', { perfil: 'nbr' });
  const dim = () => dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
  return { s, ok, dim };
}
const r6 = (x: unknown): unknown => typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : Array.isArray(x) ? x.map(r6) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, r6(v)])) : x;
const digest = (d: ReturnType<typeof dimensionarEdificio>) => JSON.parse(JSON.stringify(r6({ det: d.detalhesLajes, res: d.resumoAcoLajes, msg: d.lajes.map((l) => l.mensagens) })));
const NOVAS = ['lajeBaseDetalhada', 'lajeBaseEmendaApoio', 'lajeReforcoReducao', 'lajeTelaTraspasse'];
const peso = (d: DetalheLaje, tipos: string[]) => d.posicoes.filter((p) => tipos.includes(p.tipo)).reduce((t, p) => t + p.n * p.comprimento, 0);

describe('R7d: sem base nem predefinidas o detalhamento é o anterior', () => {
  it('opções novas: valores do sistema e da NBR iguais', () => {
    const nbr = opcoesEmUso(undefined, 'nbr') as never as Record<string, number>, sis = opcoesEmUso(undefined, 'sistema') as never as Record<string, number>;
    for (const k of NOVAS) expect(nbr[k]).toBe(sis[k]);
    expect(OPCOES_INFO.filter((o) => NOVAS.includes(o.chave)).map((o) => padraoDe(o))).toEqual([0, 1, 0, 20]);
  });
  it('dois e três vãos, furo, perfil NBR e edifício de exemplo (digest idêntico)', () => {
    expect(digest(lajes([4, 4]).dim())).toEqual(base.v2);
    expect(digest(lajes([3, 6, 4]).dim())).toEqual(base.v3);
    expect(digest(lajes([5], true).dim())).toEqual(base.furo);
    expect(digest(lajes([4, 4], false, true).dim())).toEqual(base.nbr);
    const ex = edificioExemplo();
    expect(digest(dimensionarEdificio(ex.modelo, analisarEdificio(ex.modelo)))).toEqual(base.ex);
  }, 120000);
});

describe('R7d: catálogo de telas (NBR 7481)', () => {
  it('área = designação/100 cm²/m nas duas direções; massa pelo aço; φ e malha conferem com a designação', () => {
    for (const t of TELAS) {
      const n = +t.id.slice(1);
      expect(t.AsL).toBeCloseTo(n / 100, 9);
      expect(t.kgm2).toBeCloseTo(2 * (n / 100) * 1e-4 * 7850, 2);
      // a área do fio nominal por metro fica a menos de 2 % da designação
      expect((barArea(t.phiL) * 1e4 * 100) / t.sL / (n / 100)).toBeGreaterThan(0.98);
      expect((barArea(t.phiL) * 1e4 * 100) / t.sL / (n / 100)).toBeLessThan(1.02);
    }
    expect(telaPor('Q138')).toMatchObject({ phiL: 4.2, sL: 10 });
    expect(telaPor('Q138')!.kgm2).toBeCloseTo(2.17, 2); // fabricante: 2,20 kg/m² (com fios de borda)
    expect(areaTela(telaPor('Q92')!, true)).toEqual([0.92, 0.92]);
  });
});

describe('R7d: armadura base de barras', () => {
  it('reforço = necessária − base (cálculo manual) e base não detalhada fora do desenho e do quantitativo', () => {
    const t = lajes([4, 4]);
    const d0 = t.dim().detalhesLajes!, L1 = t.s.modelo.lajes[0];
    const ant = d0.find((x) => x.laje === L1.id)!;
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { barras: [{ dir: 0, phi: 6.3, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] } });
    const d = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const Ab = (barArea(6.3) * 1e4) / 0.2; // 1,559 cm²/m
    expect(d.positivas[0].base).toBeCloseTo(Ab, 2);
    const ref0 = ant.positivas[0].AsNec - Ab; // 1,8 − 1,559 = 0,241 cm²/m
    expect(ref0).toBeGreaterThan(0);
    expect(d.positivas[0].reforco).toBe(true);
    expect(d.positivas[0].As).toBeGreaterThanOrEqual(ant.positivas[0].AsNec - 1e-6); // base + reforço atende
    // sem detalhar: só reforço desenhado, nenhuma posição de base
    expect(d.posicoes.some((p) => p.tipo === 'base')).toBe(false);
    expect(d.posicoes.filter((p) => p.tipo === 'reforco').length).toBeGreaterThan(0);
    const r = d.posicoes.find((p) => p.tipo === 'reforco' && p.dir === 0)!;
    expect((barArea(r.phi) * 1e4) / r.s).toBeGreaterThanOrEqual(ref0 - 1e-3);
    expect(d.base).toMatchObject({ detalhada: false, inf: { nota: 'φ6,3 c/ 20 / φ6,3 c/ 20' } });
    expect(peso(d, ['reforco'])).toBeLessThan(peso(ant, ['positiva']));
  });

  it('base suficiente: sem reforço; base detalhada entra no desenho e no quantitativo (opção e por laje)', () => {
    const t = lajes([4, 4]);
    const L1 = t.s.modelo.lajes[0];
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { barras: [{ dir: 0, phi: 8, s: 10 }, { dir: 1, phi: 8, s: 10 }] } });
    let d = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    expect(d.posicoes.some((p) => p.tipo === 'reforco' || p.tipo === 'positiva')).toBe(false);
    expect(d.positivas.every((p) => p.reforco === false)).toBe(true);
    const semBase = d.peso;
    t.ok('laje.armaduraBase', { ids: [L1.id], detalhada: true });
    d = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const bs = d.posicoes.filter((p) => p.tipo === 'base');
    expect(bs.length).toBeGreaterThan(0);
    expect(bs.every((p) => p.face === 'inf' && p.phi === 8 && p.s === 0.1)).toBe(true);
    expect(d.peso).toBeGreaterThan(semBase + 20);
    // 4 m × 5 m com barras de 10 cm: ~ 51 barras de 3,9 m (dir 0 ao longo de y: n = 40 de 5 m) — comprimento total ≥ área / s
    const tot = bs.reduce((a, p) => a + p.n * p.comprimento, 0);
    expect(tot).toBeGreaterThan((20 / 0.1) * 0.95);
    // opção global liga o mesmo efeito nas lajes sem sobreposição; por laje `detalhadaPadrao` volta a opção
    t.ok('laje.armaduraBase', { ids: [L1.id], detalhadaPadrao: true });
    expect(t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!.posicoes.some((p) => p.tipo === 'base')).toBe(false);
    t.ok('opcoes.definir', { valores: { lajeBaseDetalhada: 1 } });
    expect(t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!.posicoes.some((p) => p.tipo === 'base')).toBe(true);
  }, 60000);

  it('redução de densidade: reforço com a bitola da base em espaçamento múltiplo', () => {
    const t = lajes([4, 4]);
    const L1 = t.s.modelo.lajes[0];
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { barras: [{ dir: 0, phi: 6.3, s: 10 }, { dir: 1, phi: 6.3, s: 10 }] } }); // base 3,12 cm²/m: com menos, o reforço é nulo
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { barras: [{ dir: 0, phi: 5, s: 15 }, { dir: 1, phi: 5, s: 15 }] } });
    const ant = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    t.ok('opcoes.definir', { valores: { lajeReforcoReducao: 1 } });
    const d = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const r = d.posicoes.find((p) => p.tipo === 'reforco' && p.dir === 0);
    if (r) { expect(r.phi).toBe(5); expect(Math.abs(r.s / 0.15 - Math.round(r.s / 0.15))).toBeLessThan(1e-6); }
    expect(d.positivas[0].As).toBeGreaterThanOrEqual(ant.positivas[0].AsNec - 1e-6);
  }, 60000);

  it('base superior atende os negativos; senão o negativo é só o reforço', () => {
    const t = lajes([4, 4]);
    const [L1, L2] = t.s.modelo.lajes;
    const ant = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const negAnt = ant.posicoes.filter((p) => p.tipo === 'negativa' || p.tipo === 'negativa-borda');
    expect(negAnt.length).toBeGreaterThan(0);
    t.ok('laje.armaduraBase', { ids: [L1.id, L2.id], sup: { barras: [{ dir: 0, phi: 8, s: 10 }, { dir: 1, phi: 8, s: 10 }] } });
    const d = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    expect(d.posicoes.filter((p) => p.tipo === 'negativa' || p.tipo === 'negativa-borda' || p.tipo === 'canto')).toHaveLength(0);
    expect(d.posicoes.filter((p) => p.tipo === 'distribuicao')).toHaveLength(0);
  }, 60000);

  it('comando: φ fora da tabela, tela inexistente e laje treliçada são recusadas', () => {
    const t = lajes([4, 4]);
    const L1 = t.s.modelo.lajes[0];
    expect(t.s.executar('laje.armaduraBase', { ids: [L1.id], inf: { barras: [{ dir: 0, phi: 8, s: 120 }] } }).ok).toBe(false);
    expect(t.s.executar('laje.armaduraBase', { ids: [L1.id], inf: { tela: 'Q999' } }).ok).toBe(false);
    expect(t.s.executar('laje.armaduraBase', { ids: [L1.id], inf: { tela: 'Q138', barras: [{ dir: 0, phi: 8, s: 10 }] } }).ok).toBe(false);
    expect(t.s.executar('laje.armaduraBase', { ids: ['x'], inf: { tela: 'Q138' } }).ok).toBe(false);
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { tela: 'Q138' } });
    t.ok('laje.armaduraBase', { ids: [L1.id], remover: ['inf'] });
    expect(t.s.modelo.lajes[0].base).toBeUndefined();
  });
});

describe('R7d: tela soldada', () => {
  it('base Q138 detalhada: painéis 2,45 × 6,00 com traspasse cobrem o pano; resumo por designação', () => {
    const t = lajes([4, 4]);
    const [L1, L2] = t.s.modelo.lajes;
    t.ok('laje.armaduraBase', { ids: [L1.id, L2.id], inf: { tela: 'Q138' }, detalhada: true });
    const dm = t.dim(), d = dm.detalhesLajes!.find((x) => x.laje === L1.id)!;
    expect(d.base!.inf).toMatchObject({ tela: 'Q138', As: [1.38, 1.38] });
    expect(d.paineis!.length).toBeGreaterThanOrEqual(2);
    for (const p of d.paineis!) {
      expect(p.designacao).toBe('Q138');
      expect(p.largura).toBeLessThanOrEqual(PAINEL_TELA.largura + 0.011);
      expect(p.comprimento).toBeLessThanOrEqual(PAINEL_TELA.comprimento + 0.011);
      expect(p.peso).toBeCloseTo(p.largura * p.comprimento * telaPor('Q138')!.kgm2, 2);
    }
    // área dos painéis ≥ área do pano (4 m × 5 m, menos cobrimentos) e ≤ área + traspassos
    const area = d.paineis!.reduce((a, p) => a + p.largura * p.comprimento, 0);
    expect(area).toBeGreaterThan(19);
    expect(area).toBeLessThan(26);
    // tela 1,38 cm²/m < 1,8: reforço = 0,42 cm²/m
    expect(d.positivas[0].reforco).toBe(true);
    // resumo: painéis das duas lajes (+ repetições) e peso com perdas
    const rt = dm.resumoTelas!;
    expect(rt).toHaveLength(1);
    const todos = dm.detalhesLajes!.flatMap((x) => (x.paineis ?? []).map((p) => p.n));
    expect(rt[0].paineis).toBe(todos.length * (d.repeticoes));
    expect(rt[0].peso).toBeCloseTo(dm.detalhesLajes!.reduce((a, x) => a + (x.paineis ?? []).reduce((b2, p) => b2 + p.peso, 0) * x.repeticoes, 0), 1);
    expect(rt[0].pesoComPerdas).toBeCloseTo(rt[0].peso * 1.1, 6);
    expect(resumoTelasLajes(dm.detalhesLajes!, 10)).toEqual(rt);
  }, 60000);

  it('tela não detalhada: só a indicação, sem painéis e fora do quantitativo', () => {
    const t = lajes([4, 4]);
    const L1 = t.s.modelo.lajes[0];
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { tela: 'Q196' } });
    const dm = t.dim(), d = dm.detalhesLajes!.find((x) => x.laje === L1.id)!;
    expect(d.paineis).toBeUndefined();
    expect(d.base).toMatchObject({ detalhada: false, inf: { nota: 'Tela Q196' } });
    expect(dm.resumoTelas).toBeUndefined();
  }, 60000);

  it('traspasse editável e tela girada em laje com furo (painéis recortados pelo furo)', () => {
    const t = lajes([5], true);
    const L1 = t.s.modelo.lajes[0];
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { tela: 'Q92', giro: true }, detalhada: true });
    const a = t.dim().detalhesLajes![0];
    t.ok('opcoes.definir', { valores: { lajeTelaTraspasse: 40 } });
    const b2 = t.dim().detalhesLajes![0];
    expect(b2.paineis!.reduce((s, p) => s + p.largura * p.comprimento, 0)).toBeGreaterThanOrEqual(a.paineis!.reduce((s, p) => s + p.largura * p.comprimento, 0) - 1e-6);
    expect(a.paineis![0].angulo).toBeCloseTo(a.angulo + 90, 3);
  }, 60000);
});

describe('R7d: armadura predefinida', () => {
  it('predefinida inferior reduz o reforço só na faixa; é medida como lançada', () => {
    const t = lajes([4, 4]);
    const L1 = t.s.modelo.lajes[0];
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { barras: [{ dir: 0, phi: 6.3, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] } });
    const ant = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const r0 = ant.posicoes.filter((p) => p.tipo === 'reforco' && p.dir === 0);
    const n0 = r0.reduce((a, p) => a + p.n, 0);
    // pano 0..4 × 0..5; direção 0 = ao longo de y (ângulo 90°): predefinida φ12,5 c/ 10, 10 barras na faixa x ∈ [1, 2]
    expect(ant.angulo).toBe(90);
    t.ok('laje.armaduraPredefinida', { id: L1.id, acao: 'criar', face: 'inf', a: [1.05, 0.2], angulo: 90, comprimento: 4.6, phi: 12.5, s: 0.1, n: 10 });
    const d = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const n1 = d.posicoes.filter((p) => p.tipo === 'reforco' && p.dir === 0).reduce((a, p) => a + p.n, 0);
    expect(n1).toBeLessThan(n0);
    // o desconto é local: a faixa tem 1 m de 4 m, o resto fica igual
    expect(n0 - n1).toBeLessThanOrEqual(Math.ceil(1.0 / r0[0].s) + 1);
    expect(n0 - n1).toBeGreaterThan(0);
    const pd = d.posicoes.find((p) => p.tipo === 'predefinida')!;
    expect(pd).toMatchObject({ face: 'inf', phi: 12.5, n: 10, s: 0.1 });
    expect(pd.comprimento).toBeCloseTo(4.6, 6);
    expect(d.peso).toBeGreaterThan(ant.peso - 1e-9 - 100);
    // remover volta ao anterior
    const id = t.s.modelo.lajes[0].predefinidas![0].id;
    t.ok('laje.armaduraPredefinida', { id: L1.id, acao: 'remover', predefinida: id });
    const dep = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    expect(dep.posicoes.filter((p) => p.tipo === 'reforco' && p.dir === 0).reduce((a, p) => a + p.n, 0)).toBe(n0);
    expect(t.s.modelo.lajes[0].predefinidas).toBeUndefined();
  }, 60000);

  it('predefinida superior sobre a borda contínua desconta o negativo; fora do pano e acima da barra máxima avisam', () => {
    const t = lajes([4, 4]);
    const L1 = t.s.modelo.lajes[0];
    const ant = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const neg0 = ant.posicoes.find((p) => p.tipo === 'negativa')!;
    // borda contínua em x = 4; predefinida φ8 c/ 5 (10,05 cm²/m ≫ necessário) cruzando x = 4 em y ∈ [1, 3]
    t.ok('laje.armaduraPredefinida', { id: L1.id, acao: 'criar', face: 'sup', a: [2.5, 1.0], angulo: 0, comprimento: 3, phi: 8, s: 0.05, n: 40 });
    const d = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const neg1 = d.posicoes.find((p) => p.tipo === 'negativa');
    expect(neg1 ? neg1.n : 0).toBeLessThan(neg0.n);
    expect(d.posicoes.find((p) => p.tipo === 'predefinida')!.face).toBe('sup');
    t.ok('laje.armaduraPredefinida', { id: L1.id, acao: 'criar', face: 'inf', a: [10, 10], angulo: 0, comprimento: 14, phi: 8, s: 0.2, n: 2 });
    const av = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!.avisos.join(' | ');
    expect(av).toMatch(/sai do pano/);
    expect(av).toMatch(/barra máxima/);
    const rev = revisarEdificio(t.s.modelo, analisarEdificio(t.s.modelo), t.dim());
    expect(rev.itens.some((x) => x.codigo === 'LAJE_PREDEF_FORA')).toBe(true);
    expect(rev.itens.some((x) => x.codigo === 'LAJE_PREDEF_COMPRIMENTO')).toBe(true);
  }, 60000);
});

describe('R7d: base inferior com emenda na zona de máximo negativo', () => {
  it('vão de 13 m: duas peças com o centro da emenda junto à borda contínua; desligada, peças iguais', () => {
    const t = lajes([13, 4]);
    const L1 = t.s.modelo.lajes[0];
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { barras: [{ dir: 0, phi: 10, s: 15 }, { dir: 1, phi: 10, s: 15 }] }, detalhada: true });
    const comp = (d: DetalheLaje) => d.posicoes.filter((p) => p.tipo === 'base').map((p) => [p.dir, p.comprimento]);
    const lig = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    t.ok('opcoes.definir', { valores: { lajeBaseEmendaApoio: 0 } });
    const des = t.dim().detalhesLajes!.find((x) => x.laje === L1.id)!;
    const xs = lig.posicoes.filter((p) => p.tipo === 'base' && p.angulo % 180 === 0);
    // o pano mede 20 m ao longo de x: barras de 12 m no máximo, emendadas
    expect(xs.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...xs.map((p) => p.comprimento))).toBeLessThanOrEqual(12 + 1e-9);
    expect(JSON.stringify(comp(lig))).not.toEqual(JSON.stringify(comp(des)));
    expect(lig.emendas.length).toBe(des.emendas.length);
  }, 60000);
});

describe('R7d: pranchas das lajes', () => {
  it('tela detalhada: painéis com designação e tabelas de telas; base não detalhada só nota; predefinida na tabela de aço', async () => {
    const { montarPranchasLajes } = await import('../sheets/armacaoLajes');
    const t = lajes([4, 4]);
    const [L1, L2] = t.s.modelo.lajes;
    t.ok('laje.armaduraBase', { ids: [L1.id], inf: { tela: 'Q138' }, detalhada: true });
    t.ok('laje.armaduraBase', { ids: [L2.id], inf: { barras: [{ dir: 0, phi: 6.3, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] } });
    t.ok('laje.armaduraPredefinida', { id: L1.id, acao: 'criar', face: 'sup', a: [1, 1], angulo: 90, comprimento: 2, phi: 8, s: 0.15, n: 4 });
    const dm = t.dim();
    const fs = montarPranchasLajes(t.s.modelo, null, dm);
    const pos = fs.find((f) => f.titulo.includes('positivas'))!, neg = fs.find((f) => f.titulo.includes('negativas'))!;
    const txt = (f: typeof pos) => [...f.modelo, ...f.papel].filter((q) => q.t === 'txt').map((q) => (q as { s: string }).s).join('\n');
    expect(txt(pos)).toMatch(/T1 – Q138 – \d,\d\d × \d,\d\d/);
    expect(txt(pos)).toMatch(/RESUMO DAS TELAS/);
    expect(txt(pos)).toMatch(/RELAÇÃO DAS TELAS/);
    expect(txt(pos)).toMatch(/L2: base inferior φ6,3 c\/ 20 \/ φ6,3 c\/ 20 \(indicada, fora do quantitativo\)/);
    expect(txt(neg)).not.toMatch(/T1 – Q138/);
    expect(neg.aco!.tabela.some((l) => l.phi === 8)).toBe(true);
  }, 60000);
});
