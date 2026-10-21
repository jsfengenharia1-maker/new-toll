// Armaduras editadas e bloqueadas (frente R2): o recálculo não redimensiona, só verifica (pilares: verificação
// completa; vigas: área de aço, estribos e flecha). O bloqueio deixa de valer quando muda o número de lances do
// pilar ou de vãos da viga. Lajes treliçadas (R6): armadura adicional e negativa das vigotas por nervura.
import { lancesDoPilar, type BuildingModel, type Pilar } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { vaosDaViga } from '../building/vigas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const BITOLA_L = [8, 10, 12.5, 16, 20, 25, 32], BITOLA_T = [5, 6.3, 8, 10, 12.5], BITOLA_VIGOTA = [6.3, 8, 10, 12.5];
const barras = (bitolas: number[]): JsonSchema => ({ type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 40 }, phi: { type: 'number', enum: bitolas } } });
const estriboPilar: JsonSchema = { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: BITOLA_T }, s: { type: 'number', minimum: 0.03, maximum: 0.5, description: 'espaçamento (m)' } } };
const estribo: JsonSchema = { type: 'object', additionalProperties: false, required: ['phi', 's'], properties: { phi: { type: 'number', enum: BITOLA_T }, s: { type: 'number', minimum: 0.03, maximum: 0.5, description: 'espaçamento (m)' }, legs: { type: 'integer', enum: [2, 4, 6], description: 'ramos (padrão 2)' } } };

registrar<{ id: string; pavimento: string; phi: number; nb?: number; nh?: number; nbS?: number; nhD?: number; n?: number; estribo: { phi: number; s: number } }>({
  nome: 'pilar.armadura',
  descricao: 'Edita e bloqueia a armadura de um lance de pilar: bitola longitudinal `phi` (mm), barras por face ao longo de b (`nb`) e de h (`nh`), com os cantos, ou `n` barras no pilar circular, e o estribo { phi (mm), s (m) }. O recálculo verifica essa armadura (verificação completa) sem redimensioná-la.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'pavimento', 'phi', 'estribo'], properties: {
    id: { type: 'string' }, pavimento: { type: 'string', description: 'lance (pavimento do topo)' }, phi: { type: 'number', enum: BITOLA_L },
    nb: { type: 'integer', minimum: 2, maximum: 20 }, nh: { type: 'integer', minimum: 2, maximum: 20 }, n: { type: 'integer', minimum: 4, maximum: 40 }, estribo: estriboPilar,
    nbS: { type: 'integer', minimum: 2, maximum: 20, description: 'face superior (y+) com outro número de barras (arranjo não simétrico); padrão = nb' },
    nhD: { type: 'integer', minimum: 2, maximum: 20, description: 'face direita (x+) com outro número de barras; padrão = nh' },
  } },
  validar(b, p) {
    const pil = b.pilares.find((x) => x.id === p.id);
    if (!pil) return err('PILAR_INEXISTENTE', `Pilar ${p.id} não existe.`);
    if (!lancesDoPilar(b, pil).some((x) => x.id === p.pavimento)) return err('LANCE_INEXISTENTE', `${pil.nome} não tem lance em ${p.pavimento}.`, [p.id]);
    const circ = (pil.secoes?.find((x) => x.pavimento === p.pavimento)?.secao ?? pil.secao).tipo === 'circ';
    if (circ ? p.n === undefined : p.nb === undefined || p.nh === undefined) return err('ARRANJO', circ ? 'Pilar circular: informe n.' : 'Pilar retangular: informe nb e nh.', [p.id]);
    return [];
  },
  aplicar(d, p) {
    const q = d.pilares.find((x) => x.id === p.id)!;
    const lances = lancesDoPilar(d as BuildingModel, q as Pilar).length;
    q.armaduras = (q.armaduras ?? []).filter((x) => x.pavimento !== p.pavimento);
    q.armaduras.push({ pavimento: p.pavimento, phi: p.phi, ...(p.n !== undefined ? { n: p.n } : { nb: p.nb, nh: p.nh, ...(p.nbS !== undefined && p.nbS !== p.nb ? { nbS: p.nbS } : {}), ...(p.nhD !== undefined && p.nhD !== p.nh ? { nhD: p.nhD } : {}) }), estribo: { ...p.estribo }, lances });
    return `Armadura de ${q.nome} (lance ${p.pavimento}) editada e bloqueada.`;
  },
});

registrar<{ id: string; inf: { n: number; phi: number }; sup?: { n: number; phi: number }; estribo: { phi: number; s: number; legs?: number }; laterais?: { n: number; phi: number } }>({
  nome: 'viga.armadura',
  descricao: 'Edita e bloqueia a armadura de uma viga (todos os vãos e pavimentos do grupo): inferior e superior { n, phi (mm) }, estribo { phi (mm), s (m) } e barras laterais por face { n, phi }. O recálculo só verifica a área de aço, os estribos e a flecha.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['id', 'inf', 'estribo'], properties: {
    id: { type: 'string' }, inf: barras(BITOLA_L), sup: barras(BITOLA_L), estribo, laterais: barras(BITOLA_L),
  } },
  validar(b, p) { return b.vigas.some((x) => x.id === p.id) ? [] : err('VIGA_INEXISTENTE', `Viga ${p.id} não existe.`); },
  aplicar(d, p) {
    const v = d.vigas.find((x) => x.id === p.id)!;
    v.armadura = { inf: { ...p.inf }, ...(p.sup ? { sup: { ...p.sup } } : {}), estribo: { ...p.estribo }, ...(p.laterais ? { laterais: { ...p.laterais } } : {}), vaos: vaosDaViga(d as BuildingModel, v) };
    return `Armadura de ${v.nome} editada e bloqueada.`;
  },
});

registrar<{ ids: string[]; inf: { n: number; phi: number }; sup?: { n: number; phi: number } }>({
  nome: 'laje.armaduraVigotas',
  descricao: 'Edita e bloqueia a armadura das vigotas de lajes treliçadas, por nervura: positiva adicional ao banzo inferior da treliça `inf` { n (0 = sem adicional, até 2), phi (mm) } e, opcional, a negativa na capa sobre os apoios `sup` { n, phi }. O recálculo só verifica essa armadura (erro se insuficiente).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['ids', 'inf'], properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
    inf: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 0, maximum: 2 }, phi: { type: 'number', enum: BITOLA_VIGOTA } } },
    sup: { type: 'object', additionalProperties: false, required: ['n', 'phi'], properties: { n: { type: 'integer', minimum: 1, maximum: 2 }, phi: { type: 'number', enum: BITOLA_VIGOTA } } },
  } },
  validar(b, p) {
    const sem = p.ids.filter((id) => !b.lajes.some((x) => x.id === id));
    if (sem.length) return err('LAJE_INEXISTENTE', `Laje ${sem.join(', ')} não existe.`);
    const mac = b.lajes.filter((x) => p.ids.includes(x.id) && x.tipo.tipo !== 'trelicada');
    return mac.length ? err('LAJE_NAO_TRELICADA', `${mac.map((x) => x.nome).join(', ')} não é treliçada.`, mac.map((x) => x.id)) : [];
  },
  aplicar(d, p) {
    for (const l of d.lajes) if (p.ids.includes(l.id)) l.armaduraVigotas = { inf: { ...p.inf }, ...(p.sup ? { sup: { ...p.sup } } : {}) };
    return `Armadura das vigotas de ${p.ids.length} laje(s) editada e bloqueada.`;
  },
});

registrar<{ ids?: string[]; tipo?: 'viga' | 'pilar' | 'laje' }>({
  nome: 'armadura.desbloquear',
  descricao: 'Desbloqueia armaduras editadas (o recálculo volta a dimensioná-las): `ids` de pilares, vigas e lajes treliçadas, ou todos de um `tipo`, ou todos sem parâmetros.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, tipo: { type: 'string', enum: ['viga', 'pilar', 'laje'] } } },
  validar(b, p) {
    const sem = (p.ids ?? []).filter((id) => !b.pilares.some((x) => x.id === id) && !b.vigas.some((x) => x.id === id) && !b.lajes.some((x) => x.id === id));
    return sem.length ? err('ELEMENTO_INEXISTENTE', `Elemento ${sem.join(', ')} não existe.`) : [];
  },
  aplicar(d, p) {
    let n = 0;
    const alvo = (id: string, t: 'viga' | 'pilar' | 'laje') => (p.ids ? p.ids.includes(id) : !p.tipo || p.tipo === t);
    for (const q of d.pilares) if (q.armaduras && alvo(q.id, 'pilar')) { n += q.armaduras.length; delete q.armaduras; }
    for (const v of d.vigas) if (v.armadura && alvo(v.id, 'viga')) { n++; delete v.armadura; }
    for (const l of d.lajes) if (l.armaduraVigotas && alvo(l.id, 'laje')) { n++; delete l.armaduraVigotas; }
    return n ? `${n} armadura(s) desbloqueada(s).` : 'Nenhuma armadura bloqueada.';
  },
});

registrar<{ de: string; para: string[] }>({
  nome: 'viga.copiarArmadura',
  descricao: 'Copia a armadura bloqueada de uma viga para outras (mesma armadura e bloqueio; o recálculo verifica cada uma). A viga de origem precisa ter armadura bloqueada.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['de', 'para'], properties: { de: { type: 'string' }, para: { type: 'array', items: { type: 'string' }, minItems: 1 } } },
  validar(b, p) {
    const o = b.vigas.find((x) => x.id === p.de);
    if (!o) return err('VIGA_INEXISTENTE', `Viga ${p.de} não existe.`);
    if (!o.armadura) return err('SEM_ARMADURA', `${o.nome} não tem armadura bloqueada para copiar.`, [p.de]);
    const sem = p.para.filter((id) => !b.vigas.some((x) => x.id === id));
    return sem.length ? err('VIGA_INEXISTENTE', `Viga ${sem.join(', ')} não existe.`) : [];
  },
  aplicar(d, p) {
    const o = d.vigas.find((x) => x.id === p.de)!;
    for (const id of p.para) { const v = d.vigas.find((x) => x.id === id)!; v.armadura = { ...JSON.parse(JSON.stringify(o.armadura)), vaos: vaosDaViga(d as BuildingModel, v) }; }
    return `Armadura de ${o.nome} copiada para ${p.para.length} viga(s).`;
  },
});
