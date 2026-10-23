// Frente E2c: vigas inclinadas entre pavimentos (modelo, comandos, análise no pórtico 3D, dimensionamento à flexo-compressão
// oblíqua e validação externa contra o OpenSees, validation/opensees/viga_inclinada.py).
import { describe, expect, it } from 'vitest';
import ref from '../../../validation/opensees/viga_inclinada.json';
import { Sessao } from '../commands';
import { baseBarra, resolver3, type Modelo3, type V3 } from '../fe3d';
import { fiberAxialRange, fiberCapacity, fiberMesh } from '../fiber';
import { barArea } from '../concrete';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio, esforcosAoLongo, porCaso } from './dimensionamento';
import { barrasDaInclinada, expandirInclinadas, ligacaoDaPonta, resumoInclinadas } from './inclinadas';
import { concretoDe } from './materiais';
import { verificar } from './verify';
import { listagemInclinada } from './inclinadasDim';
import { memorialInclinadas } from './memorialInclinadas';
import { combinacoesDoEstado, combinacoesEdificio } from './combinacoes';
import { revisarEdificio } from './revisao';
import { montarPranchasVigas } from '../sheets/armacaoVigas';

const ok = (s: Sessao, nome: string, p: Record<string, unknown>) => { const r = s.executar(nome, p); if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };

/** Dois pilares (0,0) e (L,0) de lado `lado`, três pavimentos (cotas 3 e 6, mais o térreo). */
function doisPilares(L = 8, lado = 0.8) {
  const s = new Sessao();
  ok(s, 'obra.definir', { nome: 'Inclinada' });
  ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
  ok(s, 'pavimento.criar', { nome: 'P1', cota: 3, uso: 'comum' });
  ok(s, 'pavimento.criar', { nome: 'P2', cota: 6, uso: 'comum' });
  for (const x of [0, L]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: lado, h: lado } });
  const [, p1, p2] = s.modelo.pavimentos;
  return { s, p1: p1.id, p2: p2.id, L };
}

describe('barras da viga inclinada: simples e múltipla', () => {
  it('simples gera uma barra; múltipla gera uma por par de pavimentos de mesma posição', () => {
    const s = new Sessao();
    ok(s, 'obra.definir', { nome: 'Tipo' });
    ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
    ok(s, 'grupo.criar', { nome: 'Tipo', uso: 'residencial' });
    ok(s, 'pavimento.criar', { nome: 'Tipo 1', cota: 3, grupo: s.modelo.grupos.at(-1)!.id });
    ok(s, 'pavimento.repetir', { id: s.modelo.pavimentos.at(-1)!.id, vezes: 3 });
    for (const x of [0, 6]) ok(s, 'pilar.inserir', { x, y: 0, secao: { tipo: 'ret', b: 0.5, h: 0.5 } });
    const [, t1, t2, t3, t4] = s.modelo.pavimentos;
    expect(s.modelo.pavimentos).toHaveLength(5);
    ok(s, 'inclinada.criar', { pavIni: t1.id, pavFim: t2.id, pIni: [0, 0], pFim: [6, 0], secao: { b: 0.2, h: 0.4 } });
    expect(expandirInclinadas(s.modelo)).toHaveLength(1);
    const id = s.modelo.vigasInclinadas![0].id;
    ok(s, 'inclinada.editar', { id, multipla: true });
    const bs = expandirInclinadas(s.modelo);
    // Tipo 1→2, 2→3 e 3→4 (a barra lançada fixa a posição: pavimento k liga-se ao k + 1)
    expect(bs.map((x) => [x.pavIni, x.pavFim])).toEqual([[t1.id, t2.id], [t2.id, t3.id], [t3.id, t4.id]]);
    expect(bs.filter((x) => x.lancada)).toHaveLength(1);
    expect(bs[0].L).toBeCloseTo(Math.hypot(6, 3), 9);
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    expect(an.inclinadas).toHaveLength(3);
    expect(an.portico.barras.filter((t) => t.tipo === 'inclinada').map((t) => t.pavimento)).toEqual([t1.id, t2.id, t3.id]);
    expect(resumoInclinadas(s.modelo)[0].barras).toBe(3);
  });
});

describe('comandos das vigas inclinadas', () => {
  it('criar valida as pontas, o desnível e as cargas; editar, mover, armadura, redimensionar e remover', () => {
    const { s, p1, p2, L } = doisPilares();
    const base = { pavIni: p1, pavFim: p2, pIni: [0, 0], pFim: [L, 0], secao: { b: 0.3, h: 0.6 } };
    expect(s.executar('inclinada.criar', { ...base, pFim: [4, 3] }).ok).toBe(false); // ponta fora de pilar e de viga
    expect(s.executar('inclinada.criar', { ...base, pavFim: p1 }).ok).toBe(false); // mesma cota
    expect(s.executar('inclinada.criar', { ...base, pFim: [0, 0] }).ok).toBe(false); // uma sobre a outra
    expect(s.executar('inclinada.criar', { ...base, cargas: [{ caso: 'XX', tipo: 'linear', valor: 1 }] }).ok).toBe(false);
    ok(s, 'inclinada.criar', { ...base, cargas: [{ caso: 'G', tipo: 'concentrada', valor: 40, de: 3 }] });
    const id = s.modelo.vigasInclinadas![0].id;
    expect(s.modelo.vigasInclinadas![0].nome).toBe('VI1');
    ok(s, 'inclinada.armadura', { id, sup: { n: 3, phi: 16 }, inf: { n: 3, phi: 20 }, estribo: { phi: 8, s: 0.15 } });
    expect(s.modelo.vigasInclinadas![0].armadura?.inf).toEqual({ n: 3, phi: 20 });
    ok(s, 'inclinada.editar', { id, secao: { b: 0.25, h: 0.5 } }); // mudar a seção solta o bloqueio
    expect(s.modelo.vigasInclinadas![0].armadura).toBeUndefined();
    ok(s, 'inclinada.editar', { id, ligIni: 'articulada', flambagem: { vertical: 0.8 } });
    expect(s.modelo.vigasInclinadas![0].ligIni).toBe('articulada');
    expect(s.executar('inclinada.mover', { id, ponta: 'fim', dx: 1, dy: 0 }).ok).toBe(false); // sai do pilar
    ok(s, 'inclinada.mover', { id, ponta: 'fim', dx: 0.1, dy: 0.05 });
    expect(s.modelo.vigasInclinadas![0].pFim[0]).toBeCloseTo(L + 0.1, 9);
    ok(s, 'inclinada.armadura', { id, sup: { n: 2, phi: 16 }, inf: { n: 2, phi: 16 }, estribo: { phi: 6.3, s: 0.2 } });
    ok(s, 'inclinada.redimensionar', {});
    expect(s.modelo.vigasInclinadas![0].armadura).toBeUndefined();
    expect(verificar(s.modelo).filter((d) => d.codigo.startsWith('INCLINADA'))).toEqual([]);
    ok(s, 'inclinada.remover', { ids: [id] });
    expect(s.modelo.vigasInclinadas).toBeUndefined();
  });
  it('o diagnóstico acusa a ponta que perdeu o apoio (pilar movido)', () => {
    const { s, p1, p2, L } = doisPilares();
    ok(s, 'inclinada.criar', { pavIni: p1, pavFim: p2, pIni: [0, 0], pFim: [L, 0], secao: { b: 0.3, h: 0.6 } });
    expect(ligacaoDaPonta(s.modelo, p2, [L, 0])).toEqual({ tipo: 'pilar', pilar: s.modelo.pilares[1].id });
    ok(s, 'pilar.mover', { ids: [s.modelo.pilares[1].id], dx: 3, dy: 0 });
    expect(verificar(s.modelo).some((d) => d.codigo === 'INCLINADA_SEM_APOIO')).toBe(true);
  });
});

describe('análise: biapoiada inclinada pela estática', () => {
  it('modelo de barra 3D (apoio fixo em i, deslizante na horizontal em j): N, V e M das estações', () => {
    const dx = 6, dz = 4.5, th = Math.atan2(dz, dx), q = 12; // barra de 7,5 m com carga vertical q por metro de barra
    const E = 2.5e7, G = E / 2.4, A = 0.18, Iz = (0.3 * 0.6 ** 3) / 12, Iy = (0.6 * 0.3 ** 3) / 12;
    const nos: V3[] = [[0, 0, 0], [dx, 0, dz]];
    const m: Modelo3 = { nos, barras: [{ i: 0, j: 1, E, G, A, Iy, Iz, J: 1e-3, ref: [0, 0, 1], libI: [4, 5], libJ: [4, 5] }], apoios: new Map([[0, [0, 1, 2, 3, 4, 5]], [1, [1, 2, 3, 4, 5]]]) };
    const caso = { nodais: [], distribuidas: [{ barra: 0, q: [0, 0, -q] as V3 }] };
    const r = resolver3(m, [caso]);
    expect(r.erro).toBeUndefined();
    const { L: Lf } = baseBarra(m, m.barras[0]);
    expect(Lf).toBeCloseTo(7.5, 12);
    const est = esforcosAoLongo(m, 0, r.esforcos[0][0], caso, [0, Lf / 4, Lf / 2, (3 * Lf) / 4, Lf]);
    const qt = q * Math.cos(th), qa = q * Math.sin(th);
    est.forEach((e) => {
      // reação vertical qLf/2 em cada apoio, sem reação horizontal: N = q·senθ·(x − ℓ/2), V = q·cosθ·(ℓ/2 − x), M = q·cosθ·x(ℓ − x)/2
      expect(e.N).toBeCloseTo(qa * (e.x - Lf / 2), 6);
      expect(e.Mz).toBeCloseTo((qt * e.x * (Lf - e.x)) / 2, 6);
      expect(Math.abs(e.Vy)).toBeCloseTo(Math.abs(qt * (Lf / 2 - e.x)), 6);
    });
    expect(r.reacoes[0].get(0)![2]).toBeCloseTo((q * Lf) / 2, 6);
    expect(r.reacoes[0].get(1)![2]).toBeCloseTo((q * Lf) / 2, 6);
  });

  it('no edifício: M, V e a variação de N seguem a estática com pilares muito rígidos e pontas articuladas', () => {
    const { s, p1, p2, L } = doisPilares(8, 0.8);
    ok(s, 'inclinada.criar', { pavIni: p1, pavFim: p2, pIni: [0, 0], pFim: [L, 0], secao: { b: 0.3, h: 0.6 }, ligIni: 'articulada', ligFim: 'articulada' });
    const an = analisarEdificio(s.modelo);
    expect(an.erro).toBeUndefined();
    const inc = an.inclinadas![0], th = (inc.angulo * Math.PI) / 180, q = 25 * 0.3 * 0.6;
    const xs = [0, inc.Lf / 4, inc.Lf / 2, (3 * inc.Lf) / 4, inc.Lf];
    const g = porCaso(an, inc.bi, xs).G;
    const qt = q * Math.cos(th);
    expect(g[2].Mz / ((qt * inc.Lf ** 2) / 8)).toBeCloseTo(1, 2);
    expect(Math.abs(g[0].Vy) / ((qt * inc.Lf) / 2)).toBeCloseTo(1, 2);
    expect(g[2].Vy).toBeCloseTo(0, 3);
    expect((g[4].N - g[0].N) / inc.Lf / (q * Math.sin(th))).toBeCloseTo(1, 3);
    expect(g[0].Mz).toBeCloseTo(0, 3); // articulada: sem momento nas pontas
    expect(g[0].T).toBeCloseTo(0, 6);
    // equilíbrio global: soma das reações verticais da base = peso total (G)
    const somaN = an.fundacao.filter((f) => f.caso === 'G').reduce((t, f) => t + f.N, 0);
    expect(somaN).toBeCloseTo(an.totais.G, 4);
  });
});

describe('sem imposição de diafragma', () => {
  it('a inclinada entre dois pavimentos não une zonas nem cria escravos', () => {
    const monta = (comInclinada: boolean) => {
      const s = new Sessao();
      ok(s, 'obra.definir', { nome: 'Zonas' });
      ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
      ok(s, 'pavimento.criar', { nome: 'P1', cota: 3, uso: 'comum' });
      ok(s, 'pavimento.criar', { nome: 'P2', cota: 6, uso: 'comum' });
      for (const [x, y] of [[0, 0], [6, 0], [12, 0], [18, 0]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
      const [, p1, p2] = s.modelo.pavimentos;
      const v = (pav: string, a: number[], z: number[]) => ({ nome: 'viga.tracar', params: { grupo: s.modelo.pavimentos.find((p) => p.id === pav)!.grupo, pontos: [a, z], secao: { b: 0.2, h: 0.5 } } });
      // P1: duas zonas independentes (vigas 0–6 e 12–18); P2: viga 6–12
      ok(s, 'lote', { comandos: [v(p1.id, [0, 0], [6, 0]), v(p1.id, [12, 0], [18, 0]), v(p2.id, [6, 0], [12, 0])] });
      if (comInclinada) ok(s, 'inclinada.criar', { pavIni: p1.id, pavFim: p2.id, pIni: [6, 0], pFim: [12, 0], secao: { b: 0.2, h: 0.5 } });
      return analisarEdificio(s.modelo);
    };
    const a = monta(false), b = monta(true);
    expect(b.erro).toBeUndefined();
    for (const k of Object.keys(a.portico.zonas)) expect(b.portico.zonas[k].map((z) => z.nos.length)).toEqual(a.portico.zonas[k].map((z) => z.nos.length));
    expect(b.portico.modelo.escravos?.length).toBe(a.portico.modelo.escravos?.length);
    expect(b.inclinadas).toHaveLength(1);
  });
});

describe('dimensionamento à flexo-compressão oblíqua', () => {
  it('a utilização da armadura bloqueada coincide com a das fibras na solicitação determinante; estribos e detalhe', () => {
    const { s, p1, p2, L } = doisPilares(8, 0.8);
    ok(s, 'inclinada.criar', { pavIni: p1, pavFim: p2, pIni: [0, 0], pFim: [L, 0], secao: { b: 0.3, h: 0.6 }, cargas: [{ caso: 'G', tipo: 'linear', valor: 20 }, { caso: 'Q', tipo: 'faixa', valor: 10, de: 1, ate: 6 }] });
    const id = s.modelo.vigasInclinadas![0].id;
    const an = analisarEdificio(s.modelo);
    const livre = dimensionarEdificio(s.modelo, an).inclinadas![0];
    expect(livre.util).toBeLessThanOrEqual(1 + 1e-9);
    expect(livre.status === 'ok' || livre.status === 'review').toBe(true);
    expect(livre.envoltoria).toHaveLength(21);
    expect(livre.arranjo.sup.n).toBeGreaterThanOrEqual(2);
    // bloqueia 4φ16 em cima e 4φ20 embaixo: a utilização é recalculada pelas fibras na combinação determinante
    ok(s, 'inclinada.armadura', { id, sup: { n: 4, phi: 16 }, inf: { n: 4, phi: 20 }, estribo: { phi: 8, s: 0.15 } });
    const d = dimensionarEdificio(s.modelo, an).inclinadas![0];
    expect(d.bloqueada).toBe(true);
    const det = d.determinantes[0];
    const c = concretoDe(s.modelo, 'viga'), cob = 0.03, phiT = 0.0063, b = 0.3, h = 0.6;
    const bars = [] as { x: number; y: number; A: number }[];
    const fila = (n: number, phi: number, y: number) => { const a = cob + phiT + phi / 2000; for (let i = 0; i < n; i++) bars.push({ x: a + ((b - 2 * a) * i) / (n - 1), y, A: barArea(phi) }); };
    fila(4, 20, cob + phiT + 0.01); fila(4, 16, h - cob - phiT - 0.008);
    const poly: [number, number][] = [[0, 0], [b, 0], [b, h], [0, h]];
    const S = { mesh: fiberMesh(poly, 20), bars, cx: b / 2, cy: h / 2, c, fyd: 500 / 1.15, poly };
    const mx = Math.abs(det.My) / 1000, my = det.Mz / 1000, Nc = -det.N / 1000;
    const { NRc, NRt } = fiberAxialRange(S);
    expect(Nc).toBeLessThan(NRc);
    expect(Nc).toBeGreaterThan(NRt);
    const R = fiberCapacity(S, Nc, mx, my)!;
    expect(d.util).toBeCloseTo(Math.hypot(mx, my) / R, 6);
    const dt = dimensionarEdificio(s.modelo, an).detalhesInclinadas![0];
    expect(dt.barras[0].n).toBe(4);
    expect(dt.estribos.s).toBeCloseTo(0.15, 9);
    expect(dt.estribos.n).toBe(Math.ceil(d.Lf / 0.15 - 1e-9) + 1);
    expect(dt.avisos[0]).toContain('Nós de extremidade');
  });
});

describe('validação externa: pórtico com vigas inclinadas × OpenSees', () => {
  it('deslocamentos do caso G coincidem (erro relativo < 1e-8)', async () => {
    const s = new Sessao();
    ok(s, 'obra.definir', { nome: 'OpenSees' });
    ok(s, 'pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
    ok(s, 'pavimento.criar', { nome: 'P1', cota: 3, uso: 'comum' });
    ok(s, 'pavimento.criar', { nome: 'P2', cota: 6, uso: 'comum' });
    for (const [x, y] of [[0, 0], [8, 0], [0, 6], [8, 6]]) ok(s, 'pilar.inserir', { x, y, secao: { tipo: 'ret', b: 0.4, h: 0.4 } });
    const [, p1, p2] = s.modelo.pavimentos;
    const v = (pav: { id: string; grupo: string }, a: number[], z: number[]) => ({ nome: 'viga.tracar', params: { grupo: pav.grupo, pontos: [a, z], secao: { b: 0.2, h: 0.5 } } });
    ok(s, 'lote', { comandos: [v(p1, [0, 6], [8, 6]), v(p2, [0, 0], [0, 6]), v(p2, [8, 0], [8, 6])] });
    ok(s, 'opcoes.definir', { valores: { engasteTopoUltimo: 1 } });
    for (const x of s.modelo.vigas) ok(s, 'viga.editar', { id: x.id, vinculoIni: 'engaste', vinculoFim: 'engaste' }); // sem liberações (o script do OpenSees não as exporta)
    // pilar a pilar, e de um ponto de viga a um pilar (com carga concentrada)
    ok(s, 'inclinada.criar', { pavIni: p1.id, pavFim: p2.id, pIni: [0, 0], pFim: [8, 0], secao: { b: 0.25, h: 0.5 }, cargas: [{ caso: 'G', tipo: 'linear', valor: 15 }] });
    ok(s, 'inclinada.criar', { pavIni: p1.id, pavFim: p2.id, pIni: [4, 6], pFim: [8, 6], secao: { b: 0.2, h: 0.4 }, cargas: [{ caso: 'G', tipo: 'concentrada', valor: 50, de: 1.5 }] });
    const an = analisarEdificio(s.modelo, { modeloGlobal: 0 });
    expect(an.erro).toBeUndefined();
    expect(an.avisos.filter((a) => a.includes('inclinada'))).toEqual([]);
    expect(an.inclinadas!.map((i) => i.ligacao.map((l) => l.tipo))).toEqual([['pilar', 'pilar'], ['viga', 'pilar']]);
    const PROC = 'node:process', FS = 'node:fs';
    const env = ((await import(/* @vite-ignore */ PROC)) as { env: Record<string, string | undefined> }).env;
    const m = an.portico.modelo, c = an.portico.casos![0];
    if (env.GERAR_OPENSEES) {
      const fs = (await import(/* @vite-ignore */ FS)) as { writeFileSync: (p: string, d: string) => void };
      fs.writeFileSync('validation/opensees/viga_inclinada.modelo.json', JSON.stringify({
        nos: m.nos, apoios: [...m.apoios], escravos: m.escravos,
        barras: m.barras.map((b) => ({ i: b.i, j: b.j, E: b.E, G: b.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, ref: b.ref ?? null, offI: b.offI ?? null, offJ: b.offJ ?? null, eng: !!(b.engI?.length || b.engJ?.length || b.libI?.length || b.libJ?.length) })),
        nodais: c.nodais, distribuidas: c.distribuidas, pontuais: c.pontuais ?? [],
      }));
    }
    const R = ref as { nos: number; desloc: number[][] };
    expect(R.nos).toBe(m.nos.length);
    const u = an.portico.res!.desloc[0];
    let e = 0, mx = 0;
    R.desloc.forEach((d, n) => { for (let k = 0; k < 6; k++) { e = Math.max(e, Math.abs(u[n * 6 + k] - d[k])); mx = Math.max(mx, Math.abs(d[k])); } });
    expect(e / mx).toBeLessThan(1e-8);
    // o mesmo modelo resolvido de novo pelo solver dá os mesmos deslocamentos (sem funções nem estado escondido)
    const r2 = resolver3(m as Modelo3, [c]);
    expect(Math.abs(r2.desloc[0][6] - u[6])).toBeLessThan(1e-12);
    expect(barrasDaInclinada(s.modelo, s.modelo.vigasInclinadas![0])).toHaveLength(1);
  }, 120000);
});

describe('listagem, revisão e prancha', () => {
  function pronto() {
    const { s, p1, p2, L } = doisPilares(8, 0.8);
    ok(s, 'inclinada.criar', { pavIni: p1, pavFim: p2, pIni: [0, 0], pFim: [L, 0], secao: { b: 0.3, h: 0.6 }, cargas: [{ caso: 'G', tipo: 'linear', valor: 20 }, { caso: 'Q', tipo: 'linear', valor: 10 }] });
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    return { s, an, dim };
  }
  it('listagem: materiais, esforços por hipótese e combinação, envoltória e resultado', () => {
    const { s, an, dim } = pronto();
    const elu = combinacoesDoEstado(s.modelo, an, 'concreto', combinacoesEdificio(s.modelo, an));
    const l = listagemInclinada(s.modelo, an, dim.inclinadas![0], elu, (bi, xs) => porCaso(an, bi, xs))!;
    expect(l.materiais.fck).toBe(30);
    expect(Object.keys(l.casos)).toEqual(expect.arrayContaining(['G', 'Q']));
    expect(l.combinacoes.length).toBe(elu.length);
    expect(l.envoltoria).toHaveLength(21);
    // a combinação 1,4·G + 1,4·Q tem Mz = 1,4 (MG + MQ) em cada estação
    const cb = elu.find((c) => c.fatores.G === 1.4 && c.fatores.Q === 1.4)!;
    const k = l.combinacoes.find((c) => c.nome === cb.nome)!;
    expect(k.estacoes[10].Mz).toBeCloseTo(Object.entries(cb.fatores).reduce((t, [n, f]) => t + f * (l.casos[n]?.[10].Mz ?? 0), 0), 6);
    expect(l.erros.some((m) => m.includes('nós'))).toBe(false);
  });
  it('revisão: inclinada reprovada aparece com código e tipo próprio', () => {
    const { s } = pronto();
    ok(s, 'inclinada.editar', { id: s.modelo.vigasInclinadas![0].id, secao: { b: 0.14, h: 0.2 } });
    ok(s, 'inclinada.armadura', { id: s.modelo.vigasInclinadas![0].id, sup: { n: 2, phi: 10 }, inf: { n: 2, phi: 10 }, estribo: { phi: 5, s: 0.2 } });
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an), rev = revisarEdificio(s.modelo, an, dim);
    const it = rev.itens.filter((i) => i.tipo === 'inclinada');
    expect(it.some((i) => i.nivel === 'erro')).toBe(true);
    expect(it.every((i) => i.codigo.startsWith('INCLINADA_') && i.sugestao)).toBe(true);
    expect(rev.porElemento.get(`inclinada|${s.modelo.vigasInclinadas![0].id}`)).toBe('erro');
  });
  it('prancha de vigas do grupo inicial leva a elevação, a seção e o aço da inclinada', () => {
    const { s, an, dim } = pronto();
    const folhas = montarPranchasVigas(s.modelo, an, dim);
    expect(folhas.length).toBeGreaterThan(0);
    const f = folhas.find((x) => x.elementos?.some((e) => e.startsWith('VI1')))!;
    expect(f).toBeDefined();
    expect(JSON.stringify([f.modelo, f.papel])).toContain('VIGA INCLINADA DESENVOLVIDA');
    expect(f.aco!.tabela.length).toBeGreaterThan(0);
    const kg = dim.resumoAcoInclinadas!.reduce((t, x) => t + x.peso, 0);
    expect(kg).toBeCloseTo(dim.detalhesInclinadas![0].peso / 1.1, 1);
  });
  it('memorial: lista, envoltória, armaduras e o aviso dos nós', () => {
    const { s, dim } = pronto();
    const m = memorialInclinadas(s.modelo, dim);
    expect(m.tabelas.map((t) => t.id)).toEqual(['lista', 'esforcos', 'armaduras']);
    expect(m.tabelas[0].linhas[0].slice(0, 3)).toEqual(['VI1', 'P1 → P2', '30×60 cm']);
    expect(m.tabelas[2].linhas[0][1]).toBe(dim.inclinadas![0].armadura);
    expect(m.notas.join(' ')).toContain('nós de extremidade');
    expect(memorialInclinadas(s.modelo, null).tabelas.map((t) => t.id)).toEqual(['lista']);
    expect(memorialInclinadas(doisPilares().s.modelo, null).tabelas).toEqual([]);
  });
});
