// Tabelas de fábrica (N3): telas soldadas (NBR 7481), categorias de uso (NBR 6120) e γ por origem (NBR 6118 / 8681).
import type { TabelaNormaInfo } from './tipos';

export const NORMAS_GERAIS: TabelaNormaInfo[] = [
  {
    id: 'nbr7481.telas-q', norma: 'NBR 7481', edicao: 'NBR 7481 (catálogos de fabricantes)', titulo: 'Telas soldadas, série Q (malha quadrada, CA-60)',
    fonte: 'Designações da NBR 7481 com dimensões de catálogos de terceiros, sem o texto da norma; séries L e T ausentes.', aConfirmar: true, nivel: 'detalhe', chave: 'id',
    colunas: [
      { chave: 'id', rotulo: 'Designação', tipo: 'texto' },
      { chave: 'n', rotulo: 'Área de aço', tipo: 'numero', unidade: 'mm²/m' },
      { chave: 'phi', rotulo: 'Fio', tipo: 'numero', unidade: 'mm' },
      { chave: 's', rotulo: 'Espaçamento', tipo: 'numero', unidade: 'cm' },
    ],
    linhas: ([[61, 3.4, 15], [75, 3.8, 15], [92, 4.2, 15], [113, 3.8, 10], [138, 4.2, 10], [159, 4.5, 10], [196, 5.0, 10], [246, 5.6, 10], [283, 6.0, 10], [335, 6.5, 10], [396, 7.1, 10], [503, 8.0, 10]] as [number, number, number][])
      .map(([n, phi, s]) => ({ id: `Q${n}`, n, phi, s })),
  },
  {
    id: 'nbr6120.uso', norma: 'NBR 6120', edicao: 'NBR 6120:2019, Tabela 10', titulo: 'Categorias de uso e sobrecargas',
    fonte: 'Seis usos do modelo mais categorias adicionais, a conferir com a edição vigente (a Tabela 10 completa depende do texto da norma).', aConfirmar: true, nivel: 'referencia', chave: 'id',
    colunas: [
      { chave: 'id', rotulo: 'Id', tipo: 'texto' },
      { chave: 'rotulo', rotulo: 'Categoria', tipo: 'texto' },
      { chave: 'q', rotulo: 'Sobrecarga', tipo: 'numero', unidade: 'kN/m²' },
      { chave: 'uso', rotulo: 'Uso do modelo (classe de ψ)', tipo: 'texto' },
      { chave: 'aConfirmar', rotulo: 'A confirmar (1 = sim)', tipo: 'numero' },
    ],
    linhas: [
      { id: 'residencial', rotulo: 'Residencial (dormitórios, sala, cozinha)', q: 1.5, uso: 'residencial', aConfirmar: 1 },
      { id: 'servico', rotulo: 'Área de serviço e lavanderia', q: 2.0, uso: 'servico', aConfirmar: 1 },
      { id: 'comum', rotulo: 'Áreas comuns, corredores e escadas', q: 3.0, uso: 'comum', aConfirmar: 1 },
      { id: 'escritorio', rotulo: 'Escritórios', q: 2.5, uso: 'escritorio', aConfirmar: 1 },
      { id: 'garagem', rotulo: 'Garagem (veículos leves)', q: 3.0, uso: 'garagem', aConfirmar: 1 },
      { id: 'cobertura', rotulo: 'Cobertura sem acesso (manutenção)', q: 1.0, uso: 'cobertura', aConfirmar: 1 },
      { id: 'misto', rotulo: 'Misto (sem carga variável geral; cargas por área em cada categoria)', q: 0, uso: 'misto', aConfirmar: 1 },
      { id: 'sala-aula', rotulo: 'Escolas: salas de aula', q: 3.0, uso: 'escritorio', aConfirmar: 1 },
      { id: 'comercio', rotulo: 'Lojas e comércio', q: 4.0, uso: 'escritorio', aConfirmar: 1 },
      { id: 'reuniao', rotulo: 'Restaurantes, salões e locais de reunião', q: 3.0, uso: 'escritorio', aConfirmar: 1 },
      { id: 'auditorio', rotulo: 'Auditórios, cinemas e teatros com plateia fixa', q: 3.0, uso: 'escritorio', aConfirmar: 1 },
      { id: 'academia', rotulo: 'Academias e salões de dança', q: 4.0, uso: 'escritorio', aConfirmar: 1 },
      { id: 'hospital', rotulo: 'Hospitais: quartos e enfermarias', q: 2.0, uso: 'residencial', aConfirmar: 1 },
      { id: 'biblioteca', rotulo: 'Bibliotecas: salas de leitura', q: 3.0, uso: 'garagem', aConfirmar: 1 },
      { id: 'arquivo', rotulo: 'Arquivos e depósitos de livros', q: 6.0, uso: 'garagem', aConfirmar: 1 },
      { id: 'arquibancada', rotulo: 'Arquibancadas e tribunas', q: 5.0, uso: 'escritorio', aConfirmar: 1 },
    ],
  },
  {
    id: 'nbr8681.gama-origem', norma: 'NBR 6118 / NBR 8681', edicao: 'NBR 6118:2014, Tabela 11.1; NBR 8681', titulo: 'Coeficientes γ por origem da ação',
    fonte: 'Tabela 11.1 da NBR 6118 e linhas de empuxo e ações indiretas da NBR 8681 (empuxo a confirmar). Tabela de referência: os γ em uso vêm dos materiais da obra.', aConfirmar: true, nivel: 'referencia', chave: 'id',
    colunas: [
      { chave: 'id', rotulo: 'Id', tipo: 'texto' },
      { chave: 'origem', rotulo: 'Origem', tipo: 'texto' },
      { chave: 'nD', rotulo: 'Normal desfav.', tipo: 'numero' }, { chave: 'nF', rotulo: 'Normal fav.', tipo: 'numero' },
      { chave: 'eD', rotulo: 'Especial desfav.', tipo: 'numero' }, { chave: 'eF', rotulo: 'Especial fav.', tipo: 'numero' },
      { chave: 'xD', rotulo: 'Excepcional desfav.', tipo: 'numero' }, { chave: 'xF', rotulo: 'Excepcional fav.', tipo: 'numero' },
      { chave: 'fonte', rotulo: 'Fonte', tipo: 'texto' },
      { chave: 'aConfirmar', rotulo: 'A confirmar (1 = sim)', tipo: 'numero' },
    ],
    linhas: [
      { id: 'permanentes', origem: 'Permanentes diretas (peso próprio, elementos construtivos)', nD: 1.4, nF: 1.0, eD: 1.3, eF: 1.0, xD: 1.2, xF: 1.0, fonte: 'NBR 6118, Tabela 11.1 (grande variabilidade); NBR 8681, Tabela 1', aConfirmar: 0 },
      { id: 'variaveis', origem: 'Variáveis diretas (sobrecargas de uso)', nD: 1.4, nF: 0, eD: 1.2, eF: 0, xD: 1.0, xF: 0, fonte: 'NBR 6118, Tabela 11.1; NBR 8681, Tabela 4', aConfirmar: 0 },
      { id: 'vento', origem: 'Variável: vento', nD: 1.4, nF: 0, eD: 1.2, eF: 0, xD: 1.0, xF: 0, fonte: 'NBR 6118, Tabela 11.1 (variáveis); NBR 8681', aConfirmar: 0 },
      { id: 'empuxo', origem: 'Empuxo de terra e de líquidos (caso H)', nD: 1.4, nF: 1.0, eD: 1.3, eF: 1.0, xD: 1.2, xF: 1.0, fonte: 'NBR 8681 (linha de empuxo tratada como permanente; valores a confirmar na norma)', aConfirmar: 1 },
      { id: 'indiretas', origem: 'Indiretas: recalques de apoio e retração', nD: 1.2, nF: 0, eD: 1.2, eF: 0, xD: 0, xF: 0, fonte: 'NBR 6118, Tabela 11.1', aConfirmar: 0 },
      { id: 'protensao', origem: 'Protensão', nD: 1.2, nF: 0.9, eD: 1.2, eF: 0.9, xD: 1.2, xF: 0.9, fonte: 'NBR 6118, Tabela 11.1 (não aplicável ao edifício de concreto armado)', aConfirmar: 0 },
    ],
  },
];
