// Escadas (E4c): resumo do cálculo por lance (ferramenta `dimensionar` do MCP e da linha de comando) e linhas do capítulo
// "Escadas" do memorial. A armadura entra com a E4d. Núcleo puro.
import { concretoDe, gamas } from './materiais';
import { opcoesEmUso, perfilDe } from './opcoes';
import type { CasoEscada, ResultadoEscadas, ResultadoLance } from './escadasCalculo';
import type { BuildingModel } from './types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const r3 = (v: number) => +v.toFixed(3);

export interface ResumoLanceCalculo {
  escada: string; lance: number; pavimento?: string; pavimentoTopo?: string;
  espessuraCm: number; elementos: number; malha: number;
  /** Reações por apoio: totais (kN) e cargas lineares transmitidas (kN/m) em G e Q, e o grupo que as recebe. */
  reacoes: { apoio: string; rotulo: string; grupo?: string; G: number; Q: number; GporMetro: number; QporMetro: number }[];
  /** Momentos de cálculo (γg·G + γq·Q, kN·m/m) e cortante máximo (kN/m). */
  momentos: ResultadoLance['momentos'];
  /** Maior deslocamento vertical (mm) em G e Q. */
  deslocamentoMm: Record<CasoEscada, number>;
  avisos: string[];
  erro?: string;
}

/** Resumo do cálculo por lance. */
export function resumoCalculoEscadas(res: ResultadoEscadas): ResumoLanceCalculo[] {
  return res.lances.map((l) => ({
    escada: l.nome, lance: l.lance, pavimento: l.pavimento, pavimentoTopo: l.pavimentoTopo, espessuraCm: +(l.espessura * 100).toFixed(1), elementos: l.elementos, malha: l.malha,
    reacoes: l.apoios.map((a) => ({ apoio: a.id, rotulo: a.rotulo, ...(a.grupo ? { grupo: a.grupo } : {}), G: r3(a.reacao.G), Q: r3(a.reacao.Q), GporMetro: r3(a.porMetro.G), QporMetro: r3(a.porMetro.Q) })),
    momentos: { MxPos: r3(l.momentos.MxPos), MxNeg: r3(l.momentos.MxNeg), MyPos: r3(l.momentos.MyPos), MyNeg: r3(l.momentos.MyNeg), Mxy: r3(l.momentos.Mxy), Qmax: r3(l.momentos.Qmax) },
    deslocamentoMm: { G: r3(l.deslocamento.G * 1000), Q: r3(l.deslocamento.Q * 1000) },
    avisos: l.avisos, ...(l.erro ? { erro: l.erro } : {}),
  }));
}

export interface LinhaMemorialCalculoEscada { escada: string; lance?: number; secao: 'Modelo' | 'Apoios' | 'Reações' | 'Esforços e deslocamentos' | 'Avisos'; rotulo: string; valor: string; aConfirmar?: boolean }

/** Linhas do capítulo "Escadas" do memorial (cálculo): modelo, malha, apoios, reações, esforços e deslocamentos de cada lance. */
export function escadasCalculoNoMemorial(b: BuildingModel, res: ResultadoEscadas): LinhaMemorialCalculoEscada[] {
  const o = opcoesEmUso(b.opcoes, perfilDe(b)), gm = gamas(b), out: LinhaMemorialCalculoEscada[] = [];
  const nomePav = (id?: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id ?? '—';
  const nomeGrupo = (id?: string) => (id === 'fundacao' ? 'nível de fundação' : b.grupos.find((g) => g.id === id)?.nome ?? id ?? '—');
  const conc = concretoDe(b, 'laje');
  const nomes = [...new Set(res.lances.map((l) => l.nome))];
  for (const nome of nomes) {
    const add = (secao: LinhaMemorialCalculoEscada['secao'], rotulo: string, valor: string, aConfirmar?: boolean) => out.push({ escada: nome, secao, rotulo, valor, ...(aConfirmar ? { aConfirmar } : {}) });
    add('Modelo', 'Método', 'cálculo à parte, lance a lance, por elementos finitos de casca espessa (Mindlin, triângulos de 6 nós, 6 gdl por nó, giro no plano acoplado à rotação da membrana); só os casos gravitacionais G (peso próprio, degraus, revestimento e corrimão) e Q (sobrecarga); a escada fica fora da análise global (a influência das ações horizontais sobre ela é grande e fora da prática usual)', true);
    add('Modelo', 'Concreto', `igual ao das lajes (fck ${fmt(conc.fck, 0)} MPa, Ecs ${fmt(conc.Ecs, 0)} MPa), ν = 0,2; degraus concretados não somam rigidez`, true);
    add('Modelo', 'Cargas', 'por m² da projeção horizontal, como forças nodais verticais consistentes; corrimão em kN/m nas bordas laterais dos trechos inclinados (metade em cada borda); degraus iniciais sobre o piso viram carga de superfície', true);
    add('Modelo', 'Continuidade da laje', 'a laje de cada trecho começa na cota em que o trecho anterior termina: os degraus do patamar e o degrau de chegada não elevam a laje', true);
    add('Apoios', 'Bordas inferior e superior', `laje apoiada em viga de rigidez elevada: gdl vertical preso (limite da penalização × 10⁶); embaixo a translação horizontal no sentido da subida também; em cima ${o.escadaApoioFixoDois ? 'idem (dois apoios fixos)' : 'só a vertical (apoio simples; presa também quando as duas bordas estão na mesma abscissa, para equilibrar o momento)'}; giros livres`, true);
    add('Apoios', 'Patamar', `parede de alvenaria ou tirante: apoio elástico contínuo k = E·largura / altura (E da alvenaria ${fmt(o.escadaEAlvenaria, 0)} MPa; concreto = Ecs das lajes); conector de cisalhamento: apoio vertical rígido na borda; patamar livre: sem apoio`, true);
    add('Reações', 'Transmissão à estrutura', 'cargas lineares uniformes (reação ÷ comprimento da borda) nos casos permanente e variável, no grupo do elemento de apoio (viga, laje, parede, fundação); cargas de grupo valem para cada pavimento do grupo (maior valor entre os lances iguais); só as cargas verticais são aplicadas', true);
  }
  for (const l of res.lances) {
    const add = (secao: LinhaMemorialCalculoEscada['secao'], rotulo: string, valor: string, aConfirmar?: boolean) => out.push({ escada: l.nome, lance: l.lance, secao, rotulo, valor, ...(aConfirmar ? { aConfirmar } : {}) });
    const r = `Lance ${l.lance}`;
    add('Modelo', `${r}: malha`, `${l.elementos} elementos, ${l.nos} nós, ${l.gdl} equações; células de ≈ ${fmt(l.malha)} m (opção Escadas: malha); h = ${fmt(l.espessura * 100, 1)} cm; de ${nomePav(l.pavimento)} a ${nomePav(l.pavimentoTopo)}`, true);
    add('Modelo', `${r}: cargas aplicadas`, `G = ${fmt(l.carga.G)} kN, Q = ${fmt(l.carga.Q)} kN; equilíbrio vertical: erro relativo ${l.equilibrio.G.toExponential(1)} (G) e ${l.equilibrio.Q.toExponential(1)} (Q)`);
    for (const a of l.apoios) {
      add('Apoios', `${r}: ${a.rotulo}`, a.rigido ? 'apoio rígido' : `apoio elástico, k = ${fmt(a.kLinha ?? 0, 0)} kN/m por m`, !a.rigido);
      add('Reações', `${r}: ${a.rotulo}`, `G = ${fmt(a.reacao.G)} kN (${fmt(a.porMetro.G)} kN/m${a.pesoProprio ? `, com ${fmt(a.pesoProprio)} kN/m do peso da parede ou do tirante` : ''}); Q = ${fmt(a.reacao.Q)} kN (${fmt(a.porMetro.Q)} kN/m); sobre ${nomeGrupo(a.grupo)}${a.horizontal.G > 1e-6 ? `; reação horizontal G = ${fmt(a.horizontal.G)} kN (não transmitida)` : ''}`);
    }
    add('Esforços e deslocamentos', `${r}: momentos de cálculo (γg = ${fmt(gm.g)}, γq = ${fmt(gm.q)})`, `Mx +${fmt(l.momentos.MxPos)} / ${fmt(l.momentos.MxNeg)}; My +${fmt(l.momentos.MyPos)} / ${fmt(l.momentos.MyNeg)}; |Mxy| ${fmt(l.momentos.Mxy)} kN·m/m; Vmáx ${fmt(l.momentos.Qmax)} kN/m (x no sentido da subida, valores nos centroides dos elementos)`);
    add('Esforços e deslocamentos', `${r}: deslocamento vertical máximo`, `G ${fmt(l.deslocamento.G * 1000)} mm; Q ${fmt(l.deslocamento.Q * 1000)} mm (elástico, seção bruta; a flecha com fissuração e fluência fica para a verificação de serviço)`);
    for (const a of l.avisos) add('Avisos', r, a);
  }
  return out;
}
