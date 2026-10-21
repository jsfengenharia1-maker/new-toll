// Regras dos pilares e geometria da planta no mundo (sem dependência do registro de comandos).
import { centroPilar, contornoNoLance, dimsSecao, lancesDoPilar, mascaraParaMundo, pavimentosOrdenados, type BuildingModel, type Pilar } from './types';
import type { Diagnostico } from './verify';
import { sobrepoe } from '../geom/poly';

const err = (codigo: string, mensagem: string, elementos: string[] = []): Diagnostico[] => [{ codigo, severidade: 'erro', elementos, mensagem }];
const fmt = (v: number) => String(+v.toFixed(3)).replace('.', ',');

/** Pilares que dividem algum lance com `p` e cujas seções se sobrepõem. */
export function pilaresSobrepostos(b: BuildingModel, p: Pilar, ignorar: Set<string> = new Set()): Pilar[] {
  const lp = new Set(lancesDoPilar(b, p).map((x) => x.id));
  return b.pilares.filter((q) => q.id !== p.id && !ignorar.has(q.id) && lancesDoPilar(b, q).some((x) => {
    if (!lp.has(x.id)) return false;
    return sobrepoe(contornoNoLance(p, x.id), contornoNoLance(q, x.id));
  }));
}

export function refsPilar(b: BuildingModel, nasce: string, morre: string): Diagnostico[] {
  // arranque (pilar de altura zero na fundação): permitido mesmo sem pavimentos
  if (nasce === 'fundacao' && morre === 'fundacao') return [];
  const ps = pavimentosOrdenados(b);
  if (!ps.length) return err('OBRA_SEM_PAVIMENTO', 'Crie os pavimentos antes de lançar pilares.');
  const i1 = ps.findIndex((x) => x.id === morre);
  if (i1 < 0) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${morre} não existe.`);
  if (nasce === 'fundacao') return [];
  const i0 = ps.findIndex((x) => x.id === nasce);
  if (i0 < 0) return err('PAVIMENTO_INEXISTENTE', `Pavimento ${nasce} não existe.`);
  return i0 >= i1 ? err('PILAR_SEM_LANCE', 'O pilar precisa morrer acima do pavimento em que nasce.') : [];
}

/** Dimensões mínimas e pilar-parede (NBR 6118, 13.2.3 e 14.4.2.4; itens a confirmar na edição de 2023). */
export function diagnosticosPilares(b: BuildingModel): Diagnostico[] {
  const d: Diagnostico[] = [];
  const vistos = new Set<string>();
  for (const p of b.pilares) {
    const r = refsPilar(b, p.nasce, p.morre);
    if (r.length) { d.push({ ...r[0], codigo: 'PILAR_REFERENCIA', elementos: [p.id], mensagem: `${p.nome}: ${r[0].mensagem}` }); continue; }
    for (const q of pilaresSobrepostos(b, p)) {
      const k = [p.id, q.id].sort().join('|');
      if (vistos.has(k)) continue;
      vistos.add(k);
      d.push({ codigo: 'PILAR_SOBREPOSTO', severidade: 'erro', elementos: [p.id, q.id], mensagem: `${p.nome} e ${q.nome} se sobrepõem.` });
    }
    for (const s of [p.secao, ...(p.secoes ?? []).map((x) => x.secao)]) {
      const [w, h] = dimsSecao(s), menor = Math.min(w, h), maior = Math.max(w, h);
      if (s.tipo === 'ret' && maior > 5 * menor) { d.push({ codigo: 'PILAR_PAREDE', severidade: 'aviso', elementos: [p.id], mensagem: `${p.nome} (${fmt(w * 100)} × ${fmt(h * 100)} cm) é pilar-parede (lado maior > 5 × menor); o modelo próprio chega na V2.` }); break; }
      if (menor < 0.14 - 1e-9 || w * h < 0.036 - 1e-9) { d.push({ codigo: 'PILAR_SECAO_MINIMA', severidade: 'erro', elementos: [p.id], mensagem: `${p.nome}: menor dimensão ${fmt(menor * 100)} cm ou área ${fmt(w * h * 1e4)} cm² abaixo do mínimo (14 cm; 360 cm²).` }); break; }
      if (menor < 0.19 - 1e-9) { d.push({ codigo: 'PILAR_SECAO_REDUZIDA', severidade: 'aviso', elementos: [p.id], mensagem: `${p.nome}: menor dimensão ${fmt(menor * 100)} cm < 19 cm exige o coeficiente adicional γn.` }); break; }
    }
  }
  return d;
}

/** Centro de cada pilar no mundo, para desenho e captura (seção geral). */
export const centros = (b: BuildingModel) => b.pilares.map((p) => ({ id: p.id, c: centroPilar(p, p.secao) }));

/** Máscara no mundo como segmentos e arcos das camadas visíveis e capturáveis (para o índice de capturas). */
export function geometriaMascara(b: Pick<BuildingModel, 'mascaras'>, grupo: string, soCapturaveis = true) {
  const segs: number[] = [], arcos: number[] = [];
  for (const m of b.mascaras.filter((x) => x.grupo === grupo)) {
    const sx = m.escala;
    for (const cam of m.camadas) {
      if (!cam.visivel || (soCapturaveis && !cam.capturavel)) continue;
      const g = m.geo[cam.nome];
      if (!g) continue;
      for (let k = 0; k < g.linhas.length; k += 4) { const a = mascaraParaMundo(m, g.linhas[k], g.linhas[k + 1]), z = mascaraParaMundo(m, g.linhas[k + 2], g.linhas[k + 3]); segs.push(a[0], a[1], z[0], z[1]); }
      for (let k = 0; k < g.arcos.length; k += 5) { const c = mascaraParaMundo(m, g.arcos[k], g.arcos[k + 1]); arcos.push(c[0], c[1], g.arcos[k + 2] * sx, g.arcos[k + 3] + m.rotacao, g.arcos[k + 4] + m.rotacao); }
    }
  }
  return { segs, arcos };
}
