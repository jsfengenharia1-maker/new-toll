// Prancha de detalhe das escadas (E4e, C8.55): por lance, corte longitudinal desenvolvido (concreto, barras, ancoragens e cotas dos
// trechos) e corte transversal (barras na seção do primeiro trecho inclinado); quadro de propriedades por lance (geometria, cargas,
// materiais) e quadros de aço por lance, por escada e total, mais a tabela de aço e o resumo da folha. Sigla de carimbo SCE e a
// representação dos cortes são "a confirmar" (não há folha de referência de escadas). Folhas pelos mesmos escritores (PDF, DXF, DWG, SVG).
import type { Dimensionamento } from '../building/dimensionamento';
import type { ResultadoArmaduraLance } from '../building/escadasArmadura';
import { desenhoArmaduraLance } from '../building/escadasArmaduraDesenho';
import { geometriaEscadas, type Escada, type LanceGeo } from '../building/escadas';
import { acoDe, fckDe } from '../building/materiais';
import type { BuildingModel } from '../building/types';
import { type P, type Prancha, type Prim } from './prancha';
import {
  Posicoes, Chaves, acoDaFolha, areaArmacao, bloco, capacidadeTabela, cfgArmacao, cmInt, cotaHorizontal, cotaVertical, empacotar, formatoArmacao, mover, nf, notas, perdasDe, phiTxt,
  montarFolha, resumoAco, tabelaAco, type Bloco, type BlocoTabela, type PosDe,
} from './armacao';
import { acharGrupo, type OpcoesArmacao } from './armacaoVigas';

const COB = 0.03; // cobrimento ao eixo da barra nos cortes (m), como no desenho da elevação da E4d

interface Item { escada: Escada; nomeGrupo: string; lance: LanceGeo; arm: ResultadoArmaduraLance }

/** Lances com armadura calculada, na ordem das escadas e da subida; `grupo` (id ou nome) restringe as escadas. */
function itensDasEscadas(b: BuildingModel, dim: Dimensionamento, grupo?: string): Item[] {
  const g = acharGrupo(b, grupo), out: Item[] = [];
  for (const ge of geometriaEscadas(b)) {
    if (g && ge.escada.grupo !== g) continue;
    for (const l of ge.lances) {
      const arm = dim.escadasArmadura?.find((x) => x.escada === ge.escada.id && x.lance === l.indice + 1);
      if (arm && !arm.erro) out.push({ escada: ge.escada, nomeGrupo: b.grupos.find((x) => x.id === ge.escada.grupo)?.nome ?? ge.escada.grupo, lance: l, arm });
    }
  }
  return out;
}

const chaveBarra = (x: ResultadoArmaduraLance['trechos'][number]['barras'][number]) => `E|${x.tipo}|${x.face}|${x.direcao}|${cmInt(x.ganchos[0])}|${cmInt(x.ganchos[1])}`;
const rotuloBarra = (n: number, p: string, x: ResultadoArmaduraLance['trechos'][number]['barras'][number]) => `${n} ${p} ${phiTxt(x.phi)}${x.s > 0 ? ` c/${cmInt(x.s)}` : ''} C=${cmInt(x.comprimento)}`;

/**
 * Bloco de um lance (mm, y para cima): corte longitudinal à esquerda e corte transversal à direita. `pos` numera as posições da folha
 * (a numeração real só vale na segunda passagem; na primeira só se medem as chaves para a paginação).
 */
function blocoLance(b: BuildingModel, it: Item, kE: number, kS: number, pos: PosDe): Prim[] {
  const out: Prim[] = [];
  const arm = it.arm, des = desenhoArmaduraLance(arm), h = arm.espessura;
  const acoI = acoDe(b, 'escadaInf').aco, acoS = acoDe(b, 'escadaSup').aco;
  const X = (x: number) => x * kE, Y = (z: number) => (z - des.zMin) * kE;
  const barras = arm.trechos.flatMap((t) => t.barras.map((x) => ({ t, x })));
  // concreto: faces superior e inferior da laje ao longo dos trechos (eixo ± h/2)
  const topo: P[] = [], fundo: P[] = [];
  for (const t of des.trechos) {
    topo.push([X(t.x0), Y(t.z0 + h / 2)], [X(t.x1), Y(t.z1 + h / 2)]);
    fundo.push([X(t.x0), Y(t.z0 - h / 2)], [X(t.x1), Y(t.z1 - h / 2)]);
  }
  if (topo.length) out.push({ t: 'pl', c: 'CONCRETO', pts: [...topo, ...fundo.reverse()], fechada: true });
  // barras: rótulos empilhados abaixo (inferiores) e acima (superiores), com linha de chamada até a barra
  const yAbaixo = Y(des.zMin) - 4, yAcima = Y(des.zMax) + 6;
  let nInf = 0, nSup = 0;
  barras.forEach(({ x }, i) => {
    const db = des.barras[i];
    if (!db) return;
    const cam = x.face === 'inf' ? 'ARMADURA' : 'ARMADURA-NEG', aco = x.face === 'inf' ? acoI : acoS, C = cmInt(x.comprimento);
    const p = pos(chaveBarra(x), aco, x.phi, C, x.n);
    const sentido = x.face === 'inf' ? 1 : -1; // gancho volta para dentro da laje
    let alvo: P;
    if (db.direcao === 'L') {
      const seg = db.elevacao[0].map(([u, z]) => [X(u), Y(z)] as P);
      out.push({ t: 'pl', c: cam, pts: seg });
      db.ganchos.forEach((g, ie) => { if (g) { const q = seg[ie]; out.push({ t: 'pl', c: cam, pts: [q, [q[0], q[1] + sentido * Math.max(0.6 * h, 0.08) * kE]] }); } });
      alvo = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2];
    } else {
      const r = Math.max(0.35, (x.phi / 2000) * kE);
      let primeiro: P | null = null;
      for (const s of db.elevacao) { const q: P = [X((s[0][0] + s[1][0]) / 2), Y((s[0][1] + s[1][1]) / 2)]; primeiro ??= q; out.push({ t: 'circ', c: cam, centro: q, r }); }
      alvo = primeiro ?? [0, 0];
    }
    const y = x.face === 'inf' ? yAbaixo - 3.2 * nInf++ : yAcima + 3.2 * nSup++;
    const xt = alvo[0];
    out.push({ t: 'pl', c: 'COTA', pts: [[xt, y + (x.face === 'inf' ? 2.4 : -0.6)], alvo] });
    out.push({ t: 'txt', c: 'TEXTO', p: [xt, y], h: 1.8, s: rotuloBarra(x.n, p, x), ah: 'e', av: 'base' });
  });
  // cotas dos trechos (comprimento horizontal, cm) e título
  const xs = des.trechos.length ? [X(des.trechos[0].x0), ...des.trechos.map((t) => X(t.x1))] : [];
  const yCota = yAcima + 3.2 * nSup + 4;
  out.push(...cotaHorizontal(yCota, xs, des.trechos.map((t) => String(cmInt(t.x1 - t.x0)))));
  const g = it.lance;
  out.push({ t: 'txt', c: 'TEXTO', p: [0, yCota + 9], h: 3, s: `ESCADA ${it.escada.nome} — LANCE ${g.indice + 1}`, ah: 'e', av: 'base' });
  out.push({ t: 'txt', c: 'TEXTO', p: [0, yCota + 5], h: 2, s: `CORTE LONGITUDINAL · piso +${nf(g.cotaPiso, 3)} m · chegada +${nf(g.cotaTopo, 3)} m · h = ${cmInt(h)} cm`, ah: 'e', av: 'base' });
  // marcação do corte A-A no primeiro trecho inclinado
  const tA = des.trechos.find((t) => t.tipo === 'lance') ?? des.trechos[0];
  if (tA) {
    const xa = X((tA.x0 + tA.x1) / 2), ya0 = Y(Math.min(tA.z0, tA.z1) - h) - 1.5, ya1 = Y(Math.max(tA.z0, tA.z1) + h) + 1.5;
    out.push({ t: 'pl', c: 'EIXO', pts: [[xa, ya0], [xa, ya1]] }, { t: 'txt', c: 'TEXTO', p: [xa, ya1 + 0.5], h: 2.2, s: 'A', ah: 'c', av: 'base' }, { t: 'txt', c: 'TEXTO', p: [xa, ya0 - 0.5], h: 2.2, s: 'A', ah: 'c', av: 'topo' });
  }
  // corte transversal A-A: seção do primeiro trecho inclinado (largura × espessura) com as barras
  const trA = arm.trechos.find((t) => t.tipo === 'lance') ?? arm.trechos[0];
  if (trA) {
    const x0 = X(des.largura) + 22, W = trA.largura * kS, H = h * kS;
    const sec: Prim[] = [{ t: 'pl', c: 'CONCRETO', pts: [[0, 0], [W, 0], [W, H], [0, H]], fechada: true }];
    let nI = 0, nS = 0;
    for (const x of trA.barras) {
      const db = des.barras.find((d) => d.trecho === trA.chave && d.pos === x.pos);
      const cam = x.face === 'inf' ? 'ARMADURA' : 'ARMADURA-NEG', aco = x.face === 'inf' ? acoI : acoS;
      const p = pos(chaveBarra(x), aco, x.phi, cmInt(x.comprimento), 0);
      const yb = x.face === 'inf' ? COB * kS : H - COB * kS;
      if (x.direcao === 'L' && db) {
        const r = Math.max(0.5, (x.phi / 2000) * kS);
        for (const s of db.planta) sec.push({ t: 'hach', c: cam, pts: Array.from({ length: 10 }, (_, k) => [s[0][1] * kS + r * Math.cos((k * Math.PI) / 5), yb + r * Math.sin((k * Math.PI) / 5)] as P) });
      } else if (x.direcao === 'T') {
        const yt = x.face === 'inf' ? (COB + 0.012) * kS : H - (COB + 0.012) * kS;
        sec.push({ t: 'pl', c: cam, pts: [[COB * kS, yt], [W - COB * kS, yt]] });
      }
      const y = x.face === 'inf' ? -4 - 3.2 * nI++ : H + 8 + 3.2 * nS++;
      sec.push({ t: 'txt', c: 'TEXTO', p: [0, y], h: 1.8, s: rotuloBarra(x.n, p, x), ah: 'e', av: 'base' });
    }
    sec.push(...cotaHorizontal(H + 4, [0, W], [String(cmInt(trA.largura))]), ...cotaVertical(W + 4, [0, H], [String(cmInt(h))]));
    sec.push({ t: 'txt', c: 'TEXTO', p: [0, H + 12 + 3.2 * nS], h: 2.4, s: `CORTE A-A · trecho ${trA.chave} · 1:${Math.round(1000 / kS)}`, ah: 'e', av: 'base' });
    out.push(...mover(sec, x0, Y(des.zMin) + (Y(des.zMax) - Y(des.zMin)) / 2 - H / 2));
  }
  return out;
}

const pesoDoLance = (a: ResultadoArmaduraLance) => a.peso;

/**
 * Pranchas de detalhe das escadas (C8.55). Lances com armadura calculada em `dim.escadasArmadura`; sem eles, nenhuma prancha.
 * Paginadas em prateleiras; cada folha leva a tabela de aço e o resumo dos lances que desenha, o quadro de propriedades e
 * os quadros de aço por lance, por escada e da obra.
 */
export function montarPranchasEscadas(b: BuildingModel, dim: Dimensionamento, o: OpcoesArmacao = {}): Prancha[] {
  const itens = itensDasEscadas(b, dim, o.grupo);
  if (!itens.length) return [];
  const cfg = cfgArmacao(b), perdas = perdasDe(b), fck = fckDe(b, 'laje');
  const acoI = acoDe(b, 'escadaInf').aco, acoS = acoDe(b, 'escadaSup').aco;
  const kE = 1000 / cfg.escalaEscadas, kS = 1000 / cfg.escalaSecao;
  const nts = notas([
    'Medidas em cm; bitolas (φ) em mm; cotas dos trechos na projeção horizontal. Cada posição é desenhada uma vez por lance, com a quantidade de barras do lance.',
    `Concreto C${nf(fck, 0)} (fck = ${nf(fck, 0)} MPa); aço ${acoI} (inferior) e ${acoS} (superior). Cobrimento nominal das lajes: ${nf(b.norma.cobrimento.laje, 1)} cm (CAA ${b.norma.caa}).`,
    'Os degraus (concretados com a laje) não são desenhados nos cortes; esperas, passadores e ancoragens estão nas posições da tabela. Sigla SCE e representação dos cortes: a confirmar.',
  ]);
  const blocos: Bloco[] = itens.map((it) => { const ch = new Chaves(); return bloco(blocoLance(b, it, kE, kS, (k, a, p, c) => ch.pos(k, a, p, c)), ch.s, `${it.escada.nome} lance ${it.lance.indice + 1}`); });
  const { formato, avisos } = formatoArmacao(cfg.formato, blocos);
  const area = areaArmacao(formato);
  const cap = capacidadeTabela(formato, 64, [nts], 12);
  const col = empacotar(blocos, area.x1 - area.x0, area.y1 - area.y0, cap);
  const nFolhas = Math.max(0, ...col.map((c) => c.folha)) + 1;
  const pesoEscada = new Map<string, number>();
  for (const it of itens) pesoEscada.set(it.escada.id, (pesoEscada.get(it.escada.id) ?? 0) + pesoDoLance(it.arm));
  const pesoTotal = [...pesoEscada.values()].reduce((s, v) => s + v, 0), fp = 1 + perdas / 100;
  const out: Prancha[] = [];
  for (let f = 0; f < nFolhas; f++) {
    const idx = col.map((c, i) => (c.folha === f ? i : -1)).filter((i) => i >= 0);
    const reg = new Posicoes(), desenho: Prim[] = [];
    let concreto = 0, forma = 0;
    const props: string[][] = [], acoLances: string[][] = [];
    for (const i of idx) {
      const it = itens[i], c = col[i], g = it.lance;
      desenho.push(...mover(bloco(blocoLance(b, it, kE, kS, (kk, ac, p, cc, q) => reg.pos(kk, ac, p, cc, q)), new Set(), '').prims, area.x0 + c.x, area.y1 - c.y));
      concreto += g.cargas.volumeConcreto; forma += g.trechos.reduce((s, t) => s + t.areaSuperficie, 0);
      props.push([it.escada.nome, String(g.indice + 1), String(cmInt(g.espessura.valor)), String(g.degraus.total), `${cmInt(it.escada.piso)}×${nf(it.escada.espelho * 100, 1)}`, nf(g.desnivel, 3), nf(it.escada.largura), nf(g.cargas.permanenteProjecao), nf(g.cargas.sobrecarga)]);
      acoLances.push([it.escada.nome, String(g.indice + 1), nf(pesoDoLance(it.arm), 1), nf(pesoDoLance(it.arm) * fp, 1)]);
    }
    const aco = acoDaFolha(reg.tabela, perdas, concreto, forma);
    const escadasDaFolha = [...new Set(idx.map((i) => itens[i].escada.id))];
    const tProps: BlocoTabela = {
      titulo: 'PROPRIEDADES DOS LANCES', cols: [{ w: 18, rot: 'ESCADA' }, { w: 14, rot: 'LANCE' }, { w: 16, rot: 'h (cm)' }, { w: 16, rot: 'DEGR.' }, { w: 26, rot: 'PISO×ESP (cm)' }, { w: 20, rot: 'DESN. (m)' }, { w: 20, rot: 'LARG. (m)' }, { w: 20, rot: 'G (kN/m²)' }, { w: 20, rot: 'Q (kN/m²)' }],
      linhas: props, rodape: [`G = permanente (peso próprio, degraus e revestimento) e Q = sobrecarga, por m² da projeção horizontal. Concreto C${nf(fck, 0)}; aço ${acoI}/${acoS}.`],
    };
    const tAco: BlocoTabela = {
      titulo: 'AÇO POR LANCE, POR ESCADA E TOTAL', cols: [{ w: 30, rot: 'ESCADA' }, { w: 24, rot: 'LANCE' }, { w: 50, rot: 'PESO (kg)' }, { w: 66, rot: `PESO + ${nf(perdas, 0)} % (kg)` }],
      linhas: acoLances,
      rodape: [...escadasDaFolha.map((id) => `ESCADA ${itens.find((x) => x.escada.id === id)!.escada.nome} (todos os lances): ${nf(pesoEscada.get(id)!, 1)} kg — com perdas ${nf(pesoEscada.get(id)! * fp, 1)} kg`),
        `TOTAL DAS ESCADAS DA OBRA: ${nf(pesoTotal, 1)} kg — com perdas ${nf(pesoTotal * fp, 1)} kg`],
    };
    const sufixo = nFolhas > 1 ? ` (${f + 1}/${nFolhas})` : '';
    out.push(montarFolha({
      b, formato, tipo: 'escadas', titulo: `Escadas — detalhamento${sufixo}`, conteudo: `DETALHAMENTO DAS ESCADAS${sufixo}`, escala: 'INDICADA', escalaNum: cfg.escalaEscadas, carimbo: o.carimbo,
      desenho, tabelas: [nts, tProps, tAco, tabelaAco(aco.tabela), resumoAco(aco, fck)],
      legenda: `Cortes longitudinais 1:${cfg.escalaEscadas} · cortes transversais 1:${cfg.escalaSecao}`, avisos: f === 0 ? avisos : [], aco, elementos: idx.map((i) => `${itens[i].escada.nome} L${itens[i].lance.indice + 1}`),
    }));
  }
  return out;
}
