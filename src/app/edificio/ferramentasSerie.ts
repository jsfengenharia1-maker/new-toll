// Lançamento em série na planta: pilares nos cruzamentos dos eixos (pré-visualização e confirmação), vigas nos eixos e
// a ferramenta Matriz (linear e polar). A lógica de cálculo está em `core/commands/serie.ts`; aqui só estado, parâmetros e desenho.
import { create } from 'zustand';
import { contornoPilar, type BuildingModel } from '../../core/building/types';
import { planejarPilaresNosEixos, transformacoesMatriz, type ParamsMatriz } from '../../core/commands/serie';
import type { Resultado } from '../../core/commands/registry';
import { grupoDaPlanta, usePlanta, type Paleta } from './plantaStore';
import { useBuilding } from './store';
import { useStore } from '../store';

type P = [number, number];
const msg = (m: string) => useStore.getState().set({ message: m });
const r4 = (q: P): P => [+q[0].toFixed(4), +q[1].toFixed(4)];

export interface SerieState {
  /** Pré-visualização de "Pilares nos cruzamentos" aberta (a confirmação está na barra da planta). */
  cruz: boolean;
  /** Matriz: linear ou polar; o que o 2º clique representa (passo ou última cópia); nº de cópias; ângulo polar e seu tipo. */
  modo: 'linear' | 'polar';
  referencia: 'passo' | 'ultimo';
  copias: number;
  angulo: number;
  tipoAngulo: 'total' | 'entre';
  set(p: Partial<Omit<SerieState, 'set'>>): void;
}
export const useSerie = create<SerieState>((set) => ({ cruz: false, modo: 'linear', referencia: 'passo', copias: 3, angulo: 360, tipoAngulo: 'total', set: (p) => set(p) }));

/** Ids dos eixos selecionados na planta (vazio = nenhum selecionado: vale todos). */
export const eixosSelecionados = (b: BuildingModel, selecao: Set<string>) => b.eixos.filter((e) => selecao.has(e.id)).map((e) => e.id);

/** Pilares que o comando criaria agora (seção, ponto fixo e ângulo do pilar ativo) e os cruzamentos pulados; null se a seleção é de um só eixo. */
export function previaCruzamentos(b: BuildingModel) {
  const pl = usePlanta.getState(), eixos = eixosSelecionados(b, pl.selecao);
  if (eixos.length === 1) return null;
  return planejarPilaresNosEixos(b, { ...(eixos.length ? { eixos } : {}), secao: pl.secao, ajuste: pl.ajuste, angulo: pl.angulo, ...(pl.arranque ? { nasce: 'fundacao', morre: 'fundacao' } : {}) });
}

/** Abre a pré-visualização dos pilares nos cruzamentos. */
export function abrirCruzamentos() {
  const b = useBuilding.getState().sessao.modelo;
  if (b.eixos.length < 2) { msg('Lance ao menos dois eixos (ou uma malha) para ter cruzamentos.'); return; }
  useSerie.getState().set({ cruz: true });
  msg('Pilares nos cruzamentos: confira os pontos na planta; Espaço gira 90°, Enter confirma e Esc cancela.');
}

export function confirmarCruzamentos(): Resultado | null {
  const b = useBuilding.getState().sessao.modelo, pl = usePlanta.getState(), eixos = eixosSelecionados(b, pl.selecao);
  const r = useBuilding.getState().exec('pilar.nosEixos', { ...(eixos.length ? { eixos } : {}), secao: pl.secao, ajuste: pl.ajuste, angulo: pl.angulo, ...(pl.arranque ? { nasce: 'fundacao', morre: 'fundacao' } : {}) });
  if (r.ok) useSerie.getState().set({ cruz: false });
  return r;
}

/** Vigas nos eixos do grupo da planta aberta (eixos selecionados ou todos). */
export function vigasNosEixos(): Resultado | null {
  const b = useBuilding.getState().sessao.modelo, pl = usePlanta.getState(), g = grupoDaPlanta(b, pl.pavimento);
  if (!g) { msg('Abra a planta de um pavimento para lançar as vigas nos eixos.'); return null; }
  const eixos = eixosSelecionados(b, pl.selecao);
  return useBuilding.getState().exec('viga.nosEixos', { grupo: g.id, ...(eixos.length ? { eixos } : {}), secao: pl.secaoViga });
}

/** Teclas da pré-visualização dos cruzamentos: Espaço gira 90°, Enter confirma, Esc cancela. Devolve true se tratou a tecla. */
export function tratarTeclaSerie(k: string, tipo: string): boolean {
  if (!useSerie.getState().cruz) return false;
  if (k === ' ') { if (tipo === 'keydown') { const pl = usePlanta.getState(); pl.set({ angulo: (pl.angulo + 90) % 360 }); } return true; }
  if (tipo !== 'keydown') return false;
  if (k === 'Enter') { confirmarCruzamentos(); return true; }
  if (k === 'Escape') { useSerie.getState().set({ cruz: false }); msg('Pré-visualização cancelada.'); return true; }
  return false;
}

// ---- Matriz ----

type Sel = { pilares: string[]; vigas: string[]; lajes: string[]; cargas: string[] };
const total = (s: Sel) => s.pilares.length + s.vigas.length + s.lajes.length + s.cargas.length;

/** Seleção da planta nos tipos que a matriz copia. */
export function selecaoMatriz(b: BuildingModel, selecao: Set<string>): Sel {
  return {
    pilares: b.pilares.filter((x) => selecao.has(x.id)).map((x) => x.id), vigas: b.vigas.filter((x) => selecao.has(x.id)).map((x) => x.id),
    lajes: b.lajes.filter((x) => selecao.has(x.id)).map((x) => x.id), cargas: b.cargas.filter((x) => selecao.has(x.id)).map((x) => x.id),
  };
}

/** Parâmetros de `editar.matriz` com o estado das opções; `pontoA` é a base (linear) e `pontoB` o destino (linear) ou o centro (polar). */
export function paramsMatriz(sel: Sel, pontoA: P | null, pontoB: P): ParamsMatriz {
  const S = useSerie.getState();
  const comuns = { ...(sel.pilares.length ? { pilares: sel.pilares } : {}), ...(sel.vigas.length ? { vigas: sel.vigas } : {}), ...(sel.lajes.length ? { lajes: sel.lajes } : {}), ...(sel.cargas.length ? { cargas: sel.cargas } : {}), copias: S.copias };
  if (S.modo === 'polar') return { ...comuns, modo: 'polar', centro: r4(pontoB), angulo: S.angulo, tipoAngulo: S.tipoAngulo };
  return { ...comuns, modo: 'linear', base: r4(pontoA ?? pontoB), destino: r4(pontoB), referencia: S.referencia };
}

/** Clique da ferramenta Matriz: linear = base e depois direção/distância; polar = o clique é o centro. */
export function agirMatriz(b: BuildingModel, p: P, pontos: P[], setPontos: (q: P[]) => void, exec: (nome: string, params: Record<string, unknown>) => { ok: boolean }) {
  const sel = selecaoMatriz(b, usePlanta.getState().selecao);
  if (!total(sel)) { msg('Selecione pilares, vigas, lajes ou cargas e escolha a Matriz de novo.'); return; }
  const S = useSerie.getState();
  if (S.modo === 'polar') { exec('editar.matriz', paramsMatriz(sel, null, p) as unknown as Record<string, unknown>); return; }
  if (!pontos.length) { setPontos([p]); msg(S.referencia === 'ultimo' ? 'Ponto base marcado: clique a posição da última cópia.' : 'Ponto base marcado: clique a direção e a distância entre cópias.'); return; }
  setPontos([]);
  exec('editar.matriz', paramsMatriz(sel, pontos[0], p) as unknown as Record<string, unknown>);
}

// ---- Desenho da pré-visualização ----

type Ctx = CanvasRenderingContext2D;
type ParaTela = (x: number, y: number) => [number, number];
const trilha = (ctx: Ctx, paraTela: ParaTela, pts: P[], fechar: boolean) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...paraTela(q[0], q[1])) : ctx.moveTo(...paraTela(q[0], q[1])))); if (fechar) ctx.closePath(); };

/** Pré-visualização dos pilares nos cruzamentos (livres cheios, pulados com uma cruz) e das cópias da matriz. */
export function desenharSerie(ctx: Ctx, paraTela: ParaTela, cores: Paleta, b: BuildingModel, pontos: P[], cursor: P) {
  const pl = usePlanta.getState(), S = useSerie.getState();
  if (S.cruz) {
    const pr = previaCruzamentos(b);
    if (!pr) return;
    for (const q of pr.novos) {
      trilha(ctx, paraTela, contornoPilar(q, q.secao), true);
      ctx.globalAlpha = 0.45; ctx.fillStyle = cores.pilar; ctx.fill(); ctx.globalAlpha = 1; ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.pilar; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = cores.erro; ctx.lineWidth = 2;
    for (const q of pr.pulados) { const [x, y] = paraTela(q[0], q[1]); ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke(); }
    ctx.lineWidth = 1;
  }
  if (pl.ferramenta !== 'matriz') return;
  const sel = selecaoMatriz(b, pl.selecao);
  if (!total(sel) || (S.modo === 'linear' && !pontos.length)) return;
  const ts = transformacoesMatriz(paramsMatriz(sel, pontos[0] ?? null, cursor));
  ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
  for (const t of ts) {
    for (const id of sel.pilares) { const q = b.pilares.find((x) => x.id === id)!; trilha(ctx, paraTela, contornoPilar(q, q.secao).map((v) => t.ponto(v)), true); ctx.globalAlpha = 0.35; ctx.fillStyle = cores.pilar; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = cores.pilar; ctx.stroke(); }
    for (const id of sel.vigas) { const v = b.vigas.find((x) => x.id === id)!; trilha(ctx, paraTela, v.pontos.map((q) => t.ponto(q as P)), false); ctx.strokeStyle = cores.viga; ctx.stroke(); }
    for (const id of sel.lajes) { const l = b.lajes.find((x) => x.id === id)!; trilha(ctx, paraTela, l.contorno.map((q) => t.ponto(q as P)), true); ctx.strokeStyle = cores.laje; ctx.stroke(); }
    for (const id of sel.cargas) {
      const c = b.cargas.find((x) => x.id === id)!, pts = c.pontos.map((q) => t.ponto(q as P));
      if (c.tipo === 'ponto') { const [x, y] = paraTela(pts[0][0], pts[0][1]); ctx.fillStyle = cores.carga; ctx.fillRect(x - 3, y - 3, 6, 6); } else { trilha(ctx, paraTela, pts, c.tipo === 'area'); ctx.strokeStyle = cores.carga; ctx.stroke(); }
    }
  }
  ctx.setLineDash([]); ctx.lineWidth = 1;
  if (S.modo === 'polar') { const [x, y] = paraTela(cursor[0], cursor[1]); ctx.fillStyle = cores.captura; ctx.fillRect(x - 3, y - 3, 6, 6); }
}
