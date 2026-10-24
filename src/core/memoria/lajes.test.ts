// Memória detalhada (MD fase 2): lajes maciças. Os valores registrados são os usados no cálculo: as contas são refeitas
// a partir das `entradas` e comparadas com o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, woodArmer, type Dimensionamento, type ResultadoLaje } from '../building/dimensionamento';
import type { BuildingModel } from '../building/types';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { htmlMemoriaCorpo } from './html';
import type { PassoMemoria } from './registrador';

function predio(valores?: Record<string, number>, h = 0.12): BuildingModel {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  s.executar('lote', { comandos: [[0, 0], [6, 0], [12, 0], [0, 5], [6, 5], [12, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } })) });
  const v = (p: number[][]) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.4 } } });
  s.executar('lote', { comandos: [v([[0, 0], [12, 0]]), v([[0, 5], [12, 5]]), v([[0, 0], [0, 5]]), v([[6, 0], [6, 5]]), v([[12, 0], [12, 5]])] });
  s.executar('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h } });
  if (valores) s.executar('opcoes.definir', { valores });
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));

interface Caso { nome: string; b: BuildingModel; dim: Dimensionamento; dimMem: Dimensionamento; mem: MemoriaDetalhada }
function rodar(nome: string, valores?: Record<string, number>, h?: number): Caso {
  const b = predio(valores, h), an = analisarEdificio(b);
  const dim = dimensionarEdificio(b, an, { fundacao: false });
  const r = memoriaDetalhada(b, { an });
  return { nome, b, dim, dimMem: r.dim, mem: r.memoria };
}

const CASOS: Caso[] = [];
function caso(nome: string, valores?: Record<string, number>, h?: number) { const c = rodar(nome, valores, h); CASOS.push(c); return c; }

// padrão do sistema (flecha pelo fator simplificado); método da NBR (etapas + fissuração de Branson);
// sem Wood-Armer, sem etapas, com momentos mínimos, inércia média do vão e limite de fissura apertado
const A = caso('padrão');
const B = caso('método NBR', { fatorFlechaLaje: 0 }, 0.09);
const C = caso('barras, mínimos e fissura', { fatorFlechaLaje: 0, flechaEtapas: 0, woodArmer: 0, lajeMomentoMinPositivo: 20, lajeMomentoMinNegativo: 14, inerciaMediaVao: 1, limiteFissura: 0.08, inerciaHomogeneizada: 1 }, 0.09);

/** Lajes registradas: resultado e elemento da memória (a primeira laje de cada id leva o nome simples; as demais, com o pavimento). */
interface LajeReg extends ResultadoLaje { el: string; principal: boolean }
const lajesDe = (c: Caso): LajeReg[] => {
  const reg = new Set<string>(), out: LajeReg[] = [];
  for (const r of c.dim.lajes) {
    const base = `Laje ${r.nome}`;
    if (!reg.has(base) && c.mem.elementos.includes(base)) { reg.add(base); out.push({ ...r, el: base, principal: true }); }
    else if (c.mem.elementos.includes(`${base} · ${r.pavimento}`)) out.push({ ...r, el: `${base} · ${r.pavimento}`, principal: false });
  }
  return out;
};
const passosDe = (c: Caso, el: string, topico?: string) => c.mem.passos.filter((p) => p.elemento === el && (!topico || p.topico === topico));
const achar = (c: Caso, el: string, desc: string, topico?: string): PassoMemoria => { const p = passosDe(c, el, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${el} / ${topico ?? ''} / ${desc}`); return p; };
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;

describe('MD2: lajes maciças', () => {
  for (const c of CASOS) {
    it(`${c.nome}: dimensionamento e detalhamento idênticos com a memória ligada`, () => {
      expect(c.dimMem.lajes).toEqual(c.dim.lajes);
      expect(c.dimMem.detalhesLajes).toEqual(c.dim.detalhesLajes);
      expect(c.dimMem.vigas).toEqual(c.dim.vigas);
      expect(lajesDe(c).length).toBe(6);
    });

    it(`${c.nome}: etapas, elementos e campos de cada passo`, () => {
      for (const r of lajesDe(c)) {
        const el = r.el, ps = passosDe(c, el);
        expect(ps.length).toBeGreaterThan(40);
        const etapas = new Set(ps.map((p) => p.etapa));
        for (const e of ['cargas', 'esforcos', 'dimensionamento', 'detalhamento']) expect(etapas.has(e as never), `${el} ${e}`).toBe(true);
        for (const p of ps) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
      }
      expect(c.mem.elementos.filter((e) => e.startsWith('Laje ')).length).toBe(lajesDe(c).length);
    });

    it(`${c.nome}: momentos, flexão e armadura refeitos a partir dos registrados`, () => {
      for (const r of lajesDe(c)) {
        const el = r.el, tm = 'Momentos da grelha – ELU';
        // fatores ELU por caso
        const fat = achar(c, el, 'Fatores de ponderação por caso (ELU)', tm);
        expect(Object.keys(fat.entradas).length).toBeGreaterThan(1);
        for (const face of ['pos', 'neg'] as const) for (const k of [0, 1] as const) {
          const nome = face === 'pos' ? 'positiva' : 'negativa', rot = face === 'pos' ? 'positivo máximo' : 'negativo máximo';
          const final = (face === 'pos' ? r.mPos : r.mNeg)[k];
          const ext = passosDe(c, el, tm).find((p) => p.descricao.startsWith(`Momento ${rot} na direção ${k}`));
          const md = passosDe(c, el, `Momento de dimensionamento – ${nome}, direção ${k}`).find((p) => p.descricao.startsWith('Momento de dimensionamento'));
          if (!ext) { expect(final === 0 || md !== undefined).toBe(true); if (!md) continue; }
          let Mgrelha = 0;
          if (ext) {
            if (ext.descricao.includes('Wood-Armer')) {
              const w = woodArmer(num(ext, 'mx'), num(ext, 'my'), num(ext, 'mxy'));
              Mgrelha = (face === 'pos' ? w.inf : w.sup)[k];
              expect(rel(Mgrelha, ext.resultado as number)).toBeLessThan(1e-9);
              // mx, my e mxy do nó: soma dos valores característicos por caso × fator
              const no = num(ext, 'no'), pn = passosDe(c, el, tm).filter((p) => p.entradas.no === no);
              const somaK = (p: PassoMemoria, pre: string) => Object.keys(p.entradas).filter((q) => q.startsWith('γ_')).reduce((t, q) => t + num(p, q) * num(p, `${pre}_${q.slice(2)}`), 0);
              const pmx = pn.find((p) => p.descricao.startsWith('Momento mx'))!, pmy = pn.find((p) => p.descricao.startsWith('Momento my'))!, pt = pn.find((p) => p.descricao.startsWith('Momento volvente'))!;
              expect(Math.abs(somaK(pmx, 'mxk') - num(ext, 'mx'))).toBeLessThan(1e-9 * Math.max(1, Math.abs(num(ext, 'mx'))));
              expect(Math.abs(somaK(pmy, 'myk') - num(ext, 'my'))).toBeLessThan(1e-9 * Math.max(1, Math.abs(num(ext, 'my'))));
              expect(Math.abs(Math.max(somaK(pt, 'txk'), somaK(pt, 'tyk')) - num(ext, 'mxy'))).toBeLessThan(1e-9 * Math.max(1, Math.abs(num(ext, 'mxy'))));
            } else {
              Mgrelha = Object.keys(ext.entradas).filter((q) => q.startsWith('γ_')).reduce((t, q) => t + num(ext, q) * num(ext, `Mk_${q.slice(2)}`), 0);
              expect(Math.abs(Mgrelha - (ext.resultado as number))).toBeLessThan(1e-9 * Math.max(1, Math.abs(Mgrelha)));
            }
          }
          // momento de dimensionamento = máx/mín(grelha; mínimo)
          expect(md).toBeDefined();
          const Mmin = num(md!, 'Mmin');
          expect(rel(face === 'pos' ? Math.max(num(md!, 'Mgrelha'), Mmin) : Math.min(num(md!, 'Mgrelha'), -Mmin), final)).toBeLessThan(1e-9);
          expect(Math.abs(num(md!, 'Mgrelha') - Mgrelha)).toBeLessThan(1e-9 * Math.max(1, Math.abs(Mgrelha)));
          if (Mmin > 0) {
            const pm = achar(c, el, 'Momento mínimo', `Momento de dimensionamento – ${nome}, direção ${k}`);
            expect(rel((num(pm, 'p') * num(pm, 'vao') ** 2) / num(pm, 'x'), Mmin)).toBeLessThan(1e-9);
          }
          // flexão: equilíbrio e armadura necessária = máx(mín; flexão)
          const tf = `Flexão – armadura ${nome}, direção ${k}`, nec = achar(c, el, 'Armadura necessária por metro', tf), mn = achar(c, el, 'Armadura mínima por metro', tf);
          expect(rel(num(mn, 'rho') * num(mn, 'h'), mn.resultado as number)).toBeLessThan(1e-9);
          if (final) {
            const ln = achar(c, el, 'Linha neutra', tf), C1 = achar(c, el, 'Resultante de compressão', tf);
            const x = ln.resultado as number, Crec = num(ln, 'sigmaCd') * num(ln, 'b') * num(ln, 'lambda') * x;
            expect(rel(Crec, C1.resultado as number)).toBeLessThan(1e-9);
            expect(rel(Crec * (num(ln, 'd') - (num(ln, 'lambda') * x) / 2) * 1000, Math.abs(final))).toBeLessThan(1e-9);
            const At = achar(c, el, 'Armadura de tração', tf);
            expect(rel(num(At, 'C') / num(At, 'fyd'), At.resultado as number)).toBeLessThan(1e-9);
            expect(rel(Math.max(num(mn, 'rho') * num(mn, 'h') , At.resultado as number) * 1e4, nec.resultado as number)).toBeLessThan(1e-9);
          } else expect(rel(num(mn, 'rho') * num(mn, 'h') * 1e4, nec.resultado as number)).toBeLessThan(1e-9);
          // armadura final do dimensionamento: a necessária, ou o resultado do aumento por fissuração
          const aum = passosDe(c, el, `Fissuração – armadura ${nome}, direção ${k}`).find((p) => p.descricao.startsWith('Aumento da armadura'));
          const esperado = aum ? (aum.resultado as number) : (nec.resultado as number);
          expect(rel(esperado, r.As[face][k])).toBeLessThan(1e-9);
          if (aum) expect(rel(num(aum, 'As0') * 1.1 ** num(aum, 'passos'), aum.resultado as number)).toBeLessThan(1e-9);
        }
      }
    });

    it(`${c.nome}: fissuração, cortante e barras refeitos`, () => {
      for (const r of lajesDe(c)) {
        const el = r.el;
        const resumo = achar(c, el, 'Maior abertura característica de fissuras da laje', 'Fissuração – resumo');
        expect(rel(resumo.resultado as number, r.wk)).toBeLessThan(1e-9);
        let maior = 0;
        for (const face of ['positiva', 'negativa']) for (const k of [0, 1]) {
          const tf = `Fissuração – armadura ${face}, direção ${k}`, ps = passosDe(c, el, tf);
          if (!ps.length) continue;
          const w1 = achar(c, el, 'Abertura w1', tf), w2 = achar(c, el, 'Abertura w2', tf), wk = achar(c, el, 'Abertura característica', tf);
          const k1 = (num(w1, 'phi') / (12.5 * num(w1, 'eta1'))) * (num(w1, 'sigmaS') / num(w1, 'Es'));
          expect(rel(k1 * ((3 * num(w1, 'sigmaS')) / num(w1, 'fctm')), w1.resultado as number)).toBeLessThan(1e-9);
          expect(rel(k1 * (4 / num(w2, 'rhoR') + 45), w2.resultado as number)).toBeLessThan(1e-9);
          expect(rel(Math.min(w1.resultado as number, w2.resultado as number), wk.resultado as number)).toBeLessThan(1e-9);
          maior = Math.max(maior, wk.resultado as number);
          const br = achar(c, el, 'Barras consideradas', tf);
          expect(rel((Math.PI * (num(br, 'phi') / 1000) ** 2) / 4 / num(br, 's'), br.resultado as number)).toBeLessThan(1e-9);
        }
        expect(rel(maior, r.wk)).toBeLessThan(1e-9);

        // cortante
        if (r.cortante) {
          const cr = r.cortante, tcz = (k: number) => `Cortante da laje – direção ${k}`;
          const v2 = achar(c, el, 'Resistência da biela comprimida por metro de largura', 'Cortante da laje (19.4)');
          expect(rel(0.27 * num(v2, 'av2') * num(v2, 'fcd') * num(v2, 'd') * 1000, cr.VRd2)).toBeLessThan(1e-9);
          let Asw = 0;
          for (const k of [0, 1] as const) {
            const vs = passosDe(c, el, tcz(k)).find((p) => p.descricao.startsWith('Cortante de cálculo'))!;
            const soma = Object.keys(vs.entradas).filter((q) => q.startsWith('γ_')).reduce((t, q) => t + num(vs, q) * num(vs, `Vk_${q.slice(2)}`), 0);
            expect(Math.abs(Math.abs(soma) - cr.VSd[k])).toBeLessThan(1e-9 * Math.max(1, cr.VSd[k]));
            const r1 = achar(c, el, 'Resistência sem armadura transversal', tcz(k));
            expect(rel(0.25 * num(r1, 'fctd') * num(r1, 'k') * (1.2 + 40 * num(r1, 'rho')) * num(r1, 'd') * 1000, cr.VRd1[k])).toBeLessThan(1e-9);
            expect(rel(Math.max(1, 1.6 - num(r1, 'd')), num(r1, 'k'))).toBeLessThan(1e-9);
            const aw = passosDe(c, el, tcz(k)).find((p) => p.descricao.startsWith('Armadura transversal necessária'));
            if (aw) { Asw = Math.max(Asw, aw.resultado as number); expect(rel((Math.max(0, num(aw, 'VSd') - num(aw, 'Vc')) * 1e4) / (0.9 * num(aw, 'd') * num(aw, 'fywd') * 1000), aw.resultado as number)).toBeLessThan(1e-9); }
          }
          expect(Math.abs(Asw - cr.Asw)).toBeLessThan(1e-9 * Math.max(1, cr.Asw));
        }

        // barras (tabela de armadura): As,ef = π·φ²/4 / s
        const bs = passosDe(c, el).filter((p) => p.topico.startsWith('Barras – armadura'));
        expect(bs.length).toBeGreaterThan(0);
        for (const p of bs) expect(rel((Math.PI * (num(p, 'phi') / 1000) ** 2) / 4 / num(p, 's'), p.resultado as number)).toBeLessThan(1e-9);
        const det = c.dim.detalhesLajes!.find((d) => d.laje === r.laje)!;
        for (const p of r.principal ? passosDe(c, el, 'Positivas – malha') : []) {
          const dir = p.descricao.includes('direção 0') ? 0 : 1;
          expect(rel(p.resultado as number, det.positivas[dir].As)).toBeLessThan(1e-9);
          expect(rel(num(p, 'AsNec'), det.positivas[dir].AsNec)).toBeLessThan(1e-9);
        }
      }
    });

    it(`${c.nome}: flecha refeita`, () => {
      for (const r of lajesDe(c)) {
        const el = r.el, tf = 'Flecha (ELS-DEF)';
        const flQ = achar(c, el, 'Flechas elásticas da grelha', tf);
        const total = passosDe(c, el, tf).find((p) => p.descricao.startsWith('Flecha total'))!;
        expect(rel(total.resultado as number, r.flecha)).toBeLessThan(1e-9);
        if (total.descricao.includes('simplificado')) expect(rel(num(total, 'fator') * num(flQ, 'flQP'), r.flecha)).toBeLessThan(1e-9);
        else if (total.descricao.includes('etapas')) {
          const fd = achar(c, el, 'Flecha diferida', tf), et = passosDe(c, el, tf).filter((p) => p.descricao.startsWith('Etapa '));
          const soma = et.reduce((t, p) => t + num(p, 'carga') * num(p, 'dXi'), 0);
          expect(rel(soma, num(fd, 'soma'))).toBeLessThan(1e-9);
          expect(rel(num(total, 'fi') + soma / (1 + 50 * num(fd, 'rho')), r.flecha)).toBeLessThan(1e-9);
        } else {
          expect(rel(num(total, 'flQP') * num(total, 'kappa') * (1 + num(total, 'afR')), r.flecha)).toBeLessThan(1e-9);
        }
        const kap = passosDe(c, el, tf).find((p) => p.descricao.startsWith('Fator de fissuração da laje'));
        if (kap) expect(rel(Math.max(1, num(kap, 'cr') / num(kap, 'el')), kap.resultado as number)).toBeLessThan(1e-9);
        const br = passosDe(c, el, tf).find((p) => p.descricao.startsWith('Fissuração (Branson)'));
        if (br) {
          const k3 = Math.min(1, (num(br, 'Mr') / Math.abs(num(br, 'Ma'))) ** 3);
          expect(rel(Math.min(num(br, 'Ic'), k3 * num(br, 'Ic') + (1 - k3) * num(br, 'III')), num(br, 'Ie'))).toBeLessThan(1e-9);
          expect(rel(Math.min(1, num(br, 'Ie') / (num(br, 'h') ** 3 / 12)), br.resultado as number)).toBeLessThan(1e-9);
        }
        const af = achar(c, el, 'Flecha ativa', tf), vq = achar(c, el, 'Flecha das cargas variáveis', tf);
        expect(rel(af.resultado as number, r.flechas!.ativa)).toBeLessThan(1e-9);
        expect(rel(vq.resultado as number, r.flechaQ)).toBeLessThan(1e-9);
      }
    });

    it(`${c.nome}: negativos e comprimentos conferem com o detalhamento`, () => {
      let achou = 0;
      for (const r of lajesDe(c).filter((q) => q.principal)) {
        const el = r.el, det = c.dim.detalhesLajes!.find((d) => d.laje === r.laje)!;
        const negs = det.posicoes.filter((p) => p.tipo === 'negativa' || p.tipo === 'negativa-borda');
        const comps = passosDe(c, el).filter((p) => p.topico.startsWith('Negativos – ') && p.descricao.startsWith('Comprimento desenvolvido'));
        for (const p of comps) {
          achou++;
          const nn = negs.find((q) => Math.abs(q.comprimento - (p.resultado as number)) < 1e-9);
          expect(nn, `${el} ${p.descricao}`).toBeDefined();
          // soma das partes, arredondada para cima ao passo
          const passo = num(p, 'passo');
          const soma = p.entradas.l1 !== undefined ? num(p, 'l1') + num(p, 'l2') + 2 * num(p, 'perna') : num(p, 'dentro') + num(p, 'fora') + num(p, 'perna') + num(p, 'gancho');
          expect(rel(Math.ceil(soma / passo - 1e-9) * passo, p.resultado as number)).toBeLessThan(1e-9);
          const ls = passosDe(c, el, p.topico).filter((q) => q.descricao.startsWith('Comprimento do negativo'));
          for (const q of ls) expect(rel(Math.min(num(q, 'cap'), Math.max(q.entradas.minViga !== undefined ? Math.max(num(q, 'pct') * num(q, 'vao'), num(q, 'minViga')) : num(q, 'bw2') + num(q, 'pct') * num(q, 'vao'), num(q, 'diag'))), q.resultado as number)).toBeLessThan(1e-9);
          if (nn?.lados) { const obt = ls.map((q) => +(q.resultado as number).toFixed(4)); if (ls.length === 2) expect([...obt].sort()).toEqual([...nn.lados].sort()); else expect(obt[0]).toBe(nn.lados[0]); }
        }
      }
      expect(achou).toBeGreaterThan(0);
    });
  }

  it('HTML e CSV trazem as lajes por etapa e por elemento', () => {
    const c = B, h = htmlMemoriaCorpo(c.mem);
    const r = lajesDe(c)[0], el = `Laje ${r.nome}`;
    expect(h).toContain(`Laje ${r.nome}`);
    expect(h).toContain('Wood-Armer');
    expect(h).toContain('Fissuração');
    expect(h).toContain('Momentos da grelha');
    expect((h.match(/data-passo=/g) ?? []).length).toBe(c.mem.passos.length);
    expect(csvMemoria(c.mem).trim().split('\n').length).toBe(c.mem.passos.length + 1);
    expect(c.mem.escopo).toContain('lajes maciças');
    expect(passosDe(c, el).some((p) => p.etapa === 'cargas')).toBe(true);
  });

  it('filtro por elemento: só os passos globais e os da laje pedida', () => {
    const c = A, r = lajesDe(c)[0], b = c.b;
    const m = memoriaDetalhada(b, { elementos: [`Laje ${r.nome}`] });
    expect(new Set(m.memoria.passos.map((p) => p.elemento))).toEqual(new Set(['Edifício', `Laje ${r.nome}`]));
  });
});

describe('MD2: cobertura dos ramos do cálculo nos exemplos', () => {
  const tem = (c: Caso, trecho: string) => c.mem.passos.some((p) => p.elemento.startsWith('Laje ') && p.descricao.includes(trecho));
  it('Wood-Armer, barras, mínimos, aumento por fissuração, Branson, κ, etapas, fator simplificado e negativos', () => {
    expect(tem(A, 'Wood-Armer')).toBe(true);
    expect(tem(A, 'fator simplificado')).toBe(true);
    expect(tem(B, 'Fissuração (Branson)')).toBe(true);
    expect(tem(B, 'Fator de fissuração da laje')).toBe(true);
    expect(tem(B, 'Etapa 1')).toBe(true);
    expect(tem(C, 'Wood-Armer')).toBe(false);
    expect(tem(C, '(barra ')).toBe(true);
    expect(tem(C, 'Momento mínimo')).toBe(true);
    expect(tem(C, 'Aumento da armadura')).toBe(true);
    expect(tem(C, 'Inércia média do vão')).toBe(true);
    expect(tem(C, 'Flecha total (quase permanente com fissuração')).toBe(true);
    for (const c of CASOS) { expect(tem(c, 'Comprimento do negativo')).toBe(true); expect(tem(c, 'Resistência sem armadura transversal')).toBe(true); }
  });
});
