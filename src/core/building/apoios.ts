// Apoios e avisos de modelagem das vigas (frente N2e): funções puras e testáveis.
// Arredondamento do diagrama dentro do apoio (parábola cúbica ou ΔM = R·t/8), cortante de cargas próximas ao
// apoio, armadura de suspensão e critérios dos avisos (viga-parede, elemento não linear, viga-placa, consolo).

/**
 * Parábola cúbica M(u) = a·u³ + b·u² + c·u + d entre as faces do apoio (u = 0 na face esquerda, u = t na direita)
 * com M e V das duas faces. Convenção do núcleo: dM/dx = −V. Devolve M e V = −dM/du = −(3a·u² + 2b·u + c).
 */
export function cubicaNoApoio(M0: number, V0: number, M1: number, V1: number, t: number, u: number): { M: number; V: number } {
  // c = −V0 (declive em u = 0); d = M0; sistema nas incógnitas a, b com M(t) = M1 e M'(t) = −V1
  const c = -V0, d = M0;
  // a·t³ + b·t² = M1 − c·t − d ; 3a·t² + 2b·t = −V1 − c
  const r1 = M1 - c * t - d, r2 = -V1 - c;
  const a = (r2 * t - 2 * r1) / t ** 3, b = (3 * r1 - r2 * t) / t ** 2;
  return { M: a * u ** 3 + b * u ** 2 + c * u + d, V: -(3 * a * u ** 2 + 2 * b * u + c) };
}

/** Redução do momento do apoio da NBR 6118, 14.6.3 (Figura 14.7): ΔM = R·t/8. */
export const deltaMApoio = (R: number, t: number) => (Math.abs(R) * t) / 8;

/** Momento negativo reduzido por ΔM (nunca troca de sinal) e limitado inferiormente a `minPct` % do momento original. */
export function reduzirNegativo(M: number, dM: number, Mref: number, minPct: number): number {
  if (M >= 0) return M;
  let r = Math.min(0, M + dM);
  if (minPct > 0) r = Math.min(r, (minPct / 100) * Mref);
  return r;
}

/** Cortante de uma carga concentrada F a `a` da face do apoio com a ≤ 2d: reduzido por a/2d (NBR 6118, 17.4.1.2.1). */
export const fatorCargaProxima = (a: number, d: number) => (a >= 2 * d ? 1 : Math.max(0, a / (2 * d)));

/** Parcela da carga que vai ao apoio mais próximo (biapoiada): F·(ℓ − a)/ℓ, com a medido do apoio ao ponto de aplicação. */
export const parcelaAoApoio = (F: number, a: number, L: number) => (L > 0 ? (F * Math.max(0, L - a)) / L : F);

/**
 * Armadura de suspensão (NBR 6118, 18.3.6): As,susp = fator·Rd/fywd (m², para fywd em MPa e Rd em kN: As = Rd/(1000·fywd)
 * em m²; aqui devolve m²). `fywd` em MPa.
 */
export const armaduraSuspensao = (Rd: number, fywd: number, fator = 1) => (fator * Math.abs(Rd)) / (1000 * fywd);

/** Número de estribos de suspensão (cada um com `ramos` ramos de área `Aphi`, m²). */
export const estribosSuspensao = (As: number, ramos: number, Aphi: number) => (As > 0 ? Math.ceil(As / (ramos * Aphi) - 1e-9) : 0);

/** Zona da suspensão na viga de apoio (m): largura da apoiada mais h/2 de cada lado [a confirmar]. */
export const larguraSuspensao = (bApoiada: number, hApoio: number) => bApoiada + hApoio;

export type AvisoModelagem = 'VIGA_PAREDE' | 'NAO_LINEAR' | 'VIGA_PLACA' | 'CONSOLO' | 'PILAR_CURTO';

/**
 * Avisos de modelagem de um vão de viga (K1.3.47, K1.3.53, K1.12.1-17, K1.12.1-18). `L` = vão entre apoios (m),
 * `continua` = o vão é contínuo em pelo menos um apoio, `balanco` = vão em balanço (comprimento do balanço em L).
 */
export function avisosDoVao(L: number, b: number, h: number, d: number, continua: boolean, balanco: boolean, criterio: number): { codigo: AvisoModelagem; mensagem: string }[] {
  const f = (x: number, n = 2) => x.toFixed(n).replace('.', ',');
  const out: { codigo: AvisoModelagem; mensagem: string }[] = [];
  if (balanco) {
    if (L <= d + 1e-9) out.push({ codigo: 'CONSOLO', mensagem: `Consolo curto: balanço de ${f(L)} m ≤ d = ${f(d)} m (NBR 6118, 22.3): biela-tirante e armadura de consolo a tratar à parte.` });
    return out;
  }
  const lim = continua ? 3 : 2;
  if (L / h < lim - 1e-9) out.push({ codigo: 'VIGA_PAREDE', mensagem: `Viga-parede: vão ${f(L)} m com ℓ/h = ${f(L / h)} < ${lim} (${continua ? 'contínua' : 'biapoiada'}, NBR 6118, 22.4.1): sem critério de viga; bielas e tirantes e armadura manuais.` });
  const linear = criterio === 1 ? L > h / 3 && L > 4 * b : L >= 3 * Math.max(b, h);
  if (!linear) out.push({ codigo: 'NAO_LINEAR', mensagem: `Elemento não linear: vão ${f(L)} m ${criterio === 1 ? `≤ h/3 ou ≤ 4b` : `< 3 × a maior dimensão da seção (${f(3 * Math.max(b, h))} m, NBR 6118, 14.4.1)`}: o modelo de barra não vale; tratar como bloco/consolo.` });
  if (b > 2 * L) out.push({ codigo: 'VIGA_PLACA', mensagem: `Elemento de placa: largura ${f(b)} m > 2 × o vão (${f(2 * L)} m): lance como laje, não como viga.` });
  return out;
}

/** Aviso de pilar curto: lance com altura menor que 3 × a maior dimensão da seção (NBR 6118, 14.4.1). */
export function avisoPilarCurto(H: number, lado1: number, lado2: number, criterio: number): { codigo: AvisoModelagem; mensagem: string } | null {
  const maior = Math.max(lado1, lado2), menor = Math.min(lado1, lado2);
  const curto = criterio === 1 ? !(H > maior / 3 && H > 4 * menor) : H < 3 * maior - 1e-9;
  if (!curto) return null;
  const f = (x: number) => x.toFixed(2).replace('.', ',');
  return { codigo: 'PILAR_CURTO', mensagem: `Pilar curto: altura ${f(H)} m ${criterio === 1 ? '≤ maior lado/3 ou ≤ 4 × o menor lado' : `< 3 × o maior lado (${f(3 * maior)} m, NBR 6118, 14.4.1)`}: o modelo linear não vale; tratar à parte.` };
}
