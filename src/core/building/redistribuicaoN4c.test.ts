// N4c: redistribuição dos momentos negativos nas faces dos pilares (K1.4.7, NBR 6118, 14.6.4.3), limite de δ pela linha
// neutra, opções por viga (K1.4.1) e flecha ativa truncada (K1.15.4-22). Funções puras contra cálculo manual; o modelo
// (viga contínua de dois vãos) contra as relações de equilíbrio da redistribuição.
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 180000 }); // cada cenário dimensiona um edifício completo
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { beamFlexure, concrete } from '../concrete';
import { memoriaDetalhada } from '../memoria/edificio';
import { dimensionarEdificio } from './dimensionamento';
import { composicaoEtapas, ETAPAS_PADRAO } from './flechas';
import { acrescimoEm, acrescimoEst, cortanteRedist, perfisRedistribuicao, type VaoRedist } from './redistribuicao';

/** Dois vãos iguais de 5 m (parte flexível) com faces a 0,1 m das pontas; um só caso (k = 0), momentos de cálculo dados. */
function doisVaos(MfA: number, VfA: number): VaoRedist[] {
  const xs = [0, 0.1, 2.5, 4.9, 5.0];
  const f = (x: number, M: number, V: number) => ({ x, Mv: Float64Array.of(M), Vv: Float64Array.of(V) });
  const mk = (ini: number, fim: number, Mini: number, Vini: number, Mfim: number, Vfim: number): VaoRedist => ({
    L: 5, xs, ini, fim, oIni: 0, oFim: 0,
    Mv: [Float64Array.of(Mini, Mini, 0, Mfim, Mfim)], Vv: [Float64Array.of(0, 0, 0, 0, 0)],
    faces: [f(0.1, Mini, Vini), f(4.9, Mfim, Vfim)],
  });
  // apoio interno = nó 1: fim do vão A e início do vão B (M = MfA nas duas faces, V = ±VfA)
  return [mk(0, 1, -10, 20, MfA, VfA), mk(1, 2, MfA, -VfA, -10, -20)];
}

describe('perfis da redistribuição (cálculo manual)', () => {
  const interno = (n: number) => n === 1;
  it('eixo: ΔM do último ponto do vão, linear no vão todo (resultado de antes da N4c)', () => {
    const vaos = doisVaos(-40, 25);
    vaos[0].Mv[0][4] = -45; // M no fim da parte flexível (eixo), diferente do da face
    const [[pa]] = perfisRedistribuicao(vaos, 1, 0.85, interno, false, 1);
    expect(pa.faces).toBe(false);
    expect(pa.dA).toBe(0); // apoio externo
    expect(pa.dZ).toBeCloseTo(0.15 * 45, 12);
    expect(pa.Lref).toBe(5);
    expect(acrescimoEm(pa, 0, 2.5)).toBeCloseTo(0.5 * 6.75, 12);
    expect(acrescimoEst(pa, -3, 2)).toBeCloseTo(-3 + 3.375, 12);
    expect(cortanteRedist(pa, 10)).toBeCloseTo(10 - 6.75 / 5, 12);
  });
  it('faces: ΔM = (1 − δ)·|M na face|, linear no vão livre entre as faces (4,8 m); no apoio vale o da face', () => {
    const [[pa], [pb]] = perfisRedistribuicao(doisVaos(-40, 25), 1, 0.85, interno, true, 0);
    expect(pa.faces).toBe(true);
    expect([pa.xa, pa.xb]).toEqual([0.1, 4.9]);
    expect(pa.Lref).toBeCloseTo(4.8, 12);
    expect(pa.dA).toBe(0);
    expect(pa.dZ).toBeCloseTo(6, 12); // 0,15·40
    expect(acrescimoEm(pa, 0, 2.5)).toBeCloseTo(3, 12); // t = (2,5 − 0,1)/4,8 = 0,5
    expect(acrescimoEm(pa, 0, 4.9)).toBeCloseTo(6, 12);
    expect(acrescimoEm(pa, 0, 5.0)).toBeCloseTo(6, 12); // dentro do apoio: o da face
    expect(cortanteRedist(pa, 0)).toBeCloseTo(-6 / 4.8, 12); // −(ΔMB − ΔMA)/ℓ = −1,25
    expect(pb.dA).toBeCloseTo(6, 12);
    expect(acrescimoEm(pb, 0, 0.1)).toBeCloseTo(6, 12);
    expect(acrescimoEm(pb, 0, 2.5)).toBeCloseTo(3, 12);
    expect(cortanteRedist(pb, 0)).toBeCloseTo(1.25, 12);
  });
  it('faces com cúbica: o apoio é refeito a partir das faces redistribuídas (meio do apoio = M′ − t·V′/4)', () => {
    // faces a 0,1 m do fim: apoio de t = 0,2 m. Original: M = −40, V = ±25 → meio = −40 − 0,2·25/4 = −41,25.
    // Redistribuído: M′ = −34, V′ = ±(25 − 1,25) = ±23,75 → meio = −34 − 0,2·23,75/4 = −35,1875 (ΔM = 6,0625 = 6 + 0,2·1,25/4)
    const [[pa], [pb]] = perfisRedistribuicao(doisVaos(-40, 25), 1, 0.85, interno, true, 1);
    expect(pa.ex![4]).toBeCloseTo(6.0625, 10); // x = 5,0: u = 0,1 = t/2
    expect(pb.ex![0]).toBeCloseTo(6.0625, 10); // x = 0 do vão B: u = t − (0,1 − 0) = 0,1
    expect(acrescimoEst(pa, -41.25, 4)).toBeCloseTo(-35.1875, 10);
    expect(Number.isNaN(pa.ex![2])).toBe(true); // x = 2,5 não está no apoio
    expect(Number.isNaN(pa.ex![3])).toBe(true); // x = 4,9 = a face: vale o linear, ΔM = ΔM da face
    expect(acrescimoEst(pa, 0, 3)).toBeCloseTo(6, 12);
    expect(Number.isNaN(pb.ex![1])).toBe(true); // x = 0,1 = a face do vão B
  });
  it('sem redistribuição (δ = 1) ou sem apoio interno os acréscimos são nulos', () => {
    const [[pa], [pb]] = perfisRedistribuicao(doisVaos(-40, 25), 1, 1, interno, true, 1);
    expect([pa.dA, pa.dZ, pb.dA, pb.dZ]).toEqual([0, 0, 0, 0]);
    expect(pa.ex).toBeNull();
    const [[pc]] = perfisRedistribuicao(doisVaos(-40, 25), 1, 0.85, () => false, true, 1);
    expect([pc.dA, pc.dZ]).toEqual([0, 0]);
  });
  it('momento positivo na face não é redistribuído', () => {
    const [[pa]] = perfisRedistribuicao(doisVaos(5, 25), 1, 0.85, interno, true, 0);
    expect(pa.dZ).toBe(0);
  });
});

/** Grade 2 × 1 vãos de 5 m (pilares 25 × 25, vigas 15 × 40, laje maciça 12 cm), sem vento: todas as combinações são verticais. */
function grade(valores: Record<string, number>, extra?: (s: Sessao) => void, secao = { b: 0.15, h: 0.4 }) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('vento.definir', { ativo: false });
  ok('lote', { comandos: [[0, 0], [5, 0], [10, 0], [0, 5], [5, 5], [10, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  ok('lote', { comandos: [[[0, 0], [10, 0]], [[0, 5], [10, 5]], [[0, 0], [0, 5]], [[5, 0], [5, 5]], [[10, 0], [10, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_7', pontos: p, secao } })) });
  ok('laje.detectarPanos', { grupo: 'g_7', tipo: { tipo: 'macica', h: 0.12 } });
  ok('opcoes.definir', { valores });
  extra?.(s);
  const an = analisarEdificio(s.modelo);
  expect(an.erro).toBeUndefined();
  const d = dimensionarEdificio(s.modelo, an);
  return { s, ok, an, d, v: d.vigas.find((x) => x.grupo === 'g_7' && x.L > 9)! };
}

describe('N4c: redistribuição nas faces (viga contínua de 2 vãos, sem arredondamento no apoio)', () => {
  const sem = grade({ redistribuicao: 0, arredondamentoApoio: 0 }).v;
  const fac = grade({ redistribuicao: 15, redistribuicaoFaces: 1, arredondamentoApoio: 0 }).v;
  const eix = grade({ redistribuicao: 15, redistribuicaoFaces: 0, arredondamentoApoio: 0 }).v;
  const interna = (v: typeof sem) => v.facesPilar.filter((f) => f.s > 1 && f.s < 9);

  it('δ pedido aplicado (nós fixos, x/d pequeno) e a mensagem informa as faces', () => {
    expect(fac.delta).toBeCloseTo(0.85, 6);
    expect(eix.delta).toBeCloseTo(0.85, 6);
    expect(fac.mensagens.some((m) => m.startsWith('Redistribuição') && m.includes('faces dos pilares'))).toBe(true);
    expect(eix.mensagens.some((m) => m.startsWith('Redistribuição') && m.includes('faces dos pilares'))).toBe(false);
  });
  it('momento negativo na face = δ·M da face sem redistribuição (todas as combinações são verticais)', () => {
    expect(interna(sem)).toHaveLength(2);
    for (const [i, f] of interna(fac).entries()) {
      expect(f.Mmin).toBeCloseTo(0.85 * interna(sem)[i].Mmin, 1); // arredondado a 0,01 nos dois lados
      expect(f.Mmin).toBeGreaterThan(interna(sem)[i].Mmin);
    }
    // no critério do eixo a face não recebe o ΔM dela: o acréscimo é o do eixo, linear (resultado diferente)
    for (const [i, f] of interna(eix).entries()) expect(Math.abs(f.Mmin - 0.85 * interna(sem)[i].Mmin)).toBeGreaterThan(0.02);
  });
  it('equilíbrio: o positivo do vão cresce ≈ 0,375·ΔM da face (máximo do vão extremo em x ≈ 0,375·ℓ)', () => {
    const dF = 0.15 * -interna(sem)[0].Mmin; // (1 − δ)·|M da face|
    const aumento = fac.Mpos - sem.Mpos;
    expect(aumento).toBeGreaterThan(0.3 * dF);
    expect(aumento).toBeLessThan(0.45 * dF);
    expect(fac.Mneg).toBeGreaterThan(sem.Mneg); // o negativo cai em módulo
  });
  it('o cortante junto ao apoio cai de (ΔMB − ΔMA)/ℓ no vão livre', () => {
    // sem redistribuição o cortante do apoio interno é o maior; com ΔM = 0,15·|M| e ℓ ≈ 4,75 m cai ≈ 0,15·|M|/ℓ
    const dV = 0.15 * -interna(sem)[0].Mmin / 4.75;
    expect(sem.V - fac.V).toBeGreaterThan(0.6 * dV);
    expect(sem.V - fac.V).toBeLessThan(1.4 * dV);
  });
  it('com a cúbica do apoio (padrão do sistema) o negativo de cálculo fica entre o sem redistribuição e o da face', () => {
    const cub = grade({ redistribuicao: 15, redistribuicaoFaces: 1, arredondamentoApoio: 1 }).v;
    const cub0 = grade({ redistribuicao: 0, arredondamentoApoio: 1 }).v;
    expect(cub.Mneg).toBeGreaterThan(cub0.Mneg); // reduz em módulo
    // o apoio é refeito a partir das faces redistribuídas: o negativo de cálculo não é menor que o da face redistribuída
    for (const f of interna(cub)) expect(f.Mmin).toBeGreaterThanOrEqual(cub.Mneg - 0.006);
    // identidade do critério anterior mantida: sem redistribuição os dois critérios coincidem
    expect(grade({ redistribuicao: 0, redistribuicaoFaces: 1 }).v.Mneg).toBeCloseTo(cub0.Mneg, 9);
  });
});

describe('N4c: limite de δ pela posição da linha neutra (NBR 6118, 14.6.4.3)', () => {
  it('δ ≥ 0,44 + 1,25·x/d no apoio: o pedido de 25 % é reduzido quando x/d é grande', () => {
    // seção 12 × 28: x/d ≈ 0,29 no negativo → δ ≥ 0,44 + 1,25·0,29 = 0,80 > 0,75 do pedido (nós fixos), limitado pela linha neutra
    const g = grade({ redistribuicao: 25, redistribuicaoFaces: 1, arredondamentoApoio: 0, vigaTaxaMin: 0 }, undefined, { b: 0.12, h: 0.28 });
    const c = concrete(30), dS = 0.28 - 0.03 - 0.005 - 0.008, d2 = 0.03 + 0.005 + 0.008;
    const xd = beamFlexure({ kind: 'rect', bw: 0.12, h: 0.28 }, false, -g.v.Mneg, dS, d2, c, 500 / 1.15).xd;
    expect(g.v.delta).toBeGreaterThan(0.75 + 0.01); // limitado
    expect(g.v.delta).toBeGreaterThanOrEqual(0.44 + 1.25 * xd - 0.01);
    expect(g.v.delta).toBeLessThanOrEqual(0.44 + 1.25 * xd + 0.03); // e não mais que o necessário (passo de 0,005 da iteração)
    expect(g.v.mensagens.some((m) => m.startsWith('Redistribuição') && m.includes('limitado'))).toBe(true);
  });
  it('x/d pequeno: vale o pedido (δ = 0,85) e o pedido não passa de δ ≥ 0,75 em nós fixos', () => {
    expect(grade({ redistribuicao: 15, redistribuicaoFaces: 1 }).v.delta).toBeCloseTo(0.85, 6);
    expect(grade({ redistribuicao: 25, redistribuicaoFaces: 1 }).v.delta).toBeGreaterThanOrEqual(0.75 - 1e-9);
  });
});

describe('N4c: opções por viga (K1.4.1)', () => {
  it('viga.editar opcoes sobrepõe as da obra só nela; {} volta às da obra; desfazer devolve', () => {
    const g = grade({ redistribuicao: 15, redistribuicaoFaces: 1 }, (s) => {
      const id = s.modelo.vigas.find((x) => x.grupo === 'g_7' && x.pontos[0][1] === 0 && x.pontos[1][0] === 10)!.id;
      const r = s.executar('viga.editar', { id, opcoes: { redistribuicao: 0 } });
      expect(r.ok, r.erros.map((e) => e.mensagem).join(' ')).toBe(true);
    });
    const vs = g.d.vigas.filter((x) => x.grupo === 'g_7' && x.L > 9);
    const propria = vs.find((x) => x.nome === g.s.modelo.vigas.find((y) => y.opcoes)!.nome)!, outra = vs.find((x) => x !== propria)!;
    expect(propria.delta).toBe(1);
    expect(outra.delta).toBeCloseTo(0.85, 6);
    expect(propria.mensagens.some((m) => m.startsWith('Opções próprias da viga') && m.includes('Redistribuição de negativos das vigas = 0'))).toBe(true);
    expect(outra.mensagens.some((m) => m.startsWith('Opções próprias'))).toBe(false);
    // {} remove; opção fora da lista é recusada
    const id = g.s.modelo.vigas.find((y) => y.opcoes)!.id;
    expect(g.s.executar('viga.editar', { id, opcoes: { malha: 1 } }).ok).toBe(false);
    expect(g.s.executar('viga.editar', { id, opcoes: { redistribuicao: 40 } }).ok).toBe(false); // acima da faixa (0–25)
    expect(g.s.executar('viga.editar', { id, opcoes: {} }).ok).toBe(true);
    expect(g.s.modelo.vigas.find((y) => y.id === id)!.opcoes).toBeUndefined();
  });
});

describe('N4c: memória detalhada com a redistribuição nas faces', () => {
  it('Mneg e V refeitos a partir dos passos registrados (inclui a estação dentro do apoio recalculado), 1e-9', { timeout: 180000 }, () => {
    const g = grade({ redistribuicao: 15, redistribuicaoFaces: 1, arredondamentoApoio: 1 });
    const { memoria, dim } = memoriaDetalhada(g.s.modelo, { an: g.an });
    expect(dim.vigas).toEqual(g.d.vigas);
    const v = g.v, el = `Viga ${v.nome}`;
    const ps = memoria.passos.filter((p) => p.elemento === el && p.topico === 'Envoltória ELU');
    const n = (p: (typeof ps)[number], k: string) => p.entradas[k] as number;
    for (const [rot, alvo] of [['Momento negativo', v.Mneg], ['Momento positivo', v.Mpos]] as const) {
      const red = ps.filter((p) => p.descricao.startsWith(rot) && p.entradas.dA !== undefined).at(-1);
      expect(red, rot).toBeDefined();
      const total = n(red!, 'Md') + n(red!, 'dA') * (1 - n(red!, 't')) + n(red!, 'dZ') * n(red!, 't');
      expect(Math.abs(total - alvo) / Math.abs(alvo), rot).toBeLessThan(1e-9);
    }
    // a cúbica refeita aparece como passo próprio quando o extremo está dentro do apoio
    expect(ps.some((p) => p.descricao.includes('dentro do apoio'))).toBe(true);
  });
});

describe('N4c: flecha ativa com fatores truncados (K1.15.4-22)', () => {
  // exemplo do manual: ξ de 28 d 0,7, 60 d 0,8, 120 d 1,0, 1 ano 1,4, ∞ 2,0; Ke = 1,5; δi da carga total 10,5 por kN/m²
  const tab = new Map([[28, 0.7], [60, 0.8], [120, 1.0], [365, 1.4]]);
  const xi = (d: number) => (Number.isFinite(d) ? tab.get(d)! : 2);
  const Ke = 1.5, di = 10.5, inst = { pp: 6.5 * Ke, alvenaria: Ke, revestimento: Ke, q: 2 * Ke, qqp: 0.6 * Ke };
  it('exato: f = 4/10,5 = 0,3810 e λ = (10,36/10,5)/1,05 = 0,9397 → 1,981·δi; truncado a 0,38 e 0,93 → 1,965·δi', () => {
    const ex = composicaoEtapas(ETAPAS_PADRAO, inst, { rho: 0.001, xi });
    expect(ex.ativa / di).toBeCloseTo(Ke * (4 / 10.5 + 10.36 / 10.5 / 1.05), 12);
    expect(ex.ativa / di).toBeCloseTo(1.98095, 4);
    const tr = composicaoEtapas(ETAPAS_PADRAO, inst, { rho: 0.001, xi, ativaTruncada: true });
    expect(tr.ativa / di).toBeCloseTo((0.38 + 0.93) * Ke, 12); // 1,965
    expect(tr.antes).toBeCloseTo(tr.total - tr.ativa, 12);
    expect(tr.total).toBeCloseTo(ex.total, 12); // só a ativa muda
    expect(tr.alfaG * (6.5 + 1 + 1) * Ke + tr.alfaQ * 2 * Ke).toBeCloseTo(tr.ativa, 12); // αg·fg + αq·fq = ativa
  });
  it('com λ = 0,95·ξ (EHE-08, K1.15.4-18) o truncamento também dá 0,93: 0,9867·0,95 = 0,9374', () => {
    const tr = composicaoEtapas(ETAPAS_PADRAO, inst, { rho: (1 / 0.95 - 1) / 50, xi, ativaTruncada: true });
    expect(tr.lambdaAtiva).toBeCloseTo((10.36 / 10.5) * 0.95, 12);
    expect(tr.ativa / di).toBeCloseTo(1.965, 12);
  });
  it('sem etapa de alvenaria (ativa = total) o truncamento só arredonda os dois fatores para baixo', () => {
    const uma = [{ nome: 'tudo', dias: 30, pp: 1, alvenaria: 1, revestimento: 1, variavel: 1 }];
    const a = composicaoEtapas(uma, { pp: 4, alvenaria: 1, revestimento: 1, q: 2, qqp: 2 }, { qInstantanea: 'qp', ativaTruncada: true });
    expect(a.ativa).toBeLessThanOrEqual(a.total + 1e-12);
    expect(a.ativa).toBeGreaterThan(a.total * 0.99);
  });
});
