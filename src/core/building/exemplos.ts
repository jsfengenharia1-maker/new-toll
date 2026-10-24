// Obras de exemplo (fictícias) da tela de obras recentes (L1, C1.44). Cada uma devolve uma Sessao pronta.
import { Sessao } from '../commands';
import { edificioExemplo } from '../sheets/exemplo';
import { ESPEC_PADRAO, type EspecificacaoObra } from './assistente';
import { edificioVazio } from './types';
import { vigasIncoerentes } from './planos';

export type IdExemplo = 'predio' | 'subsolo' | 'vigotas' | 'telhado' | 'mansarda' | 'rampaGaragem' | 'rampaPavimentos';
export interface ExemploObra { id: IdExemplo; nome: string; descricao: string[]; resumo: string }

export const EXEMPLOS_OBRA: ExemploObra[] = [
  { id: 'predio', nome: 'Exemplo: residencial de 5 pavimentos', descricao: ['Obra fictícia: térreo, 3 tipos e cobertura', 'Pórtico 3 × 2 vãos, lajes maciças de 12 cm'], resumo: '5 pavimentos, 12 pilares, lajes maciças' },
  { id: 'subsolo', nome: 'Exemplo: com subsolo de garagem', descricao: ['Obra fictícia: subsolo, térreo, 2 tipos e cobertura', 'Mesmo pórtico 3 × 2 vãos em todos os pavimentos'], resumo: '5 pavimentos, 12 pilares, subsolo como garagem' },
  { id: 'telhado', nome: 'Exemplo: cobertura em duas águas', descricao: ['Obra fictícia: térreo, um tipo e cobertura em lajes inclinadas', 'Duas águas a 30 % com cumeeira no eixo central (planos inclinados)'], resumo: '3 pavimentos, 12 pilares, telhado de duas águas' },
  { id: 'mansarda', nome: 'Exemplo: mansarda com águas-furtadas', descricao: ['Obra fictícia: térreo e cobertura em mansarda (duas inclinações por vertente, 60 % e 20 %)', 'Água-furtada de duas águas na vertente sul, com vales diagonais e cumeeira própria'], resumo: '2 pavimentos, 17 pilares, 11 panos em 6 planos' },
  { id: 'rampaGaragem', nome: 'Exemplo: rampa de garagem para o subsolo', descricao: ['Obra fictícia: subsolo, rampa em grupo intermediário e térreo', 'Pilares próprios da rampa, muro de contenção na base e viga comum no topo'], resumo: '3 pavimentos, 5 pilares, rampa de 0,5 m a 2,5 m' },
  { id: 'rampaPavimentos', nome: 'Exemplo: rampa entre pavimentos de estacionamento', descricao: ['Obra fictícia: dois pavimentos de estacionamento ligados por rampa de 15 %', 'Pano horizontal na extremidade superior e rampa com desnível negativo no grupo superior'], resumo: '2 pavimentos, 12 pilares, rampa de 14 m' },
  { id: 'vigotas', nome: 'Exemplo: lajes treliçadas', descricao: ['Obra fictícia: térreo, 2 tipos e cobertura', 'Lajes dos tipos em vigotas treliçadas H16, demais maciças'], resumo: '4 pavimentos, 12 pilares, treliçadas H16 nos tipos' },
];

const XS = [0, 5, 10, 15], YS = [0, 4.5, 9];

/** Lança a malha de pilares e as vigas/lajes em cada grupo. `tipoLaje(nomeGrupo)` devolve o `tipo` de `laje.detectarPanos`. */
function lancar(s: Sessao, tipoLaje: (grupo: string) => Record<string, unknown>) {
  const ok = (nome: string, params: Record<string, unknown>) => {
    const r = s.executar(nome, params);
    if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`);
  };
  ok('lote', { comandos: XS.flatMap((x) => YS.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.2, h: 0.5 } } }))) });
  for (const g of [...s.modelo.grupos]) {
    ok('lote', { comandos: [
      ...YS.map((y) => ({ nome: 'viga.tracar', params: { grupo: g.id, pontos: [[0, y], [15, y]], secao: { b: 0.15, h: 0.5 } } })),
      ...XS.map((x) => ({ nome: 'viga.tracar', params: { grupo: g.id, pontos: [[x, 0], [x, 9]], secao: { b: 0.15, h: 0.5 } } })),
    ] });
    ok('laje.detectarPanos', { grupo: g.id, tipo: tipoLaje(g.nome) });
  }
  ok('eixo.malha', { dx: [5, 5, 5], dy: [4.5, 4.5] });
}

type Pt = [number, number];
const SEC = { b: 0.15, h: 0.4 };
const PIL = { tipo: 'ret', b: 0.25, h: 0.25 };

function exec(s: Sessao) {
  return (nome: string, params: Record<string, unknown>) => {
    const r = s.executar(nome, params);
    if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`);
  };
}

/** Obras de planos inclinados lançadas pela sequência recomendada (SEQUENCIA_PLANOS): tudo na horizontal e depois os planos (E5d, C7.77). */
function criarPlanos(id: 'mansarda' | 'rampaGaragem' | 'rampaPavimentos', meta: { nome: string; descricao: string[]; origem: 'exemplo' }): Sessao {
  const s = new Sessao(edificioVazio());
  const ok = exec(s);
  ok('obra.definir', meta);
  const vigas = (g: string, ls: Pt[][]) => ok('lote', { comandos: ls.map((pontos) => ({ nome: 'viga.tracar', params: { grupo: g, pontos, secao: SEC } })) });
  const laje = (g: string, contorno: Pt[], h = 0.12) => ok('laje.criar', { grupo: g, contorno, tipo: { tipo: 'macica', h } });
  const atribuir = (g: string, nome: string, def: Record<string, unknown>, doPano: (c: Pt) => boolean) => {
    ok('plano.criar', { grupo: g, nome, ...def });
    const pl = s.modelo.planos![s.modelo.planos!.length - 1];
    ok('plano.atribuir', { plano: pl.id, lajes: s.modelo.lajes.filter((l) => l.grupo === g && !l.plano && doPano([l.contorno.reduce((t, p) => t + p[0], 0) / l.contorno.length, l.contorno.reduce((t, p) => t + p[1], 0) / l.contorno.length])).map((l) => l.id) });
  };
  const corrigir = () => ok('plano.corrigirVigas', { vigas: [...new Set(vigasIncoerentes(s.modelo).map((x) => x.viga))] });
  if (id === 'mansarda') {
    ok('pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
    ok('pavimento.criar', { nome: 'Cobertura', cota: 3, uso: 'comum' });
    const g = s.modelo.pavimentos[1].grupo;
    const XS3 = [0, 5, 10], YS5 = [0, 2, 4.5, 7, 9];
    for (const x of XS3) for (const y of YS5) ok('pilar.inserir', { x, y, secao: PIL });
    for (const [x, y] of [[7.5, 0], [7.5, 2]]) ok('pilar.inserir', { x, y, secao: PIL });
    const seg = (xs: number[]) => xs.slice(1).map((x, i) => [xs[i], x]);
    vigas(g, [
      ...XS3.flatMap((x) => seg(YS5).map(([a, b]) => [[x, a], [x, b]] as Pt[])),
      ...[0, 2].flatMap((y) => seg([0, 5, 7.5, 10]).map(([a, b]) => [[a, y], [b, y]] as Pt[])),
      ...[4.5, 7, 9].flatMap((y) => seg([0, 5, 10]).map(([a, b]) => [[a, y], [b, y]] as Pt[])),
      [[7.5, 0], [7.5, 2]], [[5, 0], [7.5, 2]], [[10, 0], [7.5, 2]],
    ]);
    // painéis: faixas de 5 m em x; a água-furtada (x 5 a 10, y 0 a 2) vira dois panos de água-furtada e dois de vertente entre os vales
    for (const [a, b] of [[0, 5], [5, 10]]) for (const [c, d] of seg(YS5)) { if (a === 5 && c === 0) continue; laje(g, [[a, c], [b, c], [b, d], [a, d]]); }
    for (const t of [[[5, 0], [5, 2], [7.5, 2]], [[10, 0], [10, 2], [7.5, 2]], [[5, 0], [7.5, 0], [7.5, 2]], [[10, 0], [7.5, 0], [7.5, 2]]] as Pt[][]) laje(g, t);
    // vertentes da mansarda: inclinação inferior de 60 % e superior de 20 %, cumeeira horizontal em z = 1,70 m
    const em = (c: Pt, x0: number, x1: number, y0: number, y1: number) => c[0] > x0 && c[0] < x1 && c[1] > y0 && c[1] < y1;
    atribuir(g, 'Água-furtada oeste', { tipo: 'tresPontos', pontos: [[5, 0, 0], [7.5, 0, 0.9], [7.5, 2, 1.2]] }, (c) => c[0] > 5.5 && c[0] < 7.5 && c[1] < 0.7);
    atribuir(g, 'Água-furtada leste', { tipo: 'tresPontos', pontos: [[10, 0, 0], [7.5, 0, 0.9], [7.5, 2, 1.2]] }, (c) => c[0] > 7.5 && c[0] < 9.5 && c[1] < 0.7);
    atribuir(g, 'Vertente sul baixa', { tipo: 'maximaDeclividade', pontos: [[0, 0], [0, 2]], desnivel: 0, inclinacao: 60 }, (c) => c[1] < 2);
    atribuir(g, 'Vertente sul alta', { tipo: 'maximaDeclividade', pontos: [[0, 2], [0, 4.5]], desnivel: 1.2, inclinacao: 20 }, (c) => em(c, -1, 11, 2, 4.5));
    atribuir(g, 'Vertente norte alta', { tipo: 'maximaDeclividade', pontos: [[0, 7], [0, 4.5]], desnivel: 1.2, inclinacao: 20 }, (c) => em(c, -1, 11, 4.5, 7));
    atribuir(g, 'Vertente norte baixa', { tipo: 'maximaDeclividade', pontos: [[0, 9], [0, 7]], desnivel: 0, inclinacao: 60 }, (c) => c[1] > 7);
    corrigir();
    return s;
  }
  if (id === 'rampaGaragem') {
    ok('pavimento.criar', { nome: 'Subsolo', cota: 0, uso: 'comum' });
    ok('pavimento.criar', { nome: 'Rampa', cota: 1.5, uso: 'comum' });
    ok('pavimento.criar', { nome: 'Térreo', cota: 3, uso: 'comum' });
    const [, rampa, terreo] = s.modelo.pavimentos;
    // pilares próprios da rampa: a base (y = 0) morre na rampa; o topo (y = 6) sobe até o térreo
    for (const [x, y] of [[0, 0], [3, 0]]) ok('pilar.inserir', { x, y, secao: PIL, morre: rampa.id });
    for (const [x, y] of [[0, 6], [3, 6]]) ok('pilar.inserir', { x, y, secao: PIL });
    vigas(rampa.grupo, [[[0, 0], [3, 0]], [[0, 6], [3, 6]], [[0, 0], [0, 6]], [[3, 0], [3, 6]]]);
    laje(rampa.grupo, [[0, 0], [3, 0], [3, 6], [0, 6]], 0.15);
    // viga comum (horizontal) no topo da rampa, no grupo do térreo
    vigas(terreo.grupo, [[[0, 6], [3, 6]]]);
    atribuir(rampa.grupo, 'Rampa', { tipo: 'maximaDeclividade', pontos: [[0, 0], [0, 6]], desnivel: -1, inclinacao: 100 / 3 }, () => true);
    corrigir();
    // muro de contenção na base da rampa, fora do pano (o pano inclinado não se apoia em muro)
    ok('parede.criar', { pontos: [[-0.25, -0.3], [3.25, -0.3]], espessura: 0.2, tipo: 'concreto', nasce: 'fundacao', morre: rampa.id });
    return s;
  }
  // rampa entre pavimentos de estacionamento: pano horizontal na extremidade superior e rampa com desnível negativo no grupo superior
  ok('pavimento.criar', { nome: 'Estacionamento 1', cota: 0, uso: 'comum' });
  ok('pavimento.criar', { nome: 'Estacionamento 2', cota: 2.8, uso: 'comum' });
  const [p1, p2] = s.modelo.pavimentos;
  const X = [0, 6, 9.5, 13, 16.5, 20];
  for (const x of X) for (const y of [0, 3]) ok('pilar.inserir', { x, y, secao: PIL });
  const trecho = (xs: number[]) => xs.slice(1).map((x, i) => [[xs[i], 0], [x, 0]] as Pt[]);
  for (const g of [p1.grupo, p2.grupo]) {
    const xs = X; // no pavimento inferior só há vigas sob a rampa (baldrame); lajes só no pano horizontal
    vigas(g, [...xs.map((x) => [[x, 0], [x, 3]] as Pt[]), ...trecho(xs), ...trecho(xs).map((t) => t.map(([x]) => [x, 3] as Pt))]);
    xs.slice(1).forEach((x, i) => { if (g === p2.grupo || i === 0) laje(g, [[xs[i], 0], [x, 0], [x, 3], [xs[i], 3]], 0.15); });
  }
  atribuir(p2.grupo, 'Rampa', { tipo: 'maximaDeclividade', pontos: [[6, 0], [20, 0]], desnivel: 0, inclinacao: -15 }, (c) => c[0] > 6);
  corrigir();
  return s;
}

export function criarExemplo(id: IdExemplo): Sessao {
  const ex = EXEMPLOS_OBRA.find((e) => e.id === id)!;
  const meta = { nome: ex.nome, descricao: ex.descricao, origem: 'exemplo' as const };
  if (id === 'predio') {
    const s = edificioExemplo();
    const r = s.executar('obra.definir', meta);
    if (!r.ok) throw new Error(`obra.definir: ${r.erros.map((e) => e.mensagem).join(' ')}`);
    return s;
  }
  if (id === 'mansarda' || id === 'rampaGaragem' || id === 'rampaPavimentos') return criarPlanos(id, meta);
  const s = new Sessao(edificioVazio());
  const pavimentos: EspecificacaoObra['pavimentos'] = id === 'subsolo'
    ? [
      { nome: 'Subsolo', peDireito: 3, categoria: 'garagem', repeticoes: 1 },
      { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 },
      { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 2 },
      { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 },
    ]
    : id === 'telhado' ? [
      { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 },
      { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 1 },
      { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 },
    ] : [
      { nome: 'Térreo', peDireito: 3, categoria: 'comum', repeticoes: 1 },
      { nome: 'Tipo', peDireito: 3, categoria: 'residencial', repeticoes: 2 },
      { nome: 'Cobertura', peDireito: 3, categoria: 'cobertura', repeticoes: 1 },
    ];
  const espec: EspecificacaoObra = { ...ESPEC_PADRAO, ...meta, pavimentos };
  const r = s.executar('obra.assistente', { espec });
  if (!r.ok) throw new Error(`obra.assistente: ${r.erros.map((e) => e.mensagem).join(' ')}`);
  if (id === 'telhado') {
    lancar(s, () => ({ tipo: 'macica', h: 0.12 }));
    // E3f (C7.71, C7.77): duas águas a 30 % descendo para os beirais y = 0 e y = 9, cumeeira em y = 4,5; vigas coerentes com os panos
    const ok = (nome: string, params: Record<string, unknown>) => { const r = s.executar(nome, params); if (!r.ok) throw new Error(`${nome}: ${r.erros.map((e) => e.mensagem).join(' ')}`); };
    const g = s.modelo.grupos.find((x) => x.nome === 'Cobertura')!.id;
    // os caibros (vigas em y) param na cumeeira: cada água tem o seu
    for (const v of s.modelo.vigas.filter((x) => x.grupo === g && x.pontos[0][0] === x.pontos[1][0])) ok('viga.dividir', { id: v.id, ponto: [v.pontos[0][0], 4.5] });
    ok('plano.criar', { grupo: g, nome: 'Água sul', tipo: 'maximaDeclividade', pontos: [[0, 0], [0, 4.5]], desnivel: 0, inclinacao: 30 });
    ok('plano.criar', { grupo: g, nome: 'Água norte', tipo: 'maximaDeclividade', pontos: [[0, 9], [0, 4.5]], desnivel: 0, inclinacao: 30 });
    const [sul, norte] = s.modelo.planos!;
    const ls = s.modelo.lajes.filter((l) => l.grupo === g), cy = (l: (typeof ls)[number]) => l.contorno.reduce((t, p) => t + p[1], 0) / l.contorno.length;
    ok('plano.atribuir', { plano: sul.id, lajes: ls.filter((l) => cy(l) < 4.5).map((l) => l.id) });
    ok('plano.atribuir', { plano: norte.id, lajes: ls.filter((l) => cy(l) > 4.5).map((l) => l.id) });
    ok('plano.corrigirVigas', { vigas: [...new Set(vigasIncoerentes(s.modelo, g).map((x) => x.viga))] });
    return s;
  }
  lancar(s, id === 'vigotas' ? (g) => (g === 'Tipo' ? { tipo: 'trelicada', modelo: 'H16', capa: 0.04 } : { tipo: 'macica', h: 0.12 }) : () => ({ tipo: 'macica', h: 0.12 }));
  return s;
}
