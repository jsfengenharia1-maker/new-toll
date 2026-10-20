// Prancha no modelo de documento do nasjidwg (MIT), que grava o DWG R2018. A biblioteca não entra no
// pacote: o app a carrega de public/vendor sob demanda e a linha de comando a importa do mesmo arquivo.
// Mesma organização do DXF: planta em m no modelo, folha em mm num layout com as janelas 1 (papel) e 2.
import type { Drawing, Entity, TextHAlign, TextVAlign } from 'nasjidwg';
import { CAMADAS, TRACOS, type Camada, type Prancha, type Prim } from './prancha';

const TIPO: Record<'cont' | 'trac' | 'eixo', string> = { cont: 'Continuous', trac: 'TRACEJADA', eixo: 'EIXO' };
const p3 = (p: [number, number]) => ({ x: p[0], y: p[1], z: 0 });

function entidade(q: Prim, ltScale: number): Entity {
  const base = { layer: q.c, color: { kind: 'byLayer' as const }, ...(ltScale !== 1 ? { linetypeScale: ltScale } : {}) };
  if (q.t === 'pl') return { ...base, type: 'polyline', vertices: q.pts.map(([x, y]) => ({ x, y })), closed: !!q.fechada };
  if (q.t === 'circ') return { ...base, type: 'circle', center: p3(q.centro), radius: q.r };
  if (q.t === 'hach') return { ...base, type: 'hatch', patternName: 'SOLID', solid: true, angle: 0, scale: 1, loops: [{ kind: 'polyline', vertices: q.pts.map(([x, y]) => ({ x, y })), closed: true, external: true }] } as Entity;
  const halign: TextHAlign = q.ah === 'c' ? 'center' : q.ah === 'd' ? 'right' : 'left';
  const valign: TextVAlign = q.av === 'meio' ? 'middle' : q.av === 'topo' ? 'top' : 'baseline';
  const alinhado = halign !== 'left' || valign !== 'baseline';
  return { ...base, type: 'text', position: p3(q.p), ...(alinhado ? { alignmentPoint: p3(q.p) } : {}), text: q.s, height: q.h, rotation: ((q.ang ?? 0) * Math.PI) / 180, style: 'Standard', halign, valign };
}

export function desenhoDwg(pr: Prancha, arquivoLogo = 'logo.jpg'): Drawing {
  const k = pr.escala / 1000, j = pr.janela;
  const camadas = Object.keys(CAMADAS) as Camada[];
  const vp = (id: number, c: [number, number], w: number, h: number, vc: [number, number], vh: number): Entity => ({
    type: 'viewport', layer: id === 1 ? '0' : 'JANELA', color: { kind: 'byLayer' }, center: p3(c), width: w, height: h, viewCenter: { x: vc[0], y: vc[1] }, viewHeight: vh,
    viewTarget: { x: 0, y: 0, z: 0 }, viewDirection: { x: 0, y: 0, z: 1 }, id, statusFlag: id,
  } as Entity);
  return {
    header: { version: 'R2018', codepage: 'ANSI_1252', insUnits: 6, linetypeScale: 1, vars: { PSLTSCALE: 0, LWDISPLAY: 1, MEASUREMENT: 1 } },
    layers: [
      { name: '0', color: { kind: 'aci', index: 7 }, on: true, frozen: false, locked: false },
      { name: 'JANELA', color: { kind: 'aci', index: 8 }, on: true, frozen: false, locked: false, plottable: false },
      ...camadas.map((c) => ({ name: c, color: { kind: 'aci' as const, index: CAMADAS[c].cor }, on: true, frozen: false, locked: false, linetype: TIPO[CAMADAS[c].tipo], lineweight: CAMADAS[c].pena })),
    ],
    linetypes: [
      { name: 'Continuous', description: 'Solid line', pattern: [] },
      { name: 'TRACEJADA', description: 'Tracejada __ __ __', pattern: TRACOS.trac.map((v, i) => (i % 2 ? -v : v)) },
      { name: 'EIXO', description: 'Eixo ____ . ____ .', pattern: TRACOS.eixo.map((v, i) => (i % 2 ? -v : v)) },
    ],
    textStyles: [{ name: 'Standard', font: 'arial.ttf' }],
    blocks: {},
    entities: pr.modelo.map((q) => entidade(q, k)),
    paperSpace: [
      vp(1, [pr.W / 2, pr.H / 2], pr.W * 1.05, pr.H * 1.05, [pr.W / 2, pr.H / 2], pr.H * 1.05),
      ...(j ? [vp(2, [(j.x0 + j.x1) / 2, (j.y0 + j.y1) / 2], j.x1 - j.x0, j.y1 - j.y0, j.centro, (j.y1 - j.y0) * k)] : []),
      ...pr.papel.map((q) => entidade(q, 1)),
      // logo do carimbo: imagem externa (o arquivo vai ao lado do DWG)
      ...(pr.logo ? [{ type: 'image', layer: 'FOLHA', color: { kind: 'byLayer' }, position: { x: pr.logo.x0, y: pr.logo.y0, z: 0 }, uVector: { x: (pr.logo.x1 - pr.logo.x0) / pr.logo.largura, y: 0, z: 0 }, vVector: { x: 0, y: (pr.logo.y1 - pr.logo.y0) / pr.logo.altura, z: 0 }, widthPx: pr.logo.largura, heightPx: pr.logo.altura, path: arquivoLogo } as Entity] : []),
    ],
    layouts: [
      { name: 'Model', tabOrder: 0 },
      { name: pr.titulo.replace(/[<>/\\":;?*|=`]/g, '-').slice(0, 60) || 'Prancha', tabOrder: 1, limMin: { x: 0, y: 0 }, limMax: { x: pr.W, y: pr.H }, paperSize: `ISO_full_bleed_${pr.formato}_(${pr.W}.00_x_${pr.H}.00_MM)` },
    ],
    warnings: [],
  };
}

/** Assinatura do escritor carregado sob demanda (public/vendor/nasjidwg-*.mjs). */
export type EscritorDwg = (d: Drawing) => { data: Uint8Array; skipped: string[]; downgraded: string[] };
export const VENDOR_DWG = 'vendor/nasjidwg-0.18.0.mjs';
