// R8b na memória de cálculo detalhada: passos das zonas de estribos das vigas (espaçamento e espaçamento transversal entre
// ramos) e da ordem por taxa na armadura longitudinal dos pilares, refeitos a partir dos números registrados (≤ 1e-9);
// resultados idênticos com a memória ligada.
import { describe, expect, it } from 'vitest';
import { barArea } from '../concrete';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio } from '../building/dimensionamento';
import type { PassoMemoria } from './registrador';
import { memoriaDetalhada } from './edificio';

const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));

function vigaLarga(valores: Record<string, number>) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const xs = [0, 8, 16];
  ok('lote', { comandos: xs.flatMap((x) => [0, 6].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  ok('lote', { comandos: [[[0, 0], [16, 0]], [[0, 6], [16, 6]], ...xs.map((x) => [[x, 0], [x, 6]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.6, h: 0.4 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  ok('opcoes.definir', { valores });
  return s.modelo;
}

describe('memória das zonas de estribos das vigas (R8b)', () => {
  const b = vigaLarga({ vigaEstriboRamosTransv: 1, vigaEstriboGrampos: 1, vigaEstriboPhiZona: 12 });
  const an = analisarEdificio(b), nome = `Viga ${b.vigas[0].nome}`;
  const { memoria, dim } = memoriaDetalhada(b, { an, elementos: [nome] });
  const zonas = memoria.passos.filter((p) => p.elemento === nome && p.topico === 'Estribos – zonas');

  it('os resultados do dimensionamento e do detalhamento não mudam com a memória ligada', () => {
    const sem = dimensionarEdificio(b, an, { fundacao: false });
    expect(dim.detalhes).toEqual(sem.detalhes);
    expect(dim.vigas).toEqual(sem.vigas);
  });

  it('espaçamento: s ≤ mín(smáx; ramos·Asw,1/asw) em cada zona, com asw ≥ ρsw,mín·bw', () => {
    const esp = zonas.filter((p) => p.descricao.includes('espaçamento com'));
    expect(esp.length).toBeGreaterThanOrEqual(2);
    for (const p of esp) {
      const lim = Math.min(num(p, 'smax'), (num(p, 'ramos') * barArea(num(p, 'phi'))) / num(p, 'asw'));
      expect(p.resultado as number).toBeLessThanOrEqual(lim + 1e-9);
      expect(num(p, 'asw')).toBeGreaterThanOrEqual(num(p, 'aswMin') - 1e-12);
      // ρsw,mín = 0,2·fct,m/fywk (fck 30: fct,m = 0,3·30^(2/3) = 2,8965 MPa; CA-50: 500 MPa) × bw = 0,60 m
      expect(rel(num(p, 'aswMin'), (0.2 * 0.3 * 30 ** (2 / 3)) / 500 * 0.6)).toBeLessThan(1e-3);
      expect(p.resultado as number).toBeLessThanOrEqual(0.3 + 1e-12); // 18.3.3.2: s ≤ 30 cm no máximo
    }
  });

  it('espaçamento transversal entre ramos: st = (bw − 2c − φt)/(ramos − 1) ≤ st,máx, com st,máx = 0,6d se Vd > 0,20·VRd2', () => {
    const tr = zonas.filter((p) => p.descricao.includes('espaçamento transversal'));
    expect(tr.length).toBeGreaterThanOrEqual(2);
    for (const p of tr) {
      const st = (num(p, 'bw') - 2 * num(p, 'cobLat') - num(p, 'phiT')) / (num(p, 'ramos') - 1);
      expect(rel(st, p.resultado as number)).toBeLessThan(1e-9);
      const stMax = num(p, 'Vd') <= 0.2 * num(p, 'VRd2') ? Math.min(num(p, 'd'), 0.8) : Math.min(0.6 * num(p, 'd'), 0.35);
      expect(rel(stMax, num(p, 'stMax'))).toBeLessThan(1e-9);
      expect(st).toBeLessThanOrEqual(stMax + 1e-9);
      expect(num(p, 'ramos')).toBe(4); // bw = 60 cm, d = 35,4 cm
    }
  });

  it('as zonas registradas coincidem com as do detalhe (bitola, trecho e número de ramos)', () => {
    const det = dim.detalhes!.find((d) => d.viga === b.vigas[0].id)!;
    const esp = zonas.filter((p) => p.descricao.includes('espaçamento com'));
    const principais = det.estribos.filter((z) => !z.grampo && !z.suspensao);
    expect(esp).toHaveLength(principais.length);
    principais.forEach((z, i) => {
      expect(num(esp[i], 'phi')).toBe(z.phi);
      expect(num(esp[i], 'ramos')).toBe(z.ramos ?? 2);
      expect(rel(num(esp[i], 's0'), z.s0)).toBeLessThan(1e-12);
      expect(rel(esp[i].resultado as number, z.s)).toBeLessThan(1e-12);
    });
  });
});

type S = { b: number; h: number };
function predio(vezes: number, sec: S, vb: S, valores: Record<string, number>) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('opcoes.definir', { valores });
  if (vezes) ok('pavimento.repetir', { id: 'pav_6', vezes });
  const xs = [0, 5, 10, 15], ys = [0, 4.5, 9];
  ok('lote', { comandos: xs.flatMap((x) => ys.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', ...sec } } }))) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: vb } });
  ok('lote', { comandos: [...ys.map((y) => v([[0, y], [15, y]])), ...xs.map((x) => v([[x, 0], [x, 9]]))] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s.modelo;
}

describe('ordem por taxa na armadura dos pilares (R8b, K1.12.4-2)', { timeout: 180000 }, () => {
  const sec: S = { b: 0.3, h: 0.3 }, vb: S = { b: 0.2, h: 0.45 };
  const bOn = predio(6, sec, vb, { pilarOrdemTaxa: 1 }), bOff = predio(6, sec, vb, { pilarOrdemTaxa: 0 });
  const anOn = analisarEdificio(bOn), anOff = analisarEdificio(bOff);
  const on = memoriaDetalhada(bOn, { an: anOn }), off = dimensionarEdificio(bOff, anOff, { fundacao: false });

  it('a armadura nunca é maior que a da busca por bitola crescente, e é menor em algum pilar; ambas atendem', () => {
    let menor = 0;
    for (const r of on.dim.pilares) {
      const o = off.pilares.find((x) => x.pilar === r.pilar && x.pavimento === r.pavimento)!;
      if (r.status === 'ok') expect(r.util, `${r.nome} ${r.pavimento}`).toBeLessThanOrEqual(1 + 1e-9);
      if (r.status === 'ok' && o.status === 'ok') { expect(r.As, `${r.nome} ${r.pavimento}`).toBeLessThanOrEqual(o.As + 1e-12); if (r.As < o.As - 1e-9) menor++; }
    }
    expect(menor).toBeGreaterThan(0);
  });

  it('passo "Disposições testadas": a armadura adotada é a mínima entre as bitolas testadas (empate: a menor bitola)', () => {
    const ps = on.memoria.passos.filter((p) => p.descricao.startsWith('Disposições testadas em ordem crescente de taxa'));
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps) {
      const entradas = Object.entries(p.entradas).filter(([k]) => k.startsWith('As_')).map(([k, v]) => [+k.slice(3), v as number] as const).sort((a, z) => a[0] - z[0]);
      expect(entradas.length).toBeGreaterThan(1);
      const minimo = Math.min(...entradas.map((e) => e[1]));
      expect(rel(minimo, p.resultado as number)).toBeLessThan(1e-9);
      // cada As testada é múltiplo inteiro da área da barra da própria bitola
      for (const [phi, As] of entradas) expect(Math.abs(As / barArea(phi) - Math.round(As / barArea(phi)))).toBeLessThan(1e-9);
      const el = p.elemento, adotada = on.memoria.passos.find((q) => q.elemento === el && q.descricao.startsWith('Armadura adotada'))!;
      expect(rel(adotada.resultado as number, p.resultado as number)).toBeLessThan(1e-9);
    }
  });

  it('com a opção desligada o passo não existe', () => {
    const m = memoriaDetalhada(bOff, { an: anOff }).memoria;
    expect(m.passos.some((p) => p.descricao.startsWith('Disposições testadas'))).toBe(false);
  });
});
