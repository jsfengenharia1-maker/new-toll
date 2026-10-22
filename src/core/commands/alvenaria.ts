// Comandos da alvenaria estrutural e dos blocos de concreto (E1e): tipos de bloco e de alvenaria, ajuste das aberturas à
// modulação e verga. A parede de alvenaria é lançada por `parede.criar`/`parede.editar` (campos `tipo` e `material`).
// Resistências, modulação e quantitativos em building/alvenaria.ts.
import type { Draft } from 'immer';
import { ajustarAberturaModular, blocoDe, resistenciaAlvenaria, tipoAlvenariaDe, trechoDaAbertura } from '../building/alvenaria';
import { opcoesEmUso, perfilDe } from '../building/opcoes';
import type { ArmaduraVerga, BuildingModel, TipoAlvenaria, TipoBloco } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const r4 = (v: number) => +v.toFixed(4);

// ---------------------------------------------------------------- blocos

type BlocoIn = { id?: string; nome?: string; comprimento?: number; largura?: number; altura?: number; fbk?: number; canto?: boolean; remover?: boolean };

registrar<BlocoIn>({
  nome: 'bloco.tipo',
  descricao: 'Cria, edita ou remove um bloco de concreto da biblioteca da obra (C5.3, C5.4): dimensões modulares com a junta (`comprimento`, `largura` = espessura da parede e `altura`, m), `fbk` (MPa, área bruta) e `canto` (peça de canto; ausente = só quando a largura não é metade do comprimento). Sem `id`, cria (exige as dimensões e o fbk); com `id`, edita ou remove (`remover`). O meio bloco é metade do comprimento.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 },
    comprimento: { type: 'number', minimum: 0.1, maximum: 1 }, largura: { type: 'number', minimum: 0.05, maximum: 0.5 }, altura: { type: 'number', minimum: 0.05, maximum: 0.4 },
    fbk: { type: 'number', minimum: 1, maximum: 60, description: 'MPa, área bruta' }, canto: { type: 'boolean' }, remover: { type: 'boolean' },
  } },
  validar(b, p) {
    const x = p.id ? b.blocos?.find((q) => q.id === p.id) : undefined;
    if (p.id && !x) return err('BLOCO_INEXISTENTE', `Bloco ${p.id} não existe.`);
    if (p.remover) return b.tiposAlvenaria?.some((t) => t.bloco === p.id) ? err('BLOCO_EM_USO', 'Há tipos de alvenaria com este bloco: troque o bloco deles antes de removê-lo.') : [];
    if (!p.id && (p.comprimento === undefined || p.largura === undefined || p.altura === undefined || p.fbk === undefined)) return err('BLOCO_DADOS', 'Informe comprimento, largura, altura e fbk do bloco.');
    return [];
  },
  aplicar(d, p) {
    d.blocos ??= [];
    if (p.remover) { d.blocos = d.blocos.filter((q) => q.id !== p.id); if (!d.blocos.length) delete d.blocos; return 'Bloco removido.'; }
    if (p.id) {
      const x = d.blocos.find((q) => q.id === p.id)!;
      if (p.nome) x.nome = p.nome.trim();
      for (const k of ['comprimento', 'largura', 'altura', 'fbk'] as const) if (p[k] !== undefined) x[k] = r4(p[k]!);
      if (p.canto !== undefined) x.canto = p.canto;
      return `Bloco ${x.nome} alterado.`;
    }
    const novo: TipoBloco = { id: novoId(d, 'bl'), nome: p.nome?.trim() || `Bloco ${d.blocos.length + 1}`, comprimento: r4(p.comprimento!), largura: r4(p.largura!), altura: r4(p.altura!), fbk: p.fbk!, ...(p.canto !== undefined ? { canto: p.canto } : {}) };
    d.blocos.push(novo);
    return `Bloco ${novo.nome} criado (${Math.round(novo.comprimento * 100)} × ${Math.round(novo.largura * 100)} × ${Math.round(novo.altura * 100)} cm, fbk ${novo.fbk} MPa).`;
  },
});

// ---------------------------------------------------------------- tipos de alvenaria

const malha: JsonSchema = { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', minimum: 4, maximum: 25 }, s: { type: 'number', minimum: 0.05, maximum: 1.5 } } };
const CAMPOS_LIMPAR = ['E', 'G', 'ftd', 'fvd', 'fpk', 'argamassa', 'graute', 'armadura'] as const;
type Limpar = (typeof CAMPOS_LIMPAR)[number];
type AlvIn = Partial<Omit<TipoAlvenaria, 'id'>> & { id?: string; blocoNome?: string; remover?: boolean; limpar?: Limpar[] };
/** Id do bloco do pedido: o informado ou, por `blocoNome`, o de mesmo nome na biblioteca da obra. */
const blocoDoPedido = (b: Pick<BuildingModel, 'blocos'>, p: Pick<AlvIn, 'bloco' | 'blocoNome'>): string | undefined => p.bloco ?? b.blocos?.find((q) => q.nome === p.blocoNome)?.id;

registrar<AlvIn>({
  nome: 'alvenaria.tipo',
  descricao: 'Cria, edita ou remove um tipo de alvenaria estrutural (C5.1, C5.8, C5.25, K1.9.4, K1.9.5). `modelo` "generica": peso `gama` (kN/m³), módulo `E` e resistência de cálculo à compressão `fd` (MPa), com `ftd` (tração; ausente = % da compressão pela opção), `fvd` (cisalhamento; ausente = ftd), `G` e `considerarG` (rigidez ao cisalhamento informada). `modelo` "blocos": `bloco` da biblioteca, `argamassa` e `graute` (MPa), `grauteamento` (nenhum, parcial ou total), `fpk` do prisma (ausente = estimado pela opção) e `armada` (barras verticais nas células e horizontais nas juntas, `armadura` opcional bloqueada { vertical, horizontal } com phi mm e s m). Sem `id`, cria; com `id`, edita ou remove (`remover`); `limpar` apaga campos opcionais.',
  risco: 'escrita',
  mcp: false,
  // E, G, γ, resistências do bloco e do prisma entram na casca ou no fk: refazem a análise; armadura, argamassa, graute e armar só o dimensionamento
  calculo: (p) => {
    const so = new Set(['id', 'nome', 'armadura', 'armada', 'argamassa', 'graute', 'grauteamento', 'limpar']);
    const limpa = ((p.limpar as string[] | undefined) ?? []).every((k) => k === 'armadura' || k === 'argamassa' || k === 'graute');
    return !p.remover && p.id !== undefined && Object.keys(p).every((k) => so.has(k)) && limpa ? 'detalhe' : true;
  },
  schema: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, modelo: { type: 'string', enum: ['generica', 'blocos'] },
    gama: { type: 'number', minimum: 5, maximum: 30, description: 'kN/m³' },
    E: { type: 'number', minimum: 100, maximum: 40000, description: 'MPa' }, G: { type: 'number', minimum: 40, maximum: 20000, description: 'MPa' }, considerarG: { type: 'boolean' },
    fd: { type: 'number', minimum: 0.1, maximum: 30, description: 'MPa' }, ftd: { type: 'number', minimum: 0, maximum: 30 }, fvd: { type: 'number', minimum: 0, maximum: 30 },
    bloco: { type: 'string' }, blocoNome: { type: 'string', description: 'nome do bloco da biblioteca da obra, no lugar do id (usado ao importar da biblioteca do usuário)' }, argamassa: { type: 'number', minimum: 1, maximum: 40 }, graute: { type: 'number', minimum: 1, maximum: 60 },
    grauteamento: { type: 'string', enum: ['nenhum', 'parcial', 'total'] }, fpk: { type: 'number', minimum: 1, maximum: 60 }, armada: { type: 'boolean' },
    armadura: { type: 'object', additionalProperties: false, properties: { vertical: malha, horizontal: malha } },
    remover: { type: 'boolean' }, limpar: { type: 'array', items: { type: 'string', enum: [...CAMPOS_LIMPAR] }, minItems: 1 },
  } },
  validar(b, p) {
    const x = p.id ? b.tiposAlvenaria?.find((q) => q.id === p.id) : undefined;
    if (p.id && !x) return err('ALVENARIA_INEXISTENTE', `Tipo de alvenaria ${p.id} não existe.`);
    if (p.remover) return b.paredes?.some((w) => w.material === p.id) ? err('ALVENARIA_EM_USO', 'Há paredes com este tipo de alvenaria: troque o tipo delas antes de removê-lo.') : [];
    const modelo = p.modelo ?? x?.modelo;
    if (!modelo) return err('ALVENARIA_DADOS', 'Informe o modelo (generica ou blocos).');
    if (x && p.modelo && p.modelo !== x.modelo) return err('ALVENARIA_MODELO', 'O modelo do tipo não muda; crie outro tipo.');
    const n = { ...(x ?? {}), ...p } as Partial<TipoAlvenaria>;
    if (p.blocoNome && !p.bloco) { n.bloco = blocoDoPedido(b, p); if (!n.bloco) return err('BLOCO_INEXISTENTE', `O bloco “${p.blocoNome}” não existe na biblioteca da obra.`); }
    for (const k of p.limpar ?? []) delete n[k];
    if (n.gama === undefined) return err('ALVENARIA_DADOS', 'Informe o peso específico (gama, kN/m³).');
    if (modelo === 'generica') {
      if (!(n.E && n.E > 0) || !(n.fd && n.fd > 0)) return err('ALVENARIA_DADOS', 'A alvenaria genérica pede o módulo de elasticidade (E) e a resistência de cálculo à compressão (fd).');
      if (n.armada) return err('ALVENARIA_ARMADA', 'Só a alvenaria de blocos pode ser armada.');
    } else {
      if (!n.bloco || !b.blocos?.some((q) => q.id === n.bloco)) return err('BLOCO_INEXISTENTE', 'Informe um bloco da biblioteca da obra (bloco.tipo).');
      if (p.armadura && !n.armada) return err('ALVENARIA_ARMADA', 'A armadura bloqueada só vale com a alvenaria armada.');
    }
    const E = n.E ?? (modelo === 'blocos' ? resistenciaAlvenaria(n as TipoAlvenaria, blocoDe(b, n), opcoesEmUso(b.opcoes, perfilDe(b))).E : undefined);
    if (n.considerarG && E && n.G !== undefined && (n.G < 0.34 * E - 1e-9 || n.G > 0.5 * E + 1e-9)) return err('ALVENARIA_G', 'O módulo de cisalhamento G deve ficar entre 0,34·E e 0,5·E (ν entre 0 e 0,47).');
    return [];
  },
  aplicar(d, p) {
    d.tiposAlvenaria ??= [];
    if (p.remover) { d.tiposAlvenaria = d.tiposAlvenaria.filter((q) => q.id !== p.id); if (!d.tiposAlvenaria.length) delete d.tiposAlvenaria; return 'Tipo de alvenaria removido.'; }
    const { id, remover: _r, limpar, blocoNome, ...resto } = p;
    void _r;
    if (blocoNome && !resto.bloco) resto.bloco = blocoDoPedido(d as BuildingModel, { blocoNome });
    if (id) {
      const x = d.tiposAlvenaria.find((q) => q.id === id)!;
      for (const [k, v] of Object.entries(resto)) if (v !== undefined) (x as unknown as Record<string, unknown>)[k] = typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
      if (p.nome) x.nome = p.nome.trim();
      for (const k of limpar ?? []) delete x[k];
      if (!x.armada) { delete x.armadura; }
      return `Tipo de alvenaria ${x.nome} alterado.`;
    }
    const novo = { id: novoId(d, 'al'), nome: p.nome?.trim() || `Alvenaria ${d.tiposAlvenaria.length + 1}`, ...JSON.parse(JSON.stringify(resto)) } as TipoAlvenaria;
    d.tiposAlvenaria.push(novo);
    return `Tipo de alvenaria ${novo.nome} criado (${novo.modelo === 'blocos' ? 'blocos' : 'genérica'}).`;
  },
});

// ---------------------------------------------------------------- modulação das aberturas

registrar<{ parede: string; abertura?: string }>({
  nome: 'parede.modularAbertura',
  descricao: 'Ajusta as aberturas de uma parede de blocos à modulação do bloco (C5.11): início no meio bloco mais próximo contado do início do trecho, largura para cima ao múltiplo do meio bloco, peitoril ao múltiplo da altura mais próximo e topo para cima ao múltiplo da altura, sem peças cortadas. Sem `abertura`, ajusta todas.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['parede'], properties: { parede: { type: 'string' }, abertura: { type: 'string' } } },
  validar(b, p) {
    const w = b.paredes?.find((x) => x.id === p.parede);
    if (!w) return err('PAREDE_INEXISTENTE', `Parede ${p.parede} não existe.`);
    if (w.tipo !== 'blocos') return err('PAREDE_TIPO', `${w.nome} não é de blocos: só a parede de blocos tem modulação.`);
    if (!blocoDe(b, tipoAlvenariaDe(b, w))) return err('ALV_MATERIAL', `${w.nome} não tem bloco: defina o tipo de alvenaria.`);
    if (p.abertura && !w.aberturas?.some((a) => a.id === p.abertura)) return err('ABERTURA_INEXISTENTE', `Abertura ${p.abertura} não existe em ${w.nome}.`);
    if (!w.aberturas?.length) return err('SEM_ABERTURAS', `${w.nome} não tem aberturas.`);
    return [];
  },
  aplicar(d, p) {
    const w = d.paredes!.find((x) => x.id === p.parede)!, bl = blocoDe(d as BuildingModel, tipoAlvenariaDe(d as BuildingModel, w))!;
    let n = 0;
    for (const a of w.aberturas!) {
      if (p.abertura && a.id !== p.abertura) continue;
      const tr = trechoDaAbertura(w, a);
      if (!tr) continue;
      const m = ajustarAberturaModular(a, tr.s0, bl);
      if (m.s !== a.s || m.largura !== a.largura || m.peitoril !== a.peitoril || m.altura !== a.altura) { Object.assign(a, m); n++; }
    }
    return n ? `${n} abertura(s) de ${w.nome} ajustada(s) à modulação.` : `As aberturas de ${w.nome} já estão na modulação.`;
  },
});

// ---------------------------------------------------------------- verga

const armaduraVerga: JsonSchema = { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: {
  n: { type: 'integer', minimum: 1, maximum: 12 }, phi: { type: 'number', minimum: 5, maximum: 25 },
  estribo: { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', minimum: 4, maximum: 12.5 }, s: { type: 'number', minimum: 0.05, maximum: 0.6 } } },
  contraverga: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 12 }, phi: { type: 'number', minimum: 5, maximum: 25 } } },
} };

type VergaIn = { acao: 'editar' | 'copiar' | 'padrao' | 'limpar'; abertura?: string; de?: string; para?: string[]; tipo?: 'porta' | 'janela'; armadura?: ArmaduraVerga };
const acharAbertura = (b: BuildingModel, id: string) => { for (const w of b.paredes ?? []) { const a = w.aberturas?.find((x) => x.id === id); if (a) return { w, a }; } return undefined; };

registrar<VergaIn>({
  nome: 'verga.armadura',
  descricao: 'Armadura das vergas das aberturas das paredes de blocos (C5.16). `acao` "editar": grava e bloqueia a `armadura` { n, phi, estribo?, contraverga? } numa `abertura`; "copiar": copia a verga da abertura `de` para as aberturas `para`; "padrao": define a verga padrão do `tipo` (porta ou janela), aplicada às aberturas sem verga própria; "limpar": remove a verga da `abertura` (volta à calculada) ou, com `tipo` e sem abertura, o padrão do tipo. A armadura dada é verificada no recálculo contra a necessária.',
  risco: 'escrita', calculo: 'detalhe', mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['acao'], properties: {
    acao: { type: 'string', enum: ['editar', 'copiar', 'padrao', 'limpar'] }, abertura: { type: 'string' }, de: { type: 'string' }, para: { type: 'array', items: { type: 'string' }, minItems: 1 },
    tipo: { type: 'string', enum: ['porta', 'janela'] }, armadura: armaduraVerga,
  } },
  validar(b, p) {
    const deBlocos = (id: string) => { const x = acharAbertura(b, id); return x ? (x.w.tipo === 'blocos' ? [] : err('PAREDE_TIPO', `${x.w.nome} não é de blocos: só a parede de blocos tem verga armada.`)) : err('ABERTURA_INEXISTENTE', `Abertura ${id} não existe.`); };
    if (p.acao === 'editar') {
      if (!p.abertura || !p.armadura) return err('ARRANJO', 'Informe a abertura e a armadura.');
      return deBlocos(p.abertura);
    }
    if (p.acao === 'copiar') {
      if (!p.de || !p.para?.length) return err('ARRANJO', 'Informe a abertura de origem (`de`) e as de destino (`para`).');
      const o = acharAbertura(b, p.de);
      if (!o) return err('ABERTURA_INEXISTENTE', `Abertura ${p.de} não existe.`);
      if (!o.a.verga) return err('SEM_ARMADURA', `A abertura ${p.de} não tem verga própria para copiar.`);
      for (const id of p.para) { const e = deBlocos(id); if (e.length) return e; }
      return [];
    }
    if (p.acao === 'padrao') return p.tipo && p.armadura ? [] : err('ARRANJO', 'Informe o tipo (porta ou janela) e a armadura.');
    if (p.abertura) return acharAbertura(b, p.abertura) ? [] : err('ABERTURA_INEXISTENTE', `Abertura ${p.abertura} não existe.`);
    return p.tipo ? [] : err('ARRANJO', 'Informe a abertura ou o tipo.');
  },
  aplicar(d, p) {
    const b = d as BuildingModel, ab = (id: string) => { const x = acharAbertura(b, id)!; return d.paredes!.find((w) => w.id === x.w.id)!.aberturas!.find((y) => y.id === id)!; };
    if (p.acao === 'editar') { ab(p.abertura!).verga = JSON.parse(JSON.stringify(p.armadura!)); return 'Verga da abertura editada e bloqueada.'; }
    if (p.acao === 'copiar') {
      const o = acharAbertura(b, p.de!)!.a.verga!;
      for (const id of p.para!) ab(id).verga = JSON.parse(JSON.stringify(o));
      return `Verga copiada para ${p.para!.length} abertura(s).`;
    }
    if (p.acao === 'padrao') { d.vergasPadrao = { ...(d.vergasPadrao ?? {}), [p.tipo!]: JSON.parse(JSON.stringify(p.armadura!)) }; return `Verga padrão de ${p.tipo === 'porta' ? 'portas' : 'janelas'} definida.`; }
    if (p.abertura) { delete ab(p.abertura).verga; return 'Verga da abertura removida (volta à calculada).'; }
    if (d.vergasPadrao) { delete d.vergasPadrao[p.tipo!]; if (!d.vergasPadrao.porta && !d.vergasPadrao.janela) delete d.vergasPadrao; }
    return `Padrão de verga de ${p.tipo === 'porta' ? 'portas' : 'janelas'} removido.`;
  },
});
