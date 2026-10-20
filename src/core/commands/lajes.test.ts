import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from './index';
import { verificar } from '../building/verify';
import { direcaoMenorVao, paredesDaMascara, propriedadesLaje, vaos } from '../building/lajes';
import { areaPoligono } from '../geom/faces';

function padrao(): Sessao {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  return s;
}
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const sec = { b: 0.15, h: 0.4 };

/** Planta 8 × 5 com viga intermediária em x = 3; vigas de borda alinhadas pela face externa. */
function planta() {
  const s = padrao();
  ok(s, 'lote', { comandos: [
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0, 0], [8, 0]], secao: sec, alinhamento: 'dir' } }, // face externa (direita, olhando para +x) em y = 0
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[8, 0], [8, 5]], secao: sec, alinhamento: 'dir' } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[8, 5], [0, 5]], secao: sec, alinhamento: 'dir' } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[0, 5], [0, 0]], secao: sec, alinhamento: 'dir' } },
    { nome: 'viga.tracar', params: { grupo: 'g_3', pontos: [[3, 0], [3, 5]], secao: sec } },
  ] });
  return s;
}

describe('lajes', () => {
  it('panos pelo eixo das vigas, com cantos de vigas alinhadas pela face', () => {
    const s = planta();
    expect(verificar(s.modelo).filter((d) => d.codigo === 'PANO_SEM_LAJE')).toHaveLength(2);
    ok(s, 'laje.detectarPanos', { grupo: 'g_3' });
    const areas = s.modelo.lajes.map((l) => Math.abs(areaPoligono(l.contorno))).sort((a, z) => a - z);
    // eixos das bordas a 7,5 cm para dentro: 0,075 … 7,925 × 0,075 … 4,925
    expect(areas[0]).toBeCloseTo(2.925 * 4.85, 6); expect(areas[1]).toBeCloseTo(4.925 * 4.85, 6);
    expect(s.modelo.lajes.map((l) => l.nome)).toEqual(['L1', 'L2']);
    expect(verificar(s.modelo).filter((d) => d.codigo.startsWith('PANO') || d.codigo.startsWith('LAJE'))).toEqual([]);
    expect(s.executar('laje.detectarPanos', { grupo: 'g_3' }).erros[0].codigo).toBe('SEM_PANOS_NOVOS');
  });

  it('pano sem laje: aviso com correção; laje sobreposta é erro; treliçada fora de pano é erro', () => {
    const s = planta();
    const d = verificar(s.modelo).find((x) => x.codigo === 'PANO_SEM_LAJE')!;
    ok(s, d.sugestao!.comando, d.sugestao!.params);
    expect(s.modelo.lajes[0].tipo).toEqual({ tipo: 'macica', h: 0.1 });
    expect(s.executar('laje.criar', { grupo: 'g_3', ponto: d.sugestao!.params.ponto as number[] }).erros[0].codigo).toBe('LAJE_EXISTENTE');
    ok(s, 'laje.detectarPanos', { grupo: 'g_3' }); // o outro pano
    ok(s, 'laje.criar', { grupo: 'g_3', contorno: [[7, 4], [10, 4], [10, 6], [7, 6]] }); // sobre a L1/L2 e para fora
    ok(s, 'laje.criar', { grupo: 'g_3', contorno: [[8, 1], [9.5, 1], [9.5, 2], [8, 2]], tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } }); // balanço
    const c = verificar(s.modelo).map((x) => x.codigo);
    expect(c).toContain('LAJES_SOBREPOSTAS');
    expect(c).toContain('TRELICADA_SEM_APOIO');
  });

  it('treliçada: direção no menor vão, peso próprio e vãos', () => {
    const s = planta();
    ok(s, 'laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
    const l = s.modelo.lajes.find((x) => Math.abs(areaPoligono(x.contorno)) < 15)!; // 2,925 × 4,85: vigotas em x
    expect(l.direcao).toBe(0);
    const [v1, v2] = vaos(l);
    expect(v1).toBeCloseTo(2.925); expect(v2).toBeCloseTo(4.85);
    const p = propriedadesLaje({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 });
    expect(p.h).toBeCloseTo(0.16);
    // 25 × (0,04 + 0,09 × 0,12 / 0,42) + 0,2 × 0,33 × 0,12 / 0,42
    expect(p.pp).toBeCloseTo(25 * (0.04 + (0.09 * 0.12) / 0.42) + (0.2 * 0.33 * 0.12) / 0.42, 6);
    expect(direcaoMenorVao([[0, 0], [2, 0], [2, 6], [0, 6]])).toBe(0);
    expect(direcaoMenorVao([[0, 0], [6, 0], [6, 2], [0, 2]])).toBe(90);
  });
});

describe('cargas', () => {
  const ALV = { ALV: { linhas: [0, 0, 400, 0, 0, 15, 400, 15, 600, 0, 600, 300, 614, 0, 614, 300, 0, 50, 50, 50], arcos: [], textos: [] } };

  it('alvenaria da máscara: pares de linhas paralelas viram cargas G = γ × e × altura', () => {
    const s = padrao();
    ok(s, 'mascara.importar', { grupo: 'g_3', nome: 'Arq', geo: ALV, escala: 0.01, centralizar: false });
    expect(paredesDaMascara(s.modelo, 'g_3', 'ALV').map((w) => w.e)).toEqual([0.15, 0.14]);
    const r = ok(s, 'carga.alvenariaDaMascara', { grupo: 'g_3', camada: 'ALV' });
    // altura: do Tipo 1 (primeiro do grupo) ao Tipo 2 = 3,0 m, menos a viga padrão de 0,5 m (sem vigas no grupo de cima)
    expect(r.mensagem).toMatch(/2 trecho\(s\) de alvenaria \(7 m, altura 2,5 m\)/);
    const cs = s.modelo.cargas;
    expect(cs.map((c) => c.pontos)).toEqual([[[0, 0.075], [4, 0.075]], [[6.07, 0], [6.07, 3]]]);
    expect(cs[0].valor).toBeCloseTo(13 * 0.15 * cs[0].origem!.altura);
    // regenerar substitui as anteriores da mesma camada
    ok(s, 'carga.alvenariaDaMascara', { grupo: 'g_3', camada: 'ALV', bloco: 'concreto', altura: 2.6 });
    expect(s.modelo.cargas).toHaveLength(2);
    expect(s.modelo.cargas[0].valor).toBeCloseTo(14 * 0.15 * 2.6);
  });

  it('ponto, linha e área com o caso padrão; edição tira a origem automática', () => {
    const s = padrao();
    ok(s, 'carga.ponto', { grupo: 'g_3', ponto: [1, 1], valor: 15 });
    ok(s, 'carga.linha', { grupo: 'g_3', pontos: [[0, 0], [2, 0]], valor: 4 });
    ok(s, 'carga.area', { grupo: 'g_3', contorno: [[0, 0], [0, 2], [2, 2], [2, 0]], valor: 3 });
    expect(s.modelo.cargas.map((c) => [c.tipo, c.caso])).toEqual([['ponto', 'Q'], ['linha', 'G'], ['area', 'Q']]);
    expect(areaPoligono(s.modelo.cargas[2].pontos)).toBeGreaterThan(0); // anti-horário
  });
});
