// Paredes de concreto (E1c): regras de lançamento e diagnósticos. A conversão em pilar-parede virtual, as aberturas e as
// pressões de empuxo estão em `paredesBase.ts`; a malha e as cascas reaproveitam `pilarParede.ts`/`pilarParedeModelo.ts`.
//
// Diagnósticos:
//  - PAREDE_GEOMETRIA (erro): menos de 2 vértices, trecho menor que 5 cm ou espessura menor que 5 cm;
//  - PAREDE_SEM_LANCE (erro): morre abaixo ou no pavimento em que nasce;
//  - PAREDE_ABERTURA (erro): abertura fora da parede, atravessando um vértice, sem lintel ou num lance que a parede não tem;
//  - PAREDE_ABERTURA_BARRA (aviso): abertura num trecho curto (barra), desconsiderada;
//  - PAREDE_TRECHO_CURTO (info): trecho com comprimento < `pilarParedeLimite` × espessura tratado como pilar (K1.3.32);
//  - PAREDE_SOBREPOSTA (erro): parede sobre outra parede ou pilar-parede; PAREDE_PILAR (aviso): pilar dentro da parede;
//  - PAREDE_EMPUXO (erro): empuxo sem caso, caso de terra sem tipo de empuxo;
//  - PAREDE_EMPUXO_DIAFRAGMA (aviso, K1.9.107): parede com empuxo e laje treliçada com vigotas paralelas a ela;
//  - PAREDE_BASE_VIGA (aviso, FU7c): base em viga de fundação numa parede que não nasce na fundação;
//  - PAREDE_FORA_DIAFRAGMA (info, K1.2.5/K1.3.36): nível em que a parede não toca laje (fora do diafragma);
//  - VIGA_EMBUTIDA (erro): viga embutida em parede inexistente ou fora do eixo dela;
//  - ALV_* e MURO_PILAR_* (E1e): paredes de alvenaria e de blocos, em `alvenaria.ts`.
import { ehNervurada } from './tiposLaje';
import type { P } from '../geom/faces';
import { direcaoMenorVao } from './lajes';
import { opcoesEmUso, perfilDe } from './opcoes';
import { contornoDoLado, cruzaPoligonos, ladosDoPP, lancesDoPP } from './pilarParede';
import { diagnosticosAlvenaria } from './alvenaria';
import { furosDaParede, niveisDaParede, paredeTocaLaje, ppDaParede } from './paredesBase';
import { contornoNoLance, lancesDoPilar, type BuildingModel, type Parede } from './types';
import type { Diagnostico } from './verify';

const fmt = (v: number) => String(+v.toFixed(2)).replace('.', ',');
const distReta = (p: P, a: P, z: P) => { const L = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1; return Math.abs((z[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (z[1] - a[1])) / L; };

/** Espessuras totais da parede (a média e as por pavimento). */
const espessuras = (w: Parede) => [w.esq + w.dir, ...(w.porPavimento ?? []).map((e) => e.esq + e.dir)];

/** Diagnósticos geométricos e de referências de uma parede (sem cruzar com os outros elementos). */
export function errosProprios(b: BuildingModel, w: Parede): Diagnostico[] {
  const d: Diagnostico[] = [];
  const e = (codigo: string, mensagem: string): Diagnostico => ({ codigo, severidade: 'erro', elementos: [w.id], mensagem: `${w.nome}: ${mensagem}` });
  if (w.pontos.length < 2) return [e('PAREDE_GEOMETRIA', 'a parede precisa de 2 vértices ou mais.')];
  for (let i = 0; i + 1 < w.pontos.length; i++) if (Math.hypot(w.pontos[i + 1][0] - w.pontos[i][0], w.pontos[i + 1][1] - w.pontos[i][1]) < 0.05) return [e('PAREDE_GEOMETRIA', `trecho ${i + 1} menor que 5 cm.`)];
  if (espessuras(w).some((t) => t < 0.05)) return [e('PAREDE_GEOMETRIA', 'espessura total menor que 5 cm.')];
  if (!niveisDaParede(b, w).zs.length) return [e('PAREDE_SEM_LANCE', 'a parede precisa morrer acima do pavimento em que nasce.')];
  for (const r of furosDaParede(b, w).ruins) d.push({ codigo: 'PAREDE_ABERTURA', severidade: 'erro', elementos: [w.id, r.a.id], mensagem: `${w.nome}: ${r.motivo}.` });
  for (const em of w.empuxos ?? []) {
    const caso = b.casos?.find((c) => c.id === em.caso) ?? (['G', 'Q'].includes(em.caso) ? { id: em.caso, natureza: em.caso } : undefined);
    if (!caso) { d.push(e('PAREDE_EMPUXO', `o caso ${em.caso} do empuxo não existe.`)); continue; }
    if (!em.liquido && !('empuxo' in caso && caso.empuxo && b.empuxos?.some((t) => t.id === caso.empuxo))) d.push(e('PAREDE_EMPUXO', `o caso ${'nome' in caso ? caso.nome : caso.id} não tem tipo de empuxo de terra (caso H com tipo) e o empuxo não é de líquido.`));
  }
  return d;
}

/** Regras de lançamento das paredes (vazio sem paredes). */
export function diagnosticosParedes(b: BuildingModel): Diagnostico[] {
  const d: Diagnostico[] = [];
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const validas: Parede[] = [];
  for (const w of b.paredes ?? []) {
    const proprios = errosProprios(b, w);
    d.push(...proprios);
    if (proprios.some((x) => x.codigo === 'PAREDE_GEOMETRIA' || x.codigo === 'PAREDE_SEM_LANCE')) continue;
    validas.push(w);
    const pp = ppDaParede(w), lados = ladosDoPP(b, pp, op.pilarParedeLimite), furos = furosDaParede(b, w).porTrecho;
    for (const g of lados) if (!g.casca) {
      d.push({ codigo: 'PAREDE_TRECHO_CURTO', severidade: 'info', elementos: [w.id], mensagem: `${g.nome}: trecho de ${fmt(g.L * 100)} cm com espessura até ${fmt(g.tMax * 100)} cm (< ${fmt(op.pilarParedeLimite)} × a espessura) tratado como pilar (barra).` });
      if (furos[g.i]?.length) d.push({ codigo: 'PAREDE_ABERTURA_BARRA', severidade: 'aviso', elementos: [w.id, ...furos[g.i].map((f) => f.id)], mensagem: `${g.nome}: abertura num trecho tratado como pilar (barra), desconsiderada no modelo.` });
    }
    // pilares dentro da parede
    const lances = lancesDoPP(b, pp);
    for (const q of b.pilares) for (const lq of lancesDoPilar(b, q)) {
      if (!lances.some((x) => x.id === lq.id)) continue;
      if (lados.some((g) => cruzaPoligonos(contornoDoLado(g, lq.id), contornoNoLance(q, lq.id)))) { d.push({ codigo: 'PAREDE_PILAR', severidade: 'aviso', elementos: [w.id, q.id], mensagem: `${w.nome} se sobrepõe ao pilar ${q.nome} em ${b.pavimentos.find((x) => x.id === lq.id)?.nome ?? lq.id}: a rigidez da parte comum conta duas vezes; termine a parede na face do pilar.` }); break; }
    }
    // fora do diafragma (K1.2.5, K1.3.36)
    for (const l of lances) if (!paredeTocaLaje(b, w, l.id)) d.push({ codigo: 'PAREDE_FORA_DIAFRAGMA', severidade: 'info', elementos: [w.id], mensagem: `${w.nome} não toca laje em ${l.nome}: fora do diafragma rígido nesse nível.` });
    // empuxo × vigotas paralelas (K1.9.107)
    if (w.empuxos?.length) for (const l of lances) for (const lj of b.lajes.filter((x) => x.grupo === l.grupo && ehNervurada(x.tipo))) {
      const dir = ((lj.direcao ?? direcaoMenorVao(lj.contorno)) * Math.PI) / 180, u: P = [Math.cos(dir), Math.sin(dir)], tol = Math.max(...espessuras(w)) / 2 + 0.05;
      const toca = w.pontos.slice(1).some((z, i) => {
        const a = w.pontos[i] as P, L = Math.hypot(z[0] - a[0], z[1] - a[1]), cos = Math.abs(((z[0] - a[0]) * u[0] + (z[1] - a[1]) * u[1]) / L);
        return cos > Math.cos((15 * Math.PI) / 180) && lj.contorno.some((c, k) => { const c2 = lj.contorno[(k + 1) % lj.contorno.length]; return distReta(c as P, a, z as P) <= tol && distReta(c2 as P, a, z as P) <= tol; });
      });
      if (toca) d.push({ codigo: 'PAREDE_EMPUXO_DIAFRAGMA', severidade: 'aviso', elementos: [w.id, lj.id], mensagem: `${w.nome} tem empuxo e a laje ${lj.nome} (${l.nome}) tem vigotas paralelas a ela: a rigidez do diafragma junto à parede depende de faixa maciça ou enchimento de concreto, a detalhar à parte.` });
    }
  }
  // sobreposição entre paredes e com pilares-parede
  const todos = [...validas.map((w) => ({ id: w.id, nome: w.nome, pp: ppDaParede(w) })), ...(b.pilaresParede ?? []).map((pp) => ({ id: pp.id, nome: pp.nome, pp }))];
  for (let i = 0; i < validas.length; i++) for (let j = i + 1; j < todos.length; j++) {
    const A = todos[i], B = todos[j], la = lancesDoPP(b, A.pp), lb = lancesDoPP(b, B.pp), comum = la.find((x) => lb.some((y) => y.id === x.id));
    if (!comum) continue;
    const ga = ladosDoPP(b, A.pp), gb = ladosDoPP(b, B.pp);
    if (ga.some((x) => gb.some((y) => cruzaPoligonos(contornoDoLado(x, comum.id), contornoDoLado(y, comum.id), 0.02) && !vizinhos(x, y)))) d.push({ codigo: 'PAREDE_SOBREPOSTA', severidade: 'erro', elementos: [A.id, B.id], mensagem: `${A.nome} e ${B.nome} se sobrepõem.` });
  }
  // base da parede em viga de fundação (FU7c): só vale para a parede que nasce na fundação
  for (const w of validas) if (w.base?.tipo === 'viga' && w.nasce !== 'fundacao') d.push({ codigo: 'PAREDE_BASE_VIGA', severidade: 'aviso', elementos: [w.id], mensagem: `${w.nome}: a base em viga de fundação só vale para a parede que nasce na fundação (esta nasce em ${w.nasce}); a base foi ignorada.` });
  // vigas embutidas
  for (const v of b.vigas) if (v.embutida) {
    const w = b.paredes?.find((x) => x.id === v.embutida);
    if (!w) { d.push({ codigo: 'VIGA_EMBUTIDA', severidade: 'erro', elementos: [v.id], mensagem: `${v.nome}: a parede ${v.embutida} em que a viga está embutida não existe.` }); continue; }
    if (!vigaSobreParede(v.pontos as P[], w)) d.push({ codigo: 'VIGA_EMBUTIDA', severidade: 'erro', elementos: [v.id, w.id], mensagem: `${v.nome}: a viga embutida não corre sobre o eixo de ${w.nome}.` });
  }
  d.push(...diagnosticosAlvenaria(b));
  return d;
}

/** Lados que só se tocam pelo vértice comum (canto ou T da mesma junção) não contam como sobreposição. */
function vizinhos(a: { a: P; z: P }, c: { a: P; z: P }) {
  // ponta de um sobre o eixo do outro (canto, T ou continuação)
  const sobre = (p: P, s: { a: P; z: P }) => {
    const dx = s.z[0] - s.a[0], dy = s.z[1] - s.a[1], L2 = dx * dx + dy * dy || 1, t = ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dy) / L2;
    return t >= -1e-6 && t <= 1 + 1e-6 && Math.hypot(p[0] - s.a[0] - t * dx, p[1] - s.a[1] - t * dy) < 1e-3;
  };
  const ux = a.z[0] - a.a[0], uy = a.z[1] - a.a[1], vx = c.z[0] - c.a[0], vy = c.z[1] - c.a[1], La = Math.hypot(ux, uy), Lc = Math.hypot(vx, vy);
  if (Math.abs(ux * vy - uy * vx) / (La * Lc) < 1e-3) {
    // paralelos: só a continuação (intervalos que se tocam na ponta) não é sobreposição
    const pr = (p: P) => ((p[0] - a.a[0]) * ux + (p[1] - a.a[1]) * uy) / La, s0 = Math.min(pr(c.a), pr(c.z)), s1 = Math.max(pr(c.a), pr(c.z));
    return Math.min(La, s1) - Math.max(0, s0) < 1e-3;
  }
  return sobre(a.a, c) || sobre(a.z, c) || sobre(c.a, a) || sobre(c.z, a);
}

/** Todos os vértices da viga a até meia espessura + 2 cm de algum trecho da parede? */
export function vigaSobreParede(pts: P[], w: Parede): boolean {
  const tol = Math.max(...espessuras(w)) / 2 + 0.02;
  const dist = (p: P) => Math.min(...w.pontos.slice(1).map((z, i) => {
    const a = w.pontos[i], dx = z[0] - a[0], dy = z[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }));
  return pts.every((p) => dist(p) <= tol);
}
