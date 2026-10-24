// E4c: escadas com patamar de giro (L, meia-volta com degraus no patamar e apoio elástico) contra o OpenSees (ShellMITC4 numa
// malha 4 vezes mais fina). O cenário é exportado daqui (GERAR_OPENSEES=1) para validation/opensees/escada.modelo.json, o
// script validation/opensees/escada.py grava escada.json e este teste compara reações por apoio e flechas nos pontos de prova.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { calcularEscadas } from './escadasCalculo';
import ref from '../../../validation/opensees/escada.json';

const E = 0.5 / 3, PISO = 0.2967;

interface Cenario { nome: string; tipo: Record<string, unknown>; lance?: Record<string, unknown>; escada?: Record<string, unknown> }
const CENARIOS: Cenario[] = [
  { nome: 'L com conectores (apoio rígido) na borda frontal do primeiro patamar', tipo: { tipologia: 'quartoVolta3', trechos: [6, 6, 6], espessura: 0.15 }, lance: { patamares: [{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'conector', largura: 0.15 }] }] } },
  { nome: 'lance reto de 18 degraus, biapoiado', tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } },
  { nome: 'L de três trechos (quarto de volta 6 + 6 + 6), patamares livres', tipo: { tipologia: 'quartoVolta3', trechos: [6, 6, 6], espessura: 0.15 } },
  { nome: 'L com parede de alvenaria na borda frontal do primeiro patamar', tipo: { tipologia: 'quartoVolta3', trechos: [6, 6, 6], espessura: 0.15 }, lance: { patamares: [{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'alvenaria', largura: 0.15 }] }] } },
  { nome: 'meia-volta 9 + 9 com poço de 10 cm e 2 degraus no patamar', tipo: { tipologia: 'meiaVolta2', trechos: [9, 9], poco: 0.1, degrausPatamar: 2, espessura: 0.15 } },
];

function resolver(c: Cenario) {
  const s = new Sessao();
  for (const x of comandosEdificioPadrao()) s.executar(x.nome, x.params, 'sistema');
  expect(s.executar('tipoLance.criar', { id: 'T', tipo: { nome: 'T', ...c.tipo } }).ok).toBe(true);
  expect(s.executar('escada.criar', { id: 'e1', grupo: 'g_3', origem: [0, 0], angulo: 0, piso: PISO, espelho: E, ...c.escada, lances: [{ tipo: 'T', ...c.lance }] }).ok).toBe(true);
  const l = calcularEscadas(s.modelo, { detalhe: true }).lances[0];
  expect(l.erro).toBeUndefined();
  // pontos de prova: o centro de cada retângulo (o nó mais próximo)
  const d = l.descricao!;
  const sondas = d.rets.map((r) => {
    const cx = (r.c[0][0] + r.c[2][0]) / 2, cy = (r.c[0][1] + r.c[2][1]) / 2;
    const n = l.nosDetalhe!.reduce((m, q) => (Math.hypot(q.x - cx, q.y - cy) < Math.hypot(m.x - cx, m.y - cy) ? q : m));
    return [n.x, n.y];
  });
  return { l, d, sondas };
}

describe('E4c contra o OpenSees (ShellMITC4)', () => {
  const rs = CENARIOS.map(resolver);
  it('exporta o cenário para o OpenSees (só com GERAR_OPENSEES=1)', async () => {
    const PROC = 'node:process', FS = 'node:fs';
    const env = ((await import(/* @vite-ignore */ PROC)) as { env: Record<string, string | undefined> }).env;
    if (!env.GERAR_OPENSEES) return;
    const fs = (await import(/* @vite-ignore */ FS)) as { writeFileSync: (p: string, d: string) => void };
    const casos = rs.map((r, i) => ({
      nome: CENARIOS[i].nome, E: r.l.E, nu: 0.2, h: r.l.espessura, rets: r.d.rets, linhas: r.d.linhas, FX: r.d.FX, FY: r.d.FY, corrimao: r.d.corrimao, sondas: r.sondas,
    }));
    fs.writeFileSync('validation/opensees/escada.modelo.json', JSON.stringify({ casos }));
    expect(casos).toHaveLength(CENARIOS.length);
  });
  it('referência do OpenSees presente e do mesmo cenário (python3 validation/opensees/escada.py)', () => {
    expect(ref.casos.map((c) => c.nome)).toEqual(CENARIOS.map((c) => c.nome));
  });
  CENARIOS.forEach((c, i) => {
    const r = rs[i];
    it(`${c.nome}: carga total, reações por apoio e flechas`, () => {
      const o = ref.casos[i];
      expect(o.nome).toBe(c.nome);
      expect(r.l.carga.G / o.carga).toBeCloseTo(1, 6);
      expect(Math.abs(r.l.equilibrio.G)).toBeLessThan(1e-7);
      const nos = r.l.nosDetalhe!;
      for (const a of r.l.apoios) {
        const ra = (o.reacoes as Record<string, number>)[a.id];
        expect(ra, `reação ${a.id}`).toBeDefined();
        expect(Math.abs(a.reacao.G / ra - 1), `${a.id}: ${a.reacao.G} × ${ra}`).toBeLessThan(0.01);
      }
      o.sondas.forEach((sd, k) => {
        const mais = nos.reduce((m, n) => (Math.hypot(n.x - sd.p[0], n.y - sd.p[1]) < Math.hypot(m.x - sd.p[0], m.y - sd.p[1]) ? n : m));
        expect(Math.hypot(mais.x - sd.p[0], mais.y - sd.p[1]), `sonda ${k}: nó coincidente`).toBeLessThan(1e-6);
        expect(Math.abs(mais.uz[0] / sd.uz - 1), `sonda ${k}: ${mais.uz[0]} × ${sd.uz}`).toBeLessThan(0.03);
      });
    });
  });
});
