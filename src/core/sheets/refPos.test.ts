import { describe, expect, it } from 'vitest';
import { aplicarComando } from '../commands';
import { montarPranchas } from './prancha';
import { edificioExemplo } from './exemplo';
import { deslocamentoPorCliques, pontoRef, textosVisiveis } from '../building/vistaObra';

describe('referências deslocadas nas pranchas (L4)', () => {
  it('o texto do pilar e o da laje acompanham o deslocamento; o resto não muda', () => {
    const b0 = edificioExemplo().modelo;
    const alvo = b0.pilares[0], laje = b0.lajes[0];
    let b = aplicarComando(b0, 'ref.mover', { id: alvo.id, dx: 0.4, dy: -0.3 }).modelo;
    b = aplicarComando(b, 'ref.mover', { id: laje.id, dx: 0.2, dy: 0.1 }).modelo;
    const txt = (m: typeof b0, nome: string) => montarPranchas(m, {}).flatMap((p) => p.modelo).filter((q) => q.t === 'txt' && q.s === nome);
    const antes = txt(b0, alvo.nome), depois = txt(b, alvo.nome);
    expect(depois.length).toBe(antes.length);
    expect(depois.length).toBeGreaterThan(0);
    antes.forEach((q, i) => {
      const r = depois[i];
      if (q.t !== 'txt' || r.t !== 'txt') return;
      expect(r.p[0] - q.p[0]).toBeCloseTo(0.4, 9); expect(r.p[1] - q.p[1]).toBeCloseTo(-0.3, 9);
    });
    const l0 = txt(b0, laje.nome)[0], l1 = txt(b, laje.nome)[0];
    if (l0.t === 'txt' && l1.t === 'txt') { expect(l1.p[0] - l0.p[0]).toBeCloseTo(0.2, 9); expect(l1.p[1] - l0.p[1]).toBeCloseTo(0.1, 9); }
  });

  it('pontoRef, textosVisiveis e deslocamento pelos dois cliques', () => {
    const b0 = edificioExemplo().modelo;
    const id = b0.pilares[0].id;
    expect(pontoRef(b0, id, [1, 2])).toEqual([1, 2]);
    expect(textosVisiveis(b0)).toHaveLength(5);
    const d = deslocamentoPorCliques(b0, id, [1, 1], [1.5, 0.5]);
    expect(d).toEqual({ dx: 0.5, dy: -0.5 });
    const b = aplicarComando(b0, 'ref.mover', { id, ...d }).modelo;
    expect(pontoRef(b, id, [1, 2])).toEqual([1.5, 1.5]);
    expect(deslocamentoPorCliques(b, id, [3, 3], [3, 3])).toEqual(d);
  });
});

import { ancoraMaisProxima, ancorasRef } from '../building/vistaObra';
describe('âncoras dos textos de referência', () => {
  it('uma por pilar, viga e laje do pavimento, com o deslocamento; acha a mais próxima', () => {
    const b0 = edificioExemplo().modelo;
    const pav = b0.pavimentos.find((p) => p.nome !== b0.pavimentos[0].nome)!.id;
    const a0 = ancorasRef(b0, pav);
    expect(a0.filter((a) => a.tipo === 'pilar').length).toBeGreaterThan(0);
    expect(a0.filter((a) => a.tipo === 'viga').length).toBeGreaterThan(0);
    expect(a0.filter((a) => a.tipo === 'laje').length).toBeGreaterThan(0);
    const alvo = a0.find((a) => a.tipo === 'pilar')!;
    expect(ancoraMaisProxima(a0, [alvo.ponto[0] + 0.05, alvo.ponto[1]], 0.3)?.id).toBe(alvo.id);
    expect(ancoraMaisProxima(a0, [alvo.ponto[0] + 100, alvo.ponto[1]], 0.3)).toBeNull();
    const b = aplicarComando(b0, 'ref.mover', { id: alvo.id, dx: 1, dy: 2 }).modelo;
    const a1 = ancorasRef(b, pav).find((a) => a.id === alvo.id)!;
    expect(a1.ponto[0] - alvo.ponto[0]).toBeCloseTo(1, 9);
    expect(a1.ponto[1] - alvo.ponto[1]).toBeCloseTo(2, 9);
  });
});
