// Memória detalhada (MD fase 3b): flecha das lajes nervuradas bidirecionais, treliçadas, de vigotas por ficha e alveolares (flecha
// da laje e flecha de cada alinhamento, com a rigidez fissurada de Branson). As contas são refeitas a partir das `entradas` e
// comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento, type ResultadoLaje } from '../building/dimensionamento';
import type { BuildingModel } from '../building/types';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import type { PassoMemoria } from './registrador';

type Ok = (n: string, p: Record<string, unknown>) => void;
const mk = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); const ok: Ok = (n, p) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); }; return { s, ok }; };

/** Pano 6 × 6 de nervuradas bidirecionais com vigas 20 × 60. */
function nervurada(opcoes?: Record<string, number>, q?: number): BuildingModel {
  const { s, ok } = mk(), a = 6;
  ok('lote', { comandos: [[0, 0], [a, 0], [0, a], [a, a]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.2, h: 0.6 } } });
  ok('lote', { comandos: [v([[0, 0], [a, 0]]), v([[0, a], [a, a]]), v([[0, 0], [0, a]]), v([[a, 0], [a, a]])] });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.35, capa: 0.05 } });
  if (q !== undefined) ok('grupo.editar', { id: 'g_3', q });
  if (opcoes) ok('opcoes.definir', { valores: opcoes });
  return s.modelo;
}
/** Lajes de vigotas (treliçadas, por ficha ou moldadas) na direção x, vãos informados e 5 m em y. */
function vigotas(tipo: Record<string, unknown>, vaos: number[], opcoes?: Record<string, number>, q?: number, biapoiada = false): BuildingModel {
  const { s, ok } = mk();
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]), L = xs.at(-1)!;
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo });
  if (biapoiada) ok('laje.editar', { id: s.modelo.lajes[0].id, vigotasBiapoiadas: true });
  if (q !== undefined) ok('grupo.editar', { id: 'g_3', q });
  if (opcoes) ok('opcoes.definir', { valores: opcoes });
  return s.modelo;
}
/** Pano alveolar de 6 × 4,8 m (placas em y), dois tramos quando `meio`. */
function alveolar(processo: number, meio: boolean, opcoes: Record<string, number> = {}): BuildingModel {
  const { s, ok } = mk(), Lx = 6, L = 4.8, Ly = meio ? 2 * L : L, ys = meio ? [0, L, Ly] : [0, Ly];
  ok('vento.definir', { ativo: false });
  ok('lote', { comandos: ys.flatMap((y) => [0, Lx].map((x) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.4, h: 0.4 } } }))) });
  ok('lote', { comandos: [...ys.map((y) => [[0, y], [Lx, y]]), [[0, 0], [0, Ly]], [[Lx, 0], [Lx, Ly]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.4, h: 2 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'alveolar', ficha: 'ex:alveolar', placa: 'A25-3' } });
  ok('carga.area', { grupo: 'g_3', caso: 'G', contorno: [[-0.3, -0.3], [Lx + 0.3, -0.3], [Lx + 0.3, Ly + 0.3], [-0.3, Ly + 0.3]], valor: 3 });
  ok('opcoes.definir', { valores: { alveolarProcesso: processo, ...opcoes } });
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
interface Caso { nome: string; dim: Dimensionamento; dimMem: Dimensionamento; mem: MemoriaDetalhada; lajes: ResultadoLaje[] }
const CASOS: Caso[] = [];
function caso(nome: string, b: BuildingModel): Caso {
  const an = analisarEdificio(b), dim = dimensionarEdificio(b, an, { fundacao: false }), r = memoriaDetalhada(b, { an });
  const c = { nome, dim, dimMem: r.dim, mem: r.memoria, lajes: dim.lajes };
  CASOS.push(c);
  return c;
}
const N1 = caso('nervurada, fator simplificado (padrão)', nervurada());
const N2 = caso('nervurada, método NBR por etapas', nervurada({ fatorFlechaLaje: 0 }, 6));
const N3 = caso('nervurada, fator κ(1+αf)', nervurada({ fatorFlechaLaje: 0, flechaEtapas: 0 }, 6));
const T1 = caso('treliçada, fator simplificado', vigotas({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 }, [4.5]));
const T2 = caso('treliçada, método NBR', vigotas({ tipo: 'trelicada', modelo: 'H12', capa: 0.04 }, [4.5], { fatorFlechaLaje: 0, fatorFlechaAtivaTrelicada: 0, fatorFlechaConfortoTrelicada: 0 }));
const F1 = caso('vigotas armadas, alinhamentos', vigotas({ tipo: 'vigotas', ficha: 'ex:armada', serie: 'A12' }, [4, 4], undefined, 3));
const F2 = caso('vigotas moldadas, alinhamentos', vigotas({ tipo: 'moldada', capa: 0.05, intereixo: 0.5, bw: 0.1, h: 0.25, enchimento: 'eps' }, [4, 4], undefined, 3));
const AL0 = caso('alveolar escorada', alveolar(0, true));
const AL2 = caso('alveolar, duas fases', alveolar(2, true));

const tf = 'Flecha (ELS-DEF)';
const el = (r: ResultadoLaje) => `Laje ${r.nome}`;
const passosDe = (c: Caso, r: ResultadoLaje, topico: string | RegExp) => c.mem.passos.filter((p) => p.elemento === el(r) && (typeof topico === 'string' ? p.topico === topico : topico.test(p.topico)));
const achar = (c: Caso, r: ResultadoLaje, topico: string, desc: string): PassoMemoria => { const p = passosDe(c, r, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${topico} / ${desc}`); return p; };
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;

/** Tópico da cadeia de flecha (o da laje ou do alinhamento, com ou sem o sufixo do pavimento) cujo total é o do dimensionamento. */
function topicoDe(c: Caso, r: ResultadoLaje, base: string, total: number): string {
  const tops = [...new Set(c.mem.passos.filter((p) => p.elemento === el(r) && (p.topico === base || p.topico.startsWith(`${base} · `))).map((p) => p.topico))];
  const t = tops.find((tp) => { const p = passosDe(c, r, tp).find((x) => x.descricao.startsWith('Flecha total')); return !!p && rel(p.resultado as number, total) < 1e-9; });
  if (!t) throw new Error(`sem cadeia de flecha para ${base} (${r.nome}, ${r.pavimento}): ${tops.join(' / ')}`);
  return t;
}
/** Refaz o total, a ativa e a variável de uma cadeia de flecha (laje ou alinhamento) a partir das entradas. */
function conferirCadeia(c: Caso, r: ResultadoLaje, topico: string, ref: { total: number; ativa: number; variavel: number }, kappaRef?: number) {
  const flQ = achar(c, r, topico, 'Flechas elásticas da grelha');
  const total = passosDe(c, r, topico).find((p) => p.descricao.startsWith('Flecha total'))!;
  expect(rel(total.resultado as number, ref.total)).toBeLessThan(1e-9);
  if (total.descricao.includes('simplificado')) expect(rel(num(total, 'fator') * num(flQ, 'flQP'), ref.total)).toBeLessThan(1e-9);
  else if (total.descricao.includes('etapas')) {
    const fd = achar(c, r, topico, 'Flecha diferida'), et = passosDe(c, r, topico).filter((p) => p.descricao.startsWith('Etapa '));
    const soma = et.reduce((t, p) => t + num(p, 'carga') * num(p, 'dXi'), 0);
    expect(et.length).toBeGreaterThan(0);
    expect(rel(soma, num(fd, 'soma'))).toBeLessThan(1e-9);
    expect(rel(num(total, 'fi') + soma / (1 + 50 * num(fd, 'rho')), ref.total)).toBeLessThan(1e-9);
  } else {
    expect(rel(num(total, 'flQP') * num(total, 'kappa') * (1 + num(total, 'afR')), ref.total)).toBeLessThan(1e-9);
    if (kappaRef !== undefined) expect(rel(num(total, 'kappa'), kappaRef)).toBeLessThan(1e-9);
  }
  const af = achar(c, r, topico, 'Flecha ativa'), vq = achar(c, r, topico, 'Flecha das cargas variáveis');
  expect(rel(af.resultado as number, ref.ativa)).toBeLessThan(1e-9);
  expect(rel(vq.resultado as number, ref.variavel)).toBeLessThan(1e-9);
  const inst = passosDe(c, r, topico).find((p) => p.descricao.startsWith('Flechas instantâneas por categoria'));
  if (inst) expect(rel(num(inst, 'pp') + num(inst, 'alvenaria') + num(inst, 'revestimento'), inst.resultado as number)).toBeLessThan(1e-9);
}

describe('MD3b: flecha das lajes nervuradas, de vigotas e alveolares', () => {
  for (const c of CASOS) {
    it(`${c.nome}: dimensionamento idêntico com a memória ligada, flecha da laje e exportações`, () => {
      expect(c.lajes.length).toBeGreaterThan(0);
      expect(c.dimMem.lajes).toEqual(c.dim.lajes);
      expect(c.dimMem.vigotas).toEqual(c.dim.vigotas);
      expect(c.dimMem.nervuradas).toEqual(c.dim.nervuradas);
      expect(c.dimMem.alveolares).toEqual(c.dim.alveolares);
      for (const r of c.lajes) {
        const t = topicoDe(c, r, tf, r.flecha), ps = passosDe(c, r, t);
        expect(ps.length, `${r.nome}`).toBeGreaterThan(5);
        for (const p of ps) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
        conferirCadeia(c, r, t, { total: r.flecha, ativa: r.flechas!.ativa, variavel: r.flechaQ });
        expect(rel(achar(c, r, t, 'Flecha ativa').entradas.limite as number, r.flechas!.limites.ativa)).toBeLessThan(1e-9);
        expect(htmlMemoriaCorpo(c.mem)).toContain(el(r));
      }
      expect(csvMemoria(c.mem).length).toBeGreaterThan(1000);
    });

    it(`${c.nome}: Branson da nervura, κ e fase 1`, () => {
      for (const r of c.lajes) {
        const ps = passosDe(c, r, topicoDe(c, r, tf, r.flecha));
        const br = ps.find((p) => p.descricao.startsWith('Fissuração (Branson) da nervura'));
        const kp = ps.find((p) => p.descricao.startsWith('Fator de fissuração da laje'));
        if (br) {
          const e = br.entradas as Record<string, number>, M = Math.abs(e.Ma), rr = M <= e.Mfis ? 1 : (e.Mfis / M) ** 3, EIe = Math.min(e.EI, rr * e.EI + (1 - rr) * e.EIfis);
          expect(rel(Math.max(0.01, Math.min(1, EIe / e.EI)), e.f)).toBeLessThan(1e-9);
          expect(rel(e.f, br.resultado as number)).toBeLessThan(1e-9);
          expect(e.nFiss).toBeLessThanOrEqual(e.n);
          expect(e.EIfis).toBeLessThanOrEqual(e.EI + 1e-9);
        }
        if (kp) {
          const e = kp.entradas as Record<string, number>;
          expect(rel(Math.max(1, e.cr / e.el), kp.resultado as number)).toBeLessThan(1e-9);
          expect(rel(e.kappa, kp.resultado as number)).toBeLessThan(1e-9);
          const tot = ps.find((p) => p.descricao.startsWith('Flecha total (quase permanente com fissuração'));
          if (tot) expect(rel(num(tot, 'kappa'), e.kappa)).toBeLessThan(1e-9);
        }
        const f1 = ps.find((p) => p.descricao.startsWith('Flecha da fase 1'));
        if (f1) {
          const e = f1.entradas as Record<string, number>;
          expect(rel((5 * e.pp * e.vao ** 4) / (384 * e.EI), f1.resultado as number)).toBeLessThan(1e-9);
          const fl = ps.find((p) => p.descricao.startsWith('Flechas elásticas da grelha'))!;
          expect(num(fl, 'flQP')).toBeGreaterThan(e.f1 - 1e-12);
        }
      }
    });

    it(`${c.nome}: flecha de cada alinhamento`, () => {
      for (const r of c.lajes) {
        const fv = r.flechasVigotas ?? [];
        fv.forEach((f, i) => {
          const t = topicoDe(c, r, `Flecha do alinhamento ${i + 1}`, f.total), k = achar(c, r, t, `Alinhamento ${i + 1}`), e = k.entradas as Record<string, number>;
          expect(rel(Math.max(1, e.cr / e.el), f.kappa)).toBeLessThan(1e-9);
          expect(rel(e.kappa, f.kappa)).toBeLessThan(1e-9);
          expect(rel(e.t, f.t)).toBeLessThan(1e-9);
          expect(rel(e.L, f.L)).toBeLessThan(1e-9);
          conferirCadeia(c, r, t, { total: f.total, ativa: f.ativa, variavel: f.variavel }, f.kappa);
        });
      }
    });
  }

  it('cobertura: Branson, κ, etapas, fator, simplificado, alinhamentos e fase 1', () => {
    const tem = (c: Caso, re: RegExp) => c.lajes.some((r) => c.mem.passos.some((p) => p.elemento === el(r) && re.test(p.descricao)));
    expect(tem(N1, /^Flecha total pelo fator simplificado/)).toBe(true);
    expect(tem(N2, /^Etapa 1/)).toBe(true);
    expect(tem(N3, /^Flecha total \(quase permanente com fissuração/)).toBe(true);
    expect(tem(F1, /^Fissuração \(Branson\) da nervura/)).toBe(true);
    expect(tem(F2, /^Fissuração \(Branson\) da nervura/)).toBe(true);
    expect(tem(AL0, /^Fissuração \(Branson\) da nervura/)).toBe(true);
    expect(tem(T1, /^Flecha total pelo fator simplificado/)).toBe(true);
    expect(tem(T2, /^Etapa 1/)).toBe(true);
    expect(F1.lajes.some((r) => (r.flechasVigotas ?? []).length > 0)).toBe(true);
    expect(F2.lajes.some((r) => (r.flechasVigotas ?? []).length > 0)).toBe(true);
    expect(tem(AL0, /^Fator de fissuração da laje/)).toBe(true);
    expect(tem(AL2, /^Flecha da fase 1/)).toBe(true);
    expect(c3(F1)).toBe(true);
  });
});
const c3 = (c: Caso) => c.lajes.some((r) => c.mem.passos.some((p) => p.elemento === el(r) && /^Flecha do alinhamento/.test(p.topico)));
