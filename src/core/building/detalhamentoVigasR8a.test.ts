// R8a: comprimentos de corte (até 3), grupos de negativos, bitolas dos grupos, ancoragem construtiva/pelo cálculo e
// bitolas de montagem e adicional pela tabela da viga. Valores esperados à mão; o perfil NBR reproduz o detalhamento anterior.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { agruparCortes } from './detalhamento';
import { dimensionarEdificio } from './dimensionamento';
import { bitolaDaLista, tabelaDeFabrica } from './tabelasArmadura';
import { revisarEdificio } from './revisao';

describe('R8a: agruparCortes (cálculo à mão)', () => {
  // 4 barras exigidas em trechos aninhados de 10, 8, 6 e 4 m: ext(j) = [j, 10 − j]
  const ext = (j: number): [number, number] => [j, 10 - j];
  it('1 grupo: todas no comprimento da mais longa (custo 4 × 10 = 40)', () => {
    expect(agruparCortes(4, 1, 0, ext)).toEqual([{ n: 4, s0: 0, s1: 10 }]);
  });
  it('2 grupos: 2 × 10 + 2 × 6 = 32 é o mínimo entre 34, 32 e 34', () => {
    expect(agruparCortes(4, 2, 0, ext)).toEqual([{ n: 2, s0: 0, s1: 10 }, { n: 2, s0: 2, s1: 8 }]);
  });
  it('3 grupos: custo mínimo 30 (empate: primeira partição, 1 + 1 + 2)', () => {
    expect(agruparCortes(4, 3, 0, ext)).toEqual([{ n: 1, s0: 0, s1: 10 }, { n: 1, s0: 1, s1: 9 }, { n: 2, s0: 2, s1: 8 }]);
  });
  it('mínimo por grupo: 50 % de 4 barras = 2 por grupo (3 grupos não cabem; 2 sim)', () => {
    expect(agruparCortes(4, 3, 50, ext)).toEqual([{ n: 2, s0: 0, s1: 10 }, { n: 2, s0: 2, s1: 8 }]);
  });
  it('100 % por grupo: um só grupo; trechos iguais fundem grupos', () => {
    expect(agruparCortes(4, 3, 100, ext)).toEqual([{ n: 4, s0: 0, s1: 10 }]);
    expect(agruparCortes(3, 3, 0, () => [0, 5])).toEqual([{ n: 3, s0: 0, s1: 5 }]);
  });
  it('uma barra só e k maior que n', () => {
    expect(agruparCortes(1, 3, 0, ext)).toEqual([{ n: 1, s0: 0, s1: 10 }]);
    expect(agruparCortes(2, 3, 0, ext)).toEqual([{ n: 1, s0: 0, s1: 10 }, { n: 1, s0: 1, s1: 9 }]);
  });
});

describe('R8a: bitolaDaLista', () => {
  it('na lista: mantém; fora: maior da lista que não a supera; nenhuma menor: a menor da lista', () => {
    expect(bitolaDaLista(undefined, 10)).toEqual({ phi: 10, fora: false });
    expect(bitolaDaLista([8, 10, 12.5], 10)).toEqual({ phi: 10, fora: false });
    expect(bitolaDaLista([8, 12.5], 10)).toEqual({ phi: 8, fora: true });
    expect(bitolaDaLista([12.5, 16], 10)).toEqual({ phi: 12.5, fora: true });
  });
});

function viga(vaos: number[], valores: Record<string, number> = {}, h = 0.4, bw = 0.2) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: bw, h } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  if (Object.keys(valores).length) ok('opcoes.definir', { valores });
  const calc = () => { const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)); return { d, det: d.detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)! }; };
  return { s, ok, calc };
}
const area = (b: { n: number; phi: number }) => b.n * Math.PI * (b.phi / 2) ** 2 / 100;

describe('R8a: comprimentos de corte e grupos nas vigas', () => {
  it('mesma armadura (nº de barras) que com 1 corte, comprimentos nunca maiores e o mais longo igual', () => {
    const um = viga([8, 8], { vigaCortesInf: 1, vigaGruposSup: 1 }).calc().det;
    const tres = viga([8, 8], { vigaCortesInf: 3, vigaGruposSup: 3, vigaGrupoMinPct: 0 }).calc().det;
    for (const tipo of ['reforço', 'negativo'] as const) {
      const a = um.barras.filter((x) => x.tipo === tipo), z = tres.barras.filter((x) => x.tipo === tipo);
      expect(z.reduce((t, x) => t + x.n, 0), tipo).toBe(a.reduce((t, x) => t + x.n, 0));
      expect(Math.max(...z.map((x) => x.s1 - x.s0)), tipo).toBeCloseTo(Math.max(...a.map((x) => x.s1 - x.s0)), 9);
    }
    expect(tres.peso).toBeLessThanOrEqual(um.peso + 1e-9);
    expect(tres.barras.filter((x) => x.tipo === 'negativo').length + tres.barras.filter((x) => x.tipo === 'reforço').length)
      .toBeGreaterThan(um.barras.filter((x) => x.tipo === 'negativo').length + um.barras.filter((x) => x.tipo === 'reforço').length);
  });
  it('mínimo por grupo de 100 %: um só comprimento por região (igual ao de 1 corte)', () => {
    const um = viga([8, 8], { vigaCortesInf: 1, vigaGruposSup: 1 }).calc().det;
    const cem = viga([8, 8], { vigaCortesInf: 3, vigaGruposSup: 3, vigaGrupoMinPct: 100 }).calc().det;
    expect(cem.barras.filter((x) => x.tipo === 'reforço').length).toBe(um.barras.filter((x) => x.tipo === 'reforço').length);
    expect(cem.barras.filter((x) => x.tipo === 'reforço').reduce((t, x) => t + x.n, 0)).toBe(um.barras.filter((x) => x.tipo === 'reforço').reduce((t, x) => t + x.n, 0));
  });
  it('bitola do reforço: vigaReforcoBitola troca a bitola e reduz o número de barras', () => {
    const base = viga([8, 8], { vigaCortesInf: 1, vigaReforcoBitola: 0 }).calc().det;
    const maior = viga([8, 8], { vigaCortesInf: 1, vigaReforcoBitola: 16 }).calc().det;
    const rb = base.barras.filter((x) => x.tipo === 'reforço'), rm = maior.barras.filter((x) => x.tipo === 'reforço');
    expect(rm.every((x) => x.phi === 16)).toBe(true);
    expect(rm.reduce((t, x) => t + area(x), 0)).toBeGreaterThan(0.8 * rb.reduce((t, x) => t + area(x), 0)); // 2φ16 = 4,02 cm² cobrem a necessária que 4φ12,5 (4,91) já superavam
    expect(rm.reduce((t, x) => t + x.n, 0)).toBeLessThanOrEqual(rb.reduce((t, x) => t + x.n, 0));
  });
});

describe('R8a: ancoragem construtiva e pelo cálculo', () => {
  it('folga de 3 cm da face externa; pelo cálculo nunca ultrapassa a construtiva', () => {
    const cons = viga([8, 8], { vigaAncoragemEixo: 0, vigaAncoragemFolga: 3 }).calc().det;
    const ponta = (d: typeof cons) => { const ps = d.barras.filter((x) => x.tipo === 'passante'); return { s0: Math.min(...ps.map((x) => x.s0)), s1: Math.max(...ps.map((x) => x.s1)), phi: ps[0].phi }; };
    const p = ponta(cons);
    expect(p.s0).toBeCloseTo(cons.apoios[0].s0 + 0.03, 9);
    expect(p.s1).toBeCloseTo(cons.apoios.at(-1)!.s1 - 0.03, 9);
    const calc = viga([8, 8], { vigaAncoragemEixo: 1, vigaAncoragemFolga: 3 }).calc().det;
    const q = ponta(calc);
    expect(q.s0).toBeGreaterThanOrEqual(p.s0 - 1e-9);
    expect(q.s1).toBeLessThanOrEqual(p.s1 + 1e-9);
    // a ponta fica a ao menos a ancoragem mínima (5,5φ + pino) do eixo do apoio
    const eixo = (cons.apoios[0].s0 + cons.apoios[0].s1) / 2;
    expect(eixo - q.s0).toBeGreaterThanOrEqual(Math.min(eixo - p.s0, (8 * q.phi) / 1000) - 1e-9);
  });
  it('folga 0 usa o cobrimento lateral (comportamento anterior)', () => {
    const { calc, s } = viga([8, 8], { vigaAncoragemEixo: 0, vigaAncoragemFolga: 0 });
    const det = calc().det, p = det.barras.find((x) => x.tipo === 'passante')!;
    expect(p.s0).toBeCloseTo(det.apoios[0].s0 + 0.03, 9); // CAA II: 3,0 cm
    expect(s.modelo.vigas.length).toBeGreaterThan(0);
  });
});

describe('R8a: montagem e adicional pela tabela (K1.12.18)', () => {
  it('bitola de montagem fora da lista: aviso "Fora de tabela (montagem)" e troca pela maior da lista que não a supera', () => {
    const { s, ok, calc } = viga([8, 8], { bitolaMontagem: 10 });
    const t = tabelaDeFabrica('vigas');
    for (const l of t.linhas) l.montagem = [8];
    ok('tabela.definir', { tipo: 'vigas', tabela: t });
    const { det, d } = calc();
    const m = det.barras.filter((x) => x.tipo === 'montagem');
    expect(m.length).toBeGreaterThan(0);
    expect(m.every((x) => x.phi <= 8)).toBe(true);
    expect(det.avisos.some((a) => /^Fora de tabela \(montagem\)/.test(a))).toBe(true);
    const rev = revisarEdificio(s.modelo, null, d);
    expect(rev.itens.some((i) => i.codigo === 'FORA_TABELA_MONTAGEM' && i.nivel === 'aviso')).toBe(true);
  });
  it('bitola adicional fora da lista: aviso e troca', () => {
    const { s, ok, calc } = viga([8, 8], { vigaCortesInf: 1, vigaReforcoBitola: 20 });
    const t = tabelaDeFabrica('vigas');
    for (const l of t.linhas) l.adicional = [10, 12.5, 16];
    ok('tabela.definir', { tipo: 'vigas', tabela: t });
    const { det } = calc();
    expect(det.barras.filter((x) => x.tipo === 'reforço').every((x) => x.phi === 16)).toBe(true);
    expect(det.avisos.some((a) => /^Fora de tabela \(adicional\)/.test(a))).toBe(true);
    expect(s.modelo.vigas.length).toBeGreaterThan(0);
  });
});
