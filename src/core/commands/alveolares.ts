// Comandos das lajes alveolares (frente E3e): fichas de placas da obra (criar, editar, copiar, remover, importar) e a atribuição
// da laje alveolar ao pano (ficha, placa, direção das placas, engastes de borda, processo construtivo, negativos editados e
// placa fixada). O catálogo da biblioteca de normas (`lajes.alveolares`) e os exemplos fictícios são resolvidos por id e a
// ficha de exemplo é copiada para a obra quando uma laje a usa. Dados de fabricante NÃO vêm no programa.
import type { Draft } from 'immer';
import { direcaoMenorVao } from '../building/lajes';
import { direcaoPorPontos, direcaoPorViga } from '../building/lancamentoL5';
import { fichaAlveolarPor, importarFichasAlveolares, placaPor, validarFichaAlveolar, type FichaAlveolar } from '../building/alveolares';
import type { BuildingModel } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { pontoInterno, type P } from '../geom/faces';
import { garantirTipoNaObra, limpar } from './tiposLaje';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const num: JsonSchema = { type: 'number' };

const daObra = (b: BuildingModel, id: string) => b.tiposLaje?.alveolares?.find((f) => f.id === id);
const fichasEmUso = (b: BuildingModel) => new Set(b.lajes.flatMap((l) => (l.tipo.tipo === 'alveolar' ? [l.tipo.ficha] : [])));

// ---------------------------------------------------------------- ficha.alveolar

const negativoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['phi', 's', 'Mu'], properties: { phi: num, s: num, Mu: num, Mfis: num, EI: num, EIfis: num, VRd: num } };
const placaSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['id', 'altura', 'capa', 'largura', 'larguraMin', 'apoioMin', 'apoioMax', 'pesoM2'], properties: {
  id: { type: 'string', minLength: 1 }, descricao: { type: 'string' }, altura: num, capa: num, largura: num, larguraMin: num, apoioMin: num, apoioMax: num, pesoM2: num, volume: num, concreto: { type: 'string' }, aco: { type: 'string' },
  positivo: { type: 'object', additionalProperties: false, required: ['Mu'], properties: { Mu: num, Mfis: num, EI: num, EIfis: num } }, VRd: num, VRdDesc: num,
  servico: { type: 'object', additionalProperties: false, properties: { Mdesc: num, Mparcial: num, Mlimitada: num, Mcompleta: num } },
  negativos: { type: 'array', items: negativoSchema }, hfInf: num, bwAlma: num,
} };
const fichaSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['nome', 'placas'], properties: {
  id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, fabricante: { type: 'string' }, referencia: { type: 'string' }, base: { type: 'string', enum: ['metro', 'placa'] },
  placas: { type: 'array', items: placaSchema, minItems: 1 }, nota: { type: 'string' }, ficticio: { type: 'boolean' },
} };

interface ParamsFicha { acao: 'criar' | 'editar' | 'copiar' | 'remover' | 'importar'; id?: string; ficha?: Omit<FichaAlveolar, 'id' | 'origem'> & { id?: string }; de?: string; nome?: string; texto?: string; substituir?: boolean }

registrar<ParamsFicha>({
  nome: 'ficha.alveolar',
  descricao: 'Fichas de placas alveolares da obra (E3e): `criar` (`ficha` { nome, fabricante, base: metro|placa, placas[] { id, altura total, capa, largura, larguraMin, apoioMin, apoioMax, pesoM2, volume, positivo { Mu, Mfis, EI, EIfis }, VRd, VRdDesc (cortante da seção descomprimida), servico { Mdesc, Mparcial, Mlimitada, Mcompleta }, negativos[] { phi, s, Mu, Mfis, EI, EIfis, VRd }, hfInf, bwAlma } }), `editar` (`id` + `ficha`), `copiar` (`de` = ficha da obra, do catálogo da biblioteca de normas ou de exemplo; `nome` opcional), `remover` (`id`; recusado se alguma laje usa) e `importar` (`texto` = JSON exportado, formato statikos-fichas-alveolares; `substituir` troca ids existentes). Resistências por metro de largura (base metro) ou por placa (base placa). O programa só confere a coerência lógica (Mu > Mfis, apoio mínimo ≤ máximo, serviço crescente), nunca o dado do fabricante; as fichas de exemplo são fictícias.',
  risco: 'escrita',
  calculo: (p) => ((p as unknown as ParamsFicha).acao === 'criar' || (p as unknown as ParamsFicha).acao === 'copiar' || (p as unknown as ParamsFicha).acao === 'importar' ? false : true),
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['criar', 'editar', 'copiar', 'remover', 'importar'] }, id: { type: 'string' }, ficha: fichaSchema, de: { type: 'string' }, nome: { type: 'string', minLength: 1 }, texto: { type: 'string' }, substituir: { type: 'boolean' },
  } },
  validar(b, p) {
    const reservado = (id: string) => id.startsWith('cat:') || id.startsWith('ex:');
    const checar = (f: FichaAlveolar) => { const v = validarFichaAlveolar(f); return v.erros.length ? err('FICHA_ALVEOLAR_INCOERENTE', `Ficha "${f.nome}" incoerente: ${v.erros.join(' ')}`) : []; };
    if (p.acao === 'criar' || p.acao === 'editar') {
      if (!p.ficha) return err('PARAMETRO_INVALIDO', 'Informe `ficha`.');
      const id = p.id ?? p.ficha.id ?? 'x';
      const e = checar({ ...p.ficha, id, origem: 'usuario' } as FichaAlveolar);
      if (e.length) return e;
      if (p.acao === 'criar') {
        const novo = p.id ?? p.ficha.id;
        if (novo && (reservado(novo) || fichaAlveolarPor(b, novo))) return err('FICHA_ALVEOLAR_EXISTENTE', `Já existe (ou é reservada) a ficha "${novo}".`);
      }
    }
    if (p.acao === 'editar') {
      if (!p.id) return err('PARAMETRO_INVALIDO', 'Informe `id`.');
      const f = daObra(b, p.id);
      if (!f) return err('FICHA_ALVEOLAR_INEXISTENTE', `A ficha "${p.id}" não está na obra (as do catálogo se editam na biblioteca de normas, tabela “Placas alveolares”).`);
      if (f.origem === 'fabricante') return err('FICHA_SOMENTE_LEITURA', `A ficha "${f.nome}" é do fabricante (somente leitura): copie-a para editar.`);
    }
    if (p.acao === 'copiar' && !(p.de && fichaAlveolarPor(b, p.de))) return err('FICHA_ALVEOLAR_INEXISTENTE', `Ficha de origem "${p.de ?? ''}" não existe.`);
    if (p.acao === 'remover') {
      if (!p.id || !daObra(b, p.id)) return err('FICHA_ALVEOLAR_INEXISTENTE', `A ficha "${p.id ?? ''}" não está na obra.`);
      if (fichasEmUso(b).has(p.id)) return err('FICHA_ALVEOLAR_EM_USO', `A ficha "${daObra(b, p.id)!.nome}" é usada por lajes: atribua outro tipo antes de removê-la.`, b.lajes.filter((l) => l.tipo.tipo === 'alveolar' && l.tipo.ficha === p.id).map((l) => l.id));
    }
    if (p.acao === 'importar') {
      if (p.texto === undefined) return err('PARAMETRO_INVALIDO', 'Informe `texto` (JSON exportado).');
      const r = importarFichasAlveolares(p.texto);
      if (!r.ok) return err('FICHA_ALVEOLAR_IMPORTACAO', `Arquivo recusado: ${r.erros.join('; ')}.`);
      for (const f of r.fichas) { const e = checar(f); if (e.length) return e; }
      const rep = r.fichas.filter((f) => reservado(f.id) || (!p.substituir && daObra(b, f.id))).map((f) => f.id);
      if (rep.length) return err('FICHA_ALVEOLAR_EXISTENTE', `Já existem (ou são reservadas) na obra: ${rep.join(', ')}. Use \`substituir\` para trocar.`);
    }
    return [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    d.tiposLaje ??= {};
    const lista = (d.tiposLaje.alveolares ??= []);
    if (p.acao === 'criar') {
      const id = p.id ?? p.ficha!.id ?? novoId(d, 'fa'), f = { ...copia(p.ficha!), id, origem: 'usuario' as const };
      lista.push(f as FichaAlveolar);
      return `Ficha alveolar "${f.nome}" criada.`;
    }
    if (p.acao === 'editar') {
      const i = lista.findIndex((f) => f.id === p.id);
      lista[i] = { ...copia(p.ficha!), id: p.id!, origem: 'usuario' } as FichaAlveolar;
      return `Ficha alveolar "${lista[i].nome}" alterada.`;
    }
    if (p.acao === 'copiar') {
      const o = copia(fichaAlveolarPor(b, p.de!)!), nova: FichaAlveolar = { ...o, id: novoId(d, 'fa'), nome: p.nome?.trim() || `${o.nome} (cópia)`, origem: 'usuario' };
      lista.push(nova);
      return `Ficha alveolar "${nova.nome}" copiada de "${o.nome}".`;
    }
    if (p.acao === 'importar') {
      const r = importarFichasAlveolares(p.texto!) as { ok: true; fichas: FichaAlveolar[] };
      for (const f of r.fichas) { const i = lista.findIndex((x) => x.id === f.id); if (i >= 0) lista[i] = copia(f); else lista.push(copia(f)); }
      limpar(d);
      return `${r.fichas.length} ficha(s) alveolar(es) importada(s).`;
    }
    const i = lista.findIndex((f) => f.id === p.id), nome = lista[i].nome;
    lista.splice(i, 1);
    limpar(d);
    return `Ficha alveolar "${nome}" removida.`;
  },
});

// ---------------------------------------------------------------- laje.alveolar

interface NegEd { phi: number; s: number; comprimento?: number; percentual?: number }
interface ParamsLajeAlveolar {
  ids: string[]; ficha?: string; placa?: string; fixar?: boolean;
  direcao?: number; direcaoPor?: { viga?: string; relacao?: 'paralela' | 'perpendicular'; pontos?: [P, P] };
  engasteBordas?: number[]; processo?: 0 | 1 | 2 | 'obra';
  negativos?: { inicio?: NegEd; fim?: NegEd; limpar?: 'inicio' | 'fim' | 'ambos' };
}
const negEdSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', minimum: 5, maximum: 25 }, s: { type: 'number', minimum: 0.05, maximum: 0.4 }, comprimento: { type: 'number', exclusiveMinimum: 0 }, percentual: { type: 'number', exclusiveMinimum: 0, maximum: 100 } } };

registrar<ParamsLajeAlveolar>({
  nome: 'laje.alveolar',
  descricao: 'Atribui ou ajusta a laje alveolar protendida (E3e) em panos: `ficha` e `placa` (código na ficha; sem os dois, as lajes já devem ser alveolares; `placa` sozinha troca a placa na mesma ficha e a FIXA, a verificação deixa de sugerir outra; `fixar: false` volta à escolha automática), `direcao` (graus, direção das placas) ou `direcaoPor` (viga paralela/perpendicular, ou dois pontos), `engasteBordas` (coeficiente 0 a 1 por aresta do contorno: a borda é apoiada por padrão e contínua só quando compartilhada com outro pano; lista vazia volta ao padrão), `processo` (0 escorado, 1 engaste aproximado, 2 duas fases, `obra` = o da opção alveolarProcesso) e `negativos` (`inicio` e `fim`, no sentido da direção das placas: φ mm a cada s m e comprimento no pano em m ou em %; `limpar` apaga um ou os dois; bloqueados até armadura.desbloquear). A ambiente é laje.exposicao e os momentos mínimos por tipo de vão, laje.momentosMin.',
  risco: 'escrita',
  calculo: (p) => {
    const q = p as unknown as ParamsLajeAlveolar;
    // só fixar a placa e editar os negativos mexem apenas no dimensionamento; ficha, placa, direção, engaste e processo mudam a grelha
    return q.ficha === undefined && q.placa === undefined && q.direcao === undefined && !q.direcaoPor && !q.engasteBordas && q.processo === undefined ? 'detalhe' : true;
  },
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, ficha: { type: 'string', description: 'id da ficha alveolar (obra, catálogo ou exemplo)' }, placa: { type: 'string', description: 'código da placa na ficha' }, fixar: { type: 'boolean' },
    direcao: num,
    direcaoPor: { type: 'object', additionalProperties: false, properties: { viga: { type: 'string' }, relacao: { type: 'string', enum: ['paralela', 'perpendicular'], default: 'paralela' }, pontos: { type: 'array', items: ponto, minItems: 2, maxItems: 2 } } },
    engasteBordas: { type: 'array', items: { type: 'number', minimum: 0, maximum: 1 }, description: 'coeficiente por aresta do contorno; lista vazia = padrão (apoiada, contínua só em borda compartilhada)' },
    processo: { oneOf: [{ type: 'integer', enum: [0, 1, 2] }, { const: 'obra' }] },
    negativos: { type: 'object', additionalProperties: false, properties: { inicio: negEdSchema, fim: negEdSchema, limpar: { type: 'string', enum: ['inicio', 'fim', 'ambos'] } } },
  } },
  validar(b, p) {
    const sem = p.ids.filter((id) => !b.lajes.some((l) => l.id === id));
    if (sem.length) return err('LAJE_INEXISTENTE', `Laje(s) inexistente(s): ${sem.join(', ')}.`);
    const lajes = b.lajes.filter((l) => p.ids.includes(l.id));
    const nao = lajes.filter((l) => l.tipo.tipo !== 'alveolar');
    if (p.ficha === undefined && nao.length) return err('LAJE_NAO_ALVEOLAR', `${nao.map((l) => l.nome).join(', ')} não é alveolar: informe a ficha (e a placa).`, nao.map((l) => l.id));
    if (p.ficha !== undefined) {
      const fi = fichaAlveolarPor(b, p.ficha);
      if (!fi) return err('FICHA_ALVEOLAR_INEXISTENTE', `Ficha alveolar "${p.ficha}" não existe.`);
      if (!fi.placas.length) return err('FICHA_ALVEOLAR_INEXISTENTE', `A ficha "${fi.nome}" não tem placas.`);
      if (p.placa !== undefined && !placaPor(fi, p.placa)) return err('FICHA_ALVEOLAR_INEXISTENTE', `A ficha "${fi.nome}" não tem a placa "${p.placa}".`);
    } else if (p.placa !== undefined) {
      for (const fid of new Set(lajes.map((l) => (l.tipo.tipo === 'alveolar' ? l.tipo.ficha : '')))) if (!placaPor(fichaAlveolarPor(b, fid), p.placa)) return err('FICHA_ALVEOLAR_INEXISTENTE', `A ficha "${fid}" não tem a placa "${p.placa}".`);
    }
    if (p.direcaoPor) {
      const { viga, pontos } = p.direcaoPor;
      if (!viga === !pontos) return err('PARAMETRO_INVALIDO', '`direcaoPor`: informe `viga` ou `pontos` (um dos dois).');
      if (viga && !b.vigas.some((v) => v.id === viga)) return err('VIGA_INEXISTENTE', `Viga ${viga} não existe.`);
      if (pontos && Math.hypot(pontos[1][0] - pontos[0][0], pontos[1][1] - pontos[0][1]) < 1e-3) return err('PARAMETRO_INVALIDO', 'Os dois pontos da direção são coincidentes.');
    }
    const vazio = p.ficha === undefined && p.placa === undefined && p.fixar === undefined && p.direcao === undefined && !p.direcaoPor && !p.engasteBordas && p.processo === undefined && !p.negativos;
    return vazio ? err('SEM_EDICAO', 'Informe ao menos um campo a alterar.') : [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    for (const l of d.lajes) {
      if (!p.ids.includes(l.id)) continue;
      if (p.ficha !== undefined || p.placa !== undefined) {
        const ficha = p.ficha ?? (l.tipo.tipo === 'alveolar' ? l.tipo.ficha : ''), fi = fichaAlveolarPor(b, ficha)!, placa = p.placa ?? (l.tipo.tipo === 'alveolar' && l.tipo.ficha === ficha ? l.tipo.placa : fi.placas[0].id);
        l.tipo = { tipo: 'alveolar', ficha, placa };
        delete l.definir;
        garantirTipoNaObra(d, l.tipo);
        if (l.direcao === undefined) l.direcao = direcaoMenorVao(l.contorno as P[]);
        // trocar a placa pelo usuário a fixa; trocar a ficha apenas, não
        if (p.placa !== undefined && p.fixar !== false) (l.alveolar ??= {}).fixa = true;
      }
      if (p.fixar === true) (l.alveolar ??= {}).fixa = true;
      if (p.fixar === false && l.alveolar) delete l.alveolar.fixa;
      if (p.direcao !== undefined) l.direcao = ((p.direcao % 180) + 180) % 180;
      if (p.direcaoPor) {
        const por = p.direcaoPor, ref = pontoInterno(l.contorno as P[]);
        l.direcao = por.pontos ? direcaoPorPontos(por.pontos[0], por.pontos[1]) : direcaoPorViga(d.vigas.find((v) => v.id === por.viga)!.pontos as P[], por.relacao ?? 'paralela', ref);
      }
      if (p.engasteBordas) { if (p.engasteBordas.length) l.engasteBordas = [...p.engasteBordas]; else delete l.engasteBordas; }
      if (p.processo !== undefined) { if (p.processo === 'obra') { if (l.alveolar) delete l.alveolar.processo; } else (l.alveolar ??= {}).processo = p.processo; }
      if (p.negativos) {
        const cfg = (l.alveolar ??= {}), atual = cfg.negativos ?? [null, null];
        const lim = p.negativos.limpar, novo: [typeof atual[0], typeof atual[1]] = [p.negativos.inicio ?? (lim === 'inicio' || lim === 'ambos' ? null : atual[0]), p.negativos.fim ?? (lim === 'fim' || lim === 'ambos' ? null : atual[1])];
        if (novo[0] || novo[1]) cfg.negativos = novo; else delete cfg.negativos;
      }
      if (l.alveolar && !Object.keys(l.alveolar).length) delete l.alveolar;
    }
    return `Laje(s) alveolar(es) ajustada(s) (${p.ids.length}).`;
  },
});
