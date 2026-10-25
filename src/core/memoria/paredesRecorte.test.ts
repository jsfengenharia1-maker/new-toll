// Memória detalhada (MD fase 7): parede com recorte do lance (E6d, K1.3.31). O trecho existente do lado em cada lance entra nas
// resultantes (centro sc) e na verificação global (seção com o comprimento do trecho).
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import { ok } from '../building/paredesFixtures';
import { pavimentosOrdenados } from '../building/types';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { memoriaDetalhada } from './edificio';
import type { PassoMemoria } from './registrador';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const igual = (a: number, b: number, msg = '') => expect(rel(a, b) < 1e-9 || Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`).toBe(true);
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const por = (ps: PassoMemoria[], el: string, topico: RegExp) => ps.filter((p) => p.elemento === el && topico.test(p.topico));

describe('MD7 · parede com recorte do lance de cima (K1.3.31, E6d)', () => {
  it('trecho existente [0; 4] m no lance de cima: centro sc = 2 m nas resultantes e seção de 4 m na verificação global', () => {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const ps0 = pavimentosOrdenados(s.modelo), [p1, p2] = [ps0[0].id, ps0[1].id];
    ok(s, 'parede.criar', { pontos: [[0, 0], [6, 0]], espessura: 0.2, morre: p2, porPavimento: [{ pavimento: p2, esq: 0.1, dir: 0.1, corteFim: 2 }] });
    const b = s.modelo, an = analisarEdificio(b);
    expect(an.erro).toBeUndefined();
    const dim = dimensionarEdificio(b, an, { fundacao: false }), mem = memoriaDetalhada(b, { an }).memoria, w = dim.armaduraParedes![0];
    const lance = (id: string) => b.pavimentos.find((p) => p.id === id)!.nome;
    const el1 = `Parede ${w.nome} · ${lance(p1)}`, el2 = `Parede ${w.nome} · ${lance(p2)}`;
    const alt = (el: string) => por(mem.passos, el, /^Esforços resultantes do lado/).find((p) => p.descricao.startsWith('Altura do painel'))!;
    igual(num(alt(el1), 'e1'), 6, 'e1 do lance de baixo'); igual(num(alt(el1), 'sc'), 3, 'sc do lance de baixo');
    igual(num(alt(el2), 'e0'), 0, 'e0'); igual(num(alt(el2), 'e1'), 4, 'e1 do lance de cima'); igual(num(alt(el2), 'sc'), 2, 'sc do lance de cima');
    const gl = por(mem.passos, el2, /^Verificação global do lado/).find((p) => /^Seção do lado/.test(p.descricao))!;
    igual(num(gl, 'L'), 4, 'comprimento da seção no lance recortado');
    igual(w.lados.find((l) => l.pavimento === p2 && l.modelo === 'casca')!.L, 4, 'L do resultado');
    const casoG = por(mem.passos, el2, /^Esforços resultantes do lado/).find((p) => p.entradas.caso === 'G')!;
    const fat = JSON.parse(casoG.entradas.elementos as string) as number[][];
    expect(Math.max(...fat.map((q) => q[1]))).toBeLessThanOrEqual(4 + 1e-9);
    expect(Math.min(...fat.map((q) => q[1]))).toBeGreaterThanOrEqual(-1e-9);
  }, 240000);
});
