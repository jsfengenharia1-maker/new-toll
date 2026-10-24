// Pranchas da base elástica (FU6), dentro do tipo `fundacao`: planta de armação dos radiers (padrão das lajes da R5/R4:
// barra representativa de cada posição com a linha de distribuição e o texto "n Nk φx,x c/s C=xxx"; malha inferior e
// superior em folhas separadas ou na mesma folha, conforme a opção das lajes), contorno das vigas sobre base elástica,
// pilares tracejados, eixos e cotas; quadro das vigas sobre base elástica (seção e armaduras) e das tensões no solo.
// Sem folha de referência para o radier: desenho pelo padrão R5 [a confirmar].
import type { Dimensionamento } from '../building/dimensionamento';
import type { PosicaoLaje } from '../building/detalhamentoLajes';
import { vigasElasticasEf } from '../building/baseElastica';
import { acoDe, cobrimentoFundacao, fckDe } from '../building/materiais';
import { centroPilar, contornoPilar, deslocarPolilinha, lancesDoPilar, secaoNoLance, type BuildingModel, type Pilar } from '../building/types';
import { areaPoligono } from '../geom/faces';
import { Posicoes, acoDaFolha, cfgArmacao, cmInt, montarFolha, nf, notas, perdasDe, phiTxt, plantaNaFolha, resumoAco, tabelaAco, type BlocoTabela } from './armacao';
import { caixa, eixosECotas, type LinhaTabelaAco, type P, type Prancha, type Prim } from './prancha';
import type { OpcoesArmacao } from './armacaoVigas';

/** Linha da tabela de quantitativos da fundação. */
export interface QuantBase { nomes: string[]; tipo: string; quant: number; concreto: number; forma: number; aco: number }

const secaoBase = (b: BuildingModel, p: Pilar) => { const l = lancesDoPilar(b, p)[0]; return l ? secaoNoLance(p, l.id) : p.secao; };
const perim = (c: P[]) => c.reduce((t, p, i) => { const q = c[(i + 1) % c.length]; return t + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);

/** Ângulo de texto legível (−90°, 90°] e normal à esquerda. */
function angLegivel(a: P, z: P) {
  let ang = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI;
  if (ang > 90.01) ang -= 180; else if (ang <= -89.99) ang += 180;
  const r = (ang * Math.PI) / 180;
  return { ang, n: [-Math.sin(r), Math.cos(r)] as P };
}

/** Faixa (contorno) de uma viga sobre base elástica: eixo deslocado de ±b/2. */
export function faixaVigaElastica(v: { pontos: [number, number][]; b: number }): P[] {
  const e = deslocarPolilinha(v.pontos, v.b / 2), d = deslocarPolilinha(v.pontos, -v.b / 2);
  return [...e, ...[...d].reverse()];
}

/**
 * Folhas da base elástica: uma (ou duas, malhas separadas) com a planta de todos os radiers e vigas sobre base elástica;
 * devolve também as linhas de quantitativos e a tabela de aço (para o resumo da fundação).
 */
export function montarPranchasBaseElastica(b: BuildingModel, dim: Dimensionamento, o: OpcoesArmacao & { sigla: string; conteudo: string }): { pranchas: Prancha[]; quant: QuantBase[]; aco: LinhaTabelaAco[] } {
  const rads = (dim.radiers ?? []), ves = (dim.vigasElasticas ?? []), dets = dim.detalhesRadier ?? [];
  const out: Prancha[] = [], quant: QuantBase[] = [], acoTot: LinhaTabelaAco[] = [];
  if (!rads.length && !ves.length) return { pranchas: out, quant, aco: acoTot };
  const cfg = cfgArmacao(b), perdas = perdasDe(b), fck = fckDe(b, 'fundacao'), aco = acoDe(b, 'fundacao').aco, cob = cobrimentoFundacao(b);
  const mRad = (b.fundacao?.radiers ?? []).filter((r) => rads.some((x) => x.id === r.id));
  const mVe = vigasElasticasEf(b).filter((v) => !v.corrida && !v.parede && ves.some((x) => x.id === v.id));
  const faixas = mVe.map((v) => ({ v, f: faixaVigaElastica(v) }));
  const pilares = b.pilares.filter((p) => p.nasce === 'fundacao');
  const geo: P[] = [...mRad.flatMap((r) => r.contorno as P[]), ...faixas.flatMap((x) => x.f)];
  const cx = caixa(geo);
  const pl = plantaNaFolha(cx, b.prancha?.formato ?? 'auto', cfg.escalaLajes || cfg.escalaLocacao || b.prancha?.escala || 0);
  const k = pl.escala / 1000;
  // fundo comum: contornos, furos, vigas, pilares, eixos e cotas
  const fundo: Prim[] = [];
  for (const r of mRad) {
    fundo.push({ t: 'pl', c: 'FUNDACAO', pts: r.contorno as P[], fechada: true });
    for (const f of r.furos ?? []) fundo.push({ t: 'pl', c: 'FUNDACAO', pts: f as P[], fechada: true });
    const [x0, , , y1] = caixa(r.contorno as P[]), res = rads.find((x) => x.id === r.id)!;
    fundo.push({ t: 'txt', c: 'TEXTO', p: [x0, y1 + 1.2 * k], h: 2.5 * k, s: `${r.nome} h=${cmInt(r.h)} · k=${nf(res.k / 1000, 0)} MN/m³`, av: 'base' });
  }
  for (const { v, f } of faixas) {
    fundo.push({ t: 'pl', c: 'FUNDACAO', pts: f, fechada: true });
    const a = v.pontos[0], z = v.pontos[1], { ang, n } = angLegivel(a, z);
    fundo.push({ t: 'txt', c: 'TEXTO', p: [(a[0] + z[0]) / 2 + n[0] * (v.b / 2 + 1 * k), (a[1] + z[1]) / 2 + n[1] * (v.b / 2 + 1 * k)], h: 2.2 * k, s: v.geo?.temMesa ? `${v.nome} ${v.geo.tipo} ${cmInt(v.geo.bw)}×${cmInt(v.h)} mesa ${cmInt(v.geo.bf)}×${cmInt(v.geo.hf)}` : `${v.nome} ${cmInt(v.b)}×${cmInt(v.h)}`, ang, ah: 'c', av: 'base' });
  }
  const centros: P[] = [];
  for (const p of pilares) { const s = secaoBase(b, p); centros.push(centroPilar(p, s)); fundo.push({ t: 'pl', c: 'PILAR-NASCE', pts: contornoPilar(p, s) as P[], fechada: true }); }
  eixosECotas(fundo, b.eixos, centros, cx, k);
  // quantitativos
  const concR = mRad.map((r) => { const A = Math.abs(areaPoligono(r.contorno)) - (r.furos ?? []).reduce((t, f) => t + Math.abs(areaPoligono(f)), 0); return { r, c: A * r.h, f: (perim(r.contorno as P[]) + (r.furos ?? []).reduce((t, f) => t + perim(f as P[]), 0)) * r.h }; });
  // quadros
  const tabs: BlocoTabela[] = [];
  if (rads.length) tabs.push({
    titulo: 'RADIERS — TENSÕES NO SOLO (RARAS) E ARMADURA (cm²/m)', cols: [{ w: 14, rot: 'RADIER' }, { w: 12, rot: 'h (cm)' }, { w: 18, rot: 'σmáx (MPa)' }, { w: 18, rot: 'σadm (MPa)' }, { w: 16, rot: 'w (mm)' }, { w: 24, rot: 'inf. x / y' }, { w: 24, rot: 'sup. x / y' }],
    linhas: rads.map((r) => [r.nome, String(cmInt(r.h)), nf(r.sigmaMax / 1000), r.sigmaAdm ? nf(r.sigmaAdm / 1000) : '—', nf(r.recalque * 1000, 1), `${nf(r.As.pos[0])} / ${nf(r.As.pos[1])}`, `${nf(r.As.neg[0])} / ${nf(r.As.neg[1])}`]),
  });
  if (ves.length) tabs.push({
    titulo: 'VIGAS SOBRE BASE ELÁSTICA', cols: [{ w: 14, rot: 'VIGA' }, { w: 16, rot: 'SEÇÃO' }, { w: 14, rot: 'L (m)' }, { w: 34, rot: 'INFERIOR' }, { w: 34, rot: 'SUPERIOR' }, { w: 22, rot: 'ESTRIBO' }, { w: 16, rot: 'σmáx (MPa)' }],
    linhas: ves.map((v) => { const a = v.armadura, t = (x: { n: number; phi: number } | null, f?: { passantes: number; grupos: { n: number; comprimento: number }[] }) => (x ? `${x.n} ${phiTxt(x.phi)}${f?.grupos.length ? ` (${f.passantes} corridas${f.grupos.map((g) => ` + ${g.n}×${nf(g.comprimento)} m`).join('')})` : ''}` : '—'); return [v.nome, `${cmInt(v.b)}×${cmInt(v.h)}`, nf(v.L), t(a.inf.barras, a.cortes?.inf), t(a.sup.barras, a.cortes?.sup), a.estribo ? `${phiTxt(a.estribo.phi)} c/${cmInt(a.estribo.s)}` : '—', nf(v.sigmaMax / 1000)]; }),
  });
  const nts = notas([
    'Medidas em cm; bitolas (φ) em mm; tensões em MPa. Barra representativa de cada posição com a linha de distribuição; pernas rebatidas no plano.',
    `Concreto C${fck} (fck = ${fck} MPa); aço ${aco}; cobrimento ${nf(cob * 100, 1)} cm.`,
    'Radier e vigas sobre base elástica (Winkler) calculados no pórtico espacial; tensão no solo σ = k·w nas combinações raras.',
    'Malhas corridas com perna nas bordas e emenda por traspasse; punção sob os pilares não verificada; desenho pelo padrão R5, sem folha de referência para radier [a confirmar].',
  ]);
  const folhas: { faces: ('inf' | 'sup')[]; rot: string }[] = !dets.length ? [{ faces: [], rot: 'PLANTA' }] : cfg.lajesSeparadas ? [{ faces: ['inf'], rot: 'MALHA INFERIOR' }, { faces: ['sup'], rot: 'MALHA SUPERIOR' }] : [{ faces: ['inf', 'sup'], rot: 'MALHAS INFERIOR E SUPERIOR' }];
  folhas.forEach((fl, ifl) => {
    const reg = new Posicoes(), modelo: Prim[] = [...fundo];
    const barra = (x: PosicaoLaje) => {
      const C = cmInt(x.comprimento), L0 = cmInt(x.ganchos[0]), L1 = cmInt(x.ganchos[1]);
      const pos = reg.pos(`R|${x.face}|${Math.min(L0, L1)}|${Math.max(L0, L1)}`, aco, x.phi, C, x.n);
      const c = x.face === 'inf' ? 'ARMADURA' : 'ARMADURA-NEG';
      const { ang, n } = angLegivel(x.a, x.z);
      const L = Math.hypot(x.z[0] - x.a[0], x.z[1] - x.a[1]) || 1, u: P = [(x.z[0] - x.a[0]) / L, (x.z[1] - x.a[1]) / L], nn: P = [-u[1], u[0]];
      const pts: P[] = [];
      if (L0) pts.push([x.a[0] + nn[0] * x.ganchos[0], x.a[1] + nn[1] * x.ganchos[0]]);
      pts.push(x.a, x.z);
      if (L1) pts.push([x.z[0] + nn[0] * x.ganchos[1], x.z[1] + nn[1] * x.ganchos[1]]);
      modelo.push({ t: 'pl', c, pts });
      const [f0, f1] = x.faixa, Lf = Math.hypot(f1[0] - f0[0], f1[1] - f0[1]);
      if (Lf > 1e-6) {
        const tf: P = [(-(f1[1] - f0[1]) / Lf) * 1.2 * k, ((f1[0] - f0[0]) / Lf) * 1.2 * k];
        modelo.push({ t: 'pl', c: 'COTA', pts: [f0, f1] });
        for (const q of [f0, f1]) modelo.push({ t: 'pl', c: 'COTA', pts: [[q[0] - tf[0], q[1] - tf[1]], [q[0] + tf[0], q[1] + tf[1]]] });
      }
      const t = x.face === 'inf' ? 0.3 : 0.7;
      const m: P = [x.a[0] + (x.z[0] - x.a[0]) * t + n[0] * 0.8 * k, x.a[1] + (x.z[1] - x.a[1]) * t + n[1] * 0.8 * k];
      modelo.push({ t: 'txt', c: 'TEXTO', p: m, h: 2 * k, s: `${x.n} ${pos} ${phiTxt(x.phi)}${x.s > 0 ? ` c/${cmInt(x.s)}` : ''} C=${C}`, ang, ah: 'c', av: 'base' });
    };
    for (const d of dets) for (const x of d.posicoes) if (fl.faces.includes(x.face)) barra(x);
    const conc = ifl === 0 ? concR.reduce((t, x) => t + x.c, 0) + ves.reduce((t, v) => t + v.volume, 0) : 0;
    const forma = ifl === 0 ? concR.reduce((t, x) => t + x.f, 0) + ves.reduce((t, v) => t + 2 * v.h * v.L, 0) : 0;
    const a = acoDaFolha(reg.tabela, perdas, conc, forma);
    acoTot.push(...reg.tabela);
    out.push(montarFolha({
      b, formato: pl.formato, tipo: 'fundacao', sigla: o.sigla, titulo: `Fundação — base elástica — ${fl.rot.toLowerCase()}`, conteudo: `${o.conteudo} — BASE ELÁSTICA — ${fl.rot}`,
      escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo, desenho: [], tabelas: [nts, ...tabs, ...(reg.tabela.length ? [tabelaAco(a.tabela), resumoAco(a, fck)] : [])],
      legenda: `ESCALA 1:${pl.escala} · radiers e vigas sobre base elástica`, avisos: pl.avisos, modelo, janela: pl.janela, aco: a, elementos: [...rads.map((r) => r.nome), ...ves.map((v) => v.nome)],
    }));
  });
  const kgDet = (id: string) => { const d = dets.find((x) => x.laje === id); return d ? d.peso : 0; };
  for (const x of concR) quant.push({ nomes: [x.r.nome], tipo: 'Radier', quant: 1, concreto: x.c, forma: x.f, aco: kgDet(x.r.id) });
  for (const v of ves) quant.push({ nomes: [v.nome], tipo: 'Viga s/ base elástica', quant: 1, concreto: v.volume, forma: 2 * v.h * v.L, aco: v.aco });
  return { pranchas: out, quant, aco: acoTot };
}
