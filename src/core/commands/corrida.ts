// Sapata corrida (frente FU, fatia FU7a): lançamento por polilinha sob parede, viga de fundação ou alinhamento de pilares.
// Sob pilares ela entra na análise global (viga sobre base elástica): muda o cálculo da estrutura; sob parede só muda o
// cálculo das fundações. Sem ferramenta própria no MCP (`mcp: false`).
import type { Draft } from 'immer';
import { FUNDACAO_VAZIA, type AbaCorrida, type BuildingModel, type FundacaoEdificio, type SapataCorrida } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { corridasSobPilares, pilaresDaCorrida } from '../building/baseElastica';
import { comprimentoCorrida, nomeCorrida } from '../building/sapataCorrida';
import type { P } from '../geom/faces';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const r6 = (v: number) => +v.toFixed(6);
const fund = (d: Draft<BuildingModel>): Draft<FundacaoEdificio> => (d.fundacao ??= FUNDACAO_VAZIA());
const ABAS: AbaCorrida[] = ['ambas', 'esq', 'dir'];

/** Sapata corrida sob pilares entra na análise global; sob parede só muda as fundações. */
const calculoSob = (b?: BuildingModel) => (b && corridasSobPilares(b).length ? true : 'fundacao' as const);

/** Pilares ao longo do eixo que já têm elemento de fundação próprio. */
function validarEixo(b: BuildingModel, pontos: P[], bw: number): Diagnostico[] {
  if (comprimentoCorrida(pontos) < 0.5) return err('CORRIDA_CURTA', 'Sapata corrida com menos de 0,5 m.');
  for (const { pilar } of pilaresDaCorrida(b, { pontos, bw })) {
    const e = b.fundacao?.elementos.find((x) => x.pilares.includes(pilar.id));
    if (e) return err('PILAR_COM_FUNDACAO', `${pilar.nome} já tem o elemento ${e.nome}; remova-o antes de lançar a sapata corrida sob ele.`, [pilar.id, e.id]);
  }
  return [];
}

const propsGeom: Record<string, JsonSchema> = {
  bw: { type: 'number', minimum: 0.1, maximum: 2, description: 'largura do elemento apoiado (parede, viga ou nervura), m' },
  aba: { type: 'string', enum: ABAS, description: 'aba nas duas faces ("ambas") ou só à esquerda ("esq") ou à direita ("dir") do sentido do traçado; de um lado só, o apoio fica rente à divisa e exige viga de equilíbrio' },
  B: { type: 'number', minimum: 0.3, maximum: 8, description: 'largura total da base (m); sob parede ausente = calculada pela σadm (informada = só verificada)' },
  h: { type: 'number', minimum: 0.2, maximum: 3, description: 'altura no eixo (m); ausente = calculada (sob parede) ou o padrão das opções (sob pilares)' },
  h0: { type: 'number', minimum: 0.15, maximum: 3, description: 'espessura da aba na borda (m); ausente = calculada' },
  alvenaria: { type: 'boolean', description: 'elemento apoiado de alvenaria (seção de referência da flexão mais para dentro)' },
  equilibrio: { type: 'boolean', description: 'aba de um lado: equilibrada por vigas de equilíbrio (cintas) até sapatas internas (reação uniforme)' },
  k: { type: 'number', minimum: 1000, maximum: 1000000, description: 'coeficiente de reação vertical (kN/m³; sob pilares); ausente = o das opções (radierK)' },
  sigmaAdm: { type: 'number', minimum: 10, maximum: 5000, description: 'σadm própria (kN/m²); ausente = a do terreno' },
  cota: { type: 'number', description: 'cota de assentamento (m); ausente = a de fundação da obra' },
};

registrar<{ pontos: P[]; bw?: number; aba?: AbaCorrida; B?: number; h?: number; h0?: number; alvenaria?: boolean; equilibrio?: boolean; k?: number; sigmaAdm?: number; cota?: number; nome?: string }>({
  nome: 'corrida.criar',
  descricao: 'Lança uma sapata corrida no nível de fundação por polilinha do eixo (m), sob parede (carga linear lançada no nível de fundação: largura pela σadm, flexão transversal CEB-70 numa faixa de 1 m, armadura de distribuição) ou sob pilares/viga de fundação (viga sobre base elástica na análise global). Largura do apoio `bw` (padrão 0,20 m), aba nas duas faces (padrão) ou de um lado só.',
  risco: 'escrita',
  mcp: false,
  calculo: (_p, b) => calculoSob(b),
  schema: { type: 'object', additionalProperties: false, required: ['pontos'], properties: { pontos: { type: 'array', items: ponto, minItems: 2 }, ...propsGeom, nome: { type: 'string', minLength: 1 } } },
  validar(b, p) {
    const bw = p.bw ?? 0.2;
    if (p.B !== undefined && p.B < bw + 0.1 - 1e-9) return err('CORRIDA_LARGURA', `Largura da base B = ${p.B} m deve ser ao menos bw + 0,10 m.`);
    if (p.h !== undefined && p.h0 !== undefined && p.h0 > p.h + 1e-9) return err('CORRIDA_ALTURA', 'A espessura da aba h0 não pode passar da altura h.');
    return validarEixo(b, p.pontos, bw);
  },
  aplicar(d, p) {
    const f = fund(d);
    const nome = p.nome?.trim() || nomeCorrida(d as BuildingModel);
    const c: SapataCorrida = {
      id: novoId(d, 'sc'), nome, pontos: p.pontos.map((q) => [r6(q[0]), r6(q[1])] as [number, number]), aba: p.aba ?? 'ambas', bw: p.bw ?? 0.2,
      ...(p.B !== undefined ? { B: p.B } : {}), ...(p.h !== undefined ? { h: p.h } : {}), ...(p.h0 !== undefined ? { h0: p.h0 } : {}),
      ...(p.alvenaria ? { alvenaria: true } : {}), ...(p.equilibrio ? { equilibrio: true } : {}), ...(p.k ? { k: p.k } : {}), ...(p.sigmaAdm ? { sigmaAdm: p.sigmaAdm } : {}), ...(p.cota !== undefined ? { cota: p.cota } : {}),
    };
    (f.corridas ??= []).push(c);
    const n = pilaresDaCorrida(d as BuildingModel, c).length;
    return `Sapata corrida ${nome} lançada (${comprimentoCorrida(c.pontos).toFixed(2).replace('.', ',')} m, ${n ? `${n} pilar(es) sobre ela: viga sobre base elástica` : 'sob parede: carga linear do nível de fundação'}).`;
  },
});

type Limpar = 'B' | 'h' | 'h0' | 'k' | 'sigmaAdm' | 'cota' | 'alvenaria' | 'equilibrio';
registrar<{ id: string; pontos?: P[]; bw?: number; aba?: AbaCorrida; B?: number; h?: number; h0?: number; alvenaria?: boolean; equilibrio?: boolean; k?: number; sigmaAdm?: number; cota?: number; nome?: string; limpar?: Limpar[] }>({
  nome: 'corrida.editar',
  descricao: 'Altera uma sapata corrida: eixo, largura do apoio bw, aba, largura B, alturas h e h0, alvenaria, equilíbrio por cintas, k, σadm, cota e nome; `limpar` remove B, h, h0, k, σadm, cota, alvenaria ou equilibrio (voltam ao padrão ou ao calculado).',
  risco: 'escrita',
  mcp: false,
  // mudar o eixo ou a largura do apoio pode trocar o modo (parede ↔ pilares): refaz a análise
  calculo: (p, b) => (p.pontos || p.bw !== undefined ? true : calculoSob(b)),
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, pontos: { type: 'array', items: ponto, minItems: 2 }, ...propsGeom, nome: { type: 'string', minLength: 1 },
    limpar: { type: 'array', items: { type: 'string', enum: ['B', 'h', 'h0', 'k', 'sigmaAdm', 'cota', 'alvenaria', 'equilibrio'] } },
  } },
  validar(b, p) {
    const c = b.fundacao?.corridas?.find((x) => x.id === p.id);
    if (!c) return err('CORRIDA_INEXISTENTE', `Sapata corrida ${p.id} não existe.`);
    const bw = p.bw ?? c.bw, B = p.limpar?.includes('B') ? undefined : p.B ?? c.B;
    if (B !== undefined && B < bw + 0.1 - 1e-9) return err('CORRIDA_LARGURA', `Largura da base B = ${B} m deve ser ao menos bw + 0,10 m.`);
    const h = p.limpar?.includes('h') ? undefined : p.h ?? c.h, h0 = p.limpar?.includes('h0') ? undefined : p.h0 ?? c.h0;
    if (h !== undefined && h0 !== undefined && h0 > h + 1e-9) return err('CORRIDA_ALTURA', 'A espessura da aba h0 não pode passar da altura h.');
    return p.pontos || p.bw !== undefined ? validarEixo(b, p.pontos ?? c.pontos, bw) : [];
  },
  aplicar(d, p) {
    const c = d.fundacao!.corridas!.find((x) => x.id === p.id)!;
    if (p.nome) c.nome = p.nome.trim();
    if (p.pontos) c.pontos = p.pontos.map((q) => [r6(q[0]), r6(q[1])] as [number, number]);
    if (p.aba) c.aba = p.aba;
    for (const k of ['bw', 'B', 'h', 'h0', 'k', 'sigmaAdm', 'cota'] as const) if (p[k] !== undefined) c[k] = p[k]!;
    for (const k of ['alvenaria', 'equilibrio'] as const) if (p[k] !== undefined) { if (p[k]) c[k] = true; else delete c[k]; }
    for (const k of p.limpar ?? []) delete c[k];
    return `Sapata corrida ${c.nome} alterada.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'corrida.remover',
  descricao: 'Remove sapatas corridas (os pilares sobre elas voltam a ter vínculo externo na base).',
  risco: 'destrutivo',
  mcp: false,
  calculo: true,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const f = p.ids.filter((id) => !b.fundacao?.corridas?.some((x) => x.id === id));
    return f.length ? err('CORRIDA_INEXISTENTE', `Sapata(s) corrida(s) inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const s = new Set(p.ids), f = d.fundacao!;
    f.corridas = f.corridas!.filter((c) => !s.has(c.id));
    if (!f.corridas.length) delete f.corridas;
    return `${p.ids.length} sapata(s) corrida(s) removida(s).`;
  },
});
