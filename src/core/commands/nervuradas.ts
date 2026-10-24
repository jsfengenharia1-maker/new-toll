// Comandos das lajes nervuradas bidirecionais (frente E3c): biblioteca de formas (cubetas) da obra, atribuição da nervurada ao
// pano (forma, altura, direção, ponto de passagem das nervuras, zonas maciças, engaste) e cópia entre panos do grupo.
// A armadura base está em `laje.armaduraBase` (armaduras.ts). A forma do catálogo (biblioteca de normas, `lajes.formas`) é
// resolvida por id; a da obra (`b.tiposLaje.formas`) é do usuário e editável.
import type { Draft } from 'immer';
import { dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { formaPor, validarForma, type FormaLaje } from '../building/nervuradas';
import { direcaoMenorVao } from '../building/lajes';
import { direcaoPorPontos, direcaoPorViga } from '../building/lancamentoL5';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { limpar, validarTipoLaje } from './tiposLaje';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const par: JsonSchema = { type: 'array', items: { type: 'number', exclusiveMinimum: 0 }, minItems: 2, maxItems: 2 };

// ---------------------------------------------------------------- forma.tipo

interface ParamsForma { acao: 'criar' | 'editar' | 'copiar' | 'remover'; id?: string; forma?: Omit<FormaLaje, 'id'> & { id?: string }; de?: string; nome?: string }
const formasEmUso = (b: BuildingModel) => new Set(b.lajes.flatMap((l) => (l.tipo.tipo === 'nervurada' ? [l.tipo.forma] : [])));
const daObra = (b: BuildingModel, id: string) => b.tiposLaje?.formas?.find((f) => f.id === id);

registrar<ParamsForma>({
  nome: 'forma.tipo',
  descricao: 'Biblioteca de formas (cubetas) das lajes nervuradas bidirecionais da obra (E3c): `criar` (`forma` { nome, tipo: recuperavel|perdida, altura, pecas, intereixo [dir0, dir1], bw [dir0, dir1], enchimento (perdida), pesoM2 e volume indicativos opcionais }), `editar` (`id` + `forma`), `copiar` (`de` = forma da obra ou do catálogo da biblioteca de normas; `nome` opcional) e `remover` (`id`; recusado se alguma laje usa). Peso e volume de concreto saem da geometria; os indicativos, se informados, os substituem. O programa não traz dados de fabricante: as formas do catálogo são geometrias genéricas, a confirmar.',
  risco: 'escrita',
  calculo: (p) => ((p as unknown as ParamsForma).acao === 'criar' || (p as unknown as ParamsForma).acao === 'copiar' ? false : true),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['criar', 'editar', 'copiar', 'remover'] }, id: { type: 'string' }, de: { type: 'string' }, nome: { type: 'string', minLength: 1 },
    forma: { type: 'object', additionalProperties: false, required: ['nome', 'tipo', 'altura', 'intereixo', 'bw'], properties: {
      id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, tipo: { type: 'string', enum: ['recuperavel', 'perdida'] }, altura: { type: 'number', exclusiveMinimum: 0, maximum: 0.8 },
      pecas: { type: 'integer', minimum: 1, maximum: 64 }, intereixo: par, bw: par, enchimento: { type: 'string' }, pesoM2: { type: 'number', minimum: 0 }, volume: { type: 'number', exclusiveMinimum: 0 }, nota: { type: 'string' },
    } },
  } },
  validar(b, p) {
    if (p.acao === 'criar' || p.acao === 'editar') {
      if (!p.forma) return err('PARAMETRO_INVALIDO', 'Informe `forma`.');
      const f: FormaLaje = { ...p.forma, id: p.id ?? p.forma.id ?? 'x', pecas: p.forma.pecas ?? 1 } as FormaLaje;
      const e = validarForma(f, b);
      if (e.length) return err('FORMA_INCOERENTE', `Forma incoerente: ${e.join(' ')}`);
    }
    if (p.acao === 'criar') {
      const id = p.id ?? p.forma?.id;
      if (id && formaPor(b, id)) return err('FORMA_EXISTENTE', `Já existe a forma "${id}".`);
    }
    if (p.acao === 'editar' && !daObra(b, p.id ?? '')) return err('FORMA_INEXISTENTE', `A forma "${p.id ?? ''}" não está na obra (as do catálogo se editam na biblioteca de normas, tabela “Formas das lajes nervuradas”).`);
    if (p.acao === 'copiar' && !(p.de && formaPor(b, p.de))) return err('FORMA_INEXISTENTE', `Forma de origem "${p.de ?? ''}" não existe.`);
    if (p.acao === 'remover') {
      if (!daObra(b, p.id ?? '')) return err('FORMA_INEXISTENTE', `A forma "${p.id ?? ''}" não está na obra.`);
      if (formasEmUso(b).has(p.id!)) return err('FORMA_EM_USO', `A forma "${daObra(b, p.id!)!.nome}" é usada por lajes: atribua outra antes de removê-la.`, b.lajes.filter((l) => l.tipo.tipo === 'nervurada' && l.tipo.forma === p.id).map((l) => l.id));
    }
    return [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    d.tiposLaje ??= {};
    const lista = (d.tiposLaje.formas ??= []);
    if (p.acao === 'criar') { const f: FormaLaje = { ...copia(p.forma!), id: p.id ?? p.forma!.id ?? novoId(d, 'fm'), pecas: p.forma!.pecas ?? 1 } as FormaLaje; lista.push(f); return `Forma "${f.nome}" criada.`; }
    if (p.acao === 'editar') { const i = lista.findIndex((f) => f.id === p.id); lista[i] = { ...copia(p.forma!), id: p.id!, pecas: p.forma!.pecas ?? 1 } as FormaLaje; return `Forma "${lista[i].nome}" alterada.`; }
    if (p.acao === 'copiar') {
      const o = copia(formaPor(b, p.de!)!), f: FormaLaje = { ...o, id: novoId(d, 'fm'), nome: p.nome?.trim() || `${o.nome} (cópia)` };
      lista.push(f);
      return `Forma "${f.nome}" copiada de "${o.nome}".`;
    }
    const i = lista.findIndex((f) => f.id === p.id), nome = lista[i].nome;
    lista.splice(i, 1);
    limpar(d);
    return `Forma "${nome}" removida.`;
  },
});

// ---------------------------------------------------------------- laje.nervurada

interface ParamsNervurada {
  ids: string[]; forma?: string; hTotal?: number; capa?: number;
  direcao?: number; direcaoPor?: { viga?: string; relacao?: 'paralela' | 'perpendicular'; pontos?: [P, P] };
  passagem?: P; limparPassagem?: boolean; zonasMacicas?: P[][]; limparZonas?: boolean; engasteBordas?: number[];
  concentrar?: { dir: 0 | 1; indices: number[] }[]; limparConcentrar?: boolean;
}

registrar<ParamsNervurada>({
  nome: 'laje.nervurada',
  descricao: 'Atribui ou ajusta a laje nervurada bidirecional moldada no local (E3c) em lajes: `forma` (cubeta da biblioteca), `hTotal` e `capa` (m; sem os três, as lajes já devem ser nervuradas), `direcao` (graus) ou `direcaoPor` (viga paralela/perpendicular, ou dois pontos), `passagem` (ponto por onde passa o eixo de uma nervura de cada direção; origem do arranjo; `limparPassagem` volta ao ponto de inserção), `zonasMacicas` (polígonos maciços a acrescentar; `limparZonas` apaga) e `engasteBordas` (coeficiente 0 a 1 por aresta; lista vazia = todas engastadas). O arranjo só admite cubetas inteiras: o resto fica maciço.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
    forma: { type: 'string', description: 'id da forma (obra ou catálogo)' }, hTotal: { type: 'number', minimum: 0.1, maximum: 0.8 }, capa: { type: 'number', minimum: 0.03, maximum: 0.2 },
    direcao: { type: 'number' },
    direcaoPor: { type: 'object', additionalProperties: false, properties: {
      viga: { type: 'string' }, relacao: { type: 'string', enum: ['paralela', 'perpendicular'], default: 'paralela' }, pontos: { type: 'array', items: ponto, minItems: 2, maxItems: 2 },
    } },
    passagem: ponto, limparPassagem: { type: 'boolean' }, zonasMacicas: { type: 'array', items: { type: 'array', items: ponto, minItems: 3 }, minItems: 1 }, limparZonas: { type: 'boolean' },
    engasteBordas: { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 }, description: 'coeficiente por aresta do contorno; lista vazia = todas engastadas' },
    concentrar: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['dir', 'indices'], properties: { dir: { type: 'integer', enum: [0, 1] }, indices: { type: 'array', items: { type: 'integer', minimum: 0 }, description: 'índice (0 = primeira nervura da direção) das nervuras que concentram a armadura do grupo uniformizado; lista vazia = sem concentração' } } }, description: 'E5g: nervuras indicadas por direção (0 = a da laje, 1 = transversal) que recebem a armadura do grupo uniformizado; as demais ficam com o mínimo' },
    limparConcentrar: { type: 'boolean' },
  } },
  validar(b, p) {
    const sem = p.ids.filter((id) => !b.lajes.some((l) => l.id === id));
    if (sem.length) return err('LAJE_INEXISTENTE', `Laje(s) inexistente(s): ${sem.join(', ')}.`);
    const lajes = b.lajes.filter((l) => p.ids.includes(l.id));
    const completo = p.forma !== undefined && p.hTotal !== undefined && p.capa !== undefined;
    const alguns = p.forma !== undefined || p.hTotal !== undefined || p.capa !== undefined;
    if (alguns && !completo) {
      const nao = lajes.filter((l) => l.tipo.tipo !== 'nervurada');
      if (nao.length) return err('LAJE_NAO_NERVURADA', `${nao.map((l) => l.nome).join(', ')} não é nervurada bidirecional: informe forma, hTotal e capa juntos.`, nao.map((l) => l.id));
    }
    if (completo) { const tv = validarTipoLaje(b, { tipo: 'nervurada', forma: p.forma!, hTotal: p.hTotal!, capa: p.capa! }); if (tv.length) return tv; }
    else if (!alguns) {
      const nao = lajes.filter((l) => l.tipo.tipo !== 'nervurada');
      if (nao.length) return err('LAJE_NAO_NERVURADA', `${nao.map((l) => l.nome).join(', ')} não é nervurada bidirecional.`, nao.map((l) => l.id));
    }
    if (p.direcaoPor) {
      const { viga, pontos } = p.direcaoPor;
      if (!viga === !pontos) return err('PARAMETRO_INVALIDO', '`direcaoPor`: informe `viga` ou `pontos` (um dos dois).');
      if (viga && !b.vigas.some((v) => v.id === viga)) return err('VIGA_INEXISTENTE', `Viga ${viga} não existe.`);
      if (pontos && Math.hypot(pontos[1][0] - pontos[0][0], pontos[1][1] - pontos[0][1]) < 1e-3) return err('PARAMETRO_INVALIDO', 'Os dois pontos da direção são coincidentes.');
    }
    if (p.passagem) {
      const fora = lajes.filter((l) => !dentroPoligono(p.passagem as P, l.contorno as P[]) && !l.contorno.some((q) => Math.hypot(q[0] - p.passagem![0], q[1] - p.passagem![1]) < 1e-6));
      if (fora.length) return err('PASSAGEM_FORA', `O ponto de passagem está fora de ${fora.map((l) => l.nome).join(', ')}.`, fora.map((l) => l.id));
    }
    if (p.zonasMacicas) {
      const fora = lajes.filter((l) => p.zonasMacicas!.some((z) => !z.every((q) => dentroPoligono(q as P, l.contorno as P[]) || l.contorno.some((c) => Math.hypot(c[0] - q[0], c[1] - q[1]) < 1e-6))));
      if (fora.length) return err('ZONA_MACICA_FORA', `A zona maciça precisa ficar dentro de ${fora.map((l) => l.nome).join(', ')}.`, fora.map((l) => l.id));
    }
    if (p.concentrar && new Set(p.concentrar.map((x) => x.dir)).size !== p.concentrar.length) return err('PARAMETRO_INVALIDO', '`concentrar`: direção repetida.');
    if (p.concentrar || p.limparConcentrar) {
      const nao = lajes.filter((l) => l.tipo.tipo !== 'nervurada' && !(p.forma !== undefined && p.hTotal !== undefined && p.capa !== undefined));
      if (nao.length) return err('LAJE_NAO_NERVURADA', `${nao.map((l) => l.nome).join(', ')} não é nervurada bidirecional.`, nao.map((l) => l.id));
    }
    const vazio = !alguns && p.direcao === undefined && !p.direcaoPor && !p.passagem && !p.limparPassagem && !p.zonasMacicas && !p.limparZonas && !p.engasteBordas && !p.concentrar && !p.limparConcentrar;
    return vazio ? err('SEM_EDICAO', 'Informe ao menos um campo a alterar.') : [];
  },
  aplicar(d, p) {
    for (const l of d.lajes) {
      if (!p.ids.includes(l.id)) continue;
      if (p.forma !== undefined || p.hTotal !== undefined || p.capa !== undefined) {
        const at = l.tipo.tipo === 'nervurada' ? l.tipo : null;
        l.tipo = { tipo: 'nervurada', forma: p.forma ?? at!.forma, hTotal: p.hTotal ?? at!.hTotal, capa: p.capa ?? at!.capa };
        delete l.definir;
        if (l.direcao === undefined) l.direcao = direcaoMenorVao(l.contorno as P[]);
      }
      if (p.direcao !== undefined) l.direcao = ((p.direcao % 180) + 180) % 180;
      if (p.direcaoPor) {
        const por = p.direcaoPor, ref = pontoInterno(l.contorno as P[]);
        l.direcao = por.pontos ? direcaoPorPontos(por.pontos[0], por.pontos[1]) : direcaoPorViga(d.vigas.find((v) => v.id === por.viga)!.pontos as P[], por.relacao ?? 'paralela', ref);
      }
      if (p.passagem) l.pontoNervuras = [p.passagem[0], p.passagem[1]]; else if (p.limparPassagem) delete l.pontoNervuras;
      if (p.zonasMacicas) l.zonasMacicas = [...(l.zonasMacicas ?? []), ...copia(p.zonasMacicas)] as [number, number][][]; else if (p.limparZonas) delete l.zonasMacicas;
      if (p.concentrar) {
        const c: [number[], number[]] = [[...(l.nervurasConcentrar?.[0] ?? [])], [...(l.nervurasConcentrar?.[1] ?? [])]];
        for (const x of p.concentrar) c[x.dir] = [...new Set(x.indices)].sort((a, z) => a - z);
        if (c[0].length || c[1].length) l.nervurasConcentrar = c; else delete l.nervurasConcentrar;
      } else if (p.limparConcentrar) delete l.nervurasConcentrar;
      if (p.engasteBordas) { if (p.engasteBordas.some((a) => a !== 1)) l.engasteBordas = [...p.engasteBordas]; else delete l.engasteBordas; }
    }
    return `${p.ids.length} laje(s) nervurada(s) ajustada(s).`;
  },
});

// ---------------------------------------------------------------- laje.copiarPanos

registrar<{ de: string; para: string[]; incluirBase?: boolean }>({
  nome: 'laje.copiarPanos',
  descricao: 'Copia as características da laje nervurada bidirecional `de` para outros panos nervurados do mesmo grupo (E3c): tipo (forma, altura e capa), direção, ponto de passagem, engaste (se o número de arestas coincide), cobrimento e tabela de armadura; com `incluirBase`, também a armadura base. Zonas maciças e furos são da geometria de cada pano e não se copiam.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['de', 'para'], properties: {
    de: { type: 'string' }, para: { type: 'array', items: { type: 'string' }, minItems: 1 }, incluirBase: { type: 'boolean', description: 'copia também a armadura base (padrão: não)' },
  } },
  validar(b, p) {
    const o = b.lajes.find((l) => l.id === p.de);
    if (!o) return err('LAJE_INEXISTENTE', `Laje ${p.de} não existe.`);
    if (o.tipo.tipo !== 'nervurada') return err('LAJE_NAO_NERVURADA', `${o.nome} não é nervurada bidirecional.`, [o.id]);
    const sem = p.para.filter((id) => !b.lajes.some((l) => l.id === id));
    if (sem.length) return err('LAJE_INEXISTENTE', `Laje(s) inexistente(s): ${sem.join(', ')}.`);
    if (p.para.includes(p.de)) return err('PARAMETRO_INVALIDO', 'A laje de origem não pode ser destino.');
    const dest = b.lajes.filter((l) => p.para.includes(l.id));
    const outro = dest.filter((l) => l.grupo !== o.grupo);
    if (outro.length) return err('GRUPO_DIFERENTE', `${outro.map((l) => l.nome).join(', ')} não está no grupo de ${o.nome}: a cópia vale dentro do mesmo grupo.`, outro.map((l) => l.id));
    const nao = dest.filter((l) => l.tipo.tipo !== 'nervurada');
    if (nao.length) return err('LAJE_NAO_NERVURADA', `${nao.map((l) => l.nome).join(', ')} não é nervurada bidirecional.`, nao.map((l) => l.id));
    return [];
  },
  aplicar(d, p) {
    const o = d.lajes.find((l) => l.id === p.de)!;
    for (const l of d.lajes) {
      if (!p.para.includes(l.id)) continue;
      l.tipo = copia(o.tipo);
      if (o.direcao !== undefined) l.direcao = o.direcao; else delete l.direcao;
      if (o.pontoNervuras) l.pontoNervuras = [...o.pontoNervuras] as [number, number]; else delete l.pontoNervuras;
      if (o.engasteBordas && o.contorno.length === l.contorno.length) l.engasteBordas = [...o.engasteBordas]; else if (o.contorno.length === l.contorno.length) delete l.engasteBordas;
      if (o.cobrimento !== undefined) l.cobrimento = o.cobrimento; else delete l.cobrimento;
      if (o.tabela !== undefined) l.tabela = o.tabela; else delete l.tabela;
      if (p.incluirBase) { if (o.baseNervurada) l.baseNervurada = copia(o.baseNervurada); else delete l.baseNervurada; }
    }
    return `Características de ${o.nome} copiadas para ${p.para.length} pano(s).`;
  },
});
