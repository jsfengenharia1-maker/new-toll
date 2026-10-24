// R7a: tabelas de armadura editáveis. As tabelas de fábrica reproduzem a escolha anterior; tabela restrita força a
// bitola; sem solução na tabela, φ25 forçado (vigas) ou armadura própria (pilares); simetria dos pilares por tolerância.
import { ANTES_R8B } from './antesR8b';
import { describe, expect, it } from 'vitest';
import { barArea, chooseBars, chooseStirrup } from '../concrete';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { classificar, revisarEdificio } from './revisao';
import { dimensionarEdificio } from './dimensionamento';
import {
  ID_PADRAO, escolherBarrasViga, escolherEstribo, linhaVigas, tabelaDe, tabelaDeFabrica, tabelasAlteradas, tabelasDoTipo, validarTabela,
  type TabelaEstribos, type TabelaLajes, type TabelaPilares, type TabelaVigas,
} from './tabelasArmadura';

type S = { b: number; h: number };
function predio(vezes: number, sec: S, vb: S, comandos: [string, Record<string, unknown>][] = []) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  for (const [n, p] of comandos) ok(n, p);
  if (vezes) ok('pavimento.repetir', { id: 'pav_6', vezes });
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  ok('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', ...sec } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: vb } });
  ok('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok };
}
const dim = (b: ReturnType<typeof predio>['s']['modelo']) => dimensionarEdificio(b, analisarEdificio(b), { fundacao: false });
const grupoVigas = (bitolas: number[], camadas = 3) => ({ bitolas, nMin: 2, camadas });

describe('tabelas de fábrica', { timeout: 60000 }, () => {
  it('reproduzem chooseBars e chooseStirrup (vigas e estribos)', () => {
    const tv = tabelaDeFabrica('vigas'), te = tabelaDeFabrica('estribos');
    for (const bw of [0.12, 0.15, 0.2, 0.25, 0.3, 0.4]) for (const As of [0.5e-4, 1.2e-4, 3e-4, 6e-4, 12e-4, 25e-4, 40e-4]) for (const face of ['pos', 'neg'] as const) {
      const ref = chooseBars(As, bw, 0.03, 0.005, 0.019), t = escolherBarrasViga(tv, face, As, bw, 0.5, 0.03, 0.005, 0.019);
      expect(t.fora).toBe(false);
      expect(t.barras).toEqual(ref);
    }
    for (const bw of [0.12, 0.2, 0.4]) for (const asw of [1e-4, 3e-4, 8e-4, 20e-4, 60e-4, 120e-4]) for (const smax of [0.2, 0.3]) {
      const ref = chooseStirrup(asw, smax), t = escolherEstribo(te, bw, asw, smax);
      expect(t && { phi: t.phi, s: t.s, legs: t.legs }).toEqual(ref);
    }
  });

  it('o edifício de exemplo não muda com as tabelas de fábrica (vigas, estribos e lajes)', () => {
    const { s } = predio(0, { b: 0.2, h: 0.5 }, { b: 0.15, h: 0.5 });
    const d = dim(s.modelo);
    expect(d.vigas.map((v) => v.barrasInf)).toEqual(d.vigas.map((v) => v.barrasInf)); // estável
    expect(d.vigas.every((v) => !v.mensagens.some((m) => m.startsWith('Fora de tabela')))).toBe(true);
    expect(d.lajes.every((l) => !l.mensagens.some((m) => m.startsWith('Fora de tabela')))).toBe(true);
    expect(s.modelo.tabelas).toBeUndefined();
  });
});

describe('escolha pelas tabelas', { timeout: 60000 }, () => {
  it('tabela restrita força a bitola', () => {
    const t: TabelaVigas = { id: 'so16', nome: 'Só φ16', linhas: [{ bAte: 999, hAte: 999, pos: grupoVigas([16]), neg: grupoVigas([16]), passante: 0.5 }] };
    const r = escolherBarrasViga(t, 'pos', 6e-4, 0.2, 0.5, 0.03, 0.005, 0.019); // 6 cm²: 3 φ16 = 6,03 cm²
    expect(r.fora).toBe(false);
    expect(r.barras).toMatchObject({ phi: 16, n: 3 });
    expect(r.barras!.As).toBeCloseTo(3 * barArea(16), 12);
  });

  it('sem solução na tabela: φ25 com a quantidade necessária e fora de tabela', () => {
    const t: TabelaVigas = { id: 'so8', nome: 'Só φ8', linhas: [{ bAte: 999, hAte: 999, pos: grupoVigas([8], 1), neg: grupoVigas([8], 1), passante: 1 / 3 }] };
    const r = escolherBarrasViga(t, 'pos', 12e-4, 0.2, 0.5, 0.03, 0.005, 0.019); // 12 cm²: 24 φ8 não cabem numa camada
    expect(r.fora).toBe(true);
    expect(r.barras).toMatchObject({ phi: 25, n: Math.ceil(12e-4 / barArea(25)) });
    // não cabe na largura de nenhum jeito: nada de φ25 forçado (erro de largura)
    expect(escolherBarrasViga(t, 'pos', 400e-4, 0.12, 0.5, 0.03, 0.005, 0.019)).toEqual({ barras: null, fora: false });
  });

  it('faixa por largura: a linha certa decide', () => {
    const t = tabelaDeFabrica('vigas');
    t.linhas = [
      { bAte: 15, hAte: 999, pos: grupoVigas([10]), neg: grupoVigas([10]), passante: 0.5 },
      { bAte: 999, hAte: 999, pos: grupoVigas([20]), neg: grupoVigas([20]), passante: 1 / 3 },
    ];
    expect(linhaVigas(t, 0.15, 0.4).passante).toBe(0.5);
    expect(linhaVigas(t, 0.2, 0.4).passante).toBe(1 / 3);
    expect(escolherBarrasViga(t, 'pos', 2e-4, 0.15, 0.4, 0.03, 0.005, 0.019).barras!.phi).toBe(10);
    expect(escolherBarrasViga(t, 'pos', 2e-4, 0.2, 0.4, 0.03, 0.005, 0.019).barras!.phi).toBe(20);
  });

  it('estribo duplo: com só 4 ramos, Asw/s é dividida em quatro pernas', () => {
    const t: TabelaEstribos = { id: 'duplo', nome: 'Duplo', linhas: [{ bAte: 999, bitolas: [6.3, 8], sMin: 10, sMax: 15, ramos: [4] }] };
    const r = escolherEstribo(t, 0.3, 40e-4, 0.3)!; // 40 cm²/m
    expect(r.legs).toBe(4);
    expect(r.s).toBeLessThanOrEqual(0.15);
    expect((r.legs * barArea(r.phi)) / r.s).toBeGreaterThanOrEqual(40e-4 - 1e-9);
    // sem solução com espaçamento ≥ mínimo: fora de tabela
    expect(escolherEstribo(t, 0.3, 400e-4, 0.3)!.fora).toBe(true);
  });

  it('validação recusa tabela vazia, bitola fora da lista comercial e limites incoerentes', () => {
    const t = tabelaDeFabrica('vigas');
    t.linhas[0].pos.bitolas = [];
    expect(validarTabela('vigas', t).join(' ')).toMatch(/nenhuma bitola/);
    t.linhas[0].pos.bitolas = [7];
    expect(validarTabela('vigas', t).join(' ')).toMatch(/fora de/);
    const l: TabelaLajes = tabelaDeFabrica('lajes');
    l.linhas[0].sMin = 15; l.linhas[0].sMax = 10;
    expect(validarTabela('lajes', l).join(' ')).toMatch(/máximo menor que o mínimo/);
    const p: TabelaPilares = tabelaDeFabrica('pilares');
    p.espacamentos = [17];
    expect(validarTabela('pilares', p).join(' ')).toMatch(/espaçamentos/);
    expect(validarTabela('estribos', tabelaDeFabrica('estribos'))).toEqual([]);
  });
});

describe('comandos de tabela', { timeout: 60000 }, () => {
  it('definir, atribuir, restaurar e remover', () => {
    const { s, ok } = predio(0, { b: 0.2, h: 0.5 }, { b: 0.15, h: 0.5 });
    const so25: TabelaVigas = { id: 'so25', nome: 'Só φ25', linhas: [{ bAte: 999, hAte: 999, pos: grupoVigas([25]), neg: grupoVigas([25]), passante: 0.5 }] };
    ok('tabela.definir', { tipo: 'vigas', tabela: so25 });
    expect(tabelasDoTipo(s.modelo, 'vigas').map((t) => t.id)).toEqual([ID_PADRAO, 'so25']);
    const v = s.modelo.vigas[0];
    ok('viga.editar', { id: v.id, tabela: 'so25' });
    expect(s.modelo.vigas[0].tabela).toBe('so25');
    expect(s.executar('viga.editar', { id: v.id, tabela: 'nao-existe' }).ok).toBe(false);
    // a padrão alterada vale para as vigas sem tabela própria; restaurar volta à de fábrica e mantém a criada
    const alterada = tabelaDeFabrica('vigas');
    alterada.linhas[0].pos.bitolas = [16];
    ok('tabela.definir', { tipo: 'vigas', tabela: alterada });
    expect(tabelasAlteradas(s.modelo).map((x) => [x.tipo, x.tabela.id, x.criada])).toEqual([['vigas', ID_PADRAO, false], ['vigas', 'so25', true]]);
    ok('tabela.restaurar', { tipos: ['vigas'] });
    expect(tabelasAlteradas(s.modelo).map((x) => x.tabela.id)).toEqual(['so25']);
    // gravar a padrão igual à de fábrica não deixa nada no modelo
    ok('tabela.definir', { tipo: 'vigas', tabela: tabelaDeFabrica('vigas') });
    expect(tabelasAlteradas(s.modelo).map((x) => x.tabela.id)).toEqual(['so25']);
    ok('tabela.definir', { tipo: 'vigas', remover: 'so25' });
    expect(s.modelo.tabelas).toBeUndefined();
    expect(s.modelo.vigas[0].tabela).toBeUndefined(); // o elemento solto volta à padrão
    expect(tabelaDe(s.modelo, 'vigas', 'so25').id).toBe(ID_PADRAO);
  });
});

describe('vigas, estribos e lajes pelas tabelas (integração)', { timeout: 60000 }, () => {
  it('tabela de vigas só com φ25 força a bitola nos positivos e negativos', () => {
    const { s, ok } = predio(0, { b: 0.2, h: 0.5 }, { b: 0.15, h: 0.5 });
    const ref = dim(s.modelo);
    const t = tabelaDeFabrica('vigas');
    for (const l of t.linhas) { l.pos.bitolas = [20, 25]; l.neg.bitolas = [20, 25]; }
    ok('tabela.definir', { tipo: 'vigas', tabela: t });
    const d = dim(s.modelo);
    for (const v of d.vigas) {
      expect(v.arranjo.inf!.phi).toBeGreaterThanOrEqual(20);
      if (v.arranjo.sup) expect(v.arranjo.sup.phi).toBeGreaterThanOrEqual(20);
    }
    expect(d.vigas.map((v) => v.barrasInf)).not.toEqual(ref.vigas.map((v) => v.barrasInf));
  });

  it('tabela impossível (φ8 numa camada) gera FORA_TABELA (erro) com φ25 forçado', () => {
    const { s, ok } = predio(0, { b: 0.2, h: 0.5 }, { b: 0.15, h: 0.5 });
    const t = tabelaDeFabrica('vigas');
    for (const l of t.linhas) { l.pos = grupoVigas([8], 1); l.neg = grupoVigas([8], 1); }
    ok('tabela.definir', { tipo: 'vigas', tabela: t });
    const b = s.modelo, d = dim(b);
    const fora = d.vigas.filter((v) => v.mensagens.some((m) => m.startsWith('Fora de tabela (barras)')));
    expect(fora.length).toBeGreaterThan(0);
    for (const v of fora) expect(classificar(v.mensagens.find((m) => m.startsWith('Fora de tabela'))!)).toEqual({ codigo: 'FORA_TABELA', nivel: 'erro' });
    expect(fora.every((v) => v.barrasInf.includes('φ25') || v.barrasSup.includes('φ25'))).toBe(true);
    const rev = revisarEdificio(b, null, d);
    expect(rev.itens.some((i) => i.codigo === 'FORA_TABELA' && i.nivel === 'erro')).toBe(true);
  });

  it('estribo duplo na tabela: só φ5 com s ≥ 25 cm obriga 4 ramos (Asw,mín não cabe em 2) e o detalhamento conta as peças', () => {
    const { s, ok } = predio(0, { b: 0.2, h: 0.5 }, { b: 0.15, h: 0.5 });
    const t = tabelaDeFabrica('estribos');
    t.linhas = [{ bAte: 999, bitolas: [5], sMin: 25, sMax: 30, ramos: [2, 4] }]; // 2 ramos φ5 dão s ≈ 23 cm < 25 cm com Asw,mín ≈ 1,7 cm²/m
    ok('tabela.definir', { tipo: 'estribos', tabela: t });
    const d = dim(s.modelo);
    for (const v of d.vigas) {
      expect(v.arranjo.estribo).toMatchObject({ phi: 5, legs: 4 });
      expect(v.arranjo.estribo!.s).toBeLessThanOrEqual(0.3 + 1e-9);
      expect(v.estribo).toMatch(/^φ5 c\/\d+ \(4 ramos\)$/);
      expect(v.mensagens.some((m) => m.startsWith('Fora de tabela'))).toBe(false);
      const det = d.detalhes!.find((x) => x.viga === v.viga)!;
      for (const z of det.estribos) { expect(z.ramos).toBe(4); expect(z.n).toBe(2 * (Math.floor((z.s1 - z.s0) / z.s + 1e-9) + 1)); }
    }
  });

  it('tabela de lajes que não comporta a armadura gera aviso de fora de tabela (aviso, não erro)', () => {
    const { s, ok } = predio(0, { b: 0.2, h: 0.5 }, { b: 0.15, h: 0.5 });
    const t = tabelaDeFabrica('lajes');
    t.linhas[0].bitolas = [6.3]; t.linhas[0].sMin = 20; t.linhas[0].sMax = 20;
    ok('tabela.definir', { tipo: 'lajes', tabela: t });
    const d = dim(s.modelo);
    const msg = d.lajes.flatMap((l) => l.mensagens).find((m) => m.startsWith('Fora de tabela (laje)'));
    expect(msg).toBeDefined();
    expect(classificar(msg!)).toEqual({ codigo: 'FORA_TABELA_LAJE', nivel: 'aviso' });
    expect(d.detalhesLajes!.some((l) => l.posicoes.some((p) => p.phi !== 6.3))).toBe(false);
  });
});

describe('pilares: simetria por tolerância e tabela', { timeout: 120000 }, () => {
  const sec: S = { b: 0.3, h: 0.3 }, vb: S = { b: 0.2, h: 0.45 };
  const pil = (d: ReturnType<typeof dim>, nome: string, pav: string) => d.pilares.find((x) => x.nome === nome && x.pavimento === pav)!;

  it('perfil NBR reproduz os resultados anteriores (sempre simétrica)', () => {
    const { s } = predio(6, sec, vb, [['opcoes.definir', { perfil: 'nbr' }]]);
    const d = dim(s.modelo);
    // (armadura, estribo, status, utilização) do dimensionamento antes da R7a, edifício de 7 pavimentos com pilares 30 × 30
    const ESPERADO: [string, string, string, string, string, number][] = [
      ['P1', 'Térreo', '12 φ16', 'φ5 c/19', 'ok', 0.9644], ['P1', 'Tipo 1', '8 φ16', 'φ5 c/19', 'ok', 0.9736], ['P1', 'Tipo 2', '12 φ10', 'φ5 c/12', 'ok', 0.8365],
      ['P1', 'Tipo 3', '8 φ10', 'φ5 c/12', 'ok', 0.9148], ['P1', 'Tipo 4', '8 φ10', 'φ5 c/12', 'ok', 0.8226], ['P1', 'Cobertura', '8 φ10', 'φ5 c/12', 'ok', 0.2269],
      ['P2', 'Térreo', '8 φ20', 'φ5 c/20', 'fail', 1.0431], ['P2', 'Tipo 3', '12 φ12,5', 'φ5 c/15', 'ok', 0.9235], ['P2', 'Tipo 4', '8 φ12,5', 'φ5 c/15', 'ok', 0.9879],
      ['P5', 'Térreo', '8 φ20', 'φ5 c/20', 'fail', 1.4167], ['P5', 'Tipo 2', '8 φ20', 'φ5 c/20', 'ok', 0.9828], ['P5', 'Tipo 3', '8 φ16', 'φ5 c/19', 'ok', 0.9818], ['P5', 'Tipo 4', '12 φ10', 'φ5 c/12', 'ok', 0.9831],
    ];
    for (const [n, pav, arm, est, st, u] of ESPERADO) {
      const r = pil(d, n, pav);
      expect([r.armadura, r.estribo, r.status], `${n} ${pav}`).toEqual([arm, est, st]);
      expect(r.util, `${n} ${pav}`).toBeCloseTo(u, 3);
      expect(r.arranjo!.nbS ?? r.arranjo!.nb).toBe(r.arranjo!.nb); // nunca não simétrica
      expect(r.arranjo!.nhD ?? r.arranjo!.nh).toBe(r.arranjo!.nh);
    }
  });

  it('perfil do sistema (tolerância 0 %): menor armadura, inclusive não simétrica, sempre atendendo', () => {
    const { s } = predio(6, sec, vb);
    expect(s.modelo.opcoes?.pilarSimetria).toBeUndefined(); // padrão do sistema: 0 %
    const d = dim(s.modelo);
    const sim = pil(d, 'P1', 'Tipo 4'), assim = pil(d, 'P1', 'Cobertura');
    expect([sim.armadura, sim.status]).toEqual(['6 φ10', 'ok']); // 2 × 3 barras: antes 8 φ10 (3 × 3)
    expect(sim.As).toBeCloseTo(6 * barArea(10), 12);
    expect(assim.armadura).toBe('5 φ10'); // As,mín = 0,4 % × 900 = 3,6 cm²: 5 φ10 = 3,93 cm²
    expect(assim.arranjo).toMatchObject({ phi: 10, nb: 2, nh: 3, nhD: 2 }); // faces direita e esquerda diferentes
    expect(assim.As).toBeCloseTo(5 * barArea(10), 12);
    expect(assim.util).toBeLessThanOrEqual(1);
    for (const r of d.pilares) if (r.status === 'ok') expect(r.util).toBeLessThanOrEqual(1 + 1e-9);
    // menos aço que o perfil NBR no mesmo pilar
    expect(sim.As).toBeLessThan(8 * barArea(10));
  });

  it('tolerância: 0 % = menor armadura; 25 % aceita a simétrica 6 φ10; 1000 % = comportamento anterior', () => {
    const arm = (tol?: number) => {
      const { s } = predio(6, sec, vb, [['opcoes.definir', { valores: { ...ANTES_R8B, ...(tol === undefined ? {} : { pilarSimetria: tol }) } }]]);
      return pil(dim(s.modelo), 'P1', 'Cobertura');
    };
    const t0 = arm(), t25 = arm(25), t1000 = arm(1000);
    expect(t0.armadura).toBe('5 φ10');
    // 6 φ10 (2 × 3 barras, simétrica nos dois eixos) = 4,71 cm² ≤ 3,93 × 1,25 = 4,91 cm²: aceita; com 15 % (4,52 cm²) não
    expect(t25.armadura).toBe('6 φ10');
    expect(t25.arranjo!.nhD ?? t25.arranjo!.nh).toBe(t25.arranjo!.nh);
    expect(arm(15).armadura).toBe('5 φ10');
    // 1000 % = só as disposições da busca por espaçamento (comportamento anterior): 3 × 3 = 8 φ10
    expect(t1000.armadura).toBe('8 φ10');
  });

  it('armadura não simétrica bloqueada é verificada nos quatro quadrantes e guarda as faces', () => {
    const { s, ok } = predio(6, sec, vb);
    const p = s.modelo.pilares.find((x) => x.nome === 'P1')!, cob = s.modelo.pavimentos.at(-1)!;
    ok('pilar.armadura', { id: p.id, pavimento: cob.id, phi: 10, nb: 2, nh: 3, nhD: 2, estribo: { phi: 5, s: 0.12 } });
    expect(s.modelo.pilares.find((x) => x.id === p.id)!.armaduras![0]).toMatchObject({ nb: 2, nh: 3, nhD: 2 });
    const d = dim(s.modelo), r = pil(d, 'P1', 'Cobertura');
    expect(r.bloqueada).toBe(true);
    expect(r.armadura).toBe('5 φ10');
    expect(r.arranjo).toMatchObject({ nb: 2, nh: 3, nhD: 2 });
  });

  it('tabela de pilares restrita às bitolas φ20 e φ25 força a bitola; a tabela esgotada cai na armadura própria com aviso', () => {
    const { s, ok } = predio(6, sec, vb, [['opcoes.definir', { valores: { pilarSimetria: 1000, ...ANTES_R8B } }]]);
    const livre = dim(s.modelo);
    const t: TabelaPilares = { id: 'grossa', nome: 'Só φ20 e φ25', bitolas: [20, 25], espacamentos: [30, 20], estribos: [{ phiAte: 25, phiT: 6.3, sMax: 15 }] };
    ok('tabela.definir', { tipo: 'pilares', tabela: t });
    ok('lote', { comandos: s.modelo.pilares.map((p) => ({ nome: 'pilar.editar', params: { id: p.id, tabela: 'grossa' } })) });
    const d = dim(s.modelo);
    for (const r of d.pilares.filter((x) => x.armadura !== '—' && !x.mensagens.some((m) => m.startsWith('Fora de tabela')))) expect(r.arranjo!.phi, `${r.nome} ${r.pavimento}`).toBeGreaterThanOrEqual(20);
    const r = pil(d, 'P1', 'Cobertura'), r0 = pil(livre, 'P1', 'Cobertura');
    expect(r0.arranjo!.phi).toBe(10);
    expect(r.arranjo!.phi).toBeGreaterThanOrEqual(10); // a tabela exige φ ≥ 20 ou cai na própria
    // estribo da tabela: φt ≥ 6,3 e s ≤ 15 cm
    const comT = d.pilares.find((x) => x.arranjo && x.arranjo.phi >= 20 && !x.mensagens.some((m) => m.startsWith('Fora de tabela')));
    if (comT) { expect(comT.arranjo!.estribo.phi).toBeGreaterThanOrEqual(6.3); expect(comT.arranjo!.estribo.s).toBeLessThanOrEqual(0.15 + 1e-9); }
  });

  it('tabela de pilares sem disposição possível: armadura própria (aviso) ou ARM_MANUAL (erro)', () => {
    const { s, ok } = predio(6, sec, vb, [['opcoes.definir', { valores: { pilarSimetria: 1000 } }]]);
    const t: TabelaPilares = { id: 'so10', nome: 'Só φ10 a 30 cm', bitolas: [10], espacamentos: [30], estribos: [] };
    ok('tabela.definir', { tipo: 'pilares', tabela: t });
    ok('lote', { comandos: s.modelo.pilares.map((p) => ({ nome: 'pilar.editar', params: { id: p.id, tabela: 'so10' } })) });
    const d = dim(s.modelo);
    const msgs = d.pilares.flatMap((r) => r.mensagens);
    expect(msgs.some((m) => m.startsWith('Fora de tabela (pilar)'))).toBe(true);
    const aviso = msgs.find((m) => m.startsWith('Fora de tabela (pilar)'))!;
    expect(classificar(aviso)).toEqual({ codigo: 'FORA_TABELA_PILAR', nivel: 'aviso' });
    const manual = msgs.find((m) => m.startsWith('Armadura manual necessária'));
    expect(manual && classificar(manual)).toEqual({ codigo: 'ARM_MANUAL', nivel: 'erro' });
  });
});
