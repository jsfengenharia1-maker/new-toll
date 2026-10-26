// E6b (C7.100): igualação da armadura superior das vigotas em cadeia também entre panos (valores à mão e cena de dois panos).
import { describe, expect, it } from 'vitest';
import { igualarSuperiorEntrePanos, type ConversaoMomentoArea, type PontaSuperior } from './vigotasArea';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { OPCOES_INFO, padraoDe } from './opcoes';

// conversão linear: As (cm²) = |M|/4
const lin: ConversaoMomentoArea = { areaDe: (M) => M / 4, momentoDe: (A) => 4 * A };
const ponta = (laje: string, faixa: number, k: 0 | 1, x: number, t: number, M: number, u: [number, number] = [1, 0]): PontaSuperior =>
  ({ laje, faixa, ponta: k, p: [x, t], u, largura: 1, M, conv: lin });

describe('igualação da armadura superior entre panos (à mão)', () => {
  // apoio em x = 3: o pano A chega pela ponta final (x = 3,0), o B sai pela inicial (x = 3,15, do outro lado da viga); o C está longe
  const base = [ponta('A', 0, 1, 3, 0.5, -4), ponta('A', 1, 1, 3, 1.5, -4.4), ponta('B', 0, 0, 3.15, 0.5, -8), ponta('B', 1, 0, 3.15, 1.5, -8), ponta('C', 0, 0, 10, 0.5, -1)];
  it('100 %, máximo: a cadeia A0 (1,0) → B0 (2,0) → A1 (1,1) → B1 (2,0) é um grupo; as menores sobem para 2,0 cm² (M = −8)', () => {
    const r = igualarSuperiorEntrePanos(base, 100, 1);
    expect([...r.keys()]).toEqual(['A']);
    expect(r.get('A')!.get('0|1')).toBeCloseTo(-8, 12);
    expect(r.get('A')!.get('1|1')).toBeCloseTo(-8, 12);
  });
  it('100 %, média: (1,0 + 2,0 + 1,1 + 2,0)/4 = 1,525 cm² → M = −6,1 em todas as pontas da linha', () => {
    const r = igualarSuperiorEntrePanos(base, 100, 2);
    for (const [l, k] of [['A', '0|1'], ['A', '1|1'], ['B', '0|0'], ['B', '1|0']]) expect(r.get(l)!.get(k)).toBeCloseTo(-6.1, 12);
    expect(r.has('C')).toBe(false);
  });
  it('30 %: vizinhas 1,0/2,0 diferem 50 % do maior → sem grupo; 55 % junta a cadeia toda', () => {
    expect(igualarSuperiorEntrePanos(base, 30, 1).size).toBe(0);
    // 1,0 → 2,0: 1,0 < 0,55·2,0 = 1,1; 2,0 → 1,1: 0,9 < 1,1; 1,1 → 2,0: 0,9 < 1,1 → um grupo; as duas pontas de A sobem
    expect(igualarSuperiorEntrePanos(base, 55, 1).get('A')!.size).toBe(2);
  });
  it('critério 0, linha de um só pano, vigotas não paralelas e vão grande ao longo do apoio não encadeiam', () => {
    expect(igualarSuperiorEntrePanos(base, 100, 0).size).toBe(0);
    expect(igualarSuperiorEntrePanos([ponta('A', 0, 1, 3, 0.5, -4), ponta('A', 1, 1, 3, 1.5, -8)], 100, 1).size).toBe(0);
    expect(igualarSuperiorEntrePanos([ponta('A', 0, 1, 3, 0.5, -4), ponta('B', 0, 0, 3.15, 0.5, -8, [0, 1])], 100, 1).size).toBe(0);
    // B a 4,5 m de A ao longo do apoio: (1 + 1)/2 + 0,6 = 1,6 m < 4,5 m → a cadeia se interrompe
    expect(igualarSuperiorEntrePanos([ponta('A', 0, 1, 3, 0.5, -4), ponta('B', 0, 0, 3.15, 5, -8)], 100, 1).size).toBe(0);
    // a mais de 0,6 m na direção das vigotas: outro apoio
    expect(igualarSuperiorEntrePanos([ponta('A', 0, 1, 3, 0.5, -4), ponta('B', 0, 0, 3.7, 0.5, -8)], 100, 1).size).toBe(0);
  });
});

/** Dois panos treliçados H12 (vãos 3 e 5 m, vigotas em x) entre vigas; o negativo mínimo p·ℓ²/16 difere de um pano para o outro. */
function cena(valores: Record<string, unknown>) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = [0, 3, 8];
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  ok('lote', { comandos: [[[0, 0], [8, 0]], [[0, 5], [8, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'trelicada', modelo: 'H12', capa: 0.04 } });
  ok('opcoes.definir', { valores });
  const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
  const xMin = (c: [number, number][]) => Math.min(...c.map((p) => p[0]));
  const lajes = [...s.modelo.lajes].sort((a, z) => xMin(a.contorno as [number, number][]) - xMin(z.contorno as [number, number][]));
  return lajes.map((l) => d.vigotas!.find((v) => v.laje === l.id)!);
}

describe('igualação da armadura superior entre panos (edifício)', () => {
  it('opção: padrão do sistema entre panos (programa de referência), padrão NBR só no pano', () => {
    const o = OPCOES_INFO.find((x) => x.chave === 'vigotaIgualacaoPanos')!;
    expect(padraoDe(o, 'sistema')).toBe(1);
    expect(padraoDe(o, 'nbr')).toBe(0);
  });
  it('com a igualação pela área, o negativo do apoio comum fica igual nos dois panos; só no pano (E5e) e sem a área (E3b), diferem', () => {
    const entre = cena({ vigotaIgualacaoBase: 1, vigotaIgualacaoPanos: 1 }), so = cena({ vigotaIgualacaoBase: 1, vigotaIgualacaoPanos: 0 });
    const e3b = cena({ vigotaIgualacaoBase: 0, vigotaIgualacaoPanos: 1 }), e3b0 = cena({ vigotaIgualacaoBase: 0, vigotaIgualacaoPanos: 0 });
    // só no pano: o apoio comum (fim do pano de 3 m, início do de 5 m) tem negativos diferentes (mínimo p·ℓ²/16 de cada vão)
    const a0 = so[0].grupos[0].esforcos.mNeg[1], b0 = so[1].grupos[0].esforcos.mNeg[0];
    expect(a0).toBeLessThan(0);
    expect(Math.abs(a0 - b0)).toBeGreaterThan(0.05);
    // entre panos (critério máximo, 100 %): o menor sobe para o maior (mesma seção H12 → mesmo momento); o maior não muda
    const a1 = entre[0].grupos[0].esforcos.mNeg[1], b1 = entre[1].grupos[0].esforcos.mNeg[0];
    expect(Math.abs(a1 - b1)).toBeLessThan(1e-6);
    expect(Math.abs(Math.min(a1, b1) - Math.min(a0, b0))).toBeLessThan(1e-6);
    // as pontas fora do apoio comum (bordas x = 0 e x = 8) não mudam
    expect(entre[0].grupos[0].esforcos.mNeg[0]).toBeCloseTo(so[0].grupos[0].esforcos.mNeg[0], 9);
    expect(entre[1].grupos[0].esforcos.mNeg[1]).toBeCloseTo(so[1].grupos[0].esforcos.mNeg[1], 9);
    const aviso = (v: typeof so[number]) => v.mensagens.some((m) => m.includes('igualada em cadeia com os panos vizinhos'));
    expect(aviso(entre[0]) || aviso(entre[1])).toBe(true);
    expect(aviso(so[0]) || aviso(so[1])).toBe(false);
    // sem a igualação pela área (padrão, E3b) a opção não age: resultados idênticos
    expect(JSON.stringify(e3b)).toBe(JSON.stringify(e3b0));
  });
});
