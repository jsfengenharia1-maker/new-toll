// L7: pano automático (C7.2) e pano apagado = abertura (K1.9.103).
import { describe, expect, it } from 'vitest';
import { Sessao } from '../commands';
import { edificioVazio } from './types';
import { diagnosticosLajes } from './lajes';

const V = (g: string, pontos: number[][]) => ({ nome: 'viga.tracar', params: { grupo: g, pontos, secao: { b: 0.15, h: 0.4 } } });
const DET = (g: string) => ({ nome: 'laje.detectarPanos', params: { grupo: g, definir: true } });
const area = (c: [number, number][]) => Math.abs(c.reduce((a, p, i) => { const q = c[(i + 1) % c.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

function obra() {
  const s = new Sessao(edificioVazio());
  const r = s.executar('grupo.criar', { nome: 'Tipo' });
  expect(r.ok, r.erros.map((e) => e.mensagem).join()).toBe(true);
  return { s, g: s.modelo.grupos.at(-1)!.id };
}

describe('L7: pano a definir ao fechar o contorno e pano apagado', () => {
  it('lote [viga, detectarPanos definir] cria o pano a definir só quando o contorno fecha', () => {
    const { s, g } = obra();
    expect(s.executar('lote', { comandos: [V(g, [[0, 0], [4, 0]]), V(g, [[4, 0], [4, 3]]), V(g, [[4, 3], [0, 3]])] }).ok).toBe(true);
    expect(s.executar('lote', { comandos: [V(g, [[0, 0], [4, 0]]), DET(g)] }).ok).toBe(false);
    const r = s.executar('lote', { comandos: [V(g, [[0, 3], [0, 0]]), DET(g)] });
    expect(r.ok, r.erros.map((e) => e.mensagem).join()).toBe(true);
    expect(s.modelo.lajes).toHaveLength(1);
    expect(s.modelo.lajes[0].definir).toBe(true);
    expect(area(s.modelo.lajes[0].contorno)).toBeCloseTo(12, 6);
  });

  it('apagar o pano remove a laje, vira abertura e a detecção não o recria', () => {
    const { s, g } = obra();
    expect(s.executar('lote', { comandos: [V(g, [[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]]), DET(g)] }).ok).toBe(true);
    expect(s.modelo.lajes).toHaveLength(1);
    expect(diagnosticosLajes(s.modelo).some((d) => d.codigo === 'DEFINIR_PANO')).toBe(true);
    expect(s.executar('laje.apagarPano', { ids: [s.modelo.lajes[0].id] }).ok).toBe(true);
    expect(s.modelo.lajes).toHaveLength(0);
    expect(s.modelo.panosVazios).toHaveLength(1);
    const d = diagnosticosLajes(s.modelo).map((x) => x.codigo);
    expect(d).not.toContain('PANO_SEM_LAJE');
    expect(d).not.toContain('DEFINIR_PANO');
    expect(s.executar('laje.detectarPanos', { grupo: g, definir: true }).ok).toBe(false);
    expect(s.executar('laje.restaurarPano', { ids: [s.modelo.panosVazios![0].id] }).ok).toBe(true);
    expect(s.modelo.panosVazios).toBeUndefined();
    expect(s.modelo.lajes[0].definir).toBe(true);
    s.desfazer();
    expect(s.modelo.panosVazios).toHaveLength(1);
  });

  it('criar uma laje sobre a abertura a remove', () => {
    const { s, g } = obra();
    expect(s.executar('lote', { comandos: [V(g, [[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]]), DET(g)] }).ok).toBe(true);
    s.executar('laje.apagarPano', { ids: [s.modelo.lajes[0].id] });
    expect(s.executar('laje.criar', { grupo: g, ponto: [2, 1.5], tipo: { tipo: 'macica', h: 0.12 } }).ok).toBe(true);
    expect(s.modelo.panosVazios).toBeUndefined();
    expect(s.modelo.lajes).toHaveLength(1);
  });
});
