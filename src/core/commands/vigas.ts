// Comandos de vigas: traçar, editar, dividir, unir, prolongar/aparar, mover, copiar (no grupo e para outros grupos),
// remover, renumerar e ajustar às faces dos pilares.
import type { Draft } from 'immer';
import { centroPilar, comprimentoPolilinha, geometriaViga, pavimentosDoGrupo, secaoNoLance, type Alinhamento, type BuildingModel, type Pilar, type Viga, type Vinculo } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { ajusteFaceTrecho, alinhamentoNaFace, pilaresQueChegam, proximaViga, TOL_FACE, type LadoFace } from '../building/vigas';
import { atribuirTabela, tabelaInexistente } from './tabelas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

type P = [number, number];
const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>) => `v_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const secaoSchema: JsonSchema = { type: 'object', additionalProperties: false, required: ['b', 'h'], properties: { b: { type: 'number', exclusiveMinimum: 0, maximum: 3, description: 'largura (m)' }, h: { type: 'number', exclusiveMinimum: 0, maximum: 5, description: 'altura (m)' } } };
const alinSchema: JsonSchema = { type: 'string', enum: ['esq', 'centro', 'dir'], description: 'Linha traçada = face esquerda, eixo ou face direita (olhando do 1º ao último ponto)' };
const coefSchema: JsonSchema = { type: 'number', minimum: 0, maximum: 1, description: 'coeficiente de engaste (0 = rótula, 1 = engaste)' };
const vincSchema: JsonSchema = { type: 'string', enum: ['auto', 'engaste', 'articulado'] };
const r6 = (v: number) => +v.toFixed(6);
const viga = (b: BuildingModel, id: string) => b.vigas.find((v) => v.id === id);
const faltam = (b: BuildingModel, l: string[]) => l.filter((id) => !viga(b, id));

/** Remove pontos repetidos e colineares intermediários. */
function limpar(pts: P[]): P[] {
  const out: P[] = [];
  for (const p of pts) if (!out.length || Math.hypot(p[0] - out[out.length - 1][0], p[1] - out[out.length - 1][1]) > 1e-6) out.push([r6(p[0]), r6(p[1])]);
  for (let i = out.length - 2; i >= 1; i--) {
    const a = out[i - 1], m = out[i], z = out[i + 1];
    if (Math.abs((m[0] - a[0]) * (z[1] - a[1]) - (m[1] - a[1]) * (z[0] - a[0])) < 1e-9 && (m[0] - a[0]) * (z[0] - m[0]) + (m[1] - a[1]) * (z[1] - m[1]) > 0) out.splice(i, 1);
  }
  return out;
}

registrar<{ grupo: string; pontos: P[]; secao: { b: number; h: number }; alinhamento: Alinhamento; invertida: boolean; nome?: string }>({
  nome: 'viga.tracar',
  descricao: 'Traça uma viga na planta do grupo por uma polilinha (m). `alinhamento` diz se a linha traçada é o eixo ou uma face. Nome automático V<n> do grupo.',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'pontos', 'secao'], properties: {
    grupo: { type: 'string' }, pontos: { type: 'array', items: ponto, minItems: 2 }, secao: secaoSchema,
    alinhamento: { ...alinSchema, default: 'centro' }, invertida: { type: 'boolean', default: false }, nome: { type: 'string', minLength: 1 },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    return limpar(p.pontos).length < 2 ? err('VIGA_DEGENERADA', 'A viga precisa de dois pontos distintos.') : [];
  },
  aplicar(d, p) {
    const nome = p.nome?.trim() || `V${proximaViga(d as BuildingModel, p.grupo)}`;
    d.vigas.push({ id: novoId(d), nome, grupo: p.grupo, pontos: limpar(p.pontos), secao: { ...p.secao }, alinhamento: p.alinhamento, ...(p.invertida ? { invertida: true } : {}) });
    return `${nome} traçada (${String(+comprimentoPolilinha(limpar(p.pontos)).toFixed(2)).replace('.', ',')} m).`;
  },
});

registrar<{ id: string; nome?: string; pontos?: P[]; secao?: { b: number; h: number }; alinhamento?: Alinhamento; invertida?: boolean; nivel?: number; vinculoIni?: Vinculo; vinculoFim?: Vinculo;
  engasteIni?: number; engasteFim?: number; articulacoes?: string[]; torcaoEquilibrio?: boolean; engasteLajes?: number; foraDiafragma?: boolean; cobrimento?: number; tabela?: string; tabelaEstribo?: string }>({
  nome: 'viga.editar',
  descricao: 'Altera nome, pontos, seção, alinhamento, invertida, desnível do topo (m), vínculos das extremidades, coeficientes de engaste das pontas (0 = rótula, 1 = engaste), pilares intermediários articulados, torção de equilíbrio (seção bruta), coeficiente de engaste das lajes apoiadas na viga, viga fora do diafragma rígido ou cobrimento próprio (cm).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['id'], properties: {
    id: { type: 'string' }, nome: { type: 'string', minLength: 1 }, pontos: { type: 'array', items: ponto, minItems: 2 }, secao: secaoSchema,
    alinhamento: alinSchema, invertida: { type: 'boolean' }, nivel: { type: 'number', minimum: -5, maximum: 5 }, vinculoIni: vincSchema, vinculoFim: vincSchema,
    engasteIni: coefSchema, engasteFim: coefSchema, engasteLajes: coefSchema, torcaoEquilibrio: { type: 'boolean' }, foraDiafragma: { type: 'boolean' },
    cobrimento: { type: 'number', minimum: 0, maximum: 10, description: 'cobrimento próprio (cm); 0 volta ao da obra' },
    tabela: { type: 'string', description: 'id da tabela de barras longitudinais (R7a); "padrao" ou vazio volta à padrão da obra' },
    tabelaEstribo: { type: 'string', description: 'id da tabela de estribos (R7a); "padrao" ou vazio volta à padrão da obra' },
    articulacoes: { type: 'array', items: { type: 'string' }, description: 'ids dos pilares intermediários com rótula na viga' },
  } },
  validar(b, p) {
    if (!viga(b, p.id)) return err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`);
    const tab = tabelaInexistente(b, [['vigas', p.tabela], ['estribos', p.tabelaEstribo]]);
    if (tab.length) return tab;
    const sem = (p.articulacoes ?? []).filter((id) => !b.pilares.some((x) => x.id === id));
    if (sem.length) return err('PILAR_INEXISTENTE', `Pilar ${sem.join(', ')} não existe.`);
    return p.pontos && limpar(p.pontos).length < 2 ? err('VIGA_DEGENERADA', 'A viga precisa de dois pontos distintos.') : [];
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    if (p.nome !== undefined) v.nome = p.nome.trim();
    if (p.pontos) v.pontos = limpar(p.pontos);
    if (p.secao) v.secao = { ...p.secao };
    if (p.alinhamento) v.alinhamento = p.alinhamento;
    if (p.invertida !== undefined) { if (p.invertida) v.invertida = true; else delete v.invertida; }
    if (p.nivel !== undefined) { if (p.nivel) v.nivel = p.nivel; else delete v.nivel; }
    for (const k of ['vinculoIni', 'vinculoFim'] as const) if (p[k]) { if (p[k] === 'auto') delete v[k]; else v[k] = p[k]; }
    for (const k of ['engasteIni', 'engasteFim', 'engasteLajes'] as const) if (p[k] !== undefined) { if (p[k] === 1) delete v[k]; else v[k] = p[k]; }
    for (const k of ['torcaoEquilibrio', 'foraDiafragma'] as const) if (p[k] !== undefined) { if (p[k]) v[k] = true; else delete v[k]; }
    if (p.cobrimento !== undefined) { if (p.cobrimento) v.cobrimento = p.cobrimento; else delete v.cobrimento; }
    atribuirTabela(v, 'tabela', p.tabela); atribuirTabela(v, 'tabelaEstribo', p.tabelaEstribo);
    if (p.articulacoes) { if (p.articulacoes.length) v.articulacoes = [...new Set(p.articulacoes)]; else delete v.articulacoes; }
    return `${v.nome} alterada.`;
  },
});

registrar<{ ids: string[]; campo: 'secao' | 'alinhamento' | 'invertida' | 'nivel'; valor: unknown }>({
  nome: 'viga.atribuir',
  descricao: 'Atribui o mesmo valor a várias vigas: seção {b, h}, alinhamento, invertida ou desnível.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'campo', 'valor'], properties: { ids, campo: { type: 'string', enum: ['secao', 'alinhamento', 'invertida', 'nivel'] }, valor: {} } },
  validar(b, p) {
    const f = faltam(b, p.ids);
    if (f.length) return err('VIGA_INEXISTENTE', `Viga(s) inexistente(s): ${f.join(', ')}.`);
    const ok = p.campo === 'secao' ? typeof p.valor === 'object' && p.valor !== null && (p.valor as { b: number }).b > 0 && (p.valor as { h: number }).h > 0
      : p.campo === 'alinhamento' ? ['esq', 'centro', 'dir'].includes(p.valor as string) : p.campo === 'invertida' ? typeof p.valor === 'boolean' : typeof p.valor === 'number';
    return ok ? [] : err('PARAMETRO_INVALIDO', `Valor inválido para ${p.campo}.`);
  },
  aplicar(d, p) {
    for (const v of d.vigas) if (p.ids.includes(v.id)) {
      if (p.campo === 'secao') { const s = p.valor as { b: number; h: number }; v.secao = { b: s.b, h: s.h }; }
      else if (p.campo === 'alinhamento') v.alinhamento = p.valor as Alinhamento;
      else if (p.campo === 'invertida') { if (p.valor) v.invertida = true; else delete v.invertida; }
      else if (p.valor) v.nivel = p.valor as number; else delete v.nivel;
    }
    return `${p.ids.length} viga(s) alterada(s).`;
  },
});

/** Posição ao longo da polilinha (índice do trecho e parâmetro) do ponto mais próximo. */
function projetar(pts: P[], q: P) {
  let best = { i: 0, t: 0, d: Infinity, p: pts[0] as P };
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)) : 0;
    const p: P = [a[0] + t * dx, a[1] + t * dy], dd = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (dd < best.d) best = { i, t, d: dd, p };
  }
  return best;
}

registrar<{ id: string; ponto: P }>({
  nome: 'viga.dividir',
  descricao: 'Divide a viga em duas no ponto da polilinha mais próximo de `ponto`.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'ponto'], properties: { id: { type: 'string' }, ponto } },
  validar(b, p) {
    const v = viga(b, p.id);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`);
    const q = projetar(v.pontos, p.ponto), L = comprimentoPolilinha(v.pontos);
    const s = comprimentoPolilinha([...v.pontos.slice(0, q.i + 1), q.p]);
    return s < 0.01 || L - s < 0.01 ? err('DIVISAO_NA_PONTA', 'O ponto de divisão coincide com uma extremidade.', [v.id]) : [];
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    const q = projetar(v.pontos as P[], p.ponto), m: P = [r6(q.p[0]), r6(q.p[1])];
    const a = limpar([...(v.pontos as P[]).slice(0, q.i + 1), m]), z = limpar([m, ...(v.pontos as P[]).slice(q.i + 1)]);
    const nova: Viga = { ...JSON.parse(JSON.stringify(v)), id: novoId(d), nome: `V${proximaViga(d as BuildingModel, v.grupo)}`, pontos: z };
    delete nova.vinculoIni;
    v.pontos = a;
    delete v.vinculoFim;
    d.vigas.push(nova);
    return `${v.nome} dividida; o trecho final virou ${nova.nome}.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'viga.unir',
  descricao: 'Une duas vigas do mesmo grupo, com a mesma seção e alinhamento, que têm uma extremidade em comum. Fica o nome da primeira.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 } } },
  validar(b, p) {
    const [v, w] = p.ids.map((id) => viga(b, id));
    if (!v || !w) return err('VIGA_INEXISTENTE', 'Viga inexistente.');
    if (v.grupo !== w.grupo || v.secao.b !== w.secao.b || v.secao.h !== w.secao.h || v.alinhamento !== w.alinhamento) return err('VIGAS_DIFERENTES', 'Só une vigas do mesmo grupo, seção e alinhamento.', [v.id, w.id]);
    return juntar(v.pontos, w.pontos) ? [] : err('VIGAS_SEM_PONTA_COMUM', `${v.nome} e ${w.nome} não têm extremidade em comum.`, [v.id, w.id]);
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.ids[0])!, w = d.vigas.find((x) => x.id === p.ids[1])!;
    v.pontos = limpar(juntar(v.pontos as P[], w.pontos as P[])!);
    d.vigas = d.vigas.filter((x) => x.id !== w.id);
    return `${w.nome} unida a ${v.nome}.`;
  },
});

/** Junta duas polilinhas com uma ponta em comum, mantendo o sentido da primeira. */
function juntar(a: P[], z: P[]): P[] | null {
  const eq = (p: P, q: P) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-4;
  const rz = [...z].reverse();
  if (eq(a[a.length - 1], z[0])) return [...a, ...z.slice(1)];
  if (eq(a[a.length - 1], z[z.length - 1])) return [...a, ...rz.slice(1)];
  if (eq(a[0], z[z.length - 1])) return [...z, ...a.slice(1)];
  if (eq(a[0], z[0])) return [...rz, ...a.slice(1)];
  return null;
}

registrar<{ id: string; extremidade: 'ini' | 'fim'; ate: { viga?: string; eixo?: string; ponto?: P } }>({
  nome: 'viga.prolongar',
  descricao: 'Prolonga ou apara a extremidade da viga, na direção do trecho, até o eixo de outra viga, um eixo de referência ou a projeção de um ponto.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'extremidade', 'ate'], properties: {
    id: { type: 'string' }, extremidade: { type: 'string', enum: ['ini', 'fim'] },
    ate: { type: 'object', additionalProperties: false, properties: { viga: { type: 'string' }, eixo: { type: 'string' }, ponto } },
  } },
  validar(b, p) {
    const v = viga(b, p.id);
    if (!v) return err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`);
    return novaPonta(b, v, p.extremidade, p.ate) ? [] : err('SEM_INTERSECAO', 'A direção da viga não encontra o alvo.', [v.id]);
  },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    const q = novaPonta(d as BuildingModel, v as Viga, p.extremidade, p.ate)!;
    if (p.extremidade === 'ini') v.pontos[0] = q; else v.pontos[v.pontos.length - 1] = q;
    v.pontos = limpar(v.pontos as P[]);
    return `${v.nome} ajustada.`;
  },
});

function novaPonta(b: BuildingModel, v: Viga, ext: 'ini' | 'fim', ate: { viga?: string; eixo?: string; ponto?: P }): P | null {
  const pts = v.pontos, n = pts.length;
  const [a, z] = ext === 'fim' ? [pts[n - 2], pts[n - 1]] : [pts[1], pts[0]];
  const dx = z[0] - a[0], dy = z[1] - a[1];
  if (ate.ponto) { const L2 = dx * dx + dy * dy, t = ((ate.ponto[0] - a[0]) * dx + (ate.ponto[1] - a[1]) * dy) / L2; return t > 0 ? [r6(a[0] + t * dx), r6(a[1] + t * dy)] : null; }
  const linhas: [P, P][] = [];
  const w = ate.viga ? viga(b, ate.viga) : undefined, e = ate.eixo ? b.eixos.find((x) => x.id === ate.eixo) : undefined;
  if (w) { const ex = geometriaViga(w).eixo; for (let i = 0; i + 1 < ex.length; i++) linhas.push([ex[i], ex[i + 1]]); }
  if (e) linhas.push([e.p1, e.p2]);
  let melhor: P | null = null, tm = Infinity;
  for (const [c, f] of linhas) {
    const ex = f[0] - c[0], ey = f[1] - c[1], den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / den;
    if (t > 1e-9 && Math.abs(t - 1) < tm) { tm = Math.abs(t - 1); melhor = [r6(a[0] + t * dx), r6(a[1] + t * dy)]; }
  }
  return melhor;
}

registrar<{ ids: string[]; dx: number; dy: number }>({
  nome: 'viga.mover',
  descricao: 'Desloca vigas de (dx, dy) metros.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' } } },
  validar(b, p) { const f = faltam(b, p.ids); return f.length ? err('VIGA_INEXISTENTE', `Viga(s) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) {
    for (const v of d.vigas) if (p.ids.includes(v.id)) v.pontos = v.pontos.map((q) => [r6(q[0] + p.dx), r6(q[1] + p.dy)] as P);
    return `${p.ids.length} viga(s) movida(s).`;
  },
});

registrar<{ ids: string[]; dx: number; dy: number; vezes: number }>({
  nome: 'viga.copiar',
  descricao: 'Copia vigas no mesmo grupo com deslocamento (dx, dy), repetido `vezes` (cópias em série).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' }, vezes: { type: 'integer', minimum: 1, maximum: 100, default: 1 } } },
  validar(b, p) {
    const f = faltam(b, p.ids);
    if (f.length) return err('VIGA_INEXISTENTE', `Viga(s) inexistente(s): ${f.join(', ')}.`);
    return Math.hypot(p.dx, p.dy) < 1e-6 ? err('DESLOCAMENTO_NULO', 'Informe um deslocamento.') : [];
  },
  aplicar(d, p) {
    const orig = p.ids.map((id) => JSON.parse(JSON.stringify(d.vigas.find((v) => v.id === id))) as Viga);
    for (let k = 1; k <= p.vezes; k++) for (const v of orig)
      d.vigas.push({ ...v, id: novoId(d), nome: `V${proximaViga(d as BuildingModel, v.grupo)}`, pontos: v.pontos.map((q) => [r6(q[0] + k * p.dx), r6(q[1] + k * p.dy)] as P) });
    return `${orig.length * p.vezes} cópia(s) criada(s).`;
  },
});

registrar<{ ids: string[]; grupos: string[] }>({
  nome: 'viga.copiarParaGrupos',
  descricao: 'Copia vigas para a planta de outros grupos de pavimentos, sem apagar o que já existe lá (vigas idênticas já presentes são puladas).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'grupos'], properties: { ids, grupos: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const f = faltam(b, p.ids);
    if (f.length) return err('VIGA_INEXISTENTE', `Viga(s) inexistente(s): ${f.join(', ')}.`);
    const g = p.grupos.filter((id) => !b.grupos.some((x) => x.id === id));
    return g.length ? err('GRUPO_INEXISTENTE', `Grupo(s) inexistente(s): ${g.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const orig = p.ids.map((id) => JSON.parse(JSON.stringify(d.vigas.find((v) => v.id === id))) as Viga);
    let n = 0, pulou = 0;
    for (const g of p.grupos) for (const v of orig) {
      if (g === v.grupo) continue;
      const igual = d.vigas.some((w) => w.grupo === g && JSON.stringify(w.pontos) === JSON.stringify(v.pontos) && w.secao.b === v.secao.b && w.secao.h === v.secao.h);
      if (igual) { pulou++; continue; }
      d.vigas.push({ ...v, id: novoId(d), grupo: g, nome: `V${proximaViga(d as BuildingModel, g)}` });
      n++;
    }
    return `${n} viga(s) copiada(s)${pulou ? `; ${pulou} já existia(m)` : ''}.`;
  },
});

registrar<{ ids: string[] }>({
  nome: 'viga.remover',
  descricao: 'Remove vigas.',
  risco: 'destrutivo',
  schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids } },
  validar(b, p) { const f = faltam(b, p.ids); return f.length ? err('VIGA_INEXISTENTE', `Viga(s) inexistente(s): ${f.join(', ')}.`) : []; },
  aplicar(d, p) { const s = new Set(p.ids); d.vigas = d.vigas.filter((v) => !s.has(v.id)); return `${p.ids.length} viga(s) removida(s).`; },
});

registrar<{ grupo: string; tolerancia: number }>({
  nome: 'viga.renumerar',
  descricao: 'Renumera as vigas do grupo: primeiro as horizontais, de cima para baixo e da esquerda para a direita; depois as verticais e inclinadas, da esquerda para a direita e de cima para baixo.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo'], properties: { grupo: { type: 'string' }, tolerancia: { type: 'number', minimum: 0, default: 0.3 } } },
  validar: (b, p) => (b.grupos.some((g) => g.id === p.grupo) ? [] : err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`)),
  aplicar(d, p) {
    const vs = d.vigas.filter((v) => v.grupo === p.grupo).map((v) => {
      const a = v.pontos[0], z = v.pontos[v.pontos.length - 1];
      const hor = Math.abs(z[0] - a[0]) >= Math.abs(z[1] - a[1]);
      return { v, hor, x: Math.min(a[0], z[0]), y: Math.max(a[1], z[1]) };
    });
    const tol = p.tolerancia;
    const H = vs.filter((x) => x.hor).sort((a, z) => (Math.abs(a.y - z.y) > tol ? z.y - a.y : a.x - z.x));
    const V = vs.filter((x) => !x.hor).sort((a, z) => (Math.abs(a.x - z.x) > tol ? a.x - z.x : z.y - a.y));
    [...H, ...V].forEach((x, i) => { x.v.nome = `V${i + 1}`; });
    return `${vs.length} viga(s) renumerada(s).`;
  },
});

registrar<{ grupo: string; ids?: string[]; tolerancia: number }>({
  nome: 'viga.ajustarFaces',
  descricao: 'Encosta a face das vigas na face paralela dos pilares em que se apoiam quando a distância entre as faces é pequena (até `tolerancia`, m).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo'], properties: { grupo: { type: 'string' }, ids: { type: 'array', items: { type: 'string' } }, tolerancia: { type: 'number', exclusiveMinimum: 0, maximum: 0.5, default: TOL_FACE } } },
  validar: (b, p) => (b.grupos.some((g) => g.id === p.grupo) ? [] : err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`)),
  aplicar(d, p) {
    const b = d as BuildingModel;
    const ps = pavimentosDoGrupo(b, p.grupo).flatMap((pav) => pilaresQueChegam(b, pav.id).map((x) => ({ p: JSON.parse(JSON.stringify(x)), pav: pav.id })));
    let n = 0;
    for (const v of d.vigas) {
      if (v.grupo !== p.grupo || (p.ids && !p.ids.includes(v.id))) continue;
      const vv = JSON.parse(JSON.stringify(v)) as Viga;
      const s = vv.pontos.slice(1).map((_, i) => ajusteFaceTrecho(vv, i, ps, p.tolerancia));
      if (!s.some((x) => x)) continue;
      v.pontos = deslocarTrechos(vv.pontos, s);
      n++;
    }
    return n ? `${n} viga(s) encostada(s) na face dos pilares.` : 'Nenhuma viga a ajustar.';
  },
});

registrar<{ grupo: string; ids?: string[]; lado: LadoFace }>({
  nome: 'viga.alinharFace',
  descricao: 'Loca vigas pela face dos pilares: o lado escolhido da viga fica na face mais externa dos pilares em que ela se apoia, mesmo com viga mais estreita que o pilar. lado "externa" = o lado de fora da planta (sem `ids`, só as vigas de contorno do grupo); "esq"/"dir" = lado do traçado. A linha traçada passa a ser essa face (mudar a largura mantém a face).',
  risco: 'escrita',
  schema: { type: 'object', additionalProperties: false, required: ['grupo'], properties: {
    grupo: { type: 'string' }, ids: { type: 'array', items: { type: 'string' } },
    lado: { type: 'string', enum: ['externa', 'esq', 'dir'], default: 'externa' },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const f = faltam(b, p.ids ?? []);
    return f.length ? err('VIGA_INEXISTENTE', `Viga(s) inexistente(s): ${f.join(', ')}.`) : [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    const ps = pavimentosDoGrupo(b, p.grupo).flatMap((pav) => pilaresQueChegam(b, pav.id).map((x) => ({ p: JSON.parse(JSON.stringify(x)) as Pilar, pav: pav.id })));
    const centros = [...new Map(ps.map((x) => [x.p.id, centroPilar(x.p, secaoNoLance(x.p, x.pav))])).values()];
    const interior: P | null = centros.length ? [centros.reduce((t, c) => t + c[0], 0) / centros.length, centros.reduce((t, c) => t + c[1], 0) / centros.length] : null;
    // vigas de contorno: todos os pilares do grupo do lado de dentro da viga (folga de 0,3 m)
    const contorno = (v: Viga) => {
      const L = (i: number) => Math.hypot(v.pontos[i + 1][0] - v.pontos[i][0], v.pontos[i + 1][1] - v.pontos[i][1]);
      let im = 0;
      for (let i = 1; i + 1 < v.pontos.length; i++) if (L(i) > L(im)) im = i;
      const a = v.pontos[im], z = v.pontos[im + 1], l = L(im) || 1, nx = -(z[1] - a[1]) / l, ny = (z[0] - a[0]) / l;
      const lado = centros.map((c) => (c[0] - a[0]) * nx + (c[1] - a[1]) * ny);
      return lado.every((x) => x <= 0.3) || lado.every((x) => x >= -0.3);
    };
    const nomes: string[] = [];
    for (const v of d.vigas) {
      if (v.grupo !== p.grupo || (p.ids ? !p.ids.includes(v.id) : p.lado !== 'externa' || !contorno(v as Viga))) continue;
      const vv = JSON.parse(JSON.stringify(v)) as Viga;
      const r = alinhamentoNaFace(vv, ps, p.lado, interior);
      if (!r) continue;
      v.pontos = deslocarTrechos(vv.pontos, r.desloc);
      v.alinhamento = r.alinhamento;
      nomes.push(v.nome);
    }
    return nomes.length ? `${nomes.join(', ')} alinhada(s) à face ${p.lado === 'externa' ? 'externa' : p.lado === 'esq' ? 'esquerda' : 'direita'} dos pilares. Se o contorno das lajes mudou, detecte os panos de novo.` : 'Nenhuma viga apoiada em pilar para alinhar.';
  },
});

/** Desloca cada trecho da polilinha de s[i] para a esquerda; vértices internos pela interseção dos trechos deslocados. */
function deslocarTrechos(pts: P[], s: number[]): P[] {
  const n = pts.length;
  const linha = (i: number) => { const a = pts[i], z = pts[i + 1], L = Math.hypot(z[0] - a[0], z[1] - a[1]); const nx = -(z[1] - a[1]) / L, ny = (z[0] - a[0]) / L; return { a: [a[0] + nx * s[i], a[1] + ny * s[i]] as P, z: [z[0] + nx * s[i], z[1] + ny * s[i]] as P }; };
  const out: P[] = [];
  for (let k = 0; k < n; k++) {
    if (k === 0) { out.push(linha(0).a); continue; }
    if (k === n - 1) { out.push(linha(n - 2).z); continue; }
    const l1 = linha(k - 1), l2 = linha(k);
    const d1 = [l1.z[0] - l1.a[0], l1.z[1] - l1.a[1]], d2 = [l2.z[0] - l2.a[0], l2.z[1] - l2.a[1]], den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-12) { out.push([(l1.z[0] + l2.a[0]) / 2, (l1.z[1] + l2.a[1]) / 2]); continue; }
    const t = ((l2.a[0] - l1.a[0]) * d2[1] - (l2.a[1] - l1.a[1]) * d2[0]) / den;
    out.push([l1.a[0] + t * d1[0], l1.a[1] + t * d1[1]]);
  }
  return out.map((q) => [r6(q[0]), r6(q[1])] as P);
}
