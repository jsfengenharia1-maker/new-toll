// Comandos da armadura das paredes e pilares-parede (E1d): editar e bloquear a malha de um pano, comprimentos de emenda
// por pavimento, espessura da parede, armadura das aberturas (editar, copiar, padrão por tipo) e muros de arrimo.
// O recálculo verifica a armadura bloqueada sem redimensioná-la; bloqueio vale para o número de panos em que foi feito.
import type { Draft } from 'immer';
import { ehAlvenaria } from '../building/alvenaria';
import { numeroDePanos } from '../building/paredesDim';
import { lancesDoPP, ladosDoPP } from '../building/pilarParede';
import { ppDaParede } from '../building/paredesBase';
import type { ArmaduraAbertura, BuildingModel, EmendaParede, MuroArrimoObra, Parede, PilarParede } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const BITOLAS = [6.3, 8, 10, 12.5, 16, 20, 25];
const malha: JsonSchema = { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: BITOLAS, description: 'bitola (mm)' }, s: { type: 'number', minimum: 0.05, maximum: 0.5, description: 'espaçamento (m), por face' } } };
const barras: JsonSchema = { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 40 }, phi: { type: 'number', enum: [...BITOLAS, 32] } } };
const emendas: JsonSchema = { type: 'array', items: { type: 'object', additionalProperties: false, required: ['pavimento'], properties: { pavimento: { type: 'string', description: 'pavimento do topo do lance de baixo' }, tracao: { type: 'number', minimum: 0.1, maximum: 5, description: 'emenda tracionada (m)' }, compressao: { type: 'number', minimum: 0.1, maximum: 5, description: 'emenda comprimida (m)' } } } };
const armaduraAbertura: JsonSchema = { type: 'object', additionalProperties: false, required: ['verga', 'estribo', 'montante'], properties: {
  verga: barras, estribo: { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: [5, 6.3, 8, 10] }, s: { type: 'number', minimum: 0.05, maximum: 0.3 } } },
  peitoril: barras, montante: barras, canto: barras,
} };

type ParamsArmadura = { id: string; lado?: number; pavimento?: string; pano?: number; vert?: { phi: number; s: number }; hor?: { phi: number; s: number }; emendas?: EmendaParede[]; limparEmendas?: boolean };

const propsArmadura = {
  id: { type: 'string' }, lado: { type: 'integer', minimum: 0, description: 'índice do lado (trecho) da parede, a partir de 0' },
  pavimento: { type: 'string', description: 'lance (pavimento do topo)' }, pano: { type: 'integer', minimum: 0, description: 'pano do lado e lance (faixas entre as aberturas, da esquerda para a direita); ausente = todos' },
  vert: malha, hor: malha, emendas, limparEmendas: { type: 'boolean', description: 'volta os comprimentos de emenda aos calculados' },
} satisfies Record<string, JsonSchema>;

function validarArmadura(b: BuildingModel, p: ParamsArmadura, pp: PilarParede | undefined, nome: string): Diagnostico[] {
  if (!pp) return err('PAREDE_INEXISTENTE', `${nome} ${p.id} não existe.`);
  const d: Diagnostico[] = [];
  const temMalha = p.vert !== undefined || p.hor !== undefined;
  if (!temMalha && !p.emendas?.length && !p.limparEmendas) return err('ARRANJO', 'Informe as malhas vertical e horizontal (com lado e pavimento) ou os comprimentos de emenda.', [p.id]);
  if (temMalha) {
    if (!p.vert || !p.hor || p.lado === undefined || !p.pavimento) return err('ARRANJO', 'Para bloquear a malha informe lado, pavimento, vert e hor.', [p.id]);
    const lances = lancesDoPP(b, pp), lados = ladosDoPP(b, pp);
    if (!lances.some((l) => l.id === p.pavimento)) d.push(...err('LANCE_INEXISTENTE', `${pp.nome} não tem lance em ${p.pavimento}.`, [p.id]));
    else if (p.lado >= lados.length) d.push(...err('LADO_INEXISTENTE', `${pp.nome} tem ${lados.length} lado(s).`, [p.id]));
    else if (!lados[p.lado].casca) d.push(...err('LADO_CURTO', `${lados[p.lado].nome} é trecho curto (tratado como pilar): a malha não se aplica; ele é dimensionado como pilar.`, [p.id]));
    else if (p.pano !== undefined && p.pano >= numeroDePanos(b, p.id, p.lado, p.pavimento)) d.push(...err('PANO_INEXISTENTE', `O lado tem ${numeroDePanos(b, p.id, p.lado, p.pavimento)} pano(s) nesse lance.`, [p.id]));
  }
  for (const e of p.emendas ?? []) if (!lancesDoPP(b, pp).some((l) => l.id === e.pavimento)) d.push(...err('LANCE_INEXISTENTE', `${pp.nome} não tem lance em ${e.pavimento}.`, [p.id]));
  return d;
}

function aplicarArmadura(d: Draft<BuildingModel>, alvo: Draft<Parede> | Draft<PilarParede>, p: ParamsArmadura): string {
  const msgs: string[] = [];
  if (p.vert && p.hor && p.lado !== undefined && p.pavimento) {
    const panos = numeroDePanos(d as BuildingModel, p.id, p.lado, p.pavimento);
    alvo.armaduras = (alvo.armaduras ?? []).filter((x) => !(x.lado === p.lado && x.pavimento === p.pavimento && (p.pano === undefined || x.pano === undefined || x.pano === p.pano)));
    alvo.armaduras.push({ lado: p.lado, pavimento: p.pavimento, ...(p.pano !== undefined ? { pano: p.pano } : {}), panos, vert: { ...p.vert }, hor: { ...p.hor } });
    msgs.push('malha editada e bloqueada');
  }
  if (p.limparEmendas) { delete alvo.emendas; msgs.push('emendas voltaram às calculadas'); }
  if (p.emendas?.length) {
    const lista = (alvo.emendas ?? []).filter((x) => !p.emendas!.some((e) => e.pavimento === x.pavimento));
    for (const e of p.emendas) {
      const antiga = alvo.emendas?.find((x) => x.pavimento === e.pavimento);
      lista.push({ pavimento: e.pavimento, ...(e.tracao !== undefined ? { tracao: e.tracao } : antiga?.tracao !== undefined ? { tracao: antiga.tracao } : {}), ...(e.compressao !== undefined ? { compressao: e.compressao } : antiga?.compressao !== undefined ? { compressao: antiga.compressao } : {}) });
    }
    alvo.emendas = lista;
    msgs.push('emendas editadas');
  }
  return msgs.join(' e ');
}

registrar<ParamsArmadura>({
  nome: 'parede.armadura',
  descricao: 'Edita e bloqueia a malha de um pano de parede (lado, lance e pano; vert e hor { phi (mm), s (m) } iguais nas duas faces) e/ou os comprimentos de emenda por pavimento (tração e compressão, m). O recálculo verifica essa malha sem redimensioná-la: erro se o fator de cumprimento exigido não for atingido. O bloqueio vale para o número de panos em que foi feito.',
  risco: 'escrita', calculo: 'detalhe', mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: propsArmadura },
  validar(b, p) {
    const w = b.paredes?.find((x) => x.id === p.id);
    if (w && ehAlvenaria(w)) return err('PAREDE_TIPO', `${w.nome} é de ${w.tipo === 'blocos' ? 'blocos' : 'alvenaria'}: a armadura vem do tipo de alvenaria (alvenaria.tipo), não da malha de concreto.`);
    return validarArmadura(b, p, w && ppDaParede(w), 'Parede');
  },
  aplicar(d, p) { const w = d.paredes!.find((x) => x.id === p.id)!; return `Parede ${w.nome}: ${aplicarArmadura(d, w, p)}.`; },
});

registrar<ParamsArmadura>({
  nome: 'pilarParede.armadura',
  descricao: 'Edita e bloqueia a malha de um pano de pilar-parede (lado, lance; vert e hor { phi (mm), s (m) } iguais nas duas faces) e/ou os comprimentos de emenda por pavimento. O recálculo verifica essa malha sem redimensioná-la. A espessura do pilar-parede muda no tipo (`pilarParede.tipo`).',
  risco: 'escrita', calculo: 'detalhe', mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: propsArmadura },
  validar(b, p) { return validarArmadura(b, p, b.pilaresParede?.find((x) => x.id === p.id), 'Pilar-parede'); },
  aplicar(d, p) { const w = d.pilaresParede!.find((x) => x.id === p.id)!; return `Pilar-parede ${w.nome}: ${aplicarArmadura(d, w, p)}.`; },
});

registrar<{ id: string; pavimento?: string; espessura: number }>({
  nome: 'parede.redimensionar',
  descricao: 'Muda a espessura total de uma parede (m), mantendo a proporção entre esquerda e direita: no lance do `pavimento` (espessura própria do pavimento) ou, sem ele, em toda a parede. Refaz a análise.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'espessura'], properties: { id: { type: 'string' }, pavimento: { type: 'string', description: 'pavimento do topo do lance; ausente = toda a parede' }, espessura: { type: 'number', minimum: 0.05, maximum: 3 } } },
  validar(b, p) {
    const w = b.paredes?.find((x) => x.id === p.id);
    if (!w) return err('PAREDE_INEXISTENTE', `Parede ${p.id} não existe.`);
    if (p.pavimento && !lancesDoPP(b, ppDaParede(w)).some((l) => l.id === p.pavimento)) return err('LANCE_INEXISTENTE', `${w.nome} não tem lance em ${p.pavimento}.`, [p.id]);
    return [];
  },
  aplicar(d, p) {
    const w = d.paredes!.find((x) => x.id === p.id)!;
    const atual = p.pavimento ? w.porPavimento?.find((e) => e.pavimento === p.pavimento) ?? { esq: w.esq, dir: w.dir } : { esq: w.esq, dir: w.dir };
    const tot = atual.esq + atual.dir, f = tot > 0 ? p.espessura / tot : 1, esq = +(atual.esq * f).toFixed(4), dir = +(p.espessura - esq).toFixed(4);
    if (p.pavimento) {
      w.porPavimento = (w.porPavimento ?? []).filter((e) => e.pavimento !== p.pavimento);
      w.porPavimento.push({ pavimento: p.pavimento, esq, dir });
    } else { w.esq = esq; w.dir = dir; delete w.porPavimento; }
    return `Parede ${w.nome}: espessura ${(p.espessura * 100).toFixed(1).replace('.', ',')} cm${p.pavimento ? ` no lance ${p.pavimento}` : ''}.`;
  },
});

type ParamsAbertura = { acao: 'editar' | 'copiar' | 'padrao' | 'limpar'; abertura?: string; de?: string; para?: string[]; tipo?: 'porta' | 'janela'; armadura?: ArmaduraAbertura };

const acharAbertura = (b: BuildingModel, id: string) => { for (const w of (b.paredes ?? []).filter((q) => !ehAlvenaria(q))) { const a = w.aberturas?.find((x) => x.id === id); if (a) return { w, a }; } return undefined; };

registrar<ParamsAbertura>({
  nome: 'abertura.armadura',
  descricao: 'Armadura de reforço das aberturas das paredes. `acao` "editar": grava e bloqueia a `armadura` { verga {n, phi}, estribo {phi, s}, peitoril?, montante, canto? } numa `abertura`; "copiar": copia a armadura da abertura `de` para as aberturas `para`; "padrao": define a armadura padrão do `tipo` (porta ou janela), aplicada às aberturas sem armadura própria; "limpar": remove a armadura da `abertura` (volta à calculada) ou, com `tipo` e sem abertura, o padrão do tipo. A armadura dada é verificada no recálculo contra a necessária.',
  risco: 'escrita', calculo: 'detalhe', mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['editar', 'copiar', 'padrao', 'limpar'] }, abertura: { type: 'string' }, de: { type: 'string' }, para: { type: 'array', items: { type: 'string' }, minItems: 1 },
    tipo: { type: 'string', enum: ['porta', 'janela'] }, armadura: armaduraAbertura,
  } },
  validar(b, p) {
    if (p.acao === 'editar') {
      if (!p.abertura || !p.armadura) return err('ARRANJO', 'Informe a abertura e a armadura.');
      return acharAbertura(b, p.abertura) ? [] : err('ABERTURA_INEXISTENTE', `Abertura ${p.abertura} não existe.`);
    }
    if (p.acao === 'copiar') {
      if (!p.de || !p.para?.length) return err('ARRANJO', 'Informe a abertura de origem (`de`) e as de destino (`para`).');
      const o = acharAbertura(b, p.de);
      if (!o) return err('ABERTURA_INEXISTENTE', `Abertura ${p.de} não existe.`);
      if (!o.a.armadura) return err('SEM_ARMADURA', `A abertura ${p.de} não tem armadura própria para copiar.`);
      const sem = p.para.find((id) => !acharAbertura(b, id));
      return sem ? err('ABERTURA_INEXISTENTE', `Abertura ${sem} não existe.`) : [];
    }
    if (p.acao === 'padrao') return p.tipo && p.armadura ? [] : err('ARRANJO', 'Informe o tipo (porta ou janela) e a armadura.');
    if (p.abertura) return acharAbertura(b, p.abertura) ? [] : err('ABERTURA_INEXISTENTE', `Abertura ${p.abertura} não existe.`);
    return p.tipo ? [] : err('ARRANJO', 'Informe a abertura ou o tipo.');
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    if (p.acao === 'editar') { const x = acharAbertura(b, p.abertura!)!; const a = d.paredes!.find((w) => w.id === x.w.id)!.aberturas!.find((y) => y.id === p.abertura)!; a.armadura = structuredClone(p.armadura!); return `Armadura da abertura de ${x.w.nome} editada e bloqueada.`; }
    if (p.acao === 'copiar') {
      const o = acharAbertura(b, p.de!)!.a.armadura!;
      for (const id of p.para!) { const x = acharAbertura(b, id)!; d.paredes!.find((w) => w.id === x.w.id)!.aberturas!.find((y) => y.id === id)!.armadura = structuredClone(o); }
      return `Armadura copiada para ${p.para!.length} abertura(s).`;
    }
    if (p.acao === 'padrao') { d.aberturasPadrao = { ...(d.aberturasPadrao ?? {}), [p.tipo!]: structuredClone(p.armadura!) }; return `Armadura padrão de ${p.tipo === 'porta' ? 'portas' : 'janelas'} definida.`; }
    if (p.abertura) { const x = acharAbertura(b, p.abertura)!; delete d.paredes!.find((w) => w.id === x.w.id)!.aberturas!.find((y) => y.id === p.abertura)!.armadura; return 'Armadura da abertura removida (volta à calculada).'; }
    if (d.aberturasPadrao) { delete d.aberturasPadrao[p.tipo!]; if (!d.aberturasPadrao.porta && !d.aberturasPadrao.janela) delete d.aberturasPadrao; }
    return `Padrão de ${p.tipo === 'porta' ? 'portas' : 'janelas'} removido.`;
  },
});

// ---------------------------------------------------------------- muros de arrimo

type ParamsMuro = Omit<MuroArrimoObra, 'id'> & { id?: string };
const muroSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['nome', 'H', 'tTopo', 'tBase', 'B', 'ponta', 'hBase', 'solo'], properties: {
  id: { type: 'string', description: 'id de um muro existente para alterar; ausente = novo' }, nome: { type: 'string', minLength: 1 },
  H: { type: 'number', minimum: 0.5, maximum: 12, description: 'altura do fuste acima da base (m)' }, tTopo: { type: 'number', minimum: 0.15, maximum: 1 }, tBase: { type: 'number', minimum: 0.15, maximum: 1.5 },
  B: { type: 'number', minimum: 0.5, maximum: 10, description: 'largura da base (m)' }, ponta: { type: 'number', minimum: 0, maximum: 5 }, hBase: { type: 'number', minimum: 0.2, maximum: 1.5 },
  solo: { type: 'object', additionalProperties: false, required: ['gama', 'phi', 'metodo'], properties: { gama: { type: 'number', minimum: 10, maximum: 25 }, phi: { type: 'number', minimum: 10, maximum: 50 }, metodo: { type: 'string', enum: ['repouso', 'rankine', 'coulomb'] }, delta: { type: 'number', minimum: 0, maximum: 40 }, k: { type: 'number', minimum: 0.05, maximum: 2 } } },
  sobrecarga: { type: 'number', minimum: 0, maximum: 100 }, gamaConcreto: { type: 'number', minimum: 20, maximum: 27 }, atrito: { type: 'number', minimum: 0.1, maximum: 1 },
  sigmaAdm: { type: 'number', minimum: 20, maximum: 2000, description: 'σadm da base (kN/m²); ausente = a do terreno da obra (informada ou estimada pelo SPT), na fundação (FU7b)' }, fsTombamento: { type: 'number', minimum: 1, maximum: 5 }, fsDeslizamento: { type: 'number', minimum: 1, maximum: 5 },
  cota: { type: 'number', description: 'cota de assentamento da base (m); ausente = a de fundação da obra (FU7b)' }, comprimento: { type: 'number', minimum: 0.5, maximum: 2000, description: 'comprimento do muro (m), para os quantitativos da base na fundação (FU7b)' },
} };

registrar<ParamsMuro>({
  nome: 'muro.arrimo',
  descricao: 'Cria ou altera (com `id`) um muro de arrimo em balanço isolado: fuste (alturas e espessuras no topo e na base), base (largura, ponta e espessura), solo do aterro { gama, phi, metodo }, sobrecarga e, opcionalmente, atrito base-solo, σadm e fatores de segurança. O dimensionamento verifica a estabilidade e arma o fuste e a base por metro (premissas e1c-muro-arrimo e e1d-muro-arrimo).',
  risco: 'escrita', calculo: 'detalhe', mcp: false,
  schema: muroSchema,
  validar(b, p) {
    if (p.id && !b.murosArrimo?.some((m) => m.id === p.id)) return err('MURO_INEXISTENTE', `Muro ${p.id} não existe.`);
    if (p.ponta + p.tBase >= p.B) return err('MURO_GEOMETRIA', 'A ponta mais a espessura do fuste na base passam da largura da base.');
    if (p.tTopo > p.tBase) return err('MURO_GEOMETRIA', 'A espessura no topo não pode passar da espessura na base do fuste.');
    return [];
  },
  aplicar(d, p) {
    const { id, ...resto } = p;
    if (id) { const m = d.murosArrimo!.find((x) => x.id === id)!; for (const k of Object.keys(m) as (keyof MuroArrimoObra)[]) if (k !== 'id') delete (m as Record<string, unknown>)[k]; Object.assign(m, structuredClone(resto)); return `Muro ${m.nome} alterado.`; }
    const novo: MuroArrimoObra = { id: `mu_${(++d.seq).toString(36)}`, ...structuredClone(resto) } as MuroArrimoObra;
    (d.murosArrimo ??= []).push(novo);
    return `Muro de arrimo ${novo.nome} lançado.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'muro.remover',
  descricao: 'Remove muros de arrimo isolados.',
  risco: 'destrutivo', calculo: 'detalhe', mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) { const f = p.ids.find((id) => !b.murosArrimo?.some((m) => m.id === id)); return f ? err('MURO_INEXISTENTE', `Muro ${f} não existe.`) : []; },
  aplicar(d, p) { d.murosArrimo = d.murosArrimo!.filter((m) => !p.ids.includes(m.id)); if (!d.murosArrimo.length) delete d.murosArrimo; return `${p.ids.length} muro(s) removido(s).`; },
});
