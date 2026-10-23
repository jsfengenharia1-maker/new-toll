// Frente E2d: diagonais de contraventamento (modelo, comandos, cruzamentos, análise no pórtico 3D, dimensionamento, memorial,
// revisão, prancha e validação externa contra o OpenSees, validation/opensees/diagonal.py).
import { describe, expect, it } from 'vitest';
import ref from '../../../validation/opensees/diagonal.json';
import { Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio, porCaso } from './dimensionamento';
import { cruzamentosDiagonais, aproximacao, expandirDiagonais, resumoDiagonais } from './diagonais';
import { expandirInclinadas } from './inclinadas';
import { listagemInclinada } from './inclinadasDim';
import { memorialDiagonais } from './memorialDiagonais';
import { combinacoesDoEstado, combinacoesEdificio } from './combinacoes';
import { revisarEdificio } from './revisao';
import { verificar } from './verify';
import { montarPranchasVigas } from '../sheets/armacaoVigas';

const ok = (s: Sessao, nome: string, p: Record<string, unknown>) => { const r = s.executar(nome, p); if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };

/** Dois pilares (0,0) e (L,0) de lado `lado`, três pavimentos (cotas 3 e 6, mais o térreo); sem vigas nem lajes. */
function doisPilares(L = 4, lado = 1.2) {
  const s = new Sessao();
  ok(s, 'obra.definir', { nome: 'Diagonais' });
  ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
  ok(s, 'pavimento.criar', { nome: 'P1', cota: 3, uso: 'comum' });
  ok(s, 'pavimento.criar', { nome: 'P2', cota: 6, uso: 'comum' });
  for (const x of [0, L]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: lado, h: lado } });
  ok(s, 'opcoes.definir', { valores: { engasteTopoUltimo: 1 } });
  const [, p1, p2] = s.modelo.pavimentos;
  return { s, p1: p1.id, p2: p2.id, L };
}
const X = (s: Sessao, p1: string, p2: string, L: number, sec = { b: 0.2, h: 0.3 }, extra: Record<string, unknown> = {}) => {
  ok(s, 'diagonal.criar', { pavIni: p1, pavFim: p2, pIni: [L, 0], pFim: [0, 0], secao: sec, ...extra });
  ok(s, 'diagonal.criar', { pavIni: p1, pavFim: p2, pIni: [0, 0], pFim: [L, 0], secao: sec, ...extra });
};
const noEm = (an: ReturnType<typeof analisarEdificio>, p: [number, number, number]) => an.portico.modelo.nos.findIndex((n) => Math.hypot(n[0] - p[0], n[1] - p[1], n[2] - p[2]) < 1e-6);

describe('barras da diagonal: grupos intermediários, simples e múltipla', () => {
  it('atravessa grupos intermediários e a múltipla gera uma por par de pavimentos', () => {
    const s = new Sessao();
    ok(s, 'obra.definir', { nome: 'Tipo' });
    ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
    ok(s, 'grupo.criar', { nome: 'Tipo', uso: 'residencial' });
    ok(s, 'pavimento.criar', { nome: 'Tipo 1', cota: 3, grupo: s.modelo.grupos.at(-1)!.id });
    ok(s, 'pavimento.repetir', { id: s.modelo.pavimentos.at(-1)!.id, vezes: 3 });
    for (const x of [0, 6]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.5, h: 0.5 } });
    const [, t1, t2, t3, t4] = s.modelo.pavimentos;
    // da cota do Tipo 1 à do Tipo 4: atravessa os pavimentos Tipo 2 e 3 do grupo intermediário
    ok(s, 'diagonal.criar', { pavIni: t1.id, pavFim: t4.id, pIni: [0, 0], pFim: [6, 0], secao: { b: 0.2, h: 0.4 } });
    const bs = expandirDiagonais(s.modelo);
    expect(bs).toHaveLength(1);
    expect(bs[0].L).toBeCloseTo(Math.hypot(6, 9), 9);
    expect(bs[0].diagonal).toBe(true);
    expect(expandirInclinadas(s.modelo)).toHaveLength(1); // a análise enxerga as diagonais junto das inclinadas
    const id = s.modelo.diagonais![0].id;
    ok(s, 'diagonal.editar', { id, multipla: true });
    expect(expandirDiagonais(s.modelo).map((x) => [x.pavIni, x.pavFim])).toEqual([[t1.id, t4.id]]); // só um par cabe
    ok(s, 'diagonal.remover', { ids: [id] });
    ok(s, 'diagonal.criar', { pavIni: t1.id, pavFim: t2.id, pIni: [0, 0], pFim: [6, 0], secao: { b: 0.2, h: 0.4 }, multipla: true });
    expect(expandirDiagonais(s.modelo).map((x) => [x.pavIni, x.pavFim])).toEqual([[t1.id, t2.id], [t2.id, t3.id], [t3.id, t4.id]]);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    expect(an.inclinadas!.filter((i) => i.diagonal)).toHaveLength(3);
    expect(an.portico.barras.filter((t) => t.tipo === 'diagonal')).toHaveLength(3);
    expect(resumoDiagonais(s.modelo)[0].barras).toBe(3);
    // apagar vale para todos os grupos
    ok(s, 'diagonal.remover', { ids: [s.modelo.diagonais![0].id] });
    expect(s.modelo.diagonais).toBeUndefined();
    expect(expandirDiagonais(s.modelo)).toHaveLength(0);
  });
});

describe('comandos das diagonais', () => {
  it('criar valida pontas e desnível; editar, mover, atribuir e remover', () => {
    const { s, p1, p2, L } = doisPilares();
    const base = { pavIni: p1, pavFim: p2, pIni: [L, 0], pFim: [0, 0], secao: { b: 0.2, h: 0.3 } };
    expect(s.executar('diagonal.criar', { ...base, pFim: [2, 2] }).ok).toBe(false); // ponta fora de pilar e de viga
    expect(s.executar('diagonal.criar', { ...base, pavFim: p1 }).ok).toBe(false); // mesma cota
    expect(s.executar('diagonal.criar', { ...base, pIni: [0, 0] }).ok).toBe(false); // uma sobre a outra
    ok(s, 'diagonal.criar', base);
    ok(s, 'diagonal.criar', { ...base, pIni: [0, 0], pFim: [L, 0], secao: { b: 0.25, h: 0.4 }, ligIni: 'articulada', flambagem: { vertical: 0.8 } });
    const [d1, d2] = s.modelo.diagonais!;
    expect([d1.nome, d2.nome]).toEqual(['D1', 'D2']);
    expect(s.executar('diagonal.editar', { id: 'xx', nome: 'A' }).ok).toBe(false);
    ok(s, 'diagonal.atribuir', { id: d1.id, de: d2.id }); // C6.41: copia seção, ligações, flambagem e cobrimento
    expect(s.modelo.diagonais![0].secao).toEqual({ b: 0.25, h: 0.4 });
    expect(s.modelo.diagonais![0].ligIni).toBe('articulada');
    expect(s.modelo.diagonais![0].flambagem).toEqual({ vertical: 0.8 });
    ok(s, 'diagonal.editar', { id: d1.id, ligIni: 'engastada', flambagem: {} });
    expect(s.modelo.diagonais![0].ligIni).toBeUndefined();
    expect(s.executar('diagonal.mover', { id: d1.id, ponta: 'fim', dx: 3, dy: 0 }).ok).toBe(false); // sai do pilar
    ok(s, 'diagonal.mover', { id: d1.id, ponta: 'fim', dx: 0.1, dy: 0.05 });
    expect(s.modelo.diagonais![0].pFim[0]).toBeCloseTo(0.1, 9);
    expect(verificar(s.modelo).filter((d) => d.codigo.startsWith('DIAGONAL'))).toEqual([]);
    ok(s, 'diagonal.remover', { ids: [d1.id, d2.id] });
    expect(s.modelo.diagonais).toBeUndefined();
  });
  it('em diagonal múltipla, editar, mover e atribuir valem só no grupo atual; remover apaga todas', () => {
    const s = new Sessao();
    ok(s, 'obra.definir', { nome: 'Tipo' });
    ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
    ok(s, 'grupo.criar', { nome: 'Tipo', uso: 'residencial' });
    ok(s, 'pavimento.criar', { nome: 'Tipo 1', cota: 3, grupo: s.modelo.grupos.at(-1)!.id });
    ok(s, 'pavimento.repetir', { id: s.modelo.pavimentos.at(-1)!.id, vezes: 3 });
    for (const x of [0, 6]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.5, h: 0.5 } });
    const [, t1, t2, t3, t4] = s.modelo.pavimentos;
    ok(s, 'diagonal.criar', { pavIni: t1.id, pavFim: t2.id, pIni: [0, 0], pFim: [6, 0], secao: { b: 0.2, h: 0.4 }, multipla: true });
    const id = s.modelo.diagonais![0].id;
    expect(expandirDiagonais(s.modelo)).toHaveLength(3);
    expect(s.executar('diagonal.editar', { id, pavimento: t4.id, nome: 'X' }).ok).toBe(false); // não há barra que comece em Tipo 4
    ok(s, 'diagonal.editar', { id, pavimento: t2.id, secao: { b: 0.3, h: 0.5 }, ligFim: 'articulada' });
    // a barra do Tipo 2 virou uma diagonal própria; a múltipla ficou com as outras duas
    expect(s.modelo.diagonais).toHaveLength(2);
    expect(s.modelo.diagonais![0].excluidas).toEqual([t2.id]);
    expect(s.modelo.diagonais![0].secao).toEqual({ b: 0.2, h: 0.4 });
    const so = s.modelo.diagonais![1];
    expect([so.pavIni, so.pavFim, so.multipla, so.secao, so.ligFim]).toEqual([t2.id, t3.id, undefined, { b: 0.3, h: 0.5 }, 'articulada']);
    expect(expandirDiagonais(s.modelo).map((x) => x.pavIni).sort()).toEqual([t1.id, t2.id, t3.id].sort());
    expect(expandirDiagonais(s.modelo).find((x) => x.pavIni === t2.id)!.inc.secao).toEqual({ b: 0.3, h: 0.5 });
    ok(s, 'diagonal.mover', { id, pavimento: t3.id, ponta: 'fim', dx: 0.05, dy: 0 });
    expect(s.modelo.diagonais).toHaveLength(3);
    expect(s.modelo.diagonais![0].pFim).toEqual([6, 0]); // as demais não se movem
    expect(s.modelo.diagonais![2].pFim[0]).toBeCloseTo(6.05, 9);
    ok(s, 'diagonal.atribuir', { id, de: so.id, pavimento: t1.id, campos: ['secao'] });
    expect(expandirDiagonais(s.modelo)).toHaveLength(3);
    // desfazer o último comando volta ao estado anterior (o inverso recompõe a múltipla)
    expect(s.desfazer()).not.toBeNull();
    ok(s, 'diagonal.remover', { ids: [id] });
    expect(expandirDiagonais(s.modelo).every((x) => x.inc.id !== id)).toBe(true);
    ok(s, 'diagonal.remover', { ids: s.modelo.diagonais!.map((x) => x.id) });
    expect(s.modelo.diagonais).toBeUndefined();
  });
  it('o diagnóstico acusa o extremo que perdeu o apoio (pilar movido)', () => {
    const { s, p1, p2, L } = doisPilares();
    ok(s, 'diagonal.criar', { pavIni: p1, pavFim: p2, pIni: [L, 0], pFim: [0, 0], secao: { b: 0.2, h: 0.3 } });
    ok(s, 'pilar.mover', { ids: [s.modelo.pilares[1].id], dx: 3, dy: 0 });
    expect(verificar(s.modelo).some((d) => d.codigo === 'DIAGONAL_SEM_APOIO')).toBe(true);
  });
});

describe('cruzamentos', () => {
  it('aproximação entre segmentos do espaço', () => {
    const r = aproximacao([0, 0, 0], [4, 0, 3], [4, 0, 0], [0, 0, 3])!;
    expect(r.dist).toBeCloseTo(0, 12);
    expect(r.s).toBeCloseTo(0.5, 12);
    expect(r.ponto).toEqual([2, 0, 1.5].map((v) => expect.closeTo(v, 12)));
    expect(aproximacao([0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0])).toBeNull(); // paralelas
    expect(aproximacao([0, 0, 0], [4, 0, 0], [2, 1, -1], [2, 1, 1])!.dist).toBeCloseTo(1, 12); // reversas
  });
  it('X entre dois pilares gera um nó, sem reduzir o comprimento de flambagem; V no pilar não gera', () => {
    const { s, p1, p2, L } = doisPilares();
    X(s, p1, p2, L);
    const cz = cruzamentosDiagonais(s.modelo);
    expect(cz).toHaveLength(1);
    expect(cz[0].pos[0]).toBeCloseTo(L / 2, 9);
    expect(cz[0].pos[2]).toBeCloseTo(4.5, 9);
    expect(cz[0].barras.map((b) => b.s)).toEqual([expect.closeTo(2.5, 9), expect.closeTo(2.5, 9)]);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const [a, b] = an.inclinadas!;
    expect(a.segs).toHaveLength(2);
    expect(a.cruzamentos).toBe(1);
    expect(a.segs![0].Lf + a.segs![1].Lf).toBeCloseTo(a.Lf, 12);
    // as duas diagonais dividem o mesmo nó, criado uma só vez (4 nós de pilar + 1 de cruzamento + 2 bases)
    const nCruz = noEm(an, [L / 2, 0, 4.5]);
    expect(nCruz).toBeGreaterThanOrEqual(0);
    const m = an.portico.modelo;
    expect([m.barras[a.segs![0].bi].j, m.barras[a.segs![1].bi].i, m.barras[b.segs![0].bi].j, m.barras[b.segs![1].bi].i]).toEqual([nCruz, nCruz, nCruz, nCruz]);
    expect(m.nos.filter((n) => Math.hypot(n[0] - L / 2, n[2] - 4.5) < 1e-6)).toHaveLength(1);
    // a flambagem é pelo comprimento total entre as pontas (5 m), não pelo meio
    const d = dimensionarEdificio(s.modelo, an).diagonais!;
    expect(d).toHaveLength(2);
    for (const r of d) { expect(r.L).toBeCloseTo(5, 9); expect(r.le[0]).toBeCloseTo(5, 9); expect(r.le[1]).toBeCloseTo(5, 9); expect(r.mensagens.some((x) => x.startsWith('Diagonal: nó gerado'))).toBe(true); expect(r.envoltoria.length).toBeGreaterThan(21); }
    // sem a segunda diagonal não há nó nem divisão
    ok(s, 'diagonal.remover', { ids: [s.modelo.diagonais![1].id] });
    const an1 = analisarEdificio(s.modelo);
    expect(an1.inclinadas![0].segs).toBeUndefined();
    expect(an1.portico.modelo.nos.length).toBe(m.nos.length - 1);
  });
});

describe('análise: diagonal articulada pela estática', () => {
  it('uma diagonal entre pilares: o esforço axial segue o cálculo manual (compatibilidade com os pilares em balanço)', () => {
    const { s, p1, p2, L } = doisPilares(4, 1.2);
    ok(s, 'diagonal.criar', { pavIni: p1, pavFim: p2, pIni: [L, 0], pFim: [0, 0], secao: { b: 0.2, h: 0.3 }, ligIni: 'articulada', ligFim: 'articulada' });
    const H = 100;
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[0].id, pavimento: p2, caso: 'Q', Hx: H });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const inc = an.inclinadas![0], m = an.portico.modelo, br = m.barras[inc.bi];
    const E = br.E, EA = E * 0.2 * 0.3, EI = E * 1.2 ** 4 / 12, c = L / Math.hypot(L, 3);
    // pilar A: balanço de 6 m com H e a componente horizontal da diagonal no topo; pilar B: balanço de 3 m até o nó B1, onde a diagonal chega
    const kA = (3 * EI) / 6 ** 3, kB = (3 * EI) / 3 ** 3;
    const F = -(EA * c * H) / (inc.Lf * kA) / (1 + ((EA * c * c) / inc.Lf) * (1 / kA + 1 / kB));
    const N = porCaso(an, inc.bi, [0, inc.Lf / 2, inc.Lf]).Q;
    for (const e of N) expect(Math.abs(e.N / F - 1)).toBeLessThan(0.03); // desprezados os efeitos axiais dos pilares e das diagonais nos deslocamentos
    expect(Math.abs(N[0].Mz)).toBeLessThan(1e-6); // articulada: sem momento
    expect(N[0].N).toBeLessThan(0); // comprime: o topo do pilar A anda para o lado em que a diagonal desce
    // equilíbrio na direção x: H = cortante dos pilares + componente horizontal da diagonal nas reações da base
    const Hbase = an.fundacao.filter((f) => f.caso === 'Q').reduce((t, f) => t + f.Vx, 0);
    expect(Math.abs(Hbase)).toBeCloseTo(H, 4);
  });
});

describe('pórtico contraventado × sem contraventamento × OpenSees', () => {
  function portico(comDiag: boolean) {
    const { s, p1, p2, L } = doisPilares(6, 0.5);
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[0].id, pavimento: p2, caso: 'G', Hx: 80 });
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[1].id, pavimento: p2, caso: 'G', N: 300 });
    if (comDiag) X(s, p1, p2, L, { b: 0.25, h: 0.4 });
    return s;
  }
  it('o deslocamento horizontal do topo cai com o contraventamento e coincide com o do OpenSees (erro < 1e-8)', async () => {
    const livre = analisarEdificio(portico(false).modelo, { modeloGlobal: 0 });
    const s = portico(true);
    const an = analisarEdificio(s.modelo, { modeloGlobal: 0 });
    expect(an.erro).toBeUndefined();
    expect(an.avisos.filter((a) => a.includes('diagonal') || a.includes('inclinada'))).toEqual([]);
    const ux = (a: ReturnType<typeof analisarEdificio>) => { const n = noEm(a, [0, 0, 6]); return Math.abs(a.portico.res!.desloc[0][n * 6]); };
    expect(ux(an)).toBeLessThan(ux(livre) / 3);
    const PROC = 'node:process', FS = 'node:fs';
    const env = ((await import(/* @vite-ignore */ PROC)) as { env: Record<string, string | undefined> }).env;
    const m = an.portico.modelo, c = an.portico.casos![0];
    if (env.GERAR_OPENSEES) {
      const fs = (await import(/* @vite-ignore */ FS)) as { writeFileSync: (p: string, d: string) => void };
      fs.writeFileSync('validation/opensees/diagonal.modelo.json', JSON.stringify({
        nos: m.nos, apoios: [...m.apoios], escravos: m.escravos ?? [],
        barras: m.barras.map((b) => ({ i: b.i, j: b.j, E: b.E, G: b.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, ref: b.ref ?? null, offI: b.offI ?? null, offJ: b.offJ ?? null, eng: !!(b.engI?.length || b.engJ?.length || b.libI?.length || b.libJ?.length) })),
        nodais: c.nodais, distribuidas: c.distribuidas, pontuais: c.pontuais ?? [],
      }));
    }
    const R = ref as { nos: number; desloc: number[][] };
    expect(R.nos).toBe(m.nos.length);
    expect(an.inclinadas!.map((i) => i.cruzamentos)).toEqual([1, 1]);
    const u = an.portico.res!.desloc[0];
    let e = 0, mx = 0;
    R.desloc.forEach((d, n) => { for (let k = 0; k < 6; k++) { e = Math.max(e, Math.abs(u[n * 6 + k] - d[k])); mx = Math.max(mx, Math.abs(d[k])); } });
    expect(e / mx).toBeLessThan(1e-8);
  }, 120000);
});

describe('dimensionamento: tração e compressão com esbeltez máxima', () => {
  function xCarregado(sec: { b: number; h: number }) {
    const { s, p1, p2, L } = doisPilares(4, 1.2);
    X(s, p1, p2, L, sec);
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[0].id, pavimento: p2, caso: 'Q', Hx: 100 });
    const an = analisarEdificio(s.modelo);
    return { s, an, dim: dimensionarEdificio(s.modelo, an) };
  }
  it('uma diagonal comprime e a outra traciona; ambas atendem e a armadura vem do dimensionamento', () => {
    const { dim } = xCarregado({ b: 0.3, h: 0.4 });
    const [a, b] = dim.diagonais!;
    expect([a.status, b.status]).toEqual(['ok', 'ok']);
    const comp = a.Nd.compressao > b.Nd.compressao ? a : b, tra = comp === a ? b : a;
    expect(comp.Nd.compressao).toBeGreaterThan(50);
    expect(tra.Nd.tracao).toBeGreaterThan(50);
    expect(comp.util).toBeLessThanOrEqual(1 + 1e-9);
    expect(dim.detalhesDiagonais).toHaveLength(2);
    expect(dim.resumoAcoDiagonais!.length).toBeGreaterThan(0);
    expect(dim.inclinadas).toBeUndefined(); // nada se mistura com as vigas inclinadas
  });
  it('esbeltez acima do máximo reprova a diagonal que comprime em alguma combinação (a tracionada pura não tem limite)', () => {
    const { dim } = xCarregado({ b: 0.08, h: 0.08 });
    const [a, b] = dim.diagonais!;
    const comp = a.Nd.compressao > b.Nd.compressao ? a : b;
    expect(comp.lambda[0]).toBeGreaterThan(200);
    expect(comp.status).toBe('fail');
    expect(comp.mensagens.some((m) => /^Diagonal: esbeltez λ = \d+ acima de 200/.test(m))).toBe(true);
    expect(comp.Nd.compressao).toBeGreaterThan(50);
  });
  it('a esbeltez máxima e os coeficientes de flambagem são opções; a diagonal pode ter os próprios', () => {
    const { s, an } = xCarregado({ b: 0.1, h: 0.1 });
    let d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).diagonais!;
    expect(d.some((r) => r.mensagens.some((m) => /^Diagonal: esbeltez λ = \d+ acima de/.test(m) && !m.includes('acima de 90')))).toBe(false); // λ = 5/(0,1/√12) = 173 < 200
    ok(s, 'opcoes.definir', { valores: { diagonalEsbeltezMax: 150 } });
    d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).diagonais!;
    expect(d.some((r) => r.mensagens.some((m) => /^Diagonal: esbeltez λ = 173 acima de 150/.test(m)))).toBe(true);
    ok(s, 'opcoes.definir', { valores: { diagonalEsbeltezMax: 200, diagonalFlambagemVertical: 1.5, diagonalFlambagemTransversal: 1.5 } });
    d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).diagonais!;
    expect(d[0].le[0]).toBeCloseTo(7.5, 9);
    expect(d[0].lambda[0]).toBeCloseTo(7.5 / (0.1 / Math.sqrt(12)), 9);
    expect(d.some((r) => r.mensagens.some((m) => /^Diagonal: esbeltez λ = 260 acima de 200/.test(m)))).toBe(true);
    ok(s, 'diagonal.editar', { id: s.modelo.diagonais![0].id, flambagem: { vertical: 0.5, transversal: 0.5 } });
    d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)).diagonais!;
    expect(d[0].le[0]).toBeCloseTo(2.5, 9);
    expect(an.inclinadas!.length).toBe(2);
  });
});

describe('listagem, revisão, prancha e memorial', () => {
  function pronto() {
    const { s, p1, p2, L } = doisPilares(4, 1.2);
    X(s, p1, p2, L, { b: 0.08, h: 0.08 });
    ok(s, 'carga.pilar', { pilar: s.modelo.pilares[0].id, pavimento: p2, caso: 'Q', Hx: 100 });
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    return { s, an, dim };
  }
  it('listagem da diagonal dividida: estações dos dois trechos e esforços por combinação', () => {
    const { s, an, dim } = pronto();
    const elu = combinacoesDoEstado(s.modelo, an, 'concreto', combinacoesEdificio(s.modelo, an));
    const l = listagemInclinada(s.modelo, an, dim.diagonais![0], elu, (bi, xs) => porCaso(an, bi, xs))!;
    expect(l.xs.length).toBe(dim.diagonais![0].envoltoria.length);
    expect(l.xs.at(-1)).toBeCloseTo(an.inclinadas![0].Lf, 9);
    expect(l.descricao.join(' ')).toContain('cruzamento');
    expect(l.combinacoes.length).toBe(elu.length);
  });
  it('revisão: diagonal reprovada aparece com código DIAGONAL_* e tipo próprio', () => {
    const { s, an, dim } = pronto();
    const rev = revisarEdificio(s.modelo, an, dim);
    const it = rev.itens.filter((i) => i.tipo === 'diagonal');
    expect(it.some((i) => i.nivel === 'erro')).toBe(true);
    expect(it.every((i) => i.codigo.startsWith('DIAGONAL_') && i.sugestao)).toBe(true);
    expect(it.some((i) => i.codigo === 'DIAGONAL_ESBELTEZ_MAX')).toBe(true);
    expect(rev.itens.some((i) => i.tipo === 'inclinada')).toBe(false);
  });
  it('prancha de vigas do grupo inicial leva a diagonal desenhada, com o aço', () => {
    const { s, an, dim } = pronto();
    const folhas = montarPranchasVigas(s.modelo, an, dim);
    const f = folhas.find((x) => JSON.stringify([x.modelo, x.papel]).includes('DIAGONAL DESENVOLVIDA'));
    expect(f).toBeDefined();
    expect(f!.aco!.tabela.length).toBeGreaterThan(0);
  });
  it('memorial: lista, envoltória, armaduras, cruzamento e o aviso dos nós', () => {
    const { s, dim } = pronto();
    const m = memorialDiagonais(s.modelo, dim);
    expect(m.tabelas.map((t) => t.id)).toEqual(['lista', 'esforcos', 'armaduras']);
    expect(m.tabelas[0].linhas[0].slice(0, 3)).toEqual(['D1', 'P1 → P2', '8×8 cm']);
    expect(m.tabelas[0].linhas[0].at(-1)).toBe('1');
    expect(m.notas.join(' ')).toContain('nós de extremidade');
    expect(m.notas.join(' ')).toContain('cruzamento');
    expect(memorialDiagonais(s.modelo, null).tabelas.map((t) => t.id)).toEqual(['lista']);
    expect(memorialDiagonais(doisPilares().s.modelo, null).tabelas).toEqual([]);
  });
});
