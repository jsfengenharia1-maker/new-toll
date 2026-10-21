// Sapata corrida (frente FU, fatia FU7a): lançamento por polilinha sob parede, viga de fundação ou alinhamento de pilares.
// Sob pilares ela entra na análise global (viga sobre base elástica): muda o cálculo da estrutura; sob parede só muda o
// cálculo das fundações. Sem ferramenta própria no MCP (`mcp: false`).
import type { Draft } from 'immer';
import { FUNDACAO_VAZIA, type AbaCorrida, type BuildingModel, type CintaCorrida, type FundacaoEdificio, type SapataCorrida } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { corridasSobPilares, pilaresDaCorrida } from '../building/baseElastica';
import { comprimentoCorrida, nomeCorrida } from '../building/sapataCorrida';
import { nomeCinta } from '../building/cintasCorrida';
import { pontaVF } from '../building/vigasFundacao';
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

// ---------------- cintas (FU8a) ----------------

type CintaIn = { corrida: string; s: number; fim: string; b?: number; h?: number; fixa?: boolean; nome?: string };

/** Corrida de aba única sob parede que recebe a cinta, e a ponta interna válida. */
function validarCinta(b: BuildingModel, corrida: string, s: number, fim: string): Diagnostico[] {
  const c = b.fundacao?.corridas?.find((x) => x.id === corrida);
  if (!c) return err('CORRIDA_INEXISTENTE', `Sapata corrida ${corrida} não existe.`);
  if (c.aba === 'ambas') return err('CINTA_ABA', `A sapata corrida ${c.nome} tem aba nos dois lados: cintas só valem para aba de um lado (apoio rente à divisa).`, [c.id]);
  if (pilaresDaCorrida(b, c).length) return err('CINTA_MODO', `A sapata corrida ${c.nome} está sob pilares (viga sobre base elástica na análise global): cintas só valem para sapata corrida sob parede.`, [c.id]);
  const L = comprimentoCorrida(c.pontos);
  if (s < -1e-9 || s > L + 1e-9) return err('CINTA_ABSCISSA', `Abscissa s = ${s} m fora do eixo da ${c.nome} (0 a ${L.toFixed(2)} m).`, [c.id]);
  if (!pontaVF(b, fim)) return err('PONTA_INVALIDA', `Ponta ${fim} não é elemento de fundação nem pilar que nasce na fundação.`);
  return [];
}

const propsCinta: Record<string, JsonSchema> = {
  s: { type: 'number', minimum: 0, description: 'abscissa ao longo do eixo da corrida onde a cinta nasce (m, do primeiro ponto)' },
  fim: { type: 'string', description: 'id do elemento de fundação (ou do pilar que nasce na fundação) da ponta interna' },
  b: { type: 'number', minimum: 0.1, maximum: 1.5, description: 'largura da cinta (m; padrão 0,20)' },
  h: { type: 'number', minimum: 0.2, maximum: 3, description: 'altura da cinta (m; padrão 0,40; cresce até atender, salvo `fixa`)' },
  fixa: { type: 'boolean', description: 'seção só verificada' },
  nome: { type: 'string', minLength: 1 },
};

registrar<CintaIn>({
  nome: 'cinta.criar',
  descricao: 'Lança uma cinta (viga de equilíbrio) de sapata corrida de aba única sob parede: da abscissa `s` do eixo da corrida ao elemento interno `fim`. A cinta toma o momento N·e do trecho tributário (alavanca R = N·ℓ/(ℓ − e)), majora a reação sob a corrida e alivia o elemento da ponta oposta; é dimensionada como as vigas de equilíbrio (seção padrão 20 × 40 cm, cresce até atender ou `fixa`).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['corrida', 's', 'fim'], properties: { corrida: { type: 'string', description: 'id da sapata corrida' }, ...propsCinta } },
  validar: (b, p) => validarCinta(b, p.corrida, p.s, p.fim),
  aplicar(d, p) {
    const c = d.fundacao!.corridas!.find((x) => x.id === p.corrida)!;
    const nome = p.nome?.trim() || nomeCinta(d as BuildingModel);
    const ct: CintaCorrida = { id: novoId(d, 'ct'), nome, s: r6(p.s), fim: p.fim, b: p.b ?? 0.2, h: p.h ?? 0.4, ...(p.fixa ? { fixa: true } : {}) };
    (c.cintas ??= []).push(ct);
    return `Cinta ${nome} lançada na sapata corrida ${c.nome} (s = ${p.s.toFixed(2).replace('.', ',')} m).`;
  },
});

const acharCinta = (b: BuildingModel, id: string) => { for (const c of b.fundacao?.corridas ?? []) { const ct = c.cintas?.find((x) => x.id === id); if (ct) return { c, ct }; } return null; };

registrar<Partial<Omit<CintaIn, 'corrida'>> & { id: string; ancoragem?: { ini?: number; fim?: number } }>({
  nome: 'cinta.editar',
  descricao: 'Altera uma cinta de sapata corrida: abscissa `s`, ponta interna `fim`, seção b × h (m), `fixa`, nome e `ancoragem` (comprimento reto das barras superiores além das faces, m; 0 = o lb calculado).',
  risco: 'escrita',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, ...propsCinta,
    ancoragem: { type: 'object', additionalProperties: false, properties: { ini: { type: 'number', minimum: 0, maximum: 3 }, fim: { type: 'number', minimum: 0, maximum: 3 } } } } },
  validar(b, p) {
    const a = acharCinta(b, p.id);
    if (!a) return err('CINTA_INEXISTENTE', `Cinta ${p.id} não existe.`);
    return validarCinta(b, a.c.id, p.s ?? a.ct.s, p.fim ?? a.ct.fim);
  },
  aplicar(d, p) {
    const { ct } = acharCinta(d as BuildingModel, p.id)! as unknown as { ct: Draft<CintaCorrida> };
    if (p.nome) ct.nome = p.nome.trim();
    if (p.s !== undefined) ct.s = r6(p.s);
    for (const k of ['fim', 'b', 'h'] as const) if (p[k] !== undefined) (ct as unknown as Record<string, unknown>)[k] = p[k];
    if (p.fixa !== undefined) { if (p.fixa) ct.fixa = true; else delete ct.fixa; }
    if (p.ancoragem) {
      const a = { ...(ct.ancoragem ?? {}) };
      for (const k of ['ini', 'fim'] as const) { const x = p.ancoragem[k]; if (x === undefined) continue; if (x > 0) a[k] = x; else delete a[k]; }
      if (Object.keys(a).length) ct.ancoragem = a; else delete ct.ancoragem;
    }
    return `Cinta ${ct.nome} alterada.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'cinta.remover',
  descricao: 'Remove cintas de sapatas corridas.',
  risco: 'destrutivo',
  mcp: false,
  calculo: 'fundacao',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const f = p.ids.filter((id) => !acharCinta(b, id));
    return f.length ? err('CINTA_INEXISTENTE', `Cinta(s) inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const s = new Set(p.ids);
    for (const c of d.fundacao!.corridas ?? []) if (c.cintas) { c.cintas = c.cintas.filter((x) => !s.has(x.id)); if (!c.cintas.length) delete c.cintas; }
    return `${p.ids.length} cinta(s) removida(s).`;
  },
});
