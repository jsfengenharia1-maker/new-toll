// Punção nas lajes nervuradas bidirecionais com ábaco (frente E3d), NBR 6118, 19.5. Reaproveita a verificação das maciças (N2d,
// `puncao.ts`) com a altura útil por região: o contorno C no pilar e o C′ a 2·dAbaco da face usam a altura do ábaco; o C″ a 2·dLaje
// da borda do ábaco usa a altura da laje (NBR 6118, 19.5.2 [item a confirmar]). Em todos os contornos, os trechos sobre cubetas saem:
// só as nervuras e as zonas maciças resistem ao cisalhamento (a capa sozinha é desprezada, a favor da segurança [a confirmar]).
// Armadura de punção (estribos ou conectores) em linhas radiais, dentro do ábaco (a do C′) e/ou nas nervuras (a do C″).
import type { P } from '../geom/faces';
import { dentroPoligono } from '../geom/faces';
import type { AnaliseEdificio } from './analitico';
import { abacoDoPonto } from './abacos';
import { acoDe, cobrimentoLaje, concretoDe } from './materiais';
import { arranjoDaLaje, type AbacoEfetivo } from './nervuradas';
import type { ResultadoNervurada } from './nervuradasDim';
import type { OpcoesCalculo } from './opcoes';
import { COMB_ELU_LAJE, origem } from './origem';
import {
  BITOLAS_PUNCAO, fatoresPuncao, ladosLivres, polilinhas, sitiosPuncao, solicitacaoPuncao, verificarPuncao,
  type Apoio, type EntradaPuncao, type ParametrosPuncao, type Regiao, type ResultadoPuncao, type Tensao, type AbacoPuncaoInfo,
} from './puncao';
import { dimsSecao, secaoNoLance, type BuildingModel, type Laje } from './types';

const NOMES_C = ['C', 'C′', 'C″'] as const;
const fm = (x: number, n = 1) => x.toFixed(n).replace('.', ',');

/** Retângulo (eixos do pilar) que envolve o polígono do ábaco. */
function retanguloEnvolvente(ap: Apoio, poligono: P[]): { centro: P; c1: number; c2: number; angulo: number; u: [number, number]; v: [number, number] } {
  const a = (ap.angulo * Math.PI) / 180, ux: P = [Math.cos(a), Math.sin(a)], vx: P = [-Math.sin(a), Math.cos(a)];
  const us = poligono.map((q) => (q[0] - ap.centro[0]) * ux[0] + (q[1] - ap.centro[1]) * ux[1]), vs = poligono.map((q) => (q[0] - ap.centro[0]) * vx[0] + (q[1] - ap.centro[1]) * vx[1]);
  const u: [number, number] = [Math.min(...us), Math.max(...us)], v: [number, number] = [Math.min(...vs), Math.max(...vs)], mu = (u[0] + u[1]) / 2, mv = (v[0] + v[1]) / 2;
  return { centro: [ap.centro[0] + mu * ux[0] + mv * vx[0], ap.centro[1] + mu * ux[1] + mv * vx[1]], c1: u[1] - u[0], c2: v[1] - v[0], angulo: ap.angulo, u, v };
}

/** Taxa de armadura negativa (média geométrica das direções) sobre o ábaco (base + reforço) e fora dele (só o reforço nas nervuras). */
export function taxasAbaco(nerv: ResultadoNervurada | undefined, abacoId: string | undefined, intereixo: [number, number], hAbaco: number, hLaje: number, dAbaco: number, dLaje: number): { rhoAbaco: number; rhoLaje: number } {
  const as = [0, 1].map((k) => {
    let dentro = 0, fora = 0;
    for (const n of nerv?.nervuras ?? []) if (n.dir === k) for (const a of n.abacos) if (a.abaco === abacoId) { dentro = Math.max(dentro, a.AsBase + (a.barras?.As ?? 0)); fora = Math.max(fora, a.barras?.As ?? 0); }
    return { dentro, fora };
  });
  const taxa = (campo: 'dentro' | 'fora', h: number, d: number) => Math.min(0.02, Math.sqrt([0, 1].reduce((t, k) => t * (Math.max(as[k][campo], 0.0015 * h * intereixo[k] * 1e4) / (1e4 * intereixo[k] * d)), 1)));
  return { rhoAbaco: taxa('dentro', hAbaco, dAbaco), rhoLaje: taxa('fora', hLaje, dLaje) };
}

const pior = (a: ResultadoPuncao['status'], z: ResultadoPuncao['status']): ResultadoPuncao['status'] => (a === 'fail' || z === 'fail' ? 'fail' : a === 'armadura' || z === 'armadura' ? 'armadura' : 'ok');

/**
 * Punção dos pilares que apoiam as lajes nervuradas bidirecionais direto (sem viga), por pavimento. Com ábaco: região interna (C e C′
 * com a altura do ábaco) e externa (C″ a 2·dLaje da borda do ábaco, com a altura da laje); sem ábaco: aviso `ABACO_FALTA` e
 * verificação nas nervuras com a altura da laje. FSd e momentos como nas maciças (`solicitacaoPuncao`). Devolve também os avisos por laje.
 */
export function puncaoAbacos(b: BuildingModel, an: AnaliseEdificio, nervs: ResultadoNervurada[], op: OpcoesCalculo): ResultadoPuncao[] {
  if (!op.puncaoVerificar || !b.lajes.some((l) => l.tipo.tipo === 'nervurada' && !l.definir)) return [];
  const { fat, fatW, gq } = fatoresPuncao(b, an), c = concretoDe(b, 'laje'), fywd = Math.min(acoDe(b, 'lajePuncao').fyd, op.puncaoTipoArmadura ? 300 : 250);
  const out: ResultadoPuncao[] = [], memo = new Map<unknown, Map<string, ResultadoPuncao>>();
  const arranjos = new Map<string, NonNullable<ReturnType<typeof arranjoDaLaje>>>();
  const arr = (l: Laje) => { let a = arranjos.get(l.id); if (!a) { a = arranjoDaLaje(b, l)!; arranjos.set(l.id, a); } return a; };
  for (const g of an.grelhas) {
    if (!g.res) continue;
    const pav = b.pavimentos.find((p) => p.id === g.pavimento)!;
    const nervLajes = b.lajes.filter((l) => l.grupo === pav.grupo && l.tipo.tipo === 'nervurada' && !l.definir);
    if (!nervLajes.length) continue;
    const ja = memo.get(g.res) ?? new Map<string, ResultadoPuncao>();
    memo.set(g.res, ja);
    const todas = b.lajes.filter((l) => l.grupo === pav.grupo && (l.tipo.tipo === 'macica' || l.tipo.tipo === 'nervurada') && !l.definir);
    const reg: Regiao = { poligonos: todas.map((l) => l.contorno as P[]), furos: todas.flatMap((l) => (l.furos ?? []) as P[][]) };
    const cubetas = nervLajes.flatMap((l) => arr(l).arr.cubetas.map((x) => x.poligono as P[]));
    const efs: AbacoEfetivo[] = nervLajes.flatMap((l) => arr(l).abacos);
    for (const st of sitiosPuncao(b, pav.id, op, ['nervurada'])) {
      if (st.viga) continue;
      const p = st.p, sec = secaoNoLance(p, pav.id), ef = abacoDoPonto(efs, st.centro), chave = `${p.id}|${JSON.stringify(sec)}|${ef?.abaco.id ?? ''}`;
      const r0 = ja.get(chave);
      if (r0) { out.push({ ...r0, pavimento: pav.nome, pavimentoId: pav.id, id: `${p.id}|${pav.id}`, mensagens: [...r0.mensagens] }); continue; }
      const sol = solicitacaoPuncao(an, g, p, pav.id, st.centro, fat, fatW, gq);
      if (!sol) continue;
      const { F, M, angulo } = sol, [w, hh] = dimsSecao(sec), circular = sec.tipo === 'circ';
      const ap: Apoio = { centro: st.centro, c1: w, c2: circular ? w : hh, circular, angulo };
      const laje = nervLajes.find((l) => dentroPoligono(st.centro, l.contorno as P[])) ?? nervLajes.find((l) => ef && l.id === ef.abaco.laje) ?? nervLajes[0];
      const g0 = arr(laje).g, hLaje = g0.h, cob = cobrimentoLaje(b, laje.cobrimento).sup, dLaje = Math.max(0.05, hLaje - cob - 0.01);
      const hAb = ef ? ef.abaco.hAbaco : hLaje, dAb = Math.max(0.05, hAb - cob - 0.01);
      const nerv = nervs.find((x) => x.laje === laje.id);
      const tx = taxasAbaco(nerv, ef?.abaco.id, g0.i, hAb, hLaje, dAb, dLaje);
      const livres = ladosLivres(ap, reg, dAb);
      // extensão mínima da face do pilar à borda do ábaco (lados com laje) e se o C′ (2·dAbaco) fica dentro do ábaco
      let extMin = Infinity, rect: ReturnType<typeof retanguloEnvolvente> | undefined;
      if (ef) {
        rect = retanguloEnvolvente(ap, ef.poligono);
        const meiaU = ap.c1 / 2, meiaV = (circular ? ap.c1 : ap.c2) / 2;
        for (const [lado, ext] of [['u+', rect.u[1] - meiaU], ['u-', -rect.u[0] - meiaU], ['v+', rect.v[1] - meiaV], ['v-', -rect.v[0] - meiaV]] as const) if (!livres.includes(lado)) extMin = Math.min(extMin, ext);
      }
      const c2NoAbaco = !!ef && extMin >= 2 * dAb - 1e-9;
      const dInt = c2NoAbaco ? dAb : dLaje, hInt = c2NoAbaco ? hAb : hLaje, rhoInt = c2NoAbaco ? tx.rhoAbaco : tx.rhoLaje;
      const parBase = { c, fywd, tipoArm: op.puncaoTipoArmadura ? 'conector' as const : 'estribo' as const, s0f: Math.min(0.5, op.puncaoS0), srf: Math.min(0.75, op.puncaoSr), passoCortante: 0, furoDist: op.puncaoFuroDist };
      const parInt: ParametrosPuncao = { ...parBase, rho: rhoInt, bitolas: BITOLAS_PUNCAO.filter((x) => x <= (hInt * 1000) / 20 + 1e-9) };
      const entInt: EntradaPuncao = { ap, reg, d: dInt, h: hInt, F, M, qd: 0, excluir: cubetas };
      const vi = verificarPuncao(entInt, parInt);
      const prefixo = ef ? ' (ábaco)' : ' (sem ábaco)';
      const msgs = vi.mensagens.map((m) => m.replace(/^(Punção|Cortante da laje)/, `$1 em ${p.nome}${prefixo}`));
      // fora do ábaco: o ábaco faz o papel do pilar (C″ a 2·dLaje da sua borda, com a altura da laje)
      let ve: ReturnType<typeof verificarPuncao> | undefined, apAb: Apoio | undefined;
      if (ef && rect) {
        apAb = { centro: rect.centro, c1: rect.c1, c2: rect.c2, circular: false, angulo: rect.angulo };
        const parExt: ParametrosPuncao = { ...parBase, rho: tx.rhoLaje, bitolas: BITOLAS_PUNCAO.filter((x) => x <= (hLaje * 1000) / 20 + 1e-9) };
        ve = verificarPuncao({ ap: apAb, reg, d: dLaje, h: hLaje, F, M, qd: 0, excluir: cubetas }, parExt);
        msgs.push(...ve.mensagens.map((m) => m.replace(/^(Punção|Cortante da laje)/, `$1 em ${p.nome} (fora do ábaco, C″ a 2d da borda)`)));
      } else msgs.push(`Ábaco: ${p.nome} apoia a laje nervurada ${laje.nome} sem viga e sem ábaco; punção verificada nas nervuras com a altura da laje (h = ${fm(hLaje * 100, 0)} cm). Gere o ábaco (abaco.gerar) ou lance um manual.`);
      if (vi.armadura && ef && vi.armadura.s0 + (vi.armadura.barras - 1) * vi.armadura.sr > extMin + 1e-9)
        msgs.push(`Ábaco: a armadura de punção de ${p.nome} chega a ${fm((vi.armadura.s0 + (vi.armadura.barras - 1) * vi.armadura.sr) * 100, 0)} cm da face e o ábaco tem ${fm(extMin * 100, 0)} cm até a borda; aumente o ábaco ou a espessura da laje.`);
      if (Math.max(w, hh) > 5 * Math.min(w, hh)) msgs.push(`Pilar-parede ${p.nome} (${(w * 100).toFixed(0)}×${(hh * 100).toFixed(0)} cm): a distribuição de tensões no contorno não é uniforme; punção verificada no contorno completo [a confirmar].`);
      const mk = (nome: 0 | 1 | 2, t: Tensao, lim: number, limNome: string) => ({ nome: NOMES_C[nome], a: t.a, u: t.u, tau: t.tau, limite: lim, limiteNome: limNome, ok: t.tau <= lim + 1e-9, Wp: t.Wp, e: t.e, M1: t.M1, pontos: polilinhas(t.pecas) });
      const lim2 = vi.armadura ? vi.tauRd3 ?? vi.tauRd1 : vi.tauRd1;
      const contornos = [mk(0, vi.C, vi.tauRd2, 'τRd2'), mk(1, vi.C2, lim2, vi.armadura ? 'τRd3' : 'τRd1')];
      if (ve) contornos.push(mk(2, ve.C2, ve.armadura ? ve.tauRd3 ?? ve.tauRd1 : ve.tauRd1, ve.armadura ? 'τRd3' : 'τRd1'));
      else if (vi.C3) contornos.push(mk(2, vi.C3, vi.tauRd1, 'τRd1'));
      const info: AbacoPuncaoInfo = {
        ...(ef ? { id: ef.abaco.id } : {}), hAbaco: hAb, hLaje, dAbaco: dAb, dLaje, rhoAbaco: tx.rhoAbaco, rhoLaje: tx.rhoLaje, extensaoMin: Number.isFinite(extMin) ? extMin : 0, c2NoAbaco,
        ...(ef && rect ? { poligono: ef.poligono, retangulo: { centro: rect.centro, c1: rect.c1, c2: rect.c2, angulo: rect.angulo } } : {}),
        ...(ve ? { externa: { status: ve.status, tauRd1: ve.tauRd1, ...(ve.tauRd3 !== undefined ? { tauRd3: ve.tauRd3 } : {}) } } : {}),
      };
      const status = ve ? pior(vi.status, ve.status) : vi.status;
      const r: ResultadoPuncao = {
        id: `${p.id}|${pav.id}`, pilar: p.id, nome: p.nome, pavimento: pav.nome, pavimentoId: pav.id, laje: laje.id, lajeNome: laje.nome, origem: 'pilar',
        tipo: vi.tipo, livres: vi.livres, c1: ap.c1, c2: ap.c2, circular, angulo, centro: st.centro, h: hInt, d: dInt, rho: rhoInt, fck: c.fck, F, M, K: vi.C.K,
        contornos, tauRd1: vi.tauRd1, tauRd2: vi.tauRd2, ...(vi.tauRd3 !== undefined ? { tauRd3: vi.tauRd3 } : {}),
        ...(vi.armadura ? { armadura: vi.armadura } : {}), ...(ve?.armadura ? { armaduraExterna: ve.armadura } : {}), abaco: info,
        manual: [], cortante: vi.cortante, status, mensagens: msgs,
        origens: [origem('Punção na nervurada (ábaco)', COMB_ELU_LAJE, 'puncao')],
      };
      ja.set(chave, r);
      out.push(r);
    }
  }
  return out;
}
