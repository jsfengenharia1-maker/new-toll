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
  /** Detalhamento das vigas (R7b). */
  vigaReducaoLb: number;
  vigaNegativoVao: number;
  vigaReforcoVao: number;
  vigaSimetriaNegativos: number;
  vigaNegativosUnir: number;
  vigaMontagemContinua: number;
  vigaMontagemColaborante: number;
  vigaMontagemGancho: number;
  vigaMontagemEixo: number;
  vigaPernaGancho: number;
  vigaEstriboExtensao: number;
  vigaEstriboZonaMin: number;
  vigaEstriboSimetria: number;
  vigaFatorEmenda: number;
  vigaDesnivelLimite: number;
  /** 1 = continuidade nos pilares: abaixo do penúltimo lance, nenhum lance com menos armadura nem bitola menor que o de cima. */
  continuidadePilares: number;
  /** Pilares: tolerância (%) para preferir a disposição simétrica à de menor armadura; 0 = menor armadura (pode ser não simétrica); 1000 = sempre simétrica. */
  pilarSimetria: number;
  /** Comprimento máximo de barra dos pilares (m). */
  pilarBarraMaxima: number;
  /** União de lances curtos dos pilares: barras corridas sem emenda até este comprimento (m), se a armadura for idêntica. */
  pilarUniaoLances: number;
  /** 1 = ancoragem no topo do último lance reduzida por As,calc/As,ef (9.4.2.5). */
  ancoragemReduzidaTopo: number;
  /** Detalhamento dos pilares (R7c). */
  pilarContinuidadeInicio: number;
  pilarContinuidadeFaces: number;
  pilarProlongarSemViga: number;
  pilarCorteTopo: number;
  pilarReducaoIntermediarios: number;
  pilarReducaoMinimo: number;
  pilarAdensamento: number;
  pilarAdensamentoAltura: number;
  pilarAdensamentoEspacamento: number;
  pilarInsuficienteSemDesenho: number;
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
  /** Vigotas (treliçadas): momento positivo mínimo p·ℓ²/este valor por nervura (0 = desligado). */
  vigotaMomentoMinPositivo: number;
  /** Vigotas: momento negativo mínimo nas pontas p·ℓ²/este valor por nervura (0 = desligado). */
  vigotaMomentoMinNegativo: number;
  /** Vigotas: igualação das vigotas vizinhas da laje (0 = desligada, 1 = pelo máximo, 2 = pela média). */
  vigotaIgualacao: number;
  /** Vigotas: diferença máxima (% do maior momento positivo do grupo) para igualar vigotas vizinhas. */
  vigotaIgualacaoDif: number;
  /** Vigotas: comprimento mínimo dos negativos, de cada lado do eixo do apoio, em % do vão da vigota (0 = só o diagrama). */
  vigotaNegativoVao: number;
  /** Vigotas: fator redutor da rigidez à flexão das nervuras na grelha (1 = seção T bruta). */
  vigotaRigidez: number;
  /** 1 = cargas de uso das classes B (escritórios) e C (garagens) como casos próprios, com o ψ da classe; 0 = um caso Q com o ψ da obra. */
  categoriasUso: number;
  /** EQU: γ das permanentes favoráveis no tombamento global (NBR 8681). */
  equGamaFav: number;
  /** EQU: γ do vento no tombamento global (NBR 8681). */
  equGamaVento: number;
  /** Fundações: 0 = dimensionar tudo; 1 = só verificar as dimensões impostas (ou as do cálculo anterior); 2 = redimensionar só os elementos com erro. */
  fundModo: number;
  /** Vigas de equilíbrio: parcela do alívio considerada no elemento aliviado (%). */
  vigaEqAlivio: number;
  /** Vigas de equilíbrio: distribuição das tensões sob o elemento equilibrado (0 = retangular, equilíbrio total; 1 = trapezoidal, resultante até o limite do núcleo central). */
  vigaEqDistribuicao: number;
  /** Vigas de travamento: excentricidade de execução das estacas dos blocos de 1 e 2 estacas (cm). */
  vigaTravExc: number;
  /** Vigas de fundação: largura mínima (cm). */
  vigaFundBMin: number;
  /** Vigas de fundação: altura mínima (cm). */
  vigaFundHMin: number;
  /** Vigas de fundação: estribos prolongados até as esperas dos pilares (1) ou só entre as faces (0). */
  vigaFundEstribosEsperas: number;
  /** Sapatas: permitir descolamento (1: sem a área comprimida mínima; a tensão máxima limita) ou exigir 2/3 da base comprimida (0). */
  fundDescolamento: number;
  /** Sapatas associadas: vão máximo entre pilares vizinhos em múltiplos da altura, para considerá-las rígidas. */
  fundVaoAltura: number;
  /** Sapatas: balanço máximo em múltiplos da altura, para considerá-las rígidas (NBR 6118 22.6.1: h ≥ (a − ap)/3 ⇒ 1,5). */
  fundBalancoAltura: number;
  /** Sapatas de concreto simples: fator sobre γc (NBR 6118, cap. 24). */
  fundSimplesGamma: number;
  /** Sapatas: reduzir a armadura mínima de flexão a 4/3 da calculada (1) ou manter ρmín (0). */
  fundReducaoTaxa: number;
  /** Geração automática: distância de visão D (m): desalinhamento máximo do eixo do pilar "em frente" em relação ao eixo do pilar gerador. */
  gerarDistVisao: number;
  /** Geração automática: ângulo de visão A (graus): abertura total do cone de busca de pilares em frente, a partir de cada face do pilar. */
  gerarAnguloVisao: number;
  /** Geração automática: distância máxima (m) entre as bordas de dois pilares para criar sapata associada ou bloco com vários pilares. */
  gerarDistAssociada: number;
  /** Geração automática: distância (m) de uma face do pilar a um limite (divisa) abaixo da qual o elemento fica de divisa. */
  gerarDistLimite: number;
  /** Geração automática: σadm (kN/m²) abaixo da qual o tipo automático passa de sapata a bloco sobre estacas. */
  gerarSigmaMin: number;
  /** Base elástica (FU6): coeficiente de reação vertical do solo padrão (kN/m³), para radiers e vigas sem valor próprio. */
  radierK: number;
  /** Base elástica (FU6): espaçamento máximo da malha do radier e da divisão das vigas sobre base elástica (m). */
  radierMalha: number;
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
  { chave: 'malha', rotulo: 'Malha da grelha das lajes', unidade: 'm', min: 0.1, max: 1, passo: 0.05, padrao: 0.25, fonte: 'NBR 6118 não fixa; malha máxima de 25 cm do programa de referência (manual de cálculo)', aConfirmar: false,
    descricao: 'Espaçamento máximo das barras da grelha das lajes. Malha menor dá esforços mais precisos e cálculo mais lento.' },
  { chave: 'torcaoViga', rotulo: 'Rigidez à torção das vigas', min: 0, max: 1, passo: 0.05, padrao: 0.15, fonte: 'NBR 6118, 14.6.7.2 (torção de compatibilidade: 15 % da rigidez elástica; item a confirmar)', aConfirmar: true,
    descricao: 'Fator sobre GJ da seção bruta das vigas, na grelha e no pórtico.' },
  { chave: 'torcaoLaje', rotulo: 'Rigidez à torção das lajes', min: 0, max: 1, passo: 0.05, padrao: 0.15, fonte: 'Critério do app (mesmo redutor das vigas)', aConfirmar: true,
    descricao: 'Fator sobre J = 2I das barras de laje da grelha.' },
  { chave: 'torcaoPilar', rotulo: 'Rigidez à torção dos pilares', min: 0, max: 1, passo: 0.05, padrao: 1, fonte: 'NBR 6118 não fixa; seção bruta', aConfirmar: true,
    descricao: 'Fator sobre GJ da seção bruta dos pilares no pórtico.' },
  { chave: 'axialPilares', rotulo: 'Rigidez axial dos pilares (cargas verticais)', unidade: '× EA', min: 1, max: 99.99, passo: 0.5, padrao: 2, padraoNBR: 1, fonteNBR: 'NBR 6118 não prevê multiplicador: EA da seção bruta', fonte: 'NBR 6118 não fixa; padrão 2 (recomendado 2 a 3, faixa 1 a 99,99) do programa de referência', aConfirmar: false,
    descricao: 'Multiplica EA dos pilares nas ações verticais para simular o processo construtivo (encurtamento dos pilares compensado a cada pavimento). Não vale para vento nem γz.' },
  { chave: 'trechoRigido', rotulo: 'Trecho rígido da viga no pilar', unidade: '× h', min: 0, max: 0.5, passo: 0.05, padrao: 0.3, fonte: 'NBR 6118, 14.6.2.1 e Figura 14.7 (face do apoio menos 0,3h)', aConfirmar: false,
    descricao: 'O trecho da viga dentro do pilar é rígido até a face menos este fator × h da viga; 0 = rígido até a face.' },
  { chave: 'engasteTopoUltimo', rotulo: 'Engaste no topo do último lance', min: 0, max: 1, passo: 0.05, padrao: 0.3, padraoNBR: 1, fonteNBR: 'NBR 6118 não fixa: ligação monolítica (engaste pleno)', fonte: 'NBR 6118 não fixa; padrão 0,3 do programa de referência (0 a 1)', aConfirmar: false,
    descricao: 'Ligação do topo do último lance de cada pilar com as vigas: 0 = rótula, 1 = engaste. Interpola as rigidezes engaste-engaste e engaste-rótula do lance.' },
  { chave: 'zonasIndependentes', rotulo: 'Zonas independentes como diafragmas separados', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Critério do programa de referência (cada zona ligada por vigas é um diafragma; pilar isolado, sem diafragma)', aConfirmar: false,
    descricao: 'Partes do pavimento sem vigas entre si (blocos separados por junta) têm diafragmas próprios, e o vento do pavimento é repartido entre elas pela largura de cada uma.' },
  { chave: 'limiteGamaZ', rotulo: 'Limite do γz', min: 1.1, max: 1.5, passo: 0.05, padrao: 1.3, fonte: 'NBR 6118, 15.5.3 e 15.7.2 (ampliação por 0,95·γz até 1,3)', aConfirmar: false,
    descricao: 'Entre 1,1 e o limite, as ações horizontais das ELU são ampliadas por 0,95·γz; acima do limite, aviso (exige análise de 2ª ordem mais rigorosa).' },
  { chave: 'woodArmer', rotulo: 'Lajes maciças: Wood-Armer com média em faixa de 1 m', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Wood (1968) e Armer (1968); faixa de 1 m do programa de referência', aConfirmar: false,
    descricao: 'Momentos de dimensionamento nos nós da grelha somando o momento volvente (mx* = mx + |mxy|), com média numa faixa transversal de 1 m. Sem a opção: extremos dos momentos nas pontas das barras.' },
  { chave: 't0Flecha', rotulo: 'Idade no carregamento (fluência)', unidade: 'meses', min: 0.25, max: 70, passo: 0.25, padrao: 1, fonte: 'NBR 6118, 17.3.2.1.2 (Tabela 17.1); padrão 1 mês confirmado no pórtico', aConfirmar: false,
    descricao: 'αf = Δξ = ξ(70) − ξ(t0), sem armadura de compressão (ρ′ = 0).' },
  { chave: 'fatorFlechaLaje', rotulo: 'Fator simplificado da flecha das lajes', unidade: '× elástica', min: 0, max: 5, passo: 0.1, padrao: 2.5, padraoNBR: 0, fonteNBR: 'NBR 6118, 17.3.2.1.2: elástica × (1 + αf)', fonte: 'Padrão 2,5 do programa de referência (faixa 2,5 a 3,0); 0 = método da NBR 6118, 17.3.2.1.2 (1 + αf)', aConfirmar: false,
    descricao: 'Flecha total = elástica relativa aos apoios × este fator. 0 usa o método da NBR (1 + αf), sem fissuração.' },
  { chave: 'limiteFlechaTotal', rotulo: 'Limite da flecha total (vão / …)', min: 100, max: 1000, passo: 10, padrao: 250, fonte: 'NBR 6118, Tabela 13.3 (aceitabilidade sensorial, visual)', aConfirmar: false,
    descricao: 'Lajes e vigas: flecha total (quase permanente com fluência) ≤ vão / este valor; balanço: 2 × vão.' },
  { chave: 'limiteFlechaSensorial', rotulo: 'Limite da flecha da carga variável (vão / …)', min: 100, max: 1000, passo: 10, padrao: 350, fonte: 'NBR 6118, Tabela 13.3 (vibrações sentidas no piso)', aConfirmar: false,
    descricao: 'Flecha imediata só das cargas variáveis ≤ vão / este valor.' },
  { chave: 'redistribuicao', rotulo: 'Redistribuição de negativos das vigas', unidade: '%', min: 0, max: 25, passo: 5, padrao: 15, padraoNBR: 0, fonteNBR: 'NBR 6118 permite (14.6.4.3), não exige: sem redistribuição', fonte: 'Padrão 15 % do programa de referência (vigas); limites da NBR 6118, 14.6.4.3 (δ ≥ 0,75 nós fixos, 0,90 nós móveis; δ ≥ 0,44 + 1,25·x/d)', aConfirmar: false,
    descricao: 'Reduz o momento negativo das cargas verticais nos apoios internos das vigas contínuas (δ = 1 − valor), depois dos momentos mínimos, e aumenta o positivo do vão por equilíbrio. O app respeita os limites de δ da norma (estrutura de nós móveis quando γz > 1,1) e diminui a redistribuição onde x/d não permite. 0 = desligada.' },
  { chave: 'momentoMinPositivo', rotulo: 'Momento positivo mínimo (p·ℓ² / …)', min: 0, max: 50, passo: 1, padrao: 0, fonte: 'Opção do programa de referência, padrão desligado (0); a NBR não exige', aConfirmar: false,
    descricao: 'Momento positivo de cálculo de cada vão de viga ≥ p·ℓ²/este valor, com a carga equivalente p = (V1 + V2)/ℓ dos cortantes das cargas verticais nas pontas do vão. Recomendado pelo programa de referência: 20.' },
  { chave: 'momentoMinNegativo', rotulo: 'Momento negativo mínimo nos apoios (p·ℓ² / …)', min: 0, max: 50, passo: 1, padrao: 0, fonte: 'Opção do programa de referência, padrão desligado (0); a NBR não exige', aConfirmar: false,
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
  { chave: 'vigaReducaoLb', rotulo: 'Vigas: reduzir lb por As,calc/As,ef', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, padraoNBR: 0, fonteNBR: 'NBR 6118, 9.4.2.5 permite, mas o app mantém lb pleno no corte das barras (a favor da segurança; comportamento anterior)', fonte: 'Programa de referência: corte das barras pelo diagrama deslocado de aℓ + lb·As,calc/As,ef (K1.12.25); decisão do usuário (20/10/2026)', aConfirmar: false,
    descricao: 'Ligada: o prolongamento dos reforços e negativos além do ponto de corte é lb,nec = lb·As,calc/As,ef ≥ lb,mín = máx(0,3·lb; 10φ; 10 cm), com As,calc = maior necessária no trecho e As,ef = área das barras ali (passantes ou montagem + reforço). Desligada: lb pleno (≥ 10φ).' },
  { chave: 'vigaNegativoVao', rotulo: 'Vigas: comprimento mínimo dos negativos', unidade: '% do vão', min: 0, max: 50, passo: 1, padrao: 25, padraoNBR: 0, fonteNBR: 'NBR 6118 não fixa: só o diagrama decalado mais a ancoragem (9.4.2.5)', fonte: 'Prática usual brasileira (ℓ/4 do vão adjacente a partir da face do apoio) e opção de % mínima do vão do programa de referência (K1.12.9); valor a confirmar', aConfirmar: true,
    descricao: 'Cada lado do negativo sobre um pilar interno vai, a partir da face do apoio, até o maior entre esta % do vão adjacente e o ponto do diagrama decalado + ancoragem. 0 = só o diagrama.' },
  { chave: 'vigaReforcoVao', rotulo: 'Vigas: comprimento mínimo dos reforços inferiores', unidade: '% do vão', min: 0, max: 100, passo: 5, padrao: 0, fonte: 'Opção do programa de referência (K1.12.9), padrão desligado; a NBR não fixa', aConfirmar: false,
    descricao: 'O reforço inferior de um vão cobre ao menos esta % do vão (centrado onde a armadura é exigida). 0 = só o diagrama decalado + ancoragem.' },
  { chave: 'vigaSimetriaNegativos', rotulo: 'Vigas de um vão: simetria dos negativos (tolerância)', unidade: '%', min: 0, max: 100, passo: 5, padrao: 25, padraoNBR: 0, fonteNBR: 'NBR 6118 não exige simetria: cada extremo pelo seu momento (comportamento anterior)', fonte: 'Programa de referência (K1.4.63: armadura negativa simétrica em vigas de um vão, com diferença % para simetria); 25 % a confirmar', aConfirmar: true,
    descricao: 'Em viga de um só vão, os dois negativos ganham o maior número de barras quando a diferença relativa entre eles não passa desta %. 0 = desligado.' },
  { chave: 'vigaNegativosUnir', rotulo: 'Vigas: unir negativos vizinhos', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, padraoNBR: 0, fonteNBR: 'NBR 6118 não trata: negativos separados (comportamento anterior)', fonte: 'Programa de referência (K1.12.19: negativos que se encontram viram barra corrida)', aConfirmar: false,
    descricao: 'Dois negativos separados por um trecho menor que um comprimento de ancoragem viram uma barra só, com o maior número de barras.' },
  { chave: 'vigaMontagemContinua', rotulo: 'Vigas: montagem contínua', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Programa de referência (K1.12.13: contínua ou construtiva); padrão contínua a confirmar', aConfirmar: true,
    descricao: 'Ligada: 2 barras de montagem de ponta a ponta. Desligada: porta-estribos só nos trechos entre as pontas dos negativos, emendados com traspasse construtivo (15φ, ≥ 20 cm).' },
  { chave: 'vigaMontagemColaborante', rotulo: 'Vigas: montagem colaborante', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Programa de referência (K1.12.14: considerar a montagem como colaborante; se há compressão superior, passa a colaborante)', aConfirmar: true,
    descricao: 'Ligada: a montagem entra na área dos negativos. Desligada: os negativos levam toda a área, exceto onde o cálculo exige armadura de compressão superior (aí a montagem passa a colaborante, com aviso).' },
  { chave: 'vigaMontagemGancho', rotulo: 'Vigas: ancoragem da montagem com gancho', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Programa de referência (K1.12.15: gancho ou prolongamento reto); padrão com gancho (comportamento anterior)', aConfirmar: true,
    descricao: 'Ligada: gancho de 90° nas pontas da montagem. Desligada: prolongamento reto.' },
  { chave: 'vigaMontagemEixo', rotulo: 'Vigas: montagem reta medida do eixo do apoio', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Programa de referência (K1.12.15: a partir do extremo ou do eixo); padrão a partir do extremo', aConfirmar: true,
    descricao: 'Com a montagem reta, ligada: a barra termina no eixo do apoio extremo; desligada: vai até o cobrimento da ponta.' },
  { chave: 'vigaPernaGancho', rotulo: 'Vigas: perna reta mínima dos ganchos', unidade: '× φ', min: 8, max: 20, passo: 1, padrao: 8, fonte: 'NBR 6118, 9.4.2.3 (ponta reta ≥ 8φ no gancho de 90°)', aConfirmar: false,
    descricao: 'Perna reta dos ganchos de 90° das barras longitudinais das vigas.' },
  { chave: 'vigaEstriboExtensao', rotulo: 'Vigas: estender zonas de estribos em d/2', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, padraoNBR: 0, fonteNBR: 'NBR 6118 não pede extensão: a zona termina onde o espaçamento exigido permite abrir (comportamento anterior)', fonte: 'Programa de referência (K1.12.1-9: necessário + d/2)', aConfirmar: false,
    descricao: 'Cada zona de estribos mais densa é estendida de d/2 para o lado da zona menos exigida.' },
  { chave: 'vigaEstriboZonaMin', rotulo: 'Vigas: comprimento mínimo da zona de estribos', unidade: 'cm', min: 0, max: 200, passo: 5, padrao: 0, fonte: 'Opção do programa de referência (K1.4.65); padrão desligado (resta a regra de 2 espaçamentos)', aConfirmar: false,
    descricao: 'Zonas mais curtas que este valor são absorvidas pela vizinha mais densa. 0 = só a regra de 2 espaçamentos.' },
  { chave: 'vigaEstriboSimetria', rotulo: 'Vigas: estribos simétricos', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência (K1.4.65: simetria de estribos); padrão desligado', aConfirmar: true,
    descricao: 'O espaçamento em cada ponto é o menor entre ele e o simétrico em relação ao meio da viga.' },
  { chave: 'vigaFatorEmenda', rotulo: 'Vigas: fator do comprimento de emenda', unidade: '×', min: 0.5, max: 2, passo: 0.1, padrao: 1, fonte: 'Opção do programa de referência (C6.104); 1 = l0t da NBR 6118 (9.5.2.2)', aConfirmar: false,
    descricao: 'Multiplica o comprimento de traspasse das emendas de todas as vigas (cada viga pode ter o seu fator na edição do detalhamento).' },
  { chave: 'vigaDesnivelLimite', rotulo: 'Vigas: desnível longitudinal para aviso', unidade: 'cm', min: 0, max: 20, passo: 0.5, padrao: 2, fonte: 'Critério do app (sem fonte): faces superior ou inferior de vigas consecutivas alinhadas diferindo mais que isto', aConfirmar: true,
    descricao: 'Vigas consecutivas alinhadas cujas faces não coincidem pedem detalhe especial (estribos adicionais, continuidade da armadura).' },
  { chave: 'continuidadePilares', rotulo: 'Continuidade da armadura dos pilares', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, padraoNBR: 0, fonteNBR: 'NBR 6118 não exige: cada lance pelos seus esforços', fonte: 'Padrão do programa de referência (taxa e bitola de canto a partir do penúltimo pavimento)', aConfirmar: false,
    descricao: 'Último e penúltimo lances pelos seus esforços; daí para baixo, cada lance com armadura e bitola de canto não menores que as do lance de cima.' },
  { chave: 'pilarSimetria', rotulo: 'Simetria da armadura dos pilares (tolerância)', unidade: '%', min: 0, max: 1000, passo: 5, padrao: 0, padraoNBR: 1000, fonteNBR: 'NBR 6118 não fixa: armadura simétrica nas faces opostas (comportamento anterior do app)', fonte: 'Programa de referência: armadura não simétrica por padrão (tolerância 0 %); decisão do usuário (20/10/2026)', aConfirmar: false,
    descricao: 'Em cada bitola, a disposição de menor armadura pode ter faces opostas com números de barras diferentes. A disposição simétrica (as duas faces iguais) é preferida se sua armadura exceder a da melhor em até esta %. 0 = sempre a de menor armadura; 1000 = só simétricas. A disposição escolhida é verificada nos quatro quadrantes da flexão oblíqua.' },
  { chave: 'pilarBarraMaxima', rotulo: 'Comprimento máximo de barra dos pilares', unidade: 'm', min: 3, max: 12, passo: 0.5, padrao: 8, fonte: 'Padrão do programa de referência (8 m)', aConfirmar: false,
    descricao: 'Barra longitudinal de pilar mais longa que isto é emendada.' },
  { chave: 'pilarUniaoLances', rotulo: 'União de lances curtos dos pilares', unidade: 'm', min: 0, max: 8, passo: 0.5, padrao: 4, fonte: 'Padrão do programa de referência (4 m)', aConfirmar: false,
    descricao: 'Lances consecutivos com a mesma armadura têm barras corridas, sem emenda intermediária, enquanto o comprimento somado couber neste limite.' },
  { chave: 'ancoragemReduzidaTopo', rotulo: 'Ancoragem reduzida no topo do último lance', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 9.4.2.5 (lb,nec = α·lb·As,calc/As,ef); padrão do programa de referência: ligada no último pavimento', aConfirmar: false,
    descricao: 'No topo do último lance, a ancoragem das barras é reduzida pela utilização da seção (≥ lb,mín).' },
  { chave: 'pilarContinuidadeInicio', rotulo: 'Pilares: continuidade a partir do penúltimo lance (0 = do último)', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Opção do programa de referência (K1.4.52): continuidade de taxa e bitola de canto a partir do penúltimo pavimento (padrão)', aConfirmar: false,
    descricao: 'Ligada: o último e o penúltimo lances pelos seus esforços e, de baixo do penúltimo, a continuidade. Desligada: só o último pelos seus esforços e a continuidade já no penúltimo. Vale com a continuidade da armadura ligada.' },
  { chave: 'pilarContinuidadeFaces', rotulo: 'Pilares: manter o número de barras de cada face', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência (K1.12.4-21: manter número e diâmetro das barras das faces); padrão desligado', aConfirmar: true,
    descricao: 'Com a continuidade ligada, cada face (b, b oposta, h, h oposta) tem, de cima para baixo, número de barras não menor que o do lance de cima, além da taxa e da bitola (quando a seção é a mesma).' },
  { chave: 'pilarProlongarSemViga', rotulo: 'Pilares: prolongar as barras sem emenda nos níveis sem viga', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência (K1.4.47): prolongar a armadura sem emenda até o pavimento seguinte nos níveis sem viga chegando ao pilar; padrão não registrado, desligada (emenda em todos os níveis)', aConfirmar: true,
    descricao: 'Em lances consecutivos de armadura idêntica, o nível em que nenhuma viga chega ao pilar não recebe emenda: as barras seguem até o nível seguinte, mesmo acima do limite de união de lances (barra máxima continua valendo).' },
  { chave: 'pilarCorteTopo', rotulo: 'Pilares: cortar as barras no topo do último lance', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência (K1.4.48): só desenho e medição, usar com cautela; padrão desligado', aConfirmar: false,
    descricao: 'As barras terminam no topo, a um cobrimento, sem gancho nem ancoragem. Não é calculado: reduza antes o engaste do topo e ative a ancoragem reduzida.' },
  { chave: 'pilarReducaoIntermediarios', rotulo: 'Pilares: reduzir traspasse e arranque pela utilização', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência (K1.4.49, K1.12.4-15): desativada nos pavimentos intermediários, ativada no último (ver ancoragem no topo); NBR 6118, 9.4.2.5', aConfirmar: false,
    descricao: 'Traspasse = máx(util·lb; mínimo; 15φ; 20 cm) e ancoragem do arranque = máx(util·lb; 0,3·lb; 10φ; 10 cm), com util = As,calc/As,ef aproximada pela utilização da seção (maior dos dois lances). Pode gerar arranques de comprimentos diferentes.' },
  { chave: 'pilarReducaoMinimo', rotulo: 'Pilares: traspasse mínimo reduzido', unidade: '% de lb', min: 30, max: 100, passo: 5, padrao: 60, fonte: 'NBR 6118, 9.5.2.3 (l0c ≥ máx(0,6·lb; 15φ; 200 mm))', aConfirmar: false,
    descricao: 'Limite inferior do traspasse reduzido e do traspasse editado dos pilares (também ≥ 15φ e 20 cm).' },
  { chave: 'pilarAdensamento', rotulo: 'Pilares: adensar estribos no topo e na base do lance', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência (K1.4.61): padrão inativo, recomendado em zona sísmica', aConfirmar: false,
    descricao: 'Estribos mais próximos junto ao topo e à base de cada lance, numa altura dada (as duas opções abaixo).' },
  { chave: 'pilarAdensamentoAltura', rotulo: 'Pilares: altura do adensamento', unidade: 'm', min: 0.2, max: 2, passo: 0.05, padrao: 0.5, fonte: 'Altura dada pelo usuário no programa de referência; valor inicial do app (sem fonte)', aConfirmar: true,
    descricao: 'Altura, a partir da base e do topo de cada lance, com o espaçamento adensado (limitada à metade do lance).' },
  { chave: 'pilarAdensamentoEspacamento', rotulo: 'Pilares: espaçamento adensado', unidade: 'cm', min: 5, max: 20, passo: 1, padrao: 10, fonte: 'Valor inicial do app (sem fonte); nunca maior que o espaçamento do lance', aConfirmar: true,
    descricao: 'Espaçamento dos estribos nas zonas de adensamento.' },
  { chave: 'pilarInsuficienteSemDesenho', rotulo: 'Pilares: seção insuficiente sem desenho nem quantitativo', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, padraoNBR: 0, fonteNBR: 'NBR 6118 não trata: o app anterior desenhava e media a armadura de 4 %', fonte: 'Programa de referência (K1.11.34): pilar com seção insuficiente não é desenhado nem dimensionado', aConfirmar: false,
    descricao: 'Pilar cujo dimensionamento não atende nem com 4 % de armadura ("aumente a seção") fica fora do detalhamento, das pranchas e do quantitativo; o erro continua na lista de revisão.' },
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
  { chave: 'vigotaMomentoMinPositivo', rotulo: 'Vigotas: momento positivo mínimo (p·ℓ² / …)', min: 0, max: 50, passo: 1, padrao: 16, padraoNBR: 0, fonteNBR: 'NBR 6118 não exige momento mínimo nas nervuras: só o da análise', fonte: 'Recomendação do programa de referência: metade do momento isostático (p·ℓ²/16)', aConfirmar: false,
    descricao: 'Momento positivo de cálculo de cada vigota ≥ p·ℓ²/este valor, com p = (V1 + V2)/ℓ dos cortantes das pontas (carga por nervura) e ℓ = comprimento da vigota. 0 = desligado.' },
  { chave: 'vigotaMomentoMinNegativo', rotulo: 'Vigotas: momento negativo mínimo nas pontas (p·ℓ² / …)', min: 0, max: 50, passo: 1, padrao: 16, padraoNBR: 0, fonteNBR: 'NBR 6118 não exige: só o momento da análise (bordas sem continuidade ficam sem negativo de cálculo)', fonte: 'Recomendação do programa de referência: metade do momento isostático (p·ℓ²/16), em todas as pontas', aConfirmar: false,
    descricao: 'Momento negativo de cálculo nas duas pontas de cada vigota ≥ p·ℓ²/este valor (p como no positivo), mesmo onde a análise dá zero. 0 = desligado.' },
  { chave: 'vigotaIgualacao', rotulo: 'Vigotas: igualação (0 desligada, 1 máximo, 2 média)', min: 0, max: 2, passo: 1, padrao: 1, fonte: 'Opção do programa de referência (igualar pelo máximo ou pela média; cortante sempre pelo máximo)', aConfirmar: false,
    descricao: 'Vigotas vizinhas da mesma laje formam um grupo enquanto (Mmáx − Mmín) do grupo < diferença × Mmáx; no grupo, momentos pelo maior valor (1) ou pela média (2), cortante sempre pelo maior. Cada grupo tem a mesma armadura.' },
  { chave: 'vigotaIgualacaoDif', rotulo: 'Vigotas: diferença para igualar', unidade: '%', min: 0, max: 100, passo: 5, padrao: 100, fonte: 'Prática usual das treliçadas (uma armadura por laje); o programa de referência pede o valor ao usuário', aConfirmar: true,
    descricao: 'Diferença máxima entre o maior e o menor momento positivo do grupo, em % do maior. 100 % = todas as vigotas da laje iguais.' },
  { chave: 'vigotaNegativoVao', rotulo: 'Vigotas: comprimento mínimo dos negativos', unidade: '% do vão', min: 0, max: 50, passo: 1, padrao: 25, padraoNBR: 0, fonteNBR: 'NBR 6118 não fixa: só o diagrama decalado mais a ancoragem (9.4.2.5 e 19.4)', fonte: 'Prática usual brasileira (ℓ/4 do vão da vigota, de cada lado do eixo); o programa de referência impõe porcentagens mínimas do vão', aConfirmar: true,
    descricao: 'Cada lado do negativo sobre um apoio vai, a partir do eixo, até o maior entre esta % do vão da vigota e o ponto de momento nulo + decalagem (a das lajes) + ancoragem. 0 = só o diagrama.' },
  { chave: 'vigotaRigidez', rotulo: 'Vigotas: redutor da rigidez à flexão', unidade: '× EI', min: 0.1, max: 1, passo: 0.05, padrao: 1, fonte: 'Opção do programa de referência; NBR 6118 não fixa (seção T bruta da nervura)', aConfirmar: true,
    descricao: 'Multiplica a inércia das nervuras das treliçadas na grelha (fissuração das nervuras). Menor rigidez manda mais carga para as vigas e aumenta a flecha.' },
  { chave: 'categoriasUso', rotulo: 'Categorias de uso como casos próprios', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 8681 (ações variáveis distintas combinadas como principal e secundárias) e NBR 6118, Tabela 11.2 (ψ por local); casos por categoria de uso do programa de referência', aConfirmar: false,
    descricao: 'Grupos de escritórios (classe B) e de garagens (classe C) têm a carga de uso num caso próprio (QB, QC) com o ψ da classe; os demais usos (residencial, serviço, áreas comuns, cobertura) ficam no caso Q com o ψ da obra. 0 = um caso Q para todos.' },
  { chave: 'equGamaFav', rotulo: 'Equilíbrio (EQU): γ das permanentes favoráveis', min: 0.5, max: 1.2, passo: 0.05, padrao: 0.9, fonte: 'NBR 8681 (perda de equilíbrio como corpo rígido: permanentes de grande variabilidade favoráveis 0,9); valor a confirmar na norma', aConfirmar: true,
    descricao: 'Tombamento global do edifício: momento estabilizante = γ × ΣN(G) × braço até a aresta de sotavento da base. 1,0 desliga a minoração.' },
  { chave: 'equGamaVento', rotulo: 'Equilíbrio (EQU): γ do vento', min: 1, max: 2, passo: 0.05, padrao: 1.4, fonte: 'NBR 8681 (variável: 1,4 nas combinações normais); valor a confirmar na norma', aConfirmar: true,
    descricao: 'Momento instabilizante = γ × ΣF·z do vento (direções centradas) em relação ao plano do apoio.' },
  { chave: 'fundModo', rotulo: 'Fundações: modo (0 dimensionar, 1 só verificar, 2 só os com erro)', min: 0, max: 2, passo: 1, padrao: 0, fonte: 'Três modos de dimensionamento do programa de referência (padrão: dimensionar tudo)', aConfirmar: false,
    descricao: 'Dimensionar tudo; só verificar as dimensões impostas (sapatas; sem imposição, as do cálculo anterior); ou manter os elementos que atendiam no cálculo anterior e redimensionar só os com erro.' },
  { chave: 'vigaEqAlivio', rotulo: 'Vigas de equilíbrio: alívio considerado', unidade: '%', min: 0, max: 100, passo: 5, padrao: 50, fonte: 'NBR 6122:2019 (só metade do alívio da viga de equilíbrio pode ser considerada no elemento aliviado; item a confirmar)', aConfirmar: true,
    descricao: 'O elemento da ponta oposta à equilibrada é dimensionado com Nk − esta parcela do alívio ΔN = R − N. A tração no elemento aliviado é verificada com o alívio total e a carga mínima (erro).' },
  { chave: 'vigaEqDistribuicao', rotulo: 'Vigas de equilíbrio: tensões sob o elemento (0 retangular, 1 trapezoidal)', min: 0, max: 1, passo: 1, padrao: 0, fonte: 'Opção do programa de referência (padrão: distribuição retangular, equilíbrio total)', aConfirmar: false,
    descricao: 'Retangular: a viga leva a resultante ao centro do elemento (pressão uniforme). Trapezoidal: a viga equilibra só a excentricidade além do núcleo central (A/6) e o resto fica como momento no elemento.' },
  { chave: 'vigaTravExc', rotulo: 'Vigas de travamento: excentricidade de execução', unidade: 'cm', min: 0, max: 30, passo: 1, padrao: 10, fonte: 'Critério usual de projeto (desvio de locação da estaca); valor sem fonte normativa aberta', aConfirmar: true,
    descricao: 'Nos blocos de 1 e 2 estacas, a viga de travamento recebe o momento Nk × esta excentricidade (repartido entre as vigas que travam o bloco na mesma direção), nas duas faces.' },
  { chave: 'vigaFundBMin', rotulo: 'Vigas de fundação: largura mínima', unidade: 'cm', min: 12, max: 60, passo: 1, padrao: 20, fonte: 'Prática usual; sem fonte normativa aberta', aConfirmar: true,
    descricao: 'Largura mínima das vigas de equilíbrio e de travamento. Seção imposta menor: aviso.' },
  { chave: 'vigaFundHMin', rotulo: 'Vigas de fundação: altura mínima', unidade: 'cm', min: 20, max: 150, passo: 5, padrao: 40, fonte: 'Prática usual; sem fonte normativa aberta', aConfirmar: true,
    descricao: 'Altura mínima das vigas de equilíbrio e de travamento. Sem seção imposta, a altura cresce em passos de 5 cm (até 1,60 m) e depois a largura, até atender.' },
  { chave: 'vigaFundEstribosEsperas', rotulo: 'Vigas de fundação: estribos até as esperas dos pilares', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Opção do programa de referência (prolongar os estribos até as esperas dos pilares); padrão ligado a confirmar', aConfirmar: true,
    descricao: 'Ligada: estribos ao longo de toda a viga, de eixo a eixo dos pilares. Desligada: só entre as faces dos pilares.' },
  { chave: 'fundDescolamento', rotulo: 'Sapatas: permitir descolamento', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência (permitir ou não o levantamento); padrão: não, com a regra atual de área comprimida ≥ 2/3 [a confirmar]', aConfirmar: true,
    descricao: 'Desligada: a base fica comprimida em pelo menos 2/3 (item da NBR 6122 a confirmar). Ligada: só a tensão máxima (σmáx ≤ 1,0·σadm) limita; a área comprimida resultante vai nas observações.' },
  { chave: 'fundVaoAltura', rotulo: 'Sapatas associadas: vão máximo / altura (rigidez)', unidade: '× h', min: 1, max: 6, passo: 0.1, padrao: 2, fonte: 'Programa de referência (relação máxima vão/altura da sapata rígida); valor 2 sem fonte normativa aberta', aConfirmar: true,
    descricao: 'Maior distância entre eixos de pilares vizinhos da sapata ≤ este valor × h. Sem isso a sapata não é rígida e o método não se aplica: a altura sobe.' },
  { chave: 'fundBalancoAltura', rotulo: 'Sapatas: balanço máximo / altura (rigidez)', unidade: '× h', min: 0.5, max: 3, passo: 0.1, padrao: 1.5, fonte: 'NBR 6118 22.6.1: sapata rígida se h ≥ (a − ap)/3, isto é, balanço ≤ 1,5·h (item a confirmar)', aConfirmar: true,
    descricao: 'Maior balanço da base além das faces dos pilares extremos ≤ este valor × h. Vale também para a sapata isolada.' },
  { chave: 'fundSimplesGamma', rotulo: 'Sapatas de concreto simples: fator sobre γc', min: 1, max: 2, passo: 0.05, padrao: 1.2, fonte: 'NBR 6118, cap. 24 (resistência de cálculo do concreto simples com γc majorado em 1,2; item a confirmar)', aConfirmar: true,
    descricao: 'fctd = fctk,inf/(fator·γc). A tração na flexão da sapata de concreto simples (σt = 6M/(b·h²)) não passa de fctd; também decide se a sapata armada precisa de malha superior entre pilares.' },
  { chave: 'fundReducaoTaxa', rotulo: 'Sapatas: reduzir a taxa mínima de flexão', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência; NBR 6118 17.3.5.2.1 admite As,mín = 4/3·As,calc (item a confirmar)', aConfirmar: true,
    descricao: 'Ligada: a armadura de flexão da sapata é o maior entre a calculada e o menor valor entre ρmín·b·h e 4/3 da calculada. Desligada: ρmín·b·h.' },
  { chave: 'gerarDistVisao', rotulo: 'Geração automática: distância de visão D', unidade: 'm', min: 0.5, max: 10, passo: 0.5, padrao: 3, fonte: 'Programa de referência (geração automática de fundações: eixo do pilar em frente desalinhado menos que a distância de visão); padrão 3 m a confirmar', aConfirmar: true,
    descricao: 'Um pilar está “em frente” de uma face do pilar gerador quando o desalinhamento lateral do seu eixo é menor que D e ele está dentro do ângulo de visão. A face sem pilar em frente tem balanço nulo: o elemento fica de divisa (uma face) ou de canto (duas faces).' },
  { chave: 'gerarAnguloVisao', rotulo: 'Geração automática: ângulo de visão A', unidade: '°', min: 5, max: 180, passo: 5, padrao: 30, fonte: 'Programa de referência (ângulo de visão); padrão 30° a confirmar; aqui é a abertura total do cone, A/2 para cada lado do eixo', aConfirmar: true,
    descricao: 'Abertura total do cone de busca a partir de cada face do pilar (A/2 para cada lado do eixo da face, interpretação a confirmar). Pilar fora do cone não conta como “em frente”.' },
  { chave: 'gerarDistAssociada', rotulo: 'Geração automática: distância máxima para associar pilares', unidade: 'm', min: 0, max: 3, passo: 0.1, padrao: 1, fonte: 'Programa de referência (distância máxima para sapata associada: padrão 1 m, máximo 3 m); medida entre as bordas dos pilares (o programa fala em eixos; a confirmar)', aConfirmar: true,
    descricao: 'Pilares com bordas a menos desta distância (ou cujos elementos estimados se sobrepõem, quando se informam as cargas) viram uma sapata associada ou um bloco com vários pilares.' },
  { chave: 'gerarDistLimite', rotulo: 'Geração automática: distância à divisa para elemento de divisa', unidade: 'm', min: 0, max: 2, passo: 0.05, padrao: 0.5, fonte: 'Critério do Statikos (sem fonte): a sapata centrada precisa de balanço; abaixo desta distância o elemento é de divisa', aConfirmar: true,
    descricao: 'Limites poligonais (e as camadas da máscara escolhidas como divisa) a menos desta distância da face do pilar tornam o elemento de divisa naquela face, mesmo com pilar em frente.' },
  { chave: 'gerarSigmaMin', rotulo: 'Geração automática: σadm mínima para sapata', unidade: 'kN/m²', min: 0, max: 1000, passo: 10, padrao: 150, fonte: 'Critério do Statikos (sem fonte): terreno fraco pede fundação profunda', aConfirmar: true,
    descricao: 'No tipo automático, o pilar vai para bloco sobre estacas quando a σadm (informada ou estimada pelo SPT, N̄/50) é menor que este valor e há estaca cadastrada; senão, sapata.' },
  { chave: 'radierK', rotulo: 'Base elástica: coeficiente de reação vertical padrão (k)', unidade: 'kN/m³', min: 1000, max: 1000000, passo: 1000, padrao: 100000, fonte: 'Sem fonte normativa (NBR 6122 não fixa); valor da sapata corrida da spec da FU (10 kgf/cm³); tabela orientativa de Bowles (1996) no memorial; deve vir do geotécnico', aConfirmar: true,
    descricao: 'Molas de Winkler dos radiers e das vigas de fundação sobre base elástica que não têm k próprio: k × área de influência de cada nó (radier) ou k × largura × comprimento de influência (viga).' },
  { chave: 'radierMalha', rotulo: 'Base elástica: malha do radier e divisão das vigas', unidade: 'm', min: 0.1, max: 2, passo: 0.05, padrao: 0.5, fonte: 'Critério do Statikos (sem fonte): malha mais grossa que a das lajes para limitar o tamanho do pórtico', aConfirmar: true,
    descricao: 'Espaçamento máximo das barras da grelha do radier (as linhas passam também pelos pilares) e dos nós das vigas sobre base elástica.' },
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
