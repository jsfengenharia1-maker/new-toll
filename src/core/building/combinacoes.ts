// Combinações do edifício (NBR 6118/8681): casos da obra (G, Q e adicionais) e os de vento (grupo excludente
// "vento"), com as ações horizontais das ELU ampliadas por 0,95·γz quando 1,1 < γz ≤ 1,3 (premissa do pórtico).
// Casos do mesmo grupo nunca atuam juntos; caso "simultâneo" recebe o mesmo fator do caso a que está ligado;
// excepcionais em combinações próprias (NBR 8681: γg 1,2 / 1,0, excepcional 1,0, variáveis com ψ2).
import { caseGroup, exclusiveChoices, nbrCombinations } from '../edit';
import type { LoadCase } from '../types';
import type { AnaliseEdificio } from './analitico';
import { casosDaObra, type BuildingModel, type EstadoId } from './types';
import { ESTADOS_INFO, estadoEmUso, fatoresDaSituacao } from './acoes';
import { gamas } from './materiais';
import { decidirRegra30, type DecisaoRegra30 } from '../desaprumo';
import { DIRECOES_DESAPRUMO, momentoVento, nomeCasoDesaprumo } from './desaprumo';

export interface CombinacaoEd { nome: string; tipo: 'ELU' | 'QP' | 'FREQ' | 'RARA'; fatores: Record<string, number> }

/** γ das combinações excepcionais (NBR 6118, Tabela 11.1) [a confirmar]. */
export const GAMA_EXCEPCIONAL = { g: 1.2, gFav: 1, q: 1 };

/** Registro da regra dos 30 % do vento numa combinação ELU (memória detalhada): momentos de tombamento na base e decisão. */
export interface RegraDesaprumo {
  combo: string; hasW: boolean; ventoCaso?: string; direcao?: number; Mw: number; Md: number; decisao: DecisaoRegra30;
  /** Combinações geradas (nomes). */
  saida: string[];
  termos: { caso: string; f: number; Md: number; Mw?: number }[];
}

export function combinacoesEdificio(b: BuildingModel, an: AnaliseEdificio): CombinacaoEd[] {
  return combinacoesComRegras(b, an).combinacoes;
}

/** As combinações do edifício e, para cada ELU normal, a decisão do desaprumo global (regra dos 30 % do vento). */
export function combinacoesComRegras(b: BuildingModel, an: AnaliseEdificio): { combinacoes: CombinacaoEd[]; regras: RegraDesaprumo[] } {
  const W = an.vento?.casos ?? [];
  const des = an.desaprumo ?? null, regras: RegraDesaprumo[] = [];
  const obra = casosDaObra(b);
  const simult = new Map(obra.filter((c) => c.simultaneo && obra.some((x) => x.id === c.simultaneo)).map((c) => [c.id, c.simultaneo!]));
  const psiPadrao = (n: string) => (n === 'W' ? [0.6, 0.3, 0] : b.norma.psiQ ?? [0.5, 0.4, 0.3]);
  // casos que entram na combinatória (os simultâneos e os excepcionais ficam de fora)
  const casos: LoadCase[] = [];
  let id = 1;
  for (const c of obra) {
    if (simult.has(c.id) || c.natureza === 'E') continue;
    const psi = c.psi ?? psiPadrao(c.natureza);
    casos.push({ id: id++, name: c.id, nature: c.natureza === 'H' ? 'G' : c.natureza, ...(c.grupo ? { group: c.grupo } : {}), ...(c.natureza !== 'G' ? { psi0: psi[0], psi1: psi[1], psi2: psi[2] } : {}) });
  }
  for (const c of W) casos.push({ id: id++, name: c.nome, nature: 'W', group: 'vento', psi0: 0.6, psi1: 0.3, psi2: 0 });
  const porNome = new Map(casos.map((c) => [c.id, c.name]));
  // ampliação das ações horizontais: vento por direção; horizontais lançadas pelo usuário pela maior
  // com P-Δ (N2c, opção segundaOrdem = 1) não há ampliação: os efeitos de 2ª ordem entram como caso próprio por combinação
  const pDelta = an.opcoes?.segundaOrdem === 1;
  const ampMax = pDelta ? 1 : Math.max(1, ...(an.vento?.gamaZ ?? []).map((g) => g.ampliacao));
  const amp = pDelta ? new Map<string, number>() : new Map<string, number>([...W.map((c) => [c.nome, an.vento?.gamaZ.find((g) => g.direcao === c.direcao)?.ampliacao ?? 1] as [string, number]), ...obra.filter((c) => c.natureza === 'W').map((c) => [c.id, ampMax] as [string, number])]);
  const comSimultaneos = (f: Record<string, number>) => { for (const [s, alvo] of simult) if (f[alvo] !== undefined) f[s] = f[alvo]; return f; };
  const gm = gamas(b);
  // empuxo de terra (natureza H): permanente com o γ da linha de empuxo (o desfavorável das ELU normais vira γh)
  const empuxo = new Set(obra.filter((c) => c.natureza === 'H').map((c) => c.id));
  const out: CombinacaoEd[] = [];
  for (const c of nbrCombinations(casos, 1, { g: gm.g, gFav: 1, q: gm.q })) {
    const f: Record<string, number> = {}, bruto: Record<string, number> = {};
    for (const [k, v] of Object.entries(c.factors)) {
      const n = porNome.get(+k)!;
      bruto[n] = v;
      f[n] = c.kind === 'ELU' && amp.has(n) ? +(v * amp.get(n)!).toFixed(4) : c.kind === 'ELU' && empuxo.has(n) && Math.abs(v - gm.g) < 1e-9 ? gm.h : v;
    }
    const cb: CombinacaoEd = { nome: c.name, tipo: c.kind === 'ELU' ? 'ELU' : c.kind === 'QP' ? 'QP' : 'FREQ', fatores: comSimultaneos(f) };
    if (cb.tipo === 'ELU' && des?.casos.length) out.push(...comDesaprumo(cb, comSimultaneos(bruto), an, W, regras)); else out.push(cb);
  }
  // a regra dos 30 % pode gerar combinações idênticas (as excentricidades ±e do mesmo vento): fica a primeira
  if (des?.casos.length) {
    const vistos = new Set<string>();
    for (let i = 0; i < out.length; i++) {
      if (out[i].tipo !== 'ELU') continue;
      const chave = out[i].tipo + JSON.stringify(Object.entries(out[i].fatores).filter(([, v]) => v).sort(([x], [y]) => (x < y ? -1 : 1)));
      if (vistos.has(chave)) { for (const r of regras) r.saida = r.saida.filter((n) => n !== out[i].nome); out.splice(i--, 1); } else vistos.add(chave);
    }
  }
  // excepcionais: G + E + ψ2 das variáveis (uma escolha por grupo excludente)
  const G = casos.filter((c) => c.nature === 'G'), V = casos.filter((c) => c.nature !== 'G');
  for (const e of obra.filter((c) => c.natureza === 'E' && !simult.has(c.id))) for (const [gg, tag] of [[GAMA_EXCEPCIONAL.g, 'G desf.'], [GAMA_EXCEPCIONAL.gFav, 'G fav.']] as const) {
    for (const ch of exclusiveChoices(V)) {
      const f: Record<string, number> = { [e.id]: GAMA_EXCEPCIONAL.q };
      G.forEach((c) => (f[c.name] = gg));
      ch.forEach((c) => { const v = c.psi2 ?? 0; if (v) f[c.name] = +(GAMA_EXCEPCIONAL.q * v).toFixed(4); });
      const grp = ch.filter((c) => caseGroup(c) && c.psi2);
      out.push({ nome: `ELU excepcional ${tag} · ${e.nome}${grp.length ? ` + ${grp.map((c) => c.name).join(', ')}` : ''}`, tipo: 'ELU', fatores: comSimultaneos(f) });
    }
  }
  // raras (fundação, verificação geotécnica): uma variável principal integral + ψ1 das demais (uma por grupo)
  for (const p of V) {
    const mesmoGrupo = (c: LoadCase) => c === p || (!!caseGroup(p) && caseGroup(c) === caseGroup(p));
    const escolhas = exclusiveChoices(V, mesmoGrupo).filter((ch) => ch.some((c) => c.psi1));
    for (const ch of [[], ...escolhas]) {
      const f: Record<string, number> = { [p.name]: 1 };
      G.forEach((c) => (f[c.name] = 1));
      ch.forEach((c) => { const v = c.psi1 ?? 0; if (v) f[c.name] = v; });
      const grp = ch.filter((c) => caseGroup(c) && c.psi1);
      out.push({ nome: `Rara · ${p.name} principal${grp.length ? ` + ${grp.map((c) => c.name).join(', ')}` : ch.length ? ' + acompanhantes' : ''}`, tipo: 'RARA', fatores: comSimultaneos(f) });
    }
  }
  if (!V.length) out.push({ nome: 'Rara · permanentes', tipo: 'RARA', fatores: comSimultaneos(Object.fromEntries(G.map((c) => [c.name, 1]))) });
  return { combinacoes: comSegundaOrdem(out, an), regras };
}

/**
 * Desaprumo global numa combinação ELU normal (NBR 6118, 11.3.3.4.1). Mw = Σ f·M1 do vento e Md = |Σ f·Md,k| dos casos verticais
 * (fatores sem a ampliação 0,95·γz, como no Pórtico 2D). Sem vento: o desaprumo nas quatro direções, uma por vez; com vento, a
 * regra dos 30 % (`decidirRegra30`); o desaprumo é sempre na direção e no sentido do vento. O desaprumo não recebe a ampliação 0,95·γz.
 */
function comDesaprumo(cb: CombinacaoEd, bruto: Record<string, number>, an: AnaliseEdificio, W: NonNullable<AnaliseEdificio['vento']>['casos'], regras: RegraDesaprumo[]): CombinacaoEd[] {
  const des = an.desaprumo!;
  const termos: RegraDesaprumo['termos'] = [];
  let Md = 0, Mw = 0, vento: (typeof W)[number] | undefined;
  for (const k of des.verticais) { const f = bruto[k] ?? 0; if (f) { Md += f * des.md[k]; termos.push({ caso: k, f, Md: des.md[k] }); } }
  for (const w of W) { const f = bruto[w.nome] ?? 0; if (!f) continue; const mw = momentoVento(w); Mw += f * mw; vento ??= w; termos.push({ caso: w.nome, f, Md: 0, Mw: mw }); }
  Md = Math.abs(Md);
  const decisao = decidirRegra30(Mw, Md, !!vento);
  const reg: RegraDesaprumo = { combo: cb.nome, hasW: !!vento, ...(vento ? { ventoCaso: vento.nome, direcao: vento.direcao } : {}), Mw, Md, decisao, saida: [], termos };
  regras.push(reg);
  const comDirecao = (direcao: number, f: Record<string, number>) => {
    const g = { ...f };
    for (const k of des.verticais) if (bruto[k]) g[nomeCasoDesaprumo(k, direcao)] = bruto[k];
    return g;
  };
  let saida: CombinacaoEd[];
  if (decisao === 'sem-desaprumo' || decisao === 'so-vento') saida = [cb];
  else if (decisao === 'sem-vento') saida = DIRECOES_DESAPRUMO.map((d) => ({ ...cb, nome: `${cb.nome} · desaprumo ${d}°`, fatores: comDirecao(d, cb.fatores) }));
  else if (decisao === 'so-desaprumo') {
    const f = { ...cb.fatores };
    for (const w of W) delete f[w.nome];
    saida = [{ ...cb, nome: `${cb.nome} · só desaprumo ${vento!.direcao}° (vento < 30%)`, fatores: comDirecao(vento!.direcao, f) }];
  } else saida = [{ ...cb, nome: `${cb.nome} + desaprumo ${vento!.direcao}°`, fatores: comDirecao(vento!.direcao, cb.fatores) }];
  reg.saida = saida.map((c) => c.nome);
  return saida;
}

/** P-Δ (N2c): soma, com fator 1, o caso dos efeitos de 2ª ordem calculado para cada combinação ELU (pelo nome). */
function comSegundaOrdem(cs: CombinacaoEd[], an: Pick<AnaliseEdificio, 'segundaOrdem'>): CombinacaoEd[] {
  const casos = new Map((an.segundaOrdem?.combinacoes ?? []).filter((c) => c.caso).map((c) => [c.nome, c.caso!]));
  if (!casos.size) return cs;
  return cs.map((c) => (c.tipo === 'ELU' && casos.has(c.nome) && !(casos.get(c.nome)! in c.fatores) ? { ...c, fatores: { ...c.fatores, [casos.get(c.nome)!]: 1 } } : c));
}

/** Valor combinado de uma grandeza por caso. */
export const combinar = (por: Record<string, number>, c: CombinacaoEd) => Object.entries(c.fatores).reduce((s, [k, f]) => s + f * (por[k] ?? 0), 0);

const TIPO_DO_ESTADO: Record<EstadoId, CombinacaoEd['tipo'] | 'EQU' | 'FOGO'> = Object.fromEntries(ESTADOS_INFO.map((e) => [e.id, e.tipo])) as never;

/**
 * Combinações de um grupo de estados: as da norma (filtradas pelo tipo do grupo) ou, no modo "usuário" e havendo
 * situações cadastradas, as do usuário. Sem situações, o grupo em modo "usuário" usa as da norma.
 */
export function combinacoesDoEstado(b: BuildingModel, an: Pick<AnaliseEdificio, 'vento'> & Partial<Pick<AnaliseEdificio, 'opcoes' | 'segundaOrdem' | 'desaprumo'>>, id: EstadoId, normativas?: CombinacaoEd[]): CombinacaoEd[] {
  const tipo = TIPO_DO_ESTADO[id];
  if (tipo === 'EQU' || tipo === 'FOGO') return [];
  const norma = (normativas ?? combinacoesEdificio(b, an as AnaliseEdificio)).filter((c) => c.tipo === tipo);
  if (estadoEmUso(b, id).modo !== 'usuario') return norma;
  const sits = (b.situacoes ?? []).filter((s) => s.estado === id);
  return sits.length ? comSegundaOrdem(sits.map((s) => ({ nome: s.nome, tipo, fatores: fatoresDaSituacao(s) })), an as Pick<AnaliseEdificio, 'segundaOrdem'>) : norma;
}
