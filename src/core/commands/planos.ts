// Comandos dos planos inclinados, rampas e panos a definir (frente E3f): criar, editar e remover planos do grupo (três pontos,
// reta horizontal + inclinação, linha de máxima declividade), atribuir o plano a panos e vigas, corrigir as vigas incoerentes
// copiando a inclinação do pano (C7.70) e trocar panos por pano a definir com espessura, desnível e inclinação (C7.15, C7.16).
import type { Draft } from 'immer';
import { coeficientesPlano, inclinacaoPercentual, planoSugeridoDaViga } from '../building/planos';
import type { BuildingModel, DefinicaoPlano, Plano } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const r6 = (v: number) => +v.toFixed(6);
const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

const defSchema = {
  tipo: { type: 'string', enum: ['tresPontos', 'retaHorizontal', 'maximaDeclividade'], description: 'três pontos cotados; reta horizontal + inclinação perpendicular; linha de máxima declividade + desnível do 1º ponto + inclinação' },
  pontos: { type: 'array', items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 3 }, minItems: 2, maxItems: 3, description: 'tresPontos: três [x, y, desnível]; demais: dois [x, y] (m)' },
  desnivel: { type: 'number', minimum: -50, maximum: 50, description: 'desnível (m) da reta horizontal ou do 1º ponto da máxima declividade' },
  inclinacao: { type: 'number', minimum: -1000, maximum: 1000, description: 'inclinação (positiva sobe à esquerda de p1→p2 na reta horizontal; sobe de p1 a p2 na máxima declividade)' },
  unidade: { type: 'string', enum: ['%', 'graus'], default: '%', description: 'unidade da inclinação' },
} as const;
type DefParam = { tipo?: DefinicaoPlano['tipo']; pontos?: number[][]; desnivel?: number; inclinacao?: number; unidade?: '%' | 'graus' };

/** Monta a definição a partir dos parâmetros (sobre a anterior, na edição); devolve um texto de erro se faltar algo. */
function montarDef(p: DefParam, ant?: DefinicaoPlano): DefinicaoPlano | string {
  const tipo = p.tipo ?? ant?.tipo;
  if (!tipo) return 'Informe o tipo de definição do plano.';
  const mesmo = ant && ant.tipo === tipo;
  if (tipo === 'tresPontos') {
    const ps = p.pontos ?? (mesmo ? ant!.pontos : undefined);
    if (!ps || ps.length !== 3 || ps.some((q) => q.length !== 3)) return 'Três pontos [x, y, desnível] definem o plano.';
    return { tipo, pontos: ps.map((q) => [r6(q[0]), r6(q[1]), r6(q[2])]) as [[number, number, number], [number, number, number], [number, number, number]] };
  }
  const a = mesmo ? (ant as Extract<DefinicaoPlano, { desnivel: number }>) : undefined;
  const ps = p.pontos ?? a?.pontos, desnivel = p.desnivel ?? a?.desnivel ?? 0;
  const inc = p.inclinacao !== undefined ? inclinacaoPercentual(p.inclinacao, p.unidade ?? '%') : a?.inclinacao;
  if (!ps || ps.length !== 2) return 'Dois pontos [x, y] definem a reta (horizontal ou de máxima declividade).';
  if (inc === undefined) return 'Informe a inclinação.';
  if (p.unidade === 'graus' && p.inclinacao !== undefined && Math.abs(p.inclinacao) >= 89) return 'Inclinação em graus abaixo de 89°.';
  return { tipo, pontos: ps.map((q) => [r6(q[0]), r6(q[1])]) as [[number, number], [number, number]], desnivel: r6(desnivel), inclinacao: r6(inc) };
}
const textoPlano = (pl: Plano) => { const c = coeficientesPlano(pl.def)!; return `${pl.nome} (${fmt(Math.hypot(c.a, c.b) * 100)} %)`; };

// ---------------------------------------------------------------- plano.criar

registrar<DefParam & { grupo: string; nome?: string; cor?: number }>({
  nome: 'plano.criar',
  descricao: 'Cria um plano inclinado no grupo (E3f, C7.61–C7.65): por três pontos com o desnível de cada em relação ao pavimento (`tipo: tresPontos`, pontos [x, y, desnível]); por uma reta horizontal (dois pontos de mesma cota, `desnivel`) e a inclinação perpendicular a ela, subindo à esquerda de p1→p2 (`retaHorizontal`); ou pela linha de máxima declividade (dois pontos), o desnível do primeiro e a inclinação, subindo de p1 para p2 (`maximaDeclividade`). Inclinação em % (padrão) ou em graus (`unidade`). O plano só vale para os panos e vigas a que for atribuído (`plano.atribuir`).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'tipo', 'pontos'], properties: { grupo: { type: 'string' }, nome: { type: 'string', minLength: 1 }, cor: { type: 'integer', minimum: 0, maximum: 7, description: 'índice da cor (paleta --plano-*)' }, ...defSchema } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const def = montarDef(p);
    if (typeof def === 'string') return err('PLANO_INVALIDO', def);
    return coeficientesPlano(def) ? [] : err('PLANO_INVALIDO', 'Pontos alinhados ou coincidentes em planta: o plano fica indefinido.');
  },
  aplicar(d, p) {
    const def = montarDef(p) as DefinicaoPlano, n = (d.planos ?? []).filter((x) => x.grupo === p.grupo).length + 1;
    const pl: Plano = { id: novoId(d, 'pl'), nome: p.nome ?? `Plano ${n}`, grupo: p.grupo, def, ...(p.cor !== undefined ? { cor: p.cor } : { cor: (n - 1) % 8 }) };
    (d.planos ??= []).push(pl);
    return `Plano criado: ${textoPlano(pl)}.`;
  },
});

// ---------------------------------------------------------------- plano.editar

registrar<DefParam & { id: string; nome?: string; cor?: number }>({
  nome: 'plano.editar',
  descricao: 'Edita o plano (E3f, C7.67, C7.68): nome, cor e definição (tipo, pontos, desnível, inclinação), sobre os valores atuais; arrastar pontos na planta e reescrever cotas chegam aqui. Os panos e vigas do plano passam à nova cota.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, cor: { type: 'integer', minimum: 0, maximum: 7 }, ...defSchema } },
  validar(b, p) {
    const pl = (b.planos ?? []).find((x) => x.id === p.id);
    if (!pl) return err('PLANO_INEXISTENTE', `Plano ${p.id} não existe.`);
    const def = montarDef(p, pl.def);
    if (typeof def === 'string') return err('PLANO_INVALIDO', def, [pl.id]);
    return coeficientesPlano(def) ? [] : err('PLANO_INVALIDO', 'Pontos alinhados ou coincidentes em planta: o plano fica indefinido.', [pl.id]);
  },
  aplicar(d, p) {
    const pl = d.planos!.find((x) => x.id === p.id)!;
    pl.def = montarDef(p, pl.def as DefinicaoPlano) as DefinicaoPlano;
    if (p.nome) pl.nome = p.nome;
    if (p.cor !== undefined) pl.cor = p.cor;
    return `Plano editado: ${textoPlano(pl as Plano)}.`;
  },
});

// ---------------------------------------------------------------- plano.remover

registrar<{ ids: string[] }>({
  nome: 'plano.remover',
  descricao: 'Remove planos (E3f); os panos e vigas que os usavam voltam à horizontal (com o desnível próprio).',
  risco: 'destrutivo',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) { const sem = p.ids.filter((id) => !(b.planos ?? []).some((x) => x.id === id)); return sem.length ? err('PLANO_INEXISTENTE', `Plano(s) inexistente(s): ${sem.join(', ')}.`) : []; },
  aplicar(d, p) {
    const s = new Set(p.ids);
    let n = 0;
    for (const e of [...d.lajes, ...d.vigas]) if (e.plano && s.has(e.plano)) { delete e.plano; n++; }
    d.planos = d.planos!.filter((x) => !s.has(x.id));
    if (!d.planos.length) delete d.planos;
    return `${p.ids.length} plano(s) removido(s)${n ? `; ${n} elemento(s) voltam à horizontal` : ''}.`;
  },
});

// ---------------------------------------------------------------- plano.atribuir

registrar<{ plano?: string; lajes?: string[]; vigas?: string[] }>({
  nome: 'plano.atribuir',
  descricao: 'Atribui o plano a panos e vigas do mesmo grupo (E3f, C7.62; os panos passam à cor do plano), ou o retira (sem `plano`: voltam à horizontal com o desnível próprio). Fluxo recomendado (C7.60): lançar tudo na horizontal e atribuir depois; as vigas do contorno incoerentes aparecem em vermelho (`plano.corrigirVigas`).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { plano: { type: 'string', description: 'id do plano; ausente = volta à horizontal' }, lajes: ids, vigas: ids } },
  validar(b, p) {
    if (!p.lajes?.length && !p.vigas?.length) return err('SEM_ELEMENTOS', 'Informe lajes ou vigas.');
    const pl = p.plano === undefined ? undefined : (b.planos ?? []).find((x) => x.id === p.plano);
    if (p.plano !== undefined && !pl) return err('PLANO_INEXISTENTE', `Plano ${p.plano} não existe.`);
    for (const id of p.lajes ?? []) { const l = b.lajes.find((x) => x.id === id); if (!l) return err('LAJE_INEXISTENTE', `Laje ${id} não existe.`); if (pl && l.grupo !== pl.grupo) return err('PLANO_GRUPO', `${l.nome} é de outro grupo que o plano ${pl.nome}.`, [l.id]); }
    for (const id of p.vigas ?? []) { const v = b.vigas.find((x) => x.id === id); if (!v) return err('VIGA_INEXISTENTE', `Viga ${id} não existe.`); if (pl && v.grupo !== pl.grupo) return err('PLANO_GRUPO', `${v.nome} é de outro grupo que o plano ${pl.nome}.`, [v.id]); }
    return [];
  },
  aplicar(d, p) {
    for (const e of [...d.lajes.filter((l) => p.lajes?.includes(l.id)), ...d.vigas.filter((v) => p.vigas?.includes(v.id))]) { if (p.plano === undefined) delete e.plano; else e.plano = p.plano; }
    const n = (p.lajes?.length ?? 0) + (p.vigas?.length ?? 0);
    return p.plano === undefined ? `${n} elemento(s) de volta à horizontal.` : `Plano ${d.planos!.find((x) => x.id === p.plano)!.nome} atribuído a ${n} elemento(s).`;
  },
});

// ---------------------------------------------------------------- plano.corrigirVigas

registrar<{ vigas: string[] }>({
  nome: 'plano.corrigirVigas',
  descricao: 'Corrige vigas incoerentes com o pano inclinado adjacente (E3f, C7.70: correção por clique): cada viga recebe o plano do pano que ela borda (na cumeeira, o que deixa a viga coerente com os dois panos).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['vigas'], properties: { vigas: ids } },
  validar(b, p) {
    for (const id of p.vigas) {
      const v = b.vigas.find((x) => x.id === id);
      if (!v) return err('VIGA_INEXISTENTE', `Viga ${id} não existe.`);
      if (!planoSugeridoDaViga(b, v)) return err('PLANO_SEM_PANO', `${v.nome} não borda pano inclinado.`, [v.id]);
    }
    return [];
  },
  aplicar(d, p) {
    const b = d as unknown as BuildingModel, nomes: string[] = [];
    for (const id of p.vigas) { const v = d.vigas.find((x) => x.id === id)!, pl = planoSugeridoDaViga(b, v as never)!; v.plano = pl; nomes.push(v.nome); }
    return `Inclinação do pano copiada para ${nomes.join(', ')}.`;
  },
});

// ---------------------------------------------------------------- laje.aDefinir

registrar<{ ids: string[]; espessura?: number; nivel?: number; plano?: string }>({
  nome: 'laje.aDefinir',
  descricao: 'Troca panos já definidos por pano a definir (E3f, C7.15, C7.16), com espessura (m), desnível (m) e plano de inclinação opcionais; a espessura passa às vigas chatas do contorno. Para voltar a um tipo de laje use `laje.atribuir`; para abertura, `laje.remover` (e `laje.criar { definir }` faz o contrário).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids, espessura: { type: 'number', minimum: 0.05, maximum: 1.5 }, nivel: { type: 'number', minimum: -10, maximum: 10 }, plano: { type: 'string' } } },
  validar(b, p) {
    for (const id of p.ids) {
      const l = b.lajes.find((x) => x.id === id);
      if (!l) return err('LAJE_INEXISTENTE', `Laje ${id} não existe.`);
      if (p.plano) { const pl = (b.planos ?? []).find((x) => x.id === p.plano); if (!pl) return err('PLANO_INEXISTENTE', `Plano ${p.plano} não existe.`); if (pl.grupo !== l.grupo) return err('PLANO_GRUPO', `${l.nome} é de outro grupo que o plano ${pl.nome}.`, [l.id]); }
    }
    return [];
  },
  aplicar(d, p) {
    const h = p.espessura ?? 0.1;
    let nv = 0;
    for (const id of p.ids) {
      const l = d.lajes.find((x) => x.id === id)!;
      const limpo = { id: l.id, nome: l.nome, grupo: l.grupo, contorno: l.contorno, ...(l.furos ? { furos: l.furos } : {}), ...(l.furosBorda ? { furosBorda: l.furosBorda } : {}), ...(l.origemLancamento ? { origemLancamento: l.origemLancamento } : {}) };
      for (const k of Object.keys(l)) delete (l as Record<string, unknown>)[k];
      Object.assign(l, limpo, { tipo: { tipo: 'macica', h }, definir: true });
      if (p.espessura !== undefined) l.espessuraDefinir = p.espessura;
      if (p.nivel !== undefined) l.nivel = p.nivel;
      if (p.plano) l.plano = p.plano;
      // vigas chatas do contorno: altura = espessura do pano (C7.16)
      if (p.espessura !== undefined) for (const v of d.vigas) if (v.grupo === l.grupo && v.chata && v.pontos.every((q) => (l.contorno as [number, number][]).some((c, i, cc) => { const z = cc[(i + 1) % cc.length], dx = z[0] - c[0], dy = z[1] - c[1], L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, ((q[0] - c[0]) * dx + (q[1] - c[1]) * dy) / L2)) : 0; return Math.hypot(c[0] + u * dx - q[0], c[1] + u * dy - q[1]) < 0.02; }))) { if (v.secao.h !== h) { v.secao.h = h; nv++; } }
    }
    return `${p.ids.length} pano(s) a definir${p.espessura !== undefined ? ` com ${fmt(h * 100, 0)} cm` : ''}${nv ? `; ${nv} viga(s) chata(s) com a espessura do pano` : ''}.`;
  },
});
