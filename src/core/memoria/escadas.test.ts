// Memória detalhada (MD fase 6): escadas. Os valores registrados são os usados no cálculo: as contas são refeitas a partir das
// `entradas` e comparadas com o cálculo e o dimensionamento (erro relativo ≤ 1e-9); a memória ligada não muda o resultado.
// O lance reto biapoiado da E4d (Md = 44,01 kN·m/m; As ≈ 9,3 cm²/m) é conferido contra a solução analítica q·ℓ²/8.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from '../building/analitico';
import { dimensionarEdificio, type Dimensionamento } from '../building/dimensionamento';
import { armarEscadas, type ResultadoArmaduraLance, type TrechoArmadura } from '../building/escadasArmadura';
import { calcularEscadas, cargasDasEscadas, type ResultadoLance } from '../building/escadasCalculo';
import { acoDe, cobrimentoLaje, concretoDe } from '../building/materiais';
import { OPCOES_PADRAO_CALCULO } from '../building/opcoes';
import type { BuildingModel } from '../building/types';
import { woodArmer } from '../building/woodArmer';
import { barArea } from '../concrete';
import { csvMemoria, memoriaDetalhada, type MemoriaDetalhada } from './edificio';
import { elementoLance } from './escadasCalculo';
import { htmlMemoriaCorpo } from './html';
import type { PassoMemoria } from './registrador';

const E = 0.5 / 3, PISO = 0.2967;
const novo = () => { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; };
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((x) => x.mensagem).join(' ')}`).toBe(true); };
interface Ent { tipo: Record<string, unknown>; escada?: Record<string, unknown>; lance?: Record<string, unknown>; opcoes?: Record<string, number> }
function escada({ tipo, escada: esc = {}, lance = {}, opcoes }: Ent): BuildingModel {
  const s = novo();
  ok(s, 'tipoLance.criar', { id: 'T', tipo: { nome: 'T', ...tipo } });
  ok(s, 'escada.criar', { id: 'e1', grupo: 'g_3', origem: [0, 0], angulo: 0, piso: PISO, espelho: E, lances: [{ tipo: 'T', ...lance }], ...esc });
  if (opcoes) ok(s, 'opcoes.definir', { valores: opcoes });
  return s.modelo;
}

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
const num = (p: PassoMemoria, k: string) => p.entradas[k] as number;

interface Caso { nome: string; b: BuildingModel; dim: Dimensionamento; dimMem: Dimensionamento; mem: MemoriaDetalhada; res: ReturnType<typeof calcularEscadas> }
const CASOS: Caso[] = [];
function caso(nome: string, e: Ent): Caso {
  const b = escada(e), an = analisarEdificio(b);
  const dim = dimensionarEdificio(b, an, { fundacao: false });
  const r = memoriaDetalhada(b, { an });
  const c: Caso = { nome, b, dim, dimMem: r.dim, mem: r.memoria, res: an.escadas! };
  CASOS.push(c);
  return c;
}
const A = caso('reto biapoiado', { tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 } });
// patamar apoiado em parede de alvenaria (apoio elástico), vão de 2 lances
const B = caso('patamar com parede de alvenaria', { tipo: { tipologia: 'consecutivos2', trechos: [9, 9], espessura: 0.15 }, lance: { patamares: [{ apoiado: true, apoios: [{ borda: 'frontal', tipo: 'alvenaria', largura: 0.15 }] }] } });
// quartos de volta: quinas, igualações, sem esperas nem passadores, taxa mínima e limite de fissura informados
const C = caso('quarto de volta, igualações e opções', { tipo: { tipologia: 'quartoVolta3', trechos: [6, 6, 6], espessura: 0.15 }, opcoes: { escadaIgualarSecoes: 1, escadaIgualarSupInf: 1, escadaEsperas: 0, escadaPassadores: 0, lajeTaxaMin: 0.2, limiteFissura: 0.2 } });
// sobrecarga alta: armadura transversal pelo cortante (19.4.2)
const D = caso('cortante com armadura transversal', { tipo: { tipologia: 'reto', trechos: [18], espessura: 0.15 }, escada: { sobrecarga: 30 } });
// laje de 12 cm com sobrecarga alta: cortante e fissuração além do limite
const F = caso('laje delgada', { tipo: { tipologia: 'reto', trechos: [18], espessura: 0.12 }, escada: { sobrecarga: 20 }, opcoes: { fatorFlechaLaje: 0 } });

const lancesDe = (c: Caso): { r: ResultadoLance; a: ResultadoArmaduraLance; el: string }[] => c.res.lances.map((r, k) => ({ r, a: c.dim.escadasArmadura![k], el: elementoLance(r) }));
const passosDe = (c: Caso, el: string, topico?: string) => c.mem.passos.filter((p) => p.elemento === el && (!topico || p.topico === topico));
const achar = (c: Caso, el: string, desc: string, topico?: string): PassoMemoria => { const p = passosDe(c, el, topico).find((x) => x.descricao.startsWith(desc)); if (!p) throw new Error(`passo ${el} / ${topico ?? ''} / ${desc}`); return p; };

describe('MD6: escadas', () => {
  for (const c of CASOS) {
    it(`${c.nome}: dimensionamento, armadura e cálculo idênticos com a memória ligada`, () => {
      expect(c.dimMem.escadasArmadura).toEqual(c.dim.escadasArmadura);
      expect(c.dimMem.escadas).toEqual(c.dim.escadas);
      expect(c.dimMem.resumoAcoEscadas).toEqual(c.dim.resumoAcoEscadas);
      expect(c.dimMem.vigas).toEqual(c.dim.vigas);
      expect(c.dimMem.lajes).toEqual(c.dim.lajes);
      expect(c.dim.escadasArmadura!.length).toBe(c.res.lances.length);
    });

    it(`${c.nome}: etapas, elementos e campos de cada passo`, () => {
      for (const { el } of lancesDe(c)) {
        const ps = passosDe(c, el);
        expect(ps.length).toBeGreaterThan(100);
        const etapas = new Set(ps.map((p) => p.etapa));
        for (const e of ['cargas', 'analise', 'esforcos', 'dimensionamento', 'detalhamento']) expect(etapas.has(e as never), `${el} ${e}`).toBe(true);
        for (const p of ps) { expect(p.formula.length).toBeGreaterThan(0); expect(p.expressao.length).toBeGreaterThan(0); }
      }
      expect(c.mem.elementos.filter((e) => e.startsWith('Escada ')).length).toBe(c.res.lances.length);
    });

    it(`${c.nome}: cargas, equilíbrio e reações como cargas lineares refeitos`, () => {
      const cargasAplicadas = cargasDasEscadas(c.res);
      for (const { r, el } of lancesDe(c)) {
        for (const cn of ['G', 'Q'] as const) {
          const tot = achar(c, el, `Carga vertical total do caso ${cn}`, 'Cargas do lance');
          const soma = Object.keys(tot.entradas).filter((k) => k.startsWith('parcela')).reduce((t, k) => t + num(tot, k), 0);
          expect(rel(soma, tot.resultado as number)).toBeLessThan(1e-9);
          expect(tot.resultado).toBe(r.carga[cn]);
          const eq = achar(c, el, `Equilíbrio vertical do caso ${cn}`, 'Equilíbrio e deslocamentos');
          expect(Math.abs(num(eq, 'somaReacoes') / num(eq, 'carga') - 1 - (eq.resultado as number))).toBeLessThan(1e-12);
          expect(eq.resultado).toBe(r.equilibrio[cn]);
          expect(rel(num(eq, 'somaReacoes'), r.apoios.reduce((t, a) => t + a.reacao[cn], 0))).toBeLessThan(1e-12);
        }
        // parcelas por trecho: g·A (+ faixas de degraus) e q·A
        for (const p of passosDe(c, el, 'Cargas do lance')) {
          if (p.descricao.startsWith('Carga permanente do trecho')) {
            let G = num(p, 'permanente') * num(p, 'area');
            for (const k of Object.keys(p.entradas).filter((q) => q.endsWith('_area'))) G += num(p, k.replace('_area', '_permanente')) * num(p, k);
            expect(rel(G, p.resultado as number)).toBeLessThan(1e-9);
          } else if (p.descricao.startsWith('Sobrecarga de uso do trecho')) expect(rel(num(p, 'sobrecarga') * num(p, 'area'), p.resultado as number)).toBeLessThan(1e-9);
          else if (p.descricao.startsWith('Corrimão')) expect(rel((num(p, 'corrimao') / 2) * (num(p, 'L1') + num(p, 'L2')), p.resultado as number)).toBeLessThan(1e-9);
        }
        // a soma das parcelas dos trechos reproduz a carga aplicada ao modelo (pesos e áreas da geometria)
        for (const cn of ['G', 'Q'] as const) {
          const ps = passosDe(c, el, 'Cargas do lance').filter((p) => (cn === 'G' ? /^(Carga permanente|Corrimão)/ : /^Sobrecarga/).test(p.descricao));
          expect(rel(ps.reduce((t, p) => t + (p.resultado as number), 0), r.carga[cn])).toBeLessThan(1e-9);
        }
        // apoio elástico: k′ = E·largura/altura
        for (const ap of r.apoios.filter((a) => !a.rigido)) {
          const p = achar(c, el, `${ap.rotulo}: apoio elástico`, 'Apoios');
          expect(rel((num(p, 'E') * num(p, 'largura')) / num(p, 'altura'), p.resultado as number)).toBeLessThan(1e-9);
          expect(p.resultado).toBe(ap.kLinha);
        }
        // reação como carga linear: q = R/ℓ (+ peso próprio no G)
        for (const ap of r.apoios) for (const cn of ['G', 'Q'] as const) {
          const p = achar(c, el, `${ap.rotulo}, caso ${cn}: reação por metro`, 'Reações como cargas lineares');
          expect(rel(num(p, 'R') / num(p, 'comprimento') + num(p, 'pesoProprio'), p.resultado as number)).toBeLessThan(1e-9);
          expect(p.resultado).toBe(ap.porMetro[cn]);
          expect(num(p, 'R')).toBe(ap.reacao[cn]);
        }
        // carga gravada na obra: arredondamento a 6 casas e o maior valor entre as instâncias
        for (const ca of cargasAplicadas.filter((x) => x.escada!.lance === r.lance)) {
          const p = passosDe(c, el, 'Cargas aplicadas à estrutura').find((q) => num(q, 'valorLance') !== undefined && q.entradas.apoio === ca.escada!.apoio && q.entradas.caso === ca.caso)!;
          expect(p).toBeDefined();
          expect(+num(p, 'valorLance').toFixed(6)).toBe(ca.valor);
          expect(p.resultado).toBe(ca.valor);
        }
      }
      expect(passosDe(c, lancesDe(c)[0].el, 'Cargas aplicadas à estrutura').length).toBeGreaterThan(0);
    });

    it(`${c.nome}: momentos Wood-Armer e cortante por faixa refeitos a partir dos elementos de casca`, () => {
      for (const { r, a, el } of lancesDe(c)) for (const t of a.trechos) {
        const tp = `Esforços do trecho ${t.chave}`, ps = passosDe(c, el, tp);
        const nf = achar(c, el, 'Divisão do trecho', tp);
        expect(nf.resultado).toBe(t.faixas.length);
        expect(rel(num(nf, 'w') * t.faixas.length, num(nf, 'L'))).toBeLessThan(1e-9);
        let n = 0;
        for (const p of ps) {
          const m = /^Faixa (\d+) \(.*momento de cálculo da armadura (inferior|superior) na direção (x|y)/.exec(p.descricao);
          if (m) {
            const k = +m[1] - 1, i = m[3] === 'x' ? 0 : 1, f = t.faixas[k];
            const w = woodArmer(num(p, 'fg') * num(p, 'Gmx') + num(p, 'f') * num(p, 'Qmx'), num(p, 'fg') * num(p, 'Gmy') + num(p, 'f') * num(p, 'Qmy'), num(p, 'fg') * num(p, 'Gmxy') + num(p, 'f') * num(p, 'Qmxy'));
            const val = m[2] === 'inferior' ? w.inf[i] : -w.sup[i];
            expect(rel(val, p.resultado as number)).toBeLessThan(1e-9);
            expect(p.resultado).toBe(m[2] === 'inferior' ? f.mInf[i] : f.mSup[i]);
            // o elemento determinante existe na casca (centroide) e os esforços G e Q são os dele
            const el1 = r.elems.find((q) => q.centro[0] === num(p, 'cx') && q.centro[1] === num(p, 'cy') && q.G[3] === num(p, 'Gmx'));
            expect(el1, `${el} ${p.descricao}`).toBeDefined();
            expect(num(p, 'fg')).toBe(1.4);
            expect([1.4, 0]).toContain(num(p, 'f'));
            n++;
          }
          const mv = /^Faixa (\d+): cortante de cálculo/.exec(p.descricao);
          if (mv) {
            const V = Math.hypot(num(p, 'fg') * num(p, 'Gqx') + num(p, 'f') * num(p, 'Qqx'), num(p, 'fg') * num(p, 'Gqy') + num(p, 'f') * num(p, 'Qqy'));
            expect(rel(V, p.resultado as number)).toBeLessThan(1e-9);
            expect(p.resultado).toBe(t.faixas[+mv[1] - 1].V);
          }
        }
        // toda faixa e componente com momento tem o seu passo
        const esperados = t.faixas.reduce((s, f) => s + [...f.mInf, ...f.mSup].filter((v) => v > 0).length, 0);
        expect(n).toBe(esperados);
        // serviço (combinação frequente): máximo do trecho
        for (const p of ps.filter((q) => q.descricao.startsWith('Momento de serviço'))) {
          const i = /direção y/.test(p.descricao) ? 1 : 0, sup = /superior/.test(p.descricao);
          const w = woodArmer(num(p, 'fg') * num(p, 'Gmx') + num(p, 'f') * num(p, 'Qmx'), num(p, 'fg') * num(p, 'Gmy') + num(p, 'f') * num(p, 'Qmy'), num(p, 'fg') * num(p, 'Gmxy') + num(p, 'f') * num(p, 'Qmxy'));
          expect(rel(sup ? -w.sup[i] : w.inf[i], p.resultado as number)).toBeLessThan(1e-9);
          expect(num(p, 'fg')).toBe(1);
        }
      }
    });

    it(`${c.nome}: flexão por faixa, mínimos e armadura necessária refeitos`, () => {
      for (const { a, el } of lancesDe(c)) for (const t of a.trechos) {
        const amin = num(achar(c, el, 'Armadura mínima de flexão por metro', 'Materiais e geometria'), 'rho') * t.h * 1e4;
        expect(rel(amin, t.AsMin)).toBeLessThan(1e-9);
        for (const face of ['inferior', 'superior'] as const) for (const [i, dir] of [[0, 'x'], [1, 'y']] as const) {
          const tp = `Flexão – trecho ${t.chave}, armadura ${face}, direção ${dir}`;
          for (const p of passosDe(c, el, tp).filter((q) => /^Faixa \d+: armadura de flexão por metro/.test(q.descricao))) {
            const k = +/^Faixa (\d+)/.exec(p.descricao)![1] - 1, f = t.faixas[k];
            const M = face === 'inferior' ? f.mInf[i] : f.mSup[i];
            expect(num(p, 'Md')).toBe(M);
            const C = num(p, 'sigmaCd') * num(p, 'b') * num(p, 'lambda') * num(p, 'x');
            expect(rel(C, num(p, 'C'))).toBeLessThan(1e-9);
            // equilíbrio de momentos: Md = C·(d − λx/2); x < x,lim nas faixas simplesmente armadas
            if (!num(p, 'duplo')) {
              expect(rel(C * (num(p, 'd') - (num(p, 'lambda') * num(p, 'x')) / 2) * 1000, M)).toBeLessThan(1e-9);
              expect(rel((C / num(p, 'fyd')) * 1e4, p.resultado as number)).toBeLessThan(1e-9);
            } else expect(rel((C / num(p, 'fyd') + num(p, 'dM') / (num(p, 'fyd') * (num(p, 'd') - num(p, 'd2'))) + num(p, 'As2')) * 1e4, p.resultado as number)).toBeLessThan(1e-9);
            // regra dos mínimos
            if (face === 'inferior' && i === 1) { expect(p.resultado).toBe(f.AsInf[1]); continue; }
            const reg = passosDe(c, el, tp).find((q) => q.entradas.faixa === k + 1 && q.entradas.AsFlexao !== undefined)!;
            expect(reg.entradas.AsFlexao).toBe(p.resultado);
            if (face === 'inferior') { expect(rel(Math.max(num(reg, 'amin'), num(reg, 'AsFlexao')), reg.resultado as number)).toBeLessThan(1e-9); expect(reg.resultado).toBe(f.AsInf[0]); }
            else { expect(reg.resultado).toBe(num(reg, 'AsFlexao') > num(reg, 'amin') + 1e-9 ? num(reg, 'AsFlexao') : 0); expect(reg.resultado).toBe(f.AsSup[i]); }
          }
        }
        // armadura inferior longitudinal contínua: a maior das faixas (antes da fissuração e sem igualação)
        const nec = achar(c, el, 'Armadura inferior longitudinal contínua', `Armadura necessária – trecho ${t.chave}`);
        expect(Math.max(...t.faixas.map((f) => f.AsInf[0]))).toBe(Math.max(...Object.keys(nec.entradas).filter((k) => k.startsWith('AsFaixa')).map((k) => num(nec, k))));
        if (!num(nec, 'igualarFaces')) expect(nec.resultado).toBe(Math.max(...t.faixas.map((f) => f.AsInf[0])));
        // cadeia completa na faixa de maior momento: o x da cadeia é o da faixa
        const cadeia = passosDe(c, el).filter((q) => q.topico.startsWith(`Flexão – trecho ${t.chave}, armadura inferior, direção x – faixa de maior momento`));
        if (t.faixas.some((f) => f.mInf[0] > 1e-9)) expect(cadeia.length).toBeGreaterThan(4);
      }
    });

    it(`${c.nome}: fissuração, cortante, flecha e distribuição refeitos`, () => {
      for (const { r, a, el } of lancesDe(c)) {
        const cc = concretoDe(c.b, 'laje');
        let wkMax = 0;
        for (const t of a.trechos) {
          for (const rot of ['armadura inferior longitudinal', 'armadura inferior transversal', 'armadura superior longitudinal']) {
            const tf = `Fissuração – trecho ${t.chave}, ${rot}`;
            if (!passosDe(c, el, tf).length) continue;
            const w1 = achar(c, el, 'Abertura w1', tf), w2 = achar(c, el, 'Abertura w2', tf), wk = achar(c, el, 'Abertura característica', tf);
            const k1 = (num(w1, 'phi') / (12.5 * num(w1, 'eta1'))) * (num(w1, 'sigmaS') / num(w1, 'Es'));
            expect(rel(k1 * ((3 * num(w1, 'sigmaS')) / num(w1, 'fctm')), w1.resultado as number)).toBeLessThan(1e-9);
            expect(rel(k1 * (4 / num(w2, 'rhoR') + 45), w2.resultado as number)).toBeLessThan(1e-9);
            expect(rel(Math.min(w1.resultado as number, w2.resultado as number), wk.resultado as number)).toBeLessThan(1e-9);
            wkMax = Math.max(wkMax, wk.resultado as number);
            const br = achar(c, el, 'Barras consideradas', tf);
            expect(rel((Math.PI * (num(br, 'phi') / 1000) ** 2) / 4 / num(br, 's'), br.resultado as number)).toBeLessThan(1e-9);
            const aum = passosDe(c, el, tf).find((p) => p.descricao.startsWith('Aumento da armadura'));
            if (aum) expect(rel(num(aum, 'As0') * 1.1 ** num(aum, 'passos'), aum.resultado as number)).toBeLessThan(1e-9);
            if (rot === 'armadura inferior longitudinal') {
              const nec = achar(c, el, 'Armadura inferior longitudinal contínua', `Armadura necessária – trecho ${t.chave}`);
              const esperado = aum ? (aum.resultado as number) : (nec.resultado as number);
              const N1 = t.barras.find((x) => x.familia === 'infL')!;
              expect(rel(esperado, N1.AsNec)).toBeLessThan(1e-9);
            }
          }
          expect(rel(wkMax, Math.max(t.wk, wkMax))).toBeLessThan(1e-12);
          // cortante
          const ct = t.cortante, tcz = `Cortante – trecho ${t.chave}`;
          const rho = achar(c, el, 'Taxa de armadura de flexão tracionada', tcz), r1 = achar(c, el, 'Resistência sem armadura transversal', tcz), r2 = achar(c, el, 'Resistência da biela', tcz);
          expect(rel(0.25 * num(r1, 'fctd') * num(r1, 'k') * (1.2 + 40 * num(r1, 'rho')) * num(r1, 'd') * 1000, ct.VRd1)).toBeLessThan(1e-9);
          expect(rel(Math.max(1, 1.6 - num(r1, 'd')), num(r1, 'k'))).toBeLessThan(1e-9);
          expect(rel(Math.min(0.02, num(rho, 'AsEf') / 1e4 / num(rho, 'd')), rho.resultado as number)).toBeLessThan(1e-9);
          expect(rel(0.27 * num(r2, 'av2') * num(r2, 'fcd') * num(r2, 'd') * 1000, ct.VRd2)).toBeLessThan(1e-9);
          expect(achar(c, el, 'Cortante solicitante do trecho', tcz).resultado).toBe(ct.VSd);
          expect(ct.VSd).toBe(Math.max(...t.faixas.map((f) => f.V)));
          const asw = passosDe(c, el, tcz).find((p) => p.descricao.startsWith('Armadura transversal necessária'));
          if (asw) {
            expect(rel(((num(asw, 'VSd') - num(asw, 'Vc')) * 1e4) / (0.9 * num(asw, 'd') * num(asw, 'fywd') * 1000), asw.resultado as number)).toBeLessThan(1e-9);
            expect(asw.resultado).toBe(ct.Asw);
          } else expect(ct.Asw).toBe(0);
        }
        // distribuição mínima
        for (const p of c.mem.passos.filter((q) => q.elemento === el && q.topico.startsWith('Distribuição – trecho'))) {
          expect(rel(Math.max(num(p, 'minimo'), num(p, 'fracao') * num(p, 'principal'), 0.5 * num(p, 'amin')), p.resultado as number)).toBeLessThan(1e-9);
        }
        // flecha
        const tf = 'Flecha (ELS-DEF)', fator = achar(c, el, 'Fator da flecha total', tf), tot = achar(c, el, 'Flecha total do lance', tf), lim = achar(c, el, 'Limite da flecha total', tf);
        expect(fator.resultado).toBe(a.flecha.fator);
        expect(rel(num(tot, 'fator') * (num(tot, 'fG') + num(tot, 'psi2') * num(tot, 'fQ')) * 1000, tot.resultado as number)).toBeLessThan(1e-9);
        expect(tot.resultado).toBe(a.flecha.total);
        expect(num(tot, 'fG')).toBe(r.deslocamento.G);
        expect(rel(num(lim, 'vao') / num(lim, 'n') * 1000, lim.resultado as number)).toBeLessThan(1e-9);
        expect(lim.resultado).toBe(a.flecha.limite);
        void cc;
      }
    });

    it(`${c.nome}: ancoragens, barras e peso refeitos`, () => {
      for (const { a, el } of lancesDe(c)) {
        const cc = concretoDe(c.b, 'laje');
        // ancoragens: uma por ligação com ancoragem de apoio (as quinas têm passo próprio)
        const anc = passosDe(c, el).filter((p) => p.descricao.startsWith('Ancoragem no apoio'));
        const lig = a.ligacoes.filter((l) => l.tipo !== 'quina' && l.ancoragem);
        expect(anc.map((p) => p.resultado as number).sort((x, y) => x - y)).toEqual(lig.map((l) => l.ancoragem!.adicional).sort((x, y) => x - y));
        for (const p of anc) {
          const reto = Math.max(0, num(p, 'disponivel') - num(p, 'cob')), phiM = num(p, 'phi') / 1000;
          const lbG = Math.max(0.7 * num(p, 'lbNec'), 8 * phiM, 0.06);
          const emb = p.entradas.tipo === 'reta' ? num(p, 'lbNec') : reto;
          expect(rel(emb, num(p, 'embutido'))).toBeLessThan(1e-9);
          if (p.entradas.tipo === 'reta') expect(reto).toBeGreaterThanOrEqual(num(p, 'lbNec') - 1e-9);
          else if (p.entradas.tipo === 'gancho') { expect(reto).toBeGreaterThanOrEqual(lbG - 1e-9); expect(reto).toBeLessThan(num(p, 'lbNec')); }
          else expect(reto).toBeLessThan(lbG);
          expect(rel(num(p, 'embutido') + num(p, 'perna'), p.resultado as number)).toBeLessThan(1e-9);
        }
        // lb básico e necessário
        for (const p of passosDe(c, el).filter((q) => q.descricao.includes('comprimento de ancoragem básico'))) {
          const phi = num(p, 'phi') / 1000, fbd = num(p, 'eta1') * num(p, 'eta3') * num(p, 'fctd');
          expect(rel(Math.max((phi / 4) * (num(p, 'fyd') / fbd), 25 * phi), p.resultado as number)).toBeLessThan(1e-9);
          expect(num(p, 'fctd')).toBe(cc.fctd);
        }
        for (const p of passosDe(c, el).filter((q) => q.descricao.startsWith('Comprimento de ancoragem necessário'))) {
          const phi = num(p, 'phi') / 1000, lb = num(p, 'lb');
          expect(rel(Math.max(lb * (num(p, 'AsEf') > 0 ? Math.min(1, num(p, 'AsCalc') / num(p, 'AsEf')) : 1), 0.3 * lb, 10 * phi, 0.1), p.resultado as number)).toBeLessThan(1e-9);
        }
        for (const p of passosDe(c, el).filter((q) => q.descricao.startsWith('Traspasse das esperas'))) {
          const l0min = Math.max(0.3 * num(p, 'alfa0t') * num(p, 'lb'), (15 * num(p, 'phi')) / 1000, 0.2);
          expect(rel(Math.max(num(p, 'alfa0t') * num(p, 'lbNec'), l0min), p.resultado as number)).toBeLessThan(1e-9);
        }
        // barras
        let peso = 0;
        for (const t of a.trechos) for (const b of t.barras) {
          const tp = `Barras – trecho ${t.chave}`, ps = passosDe(c, el, tp).filter((p) => p.descricao.startsWith(`${b.pos}: `));
          expect(ps.length).toBe(3);
          const [pa, pn, pl] = ps;
          expect(rel(((Math.PI * (num(pa, 'phi') / 1000) ** 2) / 4 / num(pa, 's')) * 1e4, pa.resultado as number)).toBeLessThan(1e-9);
          expect(rel(pa.resultado as number, b.AsEf)).toBeLessThan(1e-9);
          if (a.status === 'ok') expect(pa.resultado as number).toBeGreaterThanOrEqual(b.AsNec - 1e-6);
          expect(num(pa, 'phi')).toBe(b.phi); expect(num(pa, 's')).toBe(b.s);
          const nBarras = pn.entradas.modo === 1 ? Math.max(1, Math.floor((num(pn, 'B') - 2 * num(pn, 'cob')) / num(pn, 's') + 1e-6) + 1) : Math.max(1, Math.floor(num(pn, 'len') / num(pn, 's') + 1e-6) + 1);
          expect(nBarras).toBe(pn.resultado);
          expect(pn.resultado).toBe(b.n);
          const partes = Object.entries(pl.entradas).filter(([k]) => k !== 'passo').reduce((s2, [, v]) => s2 + (v as number), 0);
          if (pl.entradas.passo !== undefined) {
            expect(rel(Math.ceil(partes / num(pl, 'passo') - 1e-9) * num(pl, 'passo'), pl.resultado as number)).toBeLessThan(1e-9);
          }
          expect(pl.resultado).toBe(b.comprimento);
          peso += b.n * b.comprimento * barArea(b.phi) * 7850;
        }
        const pq = achar(c, el, 'Peso de aço do lance', 'Quantitativo do lance');
        let pesoReg = 0;
        for (const k of Object.keys(pq.entradas).filter((q) => q.startsWith('n_'))) { const pos = k.slice(2); pesoReg += num(pq, k) * num(pq, `l_${pos}`) * barArea(num(pq, `phi_${pos}`)) * num(pq, 'massaEspecifica'); }
        expect(rel(pesoReg, a.peso)).toBeLessThan(1e-9);
        expect(rel(peso, a.peso)).toBeLessThan(1e-9);
        expect(pq.resultado).toBe(a.peso);
        // comprimento da barra principal inferior: desenvolvimento + ancoragens
        const t0 = a.trechos[0], N1 = t0.barras.find((x) => x.familia === 'infL')!;
        const geo = achar(c, el, `Trecho ${t0.chave}`, `Geometria do trecho ${t0.chave}`);
        expect(rel(num(geo, 'L') * Math.sqrt(1 + num(geo, 'declive') ** 2), geo.resultado as number)).toBeLessThan(1e-9);
        expect(rel(geo.resultado as number, t0.comprimentoInclinado)).toBeLessThan(1e-9);
        void N1; void acoDe; void cobrimentoLaje;
      }
    });
  }

  it('opções de armadura mudam o texto da memória (igualações e quinas)', () => {
    const el = elementoLance(C.res.lances[0]);
    expect(passosDe(C, el).some((p) => p.topico.startsWith('Igualações – trecho'))).toBe(true);
    expect(passosDe(C, el).some((p) => p.descricao.startsWith('Armadura inferior que chega à quina'))).toBe(true);
    expect(passosDe(A, elementoLance(A.res.lances[0])).some((p) => p.topico.startsWith('Esperas – trecho'))).toBe(true);
    expect(passosDe(C, el).some((p) => p.topico.startsWith('Esperas – trecho'))).toBe(false);
    expect(passosDe(B, elementoLance(B.res.lances[0])).some((p) => p.descricao.includes('apoio elástico'))).toBe(true);
  });

  it('armadura transversal pelo cortante registrada no caso de sobrecarga alta', () => {
    const el = elementoLance(D.res.lances[0]), t = D.dim.escadasArmadura![0].trechos[0];
    expect(t.cortante.Asw).toBeGreaterThan(0);
    expect(passosDe(D, el, `Cortante – trecho ${t.chave}`).some((p) => p.descricao.startsWith('Armadura transversal necessária'))).toBe(true);
    expect(passosDe(D, el, `Cortante – trecho ${t.chave}`).some((p) => p.descricao.startsWith('Parcela do concreto'))).toBe(true);
    // laje de 12 cm: não leva armadura transversal; a memória registra a reprovação
    const eF = elementoLance(F.res.lances[0]), tF = F.dim.escadasArmadura![0].trechos[0];
    expect(tF.cortante.ok).toBe(false);
    expect(passosDe(F, eF, `Cortante – trecho ${tF.chave}`).some((p) => /h < 15 cm|VSd > VRd2/.test(p.descricao))).toBe(true);
  });

  it('lance reto biapoiado da E4d: Md = 44,01 kN·m/m e As ≈ 9,3 cm²/m contra q·ℓ²/8', () => {
    const { r, a, el } = lancesDe(A)[0], b = A.b, h = 0.15;
    const ell = 17 * PISO, cosA = PISO / Math.hypot(PISO, E), pg = (25 * h) / cosA + (25 * E) / 2 + 1, pq = 2.5;
    const Md = (1.4 * pg * ell * ell) / 8 + (1.4 * pq * ell * ell) / 8;
    expect(Md).toBeCloseTo(44.007, 2);
    const cc = concretoDe(b, 'laje'), fyd = acoDe(b, 'escadaInf').fyd * 1000, sig = cc.sigmaCd * 1000;
    const d = h - cobrimentoLaje(b).inf - 0.005;
    const lx = d * (1 - Math.sqrt(1 - (2 * Md) / (sig * d * d))), AsMao = (Md / (fyd * (d - lx / 2))) * 1e4;
    expect(AsMao).toBeGreaterThan(9.2);
    expect(AsMao).toBeLessThan(9.4);
    // o momento da faixa central na memória (Wood-Armer do elemento de casca) e a cadeia completa de flexão
    const t = a.trechos[0], k = t.faixas.reduce((m, f, i) => (f.mInf[0] > t.faixas[m].mInf[0] ? i : m), 0);
    const pm = passosDe(A, el, `Esforços do trecho ${t.chave}`).find((p) => p.descricao.startsWith(`Faixa ${k + 1} (`) && /armadura inferior na direção x/.test(p.descricao))!;
    expect(rel(pm.resultado as number, Md)).toBeLessThan(0.01); // casca contra a viga biapoiada (≤ 1 %)
    const tf = `Flexão – trecho ${t.chave}, armadura inferior, direção x – faixa de maior momento (faixa ${k + 1}): cadeia completa`;
    const ln = achar(A, el, 'Linha neutra', tf), At = achar(A, el, 'Armadura de tração', tf);
    const x = ln.resultado as number, C = num(ln, 'sigmaCd') * num(ln, 'b') * num(ln, 'lambda') * x;
    expect(rel(C * (num(ln, 'd') - (num(ln, 'lambda') * x) / 2) * 1000, pm.resultado as number)).toBeLessThan(1e-9);
    expect(rel((num(At, 'C') / num(At, 'fyd')) * 1e4, t.faixas[k].AsInf[0])).toBeLessThan(1e-9);
    expect(Math.abs(t.faixas[k].AsInf[0] / AsMao - 1)).toBeLessThan(0.015);
    // reação do apoio contra a viga biapoiada: R = p·ℓ/2 (com a casca, ≤ 1 %)
    const rG = achar(A, el, 'Apoio inferior (borda de partida), caso G: reação por metro', 'Reações como cargas lineares');
    expect(rel(num(rG, 'R'), (pg * ell * 1.2) / 2)).toBeLessThan(0.02);
    expect(r.apoios.length).toBe(2);
  });

  it('exportações: CSV e HTML trazem os passos das escadas', () => {
    expect(csvMemoria(A.mem)).toContain('Escada E1 · Lance 1');
    const html = htmlMemoriaCorpo(A.mem);
    expect(html).toContain('Escada E1 · Lance 1');
    expect(html).toContain('Reações como cargas lineares');
  });

  it('filtro por elemento: só a escada pedida e os passos globais', () => {
    const b = A.b, an = analisarEdificio(b);
    const so = memoriaDetalhada(b, { an, elementos: ['Escada E1 · Lance 1'] });
    expect(so.memoria.elementos.sort()).toEqual(['Edifício', 'Escada E1 · Lance 1']);
    const nenhum = memoriaDetalhada(b, { an, elementos: ['Viga V1'] });
    expect(nenhum.memoria.elementos.some((e) => e.startsWith('Escada'))).toBe(false);
    expect(so.dim.escadasArmadura).toEqual(A.dim.escadasArmadura);
  });

  it('armarEscadas isolado fora da memória não registra nada e dá o mesmo resultado', () => {
    const an = analisarEdificio(A.b), x = armarEscadas(A.b, an.escadas, { ...OPCOES_PADRAO_CALCULO, ...an.opcoes });
    expect(x.lances).toEqual(A.dim.escadasArmadura);
    const trechos: TrechoArmadura[] = x.lances[0].trechos;
    expect(trechos.length).toBe(1);
  });
});
