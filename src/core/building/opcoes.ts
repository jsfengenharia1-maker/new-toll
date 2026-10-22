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
  /** Coeficiente de engaste da base do primeiro lance de pilar que nasce sobre viga ou laje (E1a); sobre pilar vale 1. */
  engasteTransicao: number;
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
  /** Gancho do fechamento do estribo (R7g): 90, 135 ou 180 graus (NBR 6118, 9.4.6.1). */
  vigaEstriboGancho: number;
  /** 1 = estribos em U (abertos no topo, ganchos nas pontas das pernas) em todas as vigas (R7g). */
  vigaEstriboU: number;
  /** 1 = As,mín comparada ponto a ponto com a armadura necessária de cada face (R7g, K1.12.4). */
  vigaAsMinPonto: number;
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
  /** Lajes (R7d): 1 = armadura base desenhada e medida (sem a opção, só indicada com φ c/ s ou a designação da tela). */
  lajeBaseDetalhada: number;
  /** Lajes (R7d): 1 = emenda das barras da base inferior na zona de máximo negativo (junto à borda contínua). */
  lajeBaseEmendaApoio: number;
  /** Lajes (R7d): 1 = reforço com espaçamento múltiplo do da base (barras alternadas). */
  lajeReforcoReducao: number;
  /** Lajes (R7d): traspasse entre painéis de tela soldada (cm). */
  lajeTelaTraspasse: number;
  /** Lajes (R7e): traspasse da emenda construtiva feita depois do cálculo, sem recálculo (cm). */
  lajeEmendaConstrutiva: number;
  /** Lajes (R7e): 1 = uniformização automática dos negativos em faixas junto aos pilares (sem zonas lançadas). */
  lajeUniformizarPilares: number;
  /** Lajes (R7e): largura da faixa de uniformização junto a cada face do pilar (cm). */
  lajeUniformizarPilaresLargura: number;
  /** Lajes (R7e): 1 = armadura média uniforme por direção em lajes retangulares apoiadas em vigas (no lugar da máxima). */
  lajeArmaduraMedia: number;
  /** Lajes (R7e): 1 = siglas de reforço (RI inferior, RS superior) junto às barras nas plantas e nas pranchas. */
  lajeSiglaReforco: number;
  /** Lajes (R7e): numeração das posições de cada laje — 0 = ordem de geração (positivas e bases por direção, depois bordas), 1 = inferiores primeiro e superiores depois, agrupadas por tipo e direção. */
  lajeNumeracao: number;
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
  /** 1 = verifica a punção dos pilares sem viga (e das vigas chatas largas) nas lajes maciças. */
  puncaoVerificar: number;
  /** Armadura de punção: 0 = estribos (grampos verticais, fywd ≤ 250 MPa); 1 = conectores (fywd ≤ 300 MPa). */
  puncaoTipoArmadura: number;
  /** Primeira linha da armadura de punção a este múltiplo de d da face (NBR 6118, 19.5.3.5: ≤ 0,5d). */
  puncaoS0: number;
  /** Espaçamento radial entre barras da armadura de punção, em múltiplos de d (NBR 6118, 19.5.3.5: ≤ 0,75d). */
  puncaoSr: number;
  /** Furos a menos de este múltiplo de d da face do pilar descontam o contorno crítico (NBR 6118, 19.5.2.5: 8d). */
  puncaoFuroDist: number;
  /** 1 = viga chata mais larga que o apoio em mais de uma altura recebe aviso e verificação de punção. */
  puncaoVigaChata: number;
  /** 1 = verifica o cortante das lajes maciças (NBR 6118, 19.4), com armadura transversal quando necessário. */
  cortanteLajes: number;
  /** 1 = varredura do cortante em superfícies paralelas ao contorno de punção, até esgotar a laje. */
  cortanteVarredura: number;
  /** Passo da varredura de cortante, em múltiplos de d. */
  cortanteVarreduraPasso: number;
  /** Base elástica (FU6): coeficiente de reação vertical do solo padrão (kN/m³), para radiers e vigas sem valor próprio. */
  radierK: number;
  /** Base elástica (FU6): espaçamento máximo da malha do radier e da divisão das vigas sobre base elástica (m). */
  radierMalha: number;
  /** Sapata corrida (FU7a): largura total mínima da base (m). */
  corridaBMin: number;
  /** Sapata corrida sob pilares (FU7a): largura da base (m) e altura no eixo (m) quando não informadas. */
  corridaBPadrao: number;
  corridaHPadrao: number;
  /** Sapata corrida (FU7a): seção de referência da flexão transversal (CEB-70), dentro da face do elemento apoiado, em % da sua largura: concreto e alvenaria. */
  corridaRefConcreto: number;
  corridaRefAlvenaria: number;
  /** Sapata corrida (FU7a): armadura de distribuição (longitudinal) mínima, em % da armadura principal. */
  corridaDistribuicao: number;
  /** Sapata corrida sob parede (FU7a): comprimento da janela em que a carga linear é somada para obter a carga por metro (m). */
  corridaJanela: number;
  /** Rearmar com os esforços guardados (R7f): variação da rigidez à flexão (%) de um elemento, desde a análise, acima da qual os esforços são tidos como antigos (aviso ESFORCO_ANTIGO). */
  rearmarLimiteRigidez: number;
  /** Sapata corrida de aba única (FU8a): espaçamento máximo entre cintas (m); acima dele, aviso (flexão longitudinal entre cintas não verificada). */
  corridaCintaEspac: number;
  /** Pilar-parede (E1b): lado com comprimento ≥ este fator × a espessura vira casca; o mais curto vira barra (pilar). */
  pilarParedeLimite: number;
  /** Pilar-parede (E1b): altura da viga fictícia no topo de cada lado casca, que liga vigas e lajes em qualquer posição (cm). */
  pilarParedeVigaAltura: number;
  /** Viga apoiada ao longo de pilar-parede ou parede (E1b): o diagrama e a armadura prolongam-se a partir da face deste fator × a altura da viga. */
  vigaApoioLongProlong: number;
  /** Viga apoiada ao longo de pilar-parede ou parede (E1b): as barras não passam do vão de cálculo mais este fator × a altura da viga. */
  vigaApoioLongBarras: number;
  /** Viga em pilar-parede ou parede (E1b): vão de cálculo = menor entre a distância entre eixos e o vão livre + este fator × a altura da viga. */
  vigaApoioLongVao: number;
  /** Modelo global (N2b): 1 = integrado (grelhas condensadas no pórtico, resolvidas juntas); 0 = separado (grelha + forças nas vigas). */
  modeloGlobal: number;
  /** 1 = barras de laje com deformação por cortante (Timoshenko, área 5/6·b·h). */
  cortanteBarrasLaje: number;
  /** Tamanho alvo da malha triangular das cascas (m). */
  malhaCasca: number;
  /** Abertura interna de uma zona fechada por vigas acima da qual o diafragma rígido é questionado (% da área). */
  aberturaDiafragma: number;
  /** 2ª ordem global (N2c): 0 = γz (ampliação 0,95·γz das ações horizontais); 1 = P-Δ no pórtico 3D com rigidez reduzida. */
  segundaOrdem: number;
  /** Comprimento da barra do pilar (N2c): 0 = entre cotas dos pavimentos; 1 = parte flexível até a face inferior da viga mais alta. */
  pilarComprimento: number;
  /** 1 = lances sem viga nem laje que os travem numa direção somam-se aos vizinhos na flambagem (ℓ0 = máx αi × Σ ℓi). */
  pilarLancesDesligados: number;
  /** Coeficiente de fluência φ dos pilares com λ > 90 (NBR 6118, 15.8.4). */
  pilarFluencia: number;
  /** Taxa geométrica mínima da armadura longitudinal dos pilares (%); 0 = da norma (0,4 %, junto com 0,15·Nd/fyd). */
  pilarTaxaMin: number;
  /** Arredondamento do diagrama no apoio (N2e): 0 = sem; 1 = parábola cúbica entre as faces (M e V das faces); 2 = ΔM = R·t/8 (NBR 6118, 14.6.3). */
  arredondamentoApoio: number;
  /** Momento negativo mínimo na face do apoio, em % do momento no eixo (0 = sem mínimo; critério do EC2: 65). */
  momentoFaceMin: number;
  /** 1 = viga apoiada em viga com trecho rígido até a face da viga de apoio (K1.3.46). */
  vigaApoiadaRigida: number;
  /** Envoltória de cortante: 0 = contínua; 1 = descontínua (patamar por zona de estribos). */
  envoltoriaCortante: number;
  /** Barra curta (K1.4.34): comprimento (m) até o qual a barra usa o multiplicador de rigidez (0 = desligado). */
  barraCurtaLimite: number;
  /** Multiplicador da rigidez (A, I, J) das barras de viga curtas. */
  barraCurtaFator: number;
  /** Taxa mínima de armadura longitudinal das vigas (% de b·h; 0 = da norma). */
  vigaTaxaMin: number;
  /** Taxa mínima de armadura das lajes maciças (% de b·h; 0 = da norma). */
  lajeTaxaMin: number;
  /** Espaçamento máximo dos estribos das vigas (cm; 0 = da norma). */
  vigaEstriboSmax: number;
  /** Espaçamento mínimo dos estribos das vigas (cm; 0 = o da tabela de estribos). */
  vigaEstriboSmin: number;
  /** Momentos mínimos das lajes maciças: p·ℓ²/x positivo (0 = sem mínimo). */
  lajeMomentoMinPositivo: number;
  /** Momentos mínimos das lajes maciças: p·ℓ²/x negativo (0 = sem mínimo). */
  lajeMomentoMinNegativo: number;
  /** 1 = armadura de suspensão nos apoios indiretos (viga apoiada em viga, NBR 6118, 18.3.6). */
  vigaSuspensao: number;
  /** Fator sobre a reação de cálculo que a suspensão resiste (1 = toda a reação; redução por h1/h2 a confirmar). */
  vigaSuspensaoFator: number;
  /** Critério de elemento linear: 0 = NBR 6118 14.4.1 (ℓ ≥ 3h); 1 = da referência (ℓ > h/3 e ℓ > 4b). */
  criterioLinear: number;
  /** 1 = cortante de cargas a ≤ 2d do apoio reduzido por a/2d (NBR 6118, 17.4.1.2.1) e aviso quando a ≤ d. */
  cargaProximaApoio: number;
  /** 1 = estribos limitados (s ≤ mín(20 cm; b; 12φ), φt ≥ φℓ/4) onde há armadura longitudinal comprimida (18.2.4). */
  vigaEstriboComprimida: number;
  /** Desnível entre panos (K1.9.85): fração da menor espessura acima da qual a borda perde a continuidade (0 = desligado). */
  lajeDesnivelFator: number;
  // ---- N2f: flechas por etapas ----
  /** 1 = flecha total e ativa pelas etapas de carga (t0 ponderado, NBR 6118 17.3.2.1.2); 0 = fator único 1 + αf(t0). */
  flechaEtapas: number;
  /** 1 = a variável entra inteira na instantânea (critério da referência); 0 = só ψ2·Q (combinação quase permanente). */
  flechaQInstantanea: number;
  /** 1 = ρ′ das barras de compressão (porta-estribos) na fluência das vigas, αf = Δξ/(1 + 50ρ′); 0 = ρ′ = 0. */
  flechaRhoLinha: number;
  /** 1 = estádio I com a seção homogeneizada (αe = Es/Ecs) no Branson; 0 = seção bruta (NBR 6118, 17.3.2.1.1). */
  inerciaHomogeneizada: number;
  /** 1 = soma o giro do apoio (pórtico) à flecha dos balanços das vigas. */
  flechaRotacaoBalanco: number;
  /** 1 = lajes maciças com a grelha recomposta pela rigidez fissurada (Branson por barra) no método da NBR. */
  fissuracaoLajes: number;
  /** 1 = inércia média do vão [(Ie,esq + Ie,dir)/2 + Ie,centro]/2 por laje e direção; 0 = Ie por barra. */
  inerciaMediaVao: number;
  /** Limite da flecha ativa: vão / este valor (0 = sem a parcela relativa). */
  limiteFlechaAtiva: number;
  /** Limite absoluto da flecha ativa (cm; 0 = sem). */
  limiteFlechaAtivaAbs: number;
  /** Limite da flecha instantânea total (G + Q): vão / este valor (0 = sem verificação; aviso). */
  limiteFlechaInst: number;
  /** Fator simplificado da flecha ativa das lajes maciças (× elástica G + Q); 0 = método por etapas. */
  fatorFlechaAtiva: number;
  /** Idem para as lajes treliçadas. */
  fatorFlechaAtivaTrelicada: number;
  /** Fator simplificado da flecha da variável (conforto) das lajes maciças (× elástica Q); 0 = método (instantânea). */
  fatorFlechaConforto: number;
  /** Idem para as lajes treliçadas. */
  fatorFlechaConfortoTrelicada: number;
  // ---- N2g: resistência ao fogo (NBR 15200) ----
  /** TRRF padrão (min) dos grupos sem TRRF próprio e sem ocupação informada. */
  fogoTRRF: number;
  /** Pilares: 0 = método analítico da NBR 15200:2012 (TRF); 1 = tabular simplificado (Tabela 10 da edição de 2004, por μfi). */
  fogoPilarMetodo: number;
  /** μfi = NSd,fi/NRd dos pilares (0,7 = NSd = NRd, a favor da segurança). */
  fogoMuFi: number;
  /** Faces expostas ao fogo dos pilares (1 a 4). */
  fogoFacesPilar: number;
  /** 1 = comprimento efetivo em incêndio 0,5·ℓe (0,7·ℓe no último pavimento) com γz ≤ 1,1; 0 = ℓe. */
  fogoLefReducao: number;
  /** 1 = as lajes têm função compartimentadora (espessura mínima de isolamento também verificada). */
  fogoLajeCompartimentadora: number;
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
  { chave: 'engasteTransicao', rotulo: 'Transição: engaste da base do pilar apoiado', min: 0, max: 1, passo: 0.05, padrao: 0.3, padraoNBR: 1, fonteNBR: 'NBR 6118 não fixa: ligação monolítica, a rigidez da viga ou laje de apoio governa', fonte: 'NBR 6118 não fixa; padrão 0,3 do programa de referência (faixa recomendada 0,1 a 0,3: evita barras grossas e arranques longos)', aConfirmar: false,
    descricao: 'Multiplica o engaste da base do primeiro lance de um pilar que nasce numa viga (transição) ou laje: 0 = rótula, 1 = engaste. Pilar sobre pilar é contínuo (1).' },
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
  { chave: 'vigaEstriboGancho', rotulo: 'Vigas: ancoragem do fechamento do estribo (gancho)', unidade: '°', min: 90, max: 180, passo: 45, padrao: 135, fonte: 'NBR 6118, 9.4.6.1 (gancho de 45° [135°], 90° ou 180°; pontas retas mínimas 5φ/5 cm, 10φ/7 cm e 5φ/5 cm); padrão 135° (comportamento anterior)', aConfirmar: false,
    descricao: 'Ângulo do gancho de fechamento dos estribos das vigas: 90°, 135° ou 180°. Define o comprimento da peça. Pino de 4φ [a confirmar para 90° e 180°].' },
  { chave: 'vigaEstriboU', rotulo: 'Vigas: estribos em U (abertos no topo)', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção do programa de referência (K1.4.65: estribos em U); padrão desligado', aConfirmar: true,
    descricao: 'Estribo em U: fundo e duas pernas, com gancho na ponta de cada perna (ângulo da opção de gancho). O fechamento fica por conta da laje/armadura superior [a confirmar]; cada zona pode ser editada.' },
  { chave: 'vigaAsMinPonto', rotulo: 'Vigas: As,mín longitudinal ponto a ponto', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Programa de referência (K1.12.4: em cada ponto, armadura necessária comparada às taxas mínimas, prevalece a maior); padrão desligado para manter o detalhamento anterior (a NBR 6118, 17.3.5.2.1, exige a mínima no arranjo da viga, não ponto a ponto)', aConfirmar: true,
    descricao: 'Em cada ponto onde a face é tracionada, a armadura necessária decalada não fica abaixo de As,mín da seção (os cortes das barras respeitam esse piso).' },
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
  { chave: 'lajeBaseDetalhada', rotulo: 'Lajes: detalhar a armadura base', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Programa de referência (K1.4.76): padrão desativado, a base só é indicada (φ c/ s ou tela) e não entra no desenho nem no quantitativo; cada laje pode sobrepor', aConfirmar: false,
    descricao: 'Ligada, a armadura base (barras ou painéis de tela) é desenhada com comprimentos e emendas e entra no quantitativo; desligada, só o reforço (necessária − base) é desenhado e medido.' },
  { chave: 'lajeBaseEmendaApoio', rotulo: 'Lajes: emenda da base inferior na zona de máximo negativo', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Programa de referência (K1.9.88); NBR 6118, 9.5.2 (emendas em regiões de menor tensão)', aConfirmar: true,
    descricao: 'Barras da base inferior emendadas por traspasse (acima da barra máxima) com o centro da emenda junto à borda contínua mais próxima do meio da barra, onde o momento positivo é menor.' },
  { chave: 'lajeReforcoReducao', rotulo: 'Lajes: reforço com densidade reduzida (barras alternadas)', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Programa de referência (K1.4.75, redução de densidade de armadura); padrão desligado', aConfirmar: true,
    descricao: 'O reforço usa a bitola da base com espaçamento múltiplo do espaçamento da base (uma barra a cada k da base), em vez de uma bitola e espaçamento próprios.' },
  { chave: 'lajeTelaTraspasse', rotulo: 'Lajes: traspasse entre painéis de tela soldada', unidade: 'cm', min: 10, max: 60, passo: 1, padrao: 20, fonte: 'NBR 6118, 9.5.4 (emenda de telas por traspasse; valor inicial do app, sem fonte aberta)', aConfirmar: true,
    descricao: 'Sobreposição entre painéis vizinhos de tela, nas duas direções; os painéis seguem a largura de 2,45 m e o comprimento de 6,00 m.' },
  { chave: 'lajeEmendaConstrutiva', rotulo: 'Lajes: traspasse da emenda construtiva (sem recálculo)', unidade: 'cm', min: 10, max: 100, passo: 5, padrao: 30, fonte: 'Programa de referência (K1.11.25): emendas construtivas de 30 cm feitas depois do cálculo, sem recalcular', aConfirmar: false,
    descricao: 'Traspasse das emendas feitas na edição das posições (cortar uma barra numa linha de dobra ou num ponto) sem refazer o dimensionamento; o comprimento do traspasse não é verificado contra l0t.' },
  { chave: 'lajeUniformizarPilares', rotulo: 'Lajes: uniformizar os negativos junto aos pilares', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Programa de referência (K1.13.2.4-13): uniformização automática sobre pilares, em faixas adjacentes a pilares indicados; padrão desligado', aConfirmar: true,
    descricao: 'Em cada pilar do grupo, as barras superiores que passam pela faixa em torno do pilar recebem a maior taxa e o maior comprimento entre elas (zona retangular automática).' },
  { chave: 'lajeUniformizarPilaresLargura', rotulo: 'Lajes: largura da faixa de uniformização junto aos pilares', unidade: 'cm', min: 20, max: 300, passo: 5, padrao: 100, fonte: 'Valor inicial do app, sem fonte aberta (a faixa em torno do pilar)', aConfirmar: true,
    descricao: 'Folga da zona retangular automática a partir de cada face do pilar.' },
  { chave: 'lajeArmaduraMedia', rotulo: 'Lajes: armadura positiva média uniforme em lajes retangulares', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Programa de referência (K1.13.2.4-18): opção de armadura média uniforme por direção em lajes retangulares apoiadas em vigas; padrão desligado', aConfirmar: true,
    descricao: 'Lajes de quatro lados apoiados em vigas (sem furos, sem borda livre): a armadura positiva de cada direção usa a média dos momentos positivos máximos das linhas da grelha (nunca menos que a mínima), em vez do máximo.' },
  { chave: 'lajeSiglaReforco', rotulo: 'Lajes: siglas de reforço junto às barras', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Programa de referência (C7.130): vista com siglas de reforço superior e inferior junto às barras de reforço', aConfirmar: false,
    descricao: 'RI (reforço inferior) e RS (reforço superior) nos rótulos das barras de reforço das lajes, nas plantas e nas pranchas; barras da base, predefinidas, distribuição e demais ficam sem sigla.' },
  { chave: 'lajeNumeracao', rotulo: 'Lajes: numeração das posições por face e tipo', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Programa de referência (K1.4.77: critérios de disposição e numeração); padrão desligado, a ordem de geração do app', aConfirmar: true,
    descricao: 'Ligada, as posições de cada laje são numeradas com as inferiores primeiro (positivas, reforços, bordas livres, furos) e depois as superiores (negativos, negativas de borda, distribuição, cantos), por direção; desligada, N1… na ordem em que o detalhamento as gera. A edição bloqueada acompanha a numeração em uso: trocar a opção desconsidera as edições (BLOQ_IGNORADO).' },
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
  { chave: 'puncaoVerificar', rotulo: 'Punção: verificar lajes maciças', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 19.5 (contornos C, C′ e C″); verificação em pilares sem viga e em vigas chatas largas', aConfirmar: false,
    descricao: 'Verifica τSd contra τRd2 (contorno C) e τRd1/τRd3 (contorno C′ a 2d) nos pilares que apoiam a laje maciça sem viga, com o momento desbalanceado das molas da grelha; calcula a armadura de punção quando necessário.' },
  { chave: 'puncaoTipoArmadura', rotulo: 'Punção: armadura (0 estribos, 1 conectores)', min: 0, max: 1, passo: 1, padrao: 0, fonte: 'NBR 6118, 19.5.3.3: fywd ≤ 250 MPa com estribos e ≤ 300 MPa com conectores; estribos (grampos verticais) como padrão do programa de referência', aConfirmar: true,
    descricao: 'Estribos em grampo (2 pernas por barra) ou conectores (1 perna), em linhas radiais entre as armaduras superior e inferior.' },
  { chave: 'puncaoS0', rotulo: 'Punção: primeira linha da armadura', unidade: '× d', min: 0.1, max: 0.5, passo: 0.05, padrao: 0.5, fonte: 'NBR 6118, 19.5.3.5: primeira linha a no máximo 0,5d da face do pilar', aConfirmar: false,
    descricao: 'Distância da primeira barra de punção à face do pilar, em múltiplos de d (até 0,5).' },
  { chave: 'puncaoSr', rotulo: 'Punção: espaçamento radial entre barras', unidade: '× d', min: 0.2, max: 0.75, passo: 0.05, padrao: 0.75, fonte: 'NBR 6118, 19.5.3.5: espaçamento radial ≤ 0,75d', aConfirmar: false,
    descricao: 'Distância entre as barras de uma mesma linha radial, em múltiplos de d (até 0,75).' },
  { chave: 'puncaoFuroDist', rotulo: 'Punção: distância dos furos que descontam o contorno', unidade: '× d', min: 0, max: 20, passo: 1, padrao: 8, fonte: 'NBR 6118, 19.5.2.5: furos a menos de 8d da face do pilar (retas tangentes ao furo pelo centro do pilar); item a confirmar', aConfirmar: true,
    descricao: 'Furos mais perto que este múltiplo de d da face do pilar descontam do contorno crítico o trecho entre as tangentes ao furo traçadas pelo centro do pilar.' },
  { chave: 'puncaoVigaChata', rotulo: 'Punção: viga chata mais larga que o apoio', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Programa de referência (viga chata mais larga que o apoio em mais de uma altura: punção verificada); critério da largura a confirmar', aConfirmar: true,
    descricao: 'Viga cuja largura passa da largura do pilar mais uma altura da viga: aviso e verificação de punção no apoio, com a altura da viga e o contorno limitado à largura dela.' },
  { chave: 'cortanteLajes', rotulo: 'Cortante das lajes maciças (NBR 6118, 19.4)', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 19.4.1 e 19.4.2', aConfirmar: false,
    descricao: 'Verifica o cortante nas pontas das barras da malha (por metro) contra VRd1; acima, armadura transversal (h ≥ 15 cm) até VRd2.' },
  { chave: 'cortanteVarredura', rotulo: 'Cortante em torno do pilar: varredura por superfícies', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, padraoNBR: 0, fonteNBR: 'NBR 6118 não exige a varredura: só o contorno C′ de punção e o cortante nos apoios', fonte: 'Programa de referência: superfícies paralelas ao contorno de punção a cada 0,75d até esgotar a laje', aConfirmar: false,
    descricao: 'Verifica o cortante da laje em superfícies paralelas ao contorno de punção, com VRd1 (19.4.1) e armadura transversal (19.4.2) do mesmo tipo da punção.' },
  { chave: 'cortanteVarreduraPasso', rotulo: 'Cortante em torno do pilar: passo da varredura', unidade: '× d', min: 0.25, max: 2, passo: 0.05, padrao: 0.75, fonte: 'Programa de referência (superfícies a cada 0,75d)', aConfirmar: false,
    descricao: 'Distância entre as superfícies verificadas, em múltiplos de d, a partir do contorno C′.' },
  { chave: 'radierK', rotulo: 'Base elástica: coeficiente de reação vertical padrão (k)', unidade: 'kN/m³', min: 1000, max: 1000000, passo: 1000, padrao: 100000, fonte: 'Sem fonte normativa (NBR 6122 não fixa); valor da sapata corrida da spec da FU (10 kgf/cm³); tabela orientativa de Bowles (1996) no memorial; deve vir do geotécnico', aConfirmar: true,
    descricao: 'Molas de Winkler dos radiers e das vigas de fundação sobre base elástica que não têm k próprio: k × área de influência de cada nó (radier) ou k × largura × comprimento de influência (viga).' },
  { chave: 'modeloGlobal', rotulo: 'Modelo integrado (lajes no pórtico)', min: 0, max: 1, passo: 1, padrao: 1, padraoNBR: 0, fonteNBR: 'NBR 6118 não exige o modelo único: grelha das lajes e vigas e pórtico espacial separados (modelo clássico, 14.6.6 e 14.7; itens a confirmar)', booleana: true, fonte: 'Programa de referência: modelo único com pilares, vigas e lajes resolvidos juntos; a NBR 6118 admite os dois', aConfirmar: false,
    descricao: 'Ligado: a grelha de cada pavimento (lajes e vigas) entra no pórtico espacial como superelemento (condensação estática exata nos nós dos pilares) e tudo é resolvido junto; os esforços das vigas e das lajes incluem o vento, e o γz usa também as lajes (0,3·Eci·Ic). Desligado (modelo anterior): grelha por pavimento com molas nos pilares e forças da grelha aplicadas nas vigas do pórtico.' },
  { chave: 'cortanteBarrasLaje', rotulo: 'Deformação por cortante nas barras de laje', min: 0, max: 1, passo: 1, padrao: 1, padraoNBR: 0, fonteNBR: 'NBR 6118 não exige a deformação por cortante nas barras da grelha (Euler-Bernoulli)', booleana: true, fonte: 'Programa de referência (barras da grelha das lajes com deformação por cortante); área de cisalhamento 5/6 da seção (Timoshenko)', aConfirmar: false,
    descricao: 'Barras da grelha das lajes como vigas de Timoshenko (área de cisalhamento 5/6·b·h; nas treliçadas, a alma das nervuras e a capa). Aumenta um pouco as flechas das lajes espessas.' },
  { chave: 'malhaCasca', rotulo: 'Malha das cascas (tamanho alvo)', unidade: 'm', min: 0.25, max: 2, passo: 0.05, padrao: 1, fonte: 'Critério do Statikos (sem fonte): a casca de 6 nós (deslocamentos quadráticos) converge com células de ≈ 1 m; o diafragma rígido faz a banda do sistema crescer com os nós de cada pavimento, e a malha de 0,5 m custou ≈ 30 s numa parede de 4 m × 14 m (E1b)', aConfirmar: true,
    descricao: 'Tamanho alvo das células da malha das cascas dos pilares-parede (malha estruturada com os pavimentos como linhas da malha e as junções de lados como colunas). Malha mais fina refina as tensões e aumenta muito o tempo de cálculo.' },
  { chave: 'aberturaDiafragma', rotulo: 'Aviso de abertura grande no diafragma', unidade: '% da zona', min: 5, max: 100, passo: 1, padrao: 33, fonte: 'Sem fonte (critério do app: 1/3 da área da zona); a hipótese de diafragma rígido é do programa de referência e da NBR 6118, 14.7.2.1 (item a confirmar)', aConfirmar: true,
    descricao: 'Zona fechada por vigas com laje e com abertura interna (furos ou parte sem laje) acima desta fração da área recebe o aviso DIAFRAGMA_ABERTURA, sugerindo marcar as vigas da zona fora do diafragma.' },
  { chave: 'radierMalha', rotulo: 'Base elástica: malha do radier e divisão das vigas', unidade: 'm', min: 0.1, max: 2, passo: 0.05, padrao: 0.5, fonte: 'Critério do Statikos (sem fonte): malha mais grossa que a das lajes para limitar o tamanho do pórtico', aConfirmar: true,
    descricao: 'Espaçamento máximo das barras da grelha do radier (as linhas passam também pelos pilares) e dos nós das vigas sobre base elástica.' },
  { chave: 'corridaBMin', rotulo: 'Sapata corrida: largura mínima da base', unidade: 'm', min: 0.3, max: 3, passo: 0.05, padrao: 0.6, fonte: 'Mesmo mínimo das sapatas do módulo Fundações (lado ≥ 60 cm; a confirmar)', aConfirmar: true,
    descricao: 'Menor largura total B que a busca pela σadm considera na sapata corrida sob parede.' },
  { chave: 'corridaBPadrao', rotulo: 'Sapata corrida sob pilares: largura da base padrão', unidade: 'm', min: 0.4, max: 5, passo: 0.05, padrao: 1, fonte: 'Critério do Statikos (sem fonte): a largura entra na rigidez e nas molas da análise e precisa existir antes dela', aConfirmar: true,
    descricao: 'Largura B da base quando a sapata corrida sob pilares não a informa (a verificação da σadm dá a largura necessária).' },
  { chave: 'corridaHPadrao', rotulo: 'Sapata corrida sob pilares: altura padrão no eixo', unidade: 'm', min: 0.2, max: 3, passo: 0.05, padrao: 0.6, fonte: 'Critério do Statikos (sem fonte): a altura entra na rigidez da análise e precisa existir antes dela', aConfirmar: true,
    descricao: 'Altura total (nervura + aba) da sapata corrida sob pilares quando não informada; a espessura da aba sai da regra de rigidez.' },
  { chave: 'corridaRefConcreto', rotulo: 'Sapata corrida: seção de referência da flexão (parede ou viga de concreto)', unidade: '% de bw', min: 0, max: 50, passo: 1, padrao: 15, fonte: 'CEB-70 / NBR 6118 22.6.3: seção a 0,15·a dentro da face do pilar, estendida à parede (item a confirmar)', aConfirmar: true,
    descricao: 'Distância da seção de momento para dentro da face do elemento apoiado, em % da sua largura (parede ou viga de concreto).' },
  { chave: 'corridaRefAlvenaria', rotulo: 'Sapata corrida: seção de referência da flexão (parede de alvenaria)', unidade: '% de bw', min: 0, max: 50, passo: 1, padrao: 25, fonte: 'Prática de livro-texto (ACI 318: parede de alvenaria, a meia distância entre o eixo e a face); a confirmar', aConfirmar: true,
    descricao: 'Mesma distância para elemento apoiado de alvenaria (a seção fica no meio da metade da espessura).' },
  { chave: 'corridaDistribuicao', rotulo: 'Sapata corrida: armadura de distribuição mínima', unidade: '% da principal', min: 0, max: 100, passo: 5, padrao: 20, fonte: 'NBR 6118 20.1 e 20.3.2.2 (lajes): 20 % da principal, 0,9 cm²/m e 0,5·ρmín (item a confirmar)', aConfirmar: true,
    descricao: 'Armadura paralela ao eixo da sapata corrida: o maior entre este percentual da armadura transversal, 0,9 cm²/m e metade da taxa mínima.' },
  { chave: 'corridaJanela', rotulo: 'Sapata corrida sob parede: janela da carga linear', unidade: 'm', min: 0.25, max: 5, passo: 0.25, padrao: 1, fonte: 'Critério do Statikos (sem fonte): a carga por metro é a maior soma em janelas deste comprimento ao longo do eixo', aConfirmar: true,
    descricao: 'Comprimento da janela em que as cargas lineares, pontuais e de área do nível de fundação sobre a sapata corrida são somadas e divididas para dar a carga por metro de projeto (a largura é única ao longo do eixo).' },
  { chave: 'segundaOrdem', rotulo: '2ª ordem global por P-Δ (no lugar do γz)', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'NBR 6118, 15.7.2 (γz) e 15.7.3 (rigidez reduzida 0,4/0,8 e lajes 0,3); o programa de referência recomenda o P-Δ como alternativa, sobretudo em estruturas deslocáveis', aConfirmar: false,
    descricao: 'Ligado: cada combinação ELU é resolvida no pórtico espacial com rigidez reduzida (vigas 0,4·Eci·Ic, pilares 0,8·Eci·Ic, lajes 0,3·Eci·Ic) somando a matriz geométrica P-Δ dos pilares, iterando as normais até convergir; os efeitos de 2ª ordem viram forças fictícias aplicadas ao modelo de cálculo. Não há ampliação 0,95·γz; o γz continua informado.' },
  { chave: 'pilarComprimento', rotulo: 'Pilares: comprimento flexível entre faces', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Programa de referência (opção: comprimento = altura entre cotas ou distância livre entre faces); NBR 6118 não fixa o modelo; padrão entre cotas (comportamento anterior), a confirmar', aConfirmar: true,
    descricao: 'Ligado: a parte flexível de cada lance vai do topo da laje de baixo até a face inferior da viga mais alta que chega ao pilar no topo; o trecho dentro da viga é rígido. Desligado: barra inteira entre as cotas dos pavimentos.' },
  { chave: 'pilarLancesDesligados', rotulo: 'Pilares: lances desligados somados na flambagem', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, padraoNBR: 0, fonteNBR: 'NBR 6118, 15.6: ℓe por lance entre os nós do pórtico; o lance destravado se ajusta pelo α (comportamento anterior)', fonte: 'Programa de referência (ℓ0 = máx αi × soma dos lances sem travamento); NBR 6118, 15.6 (ℓe entre pontos travados)', aConfirmar: false,
    descricao: 'Lance cujo topo não tem viga nem laje que o trave numa direção (vigas com o eixo a menos de 45° da direção, ou laje junto ao pilar) soma-se ao lance de cima: o comprimento de flambagem da cadeia é o maior α × a soma das alturas, por direção.' },
  { chave: 'pilarFluencia', rotulo: 'Pilares: coeficiente de fluência (λ > 90)', min: 0, max: 5, passo: 0.1, padrao: 2.5, fonte: 'NBR 6118, 15.8.4 (fluência obrigatória para λ > 90) e 8.2.11 (φ pela Tabela 8.2); valor padrão 2,5 sem fonte específica, a confirmar', aConfirmar: true,
    descricao: 'φ usado na excentricidade de fluência e_cc = (MSg/NSg + ea)·(2,718^(φNSg/(Ne − NSg)) − 1), Ne = 10·Eci·Ic/ℓe², com NSg e MSg da combinação quase permanente, nos pilares com 90 < λ ≤ 200.' },
  { chave: 'pilarTaxaMin', rotulo: 'Pilares: taxa geométrica mínima', unidade: '%', min: 0, max: 4, passo: 0.05, padrao: 0, fonte: 'NBR 6118, 17.3.5.3.1 (As,mín = 0,15·Nd/fyd ≥ 0,4 %·Ac); valor do usuário substitui os 0,4 % (programa de referência)', aConfirmar: false,
    descricao: '0 = taxa da norma (0,4 % da seção). Outro valor substitui a taxa geométrica mínima; o mínimo mecânico 0,15·Nd/fyd continua valendo.' },
  { chave: 'rearmarLimiteRigidez', rotulo: 'Rearmar: variação de rigidez que torna os esforços antigos', unidade: '%', min: 1, max: 200, passo: 1, padrao: 15, fonte: 'Critério do Statikos (sem fonte): o programa de referência manda recalcular se as variações forem grandes, sem dar o limite; 15 % da inércia da seção (a confirmar)', aConfirmar: true,
    descricao: 'Ao rearmar com os esforços da última análise depois de mudar seções, o elemento cuja inércia (b·h³/12) variou mais que este percentual desde a análise recebe o aviso ESFORCO_ANTIGO: refaça a análise para esforços corretos.' },
  { chave: 'corridaCintaEspac', rotulo: 'Sapata corrida de aba única: espaçamento máximo entre cintas', unidade: 'm', min: 1, max: 12, passo: 0.5, padrao: 5, fonte: 'Critério do Statikos (sem fonte): a sapata entre cintas funciona como viga contínua apoiada nelas e não é verificada na flexão longitudinal; o programa de referência não fixa valor', aConfirmar: true,
    descricao: 'Distância entre cintas (vigas de equilíbrio da aba de um lado só) acima da qual o programa avisa que a flexão longitudinal da sapata entre elas não é verificada; o balanço além da última cinta aceita metade.' },
  { chave: 'pilarParedeLimite', rotulo: 'Pilar-parede: relação mínima lado/espessura para modelar por casca', unidade: '× espessura', min: 2, max: 10, passo: 0.5, padrao: 5, fonte: 'NBR 6118, 14.4.2.4 (pilar-parede: lado maior > 5 × o menor) e programa de referência (lado ≥ 5 × a outra dimensão para a discretização por elementos finitos); itens a confirmar', aConfirmar: false,
    descricao: 'Lado do pilar-parede com comprimento ≥ este fator × a espessura é discretizado em casca (membrana e placa, 6 nós); o lado mais curto é tratado como pilar (barra), ligado ao restante por trecho rígido.' },
  { chave: 'pilarParedeVigaAltura', rotulo: 'Pilar-parede: altura da viga fictícia no topo dos lados', unidade: 'cm', min: 10, max: 100, passo: 5, padrao: 25, fonte: 'Programa de referência (viga fictícia de largura igual à espessura e altura constante de 25 cm); a confirmar', aConfirmar: true,
    descricao: 'Em cada nível, uma viga fictícia (largura = espessura do lado, altura = este valor) percorre o topo do lado em casca e recebe as vigas e lajes que chegam em qualquer posição, sem exigir que seus nós coincidam com os da malha.' },
  { chave: 'vigaApoioLongProlong', rotulo: 'Viga apoiada ao longo de parede: prolongamento do diagrama e da armadura', unidade: '× h', min: 0, max: 3, passo: 0.25, padrao: 1, fonte: 'Programa de referência (diagrama prolongado a partir da face por um comprimento igual à altura da viga; armadura só nesse trecho); NBR 6118 não fixa; a confirmar', aConfirmar: true,
    descricao: 'Apoio longitudinal (pilar-parede ou parede): o diagrama de esforços da viga prossegue além da face do apoio por este múltiplo da altura da viga, e a armadura é dimensionada e detalhada só nesse trecho; a viga e a armadura são interrompidas depois dele.' },
  { chave: 'vigaApoioLongBarras', rotulo: 'Viga em parede: extensão máxima das barras além do vão de cálculo', unidade: '× h', min: 0, max: 4, passo: 0.25, padrao: 2, fonte: 'Programa de referência (corte de barras não excede o vão de cálculo em mais de duas alturas); a confirmar', aConfirmar: true,
    descricao: 'As pontas das barras da viga sobre pilar-parede ou parede não passam do vão de cálculo por mais que este múltiplo da altura da viga.' },
  { chave: 'vigaApoioLongVao', rotulo: 'Viga em parede: acréscimo ao vão livre no vão de cálculo', unidade: '× h', min: 0, max: 4, passo: 0.1, padrao: 2, padraoNBR: 0.6, fonteNBR: 'NBR 6118, 14.6.2.4: ℓef = ℓ0 + a1 + a2, com cada ai ≤ 0,3h (ℓ0 + 0,6h)', fonte: 'Programa de referência (vão de cálculo = menor entre a distância entre eixos e o vão livre + 2 alturas); a confirmar', aConfirmar: true,
    descricao: 'Vão de cálculo das vigas apoiadas em pilar-parede ou parede: o menor entre a distância entre os eixos de apoio e o vão livre mais este múltiplo da altura da viga.' },
  // ---- N2e: apoios, limites e avisos de modelagem ----
  { chave: 'arredondamentoApoio', rotulo: 'Arredondamento do diagrama no apoio', min: 0, max: 2, passo: 1, padrao: 1, padraoNBR: 2, fonteNBR: 'NBR 6118, 14.6.3 e Figura 14.7: ΔM = R·t/8 no apoio', fonte: 'Critério do programa de referência: parábola cúbica entre as faces do apoio com M e V das faces (manual de cálculo)', aConfirmar: false,
    descricao: '0 = sem arredondamento (diagrama do modelo); 1 = dentro do apoio, M(x) = a·x³ + b·x² + c·x + d com M e V das duas faces (Q = 3a·x² + 2b·x + c); 2 = reduz o momento negativo do apoio de ΔM = R·t/8 (R reação, t largura do apoio). A redistribuição atua sobre o diagrama já arredondado [a confirmar: no programa de referência atua nas faces e o trecho do apoio é recalculado depois].' },
  { chave: 'momentoFaceMin', rotulo: 'Momento mínimo na face do apoio', unidade: '% do M no eixo', min: 0, max: 100, passo: 5, padrao: 0, fonte: 'EC2 (65 % do momento no eixo) citado pelo manual do programa de referência; padrão 0 nos dois perfis. O momento no eixo é o da estação mais próxima do eixo (a parte flexível começa em face − 0,3h) [a confirmar]', aConfirmar: true,
    descricao: 'Limite inferior do módulo do momento negativo dentro do apoio após o arredondamento, em % do momento do modelo na estação mais próxima do eixo. 0 = sem mínimo.' },
  { chave: 'vigaApoiadaRigida', rotulo: 'Viga apoiada em viga: trecho rígido até a face da viga de apoio', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Critério do programa de referência (dimensão da viga de apoio considerada como a dos pilares); sem o recuo da NBR 6118 (face − 0,3h), usa-se a face inteira [a confirmar]', aConfirmar: true,
    descricao: 'A ponta da viga que se apoia em outra tem trecho rígido até a face da viga de apoio, no pórtico e na grelha. Vale quando a viga de apoio cruza a apoiada a mais de 10° da direção dela.' },
  { chave: 'envoltoriaCortante', rotulo: 'Envoltória de cortante descontínua', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Opção geral do programa de referência; padrão contínua e zonas de ¼ do vão [a confirmar]', aConfirmar: true,
    descricao: '0 = envoltória contínua ao longo da viga; 1 = descontínua: patamar com o maior cortante de cada zona (¼ de cada vão), como o estribo é detalhado por zona.' },
  { chave: 'barraCurtaLimite', rotulo: 'Barra curta: comprimento limite', unidade: 'm', min: 0, max: 5, passo: 0.1, padrao: 0, fonte: 'Opção do programa de referência (barra com dimensão ≤ limite usa o valor das opções); sem padrão registrado, desligada [a confirmar]', aConfirmar: true,
    descricao: 'Trechos de viga com comprimento até este limite recebem o multiplicador de rigidez abaixo. 0 = desligado.' },
  { chave: 'barraCurtaFator', rotulo: 'Barra curta: multiplicador de rigidez', unidade: '×', min: 0.1, max: 1000, passo: 1, padrao: 1, fonte: 'Opção do programa de referência; sem padrão registrado [a confirmar]', aConfirmar: true,
    descricao: 'Multiplica A, Iz, Iy e J dos trechos de viga curtos (vigas curtas e rígidas trabalham pouco à flexão).' },
  { chave: 'vigaTaxaMin', rotulo: 'Vigas: taxa mínima de armadura longitudinal', unidade: '%', min: 0, max: 4, passo: 0.01, padrao: 0, fonte: 'NBR 6118, 17.3.5.2.1 (ρmín pela Tabela 17.3, em função do fck); valor do usuário substitui', aConfirmar: false,
    descricao: '0 = taxa da norma. Outro valor substitui a taxa mínima (% de b·h) das armaduras inferior e superior.' },
  { chave: 'lajeTaxaMin', rotulo: 'Lajes: taxa mínima de armadura', unidade: '%', min: 0, max: 4, passo: 0.01, padrao: 0, fonte: 'NBR 6118, 19.3.3.2 e Tabela 19.1 (0,15 % para a armadura de flexão); valor do usuário substitui', aConfirmar: false,
    descricao: '0 = taxa da norma. Outro valor substitui a taxa mínima (% da seção) das lajes maciças.' },
  { chave: 'vigaEstriboSmax', rotulo: 'Vigas: espaçamento máximo dos estribos', unidade: 'cm', min: 0, max: 40, passo: 1, padrao: 0, fonte: 'NBR 6118, 18.3.3.2 (0,6d ou 30 cm; 0,3d ou 20 cm); valor do usuário limita ainda mais', aConfirmar: false,
    descricao: '0 = da norma. Outro valor limita o espaçamento dos estribos (nunca acima da norma).' },
  { chave: 'vigaEstriboSmin', rotulo: 'Vigas: espaçamento mínimo dos estribos', unidade: 'cm', min: 0, max: 30, passo: 1, padrao: 0, fonte: 'Opção do programa de referência (espaçamento mínimo editável); 0 = o da tabela de estribos', aConfirmar: false,
    descricao: '0 = o da tabela de estribos. Outro valor substitui o espaçamento mínimo da tabela na escolha dos estribos.' },
  { chave: 'lajeMomentoMinPositivo', rotulo: 'Lajes maciças: momento positivo mínimo p·ℓ²/x', unidade: 'x', min: 0, max: 100, passo: 1, padrao: 0, fonte: 'Opção do programa de referência (momentos mínimos em lajes); sem valor registrado para maciças, desligado [a confirmar]', aConfirmar: true,
    descricao: '0 = sem mínimo. Outro valor: o momento positivo de cada laje maciça não é menor que p·ℓ²/x (p a carga de cálculo, ℓ o menor vão).' },
  { chave: 'lajeMomentoMinNegativo', rotulo: 'Lajes maciças: momento negativo mínimo p·ℓ²/x', unidade: 'x', min: 0, max: 100, passo: 1, padrao: 0, fonte: 'Opção do programa de referência (momentos mínimos em lajes); sem valor registrado para maciças, desligado [a confirmar]', aConfirmar: true,
    descricao: '0 = sem mínimo. Outro valor: o momento negativo sobre apoio contínuo da laje maciça não é menor que p·ℓ²/x em módulo.' },
  { chave: 'vigaSuspensao', rotulo: 'Vigas: armadura de suspensão nos apoios em vigas', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 18.3.6 (apoio indireto); o programa de referência não calcula (aviso manual)', aConfirmar: false,
    descricao: 'Estribos de suspensão na viga de apoio, no cruzamento com a viga apoiada: As = fator × Rd/fywd, na largura bw da apoiada + h/2 de cada lado [a confirmar a largura].' },
  { chave: 'vigaSuspensaoFator', rotulo: 'Suspensão: parcela da reação resistida', unidade: '×', min: 0, max: 1, passo: 0.05, padrao: 1, fonte: 'NBR 6118, 18.3.6: reação inteira; redução por h1/h2 (viga apoiada mais baixa que a de apoio) sem fonte aberta [a confirmar]', aConfirmar: true,
    descricao: 'Fração da reação de cálculo da viga apoiada que a armadura de suspensão resiste.' },
  { chave: 'criterioLinear', rotulo: 'Critério de elemento linear (aviso NAO_LINEAR)', min: 0, max: 1, passo: 1, padrao: 1, padraoNBR: 0, fonteNBR: 'NBR 6118, 14.4.1: elemento linear se ℓ ≥ 3h', fonte: 'Critério do manual do programa de referência: vão > h/3 e > 4 × a largura (texto como no manual) [a confirmar]', aConfirmar: true,
    descricao: '1 = critério da referência (vão > h/3 e > 4b); 0 = NBR 6118 14.4.1 (ℓ ≥ 3h). Trecho que não atende é avisado como elemento a tratar à parte.' },
  { chave: 'cargaProximaApoio', rotulo: 'Cargas próximas ao apoio: redução do cortante', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 17.4.1.2.1: cortante da carga concentrada a a ≤ 2d do apoio multiplicado por a/2d; a ≤ d: biela-tirante (aviso). Parcela da carga que vai ao apoio ≈ F·(ℓ − a)/ℓ [a confirmar]', aConfirmar: true,
    descricao: 'Reduz o cortante das cargas concentradas (cargas pontuais da obra e pilares apoiados) a menos de 2d da face do apoio e avisa (CARGA_PROXIMA_APOIO) quando a ≤ d.' },
  { chave: 'vigaEstriboComprimida', rotulo: 'Vigas: estribos onde a armadura longitudinal é comprimida', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 18.2.4 / 18.3.3.2 aplicada às vigas (como nos pilares): s ≤ mín(20 cm; b; 12φ), φt ≥ φℓ/4 [a confirmar]', aConfirmar: true,
    descricao: 'Nas vigas com armadura dupla (barras comprimidas) o espaçamento dos estribos fica limitado a mín(20 cm; b; 12φ CA-50) e o diâmetro a φℓ/4.' },
  { chave: 'lajeDesnivelFator', rotulo: 'Desnível entre panos: limite da continuidade', unidade: '× espessura mínima', min: 0, max: 5, passo: 0.1, padrao: 0.5, fonte: 'Programa de referência (desníveis entre panos como nas vigotas); limite de ½ da menor espessura [a confirmar]', aConfirmar: true,
    descricao: 'Borda entre dois panos com desnível maior que este fator × a menor espessura é tratada sem continuidade (articulada); abaixo, vale o engaste da borda. 0 = desligado.' },
  // ---- N2f: flechas por etapas e flecha ativa ----
  { chave: 'flechaEtapas', rotulo: 'Flechas por etapas de carga (processo construtivo)', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 17.3.2.1.2 (t0 ponderado pelas cargas aplicadas em idades diferentes); etapas padrão do exemplo do manual de cálculo do programa de referência', aConfirmar: false,
    descricao: 'Flecha diferida de cada parcela de carga desde a idade em que é aplicada (etapas: desforma, alvenaria, revestimento, uso), com ξ médio ponderado. 0 = uma só idade t0 para toda a carga (1 + αf).' },
  { chave: 'flechaQInstantanea', rotulo: 'Variável inteira na flecha instantânea', min: 0, max: 1, passo: 1, padrao: 1, padraoNBR: 0, booleana: true, fonteNBR: 'NBR 6118, 11.8.3.1 e 17.3.2.1: combinação quase permanente (ψ2·Q)', fonte: 'Exemplo do manual de cálculo do programa de referência (instantânea com a carga total, fluência só da parcela quase permanente)', aConfirmar: false,
    descricao: '1 = a flecha instantânea inclui toda a carga variável e a diferida só ψ2·Q; 0 = só ψ2·Q nas duas (combinação quase permanente).' },
  { chave: 'flechaRhoLinha', rotulo: 'Armadura de compressão na fluência (ρ′)', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 17.3.2.1.2: αf = Δξ/(1 + 50ρ′); ρ′ das vigas = 2 barras de montagem no vão [a confirmar]; lajes sem armadura superior no vão (ρ′ = 0)', aConfirmar: true,
    descricao: 'Vigas: ρ′ = As′/(b·d) com as duas barras de montagem (porta-estribos) da bitola de montagem. 0 = ρ′ = 0.' },
  { chave: 'inerciaHomogeneizada', rotulo: 'Branson com a seção homogeneizada', min: 0, max: 1, passo: 1, padrao: 1, padraoNBR: 0, booleana: true, fonteNBR: 'NBR 6118, 17.3.2.1.1: Ic da seção bruta', fonte: 'Manual de cálculo do programa de referência (inércia bruta, homogeneizada e fissurada); αe = Es/Ecs', aConfirmar: false,
    descricao: 'Estádio I com as armaduras homogeneizadas (αe = Es/Ecs) no momento de fissuração e na inércia de Branson das seções retangulares. 0 = seção bruta de concreto.' },
  { chave: 'flechaRotacaoBalanco', rotulo: 'Giro do apoio na flecha dos balanços', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'Manual de cálculo do programa de referência (rotações por caso na integração); giro elástico do pórtico [a confirmar]', aConfirmar: true,
    descricao: 'Soma à flecha da ponta do balanço o giro do apoio no pórtico × comprimento. 0 = tangente fixa no apoio.' },
  { chave: 'fissuracaoLajes', rotulo: 'Lajes maciças: fissuração na flecha (Branson)', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 6118, 17.3.1 e 17.3.2.1.1 (Mr = α·fct·Ic/yt e Branson); grelha recomposta com a rigidez fissurada [a confirmar o método]', aConfirmar: true,
    descricao: 'No método da NBR (fatores simplificados em 0), a rigidez de cada barra de laje maciça da grelha é reduzida por Branson com o momento quase permanente e a armadura calculada, e a grelha é resolvida de novo. Treliçadas sem fissuração (redutor `vigotaRigidez`).' },
  { chave: 'inerciaMediaVao', rotulo: 'Lajes: inércia média do vão', min: 0, max: 1, passo: 1, padrao: 0, booleana: true, fonte: 'Manual de cálculo do programa de referência: Ie = [(Ie,esq + Ie,dir)/2 + Ie,centro]/2 (como opção); padrão integração por seção', aConfirmar: true,
    descricao: '1 = uma inércia por laje e direção, média entre a dos apoios (barra mais fissurada nos negativos) e a do centro; 0 = Branson em cada barra.' },
  { chave: 'limiteFlechaAtiva', rotulo: 'Limite da flecha ativa (vão / …)', min: 0, max: 2000, passo: 10, padrao: 500, fonte: 'NBR 6118, Tabela 13.3 (efeitos em elementos não estruturais: paredes, ℓ/500 e 10 mm)', aConfirmar: false,
    descricao: 'Flecha ocorrida depois das paredes (ativa) ≤ vão / este valor e ≤ o limite absoluto; balanço: 2 × vão. 0 = sem a parcela relativa.' },
  { chave: 'limiteFlechaAtivaAbs', rotulo: 'Limite absoluto da flecha ativa', unidade: 'cm', min: 0, max: 10, passo: 0.1, padrao: 1, fonte: 'NBR 6118, Tabela 13.3 (10 mm)', aConfirmar: false,
    descricao: 'Valor máximo da flecha ativa (cm). 0 = sem limite absoluto.' },
  { chave: 'limiteFlechaInst', rotulo: 'Limite da flecha instantânea total (vão / …)', min: 0, max: 2000, passo: 10, padrao: 0, fonte: 'Opção do programa de referência (limites opcionais de flecha instantânea); a NBR não fixa', aConfirmar: false,
    descricao: 'Flecha instantânea de G + Q ≤ vão / este valor (aviso). 0 = sem verificação.' },
  { chave: 'fatorFlechaAtiva', rotulo: 'Fator simplificado da flecha ativa (maciças)', unidade: '× elástica', min: 0, max: 5, passo: 0.05, padrao: 2, padraoNBR: 0, fonteNBR: 'NBR 6118, 17.3.2.1.2: método por etapas', fonte: 'Tabela-resumo do manual de cálculo do programa de referência (integridade: 2,0 maciça, combinação gravitacional mais desfavorável)', aConfirmar: false,
    descricao: 'Flecha ativa das lajes maciças = elástica de G + Q × este fator. 0 = pelas etapas de carga.' },
  { chave: 'fatorFlechaAtivaTrelicada', rotulo: 'Fator simplificado da flecha ativa (treliçadas)', unidade: '× elástica', min: 0, max: 5, passo: 0.05, padrao: 1.75, padraoNBR: 0, fonteNBR: 'NBR 6118, 17.3.2.1.2: método por etapas', fonte: 'Tabela-resumo do manual de cálculo do programa de referência (integridade: 1,75 nervurada/treliçada)', aConfirmar: false,
    descricao: 'Flecha ativa das lajes treliçadas = elástica de G + Q × este fator. 0 = pelas etapas de carga.' },
  { chave: 'fatorFlechaConforto', rotulo: 'Fator simplificado da flecha da variável (maciças)', unidade: '× elástica', min: 0, max: 5, passo: 0.05, padrao: 1.5, padraoNBR: 0, fonteNBR: 'NBR 6118, Tabela 13.3: flecha imediata da variável', fonte: 'Tabela-resumo do manual de cálculo do programa de referência (conforto: 1,50 maciça, caso de carga variável)', aConfirmar: false,
    descricao: 'Flecha da variável das lajes maciças = elástica de Q × este fator. 0 = instantânea pelo método (com fissuração, se ligada).' },
  { chave: 'fatorFlechaConfortoTrelicada', rotulo: 'Fator simplificado da flecha da variável (treliçadas)', unidade: '× elástica', min: 0, max: 5, passo: 0.05, padrao: 1.25, padraoNBR: 0, fonteNBR: 'NBR 6118, Tabela 13.3: flecha imediata da variável', fonte: 'Tabela-resumo do manual de cálculo do programa de referência (conforto: 1,25 nervurada/treliçada)', aConfirmar: false,
    descricao: 'Flecha da variável das lajes treliçadas = elástica de Q × este fator. 0 = instantânea pelo método.' },
  // ---- N2g: resistência ao fogo ----
  { chave: 'fogoTRRF', rotulo: 'TRRF padrão', unidade: 'min', min: 30, max: 240, passo: 30, padrao: 60, fonte: 'NBR 14432 e ITs estaduais dependem da ocupação e da altura; 60 min é o valor de um edifício residencial ou comercial de 12 a 23 m, adotado como padrão [a confirmar]', aConfirmar: true,
    descricao: 'Tempo requerido de resistência ao fogo dos grupos sem TRRF próprio nem ocupação informada (grupo Incêndio do edifício). A verificação só roda com o estado-limite “Resistência ao fogo” ativo.' },
  { chave: 'fogoPilarMetodo', rotulo: 'Pilares em incêndio: método', min: 0, max: 1, passo: 1, padrao: 0, fonte: 'NBR 15200:2012, método analítico dos pilares (TRF) [equações transcritas de monografia que reproduz a norma; a confirmar]; tabular da edição de 2004 como alternativa simplificada', aConfirmar: true,
    descricao: '0 = método analítico (TRF calculado, exige excentricidade ≤ 0,15·b, c1 entre 25 e 80 mm, b′ ≥ 190 mm, ℓef,fi ≤ 6 m e As ≤ 4 % de Ac); 1 = Tabela 10 da edição de 2004 (bmín/c1 por μfi).' },
  { chave: 'fogoMuFi', rotulo: 'Pilares em incêndio: μfi', min: 0.1, max: 1, passo: 0.05, padrao: 0.7, fonte: 'NBR 15200:2012: μfi = NSd,fi/NRd com NSd,fi = 0,7·NSd; a favor da segurança NSd = NRd e μfi = 0,7', aConfirmar: false,
    descricao: 'Nível de carregamento do pilar em situação de incêndio. O programa não calcula NRd do pilar: 0,7 é o limite normativo; reduza só com NRd conferido (valor por pilar em “Incêndio”).' },
  { chave: 'fogoFacesPilar', rotulo: 'Pilares em incêndio: faces expostas', min: 1, max: 4, passo: 1, padrao: 4, fonte: 'NBR 15200:2012 (tabela de uma face exposta; analítico e tabular para mais de uma); pilares de borda com parede de vedação podem ter menos faces expostas [a confirmar]', aConfirmar: true,
    descricao: 'Número de faces do pilar expostas ao fogo (4 = pilar isolado, a favor da segurança); por pilar em “Incêndio”.' },
  { chave: 'fogoLefReducao', rotulo: 'Pilares em incêndio: ℓef,fi reduzido', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 15200:2012: ℓef,fi = 0,5·ℓe (pavimentos intermediários) e 0,7·ℓe (último) com efeitos globais de 2ª ordem ≤ 10 % (γz ≤ 1,1)', aConfirmar: false,
    descricao: '1 = adota o comprimento reduzido quando γz ≤ 1,1; com γz maior ou 0, ℓef,fi = ℓe (a norma admite análise específica nesse caso).' },
  { chave: 'fogoLajeCompartimentadora', rotulo: 'Lajes compartimentadoras (função corta-fogo)', min: 0, max: 1, passo: 1, padrao: 1, booleana: true, fonte: 'NBR 15200: a espessura mínima das tabelas de lajes garante a função corta-fogo (isolamento e estanqueidade); lajes de pavimento costumam separar compartimentos [a confirmar]', aConfirmar: true,
    descricao: '1 = verifica também a espessura mínima (isolamento) das lajes; 0 = só a distância c1 (estabilidade). Por laje em “Incêndio”.' },
];

// ---- o que cada opção refaz (R7f) ----
/** Opções lidas pela análise estrutural (rigidez, malha, vento, base elástica): mudar uma refaz a análise. */
export const OPCOES_ANALISE: ReadonlySet<keyof OpcoesCalculo> = new Set<keyof OpcoesCalculo>([
  'malha', 'torcaoViga', 'torcaoLaje', 'torcaoPilar', 'axialPilares', 'trechoRigido', 'engasteTopoUltimo', 'zonasIndependentes', 'limiteGamaZ',
  'limiteDeslocTopo', 'limiteDeslocPavimento', 'vigotaRigidez', 'modeloGlobal', 'cortanteBarrasLaje', 'malhaCasca', 'aberturaDiafragma', 'categoriasUso', 'radierK', 'radierMalha', 'corridaBPadrao', 'corridaHPadrao', 'fundBalancoAltura',
  // N2c: P-Δ 3D no lugar do γz e trecho rígido no topo dos pilares (face inferior da viga) entram no modelo de cálculo
  'segundaOrdem', 'pilarComprimento',
  // E1a: engaste da base do pilar apoiado em viga ou laje (transição) entra na rigidez do modelo
  'engasteTransicao',
  // E1b: modelo do pilar-parede (casca ou barra) e viga fictícia do topo
  'pilarParedeLimite', 'pilarParedeVigaAltura',
  // N2e: trecho rígido da viga apoiada, barras curtas e desnível entre panos entram no modelo de cálculo
  'vigaApoiadaRigida', 'barraCurtaLimite', 'barraCurtaFator', 'lajeDesnivelFator',
]);
/**
 * Opções que só mexem no dimensionamento e no detalhamento (N2c incluída: `pilarLancesDesligados`, `pilarFluencia` e
 * `pilarTaxaMin` são lidas só por `dimensionarPilares`/`flambagemLance` sobre a análise vigente). Mudar uma refaz o
 * dimensionamento sem nova análise (R7f). Toda opção nova precisa estar em OPCOES_ANALISE, aqui ou nos prefixos de
 * fundação/base elástica abaixo (`rearmar.test.ts` reprova opção sem classificação).
 */
export const OPCOES_DETALHE: ReadonlySet<string> = new Set<string>([
  'woodArmer', 't0Flecha', 'fatorFlechaLaje', 'limiteFlechaTotal', 'limiteFlechaSensorial', 'redistribuicao', 'momentoMinPositivo',
  'momentoMinNegativo', 'cortanteApoio', 'cortanteDistancia', 'verificarTorcao', 'limiteFissura', 'barraMaxima', 'arredondamento', 'perdasAco',
  'bitolaMontagem', 'vigaReducaoLb', 'vigaNegativoVao', 'vigaReforcoVao', 'vigaSimetriaNegativos', 'vigaNegativosUnir', 'vigaMontagemContinua',
  'vigaMontagemColaborante', 'vigaMontagemGancho', 'vigaMontagemEixo', 'vigaPernaGancho', 'vigaEstriboExtensao', 'vigaEstriboZonaMin',
  'vigaEstriboSimetria', 'vigaEstriboGancho', 'vigaEstriboU', 'vigaAsMinPonto', 'vigaFatorEmenda', 'vigaDesnivelLimite', 'continuidadePilares', 'pilarSimetria', 'pilarBarraMaxima', 'pilarUniaoLances',
  'ancoragemReduzidaTopo', 'pilarContinuidadeInicio', 'pilarContinuidadeFaces', 'pilarProlongarSemViga', 'pilarCorteTopo',
  'pilarReducaoIntermediarios', 'pilarReducaoMinimo', 'pilarAdensamento', 'pilarAdensamentoAltura', 'pilarAdensamentoEspacamento',
  'pilarInsuficienteSemDesenho', 'lajeNegativoVao', 'lajeNegativoBorda', 'lajeDecalagem', 'lajeBitolaMinima', 'lajeEspacamentoMinimo',
  'lajeArmaduraCanto', 'lajePernasNegativos', 'lajeBaseDetalhada', 'lajeBaseEmendaApoio', 'lajeReforcoReducao', 'lajeTelaTraspasse',
  'lajeEmendaConstrutiva', 'lajeUniformizarPilares', 'lajeUniformizarPilaresLargura', 'lajeArmaduraMedia', 'lajeSiglaReforco', 'lajeNumeracao',
  'vigotaMomentoMinPositivo', 'vigotaMomentoMinNegativo', 'vigotaIgualacao', 'vigotaIgualacaoDif', 'vigotaNegativoVao', 'equGamaFav', 'equGamaVento',
  'puncaoVerificar', 'puncaoTipoArmadura', 'puncaoS0', 'puncaoSr', 'puncaoFuroDist', 'puncaoVigaChata', 'cortanteLajes', 'cortanteVarredura',
  'cortanteVarreduraPasso', 'pilarLancesDesligados', 'pilarFluencia', 'pilarTaxaMin', 'rearmarLimiteRigidez',
  'vigaApoioLongProlong', 'vigaApoioLongBarras', 'vigaApoioLongVao',
  'arredondamentoApoio', 'momentoFaceMin', 'envoltoriaCortante', 'vigaTaxaMin', 'lajeTaxaMin', 'vigaEstriboSmax', 'vigaEstriboSmin',
  'lajeMomentoMinPositivo', 'lajeMomentoMinNegativo', 'vigaSuspensao', 'vigaSuspensaoFator', 'criterioLinear', 'cargaProximaApoio', 'vigaEstriboComprimida',
  // N2f: flechas por etapas (só o dimensionamento)
  'flechaEtapas', 'flechaQInstantanea', 'flechaRhoLinha', 'inerciaHomogeneizada', 'flechaRotacaoBalanco', 'fissuracaoLajes', 'inerciaMediaVao',
  'limiteFlechaAtiva', 'limiteFlechaAtivaAbs', 'limiteFlechaInst', 'fatorFlechaAtiva', 'fatorFlechaAtivaTrelicada', 'fatorFlechaConforto', 'fatorFlechaConfortoTrelicada',
  // N2g: resistência ao fogo (só o dimensionamento)
  'fogoTRRF', 'fogoPilarMetodo', 'fogoMuFi', 'fogoFacesPilar', 'fogoLefReducao', 'fogoLajeCompartimentadora',
]);
const RE_BASE_ELASTICA = /^(corrida|radier)/;
const RE_FUNDACAO = /^(fund|gerar|viga(Eq|Trav|Fund))/;
/**
 * O que mudar a opção refaz: `true` = a análise (e tudo depois); `'fundacao'` = só as fundações; `'detalhe'` = só o
 * dimensionamento e o detalhamento sobre a análise vigente. Opções das sapatas corridas e dos radiers, que entram na
 * base elástica da análise, contam como análise.
 */
export function efeitoDaOpcao(chave: string): true | 'fundacao' | 'detalhe' {
  if (OPCOES_ANALISE.has(chave as keyof OpcoesCalculo)) return true;
  if (RE_FUNDACAO.test(chave)) return 'fundacao';
  if (RE_BASE_ELASTICA.test(chave)) return true;
  return 'detalhe';
}
/** A opção tem classificação explícita (análise, detalhe, fundação ou base elástica)? */
export const opcaoClassificada = (chave: string): boolean => OPCOES_ANALISE.has(chave as keyof OpcoesCalculo) || OPCOES_DETALHE.has(chave) || RE_FUNDACAO.test(chave) || RE_BASE_ELASTICA.test(chave);

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
  for (const p of b.pilares) {
    // N2c: vínculo externo, cota da base e travamentos intermediários
    const vb = p.vinculoBase;
    if (vb?.tipo === 'rotula') out.push(`Pilar ${p.nome}: base rotulada (giros de flexão livres).`);
    if (vb?.tipo === 'molas') {
      const ks = (['kx', 'ky', 'kz', 'krx', 'kry', 'krz'] as const).map((k) => `${k} ${vb[k] === undefined ? 'preso' : vb[k] === 0 ? 'livre' : `${f(vb[k]!)} ${k.startsWith('kr') ? 'kN·m/rad' : 'kN/m'}`}`);
      out.push(`Pilar ${p.nome}: base sobre molas (${ks.join('; ')}).`);
    }
    if (p.cotaBase !== undefined) out.push(`Pilar ${p.nome}: base na cota ${f(p.cotaBase)} m.`);
    for (const a of p.apoiosIntermediarios ?? []) out.push(`Pilar ${p.nome}, lance até ${pav(a.pavimento)}: travamento a ${f(a.altura)} m da base${a.direcao ? ` (direção ${a.direcao})` : ''}.`);
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
