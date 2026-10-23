// Tabelas de fábrica (E3a): catálogo das lajes treliçadas (modelos, treliças e enchimentos). São dados de catálogo
// de fabricantes, sem texto de norma: ficam "a confirmar" e o usuário pode editá-las ou acrescentar linhas na biblioteca
// de normas. Valores idênticos aos das constantes originais de `building/lajes.ts` e `building/vigotas.ts`.
import type { TabelaNormaInfo } from './tipos';

export const NORMAS_LAJES: TabelaNormaInfo[] = [
  {
    id: 'lajes.trelicadas', norma: 'NBR 14859', edicao: 'catálogo próprio (a confirmar com o fabricante)', titulo: 'Lajes treliçadas unidirecionais com EPS (modelos H8 a H25)',
    fonte: 'Altura do enchimento, intereixo, largura média da nervura, capa padrão e treliça de cada modelo; dimensões usuais de mercado, sem o texto da NBR 14859 nem ficha de fabricante.',
    aConfirmar: true, nivel: 'analise', chave: 'modelo',
    colunas: [
      { chave: 'modelo', rotulo: 'Modelo', tipo: 'texto' },
      { chave: 'hEnch', rotulo: 'Altura do enchimento', tipo: 'numero', unidade: 'm' },
      { chave: 'intereixo', rotulo: 'Intereixo', tipo: 'numero', unidade: 'm' },
      { chave: 'bw', rotulo: 'Largura da nervura', tipo: 'numero', unidade: 'm' },
      { chave: 'capa', rotulo: 'Capa padrão', tipo: 'numero', unidade: 'm' },
      { chave: 'trelica', rotulo: 'Treliça', tipo: 'texto' },
    ],
    linhas: [
      { modelo: 'H8', hEnch: 0.08, intereixo: 0.42, bw: 0.09, capa: 0.04, trelica: 'TR 8644' },
      { modelo: 'H12', hEnch: 0.12, intereixo: 0.42, bw: 0.09, capa: 0.04, trelica: 'TR 12645' },
      { modelo: 'H16', hEnch: 0.16, intereixo: 0.42, bw: 0.09, capa: 0.04, trelica: 'TR 16745' },
      { modelo: 'H20', hEnch: 0.2, intereixo: 0.5, bw: 0.1, capa: 0.05, trelica: 'TR 20745' },
      { modelo: 'H25', hEnch: 0.25, intereixo: 0.5, bw: 0.1, capa: 0.05, trelica: 'TR 25856' },
    ],
  },
  {
    id: 'lajes.trelicas', norma: 'NBR 14862', edicao: 'catálogo próprio (a confirmar com o fabricante)', titulo: 'Treliças eletrossoldadas (designação TR h·φsup·φdiag·φinf)',
    fonte: 'Altura e bitolas dos banzos e das diagonais em CA-60; designações da NBR 14862 com bitolas de catálogos de terceiros, sem o texto da norma.',
    aConfirmar: true, nivel: 'analise', chave: 'nome',
    colunas: [
      { chave: 'nome', rotulo: 'Designação', tipo: 'texto' },
      { chave: 'h', rotulo: 'Altura', tipo: 'numero', unidade: 'm' },
      { chave: 'sup', rotulo: 'Banzo superior', tipo: 'numero', unidade: 'mm' },
      { chave: 'diag', rotulo: 'Diagonais', tipo: 'numero', unidade: 'mm' },
      { chave: 'inf', rotulo: 'Banzos inferiores (2)', tipo: 'numero', unidade: 'mm' },
    ],
    linhas: [
      { nome: 'TR 8644', h: 0.08, sup: 6, diag: 4.2, inf: 4.2 },
      { nome: 'TR 12645', h: 0.12, sup: 6, diag: 4.2, inf: 5 },
      { nome: 'TR 16745', h: 0.16, sup: 7, diag: 4.2, inf: 5 },
      { nome: 'TR 20745', h: 0.2, sup: 7, diag: 4.2, inf: 5 },
      { nome: 'TR 25856', h: 0.25, sup: 8, diag: 5, inf: 6 },
    ],
  },
  {
    id: 'lajes.enchimentos', norma: 'NBR 14859', edicao: 'valores usuais (a confirmar)', titulo: 'Enchimentos de lajes nervuradas (peso específico)',
    fonte: 'Concreto 25 kN/m³ (NBR 6118) e EPS 0,2 kN/m³ (valor usual, a confirmar com o fabricante). Cerâmica e enchimento genérico dependem do peso informado pelo fabricante e são cadastrados na obra (grupo "Tipos de laje").',
    aConfirmar: true, nivel: 'analise', chave: 'id',
    colunas: [
      { chave: 'id', rotulo: 'Id', tipo: 'texto' },
      { chave: 'nome', rotulo: 'Enchimento', tipo: 'texto' },
      { chave: 'material', rotulo: 'Material', tipo: 'texto' },
      { chave: 'gama', rotulo: 'Peso específico', tipo: 'numero', unidade: 'kN/m³' },
    ],
    linhas: [
      { id: 'concreto', nome: 'Concreto', material: 'concreto', gama: 25 },
      { id: 'eps', nome: 'EPS (poliestireno expandido)', material: 'eps', gama: 0.2 },
    ],
  },
];
