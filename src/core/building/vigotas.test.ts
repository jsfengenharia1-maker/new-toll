import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { barArea, beamFlexure, concrete } from '../concrete';
import { filtrarDim } from '../../cli/mcp';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { classificar, revisarEdificio } from './revisao';
import { escolherAdicional, gruposIgualacao, igualar, momentoLimite, pesoTrelica, vrd1, vrd2 } from './vigotas';

/** Pavimento com lajes treliçadas entre vigas 15×45 em pilares 25×25 (vãos em x; 5 m em y; vigotas em x, o menor vão). */
function trelicadas(vaos: number[], tipo: Record<string, unknown> = { tipo: 'trelicada', modelo: 'H12', capa: 0.04 }, extra?: (ok: (n: string, p: Record<string, unknown>) => void, s: Sessao) => void) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo });
  extra?.(ok, s);
  const an = analisarEdificio(s.modelo);
  const d = dimensionarEdificio(s.modelo, an);
  return { s, d, an };
}

describe('vigotas das lajes treliçadas (R6): cálculo manual', () => {
  const c = concrete(30, 1.4);

  it('VRd1 e VRd2 da nervura (NBR 6118, 19.4.1)', () => {
    // H12+4: bw = 9 cm, d = 13 cm, banzo inferior 2φ5 (TR 12645)
    const bw = 0.09, d = 0.13, As1 = 2 * barArea(5);
    const fctd = (0.7 * 0.3 * 30 ** (2 / 3)) / 1.4, tau = 0.25 * fctd, k = 1.6 - d, rho = As1 / (bw * d);
    expect(vrd1(c, bw, d, As1)).toBeCloseTo(tau * k * (1.2 + 40 * rho) * bw * d * 1000, 9);
    expect(vrd1(c, bw, d, As1)).toBeCloseTo(8.31, 2); // 0,362 MPa × 1,47 × 1,334 × 0,09 × 0,13 m² = 8,31 kN
    // k ≥ 1 e ρ1 ≤ 2 %
    expect(vrd1(c, 0.09, 0.7, 1)).toBeCloseTo(tau * 1 * (1.2 + 40 * 0.02) * 0.09 * 0.7 * 1000, 9);
    // VRd2 = 0,5·αv1·fcd·bw·0,9d, αv1 = 0,7 − 30/200 = 0,55 → 0,5
    expect(vrd2(c, bw, d)).toBeCloseTo(0.5 * 0.5 * (30 / 1.4) * bw * 0.9 * d * 1000, 9);
  });

  it('As adicional para M dado: seção T, banzo da treliça descontado (CA-60 → CA-50)', () => {
    // M = 6 kN·m por nervura; T com bf = 42 cm, hf = 4 cm, bw = 9 cm, h = 16 cm, d = 13 cm; LN na mesa:
    // σcd·bf·y·(d − y/2) = Md → 18,21·0,42·y·(0,13 − y/2) = 0,006 → y = 6,18 mm; As = σcd·bf·y/fyd
    const scd = 0.85 * 30 / 1.4, bf = 0.42, d = 0.13, fyd = 500 / 1.15, Md = 0.006;
    const a = scd * bf / 2, y = (scd * bf * d - Math.sqrt((scd * bf * d) ** 2 - 4 * a * Md)) / (2 * a);
    const As = (scd * bf * y) / fyd;
    const r = beamFlexure({ kind: 'tee', bw: 0.09, h: 0.16, bf, hf: 0.04 }, true, 6, d, 0.03, c, fyd);
    expect(r.As).toBeCloseTo(As, 9);
    expect(As * 1e4).toBeCloseTo(1.087, 3);
    // banzo 2φ5 CA-60 equivale a 0,3927 × 600/500 = 0,471 cm² de CA-50 → adicional 0,616 cm² → 2φ6,3 (0,623)
    const ad = As * 1e4 - 2 * barArea(5) * 1e4 * (600 / 500);
    expect(ad).toBeCloseTo(0.616, 3);
    expect(escolherAdicional(ad)).toMatchObject({ n: 2, phi: 6.3 });
    expect(escolherAdicional(0)).toMatchObject({ n: 0 });
    expect(escolherAdicional(0.4)).toMatchObject({ n: 1, phi: 8 });
    expect(escolherAdicional(2.5)).toBeNull(); // > 2φ12,5 = 2,454 cm²
  });

  it('momento limite da nervura (x = 0,45d) e peso da treliça pela geometria', () => {
    // bw = 9 cm, d = 13,5 cm: y = 0,8 × 0,45 × 0,135 = 4,86 cm; M = 18,21 × 0,09 × 0,0486 × (0,135 − 0,0243) = 8,82 kN·m
    expect(momentoLimite(c, 0.09, 0.135)).toBeCloseTo(8.82, 2);
    // TR 8644 ≈ 0,73 kg/m e TR 12645 ≈ 0,88 kg/m (catálogos: 0,735 e 0,886)
    expect(pesoTrelica('TR 8644')).toBeCloseTo(0.731, 2);
    expect(pesoTrelica('TR 12645')).toBeCloseTo(0.881, 2);
  });

  it('igualação de vigotas vizinhas por diferença %, máximo e média', () => {
    expect(gruposIgualacao([5, 5.2, 6, 3], 10, 1)).toEqual([[0, 1], [2], [3]]);
    expect(gruposIgualacao([5, 5.2, 6, 3], 100, 1)).toEqual([[0, 1, 2, 3]]);
    expect(gruposIgualacao([5, 5.2, 6, 3], 100, 0)).toEqual([[0], [1], [2], [3]]);
    expect(igualar([5, 5.2], 1)).toBe(5.2);
    expect(igualar([5, 5.2], 2)).toBeCloseTo(5.1, 12);
    expect(igualar([-1, -3], 1, true)).toBe(-3);
  });
});

describe('vigotas num edifício (R6)', () => {
  it('duas lajes H12+4 contínuas: grupos, negativos no apoio central, cortante, resumo e MCP', () => {
    const { s, d } = trelicadas([4, 4]);
    expect(d.vigotas).toHaveLength(2);
    const v = d.vigotas![0];
    expect(v.trelica).toBe('TR 12645');
    expect(v.vigotas).toBe(Math.round(5 / 0.42));
    expect(v.grupos).toHaveLength(1); // igualação padrão: 100 % → uma armadura por laje
    const g = v.grupos[0];
    expect(g.esforcos.mPos).toBeGreaterThan(0);
    // momento mínimo p·ℓ²/16 nas pontas (a de fora não tem negativo na análise)
    const f = v.faixas[g.faixas[0]], p = (f.calc.v[0] + f.calc.v[1]) / f.L;
    expect(g.esforcos.mNeg[0]).toBeLessThanOrEqual(-(p * f.L ** 2) / 16 + 1e-9);
    expect(g.esforcos.mPos).toBeGreaterThanOrEqual((p * f.L ** 2) / 16 - 1e-9);
    // negativo no apoio central (fim da laje da esquerda): comprimento ≥ 25 % do vão
    expect(g.negativos[1]).not.toBeNull();
    expect(g.negativos[1]!.comprimento).toBeGreaterThanOrEqual(0.25 * g.L - 1e-9);
    expect(g.esforcos.mNeg[1]).toBeLessThan(g.esforcos.mNeg[0]);
    expect(g.cortante[1].Vsd).toBeLessThan(g.cortante[1].VRd1);
    // positiva do grupo = seção T pelo cálculo manual (d = 16 − 2,5 − 0,5 cm), menos o banzo 2φ5 CA-60
    const As = beamFlexure({ kind: 'tee', bw: 0.09, h: 0.16, bf: 0.42, hf: 0.04 }, true, g.esforcos.mPos, 0.13, 0.03, concrete(30, 1.4), 500 / 1.15).As * 1e4;
    expect(g.positiva.AsNec).toBeCloseTo(Math.max(As, 0.0015 * (0.42 * 0.04 + 0.09 * 0.12) * 1e4), 6);
    expect(g.positiva.AsAdicional).toBeCloseTo(Math.max(0, g.positiva.AsNec - 2 * barArea(5) * 1e4 * 1.2), 6);
    expect(v.status).toBe('ok');
    expect(d.lajes.find((l) => l.laje === v.laje)!.mensagens.some((m) => /^Treliçada H12\+4: TR 12645/.test(m))).toBe(true);
    expect(d.resumoAcoVigotas!.length).toBeGreaterThan(0);
    expect(d.trelicas![0].trelica).toBe('TR 12645');
    expect(d.trelicas![0].comprimento).toBeCloseTo(d.vigotas!.reduce((t, x) => t + x.comprimentoVigotas, 0) * 3, 6); // 3 pavimentos no grupo Tipo
    // MCP: resumo por laje, sem alinhamentos
    const m = filtrarDim(s.modelo, { ...d, fundacao: [] }) as { vigotas: Record<string, unknown>[] };
    expect(m.vigotas).toHaveLength(2);
    expect(m.vigotas[0].faixas).toBeUndefined();
    expect(JSON.stringify(m.vigotas).length).toBeLessThan(4000);
  });

  it('sem igualação, um grupo por alinhamento; com média, valor ≤ máximo', () => {
    const a = trelicadas([4], undefined, (ok) => ok('opcoes.definir', { valores: { vigotaIgualacao: 0 } })).d.vigotas![0];
    expect(a.grupos.length).toBe(a.faixas.length);
    const b = trelicadas([4], undefined, (ok) => ok('opcoes.definir', { valores: { vigotaIgualacao: 2 } })).d.vigotas![0];
    const c = trelicadas([4]).d.vigotas![0];
    expect(b.grupos[0].esforcos.mPos).toBeLessThan(c.grupos[0].esforcos.mPos);
    expect(b.grupos[0].esforcos.v[0]).toBeCloseTo(c.grupos[0].esforcos.v[0], 9); // cortante sempre pelo máximo
  });

  it('carga alta: cortante acima de VRd1 com faixa maciçada (erro) e laje reprovada', () => {
    const { s, d, an } = trelicadas([5], undefined, (ok) => ok('carga.area', { grupo: 'g_3', contorno: [[0, 0], [5, 0], [5, 5], [0, 5]], valor: 15 }));
    const v = d.vigotas![0];
    expect(v.status).toBe('fail');
    const msg = v.mensagens.find((m) => classificar(m).codigo === 'VIGOTA_CORTANTE');
    expect(msg, v.mensagens.join('\n')).toMatch(/maciçar \d+ cm junto ao apoio/);
    expect(Math.max(...v.grupos[0].macico)).toBeGreaterThan(0);
    const rev = revisarEdificio(s.modelo, an, d);
    expect(rev.itens.some((i) => i.tipo === 'laje' && i.id === v.laje && i.nivel === 'erro' && i.codigo === 'VIGOTA_CORTANTE')).toBe(true);
    expect(d.lajes.find((l) => l.laje === v.laje)!.status).toBe('fail');
  });

  it('capa abaixo do mínimo da NBR 6118 (13.2.4.2) é erro', () => {
    const v = trelicadas([4], { tipo: 'trelicada', modelo: 'H20', capa: 0.03 }).d.vigotas![0];
    expect(v.verificacaoCapa).toEqual({ minima: 0.04, ok: false });
    expect(v.mensagens.some((m) => classificar(m).codigo === 'VIGOTA_CAPA')).toBe(true);
  });

  it('armadura bloqueada: insuficiente vira ARM_BLOQ; desbloqueio volta ao cálculo', () => {
    const { s } = trelicadas([4, 4]);
    const ids = s.modelo.lajes.map((l) => l.id);
    expect(s.executar('laje.armaduraVigotas', { ids, inf: { n: 0, phi: 6.3 }, sup: { n: 1, phi: 6.3 } }).ok).toBe(true);
    const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)), v = d.vigotas![0];
    expect(v.bloqueada).toBe(true);
    expect(v.grupos[0].positiva.barras).toMatchObject({ n: 0 });
    expect(v.mensagens.some((m) => classificar(m).codigo === 'ARM_BLOQ')).toBe(true);
    expect(v.status).toBe('fail');
    expect(s.executar('armadura.desbloquear', { tipo: 'laje' }).ok).toBe(true);
    expect(s.modelo.lajes.every((l) => !l.armaduraVigotas)).toBe(true);
    // laje maciça não aceita
    expect(s.executar('laje.atribuir', { ids: [ids[0]], tipo: { tipo: 'macica', h: 0.12 } }).ok).toBe(true);
    expect(s.executar('laje.armaduraVigotas', { ids: [ids[0]], inf: { n: 1, phi: 8 } }).ok).toBe(false);
  });

  it('redutor de rigidez das nervuras aumenta a flecha', () => {
    const f1 = trelicadas([5]).d.lajes[0].flecha;
    const f2 = trelicadas([5], undefined, (ok) => ok('opcoes.definir', { valores: { vigotaRigidez: 0.5 } })).d.lajes[0].flecha;
    expect(f2).toBeGreaterThan(f1 * 1.3);
  });
});
