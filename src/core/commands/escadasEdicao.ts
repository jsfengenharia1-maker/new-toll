// Comandos de edição das escadas (frente E4b): editar, mover, girar, remover, copiar de outra escada, duplicar lance e
// biblioteca de tipos de lance (desbloquear, importar). Todos `mcp: false`.
import { nomeSequencial, type Escada, type LanceEscada } from '../building/escadas';
import { girarEscada, lerBibliotecaTiposLance, tiposLanceIguais, type TipoLanceExportado } from '../building/escadasEdicao';
import { opcoesEmUso, perfilDe } from '../building/opcoes';
import { copia, dadosSchema, err, gravarDados, limpo, novoId, num, tipoSchema, type CamposTipo, type DadosComuns } from './escadas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const ponto: JsonSchema = { type: 'array', items: num, minItems: 2, maxItems: 2 };
const finito = (...v: (number | undefined)[]) => v.every((x) => x === undefined || Number.isFinite(x));
const idsSchema: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const faltando = (b: { escadas?: Escada[] }, ids: string[]) => ids.filter((i) => !b.escadas?.some((e) => e.id === i));

// ---------------------------------------------------------------- escada.editar

interface ParamsEditar extends DadosComuns { id: string; origem?: [number, number]; angulo?: number; limpar?: ('revestimento' | 'sobrecarga')[] }
registrar<ParamsEditar>({
  nome: 'escada.editar',
  descricao: 'Edita a escada clicada (E4b): dados comuns como em `escada.dados` mais a posição (`origem` e `angulo` em graus).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, origem: ponto, angulo: num, ...dadosSchema, limpar: { type: 'array', items: { type: 'string', enum: ['revestimento', 'sobrecarga'] } } } },
  validar(b, p) {
    if (!b.escadas?.some((e) => e.id === p.id)) return err('ESCADA_INEXISTENTE', `Escada ${p.id} não existe.`);
    if (!finito(p.angulo, ...(p.origem ?? []))) return err('VALOR_INVALIDO', 'Origem e ângulo devem ser números.');
    const { id: _i, limpar, ...resto } = p;
    return Object.keys(resto).length || limpar?.length ? [] : err('SEM_EDICAO', 'Informe ao menos um campo a alterar.');
  },
  aplicar(d, p) {
    const e = d.escadas!.find((x) => x.id === p.id)!;
    gravarDados(e, p);
    if (p.origem) e.origem = [p.origem[0], p.origem[1]];
    if (p.angulo !== undefined) e.angulo = p.angulo;
    for (const c of p.limpar ?? []) delete e[c];
    return `Escada ${e.nome} editada.`;
  },
});

// ---------------------------------------------------------------- mover, girar, remover

registrar<{ ids: string[]; dx: number; dy: number }>({
  nome: 'escada.mover',
  descricao: 'Move escadas (E4b) por um deslocamento dx, dy em metros (a interface calcula do ponto de referência ao ponto de destino, com as capturas do gabarito).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids: idsSchema, dx: num, dy: num } },
  validar(b, p) {
    const f = faltando(b, p.ids);
    if (f.length) return err('ESCADA_INEXISTENTE', `Escada(s) inexistente(s): ${f.join(', ')}.`, f);
    if (!finito(p.dx, p.dy) || (p.dx === 0 && p.dy === 0)) return err('SEM_EDICAO', 'Informe um deslocamento diferente de zero.');
    return [];
  },
  aplicar(d, p) {
    for (const e of d.escadas!.filter((x) => p.ids.includes(x.id))) e.origem = [e.origem[0] + p.dx, e.origem[1] + p.dy];
    return `${p.ids.length} escada(s) movida(s).`;
  },
});

registrar<{ ids: string[]; angulo: number; centro?: [number, number] }>({
  nome: 'escada.girar',
  descricao: 'Gira escadas (E4b) de `angulo` graus (anti-horário) em torno do início do lance (a origem de cada uma) ou de `centro`. A interface obtém o ângulo digitado ou de dois pontos.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'angulo'], properties: { ids: idsSchema, angulo: num, centro: ponto } },
  validar(b, p) {
    const f = faltando(b, p.ids);
    if (f.length) return err('ESCADA_INEXISTENTE', `Escada(s) inexistente(s): ${f.join(', ')}.`, f);
    if (!finito(p.angulo, ...(p.centro ?? [])) || p.angulo % 360 === 0) return err('SEM_EDICAO', 'Informe um ângulo de giro diferente de zero.');
    return [];
  },
  aplicar(d, p) {
    for (const e of d.escadas!.filter((x) => p.ids.includes(x.id))) {
      const n = girarEscada(e, p.angulo, p.centro);
      e.origem = n.origem; e.angulo = n.angulo;
    }
    return `${p.ids.length} escada(s) girada(s) de ${p.angulo}°.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'escada.remover',
  descricao: 'Remove escadas (E4b), uma ou várias; os tipos de lance ficam na obra.',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: idsSchema } },
  validar(b, p) {
    const f = faltando(b, p.ids);
    return f.length ? err('ESCADA_INEXISTENTE', `Escada(s) inexistente(s): ${f.join(', ')}.`, f) : [];
  },
  aplicar(d, p) {
    d.escadas = d.escadas!.filter((e) => !p.ids.includes(e.id));
    if (!d.escadas.length) delete d.escadas;
    return `${p.ids.length} escada(s) removida(s).`;
  },
});

// ---------------------------------------------------------------- escada.copiarDe, lance.duplicar

interface ParamsCopiar extends DadosComuns { de: string; id?: string; grupo?: string; origem?: [number, number]; dx?: number; dy?: number; angulo?: number }
registrar<ParamsCopiar>({
  nome: 'escada.copiarDe',
  descricao: 'Cria uma escada a partir dos dados e lances de outra (E4b), para ajustar depois: `origem` (ou `dx`, `dy` sobre a origem da copiada), `angulo`, `grupo` e qualquer dado comum (ex.: `giro` trocado para a escada simétrica). Nome novo em sequência.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['de'], properties: { de: { type: 'string' }, id: { type: 'string' }, grupo: { type: 'string' }, origem: ponto, dx: num, dy: num, angulo: num, ...dadosSchema } },
  validar(b, p) {
    if (!b.escadas?.some((e) => e.id === p.de)) return err('ESCADA_INEXISTENTE', `Escada ${p.de} não existe.`);
    if (p.id && b.escadas.some((e) => e.id === p.id)) return err('ESCADA_EXISTENTE', `Já existe a escada ${p.id}.`);
    if (p.grupo && !b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    if (!finito(p.dx, p.dy, p.angulo, ...(p.origem ?? []))) return err('VALOR_INVALIDO', 'Posição e ângulo devem ser números.');
    return [];
  },
  aplicar(d, p) {
    const o = d.escadas!.find((x) => x.id === p.de)!;
    const { de: _d, id, grupo, origem, dx, dy, angulo, ...dados } = p;
    const novo: Escada = copia(o as Escada);
    novo.id = id ?? novoId(d, 'es');
    novo.nome = nomeSequencial(d as never, o.nome);
    novo.origem = origem ? [origem[0], origem[1]] : [o.origem[0] + (dx ?? 0), o.origem[1] + (dy ?? 0)];
    if (angulo !== undefined) novo.angulo = angulo;
    if (grupo && grupo !== o.grupo) {
      novo.grupo = grupo;
      novo.lances = novo.lances.map((l) => { const { pavimento: _p, cotaInicial: _c, ...resto } = l; return resto; });
    }
    novo.lances = novo.lances.map((l) => ({ ...l, id: novoId(d, 'ln') }));
    gravarDados(novo as never, dados);
    d.escadas!.push(novo);
    return `Escada ${novo.nome} copiada de ${o.nome}.`;
  },
});

registrar<{ escada: string; lance: string; vezes?: number }>({
  nome: 'lance.duplicar',
  descricao: 'Duplica um lance da escada (E4b); o novo lance vai para o topo da lista (fisicamente acima dos demais), com o mesmo tipo e apoios e partindo do pavimento seguinte ao último lance.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['escada', 'lance'], properties: { escada: { type: 'string' }, lance: { type: 'string' }, vezes: { type: 'integer', minimum: 1, maximum: 50 } } },
  validar(b, p) {
    const e = b.escadas?.find((x) => x.id === p.escada);
    if (!e) return err('ESCADA_INEXISTENTE', `Escada ${p.escada} não existe.`);
    return e.lances.some((l) => l.id === p.lance) ? [] : err('LANCE_INEXISTENTE', `Lance ${p.lance} não existe na escada ${e.nome}.`);
  },
  aplicar(d, p) {
    const e = d.escadas!.find((x) => x.id === p.escada)!, o = e.lances.find((l) => l.id === p.lance)!;
    for (let i = 0; i < (p.vezes ?? 1); i++) {
      const { pavimento: _p, cotaInicial: _c, ...resto } = copia(o) as LanceEscada;
      e.lances.push({ ...resto, id: novoId(d, 'ln') });
    }
    return `Lance duplicado no topo da escada ${e.nome}.`;
  },
});

// ---------------------------------------------------------------- biblioteca de tipos de lance

registrar<{ id: string; desbloquear?: boolean }>({
  nome: 'tipoLance.desbloquear',
  descricao: 'Desbloqueia (padrão) ou volta a bloquear a edição de um tipo de lance em uso (E4b).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, desbloquear: { type: 'boolean' } } },
  validar: (b, p) => (b.tiposLance?.some((t) => t.id === p.id) ? [] : err('TIPO_LANCE_INEXISTENTE', `Tipo de lance ${p.id} não existe na obra.`)),
  aplicar(d, p) {
    const t = d.tiposLance!.find((x) => x.id === p.id)!;
    if (p.desbloquear === false) delete t.desbloqueado; else t.desbloqueado = true;
    return `Tipo de lance "${t.nome}" ${p.desbloquear === false ? 'bloqueado' : 'desbloqueado'} para edição.`;
  },
});

registrar<{ tipos: CamposTipo[] }>({
  nome: 'tipoLance.importar',
  descricao: 'Importa tipos de lance de outra obra ou do `.json` da biblioteca do usuário (E4b). Tipo idêntico a um já existente na obra não é duplicado; todos são validados e o conjunto é recusado se algum for inválido.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['tipos'], properties: { tipos: { type: 'array', minItems: 1, items: tipoSchema } } },
  validar(b, p) {
    const o = opcoesEmUso(b.opcoes, perfilDe(b));
    const r = lerBibliotecaTiposLance({ formato: 'statikos-tipos-lance', versao: 1, tipos: p.tipos }, o);
    return r.erros.length ? err('TIPO_LANCE_INVALIDO', r.erros.join(' ')) : [];
  },
  aplicar(d, p) {
    d.tiposLance ??= [];
    let novos = 0;
    for (const t of p.tipos) {
      if (d.tiposLance.some((x) => tiposLanceIguais(x as TipoLanceExportado, t as TipoLanceExportado))) continue;
      d.tiposLance.push({ ...limpo(t), id: novoId(d, 'tl') });
      novos++;
    }
    return `${novos} tipo(s) de lance importado(s); ${p.tipos.length - novos} já existia(m).`;
  },
});
