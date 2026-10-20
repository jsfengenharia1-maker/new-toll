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
  /** Redistribuição dos momentos negativos das vigas nos apoios internos (%; δ = 1 − valor/100). */
  redistribuicao: number;
  /** Momento positivo mínimo dos vãos das vigas: ℓ²·p/este valor (0 = desligado). */
  momentoMinPositivo: number;
  /** Momento negativo mínimo nos apoios das vigas: ℓ²·p/este valor (0 = desligado). */
  momentoMinNegativo: number;
  /** Cortante de cálculo das vigas junto aos pilares: 0 = toda a parte flexível; 1 = a partir da face do pilar (mais `cortanteDistancia`). */
  cortanteApoio: number;
  /** Distância da face do pilar à primeira seção de cortante das vigas, em % de d (com `cortanteApoio` = 1). */
  cortanteDistancia: number;
  /** 1 = verifica a torção das vigas (NBR 6118, 17.5); 0 = despreza a de compatibilidade (vigas de equilíbrio seguem verificadas). */
  verificarTorcao: number;
  /** Abertura de fissuras máxima (mm); 0 = pela classe de agressividade (Tabela 13.4). */
  limiteFissura: number;
  /** Deslocamento lateral do topo (vento, frequente): H / este valor. */
  limiteDeslocTopo: number;
  /** Deslocamento lateral entre pavimentos (vento, frequente): hi / este valor. */
  limiteDeslocPavimento: number;
  /** Comprimento máximo de barra (m); acima, emenda por traspasse. */
  barraMaxima: number;
  /** Arredondamento dos comprimentos de barras (cm, para cima). */
  arredondamento: number;
  /** Perdas de aço no resumo (%). */
  perdasAco: number;
  /** Bitola da armadura de montagem superior das vigas (mm), colaborante nos negativos. */
  bitolaMontagem: number;
  /** 1 = continuidade nos pilares: abaixo do penúltimo lance, nenhum lance com menos armadura nem bitola menor que o de cima. */
  continuidadePilares: number;
  /** Comprimento máximo de barra dos pilares (m). */
  pilarBarraMaxima: number;
  /** União de lances curtos dos pilares: barras corridas sem emenda até este comprimento (m), se a armadura for idêntica. */
  pilarUniaoLances: number;
  /** 1 = ancoragem no topo do último lance reduzida por As,calc/As,ef (9.4.2.5). */
  ancoragemReduzidaTopo: number;
  /** Lajes: comprimento mínimo dos negativos sobre bordas contínuas, de cada lado do eixo, em % do maior vão adjacente (0 = só o diagrama). */
  lajeNegativoVao: number;
  /** Lajes: negativa de borda sem continuidade até esta % do menor vão a partir da face (0 = sem). */
  lajeNegativoBorda: number;
  /** Lajes: decalagem do diagrama de momentos (× d). */
  lajeDecalagem: number;
  /** Lajes: menor bitola (mm). */
  lajeBitolaMinima: number;
  /** Lajes: menor espaçamento entre barras (cm). */
  lajeEspacamentoMinimo: number;
  /** Lajes: 1 = malha superior nos cantos entre bordas apoiadas sem continuidade. */
  lajeArmaduraCanto: number;
  /** Lajes: 1 = negativos com pernas (dobras até a face inferior) nas pontas dentro da laje. */
  lajePernasNegativos: number;
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
  /** Valor do perfil "Padrão NBR 6118" quando difere do padrão do sistema (critério de mercado). */
  padraoNBR?: number;
  /** Fonte do valor NBR. */
  fonteNBR?: string;
}

/** Perfil dos padrões: o do sistema (critério de mercado, programa de referência) ou o da NBR 6118. */
export type PerfilOpcoes = 'sistema' | 'nbr';
export const PERFIS: { v: PerfilOpcoes; rotulo: string }[] = [
  { v: 'sistema', rotulo: 'Padrão do sistema' },
  { v: 'nbr', rotulo: 'Padrão NBR 6118' },
];
export const perfilDe = (b: { perfilOpcoes?: 'nbr' }): PerfilOpcoes => b.perfilOpcoes ?? 'sistema';
/** Padrão de uma opção no perfil. */
export const padraoDe = (o: OpcaoInfo, perfil: PerfilOpcoes = 'sistema') => (perfil === 'nbr' ? o.padraoNBR ?? o.padrao : o.padrao);

export const OPCOES_INFO: OpcaoInfo[] = [
  { chave: 'malha', rotulo: 'Malha da grelha das lajes', unidade: 'm', min: 0.1, max: 1, passo: 0.05, padrao: 0.25, fonte: 'NBR 6118 não fixa; malha máxima de 25 cm do programa de referência', aConfirmar: true,
    descricao: 'Espaçamento máximo das barras da grelha das lajes. Malha menor dá esforços mais precisos e cálculo mais lento.' },
  { chave: 'torcaoViga', rotulo: 'Rigidez à torção das vigas', min: 0, max: 1, passo: 0.05, padrao: 0.15, fonte: 'NBR 6118, 14.6.7.2 (torção de compatibilidade: 15 % da rigidez elástica; item a confirmar)', aConfirmar: true,
    descricao: 'Fator sobre GJ da seção bruta das vigas, na grelha e no pórtico.' },
  { chave: 'torcaoLaje', rotulo: 'Rigidez à torção das lajes', min: 0, max: 1, passo: 0.05, padrao: 0.15, fonte: 'Critério do app (mesmo redutor das vigas)', aConfirmar: true,
    descricao: 'Fator sobre J = 2I das barras de laje da grelha.' },
  { chave: 'torcaoPilar', rotulo: 'Rigidez à torção dos pilares', min: 0, max: 1, passo: 0.05, padrao: 1, fonte: 'NBR 6118 não fixa; seção bruta', aConfirmar: true,
    descricao: 'Fator sobre GJ da seção bruta dos pilares no pórtico.' },
  { chave: 'axialPilares', rotulo: 'Rigidez axial dos pilares (cargas verticais)', unidade: '× EA', min: 1, max: 99.99, passo: 0.5, padrao: 2, padraoNBR: 1, fonteNBR: 'NBR 6118 não prevê multiplicador: EA da seção bruta', fonte: 'NBR 6118 não fixa; padrão 2 (recomendado 2 a 3) do programa de referência', aConfirmar: true,
    descricao: 'Multiplica EA dos pilares nas ações verticais para simular o processo construtivo (encurtamento dos pilares compensado a cada pavimento). Não vale para vento nem γz.' },
  { chave: 'trechoRigido', rotulo: 'Trecho rígido da viga no pilar', unidade: '× h', min: 0, max: 0.5, passo: 0.05, padrao: 0.3, fonte: 'NBR 6118, 14.6.2.1 e Figura 14.7 (face do apoio menos 0,3h)', aConfirmar: false,
    descricao: 'O trecho da viga dentro do pilar é rígido até a face menos este fator × h da viga; 0 = rígido até a face.' },
  { chave: 'engasteTopoUltimo', rotulo: 'Engaste no topo do último lance', min: 0, max: 1, passo: 0.05, padrao: 0.3, padraoNBR: 1, fonteNBR: 'NBR 6118 não fixa: ligação monolítica (engaste pleno)', fonte: 'NBR 6118 não fixa; padrão 0,3 do programa de referência', aConfirmar: true,
    descricao: 'Ligação do topo do último lance de cada pilar com as vigas: 0 = rótula, 1 = engaste. Interpola as rigidezes engaste-engaste e engaste-rótula do lance.' },
  { chave: 'zonasIndependentes', rotulo: 'Zonas independentes como diafragmas separados', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Critério do programa de referência (cada zona ligada por vigas é um diafragma; pilar isolado, sem diafragma)', aConfirmar: true,
    descricao: 'Partes do pavimento sem vigas entre si (blocos separados por junta) têm diafragmas próprios, e o vento do pavimento é repartido entre elas pela largura de cada uma.' },
  { chave: 'limiteGamaZ', rotulo: 'Limite do γz', min: 1.1, max: 1.5, passo: 0.05, padrao: 1.3, fonte: 'NBR 6118, 15.5.3 e 15.7.2 (ampliação por 0,95·γz até 1,3)', aConfirmar: false,
    descricao: 'Entre 1,1 e o limite, as ações horizontais das ELU são ampliadas por 0,95·γz; acima do limite, aviso (exige análise de 2ª ordem mais rigorosa).' },
  { chave: 'woodArmer', rotulo: 'Lajes maciças: Wood-Armer com média em faixa de 1 m', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Wood (1968) e Armer (1968); faixa de 1 m do programa de referência', aConfirmar: true,
    descricao: 'Momentos de dimensionamento nos nós da grelha somando o momento volvente (mx* = mx + |mxy|), com média numa faixa transversal de 1 m. Sem a opção: extremos dos momentos nas pontas das barras.' },
  { chave: 't0Flecha', rotulo: 'Idade no carregamento (fluência)', unidade: 'meses', min: 0.25, max: 70, passo: 0.25, padrao: 1, fonte: 'NBR 6118, 17.3.2.1.2 (Tabela 17.1); padrão 1 mês confirmado no pórtico', aConfirmar: false,
    descricao: 'αf = Δξ = ξ(70) − ξ(t0), sem armadura de compressão (ρ′ = 0).' },
  { chave: 'fatorFlechaLaje', rotulo: 'Fator simplificado da flecha das lajes', unidade: '× elástica', min: 0, max: 5, passo: 0.1, padrao: 2.5, padraoNBR: 0, fonteNBR: 'NBR 6118, 17.3.2.1.2: elástica × (1 + αf)', fonte: 'Padrão 2,5 do programa de referência (faixa 2,5 a 3,0); 0 = método da NBR 6118, 17.3.2.1.2 (1 + αf)', aConfirmar: true,
    descricao: 'Flecha total = elástica relativa aos apoios × este fator. 0 usa o método da NBR (1 + αf), sem fissuração.' },
  { chave: 'limiteFlechaTotal', rotulo: 'Limite da flecha total (vão / …)', min: 100, max: 1000, passo: 10, padrao: 250, fonte: 'NBR 6118, Tabela 13.3 (aceitabilidade sensorial, visual)', aConfirmar: false,
    descricao: 'Lajes e vigas: flecha total (quase permanente com fluência) ≤ vão / este valor; balanço: 2 × vão.' },
  { chave: 'limiteFlechaSensorial', rotulo: 'Limite da flecha da carga variável (vão / …)', min: 100, max: 1000, passo: 10, padrao: 350, fonte: 'NBR 6118, Tabela 13.3 (vibrações sentidas no piso)', aConfirmar: false,
    descricao: 'Flecha imediata só das cargas variáveis ≤ vão / este valor.' },
  { chave: 'redistribuicao', rotulo: 'Redistribuição de negativos das vigas', unidade: '%', min: 0, max: 25, passo: 5, padrao: 15, padraoNBR: 0, fonteNBR: 'NBR 6118 permite (14.6.4.3), não exige: sem redistribuição', fonte: 'Padrão 15 % do programa de referência (vigas); limites da NBR 6118, 14.6.4.3 (δ ≥ 0,75 nós fixos, 0,90 nós móveis; δ ≥ 0,44 + 1,25·x/d)', aConfirmar: false,
    descricao: 'Reduz o momento negativo das cargas verticais nos apoios internos das vigas contínuas (δ = 1 − valor), depois dos momentos mínimos, e aumenta o positivo do vão por equilíbrio. O app respeita os limites de δ da norma (estrutura de nós móveis quando γz > 1,1) e diminui a redistribuição onde x/d não permite. 0 = desligada.' },
  { chave: 'momentoMinPositivo', rotulo: 'Momento positivo mínimo (p·ℓ² / …)', min: 0, max: 50, passo: 1, padrao: 0, fonte: 'Opção do programa de referência; a NBR não exige (0 = desligado)', aConfirmar: true,
    descricao: 'Momento positivo de cálculo de cada vão de viga ≥ p·ℓ²/este valor, com a carga equivalente p = (V1 + V2)/ℓ dos cortantes das cargas verticais nas pontas do vão. Recomendado pelo programa de referência: 20.' },
  { chave: 'momentoMinNegativo', rotulo: 'Momento negativo mínimo nos apoios (p·ℓ² / …)', min: 0, max: 50, passo: 1, padrao: 0, fonte: 'Opção do programa de referência; a NBR não exige (0 = desligado)', aConfirmar: true,
    descricao: 'Momento negativo de cálculo nas extremidades de vão sobre pilares ≥ p·ℓ²/este valor (p como no positivo), antes da redistribuição. Recomendado pelo programa de referência: 32.' },
  { chave: 'cortanteApoio', rotulo: 'Cortante das vigas a partir da face do pilar', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Critério do programa de referência (estribos a partir da face do apoio); NBR 6118, 17.4.1.2.1', aConfirmar: false,
    descricao: 'Ligada: o cortante de cálculo das vigas é o da face do pilar em diante (mais a distância abaixo). Desligada: maior cortante em toda a parte flexível (a favor da segurança).' },
  { chave: 'cortanteDistancia', rotulo: 'Distância da face à seção de cortante', unidade: '% de d', min: 0, max: 50, passo: 5, padrao: 0, fonte: 'Opção do programa de referência (% de d); NBR 6118, 17.4.1.2.1 permite até d/2 com carga distribuída e apoio direto', aConfirmar: false,
    descricao: 'Primeira seção de verificação do cortante a esta distância da face do pilar (50 % = d/2). Só vale com o cortante a partir da face.' },
  { chave: 'verificarTorcao', rotulo: 'Verificar torção das vigas', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 17.5 (treliça espacial, θ = 45°, biela conjunta com o cortante 17.7.2.2)', aConfirmar: false,
    descricao: 'Td do pórtico (com a rigidez à torção das opções) somado ao cortante nos estribos (A90/s) e na biela (Vsd/VRd2 + Tsd/TRd2 ≤ 1), mais a armadura longitudinal de torção. Desligada, só as vigas marcadas com torção de equilíbrio são verificadas.' },
  { chave: 'limiteFissura', rotulo: 'Abertura de fissuras máxima', unidade: 'mm', min: 0, max: 0.5, passo: 0.05, padrao: 0, fonte: 'NBR 6118, Tabela 13.4 (0 = pela CAA: I 0,4; II e III 0,3; IV 0,2 mm)', aConfirmar: false,
    descricao: 'wk das vigas na combinação frequente (17.3.3.2); onde passa, o app aumenta a armadura até atender.' },
  { chave: 'limiteDeslocTopo', rotulo: 'Deslocamento lateral do topo (H / …)', min: 500, max: 5000, passo: 100, padrao: 1700, fonte: 'NBR 6118, Tabela 13.3 (vento, combinação frequente ψ1 = 0,30)', aConfirmar: false,
    descricao: 'Maior deslocamento horizontal do topo dos pilares pelo vento na combinação frequente ≤ altura total / este valor.' },
  { chave: 'limiteDeslocPavimento', rotulo: 'Deslocamento lateral entre pavimentos (hi / …)', min: 200, max: 3000, passo: 50, padrao: 850, fonte: 'NBR 6118, Tabela 13.3 (vento, combinação frequente ψ1 = 0,30)', aConfirmar: false,
    descricao: 'Maior deslocamento horizontal relativo entre dois pavimentos de um mesmo pilar ≤ pé-direito / este valor.' },
  { chave: 'barraMaxima', rotulo: 'Comprimento máximo de barra', unidade: 'm', min: 6, max: 24, passo: 0.5, padrao: 12, fonte: 'Barra comercial de 12 m (padrão do programa de referência)', aConfirmar: false,
    descricao: 'Barras mais longas são divididas com emenda por traspasse (NBR 6118, 9.5.2): passantes inferiores sobre os apoios internos, montagem e pele no meio dos vãos.' },
  { chave: 'arredondamento', rotulo: 'Arredondamento dos comprimentos de barras', unidade: 'cm', min: 1, max: 10, passo: 1, padrao: 5, fonte: 'Padrão do programa de referência (múltiplo de 5 cm)', aConfirmar: false,
    descricao: 'Comprimentos de barras e estribos arredondados para cima neste múltiplo.' },
  { chave: 'perdasAco', rotulo: 'Perdas de aço no resumo', unidade: '%', min: 0, max: 30, passo: 1, padrao: 10, fonte: 'Padrão do programa de referência (10 %)', aConfirmar: false,
    descricao: 'Acréscimo sobre o peso do resumo de aço (pontas e cortes).' },
  { chave: 'bitolaMontagem', rotulo: 'Bitola da armadura de montagem das vigas', unidade: 'mm', min: 5, max: 12.5, passo: 0.5, padrao: 8, fonte: 'Prática de mercado (porta-estribos φ8), colaborante nos negativos', aConfirmar: true,
    descricao: '2 barras superiores corridas (porta-estribos), contadas na armadura negativa onde existem; limitadas à bitola dos negativos.' },
  { chave: 'continuidadePilares', rotulo: 'Continuidade da armadura dos pilares', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, padraoNBR: 0, fonteNBR: 'NBR 6118 não exige: cada lance pelos seus esforços', fonte: 'Padrão do programa de referência (taxa e bitola de canto a partir do penúltimo pavimento)', aConfirmar: false,
    descricao: 'Último e penúltimo lances pelos seus esforços; daí para baixo, cada lance com armadura e bitola de canto não menores que as do lance de cima.' },
  { chave: 'pilarBarraMaxima', rotulo: 'Comprimento máximo de barra dos pilares', unidade: 'm', min: 3, max: 12, passo: 0.5, padrao: 8, fonte: 'Padrão do programa de referência (8 m)', aConfirmar: false,
    descricao: 'Barra longitudinal de pilar mais longa que isto é emendada.' },
  { chave: 'pilarUniaoLances', rotulo: 'União de lances curtos dos pilares', unidade: 'm', min: 0, max: 8, passo: 0.5, padrao: 4, fonte: 'Padrão do programa de referência (4 m)', aConfirmar: false,
    descricao: 'Lances consecutivos com a mesma armadura têm barras corridas, sem emenda intermediária, enquanto o comprimento somado couber neste limite.' },
  { chave: 'ancoragemReduzidaTopo', rotulo: 'Ancoragem reduzida no topo do último lance', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 9.4.2.5 (lb,nec = α·lb·As,calc/As,ef); padrão do programa de referência: ligada no último pavimento', aConfirmar: false,
    descricao: 'No topo do último lance, a ancoragem das barras é reduzida pela utilização da seção (≥ lb,mín).' },
  { chave: 'lajeNegativoVao', rotulo: 'Lajes: comprimento mínimo dos negativos', unidade: '% do vão', min: 0, max: 50, passo: 1, padrao: 25, padraoNBR: 0, fonteNBR: 'NBR 6118 não fixa: só o diagrama decalado mais a ancoragem (9.4.2.5 e 19.4)', fonte: 'Prática usual brasileira (ℓ/4 do maior vão adjacente, de cada lado do eixo); o programa de referência também impõe porcentagens mínimas do vão', aConfirmar: true,
    descricao: 'Cada lado do negativo sobre uma borda contínua vai, a partir do eixo do apoio, até o maior entre esta % do maior vão adjacente (perpendicular à borda) e o ponto de momento nulo do diagrama da grelha + decalagem + ancoragem. 0 = só o diagrama.' },
  { chave: 'lajeNegativoBorda', rotulo: 'Lajes: negativa de borda sem continuidade', unidade: '% do menor vão', min: 0, max: 50, passo: 1, padrao: 15, fonte: 'NBR 6118, 19.3.3.2 (≥ 0,15 do menor vão a partir da face; ρs ≥ 0,67·ρmín, Tabela 19.1)', aConfirmar: false,
    descricao: 'Bordas apoiadas em viga sem laje vizinha recebem negativo de borda (área mínima ou a do momento da grelha junto à borda) até esta % do menor vão a partir da face, ancorado com gancho na viga. 0 = sem.' },
  { chave: 'lajeDecalagem', rotulo: 'Lajes: decalagem do diagrama de momentos', unidade: '× d', min: 0.5, max: 2, passo: 0.1, padrao: 1.5, fonte: 'NBR 6118, 19.4.1 (lajes sem armadura transversal: aℓ = 1,5d; item a confirmar)', aConfirmar: true,
    descricao: 'Deslocamento aℓ do diagrama no corte dos negativos das lajes.' },
  { chave: 'lajeBitolaMinima', rotulo: 'Lajes: bitola mínima', unidade: 'mm', min: 5, max: 10, passo: 0.1, padrao: 5, fonte: 'Prática de mercado (φ5 em CA-60; com CA-50, a menor é φ6,3)', aConfirmar: true,
    descricao: 'Menor bitola usada nas lajes (lista φ5, φ6,3, φ8, φ10, φ12,5 e φ16, com φ ≤ h/8 pela NBR 6118, 20.1). φ5 só com aço CA-60.' },
  { chave: 'lajeEspacamentoMinimo', rotulo: 'Lajes: espaçamento mínimo', unidade: 'cm', min: 5, max: 20, passo: 1, padrao: 10, fonte: 'Prática de mercado (concretagem e vibração); a NBR 6118, 20.1, fixa só o máximo (2h e 20 cm; 33 cm na secundária)', aConfirmar: true,
    descricao: 'Abaixo dele, a bitola sobe. Máximo: mín(2h; 20 cm) na armadura principal, 33 cm na secundária e na de distribuição.' },
  { chave: 'lajeArmaduraCanto', rotulo: 'Lajes: armadura superior de canto', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Prática usual (malha superior quadrada de lado ℓ/5 do menor vão, As = maior positiva); a NBR 6118 não detalha', aConfirmar: true,
    descricao: 'Nos cantos entre duas bordas apoiadas sem continuidade, malha superior nas duas direções para os momentos volventes.' },
  { chave: 'lajePernasNegativos', rotulo: 'Lajes: pernas nos negativos', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Prática construtiva (dobra até a face inferior para apoiar o negativo na fôrma); ganchos construtivos do programa de referência', aConfirmar: true,
    descricao: 'Pontas dos negativos dentro da laje dobradas até a face inferior (h − cobrimentos).' },
];

export const OPCOES_PADRAO_CALCULO: OpcoesCalculo = Object.fromEntries(OPCOES_INFO.map((o) => [o.chave, o.padrao])) as unknown as OpcoesCalculo;
export const OPCOES_PADRAO_NBR: OpcoesCalculo = Object.fromEntries(OPCOES_INFO.map((o) => [o.chave, padraoDe(o, 'nbr')])) as unknown as OpcoesCalculo;
/** Opções cujo padrão do sistema difere do da NBR 6118. */
export const OPCOES_DIFERENTES_NBR = OPCOES_INFO.filter((o) => o.padraoNBR !== undefined && o.padraoNBR !== o.padrao);

/** Opções em uso: padrão do perfil + o que o modelo alterou. */
export function opcoesEmUso(o?: Partial<OpcoesCalculo>, perfil: PerfilOpcoes = 'sistema'): OpcoesCalculo {
  return { ...(perfil === 'nbr' ? OPCOES_PADRAO_NBR : OPCOES_PADRAO_CALCULO), ...o };
}

/** Opções que diferem do padrão do perfil. */
export function opcoesAlteradas(o?: Partial<OpcoesCalculo>, perfil: PerfilOpcoes = 'sistema'): OpcaoInfo[] {
  return OPCOES_INFO.filter((i) => o?.[i.chave] !== undefined && o[i.chave] !== padraoDe(i, perfil));
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
