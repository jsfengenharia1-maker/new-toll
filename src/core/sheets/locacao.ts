// Prancha de locação e cargas (R5): eixos e cotas como na planta de formas, pilares na seção do primeiro lance
// (hachurados) com o rótulo "Pn / b×h", tabela de cargas por pilar com valores característicos (combinação rara
// de maior N, como as cargas enviadas a Fundações) e de cálculo (ELU de maior Nd), em kN e kN·m, e notas gerais
// do modelo (concreto, aço, cobrimentos, CAA, γ, normas).
import { primitivasMarcasCorte } from './cortes';
import { primitivasEscadas } from './escadasPrancha';
import { opcoesEmUso, perfilDe } from '../building/opcoes';
import { pontoRef, refDe } from '../building/vistaObra';
import type { AnaliseEdificio } from '../building/analitico';
import { combinacoesDoEstado, type CombinacaoEd } from '../building/combinacoes';
import { cargasParaFundacao } from '../building/dimensionamento';
import { acoDe, cobrimentoFundacao, fckDe, gamas } from '../building/materiais';
import { estadoEmUso } from '../building/acoes';
import { notaFogo } from '../building/fogo';

const ROTULO = { laje: 'lajes', viga: 'vigas', pilar: 'pilares', fundacao: 'fundações' } as const;
import { ARMACAO_PADRAO, casosDaObra, contornoPilar, lancesDoPilar, USOS, type BuildingModel, type SecaoPilar } from '../building/types';
import { caixa, cotasDoUsuario, eixosECotas, textoParede, type P, type Prancha, type Prim } from './prancha';
import { contornoDoLado, ladosDoPP, lancesDoPP } from '../building/pilarParede';
import { montarFolha, nf, notas, ordemNome, plantaNaFolha, type BlocoTabela } from './armacao';
import type { OpcoesArmacao } from './armacaoVigas';

const secTxt = (s: SecaoPilar) => (s.tipo === 'ret' ? `${Math.round(s.b * 100)}×${Math.round(s.h * 100)}` : `ø${Math.round(s.d * 100)}`);

export interface CargaPilarPrancha {
  pilar: string; secao: string;
  /** Característicos: N máx. e mín. da rara, Mx, My, Hx, Hy da rara de maior N (kN, kN·m). */
  k: { Nmax: number; Nmin: number; Mx: number; My: number; Hx: number; Hy: number };
  /** De cálculo: idem nas ELU. */
  d: { Nmax: number; Nmin: number; Mx: number; My: number; Hx: number; Hy: number };
}

/** Cargas por pilar na fundação: características (rara) e de cálculo (ELU). */
export function cargasDosPilares(b: BuildingModel, an: AnaliseEdificio): CargaPilarPrancha[] {
  const fk = new Map(cargasParaFundacao(b, an).map((c) => [c.label, c]));
  const elu = combinacoesDoEstado(b, an, 'concreto');
  const porPilar = new Map<string, Record<string, AnaliseEdificio['fundacao'][number]>>();
  for (const f of an.fundacao) { const r = porPilar.get(f.pilar) ?? {}; r[f.caso] = f; porPilar.set(f.pilar, r); }
  const out: CargaPilarPrancha[] = [];
  for (const p of [...b.pilares].sort((a, z) => ordemNome(a.nome, z.nome))) {
    const r = porPilar.get(p.id), c = fk.get(p.nome);
    if (!r || !c) continue;
    const v = (cb: CombinacaoEd, k: 'N' | 'Vx' | 'Vy' | 'Mx' | 'My') => Object.entries(cb.fatores).reduce((s, [n, f]) => s + f * (r[n]?.[k] ?? 0), 0);
    const ns = elu.map((cb) => v(cb, 'N')), iMax = ns.indexOf(Math.max(...ns)), cMax = elu[iMax];
    const s0 = lancesDoPilar(b, p)[0];
    out.push({
      pilar: p.nome, secao: secTxt(s0 ? (p.secoes?.find((x) => x.pavimento === s0.id)?.secao ?? p.secao) : p.secao),
      k: { Nmax: c.Nk, Nmin: c.NkMin, Mx: c.Mx, My: c.My, Hx: c.Hx, Hy: c.Hy },
      d: cMax ? { Nmax: ns[iMax], Nmin: Math.min(...ns), Mx: v(cMax, 'Mx'), My: v(cMax, 'My'), Hx: v(cMax, 'Vx'), Hy: v(cMax, 'Vy') } : { Nmax: 0, Nmin: 0, Mx: 0, My: 0, Hx: 0, Hy: 0 },
    });
  }
  // pilares-parede (E1b): resultante na base, no centro do pilar-parede
  const raras = combinacoesDoEstado(b, an, 'solo').filter((x) => x.tipo === 'RARA');
  for (const pp of [...(b.pilaresParede ?? [])].sort((a, z) => ordemNome(a.nome, z.nome))) {
    const r = porPilar.get(pp.id), l0 = lancesDoPP(b, pp)[0];
    if (!r || !l0 || pp.nasce !== 'fundacao') continue;
    const v = (cb: CombinacaoEd, k: 'N' | 'Vx' | 'Vy' | 'Mx' | 'My') => Object.entries(cb.fatores).reduce((s, [n, f]) => s + f * (r[n]?.[k] ?? 0), 0);
    const nk = raras.map((cb) => v(cb, 'N')), ik = nk.indexOf(Math.max(...nk)), ck = raras[ik], nd = elu.map((cb) => v(cb, 'N')), id = nd.indexOf(Math.max(...nd)), cd = elu[id];
    if (!ck || !cd) continue;
    out.push({
      pilar: pp.nome, secao: textoParede(b, pp, l0.id),
      k: { Nmax: nk[ik], Nmin: Math.min(...nk), Mx: v(ck, 'Mx'), My: v(ck, 'My'), Hx: v(ck, 'Vx'), Hy: v(ck, 'Vy') },
      d: { Nmax: nd[id], Nmin: Math.min(...nd), Mx: v(cd, 'Mx'), My: v(cd, 'My'), Hx: v(cd, 'Vx'), Hy: v(cd, 'Vy') },
    });
  }
  return out;
}

/** Notas das cargas variáveis por uso (NBR 6120) e das categorias de uso como casos de carga (ψ da NBR 6118, Tabela 11.2). */
function cargasVariaveisPorUso(b: BuildingModel): string[] {
  const usados = b.grupos.filter((g) => b.pavimentos.some((p) => p.grupo === g.id));
  const porUso = new Map<string, Set<number>>();
  for (const g of usados) { const r = USOS.find((u) => u.v === g.uso)?.label.split(' (')[0] ?? g.uso; porUso.set(r, new Set([...(porUso.get(r) ?? []), g.q])); }
  const f = (v: number) => nf(v);
  const out: string[] = [];
  if (porUso.size) out.push(`Cargas variáveis de uso (NBR 6120, kN/m²): ${[...porUso].map(([u, qs]) => `${u.toLowerCase()} ${[...qs].map(f).join('/')}`).join('; ')}.`);
  const qs = casosDaObra(b).filter((c) => c.natureza === 'Q' && c.psi);
  if (qs.length > 1) out.push(`Categorias de uso como casos de carga (ψ0/ψ1/ψ2, NBR 6118 Tabela 11.2): ${qs.map((c) => `${c.nome} ${c.psi!.map((x) => f(x)).join('/')}`).join('; ')}.`);
  if ((b.casos ?? []).some((c) => c.natureza === 'H')) out.push('Empuxo de terra (caso H): permanente com γh próprio, tipos de empuxo no memorial.');
  return out;
}

/** Notas gerais geradas do modelo (materiais, cobrimentos, CAA, γ e normas). */
export function notasGerais(b: BuildingModel): string[] {
  const fund = !!b.fundacao?.elementos.length;
  const g = gamas(b), fcks = (['laje', 'viga', 'pilar', ...(fund ? ['fundacao' as const] : [])] as const).map((t) => `${ROTULO[t]} C${fckDe(b, t)}`);
  const acos = [...new Set((['pilarLong', 'vigaPos', 'vigaEstribo', 'lajeInf', ...(fund ? ['fundacao' as const] : [])] as const).map((k) => acoDe(b, k).aco))];
  const c = b.norma.cobrimento;
  return [
    `Concreto: ${fcks.join(', ')} (fck em MPa). Aço: ${acos.join(' e ')}.`,
    `Classe de agressividade ambiental ${b.norma.caa}; cobrimentos nominais: lajes ${nf(c.laje, 1)} cm, vigas ${nf(c.viga, 1)} cm, pilares ${nf(c.pilar, 1)} cm${fund ? `, fundações ${nf(cobrimentoFundacao(b) * 100, 1)} cm` : ''}.`,
    `Coeficientes de ponderação: γc ${nf(g.c)}, γs ${nf(g.s)}, γg ${nf(g.g)}, γq ${nf(g.q)}${b.norma.controle && b.norma.controle !== 'normal' ? ` (controle de execução: ${b.norma.controle === 'desfavoravel' ? 'desfavorável' : 'pré-moldado'})` : ''}.`,
    ...cargasVariaveisPorUso(b),
    'Normas: ABNT NBR 6118 (concreto), NBR 6120 (cargas), NBR 6123 (vento), NBR 8681 (ações e combinações).',
    ...(estadoEmUso(b, 'incendio').ativo ? [notaFogo(b, opcoesEmUso(b.opcoes, perfilDe(b)))] : []),
    opcoesEmUso(b.opcoes, perfilDe(b)).segundaOrdem === 1
      ? 'Efeitos globais de 2ª ordem pelo processo P-Δ no pórtico espacial com rigidez reduzida (NBR 6118, 15.7.3), por combinação ELU.'
      : 'Efeitos globais de 2ª ordem pelo coeficiente γz (NBR 6118, 15.5.3): ações horizontais das combinações ELU × 0,95·γz.',
    'Cargas na fundação por pilar em kN e kN·m: característica = combinação rara de maior N (M e H da mesma); cálculo = ELU de maior Nd. Momentos e forças nos eixos globais.',
    'Medidas em cm; cotas pelos eixos e centros dos pilares do projeto.',
  ];
}

export function montarPranchaLocacao(b: BuildingModel, an: AnaliseEdificio | null, o: OpcoesArmacao = {}): Prancha | null {
  const pils = b.pilares.filter((p) => p.nasce === 'fundacao').map((p) => { const l = lancesDoPilar(b, p)[0]; const s = l ? (p.secoes?.find((x) => x.pavimento === l.id)?.secao ?? p.secao) : p.secao; return { p, s, c: contornoPilar(p, s) }; });
  // pilares-parede que nascem na fundação: um contorno por lado
  const paredes = (b.pilaresParede ?? []).filter((pp) => pp.nasce === 'fundacao').flatMap((pp) => { const l = lancesDoPP(b, pp)[0]; return l ? [{ pp, lance: l.id, cs: ladosDoPP(b, pp).map((g) => contornoDoLado(g, l.id)) }] : []; });
  if (!pils.length && !paredes.length) return null;
  const cfg = { escala: b.prancha?.armacao?.escalaLocacao || b.prancha?.escala || 0, formato: b.prancha?.formato ?? 'auto' };
  const cx = caixa([...pils.flatMap((x) => x.c), ...paredes.flatMap((w) => w.cs.flat())]);
  const pl = plantaNaFolha(cx, cfg.formato, cfg.escala, 34);
  const k = pl.escala / 1000;
  const modelo: Prim[] = [];
  for (const { p, s, c } of pils) {
    const [, , x1, y1] = caixa(c);
    modelo.push({ t: 'hach', c: 'PILAR-HACH', pts: c }, { t: 'pl', c: 'PILAR', pts: c, fechada: true });
    const [rx, ry] = pontoRef(b, p.id, [x1, y1]), rr = refDe(b, p.id)?.rot;
    modelo.push({ t: 'txt', c: 'TEXTO', p: [rx + 0.8 * k, ry + 0.8 * k], h: 2.5 * k, s: p.nome, av: 'base', ...(rr ? { ang: rr } : {}) }, { t: 'txt', c: 'TEXTO', p: [rx + 0.8 * k, ry - 0.4 * k], h: 2 * k, s: secTxt(s), av: 'topo', ...(rr ? { ang: rr } : {}) });
  }
  for (const w of paredes) {
    for (const c of w.cs) modelo.push({ t: 'hach', c: 'PILAR-HACH', pts: c }, { t: 'pl', c: 'PILAR', pts: c, fechada: true });
    const [, , x1, y1] = caixa(w.cs.flat());
    modelo.push({ t: 'txt', c: 'TEXTO', p: [x1 + 0.8 * k, y1 + 0.8 * k], h: 2.5 * k, s: w.pp.nome, av: 'base' }, { t: 'txt', c: 'TEXTO', p: [x1 + 0.8 * k, y1 - 0.4 * k], h: 2 * k, s: textoParede(b, w.pp, w.lance), av: 'topo' });
  }
  modelo.push(...primitivasEscadas(b, k));
  const centros = [...pils.map(({ c }) => c), ...paredes.map((w) => w.cs.flat())].map((c) => { const [a0, b0, a1, b1] = caixa(c); return [(a0 + a1) / 2, (b0 + b1) / 2] as P; });
  eixosECotas(modelo, b.eixos, centros, cx, k);
  modelo.push(...primitivasMarcasCorte(b, k, cx)); // marcas dos cortes ativos (V6a)
  // cotas do usuário (L6) que só ligam pilares, paredes, eixos e pontos livres (a locação não tem vigas nem lajes)
  if ({ ...ARMACAO_PADRAO, ...(b.prancha?.armacao ?? {}) }.cotasUsuario) cotasDoUsuario(b, modelo, k, (c) => c.refs.every((r) => !r.elem || ['pilar', 'parede', 'eixo'].includes(r.elem.tipo)));
  const tabelas: BlocoTabela[] = [notas(notasGerais(b), 'NOTAS GERAIS')];
  const avisos = [...pl.avisos];
  if (an) {
    const cs = cargasDosPilares(b, an);
    const v = (x: number) => nf(x);
    const w = 13;
    tabelas.push({
      titulo: 'CARGAS NOS PILARES — CARACTERÍSTICAS (k) E DE CÁLCULO (d) — kN, kN·m',
      cols: [{ w: 14, rot: 'PILAR' }, { w: 16, rot: 'SEÇÃO' }, ...['Nk,máx', 'Nk,mín', 'Mxk', 'Myk', 'Hxk', 'Hyk', 'Nd,máx', 'Nd,mín', 'Mxd', 'Myd', 'Hxd', 'Hyd'].map((rot) => ({ w, rot }))],
      linhas: cs.map((c) => [c.pilar, c.secao, v(c.k.Nmax), v(c.k.Nmin), v(c.k.Mx), v(c.k.My), v(c.k.Hx), v(c.k.Hy), v(c.d.Nmax), v(c.d.Nmin), v(c.d.Mx), v(c.d.My), v(c.d.Hx), v(c.d.Hy)]),
    });
  } else avisos.push('Sem análise: a tabela de cargas sai depois de calcular o edifício.');
  return montarFolha({
    b, formato: pl.formato, tipo: 'locacao', titulo: 'Locação e cargas', conteudo: 'LOCAÇÃO DOS PILARES E CARGAS NA FUNDAÇÃO', escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo,
    desenho: [], tabelas, legenda: `ESCALA 1:${pl.escala} · cotas em cm · cargas em kN e kN·m`, avisos, modelo, janela: pl.janela, elementos: [...pils.map((x) => x.p.nome), ...paredes.map((w) => w.pp.nome)],
  });
}
