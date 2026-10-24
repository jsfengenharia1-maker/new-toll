// Escadas na cena 3D (E4e, C8.37): um objeto por lance, volume coerente com o do cálculo, filtros por pavimento e tipo.
import { describe, expect, it } from 'vitest';
import { geometriaEscadas } from '../building/escadas';
import { edificioExemplo } from '../sheets/exemplo';
import { construirCena } from './cena';

function comEscada() {
  const s = edificioExemplo();
  const r = s.executar('escada.criar', { id: 'e1', grupo: 'g_3', origem: [2, 1], angulo: 90, piso: 0.2967, espelho: 0.5 / 3, lances: [{ tipo: 'pre:meia-volta-9-9' }] });
  expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
  return s.modelo;
}

describe('E4e: escada na vista 3D', () => {
  const b = comEscada(), geo = geometriaEscadas(b)[0];
  const cena = construirCena(b);
  const objs = cena.objetos.filter((o) => o.tipo === 'escada');

  it('obra sem escada: nenhum objeto de escada', () => {
    expect(construirCena(edificioExemplo().modelo).objetos.some((o) => o.tipo === 'escada')).toBe(false);
  });

  it('um objeto por lance, com o pavimento de partida, o grupo e o nome', () => {
    expect(objs).toHaveLength(geo.lances.length);
    expect(cena.contagens.porTipo.escada).toBe(geo.lances.length);
    const o = objs[0];
    expect(o.elemento).toBe('e1');
    expect(o.grupo).toBe('g_3');
    expect(o.nome).toBe('E1 · lance 1');
    expect(o.pavimento).toBe(geo.lances[0].pavimento);
    expect(o.descricao).toContain('18 degraus');
    expect(o.id).toBe(`escada:e1-1:${geo.lances[0].pavimento}`);
  });

  it('malha fechada: volume positivo, próximo do volume de concreto do cálculo (laje + degraus), e cotas entre a base e o topo', () => {
    const o = objs[0], l = geo.lances[0];
    expect(o.volume!).toBeGreaterThan(0);
    expect(Math.abs(o.volume! / l.cargas.volumeConcreto - 1)).toBeLessThan(0.15);
    const zs = o.pos.filter((_, i) => i % 3 === 2);
    expect(Math.min(...zs)).toBeLessThan(l.cotaBase);
    expect(Math.max(...zs)).toBeLessThanOrEqual(l.cotaTopo + 1e-6);
    expect(Math.max(...zs)).toBeGreaterThan(l.cotaTopo - geo.escada.espelho - 0.01); // o último degrau é formado pelo patamar de chegada
    expect(o.idx.length % 3).toBe(0);
    expect(Math.max(...o.idx)).toBeLessThan(o.pos.length / 3);
    expect(o.linhas.length).toBeGreaterThan(60);
  });

  it('filtros: por tipo e por pavimento', () => {
    expect(construirCena(b, { tipos: ['escada'] }).objetos.every((o) => o.tipo === 'escada')).toBe(true);
    expect(construirCena(b, { tipos: ['pilar'] }).objetos.some((o) => o.tipo === 'escada')).toBe(false);
    const outro = b.pavimentos.find((p) => p.id !== geo.lances[0].pavimento)!;
    expect(construirCena(b, { pavimentos: [outro.id] }).objetos.some((o) => o.tipo === 'escada')).toBe(false);
    expect(construirCena(b, { pavimentos: [geo.lances[0].pavimento!] }).objetos.some((o) => o.tipo === 'escada')).toBe(true);
  });

  it('a caixa da cena inclui a escada', () => {
    const o = objs[0];
    const xs = o.pos.filter((_, i) => i % 3 === 0);
    expect(cena.limites.min[0]).toBeLessThanOrEqual(Math.min(...xs) + 1e-9);
    expect(cena.limites.max[0]).toBeGreaterThanOrEqual(Math.max(...xs) - 1e-9);
  });
});
