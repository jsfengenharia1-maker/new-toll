// Origem dos resultados (R7-0): para cada grandeza dimensionada, a combinação determinante, a fórmula usada e o
// item da NBR 6118 (numeração da edição de 2014, a confirmar na de 2023), para a janela do elemento e o memorial.

export interface Origem {
  /** Grandeza (ex.: "Armadura inferior"). */
  grandeza: string;
  /** Combinação determinante (nome) ou o tipo de combinação quando a grandeza não vem de uma só. */
  combinacao: string;
  formula: string;
  item: string;
}

const F = {
  flexao: { formula: 'Md = 0,68·bw·x·fcd·(d − 0,4x); As = Md / [fyd·(d − 0,4x)] ≥ As,mín', item: 'NBR 6118, 17.2.2 e 17.3.5.2.1 (Tabela 17.3)' },
  cortante: { formula: 'Asw/s = (Vsd − Vc) / (0,9·d·fywd), Vc = 0,6·fctd·bw·d; Vsd ≤ VRd2 = 0,27·αv2·fcd·bw·d; Asw/s ≥ 0,2·fctm/fywk·bw', item: 'NBR 6118, 17.4.2.2 (modelo I) e 17.4.1.1.1' },
  torcao: { formula: 'Td ≤ TRd2 = 0,5·αv2·fcd·Ae·he; A90/s = Td / (2·Ae·fywd); Asl = Td·ue / (2·Ae·fyd)', item: 'NBR 6118, 17.5.1.5 e 17.5.1.6' },
  flechaViga: { formula: 'Curvatura M/(Ecs·Ie) com Ie de Branson por seção, integrada no vão; f∞ = f0·(1 + αf), αf = Δξ', item: 'NBR 6118, 17.3.2.1.1, 17.3.2.1.2 e Tabela 13.3' },
  fissura: { formula: 'wk = mín[φ/(12,5·η1)·σs/Es·3σs/fctm; φ/(12,5·η1)·σs/Es·(4/ρr + 45)]', item: 'NBR 6118, 17.3.3.2 e Tabela 13.4' },
  redistribuicao: { formula: 'δ ≥ 0,44 + 1,25·x/d (fck ≤ 50); δ ≥ 0,75 em nós fixos e 0,90 em nós móveis', item: 'NBR 6118, 14.6.4.3' },
  pilar: { formula: 'Flexão composta oblíqua por fibras com Md,tot = αb·M1d,A + Nd·ℓe²/10·(1/r) ≥ M1d,mín = Nd·(0,015 + 0,03h) em cada direção (pilar-padrão com curvatura aproximada)', item: 'NBR 6118, 15.8.3.3.2, 11.3.3.4.3 e 17.2.5' },
  pilarLimites: { formula: 'As ≥ máx(0,15·Nd/fyd; 0,4 %·Ac); As ≤ 4 %·Ac', item: 'NBR 6118, 17.3.5.3' },
  pilarEstribo: { formula: 'φt ≥ máx(5 mm; φℓ/4); s ≤ mín(20 cm; menor lado; 12φℓ); cortante com Vc = Vc0·(1 + M0/Msd,máx) ≤ 2Vc0', item: 'NBR 6118, 18.4.3, 17.4.1.1.1 e 17.4.2.2 c' },
  laje: { formula: 'Wood-Armer: mx* = mx + |mxy| (média em faixa de 1 m); As = Md / (fyd·z) ≥ ρmín·h', item: 'NBR 6118, 17.2.2, 19.3.3.2 e Tabela 19.1' },
  puncao: { formula: 'τSd = FSd/(u·d) + ΣK·MSd1/(Wp·d); C: τSd ≤ τRd2 = 0,27·αv2·fcd; C′ (2d): τSd ≤ τRd1 = 0,13·(1 + √(20/d))·(100ρ·fck)^⅓ ou, com armadura, τRd3 = 0,10·(1 + √(20/d))·(100ρ·fck)^⅓ + 1,5·(d/sr)·Asw·fywd/(u·d)', item: 'NBR 6118, 19.5.2 e 19.5.3' },
  cortanteLaje: { formula: 'VSd ≤ VRd1 = [τRd·k·(1,2 + 40ρ1)]·bw·d, τRd = 0,25·fctd, k = |1,6 − d| ≥ 1; acima, armadura transversal Asw/s = (VSd − Vc)/(0,9·d·fywd), VSd ≤ VRd2 = 0,27·αv2·fcd·bw·d', item: 'NBR 6118, 19.4.1 e 19.4.2' },
  flechaLaje: { formula: 'Flecha elástica da grelha relativa aos apoios × fator (ou 1 + αf)', item: 'NBR 6118, 17.3.2.1 e Tabela 13.3' },
} as const;

export const COMB_QP = 'Quase permanente (G + ψ2·Q)';
export const COMB_FREQ = 'Frequente (G + ψ1·Q)';
export const COMB_ELU_LAJE = 'ELU (γg·G + γq·Q)';

export const origem = (grandeza: string, combinacao: string, f: keyof typeof F): Origem => ({ grandeza, combinacao, ...F[f] });
