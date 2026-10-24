// Catálogo de ajudas do modo de ajuda (F1) e do guia rápido (L4: C1.8–C1.13, C6.2). Textos próprios do projeto.
// As ajudas das opções vêm de OPCOES_INFO (descrição, fonte e padrões), sem repetir o texto.
import { OPCOES_INFO, padraoDe, type OpcaoInfo } from '../building/opcoes';
import { CASOS_GUIA_PLANOS, LIMITACOES_PLANOS, SEQUENCIA_PLANOS } from '../building/planos';

export type GrupoAjuda = 'abas' | 'ferramentas' | 'barras' | 'janelas' | 'opcoes';
export interface Ajuda { id: string; grupo: GrupoAjuda; titulo: string; texto: string; ver?: string[] }
export const GRUPOS_AJUDA: { id: GrupoAjuda; rotulo: string; noGuia: boolean }[] = [
  { id: 'abas', rotulo: 'Abas', noGuia: true },
  { id: 'ferramentas', rotulo: 'Ferramentas de lançamento', noGuia: true },
  { id: 'barras', rotulo: 'Barras e painéis', noGuia: true },
  { id: 'opcoes', rotulo: 'Opções de cálculo', noGuia: true },
  { id: 'janelas', rotulo: 'Janelas de diálogo', noGuia: false },
];

/** Identificadores das abas do edifício (Edificio.tsx) e das ferramentas da planta (plantaStore.ts); um teste do app confere que não falta nenhum. */
export const IDS_ABAS = ['planta', 'vista3d', 'elevacao', 'verificacao', 'analise', 'dimensionamento', 'pranchas', 'premissas'] as const;
export const IDS_FERRAMENTAS = ['selecionar', 'pilar', 'viga', 'laje', 'carga', 'eixo', 'mover', 'medir', 'alinhar', 'fundacao', 'vigaFund', 'girarFund', 'limite', 'limiteMascara', 'insFund', 'radier', 'vigaElastica', 'corrida',
  'dividir', 'unir', 'prolongar', 'copiar', 'girar', 'espelhar', 'puncao', 'zonaLaje', 'linhaDobra', 'pilarParede', 'parede', 'corte', 'secao', 'vigaGabarito', 'moverRef', 'contaGotas', 'contornoRet', 'aberturaRet', 'cargaLaje', 'cargaViga', 'direcaoPano', 'insercaoPano'] as const;

const A = (id: string, grupo: GrupoAjuda, titulo: string, texto: string, ver?: string[]): Ajuda => ({ id, grupo, titulo, texto, ...(ver ? { ver } : {}) });

export const AJUDAS: Ajuda[] = [
  // abas
  A('aba:planta', 'abas', 'Planta', 'Edição da planta do grupo do pavimento escolhido: pilares, vigas, lajes, cargas, eixos, gabarito e fundações. Cada pavimento de um grupo mostra a mesma planta.', ['ferramenta:selecionar', 'ferramenta:viga']),
  A('aba:vista3d', 'abas', 'Vista 3D', 'Modelo tridimensional da estrutura, com cortes, armaduras e fundações. Gira com o botão esquerdo, desloca com o direito e amplia com a roda.'),
  A('aba:elevacao', 'abas', 'Elevação', 'Elevação dos pórticos e dos lances de pilares, com cotas dos pavimentos.'),
  A('aba:verificacao', 'abas', 'Verificação', 'Lista os erros e avisos do lançamento e da revisão dos resultados, cada um com sugestão de correção. Clicar numa linha leva ao elemento.'),
  A('aba:analise', 'abas', 'Análise', 'Resultados da análise global: deslocamentos, γz ou P-Δ, reações, esforços e modos de vibração.'),
  A('aba:dimensionamento', 'abas', 'Dimensionamento', 'Armaduras e verificações de vigas, pilares, lajes, paredes e fundações, com o detalhamento e o rearmar.'),
  A('aba:pranchas', 'abas', 'Pranchas', 'Formas, armação e locação em folhas com carimbo, escala e referências; exporta DXF, DWG e PDF.'),
  A('aba:premissas', 'abas', 'Premissas', 'Todas as hipóteses de cálculo e os valores marcados “a confirmar”, com a fonte de cada uma. O memorial repete esta lista.'),
  // ferramentas
  A('ferramenta:selecionar', 'ferramentas', 'Selecionar', 'Seleciona elementos por clique ou janela. Janela da esquerda para a direita pega o que está todo dentro; da direita para a esquerda, o que cruza. Del remove a seleção.'),
  A('ferramenta:pilar', 'ferramentas', 'Pilar', 'Insere pilares no ponto fixo escolhido. Seção, ângulo e ponto fixo ficam no painel do grupo; o conta-gotas copia os dados de um pilar existente.'),
  A('ferramenta:viga', 'ferramentas', 'Viga', 'Traça vigas por polilinha. A linha traçada pode ser o eixo ou uma das faces.'),
  A('ferramenta:laje', 'ferramentas', 'Laje', 'Cria o pano dentro de uma região fechada por vigas, ou por contorno livre nos balanços.'),
  A('ferramenta:carga', 'ferramentas', 'Carga', 'Lança cargas pontuais, em linha ou em área sobre o pavimento, no caso escolhido.'),
  A('ferramenta:eixo', 'ferramentas', 'Eixo', 'Traça eixos de referência para a captura de pontos e a numeração.'),
  A('ferramenta:mover', 'ferramentas', 'Mover', 'Desloca a seleção entre dois pontos.'),
  A('ferramenta:medir', 'ferramentas', 'Medir', 'Mede distância e ângulo entre dois pontos.'),
  A('ferramenta:alinhar', 'ferramentas', 'Alinhar gabarito', 'Posiciona o gabarito (DXF ou DWG) por dois pares de pontos.'),
  A('ferramenta:fundacao', 'ferramentas', 'Fundação', 'Lança o elemento de fundação sob o pilar clicado: bloco sobre estacas, sapata ou tubulão.'),
  A('ferramenta:vigaFund', 'ferramentas', 'Viga de fundação', 'Liga dois elementos de fundação por viga de equilíbrio ou de travamento.'),
  A('ferramenta:girarFund', 'ferramentas', 'Girar fundação', 'Gira os elementos de fundação selecionados para a direção de dois pontos.'),
  A('ferramenta:limite', 'ferramentas', 'Limite da fundação', 'Desenha a divisa ou outro limite que a fundação não pode ultrapassar.'),
  A('ferramenta:limiteMascara', 'ferramentas', 'Limite pela máscara', 'Converte uma polilinha do gabarito em limite da fundação.'),
  A('ferramenta:insFund', 'ferramentas', 'Ponto de inserção', 'Move o centro de um elemento de fundação, deixando o pilar excêntrico.'),
  A('ferramenta:radier', 'ferramentas', 'Radier', 'Desenha o contorno de um radier (placa sobre base elástica).'),
  A('ferramenta:vigaElastica', 'ferramentas', 'Viga sobre base elástica', 'Traça uma viga de fundação apoiada em base elástica contínua.'),
  A('ferramenta:corrida', 'ferramentas', 'Sapata corrida', 'Traça sapata corrida sob parede, viga ou alinhamento de pilares.'),
  A('ferramenta:dividir', 'ferramentas', 'Dividir viga', 'Divide uma viga em duas no ponto clicado.'),
  A('ferramenta:unir', 'ferramentas', 'Unir vigas', 'Une duas vigas de mesma seção e alinhamento que se tocam.'),
  A('ferramenta:prolongar', 'ferramentas', 'Prolongar viga', 'Prolonga ou apara a ponta de uma viga até outra viga, eixo ou ponto.'),
  A('ferramenta:copiar', 'ferramentas', 'Copiar', 'Copia a seleção (pilares e vigas) entre dois pontos, em série se pedido. Pilares podem levar suas cargas.'),
  A('ferramenta:girar', 'ferramentas', 'Girar', 'Gira a seleção em torno de um ponto, pelo ângulo da barra.'),
  A('ferramenta:espelhar', 'ferramentas', 'Espelhar', 'Espelha a seleção em torno de um eixo dado por dois pontos.'),
  A('ferramenta:puncao', 'ferramentas', 'Armadura de punção', 'Lança ou apaga grupos de armadura de punção nos pilares sem viga.'),
  A('ferramenta:zonaLaje', 'ferramentas', 'Zona de uniformização', 'Define faixa ou retângulo em que as barras de lajes recebem a mesma taxa e o mesmo comprimento.'),
  A('ferramenta:linhaDobra', 'ferramentas', 'Linha de dobra', 'Define o local de negativo máximo e emenda preferencial da armadura inferior das lajes.'),
  A('ferramenta:pilarParede', 'ferramentas', 'Pilar-parede', 'Lança pilar-parede do tipo escolhido, em casca ou barra conforme o comprimento do lado.'),
  A('ferramenta:parede', 'ferramentas', 'Parede', 'Traça parede de concreto, alvenaria estrutural ou muro, com ou sem empuxo.'),
  A('ferramenta:corte', 'ferramentas', 'Corte do edifício', 'Traça a poligonal de um corte vertical do edifício.'),
  A('ferramenta:secao', 'ferramentas', 'Linha de seção', 'Traça uma linha de seção do pavimento; a seção abre numa janela.'),
  A('ferramenta:vigaGabarito', 'ferramentas', 'Viga pelo gabarito', 'Cria a viga clicando numa linha do gabarito; o modo diz se a linha é a face ou o eixo.'),
  A('ferramenta:moverRef', 'ferramentas', 'Mover texto de referência', 'Dois cliques: primeiro no texto (nome) do pilar, da viga ou da laje, depois no novo local. A posição fica gravada na obra e as pranchas de formas e locação a respeitam.'),
  A('ferramenta:contaGotas', 'ferramentas', 'Conta-gotas de pilar', 'Clique num pilar existente para pegar seus dados (seção, ponto fixo, lances, engastes, flambagem, cobrimento e, se marcado, as cargas); cada clique seguinte em lugar livre insere um pilar novo com esses dados. Esc volta a Selecionar.'),
  A('ferramenta:contornoRet', 'ferramentas', 'Contorno retangular de vigas', 'Dois cliques (cantos opostos, ângulo zero) ou três cliques (um lado e um ponto do lado oposto, qualquer ângulo) criam as quatro vigas do contorno externo, do lado de fora da linha clicada; com a opção marcada, alinha pela face externa dos pilares. Esc cancela.'),
  A('ferramenta:aberturaRet', 'ferramentas', 'Abertura retangular', 'Abertura retangular numa laje, em quatro modos: paralela a uma viga escolhida, ângulo zero, no ângulo das nervuras do pano ou qualquer ângulo (dois pontos de um lado e um do lado oposto). A viga de borda (nenhuma, chata ou alta) é traçada junto.'),
  A('ferramenta:cargaLaje', 'ferramentas', 'Carga na laje inteira', 'Um clique numa laje (destacada) lança uma carga de superfície com o valor e o caso escolhidos, ou copiados de uma carga existente.'),
  A('ferramenta:cargaViga', 'ferramentas', 'Carga ao longo da viga', 'Clique numa viga para lançar uma carga linear ao longo do eixo dela, ou arraste uma janela de captura para lançar em todas as vigas inteiramente dentro dela.'),
  A('ferramenta:direcaoPano', 'ferramentas', 'Direção do pano', 'Clique no pano e depois numa viga (paralela ou perpendicular a ela) ou em dois pontos para definir a direção das vigotas e nervuras.'),
  A('ferramenta:insercaoPano', 'ferramentas', 'Ponto de inserção do pano', 'Clique no pano e depois perto do vértice que será a origem da numeração das vigotas e da malha.'),
  // barras e painéis
  A('barra:atalhos', 'barras', 'Barra de atalhos', 'Botões de acesso rápido. Personalize pelo botão de configuração: ponha, tire e reordene os botões. A escolha fica salva neste navegador; “Restaurar padrão” volta à barra original.'),
  A('barra:ajuda', 'barras', 'Modo de ajuda', 'F1 ou o botão de ajuda liga o modo: os itens com ajuda ficam destacados e o clique em um deles mostra a explicação. Desliga com o botão direito, novo clique no botão ou Esc.'),
  A('barra:estado', 'barras', 'Barra de estado', 'Mostra a mensagem do último comando, a ferramenta ativa e o passo seguinte do lançamento.'),
  A('barra:camadas', 'barras', 'Camadas e textos', 'Liga ou desliga camadas da planta e escolhe, de forma permanente na obra, os tipos de texto de referência visíveis (nomes, seções, cotas, cargas e níveis).'),
  A('barra:grupos', 'barras', 'Grupos de pavimentos', 'Pavimentos iguais formam um grupo e compartilham a planta. “Copiar de outro grupo” traz o conteúdo de um grupo; “Unir” reúne pavimentos num grupo; as áreas do grupo aparecem no quadro de áreas.'),
  A('barra:pavimentos', 'barras', 'Pavimentos', 'Lista de pavimentos com nome, cota e grupo. +1 repete o pavimento no mesmo grupo.'),
  A('barra:planos', 'barras', 'Planos inclinados', `Panos e vigas inclinados seguem um plano do grupo (grupo Planos da doca Propriedades; Novo plano na faixa). Sequência recomendada: ${SEQUENCIA_PLANOS.slice(0, 4).map((t, i) => `${i + 1}) ${t}`).join(' ')} Casos-guia: ${CASOS_GUIA_PLANOS.map((c) => `${c.titulo}: ${c.texto}`).join(' ')} Limitações: ${LIMITACOES_PLANOS.join(' ')} Exemplos prontos em Obras recentes: cobertura em duas águas, mansarda com águas-furtadas, rampa de garagem e rampa entre pavimentos.`, ['janela:novoPlano']),
  // janelas
  A('janela:novoPlano', 'janelas', 'Novo plano', `Define o plano do grupo por três pontos (cada um com o desnível), por reta horizontal mais inclinação ou por linha de máxima declividade, em % ou graus; depois o plano é atribuído aos panos e vigas. Sequência: ${SEQUENCIA_PLANOS.slice(0, 4).join(' ')} ${SEQUENCIA_PLANOS[4]} ${SEQUENCIA_PLANOS[5]}`, ['barra:planos']),
  A('janela:geral', 'janelas', 'Janelas de diálogo', 'Fecham com Esc, clique fora ou o botão Fechar. O botão de ajuda da janela explica o que ela faz; o de informação resume o conteúdo.'),
  A('janela:copiarGrupo', 'janelas', 'Copiar de outro grupo', 'Escolha o grupo de origem (azul) e o de destino (verde), os tipos de elemento e o modo: somar ignora o que já existe igual; substituir apaga antes o que o destino tem dos tipos escolhidos. A operação se desfaz em um passo.'),
  A('janela:unirPavimentos', 'janelas', 'Unir pavimentos', 'Reúne os pavimentos escolhidos num grupo. O grupo que ficar sem pavimentos é removido com as vigas, lajes e cargas dele; a contagem aparece antes de confirmar.'),
];

const porId = new Map(AJUDAS.map((a) => [a.id, a]));
export const idAjudaOpcao = (chave: string) => `opcao:${chave}`;
const fmt = (v: number) => String(+v.toFixed(4)).replace('.', ',');

/** Ajuda de uma opção de cálculo, montada de OPCOES_INFO: descrição, padrões do sistema e da NBR e fonte. */
export function ajudaDaOpcao(o: OpcaoInfo): Ajuda {
  const un = o.unidade ? ` ${o.unidade}` : '';
  const nbr = o.padraoNBR !== undefined && o.padraoNBR !== o.padrao ? ` No perfil NBR 6118: ${fmt(padraoDe(o, 'nbr'))}${un}${o.fonteNBR ? ` (${o.fonteNBR})` : ''}.` : '';
  return { id: idAjudaOpcao(o.chave), grupo: 'opcoes', titulo: o.rotulo, texto: `${o.descricao} Padrão: ${fmt(o.padrao)}${un}; faixa ${fmt(o.min)} a ${fmt(o.max)}.${nbr} Fonte: ${o.fonte}${o.aConfirmar ? ' (a confirmar)' : ''}.` };
}

/** Todas as ajudas, as das opções incluídas. */
export const todasAjudas = (): Ajuda[] => [...AJUDAS, ...OPCOES_INFO.map(ajudaDaOpcao)];
/** Ajuda de um item (`aba:`, `ferramenta:`, `barra:`, `janela:` ou `opcao:`). */
export const ajudaDe = (id: string): Ajuda | undefined => (id.startsWith('opcao:') ? OPCOES_INFO.filter((o) => idAjudaOpcao(o.chave) === id).map(ajudaDaOpcao)[0] : porId.get(id));

/** Identificadores esperados que não têm ajuda (o teste de cobertura lista as que faltam). */
export function ajudasFaltantes(): string[] {
  const esperados = [...IDS_ABAS.map((x) => `aba:${x}`), ...IDS_FERRAMENTAS.map((x) => `ferramenta:${x}`), ...OPCOES_INFO.map((o) => idAjudaOpcao(o.chave)), ...GRUPOS_AJUDA.map((g) => g.id)];
  return esperados.filter((id) => (GRUPOS_AJUDA.some((g) => g.id === id) ? !todasAjudas().some((a) => a.grupo === id) : !ajudaDe(id)));
}

/** Ajuda da ferramenta ativa durante o lançamento: o texto da ferramenta, os passos (de PASSOS da planta) e a tecla. */
export function ajudaDaFerramenta(f: string, passos: string[] = [], tecla?: string): { titulo: string; texto: string; passos: string[]; tecla?: string } {
  const a = ajudaDe(`ferramenta:${f}`);
  return { titulo: a?.titulo ?? f, texto: a?.texto ?? '', passos, ...(tecla ? { tecla } : {}) };
}
