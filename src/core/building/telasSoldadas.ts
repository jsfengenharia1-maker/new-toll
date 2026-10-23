// Telas de aço soldadas (frente R7d): catálogo pelas designações da NBR 7481 (série Q, malha quadrada: o número é a
// área de aço por metro, em mm²/m, nas duas direções), com fios CA-60 nervurados. Dimensões dos fios e das malhas
// conferidas por catálogos de fabricantes, sem o texto da norma [a confirmar]; as séries retangulares (L e T) ainda
// não estão no catálogo. Painéis padrão de 2,45 × 6,00 m. Peso = 7850 kg/m³ × área de aço das duas direções.
import { barArea } from '../concrete';
import { tabelaNorma, type FonteNormas, type LinhaNorma } from '../normas';

export interface TelaCatalogo {
  /** Designação (ex.: Q138). */
  id: string;
  /** Diâmetro (mm) e espaçamento (cm) dos fios longitudinais e transversais. */
  phiL: number; sL: number; phiT: number; sT: number;
  /** Área de aço (cm²/m) na direção longitudinal e na transversal (nominal da designação nas duas, malha quadrada). */
  AsL: number; AsT: number;
  /** Massa (kg/m²) calculada pela área de aço das duas direções. */
  kgm2: number;
}
export const PAINEL_TELA = { largura: 2.45, comprimento: 6.0 };
export const FY_TELA = 600; // CA-60 (MPa)

const CACHE = new WeakMap<LinhaNorma[], TelaCatalogo[]>();
/** Catálogo de telas em uso (biblioteca de normas, `nbr7481.telas-q`: versão do usuário ou de fábrica). */
export function telasDe(b?: FonteNormas): TelaCatalogo[] {
  const rows = tabelaNorma(b, 'nbr7481.telas-q');
  let t = CACHE.get(rows);
  if (!t) {
    t = rows.map((l) => { const n = l.n as number, phi = l.phi as number, s = l.s as number; return { id: l.id as string, phiL: phi, sL: s, phiT: phi, sT: s, AsL: n / 100, AsT: n / 100, kgm2: +(2 * (n / 100) * 1e-4 * 7850).toFixed(3) }; });
    CACHE.set(rows, t);
  }
  return t;
}
/** Catálogo de fábrica. */
export const TELAS: TelaCatalogo[] = telasDe();

export const telaPor = (id?: string, b?: FonteNormas): TelaCatalogo | undefined => telasDe(b).find((t) => t.id === id);
/** Área de aço (cm²/m) por direção da laje (0 = principal, 1 = perpendicular) com `giro` trocando os fios. */
export const areaTela = (t: TelaCatalogo, giro: boolean | undefined): [number, number] => (giro ? [t.AsT, t.AsL] : [t.AsL, t.AsT]);
/** Área de uma barra de base (φ mm, s cm) em cm²/m. */
export const areaBarraBase = (phi: number, sCm: number) => (barArea(phi) * 1e4) / (sCm / 100);

export interface PainelTela {
  /** Número do painel na laje (T1, T2, …), face e designação. */
  n: string; face: 'inf' | 'sup'; designacao: string;
  /** Retângulo em coordenadas da planta (m, anti-horário) e dimensões cortadas (m): comprimento ao longo dos fios longitudinais. */
  poligono: [number, number][]; comprimento: number; largura: number;
  /** Ângulo dos fios longitudinais (graus). */
  angulo: number;
  /** Peso do painel cortado (kg). */
  peso: number;
}

/** Resumo das telas por designação: painéis, área (m²) e peso (kg, com perdas). */
export function resumoTelas(paineis: { designacao: string; comprimento: number; largura: number; repeticoes: number }[], perdas: number, b?: FonteNormas): { designacao: string; paineis: number; area: number; peso: number; pesoComPerdas: number }[] {
  const m = new Map<string, { designacao: string; paineis: number; area: number }>();
  for (const p of paineis) { const e = m.get(p.designacao) ?? { designacao: p.designacao, paineis: 0, area: 0 }; e.paineis += p.repeticoes; e.area += p.comprimento * p.largura * p.repeticoes; m.set(p.designacao, e); }
  return [...m.values()].sort((a, z) => a.designacao.localeCompare(z.designacao)).map((e) => { const peso = e.area * (telaPor(e.designacao, b)?.kgm2 ?? 0); return { ...e, peso, pesoComPerdas: peso * (1 + perdas / 100) }; });
}
