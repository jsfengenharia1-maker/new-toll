import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { barArea, concrete } from '../concrete';
import { analisarEdificio } from './analitico';
import { lbBasico } from './detalhamento';
import { bordasDaLaje, escolherBarrasLaje, lbNecessario } from './detalhamentoLajes';
import { dimensionarEdificio } from './dimensionamento';
import { opcoesEmUso } from './opcoes';

/** Pavimento com lajes maciças h = 12 cm entre vigas 15×45 em pilares 25×25 (vãos em x; 5 m em y). */
function lajes(vaos: number[], extra?: (ok: (n: string, p: Record<string, unknown>) => void, s: Sessao) => void) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  extra?.(ok, s);
  const d = dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
  return { s, d };
}

describe('detalhamento das lajes maciças (R4)', () => {
  it('bitola e espaçamento pela As, φ ≤ h/8 e espaçamentos-limite (cálculo manual)', () => {
    // As = 3,0 cm²/m, CA-50: φ6,3 (0,3117 cm²) → s = 0,3117/3,0 = 10,39 cm → 10 cm
    const a = escolherBarrasLaje(3e-4, 0.12, 0.2, 0.1, 5, false);
    expect(a.phi).toBe(6.3);
    expect(a.s).toBeCloseTo(0.1, 9);
    expect(a.As).toBeCloseTo(barArea(6.3) / 0.1, 12);
    // As = 3,5 cm²/m: φ6,3 daria 8,9 cm < 10 → φ8 (0,5027 cm²) c/ 14 cm
    const b = escolherBarrasLaje(3.5e-4, 0.12, 0.2, 0.1, 5, false);
    expect([b.phi, b.s]).toEqual([8, 0.14]);
    // As pequena: espaçamento máximo mín(2h; 20 cm) = 16 cm com h = 8 cm; φ5 só com CA-60
    expect(escolherBarrasLaje(1.0e-4, 0.08, 0.16, 0.1, 5, true)).toMatchObject({ phi: 5, s: 0.16 });
    expect(escolherBarrasLaje(1.0e-4, 0.08, 0.16, 0.1, 5, false).phi).toBe(6.3);
    // φ ≤ h/8: h = 8 cm → φ10 é o maior; As enorme não cabe
    const c = escolherBarrasLaje(20e-4, 0.08, 0.16, 0.1, 5, false);
    expect(c.phi).toBe(10);
    expect(c.cabe).toBe(false);
  });

  it('ancoragem necessária com As,calc/As,ef e mínimos de 9.4.2.5 (cálculo manual)', () => {
    const lb = lbBasico(8, concrete(30), 500 / 1.15, true); // (8/4)·434,8/3,258 = 266,9 mm
    expect(lb).toBeCloseTo(0.2669, 3);
    expect(lbNecessario(lb, 8, 2.0, 4.0)).toBeCloseTo(Math.max(lb / 2, 0.1), 9); // 0,133 m
    expect(lbNecessario(lb, 8, 0.5, 4.0)).toBeCloseTo(0.1, 9); // 0,3lb = 8,0 cm; 10φ = 8 cm; 10 cm governa
    expect(lbNecessario(lb, 8, 5, 4)).toBeCloseTo(lb, 9);
  });

  it('duas lajes contínuas: bordas, positivas cobrindo o pano, negativo ≥ ℓ/4 de cada lado, borda e canto', () => {
    const { s, d } = lajes([4, 4]);
    const [L1, L2] = s.modelo.lajes;
    const bd = bordasDaLaje(s.modelo, L1);
    expect(bd.filter((x) => x.tipo === 'continua')).toHaveLength(1);
    expect(bd.filter((x) => x.tipo === 'apoiada')).toHaveLength(3);
    expect(d.detalhesLajes).toHaveLength(2);
    const dt = d.detalhesLajes!.find((x) => x.laje === L1.id)!, r = d.lajes.find((x) => x.laje === L1.id)!;
    // positivas: As efetiva ≥ necessária nas duas direções e espaçamento ≤ mín(2h; 20 cm) = 20 cm
    for (const k of [0, 1]) { expect(dt.positivas[k].As).toBeGreaterThanOrEqual(r.As.pos[k] - 1e-9); expect(dt.positivas[k].s).toBeLessThanOrEqual(0.2 + 1e-9); }
    // cobrem o pano: nº de barras de cada direção × espaçamento ≥ largura do pano (eixo a eixo) na direção de distribuição
    const t0 = (dt.angulo * Math.PI) / 180, U = [[Math.cos(t0), Math.sin(t0)], [-Math.sin(t0), Math.cos(t0)]];
    const larg = (u: number[]) => { const pr = L1.contorno.map((q) => q[0] * u[0] + q[1] * u[1]); return Math.max(...pr) - Math.min(...pr); };
    for (const k of [0, 1] as const) {
      const ps = dt.posicoes.filter((p) => p.tipo === 'positiva' && p.dir === k);
      expect(ps.reduce((t, p) => t + p.n, 0) * dt.positivas[k].s).toBeGreaterThanOrEqual(larg(U[1 - k]) - 1e-6);
      // atravessam o vão e entram nos apoios (além do eixo das vigas de borda, até a face oposta menos o cobrimento)
      for (const p of ps) expect(Math.hypot(p.z[0] - p.a[0], p.z[1] - p.a[1])).toBeGreaterThan(larg(U[k]) - 1e-6);
    }
    // negativo sobre a viga do meio (x = 4): só numa das lajes; cada lado ≥ 25 % de 4 m = 1,0 m
    const negs = d.detalhesLajes!.flatMap((x) => x.posicoes.filter((p) => p.tipo === 'negativa'));
    expect(negs).toHaveLength(1);
    const ng = negs[0];
    expect(ng.lados![0]).toBeGreaterThanOrEqual(1.0 - 1e-9);
    expect(ng.lados![1]).toBeGreaterThanOrEqual(1.0 - 1e-9);
    expect(Math.abs((ng.a[0] + ng.z[0]) / 2 - 4) - Math.abs(ng.lados![0] - ng.lados![1]) / 2).toBeLessThan(1e-3);
    // comprimento = lados + 2 pernas (h − 2·2,5 cm = 7 cm), arredondado a 5 cm
    const perna = 0.12 - 0.05;
    expect(ng.comprimento).toBeCloseTo(Math.ceil((ng.lados![0] + ng.lados![1] + 2 * perna) / 0.05 - 1e-9) * 0.05, 9);
    const dono = d.detalhesLajes!.find((x) => x.posicoes.includes(ng))!;
    expect(ng.vizinha).toBe(dono.laje === L1.id ? L2.id : L1.id);
    // As do negativo ≥ a maior das duas lajes
    const AsNeg = barArea(ng.phi) / ng.s * 1e4, AsMax = Math.max(...d.lajes.map((x) => Math.max(...x.As.neg)));
    expect(AsNeg).toBeGreaterThanOrEqual(AsMax - 1e-6);
    // negativa de borda sem continuidade: ≥ 0,15 × 4 m a partir da face (eixo + 7,5 cm), com gancho na viga
    const nb = dt.posicoes.filter((p) => p.tipo === 'negativa-borda');
    expect(nb).toHaveLength(3);
    for (const p of nb) { expect(p.lados![0]).toBeGreaterThanOrEqual(0.075 + 0.6 - 1e-9); expect(p.ganchos[0]).toBeGreaterThan(0); expect(barArea(p.phi) / p.s).toBeGreaterThanOrEqual(0.67 * 0.0015 * 0.12 - 1e-12); }
    // distribuição sob cada negativo, s ≤ 33 cm
    expect(dt.posicoes.filter((p) => p.tipo === 'distribuicao').length).toBe(nb.length + dt.posicoes.filter((p) => p.tipo === 'negativa').length);
    for (const p of dt.posicoes.filter((x) => x.tipo === 'distribuicao')) expect(p.s).toBeLessThanOrEqual(0.33 + 1e-9);
    // cantos externos: 2 cantos × 2 direções
    expect(dt.posicoes.filter((p) => p.tipo === 'canto')).toHaveLength(4);
    // comprimentos múltiplos de 5 cm, peso e resumo com perdas, repetições
    for (const p of dt.posicoes) expect(Math.abs(p.comprimento / 0.05 - Math.round(p.comprimento / 0.05))).toBeLessThan(1e-6);
    expect(dt.peso).toBeCloseTo(dt.posicoes.reduce((t, p) => t + p.n * p.comprimento * barArea(p.phi) * 7850, 0), 9);
    const tot = d.detalhesLajes!.reduce((t, x) => t + x.peso * x.repeticoes, 0);
    expect(d.resumoAcoLajes!.reduce((t, x) => t + x.peso, 0)).toBeCloseTo(tot, 6);
    expect(d.resumoAcoLajes!.reduce((t, x) => t + x.pesoComPerdas, 0)).toBeCloseTo(1.1 * tot, 6);
    // serializável (vai do worker para a interface)
    expect(JSON.parse(JSON.stringify(d.detalhesLajes))).toEqual(d.detalhesLajes);
  });

  it('negativo pelo perfil NBR (só o diagrama) não é maior que o do padrão do sistema', () => {
    const { s, d } = lajes([4, 4]);
    const sis = d.detalhesLajes!.flatMap((x) => x.posicoes).find((p) => p.tipo === 'negativa')!;
    s.executar('opcoes.definir', { valores: { lajeNegativoVao: 0, lajeArmaduraCanto: 0, lajePernasNegativos: 0 } });
    const an = analisarEdificio(s.modelo);
    expect(opcoesEmUso(s.modelo.opcoes).lajeNegativoVao).toBe(0);
    const d2 = dimensionarEdificio(s.modelo, an), nbr = d2.detalhesLajes!.flatMap((x) => x.posicoes).find((p) => p.tipo === 'negativa')!;
    expect(nbr.lados![0] + nbr.lados![1]).toBeLessThanOrEqual(sis.lados![0] + sis.lados![1] + 1e-9);
    expect(nbr.lados![0]).toBeGreaterThan(0.075); // ao menos meia viga + 10φ, e o diagrama da grelha
    expect(nbr.ganchos).toEqual([0, 0]);
    expect(d2.detalhesLajes!.flatMap((x) => x.posicoes).some((p) => p.tipo === 'canto')).toBe(false);
  });

  it('furo interrompe as positivas e gera reforço; borda livre de balanço gera U', () => {
    const { s, d } = lajes([4], (ok, s) => {
      ok('laje.abertura', { id: s.modelo.lajes[0].id, contorno: [[1.5, 2], [2.5, 2], [2.5, 3], [1.5, 3]] });
      ok('laje.criar', { grupo: 'g_3', contorno: [[0, 5], [4, 5], [4, 6.2], [0, 6.2]], tipo: { tipo: 'macica', h: 0.12 } });
    });
    const [L1, Lb] = s.modelo.lajes;
    const dt = d.detalhesLajes!.find((x) => x.laje === L1.id)!;
    const furo = dt.posicoes.filter((p) => p.tipo === 'furo');
    expect(furo.length).toBe(4); // 2 direções × 2 lados
    for (const p of furo) expect(p.comprimento).toBeGreaterThanOrEqual(1 + 2 * dt.lb.inf - 1e-9);
    // há positivas mais curtas (interrompidas pelo furo) além das inteiras
    const comps = new Set(dt.posicoes.filter((p) => p.tipo === 'positiva').map((p) => p.comprimento));
    expect(comps.size).toBeGreaterThanOrEqual(3);
    const bal = d.detalhesLajes!.find((x) => x.laje === Lb.id)!;
    expect(bordasDaLaje(s.modelo, Lb).filter((x) => x.tipo === 'livre')).toHaveLength(3);
    expect(bal.posicoes.filter((p) => p.tipo === 'borda-livre')).toHaveLength(3);
    expect(bal.posicoes.filter((p) => p.tipo === 'borda-livre-long')).toHaveLength(3);
    // negativo da borda comum (y = 5): detalhado numa só laje, com o lado do balanço limitado ao pano (1,2 m − cobrimento)
    const neg = d.detalhesLajes!.flatMap((x) => x.posicoes).filter((p) => p.tipo === 'negativa');
    expect(neg).toHaveLength(1);
    expect(Math.max(...neg[0].lados!)).toBeLessThanOrEqual(5 / 2 + 1e-9);
  });
});
