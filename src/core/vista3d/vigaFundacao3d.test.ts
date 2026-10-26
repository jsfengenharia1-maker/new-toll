// Vista 3D isolada da viga de fundação (V6c, C11.49): cena reduzida à viga e às pontas, com valores esperados da geometria.
import { beforeAll, describe, expect, it } from 'vitest';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import type { Sessao } from '../commands';
import { edificioExemplo } from '../sheets/exemplo';
import { cenaDaVigaFundacao } from './vigaFundacao3d';

let s: Sessao, dim: Dimensionamento;

beforeAll(() => {
  s = edificioExemplo();
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); if (!r.ok) throw new Error(`${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`); return r; };
  ok('fundacao.terreno', { sigmaAdm: 300, estacas: [{ id: 'e1', tipo: 'helice', D: 40, modo: 'informada', capacidade: 500 }] });
  const P = s.modelo.pilares;
  ok('pilar.editar', { id: P[0].id, ajuste: 'o' });
  ok('fundacao.criar', { pilar: P[0].id, tipo: 'sapata', posicao: 'divisa' });
  ok('fundacao.criar', { pilar: P[3].id, tipo: 'sapata' });
  ok('vigaFundacao.criar', { tipo: 'equilibrio', ini: s.modelo.fundacao!.elementos[0].id, fim: s.modelo.fundacao!.elementos[1].id });
  dim = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
});

describe('vista 3D da viga de fundação', () => {
  it('cena: o sólido da viga (L × b × h) e os dois elementos das pontas; nada mais', () => {
    const b = s.modelo, rv = dim.vigasFundacao![0], v = b.fundacao!.vigas![0];
    const r = cenaDaVigaFundacao(b, dim, v.id);
    expect(r.viga).not.toBeNull();
    expect(r.viga!.subtipo).toBe('vigaFundacao');
    // sólido: prisma de eixo a eixo (L) × largura × altura adotadas
    expect(r.viga!.volume).toBeCloseTo(rv.L * rv.bAdot * rv.hAdot, 6);
    expect(r.topo - r.base).toBeCloseTo(rv.hAdot, 9);
    expect(r.apoios.map((a) => a.nome)).toEqual([rv.ini, rv.fim]);
    expect(r.cena.objetos.every((o) => o.subtipo === 'vigaFundacao' || r.apoios.some((a) => a.id === o.elemento))).toBe(true);
    expect(r.cena.objetos.filter((o) => o.subtipo === 'sapata')).toHaveLength(2);
    expect(r.cena.contagens.total).toBe(3);
    expect(r.cena.contagens.porTipo.fundacao).toBe(3);
    // limites envolvem a viga e vão do pé das sapatas ao topo
    const { min, max } = r.cena.limites;
    for (let i = 0; i < r.viga!.pos.length; i += 3) for (let k = 0; k < 3; k++) { expect(r.viga!.pos[i + k]).toBeGreaterThanOrEqual(min[k] - 1e-9); expect(r.viga!.pos[i + k]).toBeLessThanOrEqual(max[k] + 1e-9); }
    expect(max[2]).toBeCloseTo(r.topo, 6);
  });

  it('sem cálculo das fundações: cena vazia, sem viga; id inexistente também', () => {
    const v = s.modelo.fundacao!.vigas![0];
    const sem = cenaDaVigaFundacao(s.modelo, null, v.id);
    expect(sem.viga).toBeNull();
    expect(sem.cena.contagens.total).toBe(0);
    expect(sem.cena.limites).toEqual({ min: [0, 0, 0], max: [0, 0, 0] });
    const nao = cenaDaVigaFundacao(s.modelo, dim, 'nao_existe');
    expect(nao.viga).toBeNull();
    expect(nao.apoios).toEqual([]);
    expect(nao.cena.objetos).toEqual([]);
  });
});
