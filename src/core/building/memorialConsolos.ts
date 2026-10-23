// Memorial dos consolos curtos, das vigas de vínculo externo e das vigas pré-moldadas (E2e): geometria, método, tirante, biela,
// estribos e ancoragem; vínculo e fator de rigidez; içamento e ficha do fabricante. Só texto e números.
import type { Dimensionamento } from './dimensionamento';
import { relatorioConsolo } from './consolos';
import { VINCULO_TXT } from './vinculoExterno';
import type { OpcoesCalculo } from './opcoes';
import type { BuildingModel } from './types';

export interface TabelaMemorialConsolos { id: 'consolos' | 'consolos-armadura' | 'vinculo-externo' | 'premoldadas'; titulo: string; colunas: string[]; linhas: string[][] }

const f = (v: number, c = 2) => (Number.isFinite(v) ? v.toFixed(c).replace('.', ',') : '—');
const ST = { ok: 'atende', fail: 'não atende' } as const;

export function memorialConsolos(b: BuildingModel, dim: Dimensionamento | null, op: Pick<OpcoesCalculo, 'vinculoExternoFatorEI' | 'premoldadaArticulada' | 'premoldadaIcamentoFracao' | 'premoldadaIcamentoDinamico' | 'consoloHMinimo' | 'consoloBraco' | 'consoloMu' | 'consoloCostura' | 'consoloTensaoApoio'>): { tabelas: TabelaMemorialConsolos[]; notas: string[]; relatorios: string[][] } {
  const tabelas: TabelaMemorialConsolos[] = [], notas: string[] = [], relatorios: string[][] = [];
  const cs = dim?.consolos ?? [];
  if (cs.length) {
    tabelas.push({
      id: 'consolos', titulo: 'Consolos curtos: geometria, esforços e verificações',
      colunas: ['Consolo', 'Pilar / viga', 'Tipo', 'b × h / ponta (cm)', 'a / d', 'Vd (kN)', 'Hd (kN)', 'Rst (kN)', 'As tirante (cm²)', 'Biela σ / limite (MPa)', 'Contato σ / limite (MPa)', 'Cortante Vd / VRd2 (kN)', 'Situação'],
      linhas: cs.map((r) => [r.nome, `${r.nomePilar} / ${r.nomeViga}`, r.tipo, `${f(r.b * 100, 0)} × ${f(r.h * 100, 0)} / ${f(r.hp * 100, 0)}`, f(r.ad), f(r.Vd, 1), f(r.Hd, 1), f(r.Rst, 1), f(r.As.calc * 1e4), r.biela ? `${f(r.biela.tensao, 1)} / ${f(r.biela.limite, 1)}` : '—', `${f(r.apoio.tensao, 1)} / ${f(r.apoio.limite, 1)}`, `${f(r.cortante.Vd, 0)} / ${f(r.cortante.VRd2, 0)}`, ST[r.status]]),
    }, {
      id: 'consolos-armadura', titulo: 'Armadura dos consolos',
      colunas: ['Consolo', 'Tirante', 'As ef. (cm²)', 'Estribos horizontais (costura)', 'Estribos verticais', 'Ancoragem necessária / disponível (cm)', 'Armadura'],
      linhas: cs.map((r) => [r.nome, `${r.arranjo.tirante.n}φ${r.arranjo.tirante.phi}`, f(r.As.ef * 1e4), `${r.arranjo.horizontais.n} fechados φ${r.arranjo.horizontais.phi} (${f(r.costura.ef * 1e4)} de ${f(r.costura.nec * 1e4)} cm²)`, `φ${r.arranjo.verticais.phi} c/${f(r.arranjo.verticais.s * 100, 0)}`, `${f(r.ancoragem.lbNec * 100, 0)} / ${f(r.ancoragem.disponivel * 100, 0)}`, r.bloqueada ? 'editada (bloqueada)' : 'calculada']),
    });
    for (const r of cs) relatorios.push(relatorioConsolo(r));
    notas.push(
      `Consolo curto = apoio da viga no pilar por aparelho de apoio (juntas de dilatação). Modelo de cálculo: apoio fixo no centro do aparelho, a e da face do pilar, ligado ao eixo do pilar por trecho rígido; a viga fica desligada da face (sem momento); chega ao pilar a vertical (com o momento V·e) e a horizontal mínima. Hd = máx(informada; ${f(op.consoloHMinimo, 2)}·Vd).`,
      `Dimensionamento (NBR 6118, 22.5, e NBR 9062 — texto não disponível, ver pendências): a/d < 0,5 muito curto, por atrito-cisalhamento (As = Vd/(μ·fyd) + Hd/fyd, μ = ${f(op.consoloMu, 2)}); 0,5 ≤ a/d ≤ 1 curto, por bielas e tirantes com z = ${f(op.consoloBraco, 2)}·d (Rst = Vd·a/z + Hd·(1 + (h − d)/z)), biela no nó sob o aparelho contra 0,72·αv2·fcd; a/d > 1 como viga em balanço. Contato sob o aparelho ≤ ${f(op.consoloTensaoApoio, 2)}·fcd; cortante ≤ VRd2 = 0,27·αv2·fcd·b·d; tirante mínimo 0,04·fcd/fyd·b·d; costura = ${f(op.consoloCostura, 2)}·As do tirante em estribos horizontais fechados; estribos verticais pelo mínimo (ρsw,mín). Premissa e2e-consolos a confirmar.`,
    );
  }
  const ve = b.vigas.filter((v) => v.vinculoExterno);
  if (ve.length) {
    tabelas.push({
      id: 'vinculo-externo', titulo: 'Vigas de vínculo externo (topo de muro)',
      colunas: ['Viga', 'Seção (cm)', 'Vínculo', 'Rigidez à flexão vertical'],
      linhas: ve.map((v) => [v.nome, `${f(v.secao.b * 100, 0)} × ${f(v.secao.h * 100, 0)}`, VINCULO_TXT[v.vinculoExterno!], `EI × ${f(op.vinculoExternoFatorEI, 0)} (plano e EA rígidos)`]),
    });
    notas.push('Viga de vínculo externo: apoios em todos os nós de discretização (a cada malha da grelha), EI bruto multiplicado pelo fator da tabela, plano horizontal e área rígidos (× 10⁶) e GJ reduzido como nas demais vigas; os graus de liberdade livres recebem rigidez de folga de 10⁴ kN/m ou kN·m/rad (sem efeito nos resultados). A viga simula o topo de um muro e não é dimensionada. Pilares coincidentes devem ser desligados no grupo para não travar o deslocamento vertical.');
  }
  const pm = dim?.premoldadas ?? [];
  if (pm.length) {
    tabelas.push({
      id: 'premoldadas', titulo: 'Vigas pré-moldadas e pré-fabricadas',
      colunas: ['Viga', 'Tipo', 'Ligações', 'Içamento: a (m), Msd− / MRd−, Msd+ / MRd+ (kN·m)', 'Ficha: Msd+ / MRd+, Msd− / MRd−, Vsd / VRd (kN·m, kN)', 'Situação'],
      linhas: pm.map((r) => [r.nome, r.tipo === 'armada' ? 'armada (NBR 9062)' : `ficha ${r.ficha?.ficha.nome ?? ''}`, r.ligacoes, r.icamento ? `${f(r.icamento.a)}; ${f(r.icamento.MsdNeg, 1)} / ${f(r.icamento.MRdNeg, 1)}; ${f(r.icamento.MsdPos, 1)} / ${f(r.icamento.MRdPos, 1)}` : '—', r.ficha ? `${f(r.ficha.MsdPos, 1)} / ${f(r.ficha.ficha.MRdPos, 1)}; ${f(r.ficha.MsdNeg, 1)} / ${f(r.ficha.ficha.MRdNeg ?? 0, 1)}; ${f(r.ficha.Vsd, 1)} / ${f(r.ficha.ficha.VRd, 1)}` : '—', ST[r.status]]),
    });
    notas.push(
      `Vigas pré-moldadas armadas: dimensionadas como as demais, com γc do controle pré-moldado (1,3), ligações ${op.premoldadaArticulada ? 'articuladas por padrão (engaste só quando informado)' : 'como as demais vigas'} e verificação de içamento: dois pontos a ${f(op.premoldadaIcamentoFracao, 2)}·ℓ das extremidades (ou o informado), peso próprio × ${f(op.premoldadaIcamentoDinamico, 2)} (coeficiente dinâmico) × 1,4, momento negativo nos pontos de içamento e positivo no meio do vão contra as armaduras adotadas.`,
      'Vigas pré-fabricadas (protendidas ou treliçadas) de ficha: rigidez EI, peso e resistências (MRd, VRd, TRd) informados pelo usuário a partir do catálogo do fabricante; só são verificadas contra a envoltória ELU, sem cálculo de armadura. Valores da NBR 9062 (coeficientes de içamento, ligações) a confirmar; ver pendências.',
    );
  }
  return { tabelas, notas, relatorios };
}
