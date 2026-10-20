// Opções de cálculo do edifício (frente N1a): padrão configurado pela NBR 6118 e, onde a norma não
// fixa valor, pelo critério de referência de mercado (CYPECAD), marcado "a confirmar". Todas editáveis
// pelo comando `opcoes.definir`; o memorial lista os valores em uso e destaca o que difere do padrão.

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
