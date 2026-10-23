// Tabelas de fábrica (N3): método tabular da NBR 15200 (edição de 2004 e uma face de 2012), eficiência dos revestimentos e
// TRRF por ocupação e altura (IT 06 do CBMMG). Valores idênticos aos de `building/fogoTabelas.ts` (que lê daqui).
import type { ColunaNorma, LinhaNorma, TabelaNormaInfo } from './tipos';

const TRRF = [30, 60, 90, 120];
const FONTE_2004 = 'NBR 15200:2004, seção 7.2 (texto da norma). A edição de 2012 acrescenta 180 min e pode alterar valores: tabelas ainda não transcritas.';
const cTrrf: ColunaNorma = { chave: 'trrf', rotulo: 'TRRF', tipo: 'numero', unidade: 'min' };
const base = { norma: 'NBR 15200', edicao: 'NBR 15200:2004', fonte: FONTE_2004, aConfirmar: true, nivel: 'detalhe' as const, chave: 'trrf', chavesFixas: TRRF };
const porTrrf = (f: (i: number) => Omit<LinhaNorma, 'trrf'>): LinhaNorma[] => TRRF.map((trrf, i) => ({ trrf, ...f(i) }));
const achata = (ps: number[][]) => ps.flat();

const NERV_BI = { n: [[[80, 15]], [[100, 35], [120, 25], [190, 15]], [[120, 45], [160, 40], [250, 30]], [[160, 60], [190, 55], [300, 40]]], capa: [[80, 10], [80, 10], [100, 15], [120, 20]] };
const NERV_CO = { n: [[[80, 10]], [[100, 25], [120, 15], [190, 10]], [[120, 35], [160, 25], [250, 15]], [[160, 45], [190, 40], [300, 30]]], capa: [[80, 10], [80, 10], [100, 15], [120, 20]] };
const VIGA_BI = { c: [[[80, 25], [120, 20], [160, 15], [190, 15]], [[120, 40], [160, 35], [190, 30], [300, 25]], [[140, 55], [190, 45], [300, 40], [400, 35]], [[190, 65], [240, 60], [300, 55], [500, 50]]], bw: [80, 100, 100, 120] };
const VIGA_CO = { c: [[[80, 15], [160, 12], [190, 12]], [[120, 25], [190, 12], [300, 12]], [[140, 35], [250, 25], [400, 25]], [[200, 45], [300, 35], [450, 35]]], bw: [80, 100, 100, 120] };
const PILAR = [[[190, 25], [190, 25], [190, 30]], [[190, 25], [190, 35], [250, 45]], [[190, 30], [300, 45], [450, 40]], [[250, 40], [350, 45], [450, 50]]];

const colsNerv: ColunaNorma[] = [cTrrf, { chave: 'pares', rotulo: 'Nervura: pares bmín; c1', tipo: 'lista', unidade: 'mm', pares: true }, { chave: 'capaH', rotulo: 'Capa h mín.', tipo: 'numero', unidade: 'mm' }, { chave: 'capaC1', rotulo: 'Capa c1', tipo: 'numero', unidade: 'mm' }];
const colsViga: ColunaNorma[] = [cTrrf, { chave: 'bw', rotulo: 'bw mín. da alma', tipo: 'numero', unidade: 'mm' }, { chave: 'pares', rotulo: 'Combinações: pares bmín; c1', tipo: 'lista', unidade: 'mm', pares: true }];

const trrfOcup: [string, string, string, (number | null)[]][] = [
  ['A-1, A-2, A-3', 'A', 'Residencial', [90, 60, 30, 30, 60, 90, 120]],
  ['B-1, B-2', 'B', 'Serviços de hospedagem', [90, 60, 30, 60, 60, 90, 120]],
  ['C-1', 'C', 'Comercial varejista (baixa carga de incêndio)', [90, 60, 60, 60, 60, 90, 120]],
  ['C-2, C-3', 'C', 'Comercial varejista (média e alta carga, shopping)', [90, 60, 60, 60, 60, 90, 120]],
  ['D-1, D-2, D-3, D-4', 'D', 'Serviços profissionais, pessoais e técnicos', [90, 60, 30, 60, 60, 90, 120]],
  ['E-1, E-2, E-3, E-4, E-5, E-6', 'E', 'Educacional e cultura física', [90, 60, 30, 30, 60, 90, 120]],
  ['F-1, F-2, F-5, F-6, F-8, F-10', 'F', 'Locais de reunião de público', [90, 60, 60, 60, 60, 90, 120]],
  ['F-3, F-4, F-7', 'F', 'Locais de reunião de público (estádios, terminais, eventos)', [90, 60, 60, 60, 30, 30, null]],
  ['G-1, G-2, G-3, G-4, G-5, G-6', 'G', 'Serviços automotivos (G-1 e G-2 não abertos lateralmente)', [90, 60, 30, 60, 60, 90, 120]],
  ['G-1 aberta, G-2 aberta', 'G', 'Garagens abertas lateralmente', [90, 60, 30, 30, 30, 30, 60]],
  ['H-1, H-2, H-3, H-4, H-5, H-6', 'H', 'Serviços de saúde e institucionais', [90, 60, 30, 60, 60, 90, 120]],
  ['I-1', 'I', 'Industrial (baixo potencial de incêndio)', [90, 60, 30, 30, 30, 60, 120]],
  ['I-2', 'I', 'Industrial (médio potencial de incêndio)', [120, 90, 30, 30, 60, 90, 120]],
  ['I-3', 'I', 'Industrial (alto potencial de incêndio)', [120, 90, 60, 60, 90, 120, 120]],
  ['J-1', 'J', 'Depósitos (incombustível)', [60, 30, 30, 30, 30, 30, 60]],
  ['J-2', 'J', 'Depósitos (baixo risco)', [90, 60, 30, 30, 30, 30, 60]],
  ['J-3', 'J', 'Depósitos (médio risco)', [90, 60, 30, 60, 60, 120, 120]],
  ['J-4', 'J', 'Depósitos (alto risco)', [120, 90, 60, 60, 90, 120, 120]],
];
export const CLASSES_TRRF_COL = ['S2', 'S1', 'P1', 'P2', 'P3', 'P4', 'P5'];

export const NORMAS_FOGO: TabelaNormaInfo[] = [
  {
    ...base, id: 'nbr15200.laje-apoiada', titulo: 'Lajes maciças apoiadas em vigas (Tabela 4)',
    colunas: [cTrrf, { chave: 'h', rotulo: 'h mín.', tipo: 'numero', unidade: 'mm' }, { chave: 'duas15', rotulo: 'c1, duas direções ly/lx ≤ 1,5', tipo: 'numero', unidade: 'mm' }, { chave: 'duas20', rotulo: 'c1, duas direções ly/lx ≤ 2', tipo: 'numero', unidade: 'mm' }, { chave: 'uma', rotulo: 'c1, uma direção', tipo: 'numero', unidade: 'mm' }],
    linhas: porTrrf((i) => ({ h: [60, 80, 100, 120][i], duas15: [10, 10, 15, 20][i], duas20: [10, 15, 20, 25][i], uma: [10, 20, 30, 40][i] })),
  },
  {
    ...base, id: 'nbr15200.laje-lisa', titulo: 'Lajes lisas ou cogumelo (Tabela 5)',
    colunas: [cTrrf, { chave: 'h', rotulo: 'h mín.', tipo: 'numero', unidade: 'mm' }, { chave: 'c1', rotulo: 'c1', tipo: 'numero', unidade: 'mm' }],
    linhas: porTrrf((i) => ({ h: [150, 180, 200, 200][i], c1: [10, 15, 25, 35][i] })),
  },
  {
    ...base, id: 'nbr15200.nervurada-biapoiada', titulo: 'Lajes nervuradas biapoiadas (Tabela 6)', colunas: colsNerv,
    linhas: porTrrf((i) => ({ pares: achata(NERV_BI.n[i]), capaH: NERV_BI.capa[i][0], capaC1: NERV_BI.capa[i][1] })),
  },
  {
    ...base, id: 'nbr15200.nervurada-continua', titulo: 'Lajes nervuradas em 3 ou 4 lados ou contínuas (Tabela 7)', colunas: colsNerv,
    linhas: porTrrf((i) => ({ pares: achata(NERV_CO.n[i]), capaH: NERV_CO.capa[i][0], capaC1: NERV_CO.capa[i][1] })),
  },
  {
    ...base, id: 'nbr15200.viga-biapoiada', titulo: 'Vigas biapoiadas (Tabela 8)', colunas: colsViga,
    linhas: porTrrf((i) => ({ bw: VIGA_BI.bw[i], pares: achata(VIGA_BI.c[i]) })),
  },
  {
    ...base, id: 'nbr15200.viga-continua', titulo: 'Vigas contínuas ou de pórticos (Tabela 9)', colunas: colsViga,
    linhas: porTrrf((i) => ({ bw: VIGA_CO.bw[i], pares: achata(VIGA_CO.c[i]) })),
  },
  {
    ...base, id: 'nbr15200.pilar-2004', titulo: 'Pilares com mais de uma face exposta, método tabular de 2004 (Tabela 10)',
    fonte: `${FONTE_2004} Só vale com a opção de método tabular dos pilares; a edição de 2012 usa o método analítico.`,
    colunas: [cTrrf, { chave: 'mu02', rotulo: 'μfi = 0,2: bmín; c1', tipo: 'lista', unidade: 'mm', pares: true }, { chave: 'mu05', rotulo: 'μfi = 0,5: bmín; c1', tipo: 'lista', unidade: 'mm', pares: true }, { chave: 'mu07', rotulo: 'μfi = 0,7: bmín; c1', tipo: 'lista', unidade: 'mm', pares: true }],
    linhas: porTrrf((i) => ({ mu02: PILAR[i][0], mu05: PILAR[i][1], mu07: PILAR[i][2] })),
  },
  {
    ...base, id: 'nbr15200.pilar-uma-face', edicao: 'NBR 15200:2012', titulo: 'Pilares com uma face exposta (2012)', chavesFixas: undefined,
    fonte: 'NBR 15200:2012 reproduzida em monografia da UFU (TRRF 30 a 180 min); conferir no texto da norma.',
    colunas: [cTrrf, { chave: 'b', rotulo: 'bmín', tipo: 'numero', unidade: 'mm' }, { chave: 'c1', rotulo: 'c1', tipo: 'numero', unidade: 'mm' }],
    linhas: [{ trrf: 30, b: 155, c1: 25 }, { trrf: 60, b: 155, c1: 25 }, { trrf: 90, b: 155, c1: 25 }, { trrf: 120, b: 175, c1: 35 }, { trrf: 180, b: 230, c1: 55 }],
  },
  {
    ...base, id: 'nbr15200.revestimento', titulo: 'Eficiência dos revestimentos em relação ao concreto', chavesFixas: ['cal', 'cimento', 'protetor'], chave: 'material',
    fonte: 'Cal 0,67 e cimento 1,0 (NBR 15200, 7.2 d); protetor (gesso, vermiculita, fibras) 2,5 da edição de 2004: a de 2012 exige eficiência demonstrada em ensaio.',
    colunas: [{ chave: 'material', rotulo: 'Material (cal | cimento | protetor)', tipo: 'texto' }, { chave: 'eficiencia', rotulo: 'Eficiência', tipo: 'numero' }],
    linhas: [{ material: 'cal', eficiencia: 0.67 }, { material: 'cimento', eficiencia: 1 }, { material: 'protetor', eficiencia: 2.5 }],
  },
  {
    id: 'nbr14432.trrf-ocupacao', norma: 'NBR 14432 / IT 06', edicao: 'IT 06 do CBMMG (2005), Tabela 5', titulo: 'TRRF por ocupação e altura',
    fonte: 'Valores sem as reduções entre parênteses; a IT do estado da obra prevalece sobre a NBR 14432. Nulo = consultar o corpo técnico dos bombeiros.', aConfirmar: true, nivel: 'detalhe', chave: 'divisoes',
    colunas: [
      { chave: 'divisoes', rotulo: 'Divisões (separadas por vírgula)', tipo: 'texto' }, { chave: 'grupo', rotulo: 'Grupo', tipo: 'texto' }, { chave: 'ocupacao', rotulo: 'Ocupação', tipo: 'texto' },
      ...CLASSES_TRRF_COL.map((c): ColunaNorma => ({ chave: c, rotulo: c === 'S2' ? 'S2 (subsolo > 10 m)' : c === 'S1' ? 'S1 (subsolo ≤ 10 m)' : c, tipo: 'numero', unidade: 'min', nulo: true })),
    ],
    linhas: trrfOcup.map(([divisoes, grupo, ocupacao, v]) => ({ divisoes, grupo, ocupacao, ...Object.fromEntries(CLASSES_TRRF_COL.map((c, k) => [c, v[k]])) })),
  },
];
