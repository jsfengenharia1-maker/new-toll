// Base elástica (frente FU, fatia FU6): radiers e vigas de fundação sobre base elástica, lançados no nível de fundação.
// Mudam a análise global (molas no pórtico, pilares sem vínculo externo): alteram a revisão de cálculo (padrão
// `calculo`). Sem ferramenta própria no MCP (`mcp: false`).
import type { Draft } from 'immer';
import { FUNDACAO_VAZIA, type BuildingModel, type FundacaoEdificio, type Radier, type VigaElastica } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { areaPoligono, type P } from '../geom/faces';
import { nomeRadier, nomeVigaElastica, noRadier, pilaresNaBase } from '../building/baseElastica';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const poligono: JsonSchema = { type: 'array', items: ponto, minItems: 3, description: 'vértices [x, y] em m' };
const fund = (d: Draft<BuildingModel>): Draft<FundacaoEdificio> => (d.fundacao ??= FUNDACAO_VAZIA());
const r6 = (v: number) => +v.toFixed(6);
/** Contorno anti-horário, coordenadas arredondadas. */
const anti = (c: P[]): [number, number][] => { const q = c.map((p) => [r6(p[0]), r6(p[1])] as [number, number]); return areaPoligono(q) < 0 ? q.reverse() : q; };
const kSchema: JsonSchema = { type: 'number', minimum: 1000, maximum: 1000000, description: 'coeficiente de reação vertical do solo (kN/m³); ausente = o das opções (radierK)' };
const sigmaSchema: JsonSchema = { type: 'number', minimum: 10, maximum: 5000, description: 'σadm própria (kN/m²); ausente = a do terreno' };

/** Pilares dentro do contorno que já têm elemento de fundação próprio; radier sobreposto a outro. */
function validarRadier(b: BuildingModel, contorno: P[], furos: P[][], proprio?: string): Diagnostico[] {
  const A = Math.abs(areaPoligono(contorno)) - furos.reduce((t, f) => t + Math.abs(areaPoligono(f)), 0);
  if (A < 0.25) return err('RADIER_AREA', 'Radier com área menor que 0,25 m².');
  const r = { contorno, furos };
  for (const e of b.fundacao?.elementos ?? []) for (const pid of e.pilares) {
    const p = b.pilares.find((x) => x.id === pid);
    if (p && noRadier(r, [p.x, p.y])) return err('PILAR_COM_FUNDACAO', `${p.nome} já tem o elemento ${e.nome}; remova-o antes de lançar o radier sob ele.`, [p.id, e.id]);
  }
  const outro = (b.fundacao?.radiers ?? []).find((x) => x.id !== proprio && (contorno.some((q) => noRadier(x, q)) || x.contorno.some((q) => noRadier(r, q))));
  if (outro) return err('RADIER_SOBREPOSTO', `O contorno se sobrepõe ao radier ${outro.nome}.`, [outro.id]);
  return [];
}

registrar<{ contorno: P[]; furos?: P[][]; h: number; k?: number; sigmaAdm?: number; nome?: string }>({
  nome: 'radier.criar',
  descricao: 'Lança um radier (placa maciça sobre base elástica, Winkler) no nível de fundação, por contorno (m) e furos opcionais; espessura `h` (m, padrão 0,30), coeficiente de reação `k` (kN/m³; padrão o das opções) e σadm própria. Entra na análise global: os pilares que nascem na fundação dentro do contorno perdem o vínculo externo e nascem na malha do radier.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['contorno'], properties: {
    contorno: poligono, furos: { type: 'array', items: poligono }, h: { type: 'number', minimum: 0.1, maximum: 3, default: 0.3 }, k: kSchema, sigmaAdm: sigmaSchema, nome: { type: 'string', minLength: 1 },
  } },
  validar: (b, p) => validarRadier(b, p.contorno, p.furos ?? []),
  aplicar(d, p) {
    const f = fund(d);
    const nome = p.nome?.trim() || nomeRadier(d as BuildingModel);
    const r: Radier = { id: novoId(d, 'rad'), nome, contorno: anti(p.contorno), h: p.h, ...(p.furos?.length ? { furos: p.furos.map(anti) } : {}), ...(p.k ? { k: p.k } : {}), ...(p.sigmaAdm ? { sigmaAdm: p.sigmaAdm } : {}) };
    (f.radiers ??= []).push(r);
    const n = pilaresNaBase(d as BuildingModel).filter((x) => x.ref === r.id).length;
    return `Radier ${nome} lançado (${Math.abs(areaPoligono(r.contorno)).toFixed(2).replace('.', ',')} m², h = ${Math.round(p.h * 100)} cm, ${n} pilar(es) sobre ele).`;
  },
});

registrar<{ id: string; contorno?: P[]; furos?: P[][]; h?: number; k?: number; sigmaAdm?: number; nome?: string; limpar?: ('k' | 'sigmaAdm' | 'furos')[] }>({
  nome: 'radier.editar',
  descricao: 'Altera um radier: contorno, furos, espessura, k (kN/m³), σadm (kN/m²) e nome; `limpar` volta k e σadm ao padrão ou remove os furos.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, contorno: poligono, furos: { type: 'array', items: poligono }, h: { type: 'number', minimum: 0.1, maximum: 3 }, k: kSchema, sigmaAdm: sigmaSchema, nome: { type: 'string', minLength: 1 },
    limpar: { type: 'array', items: { type: 'string', enum: ['k', 'sigmaAdm', 'furos'] } },
  } },
  validar(b, p) {
    const r = b.fundacao?.radiers?.find((x) => x.id === p.id);
    if (!r) return err('RADIER_INEXISTENTE', `Radier ${p.id} não existe.`);
    if (!p.contorno && !p.furos && !p.limpar?.includes('furos')) return [];
    return validarRadier(b, p.contorno ?? r.contorno, p.limpar?.includes('furos') ? [] : p.furos ?? r.furos ?? [], r.id);
  },
  aplicar(d, p) {
    const r = d.fundacao!.radiers!.find((x) => x.id === p.id)!;
    if (p.nome) r.nome = p.nome.trim();
    if (p.contorno) r.contorno = anti(p.contorno);
    if (p.furos) { if (p.furos.length) r.furos = p.furos.map(anti); else delete r.furos; }
    if (p.h !== undefined) r.h = p.h;
    if (p.k !== undefined) r.k = p.k;
    if (p.sigmaAdm !== undefined) r.sigmaAdm = p.sigmaAdm;
    for (const k of p.limpar ?? []) delete r[k];
    return `Radier ${r.nome} alterado.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'radier.remover',
  descricao: 'Remove radiers (os pilares sobre eles voltam a ter vínculo externo na base).',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.fundacao?.radiers?.some((x) => x.id === id));
    return f.length ? err('RADIER_INEXISTENTE', `Radier(s) inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const s = new Set(p.ids), f = d.fundacao!;
    f.radiers = f.radiers!.filter((r) => !s.has(r.id));
    if (!f.radiers.length) delete f.radiers;
    return `${p.ids.length} radier(s) removido(s).`;
  },
});

const comprimento = (pts: P[]) => pts.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);

function validarVE(b: BuildingModel, pontos: P[]): Diagnostico[] {
  if (comprimento(pontos) < 0.5) return err('VIGA_CURTA', 'Viga sobre base elástica com menos de 0,5 m.');
  const pts: P[] = [];
  for (let i = 0; i + 1 < pontos.length; i++) for (let t = 0; t <= 1; t += 0.1) pts.push([pontos[i][0] + t * (pontos[i + 1][0] - pontos[i][0]), pontos[i][1] + t * (pontos[i + 1][1] - pontos[i][1])]);
  for (const e of b.fundacao?.elementos ?? []) for (const pid of e.pilares) {
    const p = b.pilares.find((x) => x.id === pid);
    if (p && pts.some((q) => Math.hypot(q[0] - p.x, q[1] - p.y) < 0.05)) return err('PILAR_COM_FUNDACAO', `${p.nome} já tem o elemento ${e.nome}; remova-o antes de lançar a viga sobre base elástica sob ele.`, [p.id, e.id]);
  }
  return [];
}

registrar<{ pontos: P[]; b: number; h: number; k?: number; sigmaAdm?: number; nome?: string }>({
  nome: 'vigaElastica.criar',
  descricao: 'Lança uma viga de fundação sobre base elástica (Winkler) no nível de fundação, por polilinha do eixo (m): largura da base `b` e altura `h` (m; padrão 0,50 × 0,80), `k` (kN/m³; padrão o das opções) e σadm própria. Entra na análise global: os pilares que nascem na fundação sobre ela perdem o vínculo externo.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['pontos'], properties: {
    pontos: { type: 'array', items: ponto, minItems: 2 }, b: { type: 'number', minimum: 0.15, maximum: 5, default: 0.5 }, h: { type: 'number', minimum: 0.2, maximum: 4, default: 0.8 },
    k: kSchema, sigmaAdm: sigmaSchema, nome: { type: 'string', minLength: 1 },
  } },
  validar: (b, p) => validarVE(b, p.pontos),
  aplicar(d, p) {
    const f = fund(d);
    const nome = p.nome?.trim() || nomeVigaElastica(d as BuildingModel);
    const v: VigaElastica = { id: novoId(d, 've'), nome, pontos: p.pontos.map((q) => [r6(q[0]), r6(q[1])] as [number, number]), b: p.b, h: p.h, ...(p.k ? { k: p.k } : {}), ...(p.sigmaAdm ? { sigmaAdm: p.sigmaAdm } : {}) };
    (f.vigasElasticas ??= []).push(v);
    return `${nome} (${Math.round(p.b * 100)}×${Math.round(p.h * 100)}, sobre base elástica) lançada.`;
  },
});

registrar<{ id: string; pontos?: P[]; b?: number; h?: number; k?: number; sigmaAdm?: number; nome?: string; limpar?: ('k' | 'sigmaAdm')[] }>({
  nome: 'vigaElastica.editar',
  descricao: 'Altera uma viga sobre base elástica: eixo, seção b × h (m), k (kN/m³), σadm (kN/m²) e nome; `limpar` volta k e σadm ao padrão.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, pontos: { type: 'array', items: ponto, minItems: 2 }, b: { type: 'number', minimum: 0.15, maximum: 5 }, h: { type: 'number', minimum: 0.2, maximum: 4 },
    k: kSchema, sigmaAdm: sigmaSchema, nome: { type: 'string', minLength: 1 }, limpar: { type: 'array', items: { type: 'string', enum: ['k', 'sigmaAdm'] } },
  } },
  validar(b, p) {
    const v = b.fundacao?.vigasElasticas?.find((x) => x.id === p.id);
    if (!v) return err('VIGA_ELASTICA_INEXISTENTE', `Viga sobre base elástica ${p.id} não existe.`);
    return p.pontos ? validarVE(b, p.pontos) : [];
  },
  aplicar(d, p) {
    const v = d.fundacao!.vigasElasticas!.find((x) => x.id === p.id)!;
    if (p.nome) v.nome = p.nome.trim();
    if (p.pontos) v.pontos = p.pontos.map((q) => [r6(q[0]), r6(q[1])] as [number, number]);
    for (const k of ['b', 'h', 'k', 'sigmaAdm'] as const) if (p[k] !== undefined) v[k] = p[k]!;
    for (const k of p.limpar ?? []) delete v[k];
    return `${v.nome} alterada.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'vigaElastica.remover',
  descricao: 'Remove vigas sobre base elástica.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.fundacao?.vigasElasticas?.some((x) => x.id === id));
    return f.length ? err('VIGA_ELASTICA_INEXISTENTE', `Viga(s) inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const s = new Set(p.ids), f = d.fundacao!;
    f.vigasElasticas = f.vigasElasticas!.filter((v) => !s.has(v.id));
    if (!f.vigasElasticas.length) delete f.vigasElasticas;
    return `${p.ids.length} viga(s) sobre base elástica removida(s).`;
  },
});

registrar<{ id: string; G?: number; Q?: number }>({
  nome: 'radier.carga',
  descricao: 'Define a carga do radier na hora (radier sem carga do nível de fundação): carga de área permanente `G` e/ou variável `Q` (kN/m², para baixo) sobre o contorno do radier, no nível de fundação (dois comandos `carga.area` num só passo). Depois recalcule o edifício.',
  risco: 'escrita',
  mcp: false,
  calculo: true,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, G: { type: 'number', minimum: 0, description: 'carga permanente de área (kN/m²)' }, Q: { type: 'number', minimum: 0, description: 'carga variável de área (kN/m²)' } } },
  validar(b, p) {
    if (!b.fundacao?.radiers?.some((x) => x.id === p.id)) return err('RADIER_INEXISTENTE', `Radier ${p.id} não existe.`);
    return (p.G ?? 0) > 0 || (p.Q ?? 0) > 0 ? [] : err('SEM_VALOR', 'Informe a carga permanente G e/ou a variável Q (kN/m², maior que zero).');
  },
  aplicar(d, p) {
    const r = d.fundacao!.radiers!.find((x) => x.id === p.id)!, partes: string[] = [];
    for (const [caso, v] of [['G', p.G], ['Q', p.Q]] as const) {
      if (!v || v <= 0) continue;
      d.cargas.push({ id: novoId(d, 'c'), grupo: 'fundacao', caso, tipo: 'area', valor: v, pontos: r.contorno.map((q) => [q[0], q[1]] as [number, number]) });
      partes.push(`${caso} = ${v.toFixed(2).replace('.', ',')} kN/m²`);
    }
    return `Carga do radier ${r.nome} definida: ${partes.join(' e ')} sobre ${Math.abs(areaPoligono(r.contorno)).toFixed(2).replace('.', ',')} m².`;
  },
});

