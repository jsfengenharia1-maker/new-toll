// Comandos de lançamento da L5: contorno retangular de vigas, aberturas retangulares com viga de borda e cargas
// de um clique (laje inteira e ao longo das vigas). Cada comando é um passo só do desfazer.
import type { Draft } from 'immer';
import { geometriaViga, type BuildingModel, type Viga } from '../building/types';
import { propriedadesLaje, direcaoMenorVao } from '../building/lajes';
import { BORDA_ALTA_H, BORDA_B, dentroDaJanela, retanguloDaAbertura, retanguloNaLaje, retanguloPorLado, type ModoAbertura } from '../building/lancamentoL5';
import { proximaViga } from '../building/vigas';
import { areaPoligono, type P } from '../geom/faces';
import type { Diagnostico } from '../building/verify';
import { casosParaCarga } from '../building/types';
import { registrar } from './registry';
import type { JsonSchema } from './schema';
import { alinharFaceNoRascunho } from './vigas';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const secaoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['b', 'h'], properties: { b: { type: 'number', exclusiveMinimum: 0, maximum: 3, description: 'largura (m)' }, h: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'altura (m)' } } };
const r6 = (v: number) => +v.toFixed(6);
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const casoOk = (b: BuildingModel, caso?: string) => (!caso || casosParaCarga(b).some((c) => c.id === caso) ? [] : err('CASO_INEXISTENTE', `Caso ${caso} não existe.`));

/** Cria as quatro vigas de um retângulo (anti-horário), com o corpo para fora (a linha traçada é a face esquerda). */
function vigasDoRetangulo(d: Draft<BuildingModel>, grupo: string, ret: P[], secao: { b: number; h: number }, chata?: boolean): string[] {
  const ids: string[] = [];
  for (let i = 0; i < 4; i++) {
    const nome = `V${proximaViga(d as BuildingModel, grupo)}`;
    const id = novoId(d, 'v');
    d.vigas.push({ id, nome, grupo, pontos: [ret[i], ret[(i + 1) % 4]], secao: { ...secao }, alinhamento: 'esq', ...(chata ? { chata: true } : {}) });
    ids.push(id);
  }
  return ids;
}

/** Prolonga ou apara as quatro vigas do contorno até os eixos vizinhos se cruzarem (depois do alinhamento pela face, os eixos ficam deslocados). */
function fecharContorno(d: Draft<BuildingModel>, ids: string[]) {
  const vs = ids.map((id) => d.vigas.find((v) => v.id === id)!);
  const eixos = vs.map((v) => geometriaViga(v as Viga).eixo as P[]);
  const cruz = (a: P[], z: P[]): P | null => {
    const d1 = [a[1][0] - a[0][0], a[1][1] - a[0][1]], d2 = [z[1][0] - z[0][0], z[1][1] - z[0][1]], den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-12) return null;
    const t = ((z[0][0] - a[0][0]) * d2[1] - (z[0][1] - a[0][1]) * d2[0]) / den;
    return [a[0][0] + t * d1[0], a[0][1] + t * d1[1]];
  };
  const K = vs.map((_, i) => cruz(eixos[i], eixos[(i + 1) % 4]));
  if (K.some((k) => !k)) return;
  vs.forEach((v, i) => {
    const ini = K[(i + 3) % 4]!, fim = K[i]!, e = eixos[i], dx = e[0][0] - v.pontos[0][0], dy = e[0][1] - v.pontos[0][1]; // deslocamento traçado → eixo
    v.pontos = [[r6(ini[0] - dx), r6(ini[1] - dy)], [r6(fim[0] - dx), r6(fim[1] - dy)]];
  });
}

registrar<{ grupo: string; c1: P; c2: P; c3?: P; secao: { b: number; h: number }; alinhar: boolean }>({
  nome: 'viga.contornoRetangular',
  descricao: 'Cria as quatro vigas do contorno externo retangular, fora do perímetro atual (L5, C6.51): sem `c3`, `c1` e `c2` são cantos opostos e os lados ficam nos eixos (ângulo zero); com `c3`, `c1`–`c2` é um lado em qualquer ângulo e `c3` está no lado oposto. As vigas ficam do lado de fora da linha clicada e, com `alinhar`, são alinhadas pela face externa dos pilares em que se apoiam (`viga.alinharFace`).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'c1', 'c2', 'secao'], properties: {
    grupo: { type: 'string' }, c1: ponto, c2: ponto, c3: ponto, secao: secaoSchema, alinhar: { type: 'boolean', default: true, description: 'alinhar pela face externa dos pilares' },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    return retanguloPorLado(p.c1, p.c2, p.c3) ? [] : err('CONTORNO_DEGENERADO', 'Os pontos não formam um retângulo (lados de pelo menos 5 cm).');
  },
  aplicar(d, p) {
    const ret = retanguloPorLado(p.c1, p.c2, p.c3)!;
    const ids = vigasDoRetangulo(d, p.grupo, ret, p.secao);
    const nomes = d.vigas.filter((v) => ids.includes(v.id)).map((v) => v.nome).join(', ');
    if (p.alinhar !== false) alinharFaceNoRascunho(d, { grupo: p.grupo, ids, lado: 'externa' });
    fecharContorno(d, ids);
    return `Contorno retangular: ${nomes} (${fmt(Math.hypot(ret[1][0] - ret[0][0], ret[1][1] - ret[0][1]))} × ${fmt(Math.hypot(ret[2][0] - ret[1][0], ret[2][1] - ret[1][1]))} m).`;
  },
});

type Modo = ModoAbertura;
type Borda = 'nenhuma' | 'chata' | 'alta';

/** Retângulo da abertura (C7.79 a C7.82); as nervuras só valem em pano treliçado já definido. */
function retanguloAbertura(b: BuildingModel, l: BuildingModel['lajes'][number], p: { modo: Modo; c1: P; c2: P; c3?: P; viga?: string }): P[] | null {
  const nervurado = !l.definir && l.tipo.tipo === 'trelicada';
  return retanguloDaAbertura(p.modo, p.c1, p.c2, p.c3, b.vigas.find((x) => x.id === p.viga)?.pontos as P[] | undefined, nervurado ? (l.direcao ?? direcaoMenorVao(l.contorno as P[])) : null);
}

registrar<{ id: string; modo: Modo; c1: P; c2: P; c3?: P; viga?: string; borda: Borda; secaoBorda?: { b: number; h: number } }>({
  nome: 'laje.aberturaRetangular',
  descricao: 'Abertura retangular numa laje (L5, C7.78 a C7.82) em quatro modos: `viga` (paralela a uma viga escolhida, dois cantos opostos), `zero` (ângulo zero, dois cantos), `nervuras` (no ângulo das nervuras do pano; paralela aos eixos gerais se o pano não tem nervuras) e `qualquer` (dois pontos de um lado em `c1`–`c2` e um ponto do lado oposto em `c3`). `borda`: nenhuma, chata (altura da laje) ou alta (viga traçada automaticamente em volta, largura e altura em `secaoBorda`; padrão 15 × 40 cm [a confirmar]).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'modo', 'c1', 'c2'], properties: {
    id: { type: 'string', description: 'laje' }, modo: { type: 'string', enum: ['viga', 'zero', 'nervuras', 'qualquer'] },
    c1: ponto, c2: ponto, c3: { ...ponto, description: 'ponto do lado oposto (modo qualquer)' }, viga: { type: 'string', description: 'viga de referência (modo viga)' },
    borda: { type: 'string', enum: ['nenhuma', 'chata', 'alta'], default: 'nenhuma' },
    secaoBorda: { ...secaoSchema, description: 'seção da viga de borda alta, ou só a largura (b) da chata' },
  } },
  validar(b, p) {
    const l = b.lajes.find((x) => x.id === p.id);
    if (!l) return err('LAJE_INEXISTENTE', `Laje ${p.id} não existe.`);
    if (p.modo === 'viga' && !b.vigas.some((v) => v.id === p.viga)) return err('VIGA_INEXISTENTE', p.viga ? `Viga ${p.viga} não existe.` : 'O modo `viga` pede a viga de referência.');
    if (p.modo === 'qualquer' && !p.c3) return err('PARAMETRO_INVALIDO', 'O modo `qualquer` pede o ponto do lado oposto (`c3`).');
    const ret = retanguloAbertura(b, l, p);
    if (!ret) return err('ABERTURA_DEGENERADA', 'Os pontos não formam um retângulo (lados de pelo menos 5 cm).');
    return retanguloNaLaje(ret, l.contorno as P[], (l.furos ?? []) as P[][]) ? [] : err('ABERTURA_FORA', 'A abertura precisa ficar dentro da laje e fora das outras aberturas.', [l.id]);
  },
  aplicar(d, p) {
    const l = d.lajes.find((x) => x.id === p.id)!;
    const ret = retanguloAbertura(d as BuildingModel, l as BuildingModel['lajes'][number], p)!;
    const borda = p.borda ?? 'nenhuma';
    const n = (l.furos ?? []).length;
    l.furos = [...(l.furos ?? []), ret.map((q) => [r6(q[0]), r6(q[1])] as P)];
    if (borda !== 'nenhuma' || l.furosBorda) { const fb = [...(l.furosBorda ?? [])]; while (fb.length < n) fb.push('nenhuma'); fb.push(borda); l.furosBorda = fb; }
    let extra = '';
    if (borda !== 'nenhuma') {
      const h = borda === 'chata' ? propriedadesLaje(l.tipo as BuildingModel['lajes'][number]['tipo']).h : (p.secaoBorda?.h ?? BORDA_ALTA_H);
      const ids = vigasDoRetangulo(d, l.grupo, ret, { b: p.secaoBorda?.b ?? BORDA_B, h }, borda === 'chata');
      extra = ` com viga de borda ${borda} (${d.vigas.filter((v) => ids.includes(v.id)).map((v) => v.nome).join(', ')})`;
    }
    return `Abertura retangular em ${l.nome} (${fmt(Math.abs(areaPoligono(ret)))} m²)${extra}.`;
  },
});

registrar<{ laje: string; valor?: number; caso?: string; copiarDe?: string }>({
  nome: 'carga.areaNaLaje',
  descricao: 'Carga de superfície (kN/m²) numa laje inteira (L5, C10.24): o contorno é o da laje. `valor` e `caso`, ou `copiarDe` (id de uma carga existente, de que vêm valor e caso, podendo ser trocados). As aberturas da laje não são descontadas [a confirmar].',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['laje'], properties: {
    laje: { type: 'string' }, valor: { type: 'number', description: 'kN/m²' }, caso: { type: 'string', minLength: 1, description: 'G, Q ou id de caso adicional (padrão Q)' }, copiarDe: { type: 'string', description: 'carga existente a copiar (valor e caso)' },
  } },
  validar(b, p) {
    if (!b.lajes.some((l) => l.id === p.laje)) return err('LAJE_INEXISTENTE', `Laje ${p.laje} não existe.`);
    const c = p.copiarDe ? b.cargas.find((x) => x.id === p.copiarDe) : undefined;
    if (p.copiarDe && !c) return err('CARGA_INEXISTENTE', `Carga ${p.copiarDe} não existe.`);
    if (c && c.tipo !== 'area' && p.valor === undefined) return err('CARGA_NAO_AREA', 'A carga a copiar não é de superfície: informe o valor.');
    if (p.valor === undefined && !c) return err('PARAMETRO_INVALIDO', 'Informe `valor` ou `copiarDe`.');
    return casoOk(b, p.caso);
  },
  aplicar(d, p) {
    const l = d.lajes.find((x) => x.id === p.laje)!, c = p.copiarDe ? d.cargas.find((x) => x.id === p.copiarDe) : undefined;
    const valor = p.valor ?? c!.valor, caso = p.caso ?? c?.caso ?? 'Q';
    const pts = (areaPoligono(l.contorno as P[]) < 0 ? [...l.contorno].reverse() : l.contorno).map((q) => [r6(q[0]), r6(q[1])] as P);
    d.cargas.push({ id: novoId(d, 'c'), grupo: l.grupo, caso, tipo: 'area', valor, pontos: pts });
    return `Carga de ${fmt(valor)} kN/m² (${caso}) em ${l.nome}.`;
  },
});

registrar<{ vigas?: string[]; grupo?: string; janela?: [P, P]; valor: number; caso: string }>({
  nome: 'carga.aoLongoDaViga',
  descricao: 'Cargas lineares (kN/m) ao longo do eixo de vigas (L5, C10.25): uma carga por viga. As vigas vêm em `vigas` (uma a uma) ou de uma `janela` de captura (dois cantos; vigas inteiramente dentro dela) no `grupo`.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['valor'], properties: {
    vigas: { type: 'array', items: { type: 'string' }, minItems: 1 }, grupo: { type: 'string' }, janela: { type: 'array', items: ponto, minItems: 2, maxItems: 2, description: 'dois cantos opostos da janela de captura' },
    valor: { type: 'number', description: 'kN/m' }, caso: { type: 'string', minLength: 1, default: 'G', description: 'G permanente, Q variável ou id de um caso adicional' },
  } },
  validar(b, p) {
    if (!p.vigas === !p.janela) return err('PARAMETRO_INVALIDO', 'Informe `vigas` ou `janela` (um dos dois).');
    const e = casoOk(b, p.caso);
    if (e.length) return e;
    if (p.janela && !p.grupo) return err('PARAMETRO_INVALIDO', 'A janela de captura pede o `grupo`.');
    if (p.grupo && !b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const f = (p.vigas ?? []).filter((id) => !b.vigas.some((v) => v.id === id));
    if (f.length) return err('VIGA_INEXISTENTE', `Viga(s) inexistente(s): ${f.join(', ')}.`);
    return alvos(b, p).length ? [] : err('SEM_VIGAS', 'Nenhuma viga na janela.');
  },
  aplicar(d, p) {
    const vs = alvos(d as BuildingModel, p);
    for (const v of vs) d.cargas.push({ id: novoId(d, 'c'), grupo: v.grupo, caso: p.caso, tipo: 'linha', valor: p.valor, pontos: geometriaViga(v).eixo.map((q) => [r6(q[0]), r6(q[1])] as P) });
    return `${vs.length} carga(s) linear(es) de ${fmt(p.valor)} kN/m (${p.caso}) ao longo de ${vs.map((v) => v.nome).join(', ')}.`;
  },
});

/** Vigas alvo das cargas ao longo da viga: as listadas, ou as do grupo inteiramente dentro da janela. */
function alvos(b: BuildingModel, p: { vigas?: string[]; grupo?: string; janela?: [P, P] }): Viga[] {
  if (p.vigas) return p.vigas.map((id) => b.vigas.find((v) => v.id === id)).filter((v): v is Viga => !!v);
  return b.vigas.filter((v) => v.grupo === p.grupo && dentroDaJanela(geometriaViga(v).eixo, p.janela!));
}
