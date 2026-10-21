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
import { acoDe, cobrimentoLaje, fckDe } from '../building/materiais';
import { contornoPilar, geometriaViga, lancesDoPilar, pavimentosDoGrupo, secaoNoLance, type BuildingModel } from '../building/types';
import { areaPoligono } from '../geom/faces';
import { pontoInterno } from '../geom/faces';
import { caixa, type P, type Prancha, type Prim } from './prancha';
import { Posicoes, acoDaFolha, cfgArmacao, cmInt, montarFolha, notas, perdasDe, phiTxt, plantaNaFolha, qtd, resumoAco, tabelaAco } from './armacao';
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
      // armadura de punção (N2d): estribos ou conectores em linhas radiais, entre as armaduras superior e inferior
      // (desenhada na folha das negativas; quantidades por pavimento do grupo)
      const punc = fl.faces.includes('sup') ? (dim.puncao ?? []).filter((r) => r.pavimentoId === ref?.id && (r.armadura || r.manual.length)) : [];
      const acoP = acoDe(b, 'lajePuncao').aco;
      for (const r of punc) {
        const rep = (dim.puncao ?? []).filter((x) => x.pilar === r.pilar && x.laje === r.laje && pavs.some((pv) => pv.id === x.pavimentoId)).length || 1;
        const l = lajes.find((x) => x.id === r.laje), cob = cobrimentoLaje(b, l?.cobrimento), alt = r.h - cob.inf - cob.sup;
        const nomeP = b.pilares.find((x) => x.id === r.pilar)?.nome ?? r.nome;
        const linhasTxt: string[] = [];
        if (r.armadura) {
          const a = r.armadura, ganchos = a.tipo === 'estribo' ? 2 * Math.max(0.05, 0.008 * a.phi) : 2 * 1.5 * a.phi / 1000;
          const C = cmInt(a.tipo === 'estribo' ? 2 * alt + ganchos : alt + ganchos), n = a.total * rep;
          const pos = reg.pos(`PUN|${a.tipo}`, acoP, a.phi, C, n);
          for (const linha of a.posicoes) {
            if (linha.length > 1) modelo.push({ t: 'pl', c: 'ARMADURA-NEG', pts: linha });
            for (const q of linha) modelo.push({ t: 'circ', c: 'ARMADURA-NEG', centro: q, r: 0.9 * k });
          }
          linhasTxt.push(`${qtd(rep, a.total)} ${pos} ${phiTxt(a.phi)} C=${C} — ${a.tipo === 'estribo' ? 'estribos' : 'conectores'} de punção, ${a.linhas} linhas × ${a.barras}, 1ª a ${cmInt(a.s0)} cm, c/${cmInt(a.sr)}`);
        }
        for (const g2 of r.manual) {
          const C = cmInt(2 * alt + 2 * Math.max(0.05, 0.008 * g2.phi)), pos = reg.pos(`PUNM|${g2.id}`, acoP, g2.phi, C, g2.linhas * g2.barras * rep);
          linhasTxt.push(`${qtd(rep, g2.linhas * g2.barras)} ${pos} ${phiTxt(g2.phi)} C=${C} — punção informada, ${g2.linhas} linhas × ${g2.barras}, c/${cmInt(g2.s)} cm`);
        }
        const topo = Math.max(...r.contornos.flatMap((c) => c.pontos.flat().map((q) => q[1])), r.centro[1]);
        modelo.push({ t: 'txt', c: 'TEXTO', p: [r.centro[0], topo + 1.5 * k], h: 2 * k, s: `${nomeP}: armadura de punção`, ah: 'c', av: 'base' });
        linhasTxt.forEach((s2, i) => modelo.push({ t: 'txt', c: 'TEXTO', p: [r.centro[0], topo - (1 + 2.6 * i) * k], h: 1.8 * k, s: s2, ah: 'c', av: 'topo' }));
      }
      // grupos informados em pontos livres (sem pilar): marca no ponto e quantidade na tabela de aço
      const livres = fl.faces.includes('sup') ? lajes.flatMap((l) => (l.puncao ?? []).filter((g2) => !g2.pilar && g2.ponto).map((g2) => ({ l, g2 }))) : [];
      for (const { l, g2 } of livres) {
        const alt = (l.tipo.tipo === 'macica' ? l.tipo.h : 0.1) - cobrimentoLaje(b, l.cobrimento).inf - cobrimentoLaje(b, l.cobrimento).sup;
        const C = cmInt(2 * alt + 2 * Math.max(0.05, 0.008 * g2.phi)), pos = reg.pos(`PUNM|${g2.id}`, acoP, g2.phi, C, g2.linhas * g2.barras * pavs.length);
        modelo.push({ t: 'circ', c: 'ARMADURA-NEG', centro: g2.ponto!, r: 1.5 * k });
        modelo.push({ t: 'txt', c: 'TEXTO', p: [g2.ponto![0], g2.ponto![1] - 2.5 * k], h: 1.8 * k, s: `${qtd(pavs.length, g2.linhas * g2.barras)} ${pos} ${phiTxt(g2.phi)} C=${C} — punção informada, ${g2.linhas} linhas × ${g2.barras}, c/${cmInt(g2.s ?? 0.15)} cm`, ah: 'c', av: 'topo' });
      }
      const aco = acoDaFolha(reg.tabela, perdas, concreto, forma);
      const nts = notas([
        'Medidas em cm; bitolas (φ) em mm. Barra representativa de cada posição com a linha de distribuição; pernas e ganchos rebatidos no plano.',
        `Concreto C${fck} (fck = ${fck} MPa); aço ${acoI} (inferior) e ${acoS} (superior).`,
        `Cobrimento nominal das lajes: ${String(b.norma.cobrimento.laje).replace('.', ',')} cm (CAA ${b.norma.caa}).`,
        ...(punc.length || livres.length ? ['Armadura de punção: estribos (grampos verticais) ou conectores entre as armaduras superior e inferior, em linhas radiais a partir do pilar; primeira barra a no máximo 0,5d da face e entre barras no máximo 0,75d (NBR 6118, 19.5.3) [a confirmar].'] : []),
        `Quantidades por laje${pavs.length > 1 ? `; "${pavs.length}×n" = ${pavs.length} pavimentos × n barras` : ''}.`,
      ]);
      out.push(montarFolha({
        b, formato: pl.formato, tipo: 'lajes', titulo: `Armação das lajes — ${nomeG} — ${fl.rot.toLowerCase()}`, conteudo: `ARMAÇÃO DAS LAJES — ${nomeG.toUpperCase()} — ${fl.rot}`,
        escala: `1:${pl.escala}`, escalaNum: pl.escala, carimbo: o.carimbo, desenho: [], tabelas: [nts, tabelaAco(aco.tabela), resumoAco(aco, fck)],
        legenda: `ESCALA 1:${pl.escala} · ${pavs.map((p) => p.nome).join(', ')}`, avisos: pl.avisos, modelo, janela: pl.janela, aco, elementos: [...dets.map((d) => d.nome), ...vigs.map((v) => v.nome)],
      }));
    }
  }
  return out;
}
