// Escadas nas formas, na locação e no DXF (E4b): camada ESCADAS com contorno, seta de subida e nome; obra sem escada não muda.
import { describe, expect, it } from 'vitest';
import { edificioExemplo } from './exemplo';
import { escreverDxf } from './dxf';
import { montarPranchaLocacao } from './locacao';
import { montarPranchas } from './prancha';
import { geometriaEscada, tiposLanceDisponiveis } from '../building/escadas';
import { desenhoPlantaEscada } from '../building/escadasEdicao';
import { lerDxf } from '../dxf/read';

function comEscada() {
  const s = edificioExemplo();
  const r = s.executar('escada.criar', { id: 'e1', grupo: 'g_3', origem: [2, 1], angulo: 90, piso: 0.2967, espelho: 0.5 / 3, lances: [{ tipo: 'pre:meia-volta-9-9' }] });
  expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
  return s;
}

describe('E4b: escadas nas pranchas', () => {
  it('obra sem escada: nenhuma primitiva da camada ESCADAS', () => {
    const s = edificioExemplo();
    expect(montarPranchas(s.modelo)[0].modelo.some((p) => p.c === 'ESCADAS')).toBe(false);
  });

  it('formas: contornos fechados, degraus finos, setas e o nome da escada', () => {
    const s = comEscada(), b = s.modelo;
    const d = desenhoPlantaEscada(geometriaEscada(b.escadas![0], tiposLanceDisponiveis(b), b));
    const m = montarPranchas(b)[0].modelo;
    const esc = m.filter((p) => p.c === 'ESCADAS');
    expect(esc.filter((p) => p.t === 'pl' && p.fechada).length).toBe(d.contornos.length);
    expect(esc.filter((p) => p.t === 'pl' && !p.fechada).length).toBe(d.setas.length);
    expect(esc.some((p) => p.t === 'txt' && p.s === 'E1')).toBe(true);
    expect(m.filter((p) => p.c === 'FORMA-FINA' && p.t === 'pl' && p.pts.length === 2).length).toBeGreaterThanOrEqual(d.degraus.length);
  });

  it('locação: a escada aparece com o nome', () => {
    const s = comEscada();
    const pr = montarPranchaLocacao(s.modelo, null)!;
    expect(pr.modelo.some((p) => p.c === 'ESCADAS' && p.t === 'txt' && p.s === 'E1')).toBe(true);
  });

  it('DXF: camada ESCADAS com polilinhas e o nome', () => {
    const s = comEscada();
    const bytes = escreverDxf(montarPranchas(s.modelo)[0]);
    const dx = lerDxf(Array.from(bytes, (c) => String.fromCharCode(c)).join(''));
    const cam = dx.camadas.ESCADAS;
    expect(cam).toBeDefined();
    expect(cam.textos.map((t) => t.t)).toContain('E1');
    expect(cam.linhas.length / 4).toBeGreaterThanOrEqual(1);
  });
});
