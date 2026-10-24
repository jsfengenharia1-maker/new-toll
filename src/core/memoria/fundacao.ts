// Memória detalhada (MD fase 5): fundações do edifício. Chamada no fim de `calcularFundacaoEdificio` só com a memória ligada:
// cargas na fundação de cada elemento (reações por caso, combinações raras, envoltória e a carga adotada nos eixos do
// elemento) e a cadeia de cada tipo (sapata isolada em `sapata.ts`; sapata corrida em `sapataCorrida.ts`).
import type { AnaliseEdificio } from '../building/analitico';
import { combinacoesDoEstado } from '../building/combinacoes';
import { TIPO_FUNDACAO_LABEL, type ResultadoFundacao } from '../building/fundacao';
import { referenciaDoPP } from '../building/fundacaoPilarParede';
import { casosDaObra, type BuildingModel } from '../building/types';
import { fm, fp, type Registrador, type ValorMemoria } from './registrador';
import { registrarSapata } from './sapata';

type Reacao = AnaliseEdificio['fundacao'][number];

/** Nome do elemento na memória: "Sapata S1", "Bloco sobre estacas B2", "Tubulão T1". */
export const elementoFundacao = (r: Pick<ResultadoFundacao, 'tipo' | 'nome'>) => `${TIPO_FUNDACAO_LABEL[r.tipo]} ${r.nome}`;

const r2 = (v: number) => +v.toFixed(2);

/** Registra, para cada elemento de fundação calculado, as cargas e a cadeia do seu tipo. */
export function registrarFundacoes(mem: Registrador, b: BuildingModel, bb: Pick<AnaliseEdificio, 'fundacao' | 'vento'>, res: ResultadoFundacao[]): void {
  for (const r of res) {
    const el = elementoFundacao(r);
    if (!mem.aceita(el) || r.mantido) continue;
    for (const id of r.pilarIds) registrarCargasPilar(mem, el, b, bb, id, r.pilarIds.length > 1);
    registrarCargaAdotada(mem, el, r);
    if (r.tipo === 'sapata' && r.projeto) registrarSapata(mem, el, r.projeto);
    resumoElemento(mem, el, r);
  }
}

/** Reação do pilar por caso (a mesma de `cargasPorPilar`: reações repetidas do mesmo caso somam). */
function reacoesDoPilar(bb: Pick<AnaliseEdificio, 'fundacao'>, id: string): Record<string, Reacao> {
  const out: Record<string, Reacao> = {};
  for (const f of bb.fundacao) {
    if (f.pilar !== id) continue;
    const a = out[f.caso];
    out[f.caso] = a ? { ...a, N: a.N + f.N, Vx: a.Vx + f.Vx, Vy: a.Vy + f.Vy, Mx: a.Mx + f.Mx, My: a.My + f.My } : f;
  }
  return out;
}

function registrarCargasPilar(mem: Registrador, el: string, b: BuildingModel, bb: Pick<AnaliseEdificio, 'fundacao' | 'vento'>, id: string, varios: boolean) {
  const pil = b.pilares.find((x) => x.id === id), pp = b.pilaresParede?.find((x) => x.id === id);
  const nome = pil?.nome ?? pp?.nome ?? id;
  const suf = varios ? ` · ${nome}` : '';
  const r = reacoesDoPilar(bb, id);
  const casos = Object.keys(r);
  if (pp && !pil) {
    const ref = referenciaDoPP(b, pp);
    if (ref) mem.passo({ etapa: 'cargas', elemento: el, topico: `Pilar-parede ${nome}`, descricao: `O pilar-parede ${nome} é tratado pela fundação como um pilar equivalente: retângulo simétrico em torno do centroide das áreas dos lados que envolve todos os lados, nos eixos do pilar-parede`, formula: 'c = Σ(Ai·ci)/ΣAi; ap, bp = 2·máx|distância aos cantos nos eixos locais|', expressao: `centro = (${fm(ref.c[0], 5)}; ${fm(ref.c[1], 5)}) m; ap × bp = ${fm(ref.ap)} × ${fm(ref.bp)} m; ângulo ${fm(ref.angulo)}°`, resultado: ref.ap * ref.bp, unidade: 'm²', norma: 'Pilar equivalente (convenção do programa; a confirmar)', aConfirmar: true, entradas: { cx: ref.c[0], cy: ref.c[1], ap: ref.ap, bp: ref.bp, angulo: ref.angulo } });
  }
  const tc = `Cargas características por caso${suf}`;
  for (const c of casos) {
    const q = r[c];
    mem.passo({ etapa: 'cargas', elemento: el, topico: tc, descricao: `Caso ${c}: reação do pilar ${nome} na base (eixos globais)`, formula: 'N; Vx; Vy; Mx; My', expressao: `N = ${fm(q.N)} kN; Vx = ${fm(q.Vx)} kN; Vy = ${fm(q.Vy)} kN; Mx = ${fm(q.Mx)} kN·m; My = ${fm(q.My)} kN·m`, resultado: q.N, unidade: 'kN', norma: 'NBR 8681:2003', entradas: { N: q.N, Vx: q.Vx, Vy: q.Vy, Mx: q.Mx, My: q.My } });
  }
  const combs = combinacoesDoEstado(b, bb as AnaliseEdificio, 'solo').filter((x) => x.tipo === 'RARA');
  if (!combs.length || !casos.length) return;
  const v = (cb: (typeof combs)[number], k: 'N' | 'Vx' | 'Vy' | 'Mx' | 'My') => Object.entries(cb.fatores).reduce((s, [n, f]) => s + f * (r[n]?.[k] ?? 0), 0);
  const tr = `Combinações raras (verificação geotécnica)${suf}`;
  const ns: number[] = [];
  for (const cb of combs) {
    const fat = Object.entries(cb.fatores).filter(([, f]) => f !== 0);
    const N = v(cb, 'N'), Vx = v(cb, 'Vx'), Vy = v(cb, 'Vy'), Mx = v(cb, 'Mx'), My = v(cb, 'My');
    ns.push(N);
    const ent: Record<string, ValorMemoria> = { N, Vx, Vy, Mx, My };
    for (const [k, f] of fat) ent[`f_${k}`] = f;
    mem.passo({ etapa: 'combinacoes', elemento: el, topico: tr, descricao: `${cb.nome} no pilar ${nome}`, formula: 'Sd = Σ f·Sk,caso (N, Vx, Vy, Mx, My)', expressao: `N = ${fat.map(([k, f]) => `${fm(f)}·${fp(r[k]?.N ?? 0)}`).join(' + ') || '0'} = ${fm(N)} kN; M = (${fm(Mx)}; ${fm(My)}) kN·m; H = (${fm(Vx)}; ${fm(Vy)}) kN`, resultado: N, unidade: 'kN', norma: 'NBR 8681:2003, 5.1.3 (combinação rara)', entradas: ent });
  }
  const iMax = ns.indexOf(Math.max(...ns)), cMax = combs[iMax];
  const permanentes = casosDaObra(b).filter((c) => c.natureza === 'G' || c.natureza === 'H').map((c) => c.id);
  const perm = permanentes.reduce((t, c) => t + (r[c]?.N ?? 0), 0);
  const te = `Envoltória das combinações raras${suf}`;
  const Nk = Math.max(...ns), Nmin = Math.min(...ns);
  mem.passo({ etapa: 'esforcos', elemento: el, topico: te, descricao: `Carga vertical característica máxima (combinação ${cMax.nome}), arredondada a 0,01 kN como no cálculo`, formula: 'Nk = máx Nrara', expressao: `Nk = ${fm(Nk)} kN (${cMax.nome})`, resultado: r2(Nk), unidade: 'kN', norma: 'NBR 6122:2019, 5.5', entradas: { exato: Nk, combinacao: cMax.nome } });
  mem.passo({ etapa: 'esforcos', elemento: el, topico: te, descricao: 'Carga vertical característica mínima (verificação de tração e levantamento)', formula: 'Nk,mín = mín Nrara', expressao: `Nk,mín = ${fm(Nmin)} kN`, resultado: r2(Nmin), unidade: 'kN', norma: 'NBR 6122:2019, 5.5', entradas: { exato: Nmin } });
  mem.passo({ etapa: 'esforcos', elemento: el, topico: te, descricao: `Parcela permanente (casos G e H: ${permanentes.join(', ') || '—'})`, formula: 'Nk,perm = Σ N dos casos permanentes', expressao: `Nk,perm = ${fm(perm)} kN`, resultado: r2(perm), unidade: 'kN', norma: 'NBR 6122:2019', entradas: { exato: perm, casos: permanentes.join(',') } });
  for (const [k, un, rot] of [['Vx', 'kN', 'Hx'], ['Vy', 'kN', 'Hy'], ['Mx', 'kN·m', 'Mx'], ['My', 'kN·m', 'My']] as const) {
    const x = v(cMax, k);
    mem.passo({ etapa: 'esforcos', elemento: el, topico: te, descricao: `${rot} da combinação de maior N (${cMax.nome}), arredondado a 0,01`, formula: `${rot} = ${k} da rara de maior N`, expressao: `${rot} = ${fm(x)} ${un}`, resultado: r2(x), unidade: un, norma: 'NBR 6122:2019', entradas: { exato: x } });
  }
}

/** Carga adotada pelo elemento (eixos do elemento) e o que a diferencia da envoltória do pilar. */
function registrarCargaAdotada(mem: Registrador, el: string, r: ResultadoFundacao) {
  const c = r.carga;
  if (!c) return;
  const ent: Record<string, ValorMemoria> = { Nk: c.Nk, NkMin: c.NkMin, NkPerm: c.NkPerm ?? c.Nk, Hx: c.Hx, Hy: c.Hy, Mx: c.Mx, My: c.My, angulo: r.angulo };
  const extra: string[] = [];
  if (r.alivio) { ent.alivioTotal = r.alivio.total; ent.alivioConsiderado = r.alivio.considerado; ent.alivioMinimo = r.alivio.minimo; extra.push(`alívio de vigas de equilíbrio (${fm(r.alivio.total)} kN, ${fm(r.alivio.considerado)} kN no Nk)`); }
  if (r.alavanca) { ent.alavancaN = r.alavanca.N; ent.alavancaR = r.alavanca.R; ent.alavancaFator = r.alavanca.fator; extra.push(`alavanca da viga de equilíbrio (N = ${fm(r.alavanca.N)} kN → R = ${fm(r.alavanca.R)} kN, fator ${fm(r.alavanca.fator, 5)})`); }
  if (r.cargaDireta) { ent.cargaDireta = r.cargaDireta; extra.push(`cargas diretas no nível de fundação (${fm(r.cargaDireta)} kN)`); }
  mem.passo({ etapa: 'esforcos', elemento: el, topico: 'Carga adotada no elemento', descricao: `Carga característica usada no cálculo do elemento (momentos e forças horizontais girados para os eixos do elemento, ${fm(r.angulo)}°${extra.length ? `; ajustes: ${extra.join('; ')}` : ''}${c.source ? `; origem: ${c.source}` : ''})`, formula: 'Nk; Nk,mín; Nk,perm; H; M', expressao: `Nk = ${fm(c.Nk)} kN; Nk,mín = ${fm(c.NkMin)} kN; Nk,perm = ${fm(c.NkPerm ?? c.Nk)} kN; H = (${fm(c.Hx)}; ${fm(c.Hy)}) kN; M = (${fm(c.Mx)}; ${fm(c.My)}) kN·m`, resultado: c.Nk, unidade: 'kN', norma: 'NBR 6122:2019, 5.5', entradas: ent });
}

/** Resumo do elemento: dimensões e situação (as cadeias de blocos, estacas e tubulões vêm na fatia das fundações profundas). */
function resumoElemento(mem: Registrador, el: string, r: ResultadoFundacao) {
  const dims: Record<string, ValorMemoria> = {};
  for (const [k, v] of Object.entries(r.dims)) if (typeof v === 'number') dims[k] = v;
  mem.passo({ etapa: 'detalhamento', elemento: el, topico: 'Resumo do elemento', descricao: `${r.resumo}${r.mensagens.length ? ` — ${r.mensagens.join(' ')}` : ''}`, formula: 'dimensões e situação', expressao: Object.entries(dims).map(([k, v]) => `${k} = ${fm(v as number)}`).join('; ') || '—', resultado: r.status === 'ok' ? 'atende' : 'não atende', unidade: '', entradas: { cota: r.cota, profundidade: r.profundidade, volume: r.volume, ...dims } });
}
