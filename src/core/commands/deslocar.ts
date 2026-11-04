// Deslocar paralelo (L9): afasta vigas, paredes e eixos de uma distância, perpendicular ao traçado (polilinhas com cantos em
// esquadria), movendo-os ou criando cópias deslocadas.
import type { Draft } from 'immer';
import { diagnosticosParedes } from '../building/paredes';
import { proximaViga } from '../building/vigas';
import { deslocarPolilinha, type BuildingModel, type Parede, type Viga } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { distanciaAssinada } from '../geom/referencias';
import { registrar } from './registry';

type P = [number, number];
const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const r6 = (v: number) => +v.toFixed(6);
const lista = { type: 'array', items: { type: 'string' } } as const;
const cm = (v: number) => String(Math.round(v * 1000) / 10).replace('.', ',');

interface Params { vigas?: string[]; paredes?: string[]; eixos?: string[]; distancia: number; lado?: 'esq' | 'dir'; ponto?: P; copiar?: boolean }

/** Deslocamento assinado (positivo à esquerda do traçado) da polilinha, pelo lado pedido ou pelo lado em que está o ponto. */
function assinado(pts: P[], p: Params): number {
  if (p.ponto) {
    const L = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) || 1;
    return distanciaAssinada({ p: pts[0], u: [(pts[1][0] - pts[0][0]) / L, (pts[1][1] - pts[0][1]) / L] }, p.ponto) >= 0 ? p.distancia : -p.distancia;
  }
  return p.lado === 'dir' ? -p.distancia : p.distancia;
}
const arred = (pts: P[]) => pts.map(([x, y]) => [r6(x), r6(y)] as P);

function nomeEixoLivre(b: BuildingModel, nome: string): string {
  let n = `${nome}'`;
  while (b.eixos.some((e) => e.nome === n)) n += "'";
  return n;
}

registrar<Params>({
  nome: 'editar.deslocar',
  descricao: 'Desloca paralelamente vigas, paredes e eixos de `distancia` m (> 0), para a esquerda (`lado` "esq", padrão) ou direita do traçado, ou para o lado em que está `ponto`. Com `copiar`, mantém o original e cria a cópia deslocada (viga com o próximo número, parede com o próximo M, eixo com apóstrofo); sem `copiar`, move (as vigas embutidas vão com a parede). Vigas curvas não são aceitas.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['distancia'], properties: {
    vigas: lista, paredes: lista, eixos: lista,
    distancia: { type: 'number', exclusiveMinimum: 0, maximum: 100, description: 'm' },
    lado: { type: 'string', enum: ['esq', 'dir'], default: 'esq' },
    ponto: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: 'o deslocamento vai para o lado em que está este ponto' },
    copiar: { type: 'boolean', default: false },
  } },
  validar(b, p) {
    const total = (p.vigas?.length ?? 0) + (p.paredes?.length ?? 0) + (p.eixos?.length ?? 0);
    if (!total) return err('SELECAO_VAZIA', 'Selecione viga, parede ou eixo.');
    const falta = [
      ...(p.vigas ?? []).filter((id) => !b.vigas.some((x) => x.id === id)),
      ...(p.paredes ?? []).filter((id) => !b.paredes?.some((x) => x.id === id)),
      ...(p.eixos ?? []).filter((id) => !b.eixos.some((x) => x.id === id)),
    ];
    if (falta.length) return err('ELEMENTO_INEXISTENTE', `Elemento(s) inexistente(s): ${falta.join(', ')}.`, falta);
    const curva = b.vigas.find((v) => p.vigas?.includes(v.id) && v.arcos?.length);
    if (curva) return err('VIGA_CURVA', `${curva.nome} tem trechos curvos: use o movimento.`, [curva.id]);
    const emb = b.vigas.find((v) => p.vigas?.includes(v.id) && v.embutida && !p.copiar);
    if (emb) return err('VIGA_EMBUTIDA', `${emb.nome} é embutida: desloque a parede.`, [emb.id]);
    // a parede deslocada não pode se sobrepor a outra
    const ws = (p.paredes ?? []).map((id) => b.paredes!.find((x) => x.id === id)!);
    if (ws.length) {
      const novas = ws.map((w, i) => ({ ...w, id: p.copiar ? `${w.id}#c` : w.id, nome: p.copiar ? `${w.nome}#c${i}` : w.nome, pontos: arred(deslocarPolilinha(w.pontos, assinado(w.pontos, p))) }));
      const tmp = { ...b, paredes: [...(p.copiar ? b.paredes! : b.paredes!.filter((x) => !p.paredes!.includes(x.id))), ...novas] };
      const sob = diagnosticosParedes(tmp).filter((x) => x.severidade === 'erro' && x.codigo === 'PAREDE_SOBREPOSTA' && novas.some((n) => x.elementos.includes(n.id)));
      if (sob.length) return sob;
    }
    return [];
  },
  aplicar(d, p) {
    const m = d as unknown as BuildingModel;
    const novoId = (pre: string) => `${pre}_${(++d.seq).toString(36)}`;
    let n = 0;
    for (const id of p.vigas ?? []) {
      const v = d.vigas.find((x) => x.id === id)!;
      const pts = arred(deslocarPolilinha(v.pontos as P[], assinado(v.pontos as P[], p)));
      if (p.copiar) {
        const c = JSON.parse(JSON.stringify(v)) as Viga;
        for (const k of ['comum', 'comumDe', 'embutida', 'origemLancamento'] as const) delete c[k];
        d.vigas.push({ ...c, id: novoId('v'), nome: `V${proximaViga(m, v.grupo)}`, pontos: pts } as Draft<Viga>);
      } else v.pontos = pts;
      n++;
    }
    for (const id of p.paredes ?? []) {
      const w = d.paredes!.find((x) => x.id === id)!;
      const s = assinado(w.pontos as P[], p), pts = arred(deslocarPolilinha(w.pontos as P[], s));
      if (p.copiar) {
        const c = JSON.parse(JSON.stringify(w)) as Parede;
        delete c.armaduras; delete c.emendas; delete c.origemLancamento;
        if (c.aberturas) c.aberturas = c.aberturas.map((a) => ({ ...a, id: novoId('ab') }));
        const num = Math.max(0, ...d.paredes!.map((q) => { const r = /^M(\d+)$/.exec(q.nome); return r ? +r[1] : 0; })) + 1;
        d.paredes!.push({ ...c, id: novoId('pw'), nome: `M${num}`, pontos: pts } as Draft<Parede>);
      } else {
        // as vigas embutidas acompanham, no mesmo sentido da parede
        for (const v of d.vigas) if (v.embutida === w.id) {
          const dot = (w.pontos[1][0] - w.pontos[0][0]) * (v.pontos[1][0] - v.pontos[0][0]) + (w.pontos[1][1] - w.pontos[0][1]) * (v.pontos[1][1] - v.pontos[0][1]);
          v.pontos = arred(deslocarPolilinha(v.pontos as P[], dot >= 0 ? s : -s));
        }
        w.pontos = pts;
      }
      n++;
    }
    for (const id of p.eixos ?? []) {
      const e = d.eixos.find((x) => x.id === id)!;
      const [q1, q2] = arred(deslocarPolilinha([e.p1 as P, e.p2 as P], assinado([e.p1 as P, e.p2 as P], p)));
      if (p.copiar) d.eixos.push({ id: novoId('e'), nome: nomeEixoLivre(m, e.nome), p1: q1, p2: q2 });
      else { e.p1 = q1; e.p2 = q2; }
      n++;
    }
    return `${n} elemento(s) ${p.copiar ? 'copiado(s)' : 'movido(s)'} ${cm(p.distancia)} cm em paralelo.`;
  },
});
