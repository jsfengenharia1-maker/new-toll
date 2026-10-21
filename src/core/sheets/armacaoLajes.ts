// Prancha de armação das lajes (R5), por grupo de pavimentos: planta (escala das formas, ou a da opção) com
// contornos de lajes, vigas e pilares em traço fino, e cada posição desenhada como barra representativa
// (pernas e ganchos rebatidos) com a linha de distribuição e o texto "n Nk φx,x c/s C=xxx". Positivas
// (face inferior) e negativas (face superior) em folhas separadas (padrão) ou na mesma folha em camadas
// distintas. Treliçadas: sentido das vigotas, treliça e posições das vigotas (adicionais, negativos e
// distribuição da capa) listadas na laje. Tabela de aço e resumo por folha.
import type { AnaliseEdificio } from '../building/analitico';
import type { Dimensionamento } from '../building/dimensionamento';
import type { PosicaoLaje } from '../building/detalhamentoLajes';
import { TRELICADAS } from '../building/lajes';
import { acoDe, fckDe } from '../building/materiais';
import { contornoPilar, geometriaViga, lancesDoPilar, pavimentosDoGrupo, secaoNoLance, type BuildingModel } from '../building/types';
import { areaPoligono } from '../geom/faces';
import { pontoInterno } from '../geom/faces';
import { caixa, type P, type Prancha, type Prim } from './prancha';
import { Posicoes, acoDaFolha, cfgArmacao, cmInt, montarFolha, nf, notas, perdasDe, phiTxt, plantaNaFolha, qtd, resumoAco, tabelaAco, type BlocoTabela } from './armacao';
import { acharGrupo, gruposOrdenados, type OpcoesArmacao } from './armacaoVigas';

type Face = 'inf' | 'sup';

/** Ângulo de texto legível (−90°, 90°] e normal à esquerda. */
function angLegivel(a: P, z: P) {
  let ang = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI;
  if (ang > 90.01) ang -= 180; else if (ang <= -89.99) ang += 180;
  const r = (ang * Math.PI) / 180;
  return { ang, n: [-Math.sin(r), Math.cos(r)] as P };
}

export function montarPranchasLajes(b: BuildingModel, _an: AnaliseEdificio | null, dim: Dimensionamento, o: OpcoesArmacao = {}): Prancha[] {
  const cfg = cfgArmacao(b), cfgP = { formato: b.prancha?.formato ?? 'auto', escala: b.prancha?.escala ?? 0 };
  const perdas = perdasDe(b), fck = fckDe(b, 'laje'), acoI = acoDe(b, 'lajeInf').aco, acoS = acoDe(b, 'lajeSup').aco;
  const gSel = acharGrupo(b, o.grupo);
  const out: Prancha[] = [];
  for (const g of gruposOrdenados(b)) {
    if (gSel && g !== gSel) continue;
    const lajes = b.lajes.filter((l) => l.grupo === g);
    const dets = (dim.detalhesLajes ?? []).filter((d) => lajes.some((l) => l.id === d.laje));
    const vigs = (dim.vigotas ?? []).filter((v) => v.grupo === g);
    if (!dets.length && !vigs.length) continue;
    const pavs = pavimentosDoGrupo(b, g), ref = pavs[0], nomeG = b.grupos.find((x) => x.id === g)?.nome ?? g;
    const vigas = b.vigas.filter((v) => v.grupo === g);
    const pilares = ref ? b.pilares.filter((p) => lancesDoPilar(b, p).some((x) => x.id === ref.id)) : [];
    const geo: P[] = [...lajes.flatMap((l) => l.contorno), ...vigas.flatMap((v) => v.pontos)];
    const cx = caixa(geo);
    const pl = plantaNaFolha(cx, cfgP.formato, cfg.escalaLajes || cfgP.escala);
    const k = pl.escala / 1000;
    // fundo: contornos em traço fino
    const fundo: Prim[] = [];
    for (const l of lajes) {
      fundo.push({ t: 'pl', c: 'FORMA-FINA', pts: l.contorno, fechada: true });
      for (const f of l.furos ?? []) fundo.push({ t: 'pl', c: 'FORMA-FINA', pts: f, fechada: true });
      const pi = pontoInterno(l.contorno);
      fundo.push({ t: 'txt', c: 'TEXTO', p: [pi[0] + 3 * k, pi[1] + 3 * k], h: 3 * k, s: l.nome, ah: 'e', av: 'base' });
    }
    for (const v of vigas) { const gv = geometriaViga(v); fundo.push({ t: 'pl', c: 'FORMA-FINA', pts: [...gv.esq, ...[...gv.dir].reverse()], fechada: true }); }
    for (const p of pilares) fundo.push({ t: 'pl', c: 'FORMA-FINA', pts: contornoPilar(p, secaoNoLance(p, ref!.id)), fechada: true });
    // concreto e forma das lajes do grupo (todas as repetições)
    let concreto = 0, forma = 0;
    for (const l of lajes) {
      const A = Math.abs(areaPoligono(l.contorno)) - (l.furos ?? []).reduce((s, f) => s + Math.abs(areaPoligono(f)), 0);
      const t = l.tipo.tipo === 'macica' ? l.tipo.h : (() => { const kk = TRELICADAS[l.tipo.modelo] ?? TRELICADAS.H12; return l.tipo.capa + (kk.bw * kk.hEnch) / kk.intereixo; })();
      concreto += A * t * pavs.length; forma += A * pavs.length;
    }
    const folhas: { faces: Face[]; rot: string }[] = cfg.lajesSeparadas ? [{ faces: ['inf'], rot: 'POSITIVAS' }, { faces: ['sup'], rot: 'NEGATIVAS' }] : [{ faces: ['inf', 'sup'], rot: 'POSITIVAS E NEGATIVAS' }];
    for (const fl of folhas) {
      const reg = new Posicoes(), modelo: Prim[] = [...fundo];
      const barra = (x: PosicaoLaje, rep: number) => {
        const face = x.face as Face, aco = face === 'inf' ? acoI : acoS, C = cmInt(x.comprimento);
        const L0 = cmInt(x.ganchos[0]), L1 = cmInt(x.ganchos[1]);
        const pos = reg.pos(`L|${face}|${Math.min(L0, L1)}|${Math.max(L0, L1)}`, aco, x.phi, C, x.n * rep);
        const c = face === 'inf' ? 'ARMADURA' : 'ARMADURA-NEG';
        const { ang, n } = angLegivel(x.a, x.z);
        const L = Math.hypot(x.z[0] - x.a[0], x.z[1] - x.a[1]) || 1, u: P = [(x.z[0] - x.a[0]) / L, (x.z[1] - x.a[1]) / L], nn: P = [-u[1], u[0]];
        // pernas rebatidas no plano (perpendiculares à barra), comprimento real
        const pts: P[] = [];
        if (L0) pts.push([x.a[0] + nn[0] * x.ganchos[0], x.a[1] + nn[1] * x.ganchos[0]]);
        pts.push(x.a, x.z);
        if (L1) pts.push([x.z[0] + nn[0] * x.ganchos[1], x.z[1] + nn[1] * x.ganchos[1]]);
        modelo.push({ t: 'pl', c, pts });
        // linha de distribuição com traços nas pontas
        const [f0, f1] = x.faixa, Lf = Math.hypot(f1[0] - f0[0], f1[1] - f0[1]);
        if (Lf > 1e-6) {
          const tf: P = [(-(f1[1] - f0[1]) / Lf) * 1.2 * k, ((f1[0] - f0[0]) / Lf) * 1.2 * k];
          modelo.push({ t: 'pl', c: 'COTA', pts: [f0, f1] });
          for (const q of [f0, f1]) modelo.push({ t: 'pl', c: 'COTA', pts: [[q[0] - tf[0], q[1] - tf[1]], [q[0] + tf[0], q[1] + tf[1]]] });
        }
        // texto a 35 % da barra (a linha de distribuição costuma cruzar o meio)
        const t = L / k > 70 ? 0.35 : 0.5;
        const m: P = [x.a[0] + (x.z[0] - x.a[0]) * t + n[0] * 0.8 * k, x.a[1] + (x.z[1] - x.a[1]) * t + n[1] * 0.8 * k];
        const s = x.s > 0 ? ` c/${cmInt(x.s)}` : '';
        modelo.push({ t: 'txt', c: 'TEXTO', p: m, h: 2 * k, s: `${qtd(rep, x.n)} ${pos} ${phiTxt(x.phi)}${s} C=${C}`, ang, ah: 'c', av: 'base' });
      };
      for (const d of dets) for (const x of d.posicoes) if (fl.faces.includes(x.face)) barra(x, d.repeticoes);
      // base em tela soldada detalhada: painel com diagonais e "T1 – Q138 – 2,45 × 6,00" (m), traspasse pelos retângulos sobrepostos
      const telas = new Map<string, { n: number; area: number; peso: number }>();
      const relacao: string[][] = [];
      for (const d of dets) for (const pn of d.paineis ?? []) {
        if (!fl.faces.includes(pn.face)) continue;
        const c = pn.face === 'inf' ? 'ARMADURA' : 'ARMADURA-NEG', [A, B, C, D] = pn.poligono, cx: P = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
        modelo.push({ t: 'pl', c, pts: pn.poligono, fechada: true }, { t: 'pl', c, pts: [A, C] }, { t: 'pl', c, pts: [B, D] });
        modelo.push({ t: 'txt', c: 'TEXTO', p: cx, h: 2 * k, s: `${pn.n} – ${pn.designacao} – ${nf(pn.largura)} × ${nf(pn.comprimento)}`, ang: pn.angulo > 90 && pn.angulo <= 270 ? pn.angulo - 180 : pn.angulo, ah: 'c', av: 'meio' });
        const e = telas.get(pn.designacao) ?? { n: 0, area: 0, peso: 0 };
        e.n += d.repeticoes; e.area += pn.largura * pn.comprimento * d.repeticoes; e.peso += pn.peso * d.repeticoes; telas.set(pn.designacao, e);
        relacao.push([`${d.nome} ${pn.n}`, pn.designacao, nf(pn.largura), nf(pn.comprimento), nf(pn.peso)]);
      }
      const blocosTela: BlocoTabela[] = telas.size ? [{
        titulo: 'RESUMO DAS TELAS', cols: [{ w: 34, rot: 'TELA' }, { w: 30, rot: 'PAINÉIS' }, { w: 36, rot: 'ÁREA (m²)' }, { w: 38, rot: 'PESO (kg)' }, { w: 40, rot: `PESO + ${nf(perdas, 0)} %` }],
        linhas: [...telas.entries()].map(([id, e]) => [id, String(e.n), nf(e.area), nf(e.peso), nf(e.peso * (1 + perdas / 100))]),
        rodape: ['Painéis de 2,45 × 6,00 m cortados no pano, com traspasse entre painéis; designação pela NBR 7481.'],
      }, { titulo: 'RELAÇÃO DAS TELAS', cols: [{ w: 56, rot: 'LAJE / PAINEL' }, { w: 28, rot: 'TELA' }, { w: 30, rot: 'LARG. (m)' }, { w: 32, rot: 'COMP. (m)' }, { w: 32, rot: 'PESO (kg)' }], linhas: relacao }] : [];
      // base não detalhada: só a indicação (φ c/ s ou a tela), fora do quantitativo
      const indicada = dets.filter((d) => d.base && !d.base.detalhada && ((fl.faces.includes('inf') && d.base.inf) || (fl.faces.includes('sup') && d.base.sup)))
        .map((d) => `${d.nome}: base ${[fl.faces.includes('inf') && d.base!.inf && `inferior ${d.base!.inf.nota.replace(/\./g, ',')}`, fl.faces.includes('sup') && d.base!.sup && `superior ${d.base!.sup.nota.replace(/\./g, ',')}`].filter(Boolean).join('; ')} (indicada, fora do quantitativo)`);
      // treliçadas: sentido das vigotas e posições listadas na laje
      for (const v of vigs) {
        const l = lajes.find((x) => x.id === v.laje);
        if (!l) continue;
        const pi = pontoInterno(l.contorno), f0 = v.faixas[0];
        const linhas: string[] = [];
        if (fl.faces.includes('inf') && f0) {
          const L = Math.hypot(f0.z[0] - f0.a[0], f0.z[1] - f0.a[1]) || 1, u: P = [(f0.z[0] - f0.a[0]) / L, (f0.z[1] - f0.a[1]) / L], a = Math.min(L, 6 * 0.35) / 2;
          const A: P = [pi[0] - u[0] * a, pi[1] - u[1] * a - 4 * k], Z: P = [pi[0] + u[0] * a, pi[1] + u[1] * a - 4 * k], s = 1.5 * k;
          const seta = (p: P, d: number): Prim => ({ t: 'pl', c: 'ARMADURA', pts: [[p[0] - d * u[0] * s - u[1] * s * 0.5, p[1] - d * u[1] * s + u[0] * s * 0.5], p, [p[0] - d * u[0] * s + u[1] * s * 0.5, p[1] - d * u[1] * s - u[0] * s * 0.5]] });
          modelo.push({ t: 'pl', c: 'ARMADURA', pts: [A, Z] }, seta(Z, 1), seta(A, -1));
          linhas.push(`${v.trelica} · ${v.vigotas} vigotas · intereixo ${cmInt(v.intereixo)}`);
        }
        for (const x of v.posicoes) {
          const face: Face = x.tipo === 'adicional' ? 'inf' : 'sup';
          if (!fl.faces.includes(face)) continue;
          const C = cmInt(x.comprimento), pos = reg.pos(`VG|${x.tipo}`, x.aco, x.phi, C, x.n * v.repeticoes);
          const rot = x.tipo === 'adicional' ? 'adicional' : x.tipo === 'negativa' ? 'negativos' : 'distribuição (capa)';
          linhas.push(`${qtd(v.repeticoes, x.n)} ${pos} ${phiTxt(x.phi)} C=${C} — ${rot}`);
        }
        linhas.forEach((s, i) => modelo.push({ t: 'txt', c: 'TEXTO', p: [pi[0], pi[1] - (7 + 3 * i) * k], h: 2 * k, s, ah: 'c', av: 'topo' }));
      }
      const aco = acoDaFolha(reg.tabela, perdas, concreto, forma);
      const nts = notas([
        'Medidas em cm; bitolas (φ) em mm. Barra representativa de cada posição com a linha de distribuição; pernas e ganchos rebatidos no plano.',
        `Concreto C${fck} (fck = ${fck} MPa); aço ${acoI} (inferior) e ${acoS} (superior).`,
        `Cobrimento nominal das lajes: ${String(b.norma.cobrimento.laje).replace('.', ',')} cm (CAA ${b.norma.caa}).`,
        `Quantidades por laje${pavs.length > 1 ? `; "${pavs.length}×n" = ${pavs.length} pavimentos × n barras` : ''}.`,
        ...indicada,
      ]);
      out.push(montarFolha({
        b, formato: pl.formato, tipo: 'lajes', titulo: `Armação das lajes — ${nomeG} — ${fl.rot.toLowerCase()}`, conteudo: `ARMAÇÃO DAS LAJES — ${nomeG.toUpperCase()} — ${fl.rot}`,
        escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo, desenho: [], tabelas: [nts, ...blocosTela, tabelaAco(aco.tabela), resumoAco(aco, fck)],
        legenda: `ESCALA 1:${pl.escala} · ${pavs.map((p) => p.nome).join(', ')}`, avisos: pl.avisos, modelo, janela: pl.janela, aco, elementos: [...dets.map((d) => d.nome), ...vigs.map((v) => v.nome)],
      }));
    }
  }
  return out;
}
