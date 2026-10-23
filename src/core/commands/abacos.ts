// Comandos dos ábacos das lajes nervuradas bidirecionais (frente E3d): geração automática nos pilares (parâmetros das opções
// `abaco*` ou informados), ábacos manuais por polígono, edição, remoção e armadura base entre nervuras. O ábaco é zona maciça
// (cubetas retiradas, ajustadas às nervuras inteiras) com a altura total `hAbaco`, que pode descer abaixo da laje.
import type { Draft } from 'immer';
import { areaPoligono, type P } from '../geom/faces';
import { gerarAbacos, parametrosAbaco, validarAbaco } from '../building/abacos';
import { opcoesEmUso, perfilDe } from '../building/opcoes';
import type { Abaco, ArmaduraBaseAbaco, BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const r4 = (v: number) => +v.toFixed(4);
const anti = (p: P[]): [number, number][] => (areaPoligono(p) < 0 ? [...p].reverse() : p).map((q) => [r4(q[0]), r4(q[1])] as [number, number]);
const barras: JsonSchema = { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 6, description: 'barras em cada vão entre eixos de nervuras' }, phi: { type: 'number', enum: [5, 6.3, 8, 10, 12.5, 16, 20, 25] } }, description: 'n barras de φ mm em cada vão' };
const semFaces: JsonSchema = { type: 'array', items: { type: 'string', enum: ['inf', 'sup'] }, description: 'faces sem armadura base' };
type FaceBase = { n: number; phi: number };
/** Aplica `inf`, `sup` e `sem` sobre a armadura base atual (as faces em `sem` ficam sem armadura). */
function aplicarBase(atual: ArmaduraBaseAbaco | undefined, x: { inf?: FaceBase; sup?: FaceBase; sem?: ('inf' | 'sup')[] }): ArmaduraBaseAbaco {
  const base: ArmaduraBaseAbaco = atual ? (JSON.parse(JSON.stringify(atual)) as ArmaduraBaseAbaco) : {};
  if (x.inf) base.inf = { ...x.inf };
  if (x.sup) base.sup = { ...x.sup };
  for (const f of x.sem ?? []) base[f] = null;
  return base;
}

// ---------------------------------------------------------------- abaco.gerar

interface ParamsGerar {
  lajes?: string[]; grupo?: string; pilares?: string[]; fracao?: number; cone?: number; extensao?: number; limMin?: number; limMax?: number; hAbaco?: number;
  somenteSemViga?: boolean; substituir?: boolean;
}
const lajesDe = (b: BuildingModel, p: Pick<ParamsGerar, 'lajes' | 'grupo'>) => b.lajes.filter((l) => l.tipo.tipo === 'nervurada' && !l.definir && (p.lajes ? p.lajes.includes(l.id) : p.grupo ? l.grupo === p.grupo : true));

registrar<ParamsGerar>({
  nome: 'abaco.gerar',
  descricao: 'Gera os ábacos automáticos das lajes nervuradas bidirecionais (E3d) nos pilares do pano. Em cada face do pilar, a dimensão = `fracao` (padrão 1/6) da distância entre eixos ao pilar mais próximo dentro do cone de busca (`cone`, semiabertura em graus; padrão 40); sem pilar no cone vale a do sentido oposto, e sem pilar nenhum o mínimo; a extensão fica entre `limMin` e `limMax` (padrão 2,5 e 5) vezes a altura do ábaco `hAbaco` (m; padrão a altura total da laje) e `extensao` (% da distância) soma uma faixa maciça além. Os parâmetros omitidos vêm das opções “Ábacos”. `lajes` (ids) ou `grupo` escolhem os panos (padrão: todos os nervurados); `pilares` restringe aos pilares dados (senão só os sem viga encostada, salvo `somenteSemViga: false`). Com `substituir` (padrão), os ábacos automáticos anteriores dos panos saem (a armadura base de cada um é mantida pelo pilar) e os manuais ficam.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    lajes: ids, grupo: { type: 'string' }, pilares: ids,
    fracao: { type: 'number', minimum: 0.02, maximum: 0.5 }, cone: { type: 'number', minimum: 5, maximum: 89 }, extensao: { type: 'number', minimum: 0, maximum: 30 },
    limMin: { type: 'number', minimum: 0.5, maximum: 10 }, limMax: { type: 'number', minimum: 1, maximum: 20 }, hAbaco: { type: 'number', minimum: 0.1, maximum: 1.2 },
    somenteSemViga: { type: 'boolean' }, substituir: { type: 'boolean', default: true },
  } },
  validar(b, p) {
    if (p.lajes) { const sem = p.lajes.filter((id) => !b.lajes.some((l) => l.id === id)); if (sem.length) return err('LAJE_INEXISTENTE', `Laje(s) inexistente(s): ${sem.join(', ')}.`); }
    if (p.grupo && !b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    if (p.pilares) { const sem = p.pilares.filter((id) => !b.pilares.some((x) => x.id === id)); if (sem.length) return err('PILAR_INEXISTENTE', `Pilar(es) inexistente(s): ${sem.join(', ')}.`); }
    const ls = lajesDe(b, p);
    if (!ls.length) return err('LAJE_NAO_NERVURADA', 'Nenhuma laje nervurada bidirecional entre as escolhidas: só ela tem ábaco.');
    const op = opcoesEmUso(b.opcoes, perfilDe(b)), par = parametrosAbaco(op, p);
    if (par.limMax < par.limMin) return err('PARAMETRO_INVALIDO', 'O comprimento máximo do ábaco não pode ser menor que o mínimo.');
    if (p.hAbaco !== undefined) { const e = ls.flatMap((l) => validarAbaco(b, l.id, undefined, p.hAbaco)); if (e.length) return err('ABACO_INCOERENTE', e[0]); }
    const n = ls.reduce((t, l) => t + gerarAbacos(b, l, par, { pilares: p.pilares, hAbaco: p.hAbaco, somenteSemViga: p.somenteSemViga }).gerados.length, 0);
    return n ? [] : err('ABACO_NENHUM', 'Nenhum pilar para gerar ábaco: os pilares do pano têm viga encostada (use `pilares` ou `somenteSemViga: false`) ou não há pilares no pano.');
  },
  aplicar(d, p) {
    const b = d as BuildingModel, op = opcoesEmUso(b.opcoes, perfilDe(b)), par = parametrosAbaco(op, p), ls = lajesDe(b, p);
    const antes = new Map<string, ArmaduraBaseAbaco | undefined>();
    if (p.substituir !== false) {
      const sai = new Set(ls.map((l) => l.id));
      for (const a of d.abacos ?? []) if (a.automatico && sai.has(a.laje) && a.pilar) antes.set(`${a.laje}|${a.pilar}`, a.base as ArmaduraBaseAbaco | undefined);
      d.abacos = (d.abacos ?? []).filter((a) => !(a.automatico && sai.has(a.laje)));
    }
    let n = 0;
    const avisos: string[] = [];
    for (const l of ls) {
      const r = gerarAbacos(b, l, par, { pilares: p.pilares, hAbaco: p.hAbaco, somenteSemViga: p.somenteSemViga });
      avisos.push(...r.avisos);
      for (const g of r.gerados) {
        const base = antes.get(`${l.id}|${g.pilar.id}`);
        const a: Abaco = { id: novoId(d, 'ab'), laje: l.id, poligono: g.poligono.map((q) => [q[0], q[1]] as [number, number]), hAbaco: g.hAbaco, automatico: true, pilar: g.pilar.id, gerado: g.gerado, ...(base ? { base: JSON.parse(JSON.stringify(base)) as ArmaduraBaseAbaco } : {}) };
        (d.abacos ??= []).push(a);
        n++;
      }
    }
    if (d.abacos && !d.abacos.length) delete d.abacos;
    return `${n} ábaco(s) gerado(s) em ${ls.length} laje(s).${avisos.length ? ` ${avisos.join(' ')}` : ''}`;
  },
});

// ---------------------------------------------------------------- abaco.criar / editar / remover

interface ParamsCriar { laje: string; poligono: P[]; hAbaco?: number; base?: { inf?: FaceBase; sup?: FaceBase; sem?: ('inf' | 'sup')[] }; comoViga?: boolean }
const schemaBase: JsonSchema = { type: 'object', additionalProperties: false, properties: { inf: barras, sup: barras, sem: semFaces }, description: 'armadura base entre nervuras (ausente = o padrão: 2 barras da tabela de armadura das lajes em cada face)' };

registrar<ParamsCriar>({
  nome: 'abaco.criar',
  descricao: 'Cria um ábaco manual numa laje nervurada bidirecional (E3d): `poligono` (vértices [x, y] em m, recortado pelo contorno do pano), `hAbaco` (altura total no ábaco; padrão a da laje; pode descer abaixo dela), `base` (armadura base entre nervuras) e `comoViga` (confirma que o ábaco simula uma viga e silencia o aviso ABACO_VIGA). O ajuste ao número de cubetas é automático (a zona maciça cresce até os eixos de nervuras mais próximos). Não use ábaco para simular vigas: defina as vigas; use-o sempre em bordas livres.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['laje', 'poligono'], properties: {
    laje: { type: 'string' }, poligono: { type: 'array', items: ponto, minItems: 3 }, hAbaco: { type: 'number', minimum: 0.1, maximum: 1.2 }, base: schemaBase, comoViga: { type: 'boolean' },
  } },
  validar(b, p) {
    const e = validarAbaco(b, p.laje, p.poligono, p.hAbaco);
    return e.length ? err('ABACO_INCOERENTE', e[0], [p.laje]) : [];
  },
  aplicar(d, p) {
    const l = d.lajes.find((x) => x.id === p.laje)!;
    const hAbaco = p.hAbaco ?? (l.tipo.tipo === 'nervurada' ? l.tipo.hTotal : 0.3);
    const a: Abaco = { id: novoId(d, 'ab'), laje: p.laje, poligono: anti(p.poligono), hAbaco, automatico: false, ...(p.base ? { base: aplicarBase(undefined, p.base) } : {}), ...(p.comoViga ? { comoViga: true } : {}) };
    (d.abacos ??= []).push(a);
    return `Ábaco criado em ${l.nome} (${a.id}).`;
  },
});

interface ParamsEditar { id: string; poligono?: P[]; hAbaco?: number; comoViga?: boolean }
registrar<ParamsEditar>({
  nome: 'abaco.editar',
  descricao: 'Edita um ábaco (E3d): `poligono` novo (o ábaco automático editado à mão passa a manual e deixa de ser refeito por `abaco.gerar`), `hAbaco` e `comoViga`.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, poligono: { type: 'array', items: ponto, minItems: 3 }, hAbaco: { type: 'number', minimum: 0.1, maximum: 1.2 }, comoViga: { type: 'boolean' } } },
  validar(b, p) {
    const a = b.abacos?.find((x) => x.id === p.id);
    if (!a) return err('ABACO_INEXISTENTE', `Ábaco ${p.id} não existe.`);
    if (p.poligono === undefined && p.hAbaco === undefined && p.comoViga === undefined) return err('SEM_EDICAO', 'Informe ao menos um campo a alterar.');
    const e = validarAbaco(b, a.laje, p.poligono, p.hAbaco);
    return e.length ? err('ABACO_INCOERENTE', e[0], [a.laje]) : [];
  },
  aplicar(d, p) {
    const a = d.abacos!.find((x) => x.id === p.id)!;
    if (p.poligono) { a.poligono = anti(p.poligono); a.automatico = false; delete a.gerado; }
    if (p.hAbaco !== undefined) a.hAbaco = p.hAbaco;
    if (p.comoViga !== undefined) { if (p.comoViga) a.comoViga = true; else delete a.comoViga; }
    return `Ábaco ${a.id} alterado.`;
  },
});

registrar<{ ids?: string[]; lajes?: string[]; automaticos?: boolean }>({
  nome: 'abaco.remover',
  descricao: 'Remove ábacos (E3d) por id (`ids`) ou todos os das lajes dadas (`lajes`); com `automaticos`, só os gerados automaticamente.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { ids, lajes: ids, automaticos: { type: 'boolean' } } },
  validar(b, p) {
    if (!p.ids && !p.lajes) return err('SEM_EDICAO', 'Informe `ids` ou `lajes`.');
    const sem = (p.ids ?? []).filter((id) => !b.abacos?.some((a) => a.id === id));
    return sem.length ? err('ABACO_INEXISTENTE', `Ábaco(s) inexistente(s): ${sem.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const antes = d.abacos?.length ?? 0;
    d.abacos = (d.abacos ?? []).filter((a) => !((p.ids?.includes(a.id) || p.lajes?.includes(a.laje)) && (!p.automaticos || a.automatico)));
    const n = antes - d.abacos.length;
    if (!d.abacos.length) delete d.abacos;
    return `${n} ábaco(s) removido(s).`;
  },
});

// ---------------------------------------------------------------- abaco.armaduraBase

registrar<{ ids: string[]; inf?: FaceBase; sup?: FaceBase; sem?: ('inf' | 'sup')[]; padrao?: boolean }>({
  nome: 'abaco.armaduraBase',
  descricao: 'Armadura base entre nervuras dos ábacos (E3d): `inf` e `sup` = n barras de φ mm em cada vão entre eixos de nervuras, de borda a borda do ábaco, nas duas direções (`sem` = faces sem armadura base); `padrao: true` volta ao padrão (2 barras da tabela de armadura das lajes em cada face). A armadura base é sempre colaborante: a superior é descontada da calculada para o momento negativo sobre o pilar. O Statikos a desenha e a quantifica.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids, inf: barras, sup: barras, sem: semFaces, padrao: { type: 'boolean' } } },
  validar(b, p) {
    const sem = p.ids.filter((id) => !b.abacos?.some((a) => a.id === id));
    if (sem.length) return err('ABACO_INEXISTENTE', `Ábaco(s) inexistente(s): ${sem.join(', ')}.`);
    return p.inf === undefined && p.sup === undefined && !p.sem?.length && !p.padrao ? err('SEM_EDICAO', 'Informe `inf`, `sup`, `sem` ou `padrao`.') : [];
  },
  aplicar(d, p) {
    for (const a of d.abacos ?? []) {
      if (!p.ids.includes(a.id)) continue;
      if (p.padrao) { delete a.base; continue; }
      a.base = aplicarBase(a.base as ArmaduraBaseAbaco | undefined, p);
    }
    return `Armadura base de ${p.ids.length} ábaco(s) ${p.padrao ? 'voltou ao padrão' : 'alterada'}.`;
  },
});
