// Saídas (V5, K1.11.54): detalhes DXF inseríveis nas pranchas e modelo de moldura/legenda importado de DXF
// (inserção com escala, posição e rotação). A impressora e o plotter usam a impressão do navegador (PDF).
// Formato do usuário (largura × altura livres) e margens configuráveis: pendentes (ver historico-fatias.md).
import type { ConfigMoldura, DetalheDxf, DetalheInserido } from '../building/types';
import { lerDxf, metrosPorUnidade } from '../dxf/read';
import type { Camada, Prancha, Prim, P } from './prancha';

export const LIMITE_SEGMENTOS_DETALHE = 20000;

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Lê um DXF e guarda a geometria (segmentos, arcos e textos de todas as camadas). */
export function detalheDeDxf(txt: string, nome: string): DetalheDxf | { erro: string } {
  const d = lerDxf(txt);
  const camadas = Object.values(d.camadas);
  const linhas = camadas.flatMap((c) => c.linhas), arcos = camadas.flatMap((c) => c.arcos), textos = camadas.flatMap((c) => c.textos);
  const n = linhas.length / 4 + arcos.length / 5;
  if (!n && !textos.length) return { erro: 'O DXF não tem linhas, arcos nem textos legíveis.' };
  if (n > LIMITE_SEGMENTOS_DETALHE) return { erro: `O DXF tem ${Math.round(n)} segmentos: o limite é ${LIMITE_SEGMENTOS_DETALHE} (simplifique o desenho).` };
  return { nome, insunits: d.insunits, linhas: linhas.map(r3), arcos: arcos.map(r3), textos: textos.map((t) => ({ x: r3(t.x), y: r3(t.y), h: r3(t.h), rot: r3(t.rot), t: t.t })) };
}

/** Milímetros por unidade do desenho (mm quando a unidade é desconhecida). */
export const mmPorUnidade = (insunits: number) => (metrosPorUnidade(insunits) ?? 0.001) * 1000;

/** Caixa [x0, y0, x1, y1] do desenho, nas unidades dele. */
export function caixaDoDetalhe(d: DetalheDxf): [number, number, number, number] {
  const xs: number[] = [], ys: number[] = [];
  for (let k = 0; k < d.linhas.length; k += 2) { xs.push(d.linhas[k]); ys.push(d.linhas[k + 1]); }
  for (let k = 0; k < d.arcos.length; k += 5) { const [x, y, r] = [d.arcos[k], d.arcos[k + 1], d.arcos[k + 2]]; xs.push(x - r, x + r); ys.push(y - r, y + r); }
  for (const t of d.textos) { xs.push(t.x); ys.push(t.y); }
  return xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : [0, 0, 0, 0];
}

/** Primitivas no papel (mm) do desenho inserido: escala, rotação em graus em torno de (0,0) do desenho e translação (x, y). */
export function primitivasDoDetalhe(d: DetalheDxf, ins: { x: number; y: number; escala: number; rotacao?: number }, camada: Camada = 'FOLHA-FINA', camadaTexto: Camada = 'FOLHA-TEXTO'): Prim[] {
  const f = mmPorUnidade(d.insunits) * ins.escala, a = ((ins.rotacao ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const T = (x: number, y: number): P => [ins.x + (x * c - y * s) * f, ins.y + (x * s + y * c) * f];
  const out: Prim[] = [];
  for (let k = 0; k < d.linhas.length; k += 4) out.push({ t: 'pl', c: camada, pts: [T(d.linhas[k], d.linhas[k + 1]), T(d.linhas[k + 2], d.linhas[k + 3])] });
  for (let k = 0; k < d.arcos.length; k += 5) {
    const [x, y, r, a0, a1] = d.arcos.slice(k, k + 5);
    let sw = a1 - a0;
    while (sw <= 0) sw += 360;
    if (sw >= 359.999) { const ct = T(x, y); out.push({ t: 'circ', c: camada, centro: ct, r: r * f }); continue; }
    const n = Math.max(6, Math.ceil(sw / 10));
    out.push({ t: 'pl', c: camada, pts: Array.from({ length: n + 1 }, (_, i) => { const g = ((a0 + (sw * i) / n) * Math.PI) / 180; return T(x + r * Math.cos(g), y + r * Math.sin(g)); }) });
  }
  for (const t of d.textos) out.push({ t: 'txt', c: camadaTexto, p: T(t.x, t.y), h: t.h * f, s: t.t, ang: t.rot + (ins.rotacao ?? 0) });
  return out;
}

/** Insere os detalhes escolhidos para a folha (tipo de prancha) no espaço do papel. */
export function inserirDetalhes(pr: Prancha, detalhes: DetalheInserido[] | undefined, tipo: string): Prancha {
  const lista = (detalhes ?? []).filter((d) => !d.folhas?.length || d.folhas.includes(tipo));
  if (!lista.length) return pr;
  return { ...pr, papel: [...pr.papel, ...lista.flatMap((d) => primitivasDoDetalhe(d.detalhe, d))] };
}

/**
 * Moldura de modelo importado: o retângulo da folha (e, em 'moldura+legenda', a legenda do Statikos) dá lugar ao
 * desenho do DXF. `papel` são as primitivas da folha já montada; `nMoldura` quantas primeiras são a moldura/marcas e
 * `legenda` o intervalo [i, j) das primitivas da legenda.
 */
export function aplicarMoldura(papel: Prim[], m: ConfigMoldura | undefined, nMoldura: number, legenda: [number, number]): Prim[] {
  const mod = m?.modelo;
  if (!mod) return papel;
  const novos = primitivasDoDetalhe(mod.detalhe, { x: mod.x, y: mod.y, escala: mod.escala }, 'FOLHA', 'FOLHA-TEXTO');
  const resto = papel.filter((_, i) => i >= nMoldura && !(mod.modo === 'moldura+legenda' && i >= legenda[0] && i < legenda[1]));
  return [...papel.slice(0, 0), ...novos, ...resto];
}
