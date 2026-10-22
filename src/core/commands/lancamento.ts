// Comandos do lançamento automático por camada (L2): aplicar a proposta revisada e vigas pelo clique no gabarito.
import type { Draft } from 'immer';
import { pavimentosOrdenados, type BuildingModel, type Pilar } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { pilaresSobrepostos, refsPilar } from '../building/pilares';
import { proximaViga } from '../building/vigas';
import { panosDoGrupo } from '../building/lajes';
import { chaveOrigem, vigasDoClique, type Proposta } from '../building/lancamentoDxf';
import { areaPoligono, dentroPoligono, pontoInterno, type P } from '../geom/faces';
import { registrar } from './registry';
import type { JsonSchema } from './schema';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const ponto: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[x, y] em m' };
const anti = (p: P[]): P[] => (areaPoligono(p) < 0 ? [...p].reverse() : p).map((q) => [+q[0].toFixed(6), +q[1].toFixed(6)] as P);
const proximoNumero = (b: BuildingModel) => Math.max(0, ...b.pilares.map((p) => { const m = /^P(\d+)$/.exec(p.nome); return m ? +m[1] : 0; })) + 1;
const proximaLaje = (b: BuildingModel, grupo: string) => Math.max(0, ...b.lajes.filter((l) => l.grupo === grupo).map((l) => { const m = /^L(\d+)$/.exec(l.nome); return m ? +m[1] : 0; })) + 1;
const fmt = (v: number) => String(+v.toFixed(2)).replace('.', ',');

function propostaValida(p: Proposta | undefined): boolean {
  return !!p && typeof p.mascara === 'string' && ['pilares', 'vigas', 'eixos', 'aberturas'].every((k) => Array.isArray((p as unknown as Record<string, unknown>)[k]));
}

registrar<{ grupo: string; mascara: string; proposta: Proposta; excluir?: string[]; nasce?: string; morre?: string; lajes?: boolean }>({
  nome: 'lancamento.aplicar',
  descricao: 'Aplica ao grupo a proposta de lançamento por camada de um gabarito (src/core/building/lancamentoDxf.ts, `propostaDeLancamento`): pilares, vigas, eixos, lajes nos panos fechados (maciças, espessura da proposta) ou no contorno, e aberturas como furos. `excluir` lista as origens que ficam de fora (aplicação parcial). Elementos já lançados (mesma origem) e pilares que se sobrepõem a pilares existentes são pulados; os pilares nascem na fundação (`nasce`) e vão até o pavimento mais alto (`morre`). Um passo no histórico.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'mascara', 'proposta'], properties: {
    grupo: { type: 'string' }, mascara: { type: 'string', description: 'id da máscara de origem' },
    proposta: { type: 'object', description: 'Proposta (src/core/building/lancamentoDxf.ts)' },
    excluir: { type: 'array', items: { type: 'string' }, description: 'origens que não entram' },
    nasce: { type: 'string', description: '"fundacao" (padrão) ou id do pavimento em que os pilares nascem' },
    morre: { type: 'string', description: 'pavimento mais alto dos pilares (padrão: o mais alto da obra)' },
    lajes: { type: 'boolean', default: true, description: 'cria lajes nos panos fechados e no contorno' },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const m = b.mascaras.find((x) => x.id === p.mascara);
    if (!m) return err('MASCARA_INEXISTENTE', `Máscara ${p.mascara} não existe.`);
    if (!propostaValida(p.proposta)) return err('PROPOSTA_INVALIDA', 'Proposta inválida.');
    if (p.proposta.mascara !== m.nome) return err('PROPOSTA_DE_OUTRA_MASCARA', `A proposta é do gabarito “${p.proposta.mascara}”, não de “${m.nome}”.`);
    if (p.proposta.pilares.length) {
      const nasce = p.nasce ?? 'fundacao', morre = p.morre ?? pavimentosOrdenados(b).at(-1)?.id ?? '';
      const r = refsPilar(b, nasce, morre);
      if (r.length) return r;
    }
    return [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    const fora = new Set(p.excluir ?? []);
    const prop = p.proposta;
    const nasce = p.nasce ?? 'fundacao', morre = p.morre ?? pavimentosOrdenados(b).at(-1)?.id ?? '';
    const cont = { pilares: 0, vigas: 0, eixos: 0, lajes: 0, furos: 0, pulados: 0 };
    const jaTem = (o: string) => b.pilares.some((x) => x.origemLancamento === o) || b.vigas.some((x) => x.origemLancamento === o) || b.eixos.some((x) => x.origemLancamento === o) || b.lajes.some((x) => x.origemLancamento === o);
    // nomes lidos do desenho têm prioridade; a numeração automática pula os que a proposta vai usar
    const reservados = new Set(prop.pilares.filter((q) => q.nome && !fora.has(q.origem) && !jaTem(q.origem) && !b.pilares.some((x) => x.nome === q.nome)).map((q) => q.nome!));
    let auto = proximoNumero(b);
    for (const q of prop.pilares) {
      if (fora.has(q.origem) || jaTem(q.origem)) { cont.pulados++; continue; }
      let nome = q.nome && !b.pilares.some((x) => x.nome === q.nome) ? q.nome : '';
      if (!nome) { while (reservados.has(`P${auto}`) || b.pilares.some((x) => x.nome === `P${auto}`)) auto++; nome = `P${auto++}`; }
      const novo: Pilar = { id: novoId(d, 'p'), nome, x: q.x, y: q.y, angulo: q.angulo, ajuste: q.ajuste, nasce, morre, secao: { ...q.secao }, origemLancamento: q.origem };
      if (pilaresSobrepostos(b, novo).length) { d.seq--; cont.pulados++; continue; }
      d.pilares.push(novo);
      cont.pilares++;
    }
    for (const v of prop.vigas) {
      if (fora.has(v.origem) || jaTem(v.origem)) { cont.pulados++; continue; }
      d.vigas.push({ id: novoId(d, 'v'), nome: `V${proximaViga(b, p.grupo)}`, grupo: p.grupo, pontos: v.pontos.map((q) => [q[0], q[1]] as [number, number]), secao: { ...v.secao }, alinhamento: v.alinhamento, origemLancamento: v.origem });
      cont.vigas++;
    }
    for (const e of prop.eixos) {
      if (fora.has(e.origem) || jaTem(e.origem)) { cont.pulados++; continue; }
      d.eixos.push({ id: novoId(d, 'e'), nome: e.nome, p1: [...e.p1], p2: [...e.p2], origemLancamento: e.origem });
      cont.eixos++;
    }
    if (p.lajes !== false) {
      const contorno = prop.contorno && !fora.has(prop.contorno.origem) ? prop.contorno : null;
      const panos = panosDoGrupo(b, p.grupo).filter((pano) => !contorno || dentroPoligono(pontoInterno(pano), contorno.pontos));
      const coberto = (q: P) => b.lajes.some((l) => l.grupo === p.grupo && dentroPoligono(q, l.contorno));
      for (const pano of panos) {
        if (coberto(pontoInterno(pano))) continue;
        d.lajes.push({ id: novoId(d, 'l'), nome: `L${proximaLaje(b, p.grupo)}`, grupo: p.grupo, contorno: anti(pano), tipo: { tipo: 'macica', h: prop.lajeH }, origemLancamento: chaveOrigem(prop.mascara, 'pano', ...pano.flat()) });
        cont.lajes++;
      }
      if (contorno && !panos.length && !coberto(pontoInterno(contorno.pontos as P[])) && !jaTem(contorno.origem)) {
        d.lajes.push({ id: novoId(d, 'l'), nome: `L${proximaLaje(b, p.grupo)}`, grupo: p.grupo, contorno: anti(contorno.pontos as P[]), tipo: { tipo: 'macica', h: prop.lajeH }, origemLancamento: contorno.origem });
        cont.lajes++;
      }
      for (const a of prop.aberturas) {
        if (fora.has(a.origem)) continue;
        const laje = d.lajes.find((l) => l.grupo === p.grupo && a.pontos.every((q) => dentroPoligono(q as P, l.contorno)));
        if (!laje || (laje.furos ?? []).some((f) => f.length === a.pontos.length && f.every((q, i) => Math.hypot(q[0] - a.pontos[i][0], q[1] - a.pontos[i][1]) < 0.01))) { cont.pulados++; continue; }
        laje.furos = [...(laje.furos ?? []), anti(a.pontos as P[])];
        cont.furos++;
      }
    }
    const t = [`${cont.pilares} pilar(es)`, `${cont.vigas} viga(s)`, `${cont.eixos} eixo(s)`, `${cont.lajes} laje(s)`, `${cont.furos} abertura(s)`].join(', ');
    return `Lançamento do gabarito “${prop.mascara}”: ${t}${cont.pulados ? `; ${cont.pulados} item(ns) pulado(s) (já lançados, excluídos ou sobrepostos)` : ''}.`;
  },
});

registrar<{ grupo: string; ponto: P; cursor?: P; modo: 'face' | 'eixo'; secao: { b: number; h: number }; raio?: number }>({
  nome: 'viga.daMascara',
  descricao: 'Gera vigas por um clique no gabarito do grupo: a linha, o arco ou a polilinha de camada capturável mais próxima de `ponto` (até `raio`, padrão 0,3 m) vira uma viga por trecho reto (arco: viga poligonal). Modo `face`: a linha é a face oposta ao `cursor` (o corpo fica do lado do cursor); modo `eixo`: a linha é o eixo. Repetir o mesmo clique não duplica.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['grupo', 'ponto', 'modo', 'secao'], properties: {
    grupo: { type: 'string' }, ponto, cursor: ponto, modo: { type: 'string', enum: ['face', 'eixo'] },
    secao: { type: 'object', additionalProperties: false, required: ['b', 'h'], properties: { b: { type: 'number', exclusiveMinimum: 0, maximum: 3 }, h: { type: 'number', exclusiveMinimum: 0, maximum: 5 } } },
    raio: { type: 'number', exclusiveMinimum: 0, maximum: 5 },
  } },
  validar(b, p) {
    if (!b.grupos.some((g) => g.id === p.grupo)) return err('GRUPO_INEXISTENTE', `Grupo ${p.grupo} não existe.`);
    const v = vigasDoClique(b, p.grupo, p.ponto, p.cursor ?? p.ponto, p.modo, p.raio);
    if (!v.length) return err('SEM_GEOMETRIA_NO_CLIQUE', 'Nenhuma linha, arco ou polilinha do gabarito perto do clique.');
    return v.every((x) => b.vigas.some((y) => y.origemLancamento === x.origem)) ? err('VIGA_JA_LANCADA', 'As vigas desse clique já foram lançadas.') : [];
  },
  aplicar(d, p) {
    const lista = vigasDoClique(d as BuildingModel, p.grupo, p.ponto, p.cursor ?? p.ponto, p.modo, p.raio);
    let n = 0;
    for (const v of lista) {
      if (d.vigas.some((y) => y.origemLancamento === v.origem)) continue;
      d.vigas.push({ id: novoId(d, 'v'), nome: `V${proximaViga(d as BuildingModel, p.grupo)}`, grupo: p.grupo, pontos: v.pontos.map((q) => [q[0], q[1]] as [number, number]), secao: { ...p.secao }, alinhamento: v.alinhamento, origemLancamento: v.origem });
      n++;
    }
    return `${n} viga(s) lançada(s) pelo gabarito (${p.modo === 'face' ? 'pela face' : 'pelo eixo'}; ${fmt(p.secao.b * 100)} × ${fmt(p.secao.h * 100)} cm).`;
  },
});
