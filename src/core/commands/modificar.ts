// Mover e copiar completos: lajes, cargas e paredes (pilares, vigas, eixos e fundação já tinham os seus comandos).
// Deslocamento (dx, dy) em m. As cópias em série (`vezes`) deslocam k·(dx, dy). Elementos fixados não se movem (building/fixacao.ts).
import type { Draft } from 'immer';
import type { BuildingModel, Laje, Parede, Viga } from '../building/types';
import { proximaViga } from '../building/vigas';
import type { Diagnostico } from '../building/verify';
import { dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { embutidas, errosDaParede } from './paredes';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const ids: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1 };
const r6 = (v: number) => +v.toFixed(6);
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const desloca = (pts: readonly (readonly number[])[], dx: number, dy: number): [number, number][] => pts.map((q) => [r6(q[0] + dx), r6(q[1] + dy)]);
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const schemaMover: JsonSchema = { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' } } };
const schemaCopiar: JsonSchema = { type: 'object', additionalProperties: false, required: ['ids', 'dx', 'dy'], properties: { ids, dx: { type: 'number' }, dy: { type: 'number' }, vezes: { type: 'integer', minimum: 1, maximum: 100, default: 1 } } };
type Mover = { ids: string[]; dx: number; dy: number };
type Copiar = Mover & { vezes: number };

// ---------- lajes ----------

/** Laje deslocada (contorno, aberturas e pontos de referência do pano; a armadura editada por posição fica de fora das cópias). */
function lajeDeslocada(l: Laje, dx: number, dy: number): Laje {
  const n: Laje = { ...l, contorno: desloca(l.contorno, dx, dy) };
  if (l.furos) n.furos = l.furos.map((f) => desloca(f, dx, dy));
  if (l.pontoNervuras) n.pontoNervuras = desloca([l.pontoNervuras], dx, dy)[0];
  if (l.zonasMacicas) n.zonasMacicas = l.zonasMacicas.map((z) => desloca(z, dx, dy));
  if (l.predefinidas) n.predefinidas = l.predefinidas.map((a) => ({ ...a, a: desloca([a.a], dx, dy)[0] }));
  return n;
}

/** A laje (já na posição nova) se sobrepõe a alguma das outras do grupo? Devolve o nome da outra. */
function lajeSobre(b: BuildingModel, nova: Laje, ignorar: Set<string>): string | null {
  const q = pontoInterno(nova.contorno as P[]);
  for (const o of b.lajes) {
    if (o.grupo !== nova.grupo || ignorar.has(o.id)) continue;
    if (dentroPoligono(q, o.contorno as P[]) || dentroPoligono(pontoInterno(o.contorno as P[]), nova.contorno as P[])) return o.nome;
  }
  return null;
}

const existem = (_b: BuildingModel, lista: { id: string }[] | undefined, p: { ids: string[] }, codigo: string, rotulo: string): Diagnostico[] => {
  const falta = p.ids.filter((id) => !lista?.some((x) => x.id === id));
  return falta.length ? err(codigo, `${rotulo} inexistente(s): ${falta.join(', ')}.`, falta) : [];
};

registrar<Mover>({
  nome: 'laje.mover',
  descricao: 'Desloca lajes (panos) de (dx, dy) metros, com aberturas e pontos de referência. O contorno acompanha o deslocamento; as vigas não vão junto. Recusa se o pano cair sobre outro.',
  risco: 'escrita',
  mcp: false,
  schema: schemaMover,
  validar(b, p) {
    const e = existem(b, b.lajes, p, 'LAJE_INEXISTENTE', 'Laje(s)');
    if (e.length) return e;
    if (Math.hypot(p.dx, p.dy) < 1e-9) return err('DESLOCAMENTO_NULO', 'Informe um deslocamento.');
    const mov = new Set(p.ids);
    for (const id of p.ids) {
      const l = b.lajes.find((x) => x.id === id)!;
      const sob = lajeSobre(b, lajeDeslocada(l, p.dx, p.dy), mov);
      if (sob) return err('LAJE_EXISTENTE', `${l.nome} ficaria sobre ${sob}.`, [l.id]);
    }
    return [];
  },
  aplicar(d, p) {
    for (const l of d.lajes) if (p.ids.includes(l.id)) Object.assign(l, lajeDeslocada(l as Laje, p.dx, p.dy));
    for (const a of d.abacos ?? []) if (p.ids.includes(a.laje)) a.poligono = desloca(a.poligono, p.dx, p.dy);
    return `${p.ids.length} laje(s) movida(s).`;
  },
});

registrar<Copiar>({
  nome: 'laje.copiar',
  descricao: 'Copia lajes (panos) com deslocamento (dx, dy), repetido `vezes`. A cópia leva tipo, direção, desnível, engastes, cobrimento, tabela e opções; a armadura editada, as vigotas editadas e a punção não são copiadas. Recebe os próximos números.',
  risco: 'escrita',
  mcp: false,
  schema: schemaCopiar,
  validar(b, p) {
    const e = existem(b, b.lajes, p, 'LAJE_INEXISTENTE', 'Laje(s)');
    if (e.length) return e;
    if (Math.hypot(p.dx, p.dy) < 1e-9) return err('DESLOCAMENTO_NULO', 'Informe um deslocamento.');
    let m = b;
    for (let k = 1; k <= p.vezes; k++) for (const id of p.ids) {
      const l = b.lajes.find((x) => x.id === id)!;
      const c = { ...lajeDeslocada(l, k * p.dx, k * p.dy), id: `${id}#${k}`, nome: `${l.nome}#${k}` };
      const sob = lajeSobre(m, c, new Set());
      if (sob) return err('LAJE_EXISTENTE', `Uma cópia de ${l.nome} ficaria sobre ${sob}.`, [l.id]);
      m = { ...m, lajes: [...m.lajes, c] };
    }
    return [];
  },
  aplicar(d, p) {
    const orig = p.ids.map((id) => d.lajes.find((x) => x.id === id)!).map((l) => copia(l) as Laje);
    const num = (g: string) => Math.max(0, ...d.lajes.filter((l) => l.grupo === g).map((l) => { const m = /^L(\d+)$/.exec(l.nome); return m ? +m[1] : 0; })) + 1;
    for (let k = 1; k <= p.vezes; k++) for (const l of orig) {
      const c = lajeDeslocada(l, k * p.dx, k * p.dy);
      for (const campo of ['edicao', 'edicaoVigotas', 'armaduraVigotas', 'predefinidas', 'puncao', 'origemLancamento', 'alveolar'] as const) delete c[campo];
      d.lajes.push({ ...c, id: novoId(d, 'l'), nome: `L${num(l.grupo)}` });
    }
    return `${p.ids.length * p.vezes} cópia(s) de laje criada(s).`;
  },
});

// ---------- cargas ----------

const cargasComuns = (b: BuildingModel, ids_: string[]): Diagnostico[] => {
  const e = existem(b, b.cargas, { ids: ids_ }, 'CARGA_INEXISTENTE', 'Carga(s)');
  if (e.length) return e;
  const derivada = ids_.find((id) => b.cargas.find((c) => c.id === id)?.escada);
  return derivada ? err('CARGA_DERIVADA', 'A carga das escadas é calculada: mova a escada.', [derivada]) : [];
};

registrar<Mover>({
  nome: 'carga.mover',
  descricao: 'Desloca cargas (pontuais, lineares e de área) de (dx, dy) metros.',
  risco: 'escrita',
  mcp: false,
  schema: schemaMover,
  validar(b, p) { return cargasComuns(b, p.ids); },
  aplicar(d, p) {
    for (const c of d.cargas) if (p.ids.includes(c.id)) c.pontos = desloca(c.pontos, p.dx, p.dy);
    return `${p.ids.length} carga(s) movida(s).`;
  },
});

registrar<Copiar>({
  nome: 'carga.copiar',
  descricao: 'Copia cargas (pontuais, lineares e de área) com deslocamento (dx, dy), repetido `vezes`; mesmo caso, valor e grupo.',
  risco: 'escrita',
  mcp: false,
  schema: schemaCopiar,
  validar(b, p) { return cargasComuns(b, p.ids).length ? cargasComuns(b, p.ids) : Math.hypot(p.dx, p.dy) < 1e-9 ? err('DESLOCAMENTO_NULO', 'Informe um deslocamento.') : []; },
  aplicar(d, p) {
    const orig = p.ids.map((id) => copia(d.cargas.find((c) => c.id === id)!));
    for (let k = 1; k <= p.vezes; k++) for (const c of orig) d.cargas.push({ ...c, id: novoId(d, 'c'), pontos: desloca(c.pontos, k * p.dx, k * p.dy) });
    return `${p.ids.length * p.vezes} cópia(s) de carga criada(s).`;
  },
});

// ---------- paredes ----------

const proximoNumeroParede = (b: { paredes?: Parede[] }) => Math.max(0, ...(b.paredes ?? []).map((w) => { const m = /^M(\d+)$/.exec(w.nome); return m ? +m[1] : 0; })) + 1;

registrar<Copiar>({
  nome: 'parede.copiar',
  descricao: 'Copia paredes (e as vigas embutidas nelas) com deslocamento (dx, dy), repetido `vezes`. A cópia recebe os próximos números e não leva a armadura editada.',
  risco: 'escrita',
  mcp: false,
  schema: schemaCopiar,
  validar(b, p) {
    const e = existem(b, b.paredes, p, 'PAREDE_INEXISTENTE', 'Parede(s)');
    if (e.length) return e;
    if (Math.hypot(p.dx, p.dy) < 1e-9) return err('DESLOCAMENTO_NULO', 'Informe um deslocamento.');
    let m = b;
    for (let k = 1; k <= p.vezes; k++) for (const id of p.ids) {
      const w = b.paredes!.find((x) => x.id === id)!;
      const c: Parede = { ...copia(w), id: `${id}#${k}`, nome: `${w.nome}#${k}`, pontos: desloca(w.pontos, k * p.dx, k * p.dy) };
      const er = errosDaParede(m, c);
      if (er.length) return er;
      m = { ...m, paredes: [...(m.paredes ?? []), c] };
    }
    return [];
  },
  aplicar(d, p) {
    const orig = p.ids.map((id) => copia(d.paredes!.find((x) => x.id === id)!) as Parede);
    const vigas = embutidas(d as BuildingModel, p.ids).map((v) => copia(v) as Viga);
    for (let k = 1; k <= p.vezes; k++) for (const w of orig) {
      const id = novoId(d, 'pw');
      const nova: Parede = { ...w, id, nome: `M${proximoNumeroParede(d)}`, pontos: desloca(w.pontos, k * p.dx, k * p.dy) };
      for (const campo of ['origemLancamento', 'armaduras', 'emendas'] as const) delete nova[campo];
      (d.paredes ??= []).push(nova);
      for (const v of vigas.filter((x) => x.embutida === w.id)) {
        const nv: Viga = { ...v, id: novoId(d, 'v'), nome: `V${proximaViga(d as BuildingModel, v.grupo)}`, embutida: id, pontos: desloca(v.pontos, k * p.dx, k * p.dy) };
        for (const campo of ['armadura', 'detalhe', 'origemLancamento', 'comum', 'comumDe'] as const) delete nv[campo];
        d.vigas.push(nv);
      }
    }
    return `${p.ids.length * p.vezes} cópia(s) de parede criada(s).`;
  },
});
