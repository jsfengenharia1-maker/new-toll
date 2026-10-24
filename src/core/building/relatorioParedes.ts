// Relatório de esforços e armaduras de pilares-parede, paredes de concreto e muros (E5i, C4.63): esforços resultantes por lado e
// lance (extremos ELU com a combinação), cargas na base, armadura por pano com a verificação de cortante, lados curtos em barra e muros
// de arrimo. Tabelas prontas (vírgula decimal) para a interface (HTML e CSV). O pilar de concreto tem o relatório próprio (R7g).
import type { Dimensionamento } from './dimensionamento';
import type { TabelaRelatorio } from './escadasRelatorio';
import { linhasMuros, SITUACAO } from './paredesLista';
import type { Extremo } from './pilarParedeEsforcos';
import type { BuildingModel } from './types';

const n = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',');
const phi = (x: { phi: number; s: number } | null) => (x ? `φ${n(x.phi, 1)} c/${n(x.s * 100, 0)}` : '—');
const ext = (e: Extremo | undefined) => (e ? `${n(e.min, 1)} (${e.cMin}) / ${n(e.max, 1)} (${e.cMax})` : '—');

export interface RelatorioParedes { tabelas: TabelaRelatorio[] }

/** Tabelas do relatório (vazias quando a obra não tem pilares-parede, paredes de concreto nem muros de arrimo). */
export function relatorioParedes(b: BuildingModel, dim: Pick<Dimensionamento, 'pilaresParede' | 'paredes' | 'armaduraParedes' | 'muros'>): RelatorioParedes {
  const tabelas: TabelaRelatorio[] = [];
  const res = [...(dim.pilaresParede ?? []), ...(dim.paredes ?? [])];
  const concretas = new Set((dim.armaduraParedes ?? []).map((a) => a.id));
  const esf = res.filter((r) => concretas.has(r.id));
  if (esf.length) {
    tabelas.push({
      titulo: 'Esforços resultantes por lado e lance — extremos das combinações ELU (kN, kN·m; N > 0 tração; mín (combinação) / máx (combinação))',
      cabecalho: ['Elemento', 'Lado', 'Lance', 'Modelo', 'L (m)', 't (cm)', 'N', 'Vp (no plano)', 'Mp (no plano)', 'Vo (fora do plano)', 'Mo (fora do plano)'],
      linhas: esf.flatMap((r) => r.lados.map((l) => [r.nome, l.nome, l.nomePav, l.modelo === 'casca' ? 'casca' : 'barra', n(l.L), n(l.t * 100, 1), ext(l.elu.N), ext(l.elu.Vp), ext(l.elu.Mp), ext(l.elu.Vo), ext(l.elu.Mo)])),
    });
    tabelas.push({
      titulo: 'Cargas na base (compressão +, kN): extremos ELU de N e valores por caso',
      cabecalho: ['Elemento', 'Modelo', 'N,máx (kN)', 'Combinação', 'N,mín (kN)', 'Combinação', 'Casos (N, kN)'],
      linhas: esf.map((r) => [r.nome, r.modelo, n(r.baseElu.Nmax, 1), r.baseElu.cNmax || '—', n(r.baseElu.Nmin, 1), r.baseElu.cNmin || '—', Object.entries(r.base).map(([c, v]) => `${c} ${n(v.N, 1)}`).join('; ') || '—']),
    });
  }
  const ws = dim.armaduraParedes ?? [];
  if (ws.length) {
    tabelas.push({
      titulo: 'Armadura por pano e verificação de cortante (malha igual nas duas faces; V, VRd1 e VRd2 em kN/m)',
      cabecalho: ['Elemento', 'Trecho', 'Lance', 'Pano', 'Necessária V / H (cm²/m)', 'Vertical', 'Horizontal', 'V', 'VRd1', 'VRd2', 'Grampos', 'Util. concreto / aço', 'Situação'],
      linhas: ws.flatMap((w) => w.panos.map((p) => [w.nome, p.nomeLado, p.nomePav, String(p.pano + 1), `${n(p.req.vert)} / ${n(p.req.hor)}`, phi(p.vert), phi(p.hor), n(p.cortante.V, 1), n(p.cortante.VRd1, 1), n(p.cortante.VRd2, 1), p.cortante.grampos ? 'sim' : 'não', `${n(p.tensoes.utilConcreto)} / ${n(p.tensoes.utilAco)}`, SITUACAO[p.status] ?? p.status])),
    });
    const barra = ws.flatMap((w) => w.lados.filter((l) => l.modelo === 'barra').map((l) => [w.nome, l.nome, l.nomePav, `${n(l.L)} × ${n(l.t * 100, 0)}`, l.barra?.vert ? `${l.barra.n} φ${n(l.barra.vert.phi, 1)}` : '—', l.barra ? `φ${n(l.barra.estribo.phi, 1)} c/${n(l.barra.estribo.s * 100, 0)}` : '—', n(l.util), l.combo || '—', SITUACAO[l.status] ?? l.status]));
    if (barra.length) tabelas.push({ titulo: 'Lados curtos em barra (dimensionados como pilar)', cabecalho: ['Elemento', 'Lado', 'Lance', 'L × t (m × cm)', 'Barras', 'Estribo', 'Utilização', 'Combinação', 'Situação'], linhas: barra });
  }
  const muros = linhasMuros(b, dim.muros).filter((m) => m.situacao !== 'calcule');
  if (muros.length) {
    tabelas.push({
      titulo: 'Muros de arrimo: estabilidade e armadura',
      cabecalho: ['Muro', 'Geometria', 'FS tombamento', 'FS deslizamento', 'Tensão na base (máx / mín)', 'Armadura do fuste', 'Armadura da base', 'Aço', 'Situação'],
      linhas: muros.map((m) => [m.nome, m.geometria, m.fsTombamento, m.fsDeslizamento, m.tensao, m.fuste, m.base, m.aco, m.situacao]),
    });
  }
  return { tabelas };
}
