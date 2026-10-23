// Tabelas de fábrica (N3): estacas moldadas (NBR 6122, Tabela 4), catálogo SCAC de pré-moldadas e limites das bielas (Blévot).
import type { TabelaNormaInfo } from './tipos';

export const NORMAS_FUNDACOES: TabelaNormaInfo[] = [
  {
    id: 'nbr6122.estacas-moldadas', norma: 'NBR 6122', edicao: 'NBR 6122:2019, Tabela 4 (projeto de 2018)', titulo: 'Estacas moldadas: dimensionamento estrutural',
    fonte: 'Classe de agressividade (fck, γc), tensão sem armar, comprimento mínimo da armadura e As,mín. Veio do projeto de revisão de 2018; conferir no texto publicado.', aConfirmar: true, nivel: 'fundacao', chave: 'tipo', chavesFixas: ['helice', 'escavada'],
    colunas: [
      { chave: 'tipo', rotulo: 'Tipo (helice | escavada)', tipo: 'texto' },
      { chave: 'fckI', rotulo: 'fck CAA I-II', tipo: 'numero', unidade: 'MPa' }, { chave: 'gcI', rotulo: 'γc CAA I-II', tipo: 'numero' },
      { chave: 'fckIII', rotulo: 'fck CAA III-IV', tipo: 'numero', unidade: 'MPa' }, { chave: 'gcIII', rotulo: 'γc CAA III-IV', tipo: 'numero' },
      { chave: 'Lmin', rotulo: 'Comprimento mínimo da armadura', tipo: 'numero', unidade: 'm' },
      { chave: 'sigmaLim', rotulo: 'Tensão sem armar', tipo: 'numero', unidade: 'MPa' },
      { chave: 'rhoMin', rotulo: 'As,mín / Ac', tipo: 'numero' },
    ],
    linhas: [
      { tipo: 'helice', fckI: 30, gcI: 2.7, fckIII: 40, gcIII: 3.6, Lmin: 4, sigmaLim: 6, rhoMin: 0.004 },
      { tipo: 'escavada', fckI: 25, gcI: 3.1, fckIII: 40, gcIII: 5.0, Lmin: 2, sigmaLim: 5, rhoMin: 0.004 },
    ],
  },
  {
    id: 'scac.pre-moldadas', norma: 'Catálogo SCAC', edicao: 'Catálogo SCAC (estacas centrifugadas)', titulo: 'Estacas pré-moldadas: carga estrutural e tração de catálogo',
    fonte: 'Menor valor da faixa do catálogo; momento admissível com o fabricante.', aConfirmar: true, nivel: 'fundacao', chave: 'D',
    colunas: [
      { chave: 'D', rotulo: 'Diâmetro', tipo: 'numero', unidade: 'cm' },
      { chave: 'P', rotulo: 'Carga estrutural', tipo: 'numero', unidade: 'kN' },
      { chave: 'T', rotulo: 'Tração', tipo: 'numero', unidade: 'kN' },
    ],
    linhas: [
      { D: 26, P: 500, T: 150 }, { D: 33, P: 800, T: 180 }, { D: 38, P: 1000, T: 210 }, { D: 42, P: 1250, T: 240 },
      { D: 50, P: 1700, T: 270 }, { D: 60, P: 2350, T: 370 }, { D: 70, P: 3150, T: 480 }, { D: 80, P: 4000, T: 640 },
    ],
  },
  {
    id: 'blevot.bielas', norma: 'Blévot / NBR 6118 22.7', edicao: 'Blévot (1967); NBR 6118:2014, 22.7', titulo: 'Blocos sobre estacas: limites das bielas K·KR·fcd',
    fonte: 'K de Blévot para 2, 3 e 4 estacas; 5 e 6 por extensão do de 4; KR 0,90. Qual referência adotar está a confirmar.', aConfirmar: true, nivel: 'fundacao', chave: 'param', chavesFixas: ['KR', 'K2', 'K3', 'K4', 'K5', 'K6'],
    colunas: [
      { chave: 'param', rotulo: 'Parâmetro', tipo: 'texto' },
      { chave: 'valor', rotulo: 'Valor', tipo: 'numero' },
    ],
    linhas: [{ param: 'KR', valor: 0.9 }, { param: 'K2', valor: 1.4 }, { param: 'K3', valor: 1.75 }, { param: 'K4', valor: 2.1 }, { param: 'K5', valor: 2.1 }, { param: 'K6', valor: 2.1 }],
  },
];
