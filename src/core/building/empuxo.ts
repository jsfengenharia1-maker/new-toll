// Empuxo de terra em paredes de subsolo (frente N2a): coeficientes de empuxo e diagrama de pressões por cota.
// Aplicação às paredes fica para a E1c; aqui só os dados e o cálculo da pressão (caso H).
import type { TipoEmpuxo } from './types';

const rad = (g: number) => (g * Math.PI) / 180;
const GAMA_AGUA = 10; // kN/m³

/** Coeficiente de empuxo de repouso de Jaky: K0 = 1 − sen φ. */
export const k0 = (phi: number) => 1 - Math.sin(rad(phi));

/** Rankine ativo com talude β (graus): Ka = cosβ·(cosβ − √(cos²β − cos²φ)) / (cosβ + √(cos²β − cos²φ)); null se β > φ. */
export function kaRankine(phi: number, beta = 0): number | null {
  const cb = Math.cos(rad(beta)), cf = Math.cos(rad(phi));
  const r = cb * cb - cf * cf;
  if (r < 0) return null;
  const s = Math.sqrt(r);
  return (cb * (cb - s)) / (cb + s);
}

/** Coulomb ativo, parede vertical, atrito solo-parede δ e talude β: Ka = cos²φ / (cosδ·[1 + √(sen(φ+δ)·sen(φ−β)/(cosδ·cosβ))]²); null se β > φ. */
export function kaCoulomb(phi: number, delta = 0, beta = 0): number | null {
  if (beta > phi) return null;
  const f = rad(phi), d = rad(delta), b = rad(beta);
  const raiz = Math.sqrt((Math.sin(f + d) * Math.sin(f - b)) / (Math.cos(d) * Math.cos(b)));
  return (Math.cos(f) ** 2) / (Math.cos(d) * (1 + raiz) ** 2);
}

/** Coeficiente de empuxo de um estrato (o informado em `tipo.k`, se houver). */
export function kDoTipo(t: Pick<TipoEmpuxo, 'metodo' | 'k' | 'talude' | 'delta'>, phi: number): number | null {
  if (t.k !== undefined) return t.k;
  if (t.metodo === 'repouso') return k0(phi);
  return t.metodo === 'rankine' ? kaRankine(phi, t.talude ?? 0) : kaCoulomb(phi, t.delta ?? 0, t.talude ?? 0);
}

export interface PontoEmpuxo { cota: number; /** pressão horizontal efetiva do solo + sobrecarga (kPa) */ solo: number; /** pressão de água (kPa) */ agua: number; /** total (kPa) */ total: number }

export interface DiagramaEmpuxo {
  /** Pontos de cima para baixo; nas interfaces de estrato e no nível d'água a cota se repete (salto de K). */
  pontos: PontoEmpuxo[];
  /** Resultante horizontal por metro de parede (kN/m) e sua cota (m); 0 e cotaBase sem pressão. */
  resultante: number; cotaResultante: number;
  /** Mensagens (talude maior que φ, sem estrato...). */
  avisos: string[];
}

/**
 * Pressões horizontais sobre uma parede vertical entre `cotaTopo` e `cotaBase` (cotas, cotaTopo > cotaBase), do tipo de
 * empuxo dado. Tensão vertical efetiva: peso aparente acima do nível d'água e submerso (γsub, padrão γ − 10) abaixo; a
 * sobrecarga do terreno soma q·K em toda a altura; água hidrostática abaixo do NA reduzida pelo alívio por drenagem.
 * Acima do aterro (cotaTopo > cotaAterro) não há pressão. Estratos de cima para baixo; o último segue até a base.
 */
export function diagramaEmpuxo(t: TipoEmpuxo, cotaTopo: number, cotaBase: number): DiagramaEmpuxo {
  const avisos: string[] = [];
  if (!t.estratos.length) return { pontos: [], resultante: 0, cotaResultante: cotaBase, avisos: ['Tipo de empuxo sem estratos.'] };
  const topo = Math.min(cotaTopo, t.cotaAterro);
  if (topo <= cotaBase) return { pontos: [], resultante: 0, cotaResultante: cotaBase, avisos: [] };
  const alivio = 1 - Math.min(100, Math.max(0, t.alivio ?? 0)) / 100, q = t.sobrecarga ?? 0, na = t.nivelAgua;
  // interfaces: fronteiras dos estratos medidas desde o topo do aterro
  const fronteiras: number[] = [];
  let acc = t.cotaAterro;
  t.estratos.forEach((e, i) => { acc -= e.espessura; if (i < t.estratos.length - 1) fronteiras.push(acc); });
  const estratoEm = (cota: number, acima: boolean) => {
    // estrato em `cota`; na interface, `acima` escolhe o estrato de cima
    let i = 0;
    for (const f of fronteiras) { if (acima ? cota < f - 1e-9 : cota <= f + 1e-9) i++; else break; }
    return Math.min(i, t.estratos.length - 1);
  };
  // σv' efetiva no ponto: integra o peso até a cota
  const sigmaV = (cota: number) => {
    let s = 0, z = t.cotaAterro;
    for (let i = 0; i < t.estratos.length && z > cota + 1e-12; i++) {
      const fim = i < t.estratos.length - 1 ? Math.max(cota, t.cotaAterro - t.estratos.slice(0, i + 1).reduce((a, e) => a + e.espessura, 0)) : cota;
      const e = t.estratos[i];
      const sub = e.gamaSub ?? e.gama - GAMA_AGUA;
      if (na === undefined || na <= fim) s += e.gama * (z - fim);
      else if (na >= z) s += sub * (z - fim);
      else s += e.gama * (z - na) + sub * (na - fim);
      z = fim;
    }
    return s;
  };
  const ponto = (cota: number, acima: boolean): PontoEmpuxo => {
    const i = estratoEm(cota, acima), e = t.estratos[i];
    const k = kDoTipo(t, e.phi);
    if (k === null) { if (!avisos.length) avisos.push(`Talude β = ${t.talude}° maior que φ = ${e.phi}°: empuxo ativo indefinido (usado K0).`); }
    const kk = k ?? k0(e.phi);
    const solo = kk * (sigmaV(cota) + q);
    const agua = na !== undefined && cota < na ? GAMA_AGUA * (na - cota) * alivio : 0;
    return { cota, solo, agua, total: solo + agua };
  };
  const cortes = new Set<number>([topo, cotaBase]);
  for (const f of fronteiras) if (f < topo && f > cotaBase) cortes.add(f);
  if (na !== undefined && na < topo && na > cotaBase) cortes.add(na);
  const cs = [...cortes].sort((a, z) => z - a);
  const pontos: PontoEmpuxo[] = [];
  cs.forEach((c, i) => {
    const interface_ = fronteiras.some((f) => Math.abs(f - c) < 1e-9);
    if (i > 0 && interface_) pontos.push(ponto(c, true)); // chegada pelo estrato de cima
    if (i === cs.length - 1) { if (!interface_) pontos.push(ponto(c, true)); } else pontos.push(ponto(c, false));
  });
  // resultante e centro: trapézios entre pontos consecutivos
  let R = 0, M = 0;
  for (let i = 0; i + 1 < pontos.length; i++) {
    const a = pontos[i], z = pontos[i + 1], h = a.cota - z.cota;
    if (h <= 1e-12) continue;
    const r = ((a.total + z.total) / 2) * h;
    // centroide do trapézio medido de baixo: h·(2·a + z)/(3·(a + z))... a no topo, z na base
    const soma = a.total + z.total;
    const cg = soma > 1e-12 ? z.cota + (h * (z.total + 2 * a.total)) / (3 * soma) : z.cota + h / 2;
    R += r; M += r * cg;
  }
  return { pontos, resultante: R, cotaResultante: R > 1e-12 ? M / R : cotaBase, avisos };
}
