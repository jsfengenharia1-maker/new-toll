// Comando da importação de IFC (L3, C1.22 e C1.23): aplica a proposta revisada (src/core/ifc/proposta.ts) criando os grupos
// e pavimentos que faltam, os pilares contínuos, as vigas, as lajes nos panos fechados (ou no contorno), as aberturas, as
// paredes de concreto e os materiais por tipo de elemento. Reimportar o mesmo arquivo não duplica (origem `ifc:<GlobalId>`).
import type { Draft } from 'immer';
import { pavimentosOrdenados, qDoUso, type BuildingModel, type Parede, type Pilar } from '../building/types';
import type { Diagnostico } from '../building/verify';
import { pilaresSobrepostos } from '../building/pilares';
import { proximaViga } from '../building/vigas';
import { panosDoGrupo } from '../building/lajes';
import { dentroPoligono, pontoInterno, areaPoligono, type P } from '../geom/faces';
import type { PropostaIfc } from '../ifc/proposta';
import { registrar } from './registry';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const novoId = (d: Draft<BuildingModel>, pre: string) => `${pre}_${(++d.seq).toString(36)}`;
const anti = (p: P[]): P[] => (areaPoligono(p) < 0 ? [...p].reverse() : p).map((q) => [+q[0].toFixed(6), +q[1].toFixed(6)] as P);
const proximoNumero = (b: BuildingModel) => Math.max(0, ...b.pilares.map((p) => { const m = /^P(\d+)$/.exec(p.nome); return m ? +m[1] : 0; })) + 1;
const proximaLaje = (b: BuildingModel, grupo: string) => Math.max(0, ...b.lajes.filter((l) => l.grupo === grupo).map((l) => { const m = /^L(\d+)$/.exec(l.nome); return m ? +m[1] : 0; })) + 1;
const proximaParede = (b: BuildingModel) => Math.max(0, ...(b.paredes ?? []).map((w) => { const m = /^M(\d+)$/.exec(w.nome); return m ? +m[1] : 0; })) + 1;
const fnv = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };

function propostaValida(p: PropostaIfc | undefined): string | null {
  if (!p || typeof p !== 'object') return 'Proposta ausente.';
  for (const k of ['grupos', 'pavimentos', 'pilares', 'vigas', 'lajes', 'paredes'] as const) if (!Array.isArray(p[k])) return `Proposta sem a lista “${k}”.`;
  if (typeof p.arquivo !== 'string') return 'Proposta sem o nome do arquivo.';
  const gs = new Set(p.grupos.map((g) => g.chave)), ps = new Set(p.pavimentos.map((x) => x.chave));
  if (gs.size !== p.grupos.length || ps.size !== p.pavimentos.length) return 'Chaves repetidas na proposta.';
  if (p.pavimentos.some((x) => !gs.has(x.grupo))) return 'Pavimento com grupo inexistente na proposta.';
  if (p.pavimentos.some((x, i) => p.pavimentos.findIndex((y) => Math.abs(y.cota - x.cota) < 0.005) !== i)) return 'Dois pavimentos na mesma cota.';
  for (const x of [...p.pilares, ...p.paredes]) if ((x.nasce !== 'fundacao' && !ps.has(x.nasce)) || !ps.has(x.morre)) return `Elemento ${x.origem} com pavimento inexistente na proposta.`;
  for (const x of p.pilares) for (const s of x.secoes ?? []) if (!ps.has(s.pavimento)) return `Pilar ${x.origem} com seção em pavimento inexistente.`;
  for (const x of [...p.vigas, ...p.lajes]) if (!gs.has(x.grupo)) return `Elemento ${x.origem} com grupo inexistente na proposta.`;
  return null;
}

registrar<{ proposta: PropostaIfc; excluir?: string[]; lajes?: boolean }>({
  nome: 'ifc.importar',
  descricao: 'Aplica a proposta de lançamento de um arquivo IFC (src/core/ifc/proposta.ts, `propostaIfc`, sobre a leitura de `lerIfc`): cria os grupos e pavimentos que faltam (pavimento existente na mesma cota é reaproveitado), os pilares contínuos entre pavimentos (nascem na fundação ou no pavimento da base e vão até o pavimento do topo), as vigas dos grupos, as lajes maciças nos panos fechados por vigas dentro de cada IfcSlab (ou no contorno do IfcSlab, quando não há panos) com as aberturas, as paredes de concreto e o fck e o aço por tipo de elemento (pilar, viga, laje, fundação). `excluir` lista as origens que ficam de fora. Elementos já lançados (mesma origem `ifc:<GlobalId>`) e pilares sobrepostos a pilares existentes são pulados. Um passo no histórico. A leitura do arquivo (web-ifc) é feita pelo app; este comando só recebe a proposta.',
  risco: 'escrita',
  mcp: false,
  schema: { type: 'object', additionalProperties: false, required: ['proposta'], properties: {
    proposta: { type: 'object', description: 'PropostaIfc (src/core/ifc/proposta.ts)' },
    excluir: { type: 'array', items: { type: 'string' }, description: 'origens que não entram' },
    lajes: { type: 'boolean', default: true, description: 'cria lajes nos panos fechados e no contorno' },
  } },
  validar(_b, p) {
    const e = propostaValida(p.proposta);
    return e ? err('PROPOSTA_INVALIDA', e) : [];
  },
  aplicar(d, p) {
    const b = d as BuildingModel;
    const prop = p.proposta;
    const fora = new Set(p.excluir ?? []);
    const vazia = !b.pavimentos.length && !b.pilares.length && !b.vigas.length;
    const cont = { pavimentos: 0, pilares: 0, vigas: 0, lajes: 0, paredes: 0, furos: 0, pulados: 0 };

    // pavimentos e grupos
    const grupoId = new Map<string, string>(), pavId = new Map<string, string>();
    for (const pv of prop.pavimentos) {
      const existente = d.pavimentos.find((x) => Math.abs(x.cota - pv.cota) < 0.005);
      if (existente) { pavId.set(pv.chave, existente.id); if (!grupoId.has(pv.grupo)) grupoId.set(pv.grupo, existente.grupo); continue; }
      if (!grupoId.has(pv.grupo)) {
        const g = prop.grupos.find((x) => x.chave === pv.grupo)!;
        const id = novoId(d, 'g');
        d.grupos.push({ id, nome: g.nome, uso: g.uso, gRev: 1.0, q: qDoUso(g.uso) });
        grupoId.set(pv.grupo, id);
      }
      const id = novoId(d, 'pav');
      d.pavimentos.push({ id, nome: pv.nome, cota: pv.cota, grupo: grupoId.get(pv.grupo)! });
      pavId.set(pv.chave, id);
      cont.pavimentos++;
    }
    d.pavimentos.sort((a, z) => a.cota - z.cota);
    const nPav = (c: string) => (c === 'fundacao' ? 'fundacao' : pavId.get(c)!);
    const topo = pavimentosOrdenados(b).at(-1)?.id ?? '';

    // materiais por tipo de elemento
    const n = d.norma;
    const fck = (k: 'pilar' | 'viga' | 'laje' | 'fundacao', v: number | undefined) => { if (v === undefined) return; n.fckElem ??= {}; if (v === n.fck) delete n.fckElem[k]; else n.fckElem[k] = v; };
    const aco = (ks: (keyof NonNullable<typeof n.acoPos>)[], v: 'CA-50' | 'CA-60' | undefined) => { if (!v) return; n.acoPos ??= {}; for (const k of ks) { if (v === n.aco) delete n.acoPos[k]; else n.acoPos[k] = v; } };
    const mat = prop.materiais ?? {};
    fck('pilar', mat.pilar?.fck); fck('viga', mat.viga?.fck); fck('laje', mat.laje?.fck); fck('fundacao', mat.fundacao?.fck);
    aco(['pilarLong', 'pilarEstribo'], mat.pilar?.aco); aco(['vigaPos', 'vigaNeg', 'vigaEstribo'], mat.viga?.aco); aco(['lajeInf', 'lajeSup'], mat.laje?.aco); aco(['fundacao'], mat.fundacao?.aco);
    if (n.fckElem && !Object.keys(n.fckElem).length) delete n.fckElem;
    if (n.acoPos && !Object.keys(n.acoPos).length) delete n.acoPos;

    const jaTem = (o: string) => b.pilares.some((x) => x.origemLancamento === o) || b.vigas.some((x) => x.origemLancamento === o) || b.lajes.some((x) => x.origemLancamento === o) || (b.paredes ?? []).some((x) => x.origemLancamento === o);

    // pilares
    for (const q of prop.pilares) {
      if (fora.has(q.origem) || jaTem(q.origem)) { cont.pulados++; continue; }
      const novo: Pilar = {
        id: novoId(d, 'p'), nome: `P${proximoNumero(b)}`, x: q.x, y: q.y, angulo: q.angulo, ajuste: 'c', nasce: nPav(q.nasce), morre: nPav(q.morre) || topo,
        secao: { ...q.secao }, origemLancamento: q.origem,
        ...(q.secoes?.length ? { secoes: q.secoes.map((s) => ({ pavimento: pavId.get(s.pavimento)!, secao: { ...s.secao } })) } : {}),
      };
      if (pilaresSobrepostos(b, novo).length) { d.seq--; cont.pulados++; continue; }
      d.pilares.push(novo);
      cont.pilares++;
    }
    // vigas
    for (const v of prop.vigas) {
      if (fora.has(v.origem) || jaTem(v.origem)) { cont.pulados++; continue; }
      const grupo = grupoId.get(v.grupo)!;
      d.vigas.push({ id: novoId(d, 'v'), nome: `V${proximaViga(b, grupo)}`, grupo, pontos: v.pontos.map((q) => [q[0], q[1]] as [number, number]), secao: { ...v.secao }, alinhamento: 'centro', origemLancamento: v.origem });
      cont.vigas++;
    }
    // paredes de concreto
    for (const w of prop.paredes) {
      if (fora.has(w.origem) || jaTem(w.origem)) { cont.pulados++; continue; }
      const nova: Parede = {
        id: novoId(d, 'pw'), nome: `M${proximaParede(b)}`, tipo: 'concreto', pontos: w.pontos.map((q) => [q[0], q[1]] as [number, number]),
        esq: w.espessura / 2, dir: w.espessura / 2, nasce: nPav(w.nasce), morre: nPav(w.morre), origemLancamento: w.origem,
      };
      (d.paredes ??= []).push(nova);
      cont.paredes++;
    }
    // lajes: panos fechados por vigas dentro de cada IfcSlab; sem panos, o contorno do IfcSlab
    if (p.lajes !== false) {
      for (const s of prop.lajes) {
        if (fora.has(s.origem)) continue;
        const grupo = grupoId.get(s.grupo)!;
        const coberto = (q: P) => b.lajes.some((l) => l.grupo === grupo && dentroPoligono(q, l.contorno));
        const contorno = s.contorno as P[], furos = s.furos as P[][];
        // o pano entra se o ponto interno cai no contorno do IfcSlab e o pano não está inteiro dentro de uma abertura
        const panos = panosDoGrupo(b, grupo).filter((pano) => dentroPoligono(pontoInterno(pano), contorno) && !furos.some((f) => pano.every((q) => dentroPoligono(q, f))));
        const furosDo = (pano: P[]) => furos.filter((f) => f.every((q) => dentroPoligono(q, pano)));
        if (panos.length) {
          for (const pano of panos) {
            if (coberto(pontoInterno(pano))) continue;
            const fs = furosDo(pano).map(anti);
            d.lajes.push({ id: novoId(d, 'l'), nome: `L${proximaLaje(b, grupo)}`, grupo, contorno: anti(pano), ...(fs.length ? { furos: fs } : {}), tipo: { tipo: 'macica', h: s.h }, origemLancamento: `${s.origem}:${fnv(pano.flat().map((x) => Math.round(x * 1000)).join(','))}` });
            cont.lajes++; cont.furos += fs.length;
          }
        } else if (!jaTem(s.origem) && !coberto(pontoInterno(contorno))) {
          const fs = furos.map(anti);
          d.lajes.push({ id: novoId(d, 'l'), nome: `L${proximaLaje(b, grupo)}`, grupo, contorno: anti(contorno), ...(fs.length ? { furos: fs } : {}), tipo: { tipo: 'macica', h: s.h }, origemLancamento: s.origem });
          cont.lajes++; cont.furos += fs.length;
        }
      }
    }

    if (vazia) { d.obra.origem = 'ifc'; if (prop.obra?.nome?.trim()) d.obra.nome = prop.obra.nome.trim(); if (prop.obra?.cidade) d.obra.cidade = prop.obra.cidade; }
    const tipos = ['pilar', 'viga', 'laje', 'fundacao'] as const;
    d.obra.ifc = {
      arquivo: prop.arquivo, esquema: prop.esquema, unidade: prop.unidade, deslocamento: [...(prop.deslocamento ?? [0, 0])] as [number, number],
      materiais: tipos.map((t) => ({ tipo: t, ...(mat[t]?.material ? { material: mat[t]!.material } : {}), ...(mat[t]?.fck !== undefined ? { fck: mat[t]!.fck } : {}), ...(mat[t]?.aco ? { aco: mat[t]!.aco } : {}) })),
      classes: { ...(prop.classes ?? {}) },
      lancados: { ...cont, extremosAjustados: prop.contagens?.extremosAjustados ?? 0 },
      ignorados: (prop.ignorados ?? []).map((x) => ({ ...x })),
      ambiguos: (prop.ambiguos ?? []).map((x) => x.mensagem),
      avisos: [...(prop.avisos ?? [])],
    };
    const t = [`${cont.pavimentos} pavimento(s)`, `${cont.pilares} pilar(es)`, `${cont.vigas} viga(s)`, `${cont.lajes} laje(s)`, `${cont.furos} abertura(s)`, `${cont.paredes} parede(s)`].join(', ');
    return `Importação do IFC “${prop.arquivo}”: ${t}${cont.pulados ? `; ${cont.pulados} item(ns) pulado(s) (já lançados, excluídos ou sobrepostos)` : ''}.`;
  },
});
