// Escadas (E4e, C8.54): relatório das escadas em três níveis: dados gerais (norma, materiais e critérios das escadas), dados comuns de cada
// escada (geometria e cargas) e, por lance, reações dos apoios, esforços em cada seção (faixas de cada trecho), armaduras e verificações.
// Núcleo puro: monta a estrutura a partir do modelo e do dimensionamento (cálculo da E4c e armadura da E4d) e a escreve em CSV; o HTML é
// montado pela interface (`src/app/edificio/RelatoriosUI.tsx`) com a mesma estrutura.
import type { Dimensionamento } from './dimensionamento';
import { escadasNoMemorial } from './escadas';
import { acoDe, cobrimentoLaje, concretoDe, gamas } from './materiais';
import { opcoesEmUso, perfilDe } from './opcoes';
import type { BuildingModel } from './types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const phiTxt = (p: number) => fmt(p, p % 1 ? 1 : 0);

export interface LinhaRelatorio { rotulo: string; valor: string; aConfirmar?: boolean }
export interface TabelaRelatorio { titulo: string; cabecalho: string[]; linhas: string[][] }
export interface RelatorioLance {
  lance: number;
  titulo: string;
  /** Geometria e cargas do lance. */
  dados: LinhaRelatorio[];
  reacoes: TabelaRelatorio;
  /** Esforços de cálculo em cada seção: faixa de cada trecho (momentos Wood-Armer em kN·m/m, cortante em kN/m). */
  esforcos: TabelaRelatorio;
  armaduras: TabelaRelatorio;
  verificacoes: LinhaRelatorio[];
  avisos: string[];
}
export interface RelatorioEscada { id: string; nome: string; comuns: LinhaRelatorio[]; lances: RelatorioLance[] }
export interface RelatorioEscadas {
  gerais: LinhaRelatorio[];
  escadas: RelatorioEscada[];
  /** Falta o cálculo ou a armadura (relatório incompleto). */
  avisos: string[];
}

/** Relatório das escadas. Sem escadas: vazio. Sem cálculo (`dim.escadas`), só os dados gerais, comuns e de geometria. */
export function relatorioEscadas(b: BuildingModel, dim?: Dimensionamento | null): RelatorioEscadas {
  const out: RelatorioEscadas = { gerais: [], escadas: [], avisos: [] };
  if (!b.escadas?.length) return out;
  const o = opcoesEmUso(b.opcoes, perfilDe(b)), gm = gamas(b), c = concretoDe(b, 'laje');
  const ai = acoDe(b, 'escadaInf'), as = acoDe(b, 'escadaSup'), cob = cobrimentoLaje(b);
  out.gerais.push(
    { rotulo: 'Norma', valor: 'ABNT NBR 6118 (concreto armado) e NBR 6120 (cargas); dimensionamento como laje maciça (17.2 e 19)', aConfirmar: true },
    { rotulo: 'Concreto', valor: `C${fmt(c.fck, 0)} (fck ${fmt(c.fck, 0)} MPa, Ecs ${fmt(c.Ecs, 0)} MPa); γc ${fmt(gm.c)}` },
    { rotulo: 'Aço', valor: `${ai.aco} (inferior) e ${as.aco} (superior); γs ${fmt(gm.s)}` },
    { rotulo: 'Cobrimento e classe de agressividade', valor: `${fmt(cob.inf * 100, 1)} cm (face inferior), ${fmt(cob.sup * 100, 1)} cm (superior); CAA ${b.norma.caa}` },
    { rotulo: 'Combinações', valor: `γg ${fmt(gm.g)} · γq ${fmt(gm.q)}: γg·G + γq·Q e γg·G` },
    { rotulo: 'Critérios das escadas', valor: `espessura = vão / ${fmt(o.escadaEspessuraDivisor, 0)}; malha da casca ≈ ${fmt(o.escadaMalha, 2)} m; distribuição ${fmt(o.escadaDistribuicao, 0)} % da principal`, aConfirmar: true },
  );
  if (!dim?.escadas?.length) out.avisos.push('Escadas ainda não calculadas: o relatório traz só os dados gerais, os dados comuns e a geometria. Calcule e dimensione o edifício.');
  else if (!dim.escadasArmadura?.length) out.avisos.push('Escadas sem armadura calculada: o relatório traz as reações e os esforços, sem as armaduras.');
  const mem = escadasNoMemorial(b);
  for (const e of b.escadas) {
    const nomeEsc = e.nome, linhas = mem.filter((l) => l.escada === nomeEsc);
    const comuns: LinhaRelatorio[] = linhas.filter((l) => l.secao === 'Dados comuns').map((l) => ({ rotulo: l.rotulo, valor: l.valor, ...(l.aConfirmar ? { aConfirmar: true } : {}) }));
    const nLances = new Set([...linhas.map((l) => /^Lance (\d+)/.exec(l.rotulo)?.[1]).filter(Boolean), ...(dim?.escadas ?? []).filter((x) => x.escada === nomeEsc).map((x) => String(x.lance))]);
    const lances: RelatorioLance[] = [];
    for (const n of [...nLances].map(Number).sort((a, z) => a - z)) {
      const calc = dim?.escadas?.find((x) => x.escada === nomeEsc && x.lance === n);
      const arm = dim?.escadasArmadura?.find((x) => x.nome === nomeEsc && x.lance === n);
      const dados: LinhaRelatorio[] = linhas.filter((l) => (l.secao === 'Tipos de lance' || l.secao === 'Geometria' || l.secao === 'Cargas') && new RegExp(`^Lance ${n}\\b`).test(l.rotulo))
        .map((l) => ({ rotulo: l.rotulo.replace(new RegExp(`^Lance ${n}:? ?`), '') || 'Tipo', valor: l.valor, ...(l.aConfirmar ? { aConfirmar: true } : {}) }));
      const reacoes: TabelaRelatorio = {
        titulo: 'Reações dos apoios', cabecalho: ['Apoio', 'Grupo', 'G (kN)', 'Q (kN)', 'G (kN/m)', 'Q (kN/m)'],
        linhas: (calc?.reacoes ?? []).map((r) => [r.rotulo, r.grupo ?? '—', fmt(r.G), fmt(r.Q), fmt(r.GporMetro), fmt(r.QporMetro)]),
      };
      const esforcos: TabelaRelatorio = {
        titulo: 'Esforços de cálculo em cada seção', cabecalho: ['Trecho', 'Seção (m)', 'M inf. x', 'M inf. y', 'M sup. x', 'M sup. y', 'V (kN/m)', 'As inf. x', 'As inf. y (cm²/m)'],
        linhas: (arm?.trechos ?? []).flatMap((t) => t.faixas.map((f) => [t.chave, `${fmt(f.u0)} a ${fmt(f.u1)}`, fmt(f.mInf[0], 1), fmt(f.mInf[1], 1), fmt(f.mSup[0], 1), fmt(f.mSup[1], 1), fmt(f.V, 1), fmt(f.AsInf[0]), fmt(f.AsInf[1])])),
      };
      if (!esforcos.linhas.length && calc) {
        esforcos.cabecalho = ['Grandeza', 'Valor'];
        esforcos.linhas = [['Mx máx. positivo (kN·m/m)', fmt(calc.momentos.MxPos)], ['Mx máx. negativo', fmt(calc.momentos.MxNeg)], ['My máx. positivo', fmt(calc.momentos.MyPos)], ['My máx. negativo', fmt(calc.momentos.MyNeg)], ['|Mxy| máx.', fmt(calc.momentos.Mxy)], ['Cortante máx. (kN/m)', fmt(calc.momentos.Qmax)]];
      }
      const armaduras: TabelaRelatorio = {
        titulo: 'Armaduras', cabecalho: ['Trecho', 'Pos.', 'Tipo', 'Face', 'Quant.', 'φ (mm)', 's (cm)', 'C (m)', 'As nec. (cm²/m)', 'As ef. (cm²/m)'],
        linhas: (arm?.trechos ?? []).flatMap((t) => t.barras.map((x) => [t.chave, x.pos, x.tipo, x.face === 'inf' ? 'inferior' : 'superior', String(x.n), phiTxt(x.phi), x.s > 0 ? fmt(x.s * 100, 0) : '—', fmt(x.comprimento), fmt(x.AsNec), fmt(x.AsEf)])),
      };
      const verificacoes: LinhaRelatorio[] = [];
      if (calc) {
        verificacoes.push({ rotulo: 'Espessura', valor: `${fmt(calc.espessuraCm, 1)} cm; ${calc.elementos} elementos de casca` });
        verificacoes.push({ rotulo: 'Deslocamento vertical máximo (elástico)', valor: `G ${fmt(calc.deslocamentoMm.G)} mm; Q ${fmt(calc.deslocamentoMm.Q)} mm` });
      }
      if (arm && !arm.erro) {
        for (const t of arm.trechos) verificacoes.push({ rotulo: `${t.chave}: cortante e fissuração`, valor: `VSd ${fmt(t.cortante.VSd, 1)} kN/m, VRd1 ${fmt(t.cortante.VRd1, 1)} kN/m${t.cortante.Asw > 0 ? `, armadura transversal ${fmt(t.cortante.Asw)} cm²/m²` : ''}${t.cortante.ok ? '' : ' (não atende)'}; wk ${fmt(t.wk)} mm (limite ${fmt(t.wkLim)} mm)` });
        verificacoes.push({ rotulo: 'Flecha', valor: `${fmt(arm.flecha.total, 1)} mm, limite ${fmt(arm.flecha.limite, 1)} mm: ${arm.flecha.ok ? 'atende' : 'não atende'}` });
        for (const l of arm.ligacoes) verificacoes.push({ rotulo: l.rotulo, valor: `${l.descricao}${l.ancoragem ? `; ancoragem ${l.ancoragem.tipo}, lb,nec ${fmt(l.ancoragem.lbNec * 100, 0)} cm, disponível ${fmt(l.ancoragem.disponivel * 100, 0)} cm` : ''}` });
        verificacoes.push({ rotulo: 'Peso de aço (sem perdas)', valor: `${fmt(arm.peso, 1)} kg` });
      }
      const avisos = [...(calc?.avisos ?? []), ...(arm?.mensagens ?? []), ...(arm?.erro ? [arm.erro] : []), ...(calc?.erro ? [calc.erro] : [])];
      lances.push({ lance: n, titulo: `Lance ${n}`, dados, reacoes, esforcos, armaduras, verificacoes, avisos });
    }
    out.escadas.push({ id: e.id, nome: nomeEsc, comuns, lances });
  }
  return out;
}

const aspas = (x: string) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);
/** CSV do relatório (separador ponto e vírgula, BOM para o Excel), com as seções na ordem do relatório. */
export function relatorioEscadasCsv(r: RelatorioEscadas): string {
  const lin: string[][] = [['Relatório das escadas'], [], ['DADOS GERAIS'], ...r.gerais.map((x) => [x.rotulo, x.valor])];
  for (const e of r.escadas) {
    lin.push([], [`ESCADA ${e.nome}`, 'DADOS COMUNS'], ...e.comuns.map((x) => [x.rotulo, x.valor]));
    for (const l of e.lances) {
      lin.push([], [`${e.nome} — ${l.titulo}`], ...l.dados.map((x) => [x.rotulo, x.valor]));
      for (const t of [l.reacoes, l.esforcos, l.armaduras]) if (t.linhas.length) lin.push([], [t.titulo], t.cabecalho, ...t.linhas);
      if (l.verificacoes.length) lin.push([], ['Verificações'], ...l.verificacoes.map((x) => [x.rotulo, x.valor]));
      for (const a of l.avisos) lin.push(['Aviso', a]);
    }
  }
  for (const a of r.avisos) lin.push([], ['Aviso', a]);
  return '﻿' + lin.map((l) => l.map(aspas).join(';')).join('\r\n') + '\r\n';
}
