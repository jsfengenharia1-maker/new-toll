// Comandos da armadura das escadas (frente E4d): editar e bloquear uma família de barras de um trecho (como a R2 das lajes: o recálculo
// só verifica a armadura bloqueada) e os dados próprios da escada (tabela de armadura, ancoragem em viga chata, profundidade da fundação).
// Não mudam o cálculo da casca (`calculo: 'detalhe'`): só o dimensionamento e o detalhamento são refeitos.
import { tabelasDoTipo } from '../building/tabelasArmadura';
import type { BloqueioEscada, FamiliaEscada } from '../building/escadas';
import { err } from './escadas';
import { registrar } from './registry';

const FAMILIAS: FamiliaEscada[] = ['infL', 'infT', 'supIni', 'supFim', 'supT'];
export const BITOLAS_ESCADA = [5, 6.3, 8, 10, 12.5, 16, 20];

interface ParamsArmadura { id: string; lance?: number; trecho?: string; familia?: FamiliaEscada; phi?: number; s?: number; limpar?: boolean }
registrar<ParamsArmadura>({
  nome: 'escada.armadura',
  descricao: 'Edita e bloqueia a armadura da escada (E4d): `id` da escada, `lance` (número na escada, 1...), `trecho` (L1, L2... lances inclinados; P1... patamares), `familia` (infL inferior longitudinal, infT inferior transversal, supIni e supFim superiores longitudinais, supT superior transversal), `phi` (mm) e `s` (espaçamento, m). O recálculo só verifica a armadura bloqueada. `limpar` remove os bloqueios (de um `lance`, ou de toda a escada).',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, lance: { type: 'integer', minimum: 1 }, trecho: { type: 'string' }, familia: { type: 'string', enum: FAMILIAS },
    phi: { type: 'number', enum: BITOLAS_ESCADA }, s: { type: 'number', minimum: 0.05, maximum: 0.33 }, limpar: { type: 'boolean' },
  } },
  validar(b, p) {
    if (!b.escadas?.some((e) => e.id === p.id)) return err('ESCADA_INEXISTENTE', `Escada ${p.id} não existe.`);
    if (p.limpar) return [];
    if (!p.lance || !p.trecho || !p.familia || !p.phi || !p.s) return err('SEM_EDICAO', 'Informe lance, trecho, familia, phi e s (ou limpar).');
    if (!/^[LP][0-9]+$/.test(p.trecho)) return err('TRECHO_INVALIDO', 'Trecho no formato L1, L2... (lances) ou P1... (patamares).');
    return [];
  },
  aplicar(d, p) {
    const e = d.escadas!.find((x) => x.id === p.id)!;
    if (p.limpar) {
      const n = e.armadura?.bloqueadas?.length ?? 0;
      if (e.armadura?.bloqueadas) {
        e.armadura.bloqueadas = p.lance ? e.armadura.bloqueadas.filter((x) => x.lance !== p.lance) : [];
        if (!e.armadura.bloqueadas.length) delete e.armadura.bloqueadas;
        if (!Object.keys(e.armadura).length) delete e.armadura;
      }
      return n ? `Armadura da escada ${e.nome} desbloqueada.` : 'Nenhuma armadura bloqueada.';
    }
    const novo: BloqueioEscada = { lance: p.lance!, trecho: p.trecho!, familia: p.familia!, phi: p.phi!, s: p.s! };
    e.armadura ??= {};
    e.armadura.bloqueadas = [...(e.armadura.bloqueadas ?? []).filter((x) => !(x.lance === novo.lance && x.trecho === novo.trecho && x.familia === novo.familia)), novo];
    return `Armadura ${novo.familia} do trecho ${novo.trecho} (lance ${novo.lance}) da escada ${e.nome} editada e bloqueada.`;
  },
});

interface ParamsOpcoes { id: string; tabela?: string; ancoragemViga?: number; profundidadeFundacao?: number; limpar?: ('tabela' | 'ancoragemViga' | 'profundidadeFundacao')[] }
registrar<ParamsOpcoes>({
  nome: 'escada.opcoesArmadura',
  descricao: 'Dados próprios da armadura da escada (E4d), no lugar das opções gerais: `tabela` (id de uma tabela de armadura de lajes), `ancoragemViga` (cm disponíveis para ancorar as esperas em viga chata; a largura da viga prevalece se maior) e `profundidadeFundacao` (cm, quando não há elemento de fundação sob o início do lance). `limpar` volta ao padrão das opções.',
  risco: 'escrita',
  calculo: 'detalhe',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, tabela: { type: 'string' }, ancoragemViga: { type: 'number', minimum: 0, maximum: 100 }, profundidadeFundacao: { type: 'number', minimum: 10, maximum: 200 },
    limpar: { type: 'array', items: { type: 'string', enum: ['tabela', 'ancoragemViga', 'profundidadeFundacao'] } },
  } },
  validar(b, p) {
    if (!b.escadas?.some((e) => e.id === p.id)) return err('ESCADA_INEXISTENTE', `Escada ${p.id} não existe.`);
    if (p.tabela !== undefined && !tabelasDoTipo(b, 'lajes').some((t) => t.id === p.tabela)) return err('TABELA_INEXISTENTE', `Tabela de lajes ${p.tabela} não existe.`);
    const { id: _id, limpar, ...resto } = p;
    return Object.keys(resto).length || limpar?.length ? [] : err('SEM_EDICAO', 'Informe ao menos um campo a alterar.');
  },
  aplicar(d, p) {
    const e = d.escadas!.find((x) => x.id === p.id)!;
    e.armadura ??= {};
    if (p.tabela !== undefined) e.armadura.tabela = p.tabela;
    if (p.ancoragemViga !== undefined) e.armadura.ancoragemViga = p.ancoragemViga;
    if (p.profundidadeFundacao !== undefined) e.armadura.profundidadeFundacao = p.profundidadeFundacao;
    for (const c of p.limpar ?? []) delete e.armadura[c];
    if (!Object.keys(e.armadura).length) delete e.armadura;
    return `Dados da armadura da escada ${e.nome} alterados.`;
  },
});
