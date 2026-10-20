// Opções de cálculo do edifício (frente N1a): padrão configurado pela NBR 6118 e, onde a norma não
// fixa valor, pelo critério de referência de mercado (CYPECAD), marcado "a confirmar". Todas editáveis
// pelo comando `opcoes.definir`; o memorial lista os valores em uso e destaca o que difere do padrão.
import type { BuildingModel } from './types';

export interface OpcoesCalculo {
  /** Espaçamento máximo da malha da grelha das lajes (m). */
  malha: number;
  /** Fator sobre a rigidez à torção elástica das vigas. */
  torcaoViga: number;
  /** Fator sobre J = 2I das barras de laje. */
  torcaoLaje: number;
  /** Fator sobre a rigidez à torção dos pilares. */
  torcaoPilar: number;
  /** Multiplicador da rigidez axial dos pilares nas ações verticais (processo construtivo). */
  axialPilares: number;
  /** Trecho rígido da viga no pilar: até a face menos este fator × h (0 = até a face). */
  trechoRigido: number;
  /** Coeficiente de engaste no topo do último lance de cada pilar (0 = rótula, 1 = engaste). */
  engasteTopoUltimo: number;
  /** 1 = zonas independentes do pavimento como diafragmas separados; 0 = um diafragma por pavimento. */
  zonasIndependentes: number;
  /** Limite do γz para a ampliação por 0,95·γz (acima dele, aviso). */
  limiteGamaZ: number;
  /** 1 = momentos das lajes maciças por Wood-Armer (com o torçor) e média em faixa de 1 m; 0 = extremos das barras. */
  woodArmer: number;
  /** Idade no carregamento (meses) para a fluência: αf = Δξ(t0) (NBR 6118, 17.3.2.1.2). */
  t0Flecha: number;
  /** Fator simplificado da flecha total das lajes (× elástica); 0 = método da NBR (1 + αf). */
  fatorFlechaLaje: number;
  /** Limite da flecha total: vão / este valor (NBR 6118, Tabela 13.3: aceitabilidade visual ℓ/250). */
  limiteFlechaTotal: number;
  /** Limite da flecha imediata da carga variável: vão / este valor (vibrações sentidas, ℓ/350). */
  limiteFlechaSensorial: number;
}

export interface OpcaoInfo {
  chave: keyof OpcoesCalculo;
  rotulo: string;
  unidade?: string;
  min: number;
  max: number;
  passo: number;
  padrao: number;
  fonte: string;
  aConfirmar: boolean;
  descricao: string;
  /** Opção sim/não (0 ou 1). */
  booleana?: boolean;
}

export const OPCOES_INFO: OpcaoInfo[] = [
  { chave: 'malha', rotulo: 'Malha da grelha das lajes', unidade: 'm', min: 0.1, max: 1, passo: 0.05, padrao: 0.25, fonte: 'NBR 6118 não fixa; malha máxima de 25 cm do programa de referência', aConfirmar: true,
    descricao: 'Espaçamento máximo das barras da grelha das lajes. Malha menor dá esforços mais precisos e cálculo mais lento.' },
  { chave: 'torcaoViga', rotulo: 'Rigidez à torção das vigas', min: 0, max: 1, passo: 0.05, padrao: 0.15, fonte: 'NBR 6118, 14.6.7.2 (torção de compatibilidade: 15 % da rigidez elástica; item a confirmar)', aConfirmar: true,
    descricao: 'Fator sobre GJ da seção bruta das vigas, na grelha e no pórtico.' },
  { chave: 'torcaoLaje', rotulo: 'Rigidez à torção das lajes', min: 0, max: 1, passo: 0.05, padrao: 0.15, fonte: 'Critério do app (mesmo redutor das vigas)', aConfirmar: true,
    descricao: 'Fator sobre J = 2I das barras de laje da grelha.' },
  { chave: 'torcaoPilar', rotulo: 'Rigidez à torção dos pilares', min: 0, max: 1, passo: 0.05, padrao: 1, fonte: 'NBR 6118 não fixa; seção bruta', aConfirmar: true,
    descricao: 'Fator sobre GJ da seção bruta dos pilares no pórtico.' },
  { chave: 'axialPilares', rotulo: 'Rigidez axial dos pilares (cargas verticais)', unidade: '× EA', min: 1, max: 99.99, passo: 0.5, padrao: 2, fonte: 'NBR 6118 não fixa; padrão 2 (recomendado 2 a 3) do programa de referência', aConfirmar: true,
    descricao: 'Multiplica EA dos pilares nas ações verticais para simular o processo construtivo (encurtamento dos pilares compensado a cada pavimento). Não vale para vento nem γz.' },
  { chave: 'trechoRigido', rotulo: 'Trecho rígido da viga no pilar', unidade: '× h', min: 0, max: 0.5, passo: 0.05, padrao: 0.3, fonte: 'NBR 6118, 14.6.2.1 e Figura 14.7 (face do apoio menos 0,3h)', aConfirmar: false,
    descricao: 'O trecho da viga dentro do pilar é rígido até a face menos este fator × h da viga; 0 = rígido até a face.' },
  { chave: 'engasteTopoUltimo', rotulo: 'Engaste no topo do último lance', min: 0, max: 1, passo: 0.05, padrao: 0.3, fonte: 'NBR 6118 não fixa; padrão 0,3 do programa de referência', aConfirmar: true,
    descricao: 'Ligação do topo do último lance de cada pilar com as vigas: 0 = rótula, 1 = engaste. Interpola as rigidezes engaste-engaste e engaste-rótula do lance.' },
  { chave: 'zonasIndependentes', rotulo: 'Zonas independentes como diafragmas separados', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Critério do programa de referência (cada zona ligada por vigas é um diafragma; pilar isolado, sem diafragma)', aConfirmar: true,
    descricao: 'Partes do pavimento sem vigas entre si (blocos separados por junta) têm diafragmas próprios, e o vento do pavimento é repartido entre elas pela largura de cada uma.' },
  { chave: 'limiteGamaZ', rotulo: 'Limite do γz', min: 1.1, max: 1.5, passo: 0.05, padrao: 1.3, fonte: 'NBR 6118, 15.5.3 e 15.7.2 (ampliação por 0,95·γz até 1,3)', aConfirmar: false,
    descricao: 'Entre 1,1 e o limite, as ações horizontais das ELU são ampliadas por 0,95·γz; acima do limite, aviso (exige análise de 2ª ordem mais rigorosa).' },
  { chave: 'woodArmer', rotulo: 'Lajes maciças: Wood-Armer com média em faixa de 1 m', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Wood (1968) e Armer (1968); faixa de 1 m do programa de referência', aConfirmar: true,
    descricao: 'Momentos de dimensionamento nos nós da grelha somando o momento volvente (mx* = mx + |mxy|), com média numa faixa transversal de 1 m. Sem a opção: extremos dos momentos nas pontas das barras.' },
  { chave: 't0Flecha', rotulo: 'Idade no carregamento (fluência)', unidade: 'meses', min: 0.25, max: 70, passo: 0.25, padrao: 1, fonte: 'NBR 6118, 17.3.2.1.2 (Tabela 17.1); padrão 1 mês confirmado no pórtico', aConfirmar: false,
    descricao: 'αf = Δξ = ξ(70) − ξ(t0), sem armadura de compressão (ρ′ = 0).' },
  { chave: 'fatorFlechaLaje', rotulo: 'Fator simplificado da flecha das lajes', unidade: '× elástica', min: 0, max: 5, passo: 0.1, padrao: 0, fonte: 'Opção do programa de referência (padrão dele 2,5); 0 = NBR 6118, 17.3.2.1.2', aConfirmar: true,
    descricao: 'Flecha total = elástica relativa aos apoios × este fator. 0 usa o método da NBR (1 + αf), sem fissuração.' },
  { chave: 'limiteFlechaTotal', rotulo: 'Limite da flecha total (vão / …)', min: 100, max: 1000, passo: 10, padrao: 250, fonte: 'NBR 6118, Tabela 13.3 (aceitabilidade sensorial, visual)', aConfirmar: false,
    descricao: 'Lajes e vigas: flecha total (quase permanente com fluência) ≤ vão / este valor; balanço: 2 × vão.' },
  { chave: 'limiteFlechaSensorial', rotulo: 'Limite da flecha da carga variável (vão / …)', min: 100, max: 1000, passo: 10, padrao: 350, fonte: 'NBR 6118, Tabela 13.3 (vibrações sentidas no piso)', aConfirmar: false,
    descricao: 'Flecha imediata só das cargas variáveis ≤ vão / este valor.' },
];

export const OPCOES_PADRAO_CALCULO: OpcoesCalculo = Object.fromEntries(OPCOES_INFO.map((o) => [o.chave, o.padrao])) as unknown as OpcoesCalculo;

/** Opções em uso: padrão + o que o modelo alterou. */
export function opcoesEmUso(o?: Partial<OpcoesCalculo>): OpcoesCalculo {
  return { ...OPCOES_PADRAO_CALCULO, ...o };
}

/** Opções que diferem do padrão. */
export function opcoesAlteradas(o?: Partial<OpcoesCalculo>): OpcaoInfo[] {
  return OPCOES_INFO.filter((i) => o?.[i.chave] !== undefined && o[i.chave] !== i.padrao);
}

/** Texto dos vínculos por elemento que diferem do padrão (engaste pleno), para o memorial. */
export function vinculosAlterados(b: BuildingModel): string[] {
  const f = (v: number) => String(+v.toFixed(3)).replace('.', ',');
  const pav = (id: string) => b.pavimentos.find((p) => p.id === id)?.nome ?? id;
  const pil = (id: string) => b.pilares.find((p) => p.id === id)?.nome ?? id;
  const out: string[] = [];
  for (const p of b.pilares) for (const e of p.engastes ?? []) {
    const partes = [e.topo !== undefined && `topo ${f(e.topo)}`, e.base !== undefined && `base ${f(e.base)}`].filter(Boolean);
    if (partes.length) out.push(`Pilar ${p.nome}, lance até ${pav(e.pavimento)}: engaste ${partes.join(', ')}.`);
  }
  for (const v of b.vigas) {
    const partes = [
      (v.engasteIni !== undefined || v.vinculoIni === 'articulado') && `início ${f(v.engasteIni ?? 0)}`,
      (v.engasteFim !== undefined || v.vinculoFim === 'articulado') && `fim ${f(v.engasteFim ?? 0)}`,
      v.articulacoes?.length && `rótula sobre ${v.articulacoes.map(pil).join(', ')}`,
      v.engasteLajes !== undefined && `lajes apoiadas ${f(v.engasteLajes)}`,
      v.torcaoEquilibrio && 'torção de equilíbrio (seção bruta)',
      v.foraDiafragma && 'fora do diafragma',
    ].filter(Boolean);
    if (partes.length) out.push(`Viga ${v.nome}: ${partes.join('; ')}.`);
  }
  for (const l of b.lajes) if (l.engasteBordas?.some((a) => a !== 1)) out.push(`Laje ${l.nome}: engaste das bordas ${l.contorno.map((_, k) => f(l.engasteBordas?.[k] ?? 1)).join(' / ')} (a partir do primeiro vértice).`);
  return out;
}
