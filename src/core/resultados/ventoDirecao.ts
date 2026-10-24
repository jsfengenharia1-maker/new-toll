// Vento por direção, distorção por pavimento e vento na malha (V7c, K1.11.50 e K1.15.3-1). Núcleo puro.
// Valores característicos do caso de vento; a verificação do limite usa a combinação frequente (ψ1 do vento).
import type { AnaliseEdificio } from '../building/analitico';
import { pavimentosOrdenados, type BuildingModel } from '../building/types';
import { dentroPoligono, type P } from '../geom/faces';
import { lancesDoPortico } from './consultas';

export interface VentoPavimento {
  pavimento: string; pavimentoNome: string; z: number; altura: number;
  /** Maior |u| do topo dos pilares na direção do vento (m, característico) e o pilar. */
  u: number; pilarU: string;
  /** Maior deslocamento relativo do lance na direção do vento (m, característico), o pilar e a distorção = Δ ÷ altura. */
  drift: number; pilarDrift: string; distorcao: number;
  /** Valores na combinação frequente (ψ1 × característico) e o limite entre pavimentos hi ÷ limiteDeslocPavimento (m). */
  uFreq: number; driftFreq: number; limDrift: number; ok: boolean;
}

export interface VentoDirecao {
  caso: string; direcao: number; psi1: number;
  pavimentos: VentoPavimento[];
  /** Altura acima da base (m), deslocamento do topo na combinação frequente e o limite H ÷ limiteDeslocTopo. */
  H: number; topoFreq: number; limTopo: number; ok: boolean;
}

/**
 * Deslocamento do vento por direção (um caso por direção) e distorção por pavimento: o topo de cada lance de pilar
 * na direção do vento (|ux| para 0° e 180°, |uy| para 90° e 270°), o deslocamento relativo do lance e a distorção Δ/h.
 */
export function ventoPorDirecao(b: BuildingModel, an: AnaliseEdificio): VentoDirecao[] {
  const ven = an.vento, pm = an.portico;
  if (!ven || !pm.resVento || pm.resVento.erro) return [];
  const pavs = pavimentosOrdenados(b), lances = lancesDoPortico(an), op = an.opcoes;
  const psi1 = ven.deslocamentos?.[0]?.psi1 ?? 0.3;
  const zBase = lances.length ? Math.min(...lances.map((l) => l.zBase)) : 0;
  const out: VentoDirecao[] = [];
  ven.casos.forEach((cv, ic) => {
    const u = pm.resVento!.desloc[ic];
    if (!u) return;
    const ix = cv.direcao === 0 || cv.direcao === 180 ? 0 : 1;
    const porPav = new Map<string, VentoPavimento>();
    for (const { t, base, topo, zBase: z0, zTopo } of lances) {
      const altura = zTopo - z0, pav = pavs.find((p) => p.id === t.pavimento);
      const r = porPav.get(t.pavimento) ?? { pavimento: t.pavimento, pavimentoNome: pav?.nome ?? t.pavimento, z: zTopo - zBase, altura, u: 0, pilarU: '', drift: 0, pilarDrift: '', distorcao: 0, uFreq: 0, driftFreq: 0, limDrift: 0, ok: true };
      porPav.set(t.pavimento, r);
      const ut = Math.abs(u[topo * 6 + ix]), rel = Math.abs(u[topo * 6 + ix] - u[base * 6 + ix]);
      if (ut > r.u) { r.u = ut; r.pilarU = t.ref; }
      if (altura > 0 && rel / altura > r.distorcao) { r.drift = rel; r.distorcao = rel / altura; r.pilarDrift = t.ref; r.altura = altura; }
    }
    const pavimentos = [...porPav.values()].sort((p, q) => p.z - q.z);
    for (const p of pavimentos) {
      p.uFreq = p.u * psi1; p.driftFreq = p.drift * psi1; p.limDrift = p.altura / op.limiteDeslocPavimento;
      p.ok = p.driftFreq <= p.limDrift + 1e-12;
    }
    const H = pavimentos.length ? pavimentos.at(-1)!.z : 0, topoFreq = pavimentos.length ? pavimentos.at(-1)!.uFreq : 0, limTopo = H / op.limiteDeslocTopo;
    out.push({ caso: cv.nome, direcao: cv.direcao, psi1, pavimentos, H, topoFreq, limTopo, ok: topoFreq <= limTopo + 1e-12 && pavimentos.every((p) => p.ok) });
  });
  return out;
}

export interface LinhaMalhaVento { pavimento: string; pavimentoNome: string; laje: string; no: number; x: number; y: number; caso: string; ux: number; uy: number; rz: number }

/**
 * Deslocamento horizontal de cada nó da malha de cada pavimento para cada caso de vento: o pavimento é um diafragma
 * rígido no plano, então o nó da malha segue o movimento de corpo rígido do topo de pilar mais próximo
 * (u = u₀ + rz × (p − p₀)). Com vários diafragmas independentes no pavimento, vale o do pilar mais próximo (a confirmar).
 */
export function deslocamentosVentoMalha(b: BuildingModel, an: AnaliseEdificio): LinhaMalhaVento[] {
  const pm = an.portico, ven = an.vento;
  if (!ven || !pm.resVento || pm.resVento.erro) return [];
  const lances = lancesDoPortico(an), out: LinhaMalhaVento[] = [];
  for (const pav of pavimentosOrdenados(b)) {
    const g = an.grelhas.find((x) => x.pavimento === pav.id);
    if (!g || !g.res || g.res.erro) continue;
    const tops = lances.filter((l) => l.t.pavimento === pav.id).map((l) => ({ no: l.topo, p: pm.modelo.nos[l.topo] }));
    if (!tops.length) continue;
    const lajes = b.lajes.filter((l) => l.grupo === pav.grupo);
    g.modelo.nos.forEach((n, i) => {
      let ref = tops[0], dm = Infinity;
      for (const q of tops) { const d = Math.hypot(q.p[0] - n[0], q.p[1] - n[1]); if (d < dm) { dm = d; ref = q; } }
      const laje = lajes.find((l) => dentroPoligono([n[0], n[1]] as P, l.contorno as P[]))?.id ?? '';
      ven.casos.forEach((cv, ic) => {
        const u = pm.resVento!.desloc[ic];
        if (!u) return;
        const ux0 = u[ref.no * 6], uy0 = u[ref.no * 6 + 1], rz = u[ref.no * 6 + 5];
        out.push({ pavimento: pav.id, pavimentoNome: pav.nome, laje, no: i, x: n[0], y: n[1], caso: cv.nome, ux: ux0 - rz * (n[1] - ref.p[1]), uy: uy0 + rz * (n[0] - ref.p[0]), rz });
      });
    });
  }
  return out;
}

export interface MaximoPanoVento { laje: string; nome: string; pavimento: string; pavimentoNome: string; casos: Record<string, { ux: number; uy: number; u: number; x: number; y: number }> }

/** Maior deslocamento horizontal (módulo de ux, uy) dos nós da malha de cada pano, por caso de vento. */
export function maximosVentoPorPano(b: BuildingModel, linhas: LinhaMalhaVento[]): MaximoPanoVento[] {
  const out: MaximoPanoVento[] = [];
  for (const pav of pavimentosOrdenados(b)) {
    for (const l of b.lajes.filter((x) => x.grupo === pav.grupo)) {
      const casos: MaximoPanoVento['casos'] = {};
      for (const q of linhas) {
        if (q.pavimento !== pav.id || q.laje !== l.id) continue;
        const u = Math.hypot(q.ux, q.uy), a = casos[q.caso];
        if (!a || u > a.u) casos[q.caso] = { ux: q.ux, uy: q.uy, u, x: q.x, y: q.y };
      }
      if (Object.keys(casos).length) out.push({ laje: l.id, nome: l.nome, pavimento: pav.id, pavimentoNome: pav.nome, casos });
    }
  }
  return out;
}

/** CSV (separador `;`, vírgula decimal, deslocamentos em mm) do vento nos nós da malha. */
export function csvDeslocamentosVento(linhas: LinhaMalhaVento[]): string {
  const f = (v: number, d = 3) => v.toFixed(d).replace('.', ',');
  const cab = 'Pavimento;Laje;No;X (m);Y (m);Caso;ux (mm);uy (mm)';
  return [cab, ...linhas.map((l) => [l.pavimentoNome, l.laje, l.no, f(l.x), f(l.y), l.caso, f(l.ux * 1000), f(l.uy * 1000)].join(';'))].join('\n');
}
