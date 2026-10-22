// Revisão de resultados (frente R1): erros e avisos por elemento com código do motivo, a partir das mensagens do
// dimensionamento e dos avisos da análise. Erro = o elemento não atende (vermelho na planta); aviso = atende, mas
// pede atenção (amarelo); informação (redistribuição aplicada, resumo das vigotas) fica só na linha do elemento.
import type { AnaliseEdificio } from './analitico';
import type { Dimensionamento } from './dimensionamento';
import { estadoEmUso } from './acoes';
import { sugestaoDe } from './sugestoes';
import type { BuildingModel, EstadoId } from './types';

export type NivelRevisao = 'erro' | 'aviso';
export type TipoRevisao = 'viga' | 'pilar' | 'laje' | 'fundacao' | 'obra';

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
  { codigo: 'VIGOTA_APOIO', nivel: 'aviso', re: /^Vigotas: tração inferior/, descricao: 'Vigotas: momento positivo no apoio' },
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
  // avisos da análise (obra)
  { codigo: 'COMB_USUARIO', nivel: 'aviso', re: /^Combinações do usuário/, descricao: 'Combinações do usuário com fator abaixo do da norma (responsabilidade do projetista)' },
  { codigo: 'EQU_TOMBAMENTO', nivel: 'erro', re: /^Equilíbrio global/, descricao: 'Tombamento global: momento estabilizante menor que o instabilizante' },
  { codigo: 'DESLOC', nivel: 'erro', re: /^Deslocamento lateral/, descricao: 'Deslocamento lateral acima do limite' },
  { codigo: 'GAMA_Z', nivel: 'erro', re: /^γz = .* acima do limite/, descricao: 'γz acima do limite' },
  { codigo: 'GAMA_Z_PDELTA', nivel: 'aviso', re: /^γz informado/, descricao: 'γz acima do limite com a 2ª ordem global pelo P-Δ' },
  { codigo: 'PDELTA', nivel: 'erro', re: /^P-Δ/, descricao: 'P-Δ: instabilidade global ou falta de convergência numa combinação' },
];

/** Grupo de estados-limite de cada código: desativado em Estados-limite, o aviso deixa de entrar na revisão. */
const ESTADO_DO_CODIGO: Record<string, EstadoId> = { FLECHA: 'flecha', FLECHA_Q: 'flecha', FISSURA: 'fissuracao', ARM_AUMENTADA: 'fissuracao', DESLOC: 'deslocamentos', EQU_TOMBAMENTO: 'equilibrio' };

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
  // avisos do detalhamento dos pilares com código próprio (os demais ficam só na aba Detalhamento)
  for (const d of dim?.detalhesPilares ?? []) add('pilar', d.pilar, d.nome, undefined, d.avisos.filter((m) => classificar(m).codigo !== 'AVISO'));
  for (const d of dim?.detalhesLajes ?? []) add('laje', d.laje, d.nome, undefined, d.avisos.filter((m) => classificar(m).codigo !== 'AVISO'));
  for (const l of dim?.lajes ?? []) add('laje', l.laje, l.nome, l.pavimento, l.mensagens);
  for (const f of dim?.fundacoes ?? []) add('fundacao', f.id, f.nome, undefined, f.mensagens);
  for (const v of dim?.vigasFundacao ?? []) add('fundacao', v.id, v.nome, undefined, v.mensagens);
  for (const r of dim?.radiers ?? []) add('fundacao', r.id, r.nome, undefined, r.mensagens);
  for (const v of dim?.vigasElasticas ?? []) add('fundacao', v.id, v.nome, undefined, v.mensagens);
  for (const c of dim?.corridas ?? []) add('fundacao', c.id, c.nome, undefined, c.mensagens);
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
