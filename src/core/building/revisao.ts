// Revisão de resultados (frente R1): erros e avisos por elemento com código do motivo, a partir das mensagens do
// dimensionamento e dos avisos da análise. Erro = o elemento não atende (vermelho na planta); aviso = atende, mas
// pede atenção (amarelo); informação (redistribuição aplicada, resumo das vigotas) fica só na linha do elemento.
import type { AnaliseEdificio } from './analitico';
import type { Dimensionamento } from './dimensionamento';
import { estadoEmUso } from './acoes';
import { sugestaoDe } from './sugestoes';
import { diagnosticosEscadas } from './escadas';
import type { BuildingModel, EstadoId } from './types';

export type NivelRevisao = 'erro' | 'aviso';
export type TipoRevisao = 'viga' | 'pilar' | 'laje' | 'fundacao' | 'obra' | 'pilarParede' | 'parede' | 'inclinada' | 'diagonal' | 'consolo' | 'escada';

export interface ItemRevisao {
  tipo: TipoRevisao;
  /** Id do elemento (ausente nos itens da obra). */
  id?: string;
  nome: string;
  /** Nome do pavimento (pilares: lance; lajes: pavimento); vigas valem para o grupo. */
  pavimento?: string;
  nivel: NivelRevisao;
  codigo: string;
  mensagem: string;
  /** Sugestão de correção do código (R7g). */
  sugestao?: string;
}

/** Códigos dos motivos, com nível e descrição curta (legenda da lista). */
export const CODIGOS_REVISAO: { codigo: string; nivel: NivelRevisao | 'info'; re: RegExp; descricao: string }[] = [
  { codigo: 'BIELA', nivel: 'erro', re: /^Biela comprimida/, descricao: 'Compressão diagonal (cortante e torção)' },
  { codigo: 'LARGURA', nivel: 'erro', re: /^Armadura inferior não cabe/, descricao: 'Armadura não cabe na largura' },
  { codigo: 'FLECHA', nivel: 'erro', re: /^Flecha total/, descricao: 'Flecha total acima do limite' },
  { codigo: 'FLECHA_Q', nivel: 'erro', re: /^Flecha das variáveis/, descricao: 'Flecha das cargas variáveis acima do limite' },
  { codigo: 'FLECHA_ATIVA', nivel: 'erro', re: /^Flecha ativa/, descricao: 'Flecha ativa (após as paredes) acima do limite' },
  { codigo: 'FLECHA_INST', nivel: 'aviso', re: /^Flecha instantânea/, descricao: 'Flecha instantânea acima do limite opcional' },
  { codigo: 'FOGO_TRRF', nivel: 'erro', re: /^Fogo: TRRF de .* não atendido/, descricao: 'Resistência ao fogo: TRF abaixo do TRRF (NBR 15200)' },
  { codigo: 'FOGO_FORA_TABELA', nivel: 'aviso', re: /^Fogo: TRRF de .* fora das tabelas/, descricao: 'Resistência ao fogo: TRRF além das tabelas implementadas' },
  { codigo: 'FOGO_LIMITES', nivel: 'aviso', re: /^Fogo: método analítico fora dos limites/, descricao: 'Resistência ao fogo: método analítico fora dos limites da norma' },
  { codigo: 'FISSURA', nivel: 'erro', re: /^Abertura de fissuras/, descricao: 'Abertura de fissuras acima do limite' },
  { codigo: 'ARM_BLOQ', nivel: 'erro', re: /^Armadura bloqueada (insuficiente|acima)/, descricao: 'Armadura bloqueada não atende' },
  { codigo: 'BLOQ_IGNORADO', nivel: 'aviso', re: /^Armadura bloqueada desconsiderada/, descricao: 'Bloqueio desconsiderado (vãos ou lances mudaram)' },
  { codigo: 'ESFORCO_ANTIGO', nivel: 'aviso', re: /^Esforços antigos/, descricao: 'Rearmado com os esforços de uma análise anterior e a inércia do elemento variou além do limite: refaça a análise' },
  { codigo: 'AGRUP_IGNORADO', nivel: 'aviso', re: /^Agrupamento .* desconsiderado/, descricao: 'Agrupamento de pórticos não aplicado (número de vãos ou seção diferentes, ou armadura sem solução)' },
  { codigo: 'AGRUP_BLOQ', nivel: 'aviso', re: /^Agrupamento .*: a armadura bloqueada/, descricao: 'Pórtico agrupado com armadura bloqueada própria: fica fora da equalização' },
  { codigo: 'ARMADURA', nivel: 'erro', re: /^(Nenhuma armadura|Não atende com até 4)/, descricao: 'Seção insuficiente com a armadura máxima' },
  { codigo: 'ESTRIBO_BITOLA', nivel: 'erro', re: /^Estribo φ.* acima de bw\/10/, descricao: 'Viga: bitola do estribo acima de bw/10 (18.3.3.2)' },
  { codigo: 'DESNIVEL_LONG', nivel: 'aviso', re: /^Desnível longitudinal/, descricao: 'Vigas alinhadas com faces desniveladas: detalhe especial' },
  { codigo: 'TRAMO_IGNORADO', nivel: 'aviso', re: /^Tramo predefinido desconsiderado/, descricao: 'Tramo predefinido não aplicado (vigas, bitola ou barra máxima)' },
  { codigo: 'DETALHE_INSUF', nivel: 'erro', re: /^Detalhe editado insuficiente/, descricao: 'Viga: detalhamento editado não cobre a armadura necessária ou os estribos' },
  { codigo: 'DETALHE_IGNORADO', nivel: 'aviso', re: /^Detalhe editado (desconsiderado|:)/, descricao: 'Viga: edição do detalhamento desconsiderada ou fora da barra máxima' },
  { codigo: 'PILAR_DET_INSUF', nivel: 'erro', re: /^[^:]+: detalhe editado insuficiente/, descricao: 'Pilar: espera, traspasse ou ancoragem editados abaixo do mínimo' },
  { codigo: 'PILAR_DET_IGNORADO', nivel: 'aviso', re: /^[^:]+: detalhe editado desconsiderado/, descricao: 'Pilar: edição dos comprimentos desconsiderada (lances mudaram ou passagem sem emenda)' },
  { codigo: 'ARRANQUE_ANCORAGEM', nivel: 'erro', re: /^[^:]+: ancoragem das esperas/, descricao: 'Pilar apoiado: ancoragem das esperas na viga ou laje de apoio não cabe em h − c, nem com gancho' },
  { codigo: 'TRANSICAO_CORTANTE', nivel: 'erro', re: /^Transição [^:]+ \(Nd/, descricao: 'Viga de transição: cortante junto às faces do pilar acima de VRd3 dos estribos adotados' },
  { codigo: 'VIGA_MESA', nivel: 'info', re: /^Mesa colaborante: /, descricao: 'Viga T ou L: largura colaborante e critério de flexão' },
  { codigo: 'VIGA_AMARRACAO', nivel: 'info', re: /^Amarração: /, descricao: 'Viga de amarração: sem rigidez à flexão vertical' },
  { codigo: 'VIGA_CURVA_DESVIO', nivel: 'aviso', re: /^Desvio da armadura em viga curva: /, descricao: 'Viga curva: força radial da armadura longitudinal a equilibrar pelos estribos (verificação a confirmar)' },
  { codigo: 'INCLINADA_ARMADURA', nivel: 'erro', re: /^Viga inclinada: (nenhuma disposição|a armadura informada|armadura longitudinal|as barras da armadura|a busca da armadura|estribo φ)/, descricao: 'Viga inclinada: armadura longitudinal ou estribos não atendem (flexo-compressão oblíqua, cortante e torção)' },
  { codigo: 'INCLINADA_ESBELTEZ_MAX', nivel: 'erro', re: /^Viga inclinada: esbeltez λ = \d+ acima de 200/, descricao: 'Viga inclinada: esbeltez acima de 200' },
  { codigo: 'INCLINADA_ESBELTEZ', nivel: 'aviso', re: /^Viga inclinada: esbeltez λ = \d+ acima de 90/, descricao: 'Viga inclinada: esbeltez acima de 90 (pilar-padrão não vale; resultado indicativo)' },
  { codigo: 'INCLINADA_BIELA', nivel: 'erro', re: /^Viga inclinada: compressão diagonal/, descricao: 'Viga inclinada: compressão diagonal do concreto esgotada (cortante e torção)' },
  { codigo: 'INCLINADA_NOS', nivel: 'info', re: /^Viga inclinada: o detalhe dos nós/, descricao: 'Viga inclinada: detalhe dos nós de extremidade a cargo do projetista' },
  { codigo: 'DIAGONAL_ARMADURA', nivel: 'erro', re: /^Diagonal: (nenhuma disposição|a armadura informada|armadura longitudinal|as barras da armadura|a busca da armadura|estribo φ)/, descricao: 'Diagonal: armadura longitudinal ou estribos não atendem (tração ou compressão com flexão oblíqua, cortante e torção)' },
  { codigo: 'DIAGONAL_ESBELTEZ_MAX', nivel: 'erro', re: /^Diagonal: esbeltez λ = \d+ acima de \d+ \(/, descricao: 'Diagonal comprimida: esbeltez acima do máximo' },
  { codigo: 'DIAGONAL_ESBELTEZ', nivel: 'aviso', re: /^Diagonal: esbeltez λ = \d+ acima de 90:/, descricao: 'Diagonal comprimida: esbeltez acima de 90 (pilar-padrão não vale; resultado indicativo)' },
  { codigo: 'DIAGONAL_BIELA', nivel: 'erro', re: /^Diagonal: compressão diagonal/, descricao: 'Diagonal: compressão diagonal do concreto esgotada (cortante e torção)' },
  { codigo: 'DIAGONAL_CRUZAMENTO', nivel: 'info', re: /^Diagonal: (nó gerado|\d+ nós gerados) no cruzamento/, descricao: 'Diagonal: nó gerado no cruzamento com outra diagonal (flambagem pelo comprimento total)' },
  { codigo: 'DIAGONAL_NOS', nivel: 'info', re: /^Diagonal: o detalhe dos nós/, descricao: 'Diagonal: detalhe dos nós de extremidade a cargo do projetista' },
  { codigo: 'CONSOLO_ARMADURA', nivel: 'erro', re: /^Consolo: (a armadura informada|o tirante|estribos horizontais|estribos verticais)/, descricao: 'Consolo: tirante, estribos de costura ou verticais menores que o necessário, ou o tirante não cabe em uma camada' },
  { codigo: 'CONSOLO_BIELA', nivel: 'erro', re: /^Consolo: biela comprimida/, descricao: 'Consolo: compressão da biela junto ao aparelho acima do limite' },
  { codigo: 'CONSOLO_APOIO', nivel: 'erro', re: /^Consolo: tensão de contato/, descricao: 'Consolo: tensão de contato sob o aparelho de apoio acima do limite' },
  { codigo: 'CONSOLO_CORTANTE', nivel: 'erro', re: /^Consolo: cortante de cálculo/, descricao: 'Consolo: cortante acima de VRd2' },
  { codigo: 'CONSOLO_GEOMETRIA', nivel: 'erro', re: /^Consolo: geometria/, descricao: 'Consolo: geometria incoerente (altura útil, altura na ponta, aparelho fora do balanço ou mais largo que o consolo)' },
  { codigo: 'CONSOLO_LONGO', nivel: 'aviso', re: /^Consolo: a\/d/, descricao: 'Consolo com a/d acima de 1: calculado como viga em balanço' },
  { codigo: 'CONSOLO_ANCORAGEM', nivel: 'aviso', re: /^Consolo: ancoragem/, descricao: 'Consolo: ancoragem do tirante sob o aparelho exige laço ou barras transversais soldadas' },
  { codigo: 'PREMOLDADA_ICAMENTO', nivel: 'erro', re: /^Pré-moldada: içamento/, descricao: 'Viga pré-moldada: momentos de içamento acima da resistência das armaduras adotadas' },
  { codigo: 'PREMOLDADA_FICHA', nivel: 'erro', re: /^Pré-moldada: ficha/, descricao: 'Viga pré-fabricada: esforço de cálculo acima do resistente da ficha do fabricante' },
  { codigo: 'PREMOLDADA_ARTICULADA', nivel: 'info', re: /^Pré-moldada: ligações articuladas/, descricao: 'Viga pré-moldada: ligações articuladas por padrão' },
  { codigo: 'VINCULO_PILAR', nivel: 'aviso', re: /^Vínculo externo: o pilar/, descricao: 'Viga de vínculo externo coincide com um pilar (travaria o deslocamento vertical)' },
  { codigo: 'VINCULO_EXTERNO', nivel: 'info', re: /^Vínculo externo: a viga simula/, descricao: 'Viga de vínculo externo: topo de muro, não dimensionada' },
  { codigo: 'VINCULO_MODELO', nivel: 'aviso', re: /^Vínculo externo: os apoios contínuos/, descricao: 'Vínculo externo não entra no modelo integrado' },
  { codigo: 'VIGA_CURVA', nivel: 'info', re: /^Viga curva: /, descricao: 'Viga curva: raio, discretização em cordas e torção de equilíbrio da curvatura' },
  { codigo: 'VIGA_COMUM', nivel: 'info', re: /^Viga comum com o grupo /, descricao: 'Viga comum a dois grupos: barra única, armadura e envoltórias na origem' },
  { codigo: 'VIGA_COMUM_APOIA_VIGA', nivel: 'aviso', re: /^Viga comum: .* chega à viga associada/, descricao: 'Viga comum: outra viga chega à associada fora de pilar (reação não levada à origem)' },
  { codigo: 'VIGA_CHATA_ALTURA', nivel: 'aviso', re: /^Viga chata: altura/, descricao: 'Viga chata com altura diferente da laje que contorna' },
  { codigo: 'TRANSICAO', nivel: 'info', re: /^Transição: /, descricao: 'Viga de transição: pilar apoiado, carga e cortante nas faces' },
  { codigo: 'PILAR_CORTE_TOPO', nivel: 'aviso', re: /^[^:]+: barras cortadas no topo/, descricao: 'Pilar: barras cortadas no topo do último lance, sem ancoragem (só desenho e medição)' },
  { codigo: 'LAJE_PREDEF_FORA', nivel: 'aviso', re: /^Predefinida .* sai do pano/, descricao: 'Laje: armadura predefinida sai do pano' },
  { codigo: 'LAJE_PREDEF_COMPRIMENTO', nivel: 'aviso', re: /^Predefinida .* barra máxima/, descricao: 'Laje: armadura predefinida mais longa que a barra máxima' },
  { codigo: 'LAJE_BASE_TELA', nivel: 'erro', re: /^Tela \S+ da base (inferior|superior) não está no catálogo/, descricao: 'Laje: tela da base fora do catálogo da NBR 7481' },
  { codigo: 'LAJE_REFORCO_NAO_CABE', nivel: 'erro', re: /^Reforço da positiva na direção/, descricao: 'Laje: reforço sobre a base não cabe (espaçamento ou bitola)' },
  { codigo: 'LAJE_SEM_CALCULO', nivel: 'aviso', re: /^Armadura gerada sem cálculo/, descricao: 'Laje: armadura gerada só com a geometria (mínimos e base), sem verificar contra os esforços' },
  { codigo: 'LAJE_EDIT_BARRA_MAX', nivel: 'aviso', re: /^Posição editada .* barra máxima/, descricao: 'Laje: posição editada mais longa que a barra máxima' },
  { codigo: 'LAJE_ZONA_VAZIA', nivel: 'aviso', re: /^Zona de uniformização .* atinge/, descricao: 'Laje: zona de uniformização sem barras suficientes (face ou direção sem barras)' },
  { codigo: 'FORA_TABELA', nivel: 'erro', re: /^Fora de tabela \((barras|estribos)\)/, descricao: 'Viga: armadura sem solução na tabela (φ25 ou estribo fora do mínimo da tabela)' },
  { codigo: 'FORA_TABELA_MONTAGEM', nivel: 'aviso', re: /^Fora de tabela \((montagem|adicional)\)/, descricao: 'Viga: bitola de montagem ou adicional fora da lista da tabela (trocada pela maior da lista que não a supera)' },
  { codigo: 'ARM_MANUAL', nivel: 'erro', re: /^Armadura manual necessária/, descricao: 'Pilar: nem a tabela nem a armadura própria atendem (amplie a tabela ou a seção)' },
  { codigo: 'FORA_TABELA_PILAR', nivel: 'aviso', re: /^Fora de tabela \(pilar\)/, descricao: 'Pilar: armadura própria fora da tabela' },
  { codigo: 'FORA_TABELA_LAJE', nivel: 'aviso', re: /^Fora de tabela \(laje\)/, descricao: 'Laje: armadura necessária não cabe nas bitolas e espaçamentos da tabela' },
  { codigo: 'ESBELTEZ', nivel: 'erro', re: /^λ > 200/, descricao: 'Esbeltez acima de 200' },
  { codigo: 'ESBELTEZ_90', nivel: 'aviso', re: /^λ > 90/, descricao: 'Esbeltez acima de 90: fluência (15.8.4) e, acima de 140, método geral (o aviso informa o método usado)' },
  { codigo: 'GRAMPOS_TABELA', nivel: 'aviso', re: /^Grampos fora da NBR 6118/, descricao: 'Pilar: a tabela de grampos dispensa grampos que a NBR 6118 (18.2.4) pede' },
  { codigo: 'ESTRIBO_TABELA', nivel: 'aviso', re: /^Estribo fora da tabela/, descricao: 'Pilar: estribos e grampos não cabem na tabela; só um estribo foi colocado (revisar a tabela e a disposição)' },
  { codigo: 'LANCES_DESLIGADOS', nivel: 'info', re: /^Lances desligados/, descricao: 'Pilar: lances sem travamento somados no comprimento de flambagem' },
  { codigo: 'ARM_DUPLA', nivel: 'aviso', re: /^Armadura dupla/, descricao: 'Armadura dupla (x limitado)' },
  { codigo: 'CA60', nivel: 'aviso', re: /^CA-60/, descricao: 'Bitola acima de φ10 em CA-60' },
  { codigo: 'TRACAO', nivel: 'aviso', re: /^Tração em/, descricao: 'Pilar tracionado' },
  { codigo: 'GAMA_N', nivel: 'aviso', re: /^γn/, descricao: 'Seção pequena (γn)' },
  { codigo: 'ARM_AUMENTADA', nivel: 'aviso', re: /^Armadura aumentada/, descricao: 'Armadura aumentada pela fissuração' },
  { codigo: 'TORCAO', nivel: 'aviso', re: /^Torção Td/, descricao: 'Torção: armadura longitudinal adicional' },
  { codigo: 'ESTRIBO_V', nivel: 'aviso', re: /^Estribos pelo cortante/, descricao: 'Estribo do pilar pelo cortante' },
  { codigo: 'REDISTRIB', nivel: 'info', re: /^Redistribuição/, descricao: 'Redistribuição aplicada' },
  // vigas e pilares: apoios, limites e avisos de modelagem (N2e)
  { codigo: 'ARREDONDAMENTO', nivel: 'info', re: /^Arredondamento do diagrama/, descricao: 'Diagrama arredondado dentro dos apoios internos (cúbica entre as faces ou ΔM = R·t/8)' },
  { codigo: 'VIGA_PAREDE', nivel: 'aviso', re: /^Viga-parede/, descricao: 'Viga-parede (ℓ/h < 2 biapoiada ou < 3 contínua): bielas e tirantes e armadura manuais' },
  { codigo: 'NAO_LINEAR', nivel: 'aviso', re: /^Elemento não linear/, descricao: 'Trecho curto demais para o modelo de barra (NBR 6118, 14.4.1): tratar à parte' },
  { codigo: 'VIGA_PLACA', nivel: 'aviso', re: /^Elemento de placa/, descricao: 'Largura maior que 2 × o vão: lançar como laje' },
  { codigo: 'CONSOLO', nivel: 'aviso', re: /^Consolo curto/, descricao: 'Balanço com comprimento ≤ d: consolo curto, tratar à parte' },
  { codigo: 'PILAR_CURTO', nivel: 'aviso', re: /^Pilar curto/, descricao: 'Pilar curto (altura < 3 × a maior dimensão): modelo linear não vale' },
  { codigo: 'CARGA_PROXIMA_APOIO', nivel: 'aviso', re: /^Carga próxima ao apoio/, descricao: 'Carga concentrada a menos de 2d do apoio (≤ d: biela-tirante, armadura horizontal manual)' },
  { codigo: 'SUSPENSAO', nivel: 'info', re: /^Suspensão: /, descricao: 'Armadura de suspensão na viga de apoio (apoio indireto, 18.3.6)' },
  { codigo: 'TORCAO_MIN', nivel: 'info', re: /^Torção: estribo fechado/, descricao: 'Torção: estribo fechado e taxa mínima verificados' },
  { codigo: 'ESTRIBO_COMPRIMIDA', nivel: 'info', re: /^Estribos com armadura comprimida/, descricao: 'Estribos limitados por haver armadura longitudinal comprimida' },
  // lajes treliçadas (R6)
  { codigo: 'VIGOTA_ALTURA', nivel: 'erro', re: /^Vigotas: altura insuficiente/, descricao: 'Vigotas: altura insuficiente para a flexão' },
  { codigo: 'VIGOTA_POS', nivel: 'erro', re: /^Vigotas: momento positivo/, descricao: 'Vigotas: momento positivo acima do resistente' },
  { codigo: 'VIGOTA_NEG', nivel: 'erro', re: /^Vigotas: momento negativo/, descricao: 'Vigotas: momento negativo acima do resistente (maciçar ou laje mais alta)' },
  { codigo: 'VIGOTA_NEG_AS', nivel: 'erro', re: /^Vigotas: armadura negativa excessiva/, descricao: 'Vigotas: armadura negativa excessiva' },
  { codigo: 'VIGOTA_CORTANTE', nivel: 'erro', re: /^Vigotas: cortante/, descricao: 'Vigotas: cortante acima de VRd1 (maciçar ou laje mais alta)' },
  { codigo: 'VIGOTA_CAPA', nivel: 'erro', re: /^Vigotas: capa/, descricao: 'Vigotas: capa abaixo do mínimo' },
  { codigo: 'VIGOTA_MACICO', nivel: 'aviso', re: /^Vigotas: maciçamento/, descricao: 'Vigotas: maciçamento extenso (> 2h ou > 20 % do vão)' },
  { codigo: 'VIGOTA_FICHA', nivel: 'info', re: /^Vigotas (por ficha|moldadas): /, descricao: 'Resumo das vigotas por ficha ou moldadas (tipos, momentos, protensão)' },
  // vigotas completas (E3b)
  { codigo: 'VIGOTA_SERIE', nivel: 'erro', re: /^Vigotas: nenhuma vigota da série atende o serviço/, descricao: 'Vigotas protendidas: nenhuma vigota da série atende o momento de serviço do nível de protensão' },
  { codigo: 'VIGOTA_TABELA', nivel: 'aviso', re: /^Vigotas: fora da tabela/, descricao: 'Vigotas: valor fora da tabela da ficha (ampliar a tabela ou laje mais alta); calculado assim mesmo' },
  { codigo: 'VIGOTA_NERVURA_ESTREITA', nivel: 'erro', re: /^Vigotas: armadura não cabe na nervura/, descricao: 'Vigotas moldadas: armadura não cabe na largura da nervura' },
  { codigo: 'VIGOTA_FLECHA', nivel: 'erro', re: /^Vigotas: flecha/, descricao: 'Vigotas: flecha (total, ativa ou das variáveis) acima do limite' },
  { codigo: 'VIGOTA_REDISTRIB', nivel: 'info', re: /^Vigotas: redistribuição/, descricao: 'Vigotas: redistribuição dos negativos aplicada' },
  { codigo: 'VIGOTA_EDICAO', nivel: 'aviso', re: /^Vigotas: a (edição|marcação)/, descricao: 'Vigotas: edição ou marcação de vigota ignorada' },
  { codigo: 'FICHA_INCOERENTE', nivel: 'erro', re: /^Vigotas: ficha incompleta/, descricao: 'Vigotas: a ficha não informa o dado necessário (complete a ficha)' },
  { codigo: 'VIGOTA_APOIO', nivel: 'aviso', re: /^Vigotas: tração inferior/, descricao: 'Vigotas: momento positivo no apoio' },
  // nervuradas bidirecionais (E3c)
  { codigo: 'NERV_MESA', nivel: 'erro', re: /^Nervuradas: mesa/, descricao: 'Nervuradas: mesa abaixo do mínimo (1/15 da distância livre, 4 cm) ou sem resistência à flexão entre as nervuras' },
  { codigo: 'NERV_NERVURA', nivel: 'erro', re: /^Nervuradas: nervura/, descricao: 'Nervuradas: nervura mais estreita que 5 cm' },
  { codigo: 'NERV_COMPRESSAO', nivel: 'info', re: /^Nervuradas: sem armadura de compressão/, descricao: 'Nervuradas: nervura de menos de 8 cm, sem armadura de compressão' },
  { codigo: 'NERV_ESPACAMENTO_MAX', nivel: 'erro', re: /^Nervuradas: espaçamento acima de 110/, descricao: 'Nervuradas: espaçamento acima de 110 cm entre eixos (mesa como laje maciça sobre grelha de vigas)' },
  { codigo: 'NERV_ESPACAMENTO', nivel: 'aviso', re: /^Nervuradas: espaçamento/, descricao: 'Nervuradas: espaçamento acima de 65 cm (flexão da mesa e cisalhamento como viga)' },
  { codigo: 'NERV_FORMA', nivel: 'aviso', re: /^Nervuradas: a cubeta/, descricao: 'Nervuradas: altura da cubeta diferente de altura total − capa' },
  { codigo: 'NERV_FLEXAO', nivel: 'erro', re: /^Nervuradas: flexão/, descricao: 'Nervuradas: flexão da nervura sem solução (armadura dupla, excesso de aço ou nervura estreita)' },
  { codigo: 'NERV_LARGURA', nivel: 'erro', re: /^Nervuradas: armadura não cabe/, descricao: 'Nervuradas: armadura não cabe na largura da nervura' },
  { codigo: 'NERV_CORTANTE', nivel: 'erro', re: /^Nervuradas: cortante/, descricao: 'Nervuradas: cortante acima de VRd2 ou sem estribo possível' },
  { codigo: 'NERV_ARM_DUPLA', nivel: 'aviso', re: /^Nervuradas: armadura dupla/, descricao: 'Nervuradas: armadura dupla no negativo da nervura' },
  { codigo: 'NERV_FISSURA_MAX', nivel: 'erro', re: /^Nervuradas: fissuração acima/, descricao: 'Nervuradas: abertura de fissuras acima do limite' },
  { codigo: 'NERV_FISSURA', nivel: 'aviso', re: /^Nervuradas: fissuração/, descricao: 'Nervuradas: armadura inferior aumentada pela fissuração' },
  // ábacos das nervuradas bidirecionais (E3d); ABACO_VIGA, ABACO_FORA e ABACO_ALTURA vêm dos diagnósticos estáticos (`diagnosticosAbacos`)
  { codigo: 'NERV_ESTRIBO_ABACO', nivel: 'aviso', re: /^Nervuradas: estribos sobre o ábaco/, descricao: 'Nervuradas: estribos na banda maciça sobre o ábaco (cortante acima de VRd1)' },
  { codigo: 'ABACO_FALTA', nivel: 'aviso', re: /^Ábaco: .* sem viga e sem ábaco/, descricao: 'Ábaco: pilar sem viga e sem ábaco na laje nervurada (punção verificada só nas nervuras)' },
  { codigo: 'ABACO_ARMADURA_FORA', nivel: 'aviso', re: /^Ábaco: a armadura de punção/, descricao: 'Ábaco: a armadura de punção passa da borda do ábaco' },
  { codigo: 'NERV_RESUMO', nivel: 'info', re: /^Nervuradas bidirecionais: /, descricao: 'Resumo da laje nervurada bidirecional (forma, peso, nervuras, regime de cisalhamento)' },
  // lajes alveolares (E3e)
  { codigo: 'ALVEOLAR_FORA_TABELA', nivel: 'erro', re: /^Alveolares: nenhuma placa/, descricao: 'Alveolares: nenhuma placa da ficha atende (fora da tabela)' },
  { codigo: 'ALVEOLAR_PLACA', nivel: 'erro', re: /^Alveolares: a placa .* (não atende|fixada não atende)/, descricao: 'Alveolares: placa insuficiente (flexão, serviço, cortante ou negativo na capa)' },
  { codigo: 'ALVEOLAR_TROCAR', nivel: 'aviso', re: /^Alveolares: a placa .* também atende/, descricao: 'Alveolares: outra placa da ficha também atende com menor momento último' },
  { codigo: 'ALVEOLAR_SEM_DADOS', nivel: 'aviso', re: /^Alveolares: a ficha da placa/, descricao: 'Alveolares: a ficha não informa algum dado (momento último, serviço, cortante ou EI); a verificação correspondente não foi feita' },
  { codigo: 'ALVEOLAR_APOIO', nivel: 'erro', re: /^Alveolares: apoio insuficiente/, descricao: 'Alveolares: apoio da placa menor que o mínimo da ficha' },
  { codigo: 'ALVEOLAR_CHANFRO', nivel: 'aviso', re: /^Alveolares: .*(oblíqua|chanfrar)/, descricao: 'Alveolares: placa com apoio oblíquo (canto chanfrado, comprimento pela maior corda)' },
  { codigo: 'ALVEOLAR_LATERAL', nivel: 'aviso', re: /^Alveolares: apoio lateral/, descricao: 'Alveolares: apoio lateral da placa de borda menor que o mínimo' },
  { codigo: 'ALVEOLAR_REDISTRIB', nivel: 'info', re: /^Alveolares: redistribuição/, descricao: 'Alveolares: redistribuição dos negativos aplicada' },
  { codigo: 'ALVEOLAR_BORDA', nivel: 'aviso', re: /^Alveolares: .*placa\(s\) de borda cortada/, descricao: 'Alveolares: placas de borda cortadas longitudinalmente' },
  { codigo: 'ALVEOLAR_LARGURA', nivel: 'aviso', re: /^Alveolares: faixa de/, descricao: 'Alveolares: faixa do pano menor que a largura mínima da placa cortada' },
  { codigo: 'ALVEOLAR_CAPA', nivel: 'erro', re: /^Alveolares: capa/, descricao: 'Alveolares: capa abaixo do mínimo' },
  { codigo: 'ALVEOLAR_RESUMO', nivel: 'info', re: /^Alveolares: alveolar /, descricao: 'Resumo da laje alveolar (placa, número de placas, vão, momento, processo)' },
  // escadas (E4a)
  { codigo: 'ESCADA_ALTURA', nivel: 'erro', re: /^Escada [^:]+, lance \d+.*não fecha o desnível/, descricao: 'Escada: os degraus não fecham o desnível entre os pisos' },
  { codigo: 'ESCADA_BLONDEL', nivel: 'aviso', re: /^Escada [^:]+: 2e \+ p/, descricao: 'Escada: relação de Blondel (2e + p) fora do intervalo' },
  { codigo: 'ESCADA_DIMENSOES', nivel: 'aviso', re: /^Escada [^:]+: (espelho|largura)/, descricao: 'Escada: espelho ou largura fora dos limites' },
  { codigo: 'ESCADA_PAREDE_SUP', nivel: 'aviso', re: /^Escada [^:]+, lance \d+.*parede entre o patamar/, descricao: 'Escada: parede entre o patamar e o piso de cima deve ser lançada como carga linear' },
  { codigo: 'ESCADA_TIPO', nivel: 'erro', re: /^Escada [^:]+, lance \d+.*(tipo de lance|tipo ")/, descricao: 'Escada: tipo de lance inexistente ou incoerente' },
  // escadas (E4c)
  { codigo: 'ESCADA_CALCULO', nivel: 'erro', re: /^Escada [^:]+, lance \d+: cálculo/, descricao: 'Escada: o cálculo por casca do lance falhou (malha, apoio ou instabilidade)' },
  { codigo: 'ESCADA_TIRANTE', nivel: 'aviso', re: /^Escada [^:]+, lance \d+: o tirante .*comprimido/, descricao: 'Escada: o tirante do patamar fica comprimido' },
  { codigo: 'ESCADA_HORIZONTAL', nivel: 'aviso', re: /^Escada [^:]+, lance \d+: reação horizontal/, descricao: 'Escada: reação horizontal no apoio não é transmitida à estrutura (só as cargas verticais são aplicadas)' },
  { codigo: 'ESCADA_RECALCULAR', nivel: 'aviso', re: /^Escada [^:]+: a escada mudou depois do último cálculo/, descricao: 'Escada alterada depois do último cálculo: recalcule a obra para atualizar as reações' },
  { codigo: 'ESCADA_APOIO_CALCULO', nivel: 'aviso', re: /^Escada [^:]+, lance \d+: (o apoio|altura do apoio|equilíbrio vertical|direção do último trecho)/, descricao: 'Escada: apoio fora da malha, altura do apoio muito pequena ou equilíbrio vertical com erro' },
  { codigo: 'ESCADA_GEOMETRIA', nivel: 'erro', re: /^Escada [^:]+(, lance \d+)?: /, descricao: 'Escada: erro geométrico (pavimento, patamar, trecho ou apoio)' },
  { codigo: 'TRELICADA', nivel: 'info', re: /^Treliçada/, descricao: 'Resumo das vigotas (treliça, grupos, adicional)' },
  // punção e cortante das lajes (N2d)
  { codigo: 'PUNCAO_BIELA', nivel: 'erro', re: /^Punção em .*τSd/, descricao: 'Punção: compressão diagonal (τSd > τRd2 no contorno C)' },
  { codigo: 'PUNCAO_SEM_SOLUCAO', nivel: 'erro', re: /^(Punção|Cortante da laje) em .*sem solução/, descricao: 'Punção ou cortante da laje sem solução com armadura (aumente a espessura)' },
  { codigo: 'PUNCAO_ARMADURA', nivel: 'aviso', re: /^Punção em .*armadura de/, descricao: 'Punção: armadura de punção necessária' },
  { codigo: 'CORTANTE_LAJE_ARM', nivel: 'aviso', re: /^Cortante da laje( em .*)? \(armadura transversal\)/, descricao: 'Cortante da laje: armadura transversal necessária' },
  { codigo: 'CORTANTE_LAJE', nivel: 'erro', re: /^Cortante da laje/, descricao: 'Cortante da laje acima de VRd2 ou sem armadura possível (laje com h < 15 cm)' },
  { codigo: 'PUNCAO_ESP', nivel: 'aviso', re: /^Punção em .*espaçamento informado/, descricao: 'Punção: espaçamento radial informado maior que 0,75d' },
  { codigo: 'PUNCAO_INFORMADA', nivel: 'info', re: /^Armadura de punção informada/, descricao: 'Armadura de punção informada atende' },
  { codigo: 'VIGA_CHATA_LARGA', nivel: 'aviso', re: /^Viga chata /, descricao: 'Viga chata mais larga que o apoio em mais de uma altura (punção verificada)' },
  { codigo: 'PUNCAO_PAREDE', nivel: 'aviso', re: /^Pilar-parede /, descricao: 'Pilar-parede: tensões não uniformes no contorno de punção' },
  // fundações do edifício (FU1)
  { codigo: 'FUND_EXC_SEM_VIGA', nivel: 'erro', re: /^Fundação excêntrica sem viga de equilíbrio/, descricao: 'Fundação de divisa ou de canto sem viga de equilíbrio' },
  { codigo: 'FUND_SEM_SOLUCAO', nivel: 'erro', re: /^Fundação sem solução/, descricao: 'Fundação: nenhuma solução atende' },
  { codigo: 'FUND_NAO_ATENDE', nivel: 'erro', re: /^Fundação não atende/, descricao: 'Fundação: verificação estrutural ou geotécnica não atende' },
  { codigo: 'FUND_SEM_SIGMA', nivel: 'erro', re: /^Fundação sem σadm/, descricao: 'Fundação sem tensão admissível' },
  { codigo: 'FUND_SEM_SONDAGEM', nivel: 'erro', re: /^Fundação sem sondagem/, descricao: 'Fundação pelo SPT sem furos de sondagem' },
  { codigo: 'FUND_SEM_ESTACA', nivel: 'erro', re: /^Fundação sem (estaca|capacidade da estaca)/, descricao: 'Bloco sem tipo ou capacidade de estaca' },
  { codigo: 'FUND_SEM_CARGA', nivel: 'erro', re: /^Fundação sem cargas/, descricao: 'Fundação sem cargas (estrutura não calculada ou arranque sem cargas)' },
  { codigo: 'FUND_PILAR', nivel: 'erro', re: /^Fundação (sem pilar|sob pilar que não nasce)/, descricao: 'Fundação sem pilar válido' },
  { codigo: 'FUND_COTA', nivel: 'erro', re: /^Fundação acima do terreno/, descricao: 'Cota de assentamento acima do terreno' },
  { codigo: 'FUND_PILAR_SEM_ELEMENTO', nivel: 'aviso', re: /^Pilar sem elemento de fundação/, descricao: 'Pilar que nasce na fundação sem elemento lançado' },
  // vigas de equilíbrio e de travamento (FU2)
  { codigo: 'FUND_SEM_TRAVA', nivel: 'aviso', re: /^Bloco sem travamento/, descricao: 'Bloco de 1 ou 2 estacas sem viga de travamento obrigatória' },
  { codigo: 'FUND_VIGA_PONTA', nivel: 'erro', re: /^Viga de fundação sem ponta/, descricao: 'Viga de fundação sem ponta válida (elemento ou pilar que nasce na fundação)' },
  { codigo: 'FUND_VIGA_ALAVANCA', nivel: 'erro', re: /^Viga de fundação: alavanca impossível/, descricao: 'Alavanca impossível: excentricidade grande para o comprimento da viga' },
  { codigo: 'FUND_VIGA_TRACAO', nivel: 'erro', re: /^Viga de fundação: tração no elemento aliviado/, descricao: 'Alívio da viga de equilíbrio maior que a carga mínima do elemento aliviado' },
  { codigo: 'FUND_VIGA_FLEXAO', nivel: 'erro', re: /^Viga de fundação: flexão/, descricao: 'Viga de fundação: flexão não atende na seção' },
  { codigo: 'FUND_VIGA_CORTANTE', nivel: 'erro', re: /^Viga de fundação: (biela|cortante)/, descricao: 'Viga de fundação: cortante não atende' },
  { codigo: 'FUND_VIGA_FORMA', nivel: 'erro', re: /^Viga de fundação: forma da seção/, descricao: 'Viga de fundação: seção T, L ou plana com dimensões inválidas (mesa, alma ou altura)' },
  { codigo: 'FUND_VIGA_MESA', nivel: 'erro', re: /^Viga de fundação: mesa/, descricao: 'Viga de fundação: mesa em balanço (armadura ou cisalhamento) não atende na espessura adotada' },
  { codigo: 'FUND_VIGA_PLANA', nivel: 'aviso', re: /^Viga de fundação: viga plana/, descricao: 'Viga plana de fundação mais alta que larga' },
  { codigo: 'FUND_VIGA_SECAO', nivel: 'aviso', re: /^Viga de fundação: seção abaixo do mínimo/, descricao: 'Viga de fundação com seção abaixo da mínima' },
  { codigo: 'FUND_VIGA_ANCORAGEM', nivel: 'aviso', re: /^Viga de fundação: ancoragem informada/, descricao: 'Ancoragem informada das barras superiores da viga de fundação menor que o lb necessário' },
  { codigo: 'FUND_VIGA_SEM_EXC', nivel: 'aviso', re: /^Viga de fundação: viga de equilíbrio sem ponta excêntrica/, descricao: 'Viga de equilíbrio sem elemento excêntrico (calculada como travamento)' },
  { codigo: 'FUND_CARGA_FORA', nivel: 'aviso', re: /^Carga no nível de fundação fora/, descricao: 'Carga do nível de fundação fora das vigas e elementos (ignorada)' },
  // sapatas associadas, blocos com vários pilares, limites e igualar (FU3)
  { codigo: 'FUND_SOBREPOSTA', nivel: 'aviso', re: /^Fundação sobreposta/, descricao: 'Elementos de fundação sobrepostos em planta (una as sapatas)' },
  { codigo: 'FUND_LIMITE_IGNORADO', nivel: 'aviso', re: /^Limite .* ignorado/, descricao: 'Limite de fundação ignorado (corta pilar, isola pilar ou sapata de altura variável)' },
  { codigo: 'FUND_IGUAL_MODELO', nivel: 'erro', re: /^Fundação igualada a /, descricao: 'Fundação igualada a um modelo inexistente ou sem solução' },
  { codigo: 'FUND_VIGA_CRUZA', nivel: 'aviso', re: /^Viga de fundação: .* cruza /, descricao: 'Viga de fundação apoiada em outra no cruzamento (apoio intermediário)' },
  // base elástica: radiers e vigas de fundação sobre molas (FU6)
  { codigo: 'FUND_LEVANTAMENTO', nivel: 'erro', re: /^Fundação: levantamento/, descricao: 'Base elástica: mola tracionada (levantamento) numa combinação rara; análise linear sem iteração' },
  { codigo: 'FUND_RADIER_TENSAO', nivel: 'erro', re: /^Fundação: tensão no solo/, descricao: 'Base elástica: tensão no solo k·w acima da σadm' },
  { codigo: 'FUND_RADIER_ESPESSURA', nivel: 'erro', re: /^Radier .*: espessura insuficiente/, descricao: 'Radier: espessura insuficiente na flexão' },
  { codigo: 'FUND_RADIER_MALHA', nivel: 'aviso', re: /^Radier .*: (malha vazia|.* não cabe com espaçamento)/, descricao: 'Radier: malha vazia ou armadura que não cabe' },
  { codigo: 'FUND_APOIOS_MISTOS', nivel: 'aviso', re: /^Apoios mistos/, descricao: 'Pilares sobre base elástica e com vínculo externo na mesma obra' },
  { codigo: 'FUND_RADIER_SEM_CARGA', nivel: 'aviso', re: /^Radier (sem cargas|.* sem pilares)/, descricao: 'Radier sem cargas do nível de fundação ou sem pilares' },
  // sapata corrida (FU7a)
  { codigo: 'FUND_CORRIDA_SEM_CARGA', nivel: 'erro', re: /^Sapata corrida .*: sem carga/, descricao: 'Sapata corrida sob parede sem carga linear no nível de fundação' },
  { codigo: 'FUND_CORRIDA_SEM_SOLUCAO', nivel: 'erro', re: /^Sapata corrida .*: nenhuma largura/, descricao: 'Sapata corrida: nenhuma largura atende a σadm, a área comprimida e a excentricidade' },
  { codigo: 'FUND_CORRIDA_EXC', nivel: 'erro', re: /^Sapata corrida .*: aba de um lado/, descricao: 'Sapata corrida com aba de um lado sem viga de equilíbrio (cintas)' },
  { codigo: 'FUND_CORRIDA_FLEXAO', nivel: 'erro', re: /^Sapata corrida .*: (armadura transversal|cisalhamento a d)/, descricao: 'Sapata corrida: armadura transversal não cabe ou cisalhamento não atende' },
  { codigo: 'FUND_CORRIDA_FLEXIVEL', nivel: 'aviso', re: /^Sapata corrida .*: altura .* menor que a rígida/, descricao: 'Sapata corrida flexível (altura menor que a rígida): cisalhamento verificado' },
  { codigo: 'FUND_CORRIDA_LARGURA', nivel: 'aviso', re: /^Sapata corrida .*: largura necessária/, descricao: 'Sapata corrida sob pilares: largura necessária para a σadm' },
  // cintas da sapata corrida de aba única (FU8a)
  { codigo: 'FUND_CORRIDA_SEM_CINTA', nivel: 'aviso', re: /^Sapata corrida .*: marcada como equilibrada por cintas, mas sem cintas/, descricao: 'Sapata corrida marcada como equilibrada por cintas, sem cintas lançadas (reação uniforme suposta)' },
  { codigo: 'FUND_CINTA_ERRO', nivel: 'erro', re: /^Sapata corrida .*: cintas? \S+ (sem ponta|com ponta|oblíqua ou do lado|— alavanca|e \S+ na mesma)/, descricao: 'Cinta de sapata corrida: ponta inválida, oblíqua, alavanca impossível ou duas cintas na mesma abscissa' },
  { codigo: 'FUND_CINTA_OBLIQUA', nivel: 'aviso', re: /^Sapata corrida .*: cinta \S+ oblíqua à normal/, descricao: 'Cinta de sapata corrida oblíqua à normal da corrida (excentricidade fora do plano da cinta)' },
  { codigo: 'FUND_CINTA_ESPACAMENTO', nivel: 'aviso', re: /^Sapata corrida .*: (cintas (ignoradas|espaçadas)|balanço de .* última cinta)/, descricao: 'Cintas de sapata corrida ignoradas (aba nos dois lados), espaçadas demais ou com balanço longo além da última' },
  // sapata corrida de parede e base dos muros (FU7b)
  { codigo: 'FUND_CORRIDA_DESLIZA', nivel: 'erro', re: /^Sapata corrida .*: deslizamento/, descricao: 'Sapata corrida de parede: fator de segurança ao deslizamento abaixo do mínimo' },
  { codigo: 'FUND_CORRIDA_PILAR', nivel: 'erro', re: /^Sapata corrida .*: o pilar .* nasce sobre o eixo/, descricao: 'Sapata corrida de parede com pilar sobre o eixo que já tem elemento de fundação (carga contada duas vezes)' },
  { codigo: 'FUND_CORRIDA_PAREDE', nivel: 'aviso', re: /^Sapata corrida .*: a parede/, descricao: 'Sapata corrida de parede sem as reações da base (análise ausente, parede sem base na fundação ou removida)' },
  { codigo: 'FUND_MURO_SIGMA', nivel: 'aviso', re: /^Base do muro .*: sem σadm/, descricao: 'Muro de arrimo sem σadm própria nem do terreno da obra: tensão da base não verificada contra o solo' },
  { codigo: 'FUND_MURO_TENSAO', nivel: 'erro', re: /^Base do muro .*: tensão máxima/, descricao: 'Muro de arrimo: tensão máxima na base acima da σadm do terreno da obra' },
  { codigo: 'FUND_MURO_COTA', nivel: 'erro', re: /^Base do muro .*: cota de assentamento/, descricao: 'Muro de arrimo: cota de assentamento da base igual ou acima do terreno' },
  // armadura das paredes e pilares-parede (E1d)
  { codigo: 'PAREDE_ARMADURA', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: Armadura da parede não atende/, descricao: 'Parede: a malha não atinge o fator de cumprimento exigido (taxa máxima, bitola máxima ou concreto)' },
  { codigo: 'PAREDE_CUMPRIMENTO', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: Armadura bloqueada (insuficiente|abaixo)/, descricao: 'Parede: armadura bloqueada abaixo do mínimo ou do fator de cumprimento exigido' },
  { codigo: 'PAREDE_BLOQ_IGNORADO', nivel: 'aviso', re: /^(Parede|Pilar-parede) [^:]+: Armadura bloqueada desconsiderada/, descricao: 'Parede: bloqueio desconsiderado (o número de panos do lado mudou)' },
  { codigo: 'PAREDE_CONCRETO', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: Concreto da biela/, descricao: 'Parede: compressão do concreto (biela) acima do limite' },
  { codigo: 'PAREDE_GRAMPOS', nivel: 'aviso', re: /^(Parede|Pilar-parede) [^:]+: Cortante fora do plano .*grampos/, descricao: 'Parede: cortante fora do plano pede grampos entre as faces' },
  { codigo: 'PAREDE_CORTANTE', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: Cortante fora do plano/, descricao: 'Parede: cortante fora do plano acima de VRd1 (ou de VRd2)' },
  { codigo: 'PAREDE_ESBELTEZ', nivel: 'aviso', re: /^(Parede|Pilar-parede) [^:]+: Esbeltez/, descricao: 'Parede: esbeltez acima de 90 (processo aproximado por faixas não vale)' },
  { codigo: 'PAREDE_SEM_VERTICAL', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: Só armadura horizontal/, descricao: 'Parede só com armadura horizontal, mas há pontos que exigem vertical' },
  { codigo: 'PAREDE_SIMPLES', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: Parede em concreto simples/, descricao: 'Parede em concreto simples com tração ou compressão acima do limite' },
  { codigo: 'PAREDE_SEM_ARMADURA', nivel: 'info', re: /^(Parede|Pilar-parede) [^:]+: Nenhum ponto exige armadura/, descricao: 'Pano sem armadura (armar só quando necessário)' },
  { codigo: 'PAREDE_GLOBAL', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: Verificação global do lado/, descricao: 'Parede: verificação global do lado à flexo-compressão oblíqua não atende' },
  { codigo: 'PAREDE_LADO_CURTO_ARM', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: (Lado curto|Nenhuma malha vertical)/, descricao: 'Trecho curto (pilar): não atende ou nenhuma malha cabe' },
  { codigo: 'PAREDE_ABERTURA_CORTANTE', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: Verga: cortante/, descricao: 'Verga: cortante acima de VRd2 (biela comprimida)' },
  { codigo: 'PAREDE_ABERTURA_ARM', nivel: 'erro', re: /^(Parede|Pilar-parede) [^:]+: (Verga |Peitoril |Montantes |Estribos da verga)/, descricao: 'Abertura: armadura de verga, peitoril, montantes ou estribos menor que a necessária' },
  { codigo: 'PAREDE_EMENDA', nivel: 'aviso', re: /^(Parede|Pilar-parede) [^:]+: .*emenda .* abaixo do mínimo/, descricao: 'Parede: comprimento de emenda editado abaixo do mínimo' },
  { codigo: 'ALV_ESBELTEZ', nivel: 'erro', re: /^Alvenaria [^:]+: Esbeltez/, descricao: 'Alvenaria: esbeltez hef/t acima do limite (24 não armada, 30 armada)' },
  { codigo: 'ALV_CUMPRIMENTO', nivel: 'erro', re: /^Alvenaria [^:]+: Fator de cumprimento/, descricao: 'Alvenaria: fração da área do pano que atende as tensões-limite abaixo da exigida' },
  { codigo: 'ALV_PONTOS', nivel: 'aviso', re: /^Alvenaria [^:]+: Pontos fora das tensões-limite/, descricao: 'Alvenaria: pontos acima das tensões-limite dentro do fator de cumprimento (aviso do relatório final)' },
  { codigo: 'ALV_ARMADURA', nivel: 'erro', re: /^Alvenaria [^:]+: Armadura (vertical|horizontal)/, descricao: 'Alvenaria armada: nenhuma malha atende ou a bloqueada é menor que a necessária' },
  { codigo: 'ALV_LADO_CURTO', nivel: 'erro', re: /^Alvenaria [^:]+: Lado curto/, descricao: 'Alvenaria: trecho curto (pilar de alvenaria) não atende' },
  { codigo: 'ALV_VERGA', nivel: 'erro', re: /^Alvenaria [^:]+: (Verga|Contraverga|Estribos da verga)/, descricao: 'Alvenaria de blocos: verga ou contraverga menor que a necessária, ou cortante acima da biela' },
  { codigo: 'ALV_ABERTURA_MODULACAO', nivel: 'aviso', re: /^Alvenaria [^:]+: Abertura fora das medidas modulares/, descricao: 'Alvenaria de blocos: abertura fora da modulação (peças cortadas)' },
  { codigo: 'ALV_VIGA_ESPESSURA', nivel: 'aviso', re: /^Viga .* abaixo das dimensões mínimas/, descricao: 'Viga sobre muro de alvenaria abaixo das dimensões mínimas' },
  { codigo: 'ALV_VIGA_DISPENSADA', nivel: 'info', re: /^Viga .* armadura opcional dispensada/, descricao: 'Viga sobre muro: armadura opcional dispensada' },
  { codigo: 'MURO_CORTANTE', nivel: 'erro', re: /^Muro [^:]+: (Fuste|Ponta|Talão): cortante/, descricao: 'Muro de arrimo: cortante do fuste ou da base acima de VRd1 (aumente a espessura)' },
  { codigo: 'MURO_ESTABILIDADE', nivel: 'erro', re: /^Muro [^:]+: Estabilidade: /, descricao: 'Muro de arrimo: tombamento, deslizamento, tensão ou núcleo central não atendem' },
  // planos inclinados (E3f): avisos da análise
  { codigo: 'PLANO_SEPARADO', nivel: 'aviso', re: /^Plano: no modelo separado/, descricao: 'Panos inclinados no modelo separado: calculados na projeção horizontal, no diafragma' },
  { codigo: 'PLANO_COTAS', nivel: 'aviso', re: /^Plano: cotas diferentes no mesmo nó/, descricao: 'Viga e pano com cotas diferentes no mesmo nó (incoerência de plano)' },
  // avisos da análise (obra)
  { codigo: 'COMB_USUARIO', nivel: 'aviso', re: /^Combinações do usuário/, descricao: 'Combinações do usuário com fator abaixo do da norma (responsabilidade do projetista)' },
  { codigo: 'EQU_TOMBAMENTO', nivel: 'erro', re: /^Equilíbrio global/, descricao: 'Tombamento global: momento estabilizante menor que o instabilizante' },
  { codigo: 'DESLOC', nivel: 'erro', re: /^Deslocamento lateral/, descricao: 'Deslocamento lateral acima do limite' },
  { codigo: 'GAMA_Z', nivel: 'erro', re: /^γz = .* acima do limite/, descricao: 'γz acima do limite' },
  { codigo: 'GAMA_Z_PDELTA', nivel: 'aviso', re: /^γz informado/, descricao: 'γz acima do limite com a 2ª ordem global pelo P-Δ' },
  { codigo: 'PDELTA', nivel: 'erro', re: /^P-Δ/, descricao: 'P-Δ: instabilidade global ou falta de convergência numa combinação' },
];

/** Grupo de estados-limite de cada código: desativado em Estados-limite, o aviso deixa de entrar na revisão. */
const ESTADO_DO_CODIGO: Record<string, EstadoId> = { FLECHA: 'flecha', FLECHA_Q: 'flecha', FLECHA_ATIVA: 'flecha', FLECHA_INST: 'flecha', FISSURA: 'fissuracao', ARM_AUMENTADA: 'fissuracao', DESLOC: 'deslocamentos', EQU_TOMBAMENTO: 'equilibrio', FOGO_TRRF: 'incendio', FOGO_FORA_TABELA: 'incendio', FOGO_LIMITES: 'incendio' };

/** Código e nível de uma mensagem (sem regra conhecida: aviso genérico). */
export function classificar(msg: string): { codigo: string; nivel: NivelRevisao | 'info' } {
  const r = CODIGOS_REVISAO.find((c) => c.re.test(msg));
  return r ? { codigo: r.codigo, nivel: r.nivel } : { codigo: 'AVISO', nivel: 'aviso' };
}

/** Lista de erros e avisos da obra (erros primeiro) e o pior nível por elemento (`tipo|id`). */
export function revisarEdificio(b: BuildingModel, an: AnaliseEdificio | null, dim: Dimensionamento | null) {
  const itens: ItemRevisao[] = [];
  const add = (tipo: TipoRevisao, id: string | undefined, nome: string, pavimento: string | undefined, msgs: string[]) => {
    for (const m of msgs) { const c = classificar(m); const est = ESTADO_DO_CODIGO[c.codigo]; if (est && !estadoEmUso(b, est).ativo) continue; if (c.nivel !== 'info') itens.push({ tipo, id, nome, pavimento, nivel: c.nivel, codigo: c.codigo, mensagem: m }); }
  };
  for (const a of an?.avisos ?? []) add('obra', undefined, b.obra?.nome || 'Obra', undefined, [a]);
  if (an?.erro) itens.push({ tipo: 'obra', nome: b.obra?.nome || 'Obra', nivel: 'erro', codigo: 'ANALISE', mensagem: an.erro });
  for (const v of dim?.vigas ?? []) add('viga', v.viga, v.nome, undefined, v.mensagens);
  // avisos do detalhamento com código próprio (os demais ficam só na aba Detalhamento)
  for (const d of dim?.detalhes ?? []) add('viga', d.viga, d.nome, undefined, d.avisos.filter((m) => classificar(m).codigo !== 'AVISO'));
  for (const p of dim?.pilares ?? []) add('pilar', p.pilar, p.nome, p.pavimento, p.mensagens);
  for (const r of dim?.inclinadas ?? []) add('inclinada', r.inclinada, r.nome, undefined, r.mensagens);
  for (const r of dim?.diagonais ?? []) add('diagonal', r.inclinada, r.nome, undefined, r.mensagens);
  for (const r of dim?.consolos ?? []) add('consolo', r.consolo, r.nome, undefined, r.mensagens);
  // avisos do detalhamento dos pilares com código próprio (os demais ficam só na aba Detalhamento)
  for (const d of dim?.detalhesPilares ?? []) add('pilar', d.pilar, d.nome, undefined, d.avisos.filter((m) => classificar(m).codigo !== 'AVISO'));
  for (const d of dim?.detalhesLajes ?? []) add('laje', d.laje, d.nome, undefined, d.avisos.filter((m) => classificar(m).codigo !== 'AVISO'));
  for (const l of dim?.lajes ?? []) add('laje', l.laje, l.nome, l.pavimento, l.mensagens);
  for (const f of dim?.fundacoes ?? []) add('fundacao', f.id, f.nome, undefined, f.mensagens);
  for (const v of dim?.vigasFundacao ?? []) add('fundacao', v.id, v.nome, undefined, v.mensagens);
  for (const r of dim?.radiers ?? []) add('fundacao', r.id, r.nome, undefined, r.mensagens);
  for (const v of dim?.vigasElasticas ?? []) add('fundacao', v.id, v.nome, undefined, v.mensagens);
  for (const c of dim?.corridas ?? []) add('fundacao', c.id, c.nome, undefined, c.mensagens);
  for (const m of dim?.basesMuros ?? []) add('fundacao', m.id, m.nome, undefined, m.mensagens);
  // paredes e pilares-parede (E1d): mensagens dos panos, lados, aberturas e do detalhamento, com o prefixo do elemento
  for (const w of dim?.armaduraParedes ?? []) {
    const pre = w.tipo === 'parede' ? 'Parede' : 'Pilar-parede', tipo = w.tipo === 'parede' ? 'parede' : 'pilarParede';
    const det = dim?.detalhesParedes?.find((x) => x.id === w.id);
    add(tipo, w.id, w.nome, undefined, [
      ...w.mensagens.map((m) => `${pre} ${w.nome}: ${m}`),
      ...w.panos.flatMap((p) => p.mensagens.map((m) => `${pre} ${p.nomeLado}, ${p.nomePav}: ${m}`)),
      ...w.lados.flatMap((l) => l.mensagens.map((m) => `${pre} ${l.nome}, ${l.nomePav}: ${m}`)),
      ...w.aberturas.flatMap((a) => a.mensagens.map((m) => `${pre} ${w.nome}, ${a.nomePav}: ${m}`)),
      ...(det?.avisos ?? []).map((m) => `${pre} ${w.nome}: ${m}`),
    ]);
  }
  // alvenaria estrutural e blocos (E1e): mensagens dos panos, lados e vergas, e das vigas sobre muros
  for (const w of dim?.alvenaria?.paredes ?? []) add('parede', w.id, w.nome, undefined, [
    ...w.mensagens.map((m) => `Alvenaria ${w.nome}: ${m}`),
    ...w.panos.flatMap((p) => p.mensagens.map((m) => `Alvenaria ${w.nome}, ${p.nomeLado}, ${p.nomePav}: ${m}`)),
    ...w.lados.flatMap((l) => l.mensagens.map((m) => `Alvenaria ${w.nome}, ${l.nome}, ${l.nomePav}: ${m}`)),
    ...w.vergas.flatMap((a) => a.mensagens.map((m) => `Alvenaria ${w.nome}, ${a.nomePav}: ${m}`)),
  ]);
  for (const v of dim?.alvenaria?.vigasMuro ?? []) add('viga', v.viga, v.nome, undefined, v.mensagens);
  for (const m of dim?.muros ?? []) add('obra', m.id, m.nome ?? 'Muro', undefined, m.mensagens.map((x) => `Muro ${m.nome ?? ''}: ${x}`));
  for (const e of b.escadas ?? []) add('escada', e.id, e.nome, undefined, diagnosticosEscadas(b).filter((d) => d.elementos.includes(e.id)).map((d) => d.mensagem));
  for (const a of dim?.avisosFundacao ?? []) add('obra', undefined, b.obra?.nome || 'Obra', undefined, [a]);
  for (const a of dim?.avisosAcoes ?? []) add('obra', undefined, b.obra?.nome || 'Obra', undefined, [a]);
  // com fundações lançadas, pilar que nasce na fundação sem elemento
  if (dim?.fundacoes && b.fundacao?.elementos.length) for (const p of b.pilares)
    if (p.nasce === 'fundacao' && !b.fundacao.elementos.some((e) => e.pilares.includes(p.id)) && !an?.baseElastica?.pilares[p.id]) add('pilar', p.id, p.nome, undefined, ['Pilar sem elemento de fundação lançado.']);
  // pilar reprovado pela utilização sem mensagem própria
  for (const p of dim?.pilares ?? []) if (p.status === 'fail' && !itens.some((x) => x.tipo === 'pilar' && x.id === p.pilar && x.pavimento === p.pavimento && x.nivel === 'erro'))
    itens.push({ tipo: 'pilar', id: p.pilar, nome: p.nome, pavimento: p.pavimento, nivel: 'erro', codigo: 'ARMADURA', mensagem: `Utilização ${p.util.toFixed(2).replace('.', ',')} > 1.` });
  for (const i of itens) { const sg = sugestaoDe(i.codigo); if (sg) i.sugestao = sg; }
  itens.sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === 'erro' ? -1 : 1));
  const porElemento = new Map<string, NivelRevisao>();
  for (const i of itens) if (i.id) { const k = `${i.tipo}|${i.id}`; if (porElemento.get(k) !== 'erro') porElemento.set(k, i.nivel); }
  return { itens, porElemento, erros: itens.filter((x) => x.nivel === 'erro').length, avisos: itens.filter((x) => x.nivel === 'aviso').length };
}
