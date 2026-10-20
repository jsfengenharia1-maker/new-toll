// Edição da seleção (R7-0): girar por um ângulo em torno de um centro e espelhar por um eixo (com cópia opcional)
// pilares, vigas, lajes e cargas da planta. Pilares mantêm o ponto de inserção (ajuste) no mesmo canto da seção.
import type { Draft } from 'immer';
import type { Ajuste, BuildingModel, Pilar, Viga } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { pilaresSobrepostos } from '../building/pilares';
import { proximaViga } from '../building/vigas';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

type P = [number, number];
type Selecao = { pilares?: string[]; vigas?: string[]; lajes?: string[]; cargas?: string[] };
const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const lista: JsonSchema = { type: 'array', items: { type: 'string' } };
const selecaoProps = { pilares: lista, vigas: lista, lajes: lista, cargas: lista };
const r9 = (v: number) => +v.toFixed(9);
const angNorm = (a: number) => { const r = r9(((a % 360) + 360) % 360); return r >= 360 ? 0 : r; };

/** Transformação rígida do plano (rotação ou reflexão) aplicada a pontos e ângulos. */
interface Transf { ponto(p: P): P; angulo(a: number): number; reflete: boolean }

function rotacao(c: P, graus: number): Transf {
  const t = (graus * Math.PI) / 180, cs = Math.cos(t), sn = Math.sin(t);
  return {
    ponto: ([x, y]) => [r9(c[0] + (x - c[0]) * cs - (y - c[1]) * sn), r9(c[1] + (x - c[0]) * sn + (y - c[1]) * cs)],
    angulo: (a) => angNorm(a + graus),
    reflete: false,
  };
}

function reflexao(a: P, z: P): Transf {
  const th = Math.atan2(z[1] - a[1], z[0] - a[0]), c2 = Math.cos(2 * th), s2 = Math.sin(2 * th);
  return {
    ponto: ([x, y]) => { const u = x - a[0], v = y - a[1]; return [r9(a[0] + u * c2 + v * s2), r9(a[1] + u * s2 - v * c2)]; },
    angulo: (g) => angNorm((2 * th * 180) / Math.PI - g),
    reflete: true,
  };
}

/** Na reflexão o eixo local y do pilar inverte: o ponto de inserção troca norte ↔ sul. */
const AJUSTE_REFLETIDO: Record<Ajuste, Ajuste> = { c: 'c', n: 's', s: 'n', l: 'l', o: 'o', ne: 'se', se: 'ne', no: 'so', so: 'no' };

function validarSelecao(b: BuildingModel, p: Selecao): Diagnostico[] {
  const total = (p.pilares?.length ?? 0) + (p.vigas?.length ?? 0) + (p.lajes?.length ?? 0) + (p.cargas?.length ?? 0);
  if (!total) return err('SELECAO_VAZIA', 'Selecione ao menos um elemento.');
  const falta = [
    ...(p.pilares ?? []).filter((id) => !b.pilares.some((x) => x.id === id)),
    ...(p.vigas ?? []).filter((id) => !b.vigas.some((x) => x.id === id)),
    ...(p.lajes ?? []).filter((id) => !b.lajes.some((x) => x.id === id)),
    ...(p.cargas ?? []).filter((id) => !b.cargas.some((x) => x.id === id)),
  ];
  return falta.length ? err('ELEMENTO_INEXISTENTE', `Elemento(s) inexistente(s): ${falta.join(', ')}.`, falta) : [];
}

const pilarTransformado = (q: Pilar, t: Transf): Pilar => {
  const [x, y] = t.ponto([q.x, q.y]);
  return { ...q, x, y, angulo: t.angulo(q.angulo), ajuste: t.reflete ? AJUSTE_REFLETIDO[q.ajuste] : q.ajuste };
};

/** Pilares transformados que ficariam sobre outros (movidos: ignora os da própria seleção; copiados: considera todos). */
function sobreposicoes(b: BuildingModel, ids: string[], t: Transf, copiar: boolean): Diagnostico[] {
  const mov = new Set(copiar ? [] : ids);
  const novos = ids.map((id) => ({ ...pilarTransformado(b.pilares.find((x) => x.id === id)!, t), id: copiar ? `${id}#c` : id }));
  const tmp = { ...b, pilares: [...b.pilares.filter((x) => copiar || !mov.has(x.id)), ...novos] };
  for (const n of novos) {
    const sob = pilaresSobrepostos(tmp, n, copiar ? new Set() : new Set(novos.map((x) => x.id).filter((id) => id !== n.id)));
    if (sob.length) return err('PILAR_SOBREPOSTO', `${n.nome} ficaria sobre ${sob.map((x) => x.nome.replace(/#.*/, '')).join(', ')}.`, [n.id.replace(/#c$/, ''), ...sob.map((x) => x.id)]);
  }
  return [];
}

function aplicarTransf(d: Draft<BuildingModel>, p: Selecao, t: Transf) {
  for (const q of d.pilares) if (p.pilares?.includes(q.id)) Object.assign(q, pilarTransformado(q as Pilar, t));
  for (const v of d.vigas) if (p.vigas?.includes(v.id)) {
    v.pontos = v.pontos.map((q) => t.ponto(q as P));
    // a reflexão troca esquerda e direita do traçado: a face indicada continua a mesma
    if (t.reflete && (v.alinhamento === 'esq' || v.alinhamento === 'dir')) v.alinhamento = v.alinhamento === 'esq' ? 'dir' : 'esq';
  }
  for (const l of d.lajes) if (p.lajes?.includes(l.id)) {
    const n = l.contorno.length;
    let c = l.contorno.map((q) => t.ponto(q as P));
    // reflexão inverte o sentido do contorno: volta ao sentido original e reindexa os engastes das bordas
    if (t.reflete) {
      c = c.reverse();
      if (l.engasteBordas) { const e = l.engasteBordas.slice(); l.engasteBordas = c.map((_, k) => e[(((n - 2 - k) % n) + n) % n] ?? 1); }
    }
    l.contorno = c;
    if (l.furos) l.furos = l.furos.map((f) => { const g = f.map((q) => t.ponto(q as P)); return t.reflete ? g.reverse() : g; });
    if (l.direcao !== undefined) l.direcao = t.angulo(l.direcao);
  }
  for (const c of d.cargas) if (p.cargas?.includes(c.id)) c.pontos = c.pontos.map((q) => t.ponto(q as P));
}

registrar<Selecao & { centro: P; angulo: number }>({
  nome: 'editar.girar',
  descricao: 'Gira pilares, vigas, lajes e cargas selecionados de um ângulo (graus, anti-horário) em torno de um centro.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['centro', 'angulo'], properties: { ...selecaoProps, centro: ponto, angulo: { type: 'number', minimum: -360, maximum: 360, description: 'graus, anti-horário' } } },
  validar(b, p) {
    const e = validarSelecao(b, p);
    if (e.length) return e;
    if (Math.abs(p.angulo % 360) < 1e-9) return err('ANGULO_NULO', 'Informe um ângulo diferente de zero.');
    return sobreposicoes(b, p.pilares ?? [], rotacao(p.centro, p.angulo), false);
  },
  aplicar(d, p) {
    aplicarTransf(d, p, rotacao(p.centro, p.angulo));
    const n = (p.pilares?.length ?? 0) + (p.vigas?.length ?? 0) + (p.lajes?.length ?? 0) + (p.cargas?.length ?? 0);
    return `${n} elemento(s) girado(s) de ${String(+p.angulo.toFixed(3)).replace('.', ',')}°.`;
  },
});

registrar<Selecao & { eixo: [P, P]; copiar?: boolean }>({
  nome: 'editar.espelhar',
  descricao: 'Espelha pilares, vigas, lajes e cargas selecionados pela reta que passa pelos dois pontos do eixo. Com `copiar`, mantém os originais e cria cópias espelhadas de pilares e vigas (próximos números).',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['eixo'], properties: { ...selecaoProps, eixo: { type: 'array', items: ponto, minItems: 2, maxItems: 2 }, copiar: { type: 'boolean', default: false } } },
  validar(b, p) {
    const e = validarSelecao(b, p);
    if (e.length) return e;
    const [a, z] = p.eixo;
    if (Math.hypot(z[0] - a[0], z[1] - a[1]) < 1e-6) return err('EIXO_DEGENERADO', 'Os dois pontos do eixo devem ser distintos.');
    if (p.copiar && !(p.pilares?.length || p.vigas?.length)) return err('COPIA_SEM_ELEMENTOS', 'A cópia espelhada vale para pilares e vigas.');
    return sobreposicoes(b, p.pilares ?? [], reflexao(a, z), !!p.copiar);
  },
  aplicar(d, p) {
    const t = reflexao(p.eixo[0], p.eixo[1]);
    if (!p.copiar) {
      aplicarTransf(d, p, t);
      const n = (p.pilares?.length ?? 0) + (p.vigas?.length ?? 0) + (p.lajes?.length ?? 0) + (p.cargas?.length ?? 0);
      return `${n} elemento(s) espelhado(s).`;
    }
    let num = Math.max(0, ...d.pilares.map((q) => { const m = /^P(\d+)$/.exec(q.nome); return m ? +m[1] : 0; })) + 1;
    const pils = (p.pilares ?? []).map((id) => JSON.parse(JSON.stringify(d.pilares.find((x) => x.id === id))) as Pilar);
    for (const q of pils) { const n: Pilar = { ...pilarTransformado(q, t), id: `p_${(++d.seq).toString(36)}`, nome: `P${num++}` }; delete n.armaduras; d.pilares.push(n); }
    const vgs = (p.vigas ?? []).map((id) => JSON.parse(JSON.stringify(d.vigas.find((x) => x.id === id))) as Viga);
    for (const v of vgs) {
      const nova: Viga = { ...v, id: `v_${(++d.seq).toString(36)}`, nome: `V${proximaViga(d as BuildingModel, v.grupo)}`, pontos: v.pontos.map((q) => t.ponto(q as P)) };
      if (nova.alinhamento === 'esq' || nova.alinhamento === 'dir') nova.alinhamento = nova.alinhamento === 'esq' ? 'dir' : 'esq';
      d.vigas.push(nova);
    }
    return `${pils.length + vgs.length} cópia(s) espelhada(s) criada(s).`;
  },
});
