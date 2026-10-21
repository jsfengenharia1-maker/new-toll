// Geração automática de fundações (frente FU, fatia FU4): decide, para os pilares sem fundação, o tipo (sapata, bloco sobre
// estacas ou tubulão), a posição (centrada, de divisa ou de canto), os elementos associados (sapata associada ou bloco com
// vários pilares), as vigas de equilíbrio (pilares "em frente") e as vigas de travamento (blocos de 1 e 2 estacas).
// O núcleo só planeja: devolve a lista de passos (`fundacao.criar` e `vigaFundacao.criar`), que o comando `fundacao.gerar`
// executa como um passo só; tudo continua editável depois. Sem análise: a estimativa de sobreposição e do número de
// estacas usa as cargas informadas (`cargas`, kN característicos por pilar), se vierem. Unidades: kN, m.
import { pilaresNaBase } from './baseElastica';
import { sptSigma } from '../footings';
import type { P } from '../geom/faces';
import { sobrepoe } from '../geom/poly';
import type { Boring } from '../piles';
import { cotaTerreno, parametrosFundacao, secaoBase } from './fundacao';
import { opcoesEmUso, perfilDe } from './opcoes';
import { centroBase, meiaFace } from './vigasFundacao';
import { contornoPilar, cotaFundacao, mascaraParaMundo, type BuildingModel, type Pilar, type TipoFundacao } from './types';

export type TipoGerar = 'auto' | TipoFundacao;

export interface ParametrosGerar {
  /** Pilares a gerar; ausente = todos os que nascem na fundação e ainda não têm elemento. */
  pilares?: string[];
  /** Tipo dos elementos; 'auto' (padrão): bloco se a σadm (informada ou pelo SPT) for menor que `gerarSigmaMin` e houver estaca, senão sapata. */
  tipo?: TipoGerar;
  /** Estaca do terreno para os blocos; padrão: a primeira. */
  estaca?: string;
  /** D, A e distância de associação (m, graus, m); ausentes = as opções. */
  distanciaVisao?: number;
  anguloVisao?: number;
  distanciaAssociada?: number;
  /** Gerar associadas (sapata associada, bloco com vários pilares), vigas de equilíbrio e de travamento (padrão: sim). */
  associadas?: boolean;
  vigasEquilibrio?: boolean;
  vigasTravamento?: boolean;
  /** Camadas das máscaras tratadas como divisa (além dos limites poligonais). */
  camadasDivisa?: string[];
  /** Cargas características (Nk, kN) por pilar, da última análise: permitem estimar sobreposição e número de estacas. */
  cargas?: { pilar: string; Nk: number }[];
}

export interface PassoGerar { nome: 'fundacao.criar' | 'vigaFundacao.criar'; params: Record<string, unknown> }

export interface PlanoGerar {
  passos: PassoGerar[];
  avisos: string[];
  /** Contagens para a mensagem e os testes. */
  contagem: { sapatas: number; blocos: number; tubuloes: number; divisa: number; canto: number; associadas: number; equilibrio: number; travamento: number };
}

const dot = (a: P, z: P) => a[0] * z[0] + a[1] * z[1];
const cruz = (a: P, z: P) => Math.abs(a[0] * z[1] - a[1] * z[0]);
const norm = (v: P): P => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const rad = (g: number) => (g * Math.PI) / 180;

/** Direções locais do pilar: +x, −x, +y, −y (vetores unitários globais) e o lado correspondente nos eixos do elemento. */
function direcoes(p: Pick<Pilar, 'angulo'>): { u: P; lado: [number, number] }[] {
  const a = rad(p.angulo), c = Math.cos(a), s = Math.sin(a);
  return [{ u: [c, s], lado: [1, 0] }, { u: [-c, -s], lado: [-1, 0] }, { u: [-s, c], lado: [0, 1] }, { u: [s, -c], lado: [0, -1] }];
}

/** Distância mínima entre dois polígonos convexos (0 se se tocam ou se sobrepõem). */
export function distanciaEntrePoligonos(a: P[], z: P[]): number {
  if (sobrepoe(a, z, -1e-9)) return 0;
  const dps = (q: P, s0: P, s1: P) => {
    const dx = s1[0] - s0[0], dy = s1[1] - s0[1], L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((q[0] - s0[0]) * dx + (q[1] - s0[1]) * dy) / L2)) : 0;
    return Math.hypot(q[0] - (s0[0] + t * dx), q[1] - (s0[1] + t * dy));
  };
  let m = Infinity;
  for (const [A, B] of [[a, z], [z, a]] as [P[], P[]][]) for (const q of A) for (let i = 0; i < B.length; i++) m = Math.min(m, dps(q, B[i], B[(i + 1) % B.length]));
  return m;
}

/** Segmentos de divisa em planta: limites poligonais do nível e as camadas indicadas das máscaras. */
function segmentosDivisa(b: BuildingModel, camadas: string[] | undefined): [P, P][] {
  const out: [P, P][] = [];
  const cota = cotaFundacao(b);
  for (const l of b.fundacao?.limites ?? []) {
    if (l.cota !== undefined && Math.abs(l.cota - cota) > 1e-3) continue;
    const pts = l.fechado && l.pontos.length > 2 ? [...l.pontos, l.pontos[0]] : l.pontos;
    for (let i = 0; i + 1 < pts.length; i++) out.push([pts[i] as P, pts[i + 1] as P]);
  }
  if (camadas?.length) for (const m of b.mascaras) for (const nome of camadas) {
    const g = m.geo[nome];
    if (!g) continue;
    for (let k = 0; k + 3 < g.linhas.length; k += 4) out.push([mascaraParaMundo(m, g.linhas[k], g.linhas[k + 1]), mascaraParaMundo(m, g.linhas[k + 2], g.linhas[k + 3])]);
  }
  return out;
}

/** Distância ao longo do raio (origem o, direção u) até o primeiro segmento; Infinity se não houver. */
function raioAteSegmento(o: P, u: P, segs: [P, P][]): number {
  let m = Infinity;
  for (const [a, z] of segs) {
    const ex = z[0] - a[0], ey = z[1] - a[1], den = u[0] * ey - u[1] * ex;
    if (Math.abs(den) < 1e-12) continue;
    const wx = a[0] - o[0], wy = a[1] - o[1];
    const t = (wx * ey - wy * ex) / den, s = (wx * u[1] - wy * u[0]) / den;
    if (t >= -1e-9 && s >= -1e-9 && s <= 1 + 1e-9) m = Math.min(m, Math.max(0, t));
  }
  return m;
}

/** σadm estimada (kN/m²) no pilar: a informada do terreno ou o SPT do furo mais próximo (N̄/50, bulbo de 1,5 lado); null sem dado. */
function sigmaEstimada(b: BuildingModel, c: P): number | null {
  const fe = b.fundacao;
  if (!fe) return null;
  const t = fe.terreno;
  if (t.sigmaModo === 'informada') return t.sigmaAdm && t.sigmaAdm > 0 ? t.sigmaAdm : null;
  if (!fe.sondagens.length) return null;
  const furo = [...fe.sondagens].sort((a, z) => Math.hypot((a.x ?? c[0]) - c[0], (a.y ?? c[1]) - c[1]) - Math.hypot((z.x ?? c[0]) - c[0], (z.y ?? c[1]) - c[1]))[0] as Boring;
  const P0 = parametrosFundacao(b);
  const prof = Math.max(0, cotaTerreno(b) - cotaFundacao(b));
  const r = sptSigma(furo, prof, P0.ftBulb * 1.5, P0.ftSptDiv, P0.ftNmaxEst);
  return r ? r.sigma : null;
}

const retanguloOrientado = (c: P, L: number, angulo: number): P[] => {
  const a = rad(angulo), co = Math.cos(a), si = Math.sin(a), h = L / 2;
  return ([[-h, -h], [h, -h], [h, h], [-h, h]] as P[]).map(([x, y]) => [c[0] + x * co - y * si, c[1] + x * si + y * co] as P);
};

/**
 * Planeja a geração automática. Não altera o modelo. Regras (a confirmar onde sem fonte):
 * - tipo: o escolhido ou, em 'auto', bloco se σadm < `gerarSigmaMin` e há estaca cadastrada, senão sapata;
 * - pilar "em frente" de uma face: eixo desalinhado menos que D e dentro do cone de abertura A (A/2 de cada lado);
 * - face sem pilar em frente (ou com limite/divisa a menos de `gerarDistLimite`) tem balanço nulo: divisa (uma face) ou
 *   canto (duas); só uma face por direção (se as duas faltam, o elemento fica centrado nessa direção);
 * - pilares com bordas a menos de `gerarDistAssociada` (ou com elementos estimados sobrepostos, se há cargas) viram uma
 *   associada (sapata) ou um bloco com vários pilares (centrados na resultante);
 * - elementos de divisa e de canto: viga de equilíbrio até o pilar em frente mais próximo do lado oposto (uma por direção);
 * - blocos de 1 e 2 estacas (estimadas pelas cargas e pela capacidade informada): vigas de travamento, ao pilar em frente
 *   mais próximo nas direções exigidas pela NBR 6122 (1 estaca: duas ortogonais; 2: perpendicular à linha das estacas).
 */
export function planejarFundacoes(b: BuildingModel, par: ParametrosGerar = {}): PlanoGerar {
  const op = opcoesEmUso(b.opcoes, perfilDe(b));
  const D = par.distanciaVisao ?? op.gerarDistVisao, A = par.anguloVisao ?? op.gerarAnguloVisao, gapAssoc = par.distanciaAssociada ?? op.gerarDistAssociada;
  const avisos: string[] = [];
  const contagem = { sapatas: 0, blocos: 0, tubuloes: 0, divisa: 0, canto: 0, associadas: 0, equilibrio: 0, travamento: 0 };
  const passos: PassoGerar[] = [];
  const fe = b.fundacao;
  const todos = b.pilares.filter((p) => p.nasce === 'fundacao');
  const jaTem = new Set((fe?.elementos ?? []).flatMap((e) => e.pilares))
  for (const x of pilaresNaBase(b)) jaTem.add(x.pilar); // sobre radier ou viga sobre base elástica (FU6): sem elemento próprio
  const escolhidos = par.pilares ? new Set(par.pilares) : null;
  const alvo = todos.filter((p) => !jaTem.has(p.id) && (!escolhidos || escolhidos.has(p.id)));
  if (!alvo.length) return { passos, avisos, contagem };

  const centro = new Map(todos.map((p) => [p.id, centroBase(b, p)] as const));
  const contorno = new Map(todos.map((p) => [p.id, contornoPilar(p, secaoBase(b, p)) as P[]] as const));
  const cargas = new Map((par.cargas ?? []).map((c) => [c.pilar, c.Nk] as const));
  const estaca = fe?.terreno.estacas.find((e) => e.id === par.estaca) ?? fe?.terreno.estacas[0];
  if (par.estaca && !fe?.terreno.estacas.some((e) => e.id === par.estaca)) avisos.push(`Estaca ${par.estaca} não existe no terreno; usada a primeira.`);
  const P0 = parametrosFundacao(b);
  const segs = segmentosDivisa(b, par.camadasDivisa);

  // ---- tipo por pilar
  const tipoDe = (p: Pilar): TipoFundacao => {
    const t = par.tipo ?? 'auto';
    if (t !== 'auto') return t;
    if (!estaca) return 'sapata';
    const s = sigmaEstimada(b, centro.get(p.id)!);
    return s === null || s < op.gerarSigmaMin ? 'bloco' : 'sapata';
  };
  const tipos = new Map(alvo.map((p) => [p.id, tipoDe(p)] as const));
  if ([...tipos.values()].includes('bloco') && !estaca) avisos.push('Há blocos a gerar, mas o terreno não tem tipo de estaca cadastrado: o comando recusa.');

  // ---- número de estacas estimado (capacidade informada) e lado estimado do elemento
  const nEstacas = (id: string): number | null => {
    const Nk = cargas.get(id);
    if (Nk === undefined || !estaca || estaca.modo !== 'informada' || !estaca.capacidade) return null;
    return Math.min(6, Math.max(1, Math.ceil((Nk * (1 + P0.blockWeightPct / 100)) / estaca.capacidade)));
  };
  const ladoEstimado = (p: Pilar): number | null => {
    const Nk = cargas.get(p.id), tipo = tipos.get(p.id)!;
    if (Nk === undefined) return null;
    if (tipo === 'sapata') {
      const s = sigmaEstimada(b, centro.get(p.id)!);
      return s ? Math.max(0.6, Math.sqrt((Nk * (1 + P0.ftPP / 100)) / s)) : null;
    }
    if (tipo === 'bloco' && estaca) {
      const n = nEstacas(p.id);
      if (n === null) return null;
      const Dm = estaca.D / 100, sp = estaca.s ?? (estaca.tipo === 'premoldada' ? P0.spacingPrecast : P0.spacingInSitu) * Dm;
      return (Math.ceil(Math.sqrt(n)) - 1) * sp + Dm + 0.3;
    }
    return null;
  };

  // ---- associação: distância entre bordas ou elementos estimados sobrepostos
  const grupoDe = new Map<string, string>(alvo.map((p) => [p.id, p.id]));
  const raiz = (id: string): string => { let r = id; while (grupoDe.get(r) !== r) r = grupoDe.get(r)!; grupoDe.set(id, r); return r; };
  const unir = (a: string, z: string) => { const ra = raiz(a), rz = raiz(z); if (ra !== rz) grupoDe.set(rz, ra); };
  const associar = par.associadas !== false;
  if (associar) {
    for (let i = 0; i < alvo.length; i++) for (let j = i + 1; j < alvo.length; j++) {
      const p = alvo[i], q = alvo[j];
      if (tipos.get(p.id) === 'tubulao' || tipos.get(q.id) === 'tubulao') continue;
      let junta = distanciaEntrePoligonos(contorno.get(p.id)!, contorno.get(q.id)!) < gapAssoc - 1e-9;
      if (!junta) {
        const lp = ladoEstimado(p), lq = ladoEstimado(q);
        if (lp !== null && lq !== null) junta = sobrepoe(retanguloOrientado(centro.get(p.id)!, lp, p.angulo), retanguloOrientado(centro.get(q.id)!, lq, q.angulo));
      }
      if (junta) unir(p.id, q.id);
    }
  }
  const membros = new Map<string, Pilar[]>();
  for (const p of alvo) { const r = raiz(p.id); (membros.get(r) ?? membros.set(r, []).get(r)!).push(p); }

  // ---- pilares em frente
  const emFrente = (p: Pilar, u: P) => {
    const c = centro.get(p.id)!, n: P = [-u[1], u[0]];
    return todos.filter((q) => q.id !== p.id).map((q) => {
      const d: P = [centro.get(q.id)![0] - c[0], centro.get(q.id)![1] - c[1]];
      const s = dot(d, u), t = Math.abs(dot(d, n));
      return { q, s, t };
    }).filter((x) => x.s > 1e-6 && x.t < D - 1e-9 && (Math.atan2(x.t, x.s) * 180) / Math.PI <= A / 2 + 1e-9).sort((a, z) => a.s - z.s);
  };
  /** A face (direção u) tem divisa/limite a menos de `gerarDistLimite` da face do pilar? */
  const limiteNaFace = (p: Pilar, u: P): boolean => {
    if (!segs.length) return false;
    const c = centro.get(p.id)!, n: P = [-u[1], u[0]], f = meiaFace(b, p, u), w = meiaFace(b, p, n);
    for (const k of [-1, -0.5, 0, 0.5, 1]) {
      const o: P = [c[0] + u[0] * f + n[0] * w * k, c[1] + u[1] * f + n[1] * w * k];
      if (raioAteSegmento(o, u, segs) <= op.gerarDistLimite + 1e-9) return true;
    }
    return false;
  };

  // vigas já existentes ou planejadas, por par de pilares
  const par2 = (a: string, z: string) => [a, z].sort().join('|');
  const pilarDe = (id: string) => b.fundacao?.elementos.find((e) => e.id === id)?.pilares[0] ?? id;
  const pares = new Set((fe?.vigas ?? []).map((v) => par2(pilarDe(v.ini), pilarDe(v.fim))));
  const direcoesDoPilar = new Map<string, P[]>();
  const anotar = (a: string, z: string) => {
    for (const [x, y] of [[a, z], [z, a]] as const) {
      const cx = centro.get(x), cy = centro.get(y);
      if (!cx || !cy) continue;
      (direcoesDoPilar.get(x) ?? direcoesDoPilar.set(x, []).get(x)!).push(norm([cy[0] - cx[0], cy[1] - cx[1]]));
    }
  };
  for (const v of fe?.vigas ?? []) anotar(pilarDe(v.ini), pilarDe(v.fim));
  const vigas: PassoGerar[] = [];
  const lancarViga = (tipo: 'equilibrio' | 'travamento', a: string, z: string) => {
    const k = par2(a, z);
    if (pares.has(k)) return false;
    pares.add(k);
    anotar(a, z);
    vigas.push({ nome: 'vigaFundacao.criar', params: { tipo, ini: a, fim: z } });
    contagem[tipo === 'equilibrio' ? 'equilibrio' : 'travamento']++;
    return true;
  };

  // ---- elementos
  const feitos = new Set<string>();
  for (const p of alvo) {
    const r = raiz(p.id), g = membros.get(r)!;
    if (feitos.has(r)) continue;
    feitos.add(r);
    if (g.length > 1) {
      // associada (sapata) ou bloco com vários pilares; um bloco entre eles faz o grupo ser bloco
      const tipo: TipoFundacao = g.some((q) => tipos.get(q.id) === 'bloco') ? 'bloco' : 'sapata';
      passos.push({ nome: 'fundacao.criar', params: { pilares: g.map((q) => q.id), tipo, posicao: 'centrada', ...(tipo === 'bloco' && estaca ? { estaca: { id: estaca.id } } : {}) } });
      contagem.associadas++;
      contagem[tipo === 'bloco' ? 'blocos' : 'sapatas']++;
      continue;
    }
    const tipo = tipos.get(p.id)!;
    const dirs = direcoes(p);
    const fr = dirs.map((d) => emFrente(p, d.u));
    const sem = fr.map((f) => f.length === 0);
    const lim = dirs.map((d) => limiteNaFace(p, d.u));
    const eixo = (i: number): -1 | 0 | 1 => {
      if (lim[i] !== lim[i + 1]) return lim[i] ? 1 : -1;
      if (lim[i] && lim[i + 1]) return 0;
      if (sem[i] !== sem[i + 1]) return sem[i] ? 1 : -1;
      return 0;
    };
    let lado: [number, number] = [eixo(0), eixo(2)];
    if (tipo === 'tubulao' && (lado[0] || lado[1])) { avisos.push(`${p.nome}: tubulão só centrado sob o pilar; a excentricidade da divisa fica sem equilíbrio (use viga de equilíbrio com sapata ou bloco).`); lado = [0, 0]; }
    const nz = lado.filter((v) => v !== 0).length;
    const posicao = nz === 0 ? 'centrada' : nz === 1 ? 'divisa' : 'canto';
    passos.push({ nome: 'fundacao.criar', params: { pilar: p.id, tipo, posicao, ...(nz ? { lado } : {}), ...(tipo === 'bloco' && estaca ? { estaca: { id: estaca.id } } : {}) } });
    contagem[tipo === 'sapata' ? 'sapatas' : tipo === 'bloco' ? 'blocos' : 'tubuloes']++;
    if (nz === 1) contagem.divisa++;
    if (nz === 2) contagem.canto++;

    // vigas de equilíbrio: uma por direção excêntrica, ao pilar em frente mais próximo do lado oposto
    if (nz && par.vigasEquilibrio !== false) {
      for (const [i, v] of ([[0, lado[0]], [2, lado[1]]] as const)) {
        if (!v) continue;
        const oposto = v > 0 ? i + 1 : i; // índice da direção oposta à divisa
        const alvoViga = fr[oposto][0]?.q;
        if (!alvoViga) { avisos.push(`${p.nome}: elemento de ${nz === 2 ? 'canto' : 'divisa'} sem pilar em frente do lado oposto; sem viga de equilíbrio (a excentricidade fica sem equilíbrio).`); continue; }
        if (!lancarViga('equilibrio', p.id, alvoViga.id) && !pares.has(par2(p.id, alvoViga.id))) avisos.push(`${p.nome}: viga de equilíbrio até ${alvoViga.nome} não lançada.`);
      }
    }

    // travamento obrigatório dos blocos de 1 e 2 estacas (NBR 6122), pelo número de estacas estimado
    if (tipo === 'bloco' && par.vigasTravamento !== false) {
      const n = nEstacas(p.id);
      if (n === null) {
        if (!avisos.some((a) => a.startsWith('Travamento dos blocos'))) avisos.push('Travamento dos blocos de 1 e 2 estacas não gerado: informe as cargas (calcule o edifício antes) e use estaca de capacidade informada; o cálculo avisa com FUND_SEM_TRAVA.');
      } else if (n <= 2) {
        const cobertas = () => direcoesDoPilar.get(p.id) ?? [];
        const candidatas = dirs.map((d, i) => ({ d, f: fr[i][0] })).filter((x) => x.f).sort((a, z2) => a.f!.s - z2.f!.s);
        // 2 estacas: linha das estacas ao longo do eixo local x do elemento; a viga é perpendicular a ela (eixo local y)
        const ok = () => (n === 1 ? cobertas().some((a) => cobertas().some((z2) => cruz(a, z2) >= 0.7)) : cobertas().some((a) => cruz(a, dirs[0].u) >= 0.7));
        for (const x of candidatas) {
          if (ok()) break;
          const c0 = cobertas();
          // 1 estaca: a candidata entra se for a primeira ou ortogonal a alguma já lançada (paralela não completa o par)
          const util = n === 1 ? !c0.length || c0.some((a) => cruz(a, x.d.u) >= 0.7) : cruz(x.d.u, dirs[0].u) >= 0.7;
          if (util) lancarViga('travamento', p.id, x.f!.q.id);
        }
        if (!ok()) avisos.push(`${p.nome}: bloco de ${n} estaca${n > 1 ? 's' : ''} sem pilar em frente suficiente para as vigas de travamento exigidas (NBR 6122).`);
      }
    }
  }
  passos.push(...vigas);
  return { passos, avisos, contagem };
}

/** Texto curto do resultado (barra de status). */
export function resumoPlano(pl: PlanoGerar): string {
  const c = pl.contagem, partes: string[] = [];
  if (c.sapatas) partes.push(`${c.sapatas} sapata${c.sapatas > 1 ? 's' : ''}`);
  if (c.blocos) partes.push(`${c.blocos} bloco${c.blocos > 1 ? 's' : ''}`);
  if (c.tubuloes) partes.push(`${c.tubuloes} tubulão${c.tubuloes > 1 ? 'ões' : ''}`.replace('tubulãoões', 'tubulões'));
  const pos = [c.divisa && `${c.divisa} de divisa`, c.canto && `${c.canto} de canto`, c.associadas && `${c.associadas} associado${c.associadas > 1 ? 's' : ''}`].filter(Boolean);
  const vig = [c.equilibrio && `${c.equilibrio} de equilíbrio`, c.travamento && `${c.travamento} de travamento`].filter(Boolean);
  return `Fundações geradas: ${partes.join(', ') || 'nenhuma'}${pos.length ? ` (${pos.join(', ')})` : ''}${vig.length ? `; vigas: ${vig.join(', ')}` : ''}.${pl.avisos.length ? ` ${pl.avisos.length} aviso${pl.avisos.length > 1 ? 's' : ''}: ${pl.avisos[0]}${pl.avisos.length > 1 ? ' …' : ''}` : ''}`;
}
