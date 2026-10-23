// Catálogo e fichas de vigotas (E3a): regressão das treliçadas, tipo genérico por geometria contra cálculo manual,
// enchimentos, bwExtra, validação lógica, comandos, exportar/importar e rigidez das fichas.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { barArea, concrete } from '../concrete';
import { edificioVazio } from './types';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { propriedadesLaje, TRELICADAS } from './lajes';
import { TRELICA_DO_MODELO, TRELICAS } from './vigotas';
import { tabelaNorma } from '../normas';
import {
  bransonEI, conjuntoVigotas, escolherPorMomento, exportarTiposLaje, fichaPor, fichaPorGeometria, fichasNoMemorial, FICHAS_EXEMPLO, geometriaNervurada,
  importarTiposLaje, momentoResistenteT, pesoEnchimentoM2, propriedadesFlexao, relacaoFissurada, rigidezNervura, rotuloLaje, validarFicha, type FichaVigota, type SerieFicha,
} from './tiposLaje';

const c30 = concrete(30, 1.4);

/** Pavimento com uma laje 5 × 4 m entre vigas, vigotas em x, com o tipo dado. */
function pavimento(tipo: Record<string, unknown>, antes?: (ok: (n: string, p: Record<string, unknown>) => void) => void) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  antes?.(ok);
  ok('lote', { comandos: [[0, 0], [5, 0], [0, 4], [5, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [[[0, 0], [5, 0]], [[0, 4], [5, 4]], [[0, 0], [0, 4]], [[5, 0], [5, 4]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo });
  const an = analisarEdificio(s.modelo);
  return { s, ok, an, d: dimensionarEdificio(s.modelo, an) };
}

describe('catálogo das treliçadas na biblioteca de normas (regressão)', () => {
  it('constantes de fábrica idênticas às originais', () => {
    expect(TRELICADAS).toEqual({
      H8: { hEnch: 0.08, intereixo: 0.42, bw: 0.09, capa: 0.04 }, H12: { hEnch: 0.12, intereixo: 0.42, bw: 0.09, capa: 0.04 }, H16: { hEnch: 0.16, intereixo: 0.42, bw: 0.09, capa: 0.04 },
      H20: { hEnch: 0.2, intereixo: 0.5, bw: 0.1, capa: 0.05 }, H25: { hEnch: 0.25, intereixo: 0.5, bw: 0.1, capa: 0.05 },
    });
    expect(TRELICAS['TR 12645']).toEqual({ h: 0.12, sup: 6, diag: 4.2, inf: 5 });
    expect(TRELICA_DO_MODELO).toEqual({ H8: 'TR 8644', H12: 'TR 12645', H16: 'TR 16745', H20: 'TR 20745', H25: 'TR 25856' });
  });

  it('peso e altura das treliçadas pela fórmula original, bit a bit', () => {
    for (const [m, c] of Object.entries(TRELICADAS)) {
      const nerv = (c.bw * c.hEnch) / c.intereixo, eps = ((c.intereixo - c.bw) * c.hEnch) / c.intereixo;
      const r = propriedadesLaje({ tipo: 'trelicada', modelo: m, capa: c.capa });
      expect(r.pp).toBe(25 * (c.capa + nerv) + 0.2 * eps);
      expect(r.h).toBe(c.hEnch + c.capa);
    }
  });

  it('a ficha implícita do catálogo reproduz peso e inércia da treliçada', () => {
    for (const m of ['H8', 'H12', 'H16', 'H20', 'H25']) {
      const cat = TRELICADAS[m], a = geometriaNervurada(undefined, { tipo: 'trelicada', modelo: m, capa: cat.capa }), v = geometriaNervurada(undefined, { tipo: 'vigotas', ficha: 'cat:trelicadas', serie: m });
      expect(v.pp).toBeCloseTo(a.pp, 12);
      expect(v.h).toBeCloseTo(a.h, 12);
      expect(propriedadesFlexao(v, c30).Ic).toBeCloseTo(propriedadesFlexao(a, c30).Ic, 15);
    }
  });

  it('a laje por ficha implícita dá resultados idênticos aos da treliçada (análise e vigotas)', () => {
    const a = pavimento({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 });
    const b = pavimento({ tipo: 'vigotas', ficha: 'cat:trelicadas', serie: 'H12' });
    expect(JSON.stringify(b.d.vigotas)).toBe(JSON.stringify(a.d.vigotas));
    expect(JSON.stringify(b.an.grelhas.map((g) => g.res))).toBe(JSON.stringify(a.an.grelhas.map((g) => g.res)));
    expect(b.d.lajes[0].flecha).toEqual(a.d.lajes[0].flecha);
  });

  it('a tabela de modelos editada na biblioteca de normas altera o peso próprio', () => {
    const s = new Sessao(edificioVazio());
    const linhas = tabelaNorma(s.modelo, 'lajes.trelicadas').map((l) => (l.modelo === 'H12' ? { ...l, bw: 0.12 } : l));
    expect(s.executar('norma.tabela.definir', { id: 'lajes.trelicadas', linhas }).ok).toBe(true);
    const t = { tipo: 'trelicada' as const, modelo: 'H12', capa: 0.04 };
    expect(propriedadesLaje(t, s.modelo).pp).toBeGreaterThan(propriedadesLaje(t).pp);
    const eps = ((0.42 - 0.12) * 0.12) / 0.42;
    expect(propriedadesLaje(t, s.modelo).pp).toBeCloseTo(25 * (0.04 + (0.12 * 0.12) / 0.42) + 0.2 * eps, 12);
  });
});

describe('enchimentos', () => {
  const base = { hEnch: 0.16, intereixo: 0.5, bw: 0.1 };
  it('concreto, EPS, cerâmica e genérico', () => {
    const vol = ((0.5 - 0.1) * 0.16) / 0.5;
    expect(pesoEnchimentoM2({ id: 'a', nome: 'a', material: 'concreto', gama: 25 }, base.hEnch, base.intereixo, base.bw)).toBeCloseTo(25 * vol, 12);
    expect(pesoEnchimentoM2({ id: 'a', nome: 'a', material: 'eps', gama: 0.2 }, base.hEnch, base.intereixo, base.bw)).toBeCloseTo(0.2 * vol, 12);
    // cerâmica: peça de 0,07 kN a cada 0,20 m de vigota, um intereixo de largura → 0,07/(0,2·0,5) = 0,7 kN/m²
    expect(pesoEnchimentoM2({ id: 'a', nome: 'a', material: 'ceramica', pesoPeca: 0.07, comprimentoPeca: 0.2 }, base.hEnch, base.intereixo, base.bw)).toBeCloseTo(0.7, 12);
    expect(pesoEnchimentoM2({ id: 'a', nome: 'a', material: 'generico', pesoM2: 0.45 }, base.hEnch, base.intereixo, base.bw)).toBe(0.45);
  });

  it('peso total da laje moldada com enchimento genérico = capa + nervuras + enchimento', () => {
    const s = new Sessao(edificioVazio());
    expect(s.executar('tipoLaje.enchimento', { acao: 'criar', id: 'gen', enchimento: { nome: 'Genérico', material: 'generico', pesoM2: 0.5 } }).ok).toBe(true);
    const g = geometriaNervurada(s.modelo, { tipo: 'moldada', capa: 0.05, intereixo: 0.6, bw: 0.12, h: 0.25, enchimento: 'gen' });
    expect(g.pp).toBeCloseTo(25 * (0.05 + (0.12 * 0.2) / 0.6) + 0.5, 12);
    expect(g.hEnch).toBeCloseTo(0.2, 12);
  });
});

describe('tipo genérico por geometria (seção T)', () => {
  const g = { id: 'g1', nome: 'Genérica', familia: 'armada' as const, capa: 0.04, hEnch: 0.12, intereixo: 0.5, bwMin: 0.1, enchimento: 'eps', trelica: 'TR 12645' };
  it('Mfis, EI e Mu pelo cálculo manual da seção T', () => {
    const f = fichaPorGeometria(undefined, c30, g);
    const p = f.series[0].positivo!;
    // seção T: mesa 50 × 4, alma 10 × 12, h = 16 cm
    const A1 = 0.5 * 0.04, A2 = 0.1 * 0.12, yc = (A1 * 0.14 + A2 * 0.06) / (A1 + A2);
    const I = (0.5 * 0.04 ** 3) / 12 + A1 * (0.14 - yc) ** 2 + (0.1 * 0.12 ** 3) / 12 + A2 * (0.06 - yc) ** 2;
    expect(p.EI).toBeCloseTo(c30.Ecs * 1000 * I, 6);
    expect(p.Mfis).toBeCloseTo((1.2 * c30.fctm * I * 1000) / yc, 9);
    // Mu: 2φ5 CA-60 (fyd = 600/1,15), d = 16 − 2,5 − 0,25 = 13,25 cm, linha neutra na mesa
    const As = 2 * barArea(5), fyd = 600 / 1.15, d = 0.1325, y = (As * fyd) / (c30.sigmaCd * 0.5);
    expect(y).toBeLessThan(0.04);
    expect(p.Mu).toBeCloseTo(As * fyd * (d - y / 2) * 1000, 6);
    expect(p.EIfis!).toBeLessThan(p.EI!);
    expect(p.EIfis!).toBeGreaterThan(0);
    expect(f.origem).toBe('geometria');
    expect(validarFicha(f).erros).toEqual([]);
  });

  it('protendida: Mu informado e relação fissurada/total', () => {
    const f = fichaPorGeometria(undefined, c30, { ...g, id: 'p1', familia: 'protendida', trelica: undefined, Mu: 12, relacaoFis: 0.6 });
    expect(f.series[0].positivo!.Mu).toBe(12);
    expect(f.series[0].positivo!.EIfis! / f.series[0].positivo!.EI!).toBeCloseTo(0.6, 12);
    expect(relacaoFissurada(geometriaNervurada({ tiposLaje: { fichas: [f] } }, { tipo: 'vigotas', ficha: 'p1', serie: 'p1' }))).toBeCloseTo(0.6, 12);
  });

  it('Mu da seção T com linha neutra na alma', () => {
    // As grande: força T = Rcf + Rcw
    const As = 1e-3, fyd = 500 / 1.15, bf = 0.5, hf = 0.04, bw = 0.1, d = 0.35;
    const Rcf = c30.sigmaCd * (bf - bw) * hf, Rcw = As * fyd - Rcf, yw = Rcw / (c30.sigmaCd * bw);
    expect(As * fyd / (c30.sigmaCd * bf)).toBeGreaterThan(hf);
    expect(yw).toBeLessThan(c30.lambda * c30.xLimRatio * d);
    expect(momentoResistenteT(c30, bf, hf, bw, d, As, fyd)).toBeCloseTo((Rcf * (d - hf / 2) + c30.sigmaCd * bw * yw * (d - yw / 2)) * 1000, 9);
  });
});

describe('acréscimo de largura da nervura (bwExtra)', () => {
  it('altera a inércia e o Mfis (flecha) e não a resistência nem o peso', () => {
    const mk = (bwExtra: number) => fichaPorGeometria(undefined, c30, { id: 'x', nome: 'x', familia: 'armada', capa: 0.04, hEnch: 0.12, intereixo: 0.5, bwMin: 0.1, enchimento: 'eps', trelica: 'TR 12645', bwExtra });
    const f0 = mk(0), f1 = mk(0.03);
    const g0 = geometriaNervurada({ tiposLaje: { fichas: [f0] } }, { tipo: 'vigotas', ficha: 'x', serie: 'x' }), g1 = geometriaNervurada({ tiposLaje: { fichas: [f1] } }, { tipo: 'vigotas', ficha: 'x', serie: 'x' });
    expect(g1.pp).toBe(g0.pp);
    expect(g1.bw).toBe(g0.bw);
    expect(g1.bwRigidez).toBeCloseTo(0.13, 12);
    expect(propriedadesFlexao(g1, c30).Ic).toBeGreaterThan(propriedadesFlexao(g0, c30).Ic);
    expect(propriedadesFlexao(g1, c30).Mfis).toBeGreaterThan(propriedadesFlexao(g0, c30).Mfis);
    expect(propriedadesFlexao(g1, c30).Ic0).toBeCloseTo(propriedadesFlexao(g0, c30).Ic0, 15);
    // a resistência da série (Mu) é a mesma
    expect(f1.series[0].positivo!.Mu).toBeCloseTo(f0.series[0].positivo!.Mu, 12);
    // Branson entre total e fissurada
    expect(bransonEI(100, 40, 5, 4)).toBe(100);
    expect(bransonEI(100, 40, 5, 10)).toBeCloseTo(40 + 60 * 0.125, 12);
  });

  it('bwExtra de uma ficha não muda o peso nem o EI da ficha na grelha (só a torção calculada e a fissuração)', () => {
    const run = (extra: number) => pavimento({ tipo: 'vigotas', ficha: 'f_x', serie: 'S' }, (ok) => {
      ok('tipoLaje.ficha', { acao: 'criar', id: 'f_x', ficha: { nome: 'F', familia: 'armada', bwExtra: extra, series: [{ id: 'S', altura: 0.16, intereixo: 0.5, capa: 0.04, hEnch: 0.12, bwMin: 0.1, enchimento: 'eps', trelica: 'TR 12645', positivo: { Mu: 6, Mfis: 2.2, EI: 190 }, negativo: { Mu: 3, MuMacico: 9 }, cortante: { VRd1: 6 } }] } });
    });
    const a = run(0), b = run(0.05);
    expect(a.an.erro).toBeUndefined();
    expect(b.an.erro).toBeUndefined();
    expect(b.s.modelo.lajes[0].tipo).toEqual(a.s.modelo.lajes[0].tipo);
    expect(propriedadesLaje(b.s.modelo.lajes[0].tipo, b.s.modelo).pp).toBe(propriedadesLaje(a.s.modelo.lajes[0].tipo, a.s.modelo).pp);
  });
});

describe('validação lógica das fichas', () => {
  const serie = (o: Partial<SerieFicha> = {}): SerieFicha => ({ id: 'S1', altura: 0.16, intereixo: 0.5, capa: 0.04, hEnch: 0.12, bwMin: 0.1, enchimento: 'eps', trelica: 'TR 12645', positivo: { Mu: 6, Mfis: 2, EI: 190, EIfis: 80 }, negativo: { Mu: 3, MuMacico: 9 }, cortante: { VRd1: 6 }, ...o });
  const ficha = (series: SerieFicha[], o: Partial<FichaVigota> = {}): FichaVigota => ({ id: 'f', nome: 'F', origem: 'usuario', familia: 'armada', series, ...o });

  it('aceita as fichas de exemplo e uma ficha coerente', () => {
    for (const f of FICHAS_EXEMPLO) expect(validarFicha(f).erros, f.id).toEqual([]);
    expect(validarFicha(ficha([serie()])).erros).toEqual([]);
  });

  it('recusa ficha incoerente', () => {
    const erros = (f: FichaVigota) => validarFicha(f).erros.join(' | ');
    expect(erros(ficha([serie({ positivo: { Mu: 2, Mfis: 3 } })]))).toContain('maior que Mfis');
    expect(erros(ficha([serie({ altura: 0.1 })]))).toContain('altura total menor');
    expect(erros(ficha([serie(), serie()]))).toContain('repetido');
    expect(erros(ficha([serie({ id: 'S2' }), serie({ id: 'S3' })]))).toContain('altura e intereixo repetidos');
    expect(erros(ficha([serie({ capa: -1 })]))).toContain('devem ser positivos');
    expect(erros(ficha([serie({ positivo: { Mu: 6, Mfis: 2, EI: 100, EIfis: 150 } })]))).toContain('EI fissurado maior');
    expect(erros(ficha([serie({ negativo: { Mu: 3, MuMacico: 2 } })]))).toContain('maciça menor');
    expect(erros(ficha([serie({ enchimento: 'nao-existe' })]))).toContain('não existe na biblioteca');
    expect(erros(ficha([serie({ positivo: undefined })]))).toContain('falta o momento positivo');
    expect(erros(ficha([], {}))).toContain('ao menos uma');
    expect(erros(ficha([serie()], { multipla: { n: 4 as 2, larguraVigota: 0.1 } }))).toContain('no máximo a tripla');
    expect(erros(ficha([serie()], { familia: 'protendida' }))).toContain('protendida sem momentos');
  });

  it('protendida: níveis de serviço ordenados e abaixo de Mu', () => {
    const pr = (o: object) => ficha([serie({ positivo: { Mu: 10, Mfis: 4, EI: 190 }, protensao: { Mdesc: 3, Mcompleta: 4, Mlimitada: 6, Mparcial: 8, ...o } })], { familia: 'protendida' });
    expect(validarFicha(pr({})).erros).toEqual([]);
    expect(validarFicha(pr({ Mlimitada: 3 })).erros.join(' ')).toContain('crescer da protensão completa');
    expect(validarFicha(pr({ Mparcial: 11 })).erros.join(' ')).toContain('maior que Mu');
  });

  it('campos recomendados ausentes viram avisos, não erros', () => {
    const v = validarFicha(ficha([serie({ negativo: undefined, cortante: undefined })]));
    expect(v.erros).toEqual([]);
    expect(v.avisos.join(' ')).toContain('momento negativo');
    expect(v.avisos.join(' ')).toContain('VRd1');
  });
});

describe('comandos: fichas, atribuição, exportar e importar', () => {
  it('copiar o exemplo, editar, atribuir e proteger a ficha em uso', () => {
    const { s, ok } = pavimento({ tipo: 'macica', h: 0.1 });
    ok('tipoLaje.ficha', { acao: 'copiar', de: 'ex:armada', nome: 'Minha' });
    const mine = s.modelo.tiposLaje!.fichas![0];
    expect(mine).toMatchObject({ nome: 'Minha', origem: 'usuario', familia: 'armada' });
    expect(s.modelo.tiposLaje!.enchimentos).toBeUndefined(); // eps é do catálogo
    // fabricante é somente leitura (a ficha de exemplo não está na obra; uma importada como fabricante também)
    ok('tipoLaje.ficha', { acao: 'editar', id: mine.id, ficha: { ...mine, nome: 'Minha 2' } });
    expect(s.modelo.tiposLaje!.fichas![0].nome).toBe('Minha 2');
    ok('laje.atribuir', { ids: s.modelo.lajes.map((l) => l.id), tipo: { tipo: 'vigotas', ficha: mine.id, serie: 'A12' } });
    expect(s.modelo.lajes[0].tipo).toEqual({ tipo: 'vigotas', ficha: mine.id, serie: 'A12' });
    expect(s.modelo.lajes[0].direcao).toBeDefined();
    const r = s.executar('tipoLaje.ficha', { acao: 'remover', id: mine.id });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('FICHA_EM_USO');
    ok('laje.atribuir', { ids: s.modelo.lajes.map((l) => l.id), tipo: { tipo: 'macica', h: 0.1 } });
    ok('tipoLaje.ficha', { acao: 'remover', id: mine.id });
    expect(s.modelo.tiposLaje).toBeUndefined();
  });

  it('atribuir ficha de exemplo copia a ficha e o enchimento para a obra; ficha incoerente é recusada', () => {
    const { s, ok } = pavimento({ tipo: 'macica', h: 0.1 });
    ok('laje.atribuir', { ids: s.modelo.lajes.map((l) => l.id), tipo: { tipo: 'vigotas', ficha: 'ex:protendida', serie: 'P16' } });
    expect(s.modelo.tiposLaje!.fichas!.map((f) => f.id)).toEqual(['ex:protendida']);
    expect(s.modelo.tiposLaje!.enchimentos!.map((e) => e.id)).toEqual(['ceramica-ex']);
    ok('tipoLaje.ficha', { acao: 'copiar', de: 'ex:armada' });
    const f = s.modelo.tiposLaje!.fichas!.find((x) => x.id !== 'ex:protendida')!;
    const ruim = { ...f, series: f.series.map((x) => ({ ...x, positivo: { ...x.positivo!, Mu: 0.1 } })) };
    ok('tipoLaje.ficha', { acao: 'editar', id: f.id, ficha: ruim });
    const r = s.executar('laje.atribuir', { ids: s.modelo.lajes.map((l) => l.id), tipo: { tipo: 'vigotas', ficha: f.id, serie: 'A12' } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('FICHA_INCOERENTE');
    expect(s.executar('laje.atribuir', { ids: s.modelo.lajes.map((l) => l.id), tipo: { tipo: 'vigotas', ficha: 'nada', serie: 'A' } }).erros[0].codigo).toBe('FICHA_INEXISTENTE');
  });

  it('fichas de fabricante da obra são somente leitura', () => {
    const s = new Sessao(edificioVazio());
    const fab: FichaVigota = { ...FICHAS_EXEMPLO[0], id: 'fab1', origem: 'fabricante' };
    expect(s.executar('tipoLaje.importar', { fichas: [fab] }).ok).toBe(true);
    const r = s.executar('tipoLaje.ficha', { acao: 'editar', id: 'fab1', ficha: { ...fab, nome: 'x' } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('FICHA_SOMENTE_LEITURA');
    expect(s.executar('tipoLaje.ficha', { acao: 'copiar', de: 'fab1' }).ok).toBe(true);
  });

  it('exportar e importar são idempotentes', () => {
    const a = new Sessao(edificioVazio());
    a.executar('tipoLaje.enchimento', { acao: 'criar', id: 'gen', enchimento: { nome: 'Genérico', material: 'generico', pesoM2: 0.5 } });
    a.executar('tipoLaje.ficha', { acao: 'copiar', de: 'ex:protendida', nome: 'P' });
    a.executar('tipoLaje.ficha', { acao: 'criar', geometria: { id: 'geo', nome: 'Geo', familia: 'armada', capa: 0.04, hEnch: 0.12, intereixo: 0.5, bwMin: 0.1, enchimento: 'gen', trelica: 'TR 12645' } });
    const t1 = exportarTiposLaje(a.modelo);
    const lido = importarTiposLaje(t1);
    expect(lido.ok).toBe(true);
    const b = new Sessao(edificioVazio());
    expect(b.executar('tipoLaje.importar', { texto: t1 }).ok).toBe(true);
    expect(exportarTiposLaje(b.modelo)).toBe(t1);
    expect(b.modelo.tiposLaje!.fichas!.map((f) => f.id).sort()).toEqual(a.modelo.tiposLaje!.fichas!.map((f) => f.id).sort());
    // importar de novo: ids repetidos são recusados, a menos que substitua
    expect(b.executar('tipoLaje.importar', { texto: t1 }).ok).toBe(false);
    expect(b.executar('tipoLaje.importar', { texto: t1, substituir: true }).ok).toBe(true);
    expect(exportarTiposLaje(b.modelo)).toBe(t1);
    expect(importarTiposLaje('{').ok).toBe(false);
    expect(importarTiposLaje(JSON.stringify({ formato: 'outro' })).ok).toBe(false);
    expect(importarTiposLaje(JSON.stringify({ formato: 'statikos-tipos-laje', versao: 1, fichas: [{ id: 1 }], enchimentos: [] })).ok).toBe(false);
  });

  it('enchimento em uso não é removido', () => {
    const s = new Sessao(edificioVazio());
    s.executar('tipoLaje.enchimento', { acao: 'criar', id: 'gen', enchimento: { nome: 'G', material: 'generico', pesoM2: 0.4 } });
    s.executar('tipoLaje.ficha', { acao: 'criar', id: 'f1', ficha: { nome: 'F', familia: 'moldada', series: [{ id: 'S', altura: 0.2, intereixo: 0.5, capa: 0.05, hEnch: 0.15, bwMin: 0.1, enchimento: 'gen', positivo: { Mu: 5, Mfis: 2 } }] } });
    expect(s.executar('tipoLaje.enchimento', { acao: 'remover', id: 'gen' }).erros[0].codigo).toBe('ENCHIMENTO_EM_USO');
    expect(s.executar('tipoLaje.enchimento', { acao: 'criar', id: 'eps', enchimento: { nome: 'x', material: 'generico', pesoM2: 1 } }).erros[0].codigo).toBe('ENCHIMENTO_EXISTENTE');
    expect(s.executar('tipoLaje.enchimento', { acao: 'criar', enchimento: { nome: 'x', material: 'ceramica' } }).erros[0].codigo).toBe('ENCHIMENTO_INVALIDO');
  });

  it('nervurada moldada: laje, direção e armadura de base atribuída', () => {
    const { s, ok } = pavimento({ tipo: 'macica', h: 0.1 }, (ok) => ok('tipoLaje.enchimento', { acao: 'criar', id: 'gen', enchimento: { nome: 'G', material: 'generico', pesoM2: 0.4 } }));
    ok('laje.editar', { id: s.modelo.lajes[0].id, tipo: { tipo: 'moldada', capa: 0.05, intereixo: 0.6, bw: 0.12, h: 0.25, enchimento: 'gen' }, armaduraMoldada: { inf: { n: 2, phi: 10 }, estribo: { phi: 5, s: 0.15 } } });
    const l = s.modelo.lajes[0];
    expect(l.tipo.tipo).toBe('moldada');
    expect(l.direcao).toBeDefined();
    expect(l.armaduraMoldada).toEqual({ inf: { n: 2, phi: 10 }, estribo: { phi: 5, s: 0.15 } });
    expect(propriedadesLaje(l.tipo, s.modelo).h).toBe(0.25);
    expect(rotuloLaje(s.modelo, l.tipo)).toBe('NM 5+20 i=60 (h=25)');
    ok('laje.editar', { id: l.id, limparArmaduraMoldada: true });
    expect(s.modelo.lajes[0].armaduraMoldada).toBeUndefined();
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    expect(dimensionarEdificio(s.modelo, an).lajes[0].mensagens.join(' ')).toContain('Vigotas moldadas: nervurada moldada');
  });
});

describe('rigidez das fichas, duplas e tipo por momento', () => {
  it('EI da ficha na grelha quando a opção está ligada; inércia calculada quando desligada', () => {
    const c = concrete(30, 1.4);
    const g = geometriaNervurada(undefined, { tipo: 'vigotas', ficha: 'ex:armada', serie: 'A12' });
    expect(rigidezNervura(g, c, true)).toEqual({ EI: 190, GJ: 60, fonte: 'ficha' });
    const calc = rigidezNervura(g, c, false);
    expect(calc.fonte).toBe('geometria');
    expect(calc.EI).toBeCloseTo(propriedadesFlexao(g, c).EI, 9);
    // na análise: a laje por ficha com EI muito menor que o da geometria dá flecha maior com a opção ligada
    const tipo = { tipo: 'vigotas', ficha: 'ex:armada', serie: 'A12' };
    const ligada = pavimento(tipo), desl = pavimento(tipo, (ok) => ok('opcoes.definir', { valores: { vigotaRigidezFicha: 0 } }));
    const z = (r: ReturnType<typeof pavimento>) => Math.max(...r.d.lajes.map((l) => l.flecha));
    expect(ligada.an.erro).toBeUndefined();
    expect(z(ligada)).toBeGreaterThan(0);
    expect(z(ligada)).not.toBe(z(desl));
  });

  it('vigotas duplas e triplas: largura, peso e inércia do conjunto (no máximo a tripla)', () => {
    const g = geometriaNervurada(undefined, { tipo: 'vigotas', ficha: 'ex:armada', serie: 'A12' });
    const um = conjuntoVigotas(undefined, g, 1), dois = conjuntoVigotas(undefined, g, 2), tres = conjuntoVigotas(undefined, g, 3), quatro = conjuntoVigotas(undefined, g, 4);
    expect(um.pesoLinear).toBeCloseTo(g.pp * g.intereixo, 12);
    expect(dois.bw).toBeCloseTo(0.1 + 0.12, 12);
    expect(tres.bw).toBeCloseTo(0.1 + 0.24, 12);
    expect(quatro.n).toBe(3);
    expect(dois.pesoLinear).toBeGreaterThan(um.pesoLinear);
    expect(tres.I).toBeGreaterThan(dois.I);
    // peso extra = (n − 1)·largura·hEnch·(25 − γ equivalente do EPS)
    const eps = (0.2 * ((0.5 - 0.1) * 0.12)) / 0.5, gamaEq = (eps * 0.5) / ((0.5 - 0.1) * 0.12);
    expect(dois.pesoLinear - um.pesoLinear).toBeCloseTo(0.12 * 0.12 * (25 - gamaEq), 10);
    // ficha sem vigota múltipla: sempre 1
    expect(conjuntoVigotas(undefined, geometriaNervurada(undefined, { tipo: 'vigotas', ficha: 'ex:protendida', serie: 'P16' }), 2).n).toBe(1);
  });

  it('tipo da vigota por momento último por metro de largura', () => {
    const f = fichaPor(undefined, 'ex:armada')!;
    // A12: 6/0,5 = 12 kN·m/m; A12b: 19 kN·m/m (altura 16)
    expect(escolherPorMomento(f, 10, 0.16, 0.5)!.id).toBe('A12');
    expect(escolherPorMomento(f, 12.5, 0.16, 0.5)!.id).toBe('A12b');
    expect(escolherPorMomento(f, 25, 0.16, 0.5)).toBeNull();
    expect(escolherPorMomento(f, 5, 0.24)!.id).toBe('A20');
  });
});

describe('memorial: fichas usadas', () => {
  it('tabela com a marca de procedência e o peso calculado', () => {
    const { s } = pavimento({ tipo: 'vigotas', ficha: 'ex:armada', serie: 'A12' });
    const t = fichasNoMemorial(s.modelo);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ id: 'ex:armada', marca: 'ficha fictícia (demonstração)', erros: [] });
    expect(t[0].series.find((x) => x.id === 'A12')).toMatchObject({ usada: true, Mu: 6 });
    expect(t[0].series.find((x) => x.id === 'A20')!.usada).toBe(false);
    expect(fichasNoMemorial(pavimento({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 }).s.modelo)).toEqual([]);
    const g = FICHAS_EXEMPLO[0].series[0] as SerieFicha;
    expect(t[0].series[0].pp).toBeCloseTo(geometriaNervurada(s.modelo, { tipo: 'vigotas', ficha: 'ex:armada', serie: g.id }).pp, 12);
  });
});
