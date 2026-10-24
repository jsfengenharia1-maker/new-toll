// Esforços por hipótese (V5, C4.60, C6.105, C7.187, C12.14, K1.11.28): diagramas de N, V, M e T das barras do pórtico
// (vigas, pilares, vigas inclinadas e diagonais) para um caso simples, uma combinação ou a envoltória de uma família
// de combinações. Núcleo puro: usa os esforços por caso de `porCaso` e combina com os fatores da hipótese, o que dá a
// superposição exata (o diagrama de uma combinação é a soma dos diagramas dos casos).
// Convenções: eixos locais da barra (x ao longo, y e z transversais); N > 0 é tração; Mz > 0 traciona a face y−
// (nas vigas, embaixo). Nos pilares (`diagramaPilar`) a normal sai com compressão positiva.
import { baseBarra, type V3 } from '../fe3d';
import type { AnaliseEdificio } from '../building/analitico';
import { combinacoesEdificio } from '../building/combinacoes';
import { porCaso, type Estacao } from '../building/dimensionamento';
import { casosDaObra, type BuildingModel } from '../building/types';
import { hipoteseDeCombinacao, hipotesesDisponiveis, type Hipotese } from './deformada';

export const COMPONENTES = ['N', 'Vy', 'Vz', 'My', 'Mz', 'T'] as const;
export type Componente = (typeof COMPONENTES)[number];
/** Esforços locais da seção (kN, kN·m) e o vetor da força na seção em eixos globais (N, Vy, Vz levados ao global). */
export type Comp = Record<Componente, number> & { Fx: number; Fy: number; Fz: number };
const CHAVES: (keyof Comp)[] = [...COMPONENTES, 'Fx', 'Fy', 'Fz'];

/** Envoltória das combinações de uma família (ELU, rara, frequente ou quase permanente). */
export interface Envoltoria { id: string; nome: string; tipo: 'envoltoria'; familia: 'ELU' | 'RARA' | 'FREQ' | 'QP'; combinacoes: Hipotese[] }
export type HipoteseEsforco = Hipotese | Envoltoria;

const ROTULO_FAMILIA: Record<Envoltoria['familia'], string> = { ELU: 'Envoltória ELU', RARA: 'Envoltória rara', FREQ: 'Envoltória frequente', QP: 'Envoltória quase permanente' };

/** Seletor Envoltória / Combinação / Caso das janelas de elemento: envoltórias das famílias presentes, combinações e casos. */
export function hipotesesDeEsforco(b: BuildingModel, an: AnaliseEdificio): HipoteseEsforco[] {
  const combs = combinacoesEdificio(b, an);
  const env: Envoltoria[] = (['ELU', 'RARA', 'FREQ', 'QP'] as const)
    .map((familia) => ({ id: `env:${familia}`, nome: ROTULO_FAMILIA[familia], tipo: 'envoltoria' as const, familia, combinacoes: combs.filter((c) => c.tipo === familia).map(hipoteseDeCombinacao) }))
    .filter((e) => e.combinacoes.length);
  return [...env, ...hipotesesDisponiveis(b, an)];
}

/** Caso simples da obra (ou do vento) pelo id. */
export const hipoteseDoCaso = (b: BuildingModel, caso: string): Hipotese => {
  const nome = casosDaObra(b).find((c) => c.id === caso)?.nome ?? caso;
  return { id: `caso:${caso}`, nome, tipo: 'caso', fatores: { [caso]: 1 } };
};

const zero = (): Comp => ({ N: 0, Vy: 0, Vz: 0, My: 0, Mz: 0, T: 0, Fx: 0, Fy: 0, Fz: 0 });

export interface PontoEsforco {
  /** Posição ao longo da cadeia de barras (m, só a parte flexível) e índice da barra no pórtico. */
  x: number; bar: number;
  /** Posição no espaço (m, globais). */
  pos: V3;
  /** Valor (caso e combinação: max = min) ou extremos da envoltória. */
  max: Comp; min: Comp;
}

export interface BarraDiagrama { bi: number; L: number; ini: V3; ex: V3; ey: V3; ez: V3; x0: number }

export interface Extremo { valor: number; x: number; pos: V3; /** combinação que dá o extremo (envoltória) ou nome da hipótese */ por: string }

export interface DiagramaBarras {
  hipotese: HipoteseEsforco;
  barras: BarraDiagrama[];
  pontos: PontoEsforco[];
  /** Extremos globais de cada componente (valor, ponto e combinação). */
  extremos: Record<keyof Comp, { max: Extremo; min: Extremo }>;
  /** Casos citados pela hipótese que não têm esforço no pórtico (ex.: P-Δ sem convergência). */
  ignorados: string[];
}

/** Hipóteses (nome + fatores) que compõem a seleção: o próprio caso ou combinação, ou as combinações da envoltória. */
const partes = (h: HipoteseEsforco): { nome: string; fatores: Record<string, number> }[] => (h.tipo === 'envoltoria' ? h.combinacoes.map((c) => ({ nome: c.nome, fatores: c.fatores })) : [{ nome: h.nome, fatores: h.fatores }]);

/** Estações da barra: n divisões da parte flexível (mínimo 4) e dois pontos junto a cada carga concentrada (degrau do cortante). */
export function estacoesDaBarra(an: AnaliseEdificio, bi: number, passo = 0.25): number[] {
  const { L } = baseBarra(an.portico.modelo, an.portico.modelo.barras[bi]);
  const n = Math.max(4, Math.ceil(L / passo - 1e-9));
  const xs = Array.from({ length: n + 1 }, (_, k) => (k * L) / n);
  for (const c of an.portico.casos ?? []) for (const p of c.pontuais ?? []) if (p.barra === bi) xs.push(Math.max(0, p.a - 1e-6), Math.min(L, p.a + 1e-6));
  return xs.sort((a, z) => a - z);
}

/**
 * Diagrama de uma cadeia de barras do pórtico (na ordem dada) para a hipótese. Casos e combinações dão um só valor por
 * estação (max = min); a envoltória dá os extremos entre as suas combinações.
 */
export function diagramaBarras(an: AnaliseEdificio, bis: number[], h: HipoteseEsforco, passo = 0.25): DiagramaBarras {
  const pm = an.portico, ps = partes(h), nomesUsados = new Set(ps.flatMap((p) => Object.keys(p.fatores)));
  const pontos: PontoEsforco[] = [], barras: BarraDiagrama[] = [];
  const vazio = (): Extremo => ({ valor: 0, x: 0, pos: [0, 0, 0], por: '' });
  const extremos = Object.fromEntries(CHAVES.map((k) => [k, { max: { ...vazio(), valor: -Infinity }, min: { ...vazio(), valor: Infinity } }])) as DiagramaBarras['extremos'];
  const ignorados = new Set<string>();
  let x0 = 0;
  for (const bi of bis) {
    const m = pm.modelo, br = m.barras[bi], { L, R } = baseBarra(m, br);
    const xs = estacoesDaBarra(an, bi, passo), pc = porCaso(an, bi, xs);
    for (const nome of nomesUsados) if (!pc[nome]) ignorados.add(nome);
    const oi = br.offI ?? [0, 0, 0], ni = m.nos[br.i], ini: V3 = [ni[0] + oi[0], ni[1] + oi[1], ni[2] + oi[2]];
    barras.push({ bi, L, ini, ex: R[0], ey: R[1], ez: R[2], x0 });
    xs.forEach((x, i) => {
      const max = { ...zero() }, min = { ...zero() };
      let primeira = true;
      for (const p of ps) {
        const v = zero();
        for (const nome in p.fatores) {
          const e: Estacao | undefined = pc[nome]?.[i];
          if (!e) continue;
          const f = p.fatores[nome];
          for (const k of COMPONENTES) v[k] += f * e[k];
        }
        // força na seção em eixos globais: (N, Vy, Vz) locais → global (linhas de R = eixos locais em coordenadas globais)
        v.Fx = R[0][0] * v.N + R[1][0] * v.Vy + R[2][0] * v.Vz;
        v.Fy = R[0][1] * v.N + R[1][1] * v.Vy + R[2][1] * v.Vz;
        v.Fz = R[0][2] * v.N + R[1][2] * v.Vy + R[2][2] * v.Vz;
        const pos: V3 = [ini[0] + R[0][0] * x, ini[1] + R[0][1] * x, ini[2] + R[0][2] * x];
        for (const k of CHAVES) {
          if (primeira || v[k] > max[k]) max[k] = v[k];
          if (primeira || v[k] < min[k]) min[k] = v[k];
          const ex = extremos[k];
          if (v[k] > ex.max.valor) ex.max = { valor: v[k], x: x0 + x, pos, por: p.nome };
          if (v[k] < ex.min.valor) ex.min = { valor: v[k], x: x0 + x, pos, por: p.nome };
        }
        primeira = false;
      }
      const pos: V3 = [ini[0] + R[0][0] * x, ini[1] + R[0][1] * x, ini[2] + R[0][2] * x];
      pontos.push({ x: x0 + x, bar: bi, pos, max, min });
    });
    x0 += L;
  }
  for (const k of CHAVES) { const e = extremos[k]; if (e.max.valor === -Infinity) { e.max = vazio(); e.min = vazio(); } }
  return { hipotese: h, barras, pontos, extremos, ignorados: [...ignorados] };
}

// ---------------- vigas ----------------

/** Abscissa (m) da projeção de P (planta) no traçado da viga. */
function abscissaNoTracado(pts: [number, number][], P: [number, number]): number {
  let melhor = Infinity, s = 0, acum = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], dx = z[0] - a[0], dy = z[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const t = Math.max(0, Math.min(L, ((P[0] - a[0]) * dx + (P[1] - a[1]) * dy) / L));
    const d = Math.hypot(a[0] + (dx * t) / L - P[0], a[1] + (dy * t) / L - P[1]);
    if (d < melhor - 1e-9) { melhor = d; s = acum + t; }
    acum += L;
  }
  return s;
}

export interface DiagramaViga extends DiagramaBarras {
  viga: string; pavimento: string;
  /** Abscissa ao longo do traçado da viga (m), na ordem dos pontos. */
  s: number[];
}

/**
 * M (Mz), V (Vz global na vertical: Fz) e T da viga por hipótese, um diagrama por pavimento do grupo (ou só o pedido).
 * A viga sem barras no pórtico (não calculada) devolve lista vazia.
 */
export function diagramaViga(b: BuildingModel, an: AnaliseEdificio, vigaId: string, h: HipoteseEsforco, o: { pavimento?: string; passo?: number } = {}): DiagramaViga[] {
  const v = b.vigas.find((x) => x.id === vigaId);
  if (!v) return [];
  const barras = an.portico.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === 'viga' && t.ref === vigaId);
  const pavs = [...new Set(barras.map(([t]) => t.pavimento))].filter((p) => !o.pavimento || p === o.pavimento);
  return pavs.map((pavimento) => {
    const bis = barras.filter(([t]) => t.pavimento === pavimento).map(([, i]) => i);
    const d = diagramaBarras(an, bis, h, o.passo);
    return { ...d, viga: vigaId, pavimento, s: d.pontos.map((p) => abscissaNoTracado(v.pontos, [p.pos[0], p.pos[1]])) };
  });
}

// ---------------- pilares ----------------

export interface DiagramaPilar extends DiagramaBarras {
  pilar: string;
  /** Altura de cada ponto acima da base do pilar (m) e o lance (pavimento) a que pertence. */
  altura: number[]; lance: string[];
}

/**
 * Esforços do pilar ao longo da altura (todos os lances, da base ao topo) por hipótese. N sai com compressão positiva;
 * Mu = Mz e Mv = My locais (u = Vy, v = Vz); Fx e Fy são os cortantes horizontais globais (Fz = normal global).
 */
export function diagramaPilar(an: AnaliseEdificio, pilarId: string, h: HipoteseEsforco, o: { passo?: number } = {}): DiagramaPilar | null {
  const m = an.portico.modelo;
  const lances = an.portico.barras.map((t, i) => [t, i] as const).filter(([t]) => (t.tipo === 'pilar' || t.tipo === 'parede') && t.ref === pilarId).map(([t, i]) => ({ t, i, z: Math.min(m.nos[m.barras[i].i][2], m.nos[m.barras[i].j][2]) }));
  if (!lances.length) return null;
  lances.sort((a, z) => a.z - z.z);
  // barras com o nó i no pé: o diagrama segue a ordem de baixo para cima
  const d = diagramaBarras(an, lances.map((l) => l.i), h, o.passo);
  const z0 = d.pontos[0]?.pos[2] ?? 0;
  const inverte = (c: Comp) => ({ ...c, N: -c.N });
  // compressão positiva: troca o sinal e os extremos (max ↔ min) da normal
  for (const p of d.pontos) { const mx = inverte(p.min), mn = inverte(p.max); p.max = { ...p.max, N: mx.N }; p.min = { ...p.min, N: mn.N }; }
  const ex = d.extremos.N;
  d.extremos.N = { max: { ...ex.min, valor: -ex.min.valor }, min: { ...ex.max, valor: -ex.max.valor } };
  const lanceDe = new Map(lances.map((l) => [l.i, l.t.pavimento]));
  return { ...d, pilar: pilarId, altura: d.pontos.map((p) => p.pos[2] - z0), lance: d.pontos.map((p) => lanceDe.get(p.bar) ?? '') };
}

/**
 * Esforços do pilar numa altura qualquer acima da base (V6d, K1.11.28): interpolação linear entre os pontos do diagrama.
 * Alturas fora do pilar ficam no extremo mais próximo. Mesmas convenções de `diagramaPilar` (N com compressão positiva).
 */
export function esforcosPilarEmAltura(d: DiagramaPilar, altura: number): { altura: number; lance: string; max: Comp; min: Comp } {
  const z = d.altura, n = z.length;
  const h = Math.min(Math.max(altura, z[0] ?? 0), z[n - 1] ?? 0);
  let i = 0;
  while (i < n - 2 && z[i + 1] < h) i++;
  const t = n < 2 || z[i + 1] === z[i] ? 0 : (h - z[i]) / (z[i + 1] - z[i]);
  const mix = (k: 'max' | 'min'): Comp => {
    const a = d.pontos[i][k], b = d.pontos[Math.min(i + 1, n - 1)][k], o = zero();
    for (const c of Object.keys(o) as (keyof Comp)[]) o[c] = a[c] + t * (b[c] - a[c]);
    return o;
  };
  return { altura: h, lance: d.lance[t > 0.5 ? Math.min(i + 1, n - 1) : i] ?? '', max: mix('max'), min: mix('min') };
}

// ---------------- vigas inclinadas e diagonais ----------------

/** Diagrama da viga inclinada ou diagonal (todas as barras que a compõem, nos cruzamentos divididas). */
export function diagramaInclinada(an: AnaliseEdificio, id: string, h: HipoteseEsforco, o: { passo?: number } = {}): (DiagramaBarras & { id: string; diagonal: boolean }) | null {
  const inc = an.inclinadas?.find((x) => x.id === id);
  if (!inc) return null;
  const bis = inc.segs?.length ? inc.segs.map((s) => s.bi) : [inc.bi];
  return { ...diagramaBarras(an, bis, h, o.passo), id, diagonal: !!inc.diagonal };
}

// ---------------- desenho do diagrama ----------------

/** Grandeza desenhada: M é o momento do plano da viga (Mz), My é fora do plano. */
export type GrandezaDiagrama = Componente;

/**
 * Lado do desenho: o momento é desenhado do lado tracionado (Mz > 0 traciona a face y−, logo o desenho vai para −y);
 * N, V e T para +y; My e Vz para +z [lado de My a confirmar]. Devolve o vetor unitário (global) do deslocamento do
 * valor positivo.
 */
export function direcaoDoDiagrama(g: GrandezaDiagrama, ey: V3, ez: V3): V3 {
  if (g === 'Mz') return [-ey[0], -ey[1], -ey[2]];
  if (g === 'My' || g === 'Vz') return ez;
  return ey;
}

export interface DesenhoDiagrama {
  /** Linha de base (eixo da barra) e curva do diagrama, pontos 3D (m). Com envoltória, a curva do máximo e a do mínimo. */
  base: V3[]; curva: V3[]; curvaMin?: V3[];
  /** Linhas ligando a base à curva (hachura) a cada `cada` pontos, mais os extremos. */
  hachuras: [V3, V3][];
  /** Valores extremos rotulados (máximo e mínimo em módulo). */
  rotulos: { pos: V3; valor: number }[];
}

/**
 * Pontos 3D do diagrama: cada estação é deslocada `escala · valor` (m por unidade do esforço) na direção do lado do
 * desenho da grandeza (`direcaoDoDiagrama`). `plano: 'planta'` projeta o deslocamento no plano horizontal (para o
 * desenho em planta de vigas): usa a normal horizontal ao eixo da barra.
 */
export function desenharDiagrama(d: DiagramaBarras, g: GrandezaDiagrama, escala: number, o: { plano?: 'espaco' | 'planta'; cada?: number } = {}): DesenhoDiagrama {
  const eixosDe = new Map(d.barras.map((b) => [b.bi, b]));
  const desloca = (p: PontoEsforco, valor: number): V3 => {
    const br = eixosDe.get(p.bar)!;
    let dir = direcaoDoDiagrama(g, br.ey, br.ez);
    if (o.plano === 'planta') {
      // normal horizontal ao eixo: o deslocamento vertical vira lateral (+ à esquerda do sentido da barra)
      const nx = -br.ex[1], ny = br.ex[0], nl = Math.hypot(nx, ny) || 1;
      dir = [nx / nl, ny / nl, 0];
    }
    return [p.pos[0] + dir[0] * escala * valor, p.pos[1] + dir[1] * escala * valor, p.pos[2] + dir[2] * escala * valor];
  };
  const base = d.pontos.map((p) => p.pos), env = d.hipotese.tipo === 'envoltoria';
  const curva = d.pontos.map((p) => desloca(p, p.max[g]));
  const curvaMin = env ? d.pontos.map((p) => desloca(p, p.min[g])) : undefined;
  const cada = o.cada ?? 2, hachuras: [V3, V3][] = [];
  d.pontos.forEach((p, i) => { if (i % cada === 0 || i === d.pontos.length - 1) { hachuras.push([p.pos, curva[i]]); if (curvaMin) hachuras.push([p.pos, curvaMin[i]]); } });
  const ex = d.extremos[g], rotulos: DesenhoDiagrama['rotulos'] = [];
  if (Math.abs(ex.max.valor) > 1e-9) rotulos.push({ pos: ex.max.pos, valor: ex.max.valor });
  if (Math.abs(ex.min.valor) > 1e-9 && Math.abs(ex.min.valor - ex.max.valor) > 1e-9) rotulos.push({ pos: ex.min.pos, valor: ex.min.valor });
  return { base, curva, ...(curvaMin ? { curvaMin } : {}), hachuras, rotulos };
}

/** Escala automática (m por unidade) para que o maior valor da grandeza ocupe `alvo` metros. */
export function escalaAutomatica(d: DiagramaBarras, g: GrandezaDiagrama, alvo = 0.8): number {
  const ex = d.extremos[g], m = Math.max(Math.abs(ex.max.valor), Math.abs(ex.min.valor));
  return m > 1e-12 ? alvo / m : 1;
}
