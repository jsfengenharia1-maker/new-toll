// Cintas da sapata corrida de aba única (frente FU, fatia FU8a): vigas de equilíbrio entre o eixo da corrida (apoio rente à
// divisa) e sapatas internas. Cada cinta toma o momento N·e do trecho tributário da corrida (alavanca clássica,
// R = N·ℓ/(ℓ − e), `alavanca` de vigasFundacao.ts com a corrida como ponta) e leva o alívio ΔN = N·e/(ℓ − e) ao elemento
// da ponta oposta. O dimensionamento é o das vigas de equilíbrio (`dimensionarVigaFundacao`): a ponta da corrida entra
// como "pilar fictício" no eixo (faces = bw/2), sem entrar na lista `fundacao.vigas`.
// Só sob parede (sem pilares sobre o eixo): sob pilares a corrida é uma viga sobre base elástica na análise global e a
// reação do solo não é recalculada com a alavanca. Unidades: kN, m.
import type { P } from '../geom/faces';
import type { OpcoesCalculo } from './opcoes';
import {
  alavanca, centroBase, dimensionarVigaFundacao, meiaFace, pontaVF, type GeometriaVF, type PontaVF, type ResultadoVigaFundacao,
} from './vigasFundacao';
import type { BuildingModel, CintaCorrida, Pilar, SapataCorrida, VigaFundacao } from './types';

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');
const cm = (v: number) => Math.round(v * 100);
const comprimentoCorridaPts = (pts: P[]) => pts.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);

/** Ponto do eixo (polilinha) na abscissa s (m) e a tangente unitária do trecho. */
export function pontoNoEixo(pts: P[], s: number): { p: P; t: P; s: number } {
  const L = comprimentoCorridaPts(pts), ss = Math.max(0, Math.min(L, s));
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], z = pts[i + 1], l = Math.hypot(z[0] - a[0], z[1] - a[1]);
    if (l < 1e-12) continue;
    if (acc + l >= ss - 1e-12 || i + 2 === pts.length) {
      const t = Math.min(1, (ss - acc) / l);
      return { p: [a[0] + t * (z[0] - a[0]), a[1] + t * (z[1] - a[1])], t: [(z[0] - a[0]) / l, (z[1] - a[1]) / l], s: ss };
    }
    acc += l;
  }
  return { p: pts[0], t: [1, 0], s: 0 };
}

/** Normal unitária que aponta para o lado da aba (esquerda do sentido do traçado = tangente girada +90°). */
export const normalDaAba = (aba: SapataCorrida['aba'], t: P): P => (aba === 'dir' ? [t[1], -t[0]] : [-t[1], t[0]]);

/** Cinta geometricamente resolvida: viga (para as rotinas das vigas de fundação), normal da aba, cosseno do desvio e trecho tributário. */
export interface GeoCinta {
  cinta: CintaCorrida;
  g: GeometriaVF;
  n: P;
  /** cos do ângulo entre a cinta e a normal à corrida (1 = perpendicular). */
  cosT: number;
  /** Trecho tributário da corrida (m, abscissas). */
  lo: number; hi: number;
  /** Pilar da ponta interna e elemento de fundação (se houver). */
  pilar?: Pilar; elementoId?: string; elementoNome?: string;
  erro?: string;
}

/** Cintas da corrida, em ordem de abscissa, com trechos tributários (pontos médios entre cintas; as extremas vão até as pontas do eixo). */
export function geometriasCintas(b: BuildingModel, c: SapataCorrida): { itens: GeoCinta[]; msgs: string[] } {
  const L = comprimentoCorridaPts(c.pontos), msgs: string[] = [], itens: GeoCinta[] = [];
  const ord = [...(c.cintas ?? [])].sort((a, z) => a.s - z.s);
  for (let i = 0; i < ord.length; i++) {
    const ct = ord[i], eix = pontoNoEixo(c.pontos, ct.s), n = normalDaAba(c.aba, eix.t), ponta = pontaVF(b, ct.fim);
    const viga: VigaFundacao = { id: ct.id, nome: ct.nome, tipo: 'equilibrio', ini: c.id, fim: ct.fim, b: ct.b, h: ct.h, ...(ct.fixa ? { fixa: true } : {}), ...(ct.ancoragem ? { ancoragem: ct.ancoragem } : {}) };
    // pilar fictício na ponta da corrida: as faces vêm de `faces` e o pilar nunca é lido
    const ini: PontaVF = { pilar: undefined as unknown as Pilar, nome: c.nome };
    const lo = i === 0 ? 0 : (ord[i - 1].s + ct.s) / 2, hi = i === ord.length - 1 ? L : (ct.s + ord[i + 1].s) / 2;
    const vazio = (erro: string): GeoCinta => ({ cinta: ct, g: { viga, ini, fim: ponta ?? null, a: eix.p, z: eix.p, u: n, L: 0, erro }, n, cosT: 0, lo, hi, erro });
    if (!ponta) { const e = `Sapata corrida ${c.nome}: cinta ${ct.nome} sem ponta interna (${ct.fim} não é elemento de fundação nem pilar que nasce na fundação).`; msgs.push(e); itens.push(vazio(e)); continue; }
    const z = centroBase(b, ponta.pilar), dx = z[0] - eix.p[0], dy = z[1] - eix.p[1], l = Math.hypot(dx, dy);
    if (l < 0.5) { const e = `Sapata corrida ${c.nome}: cinta ${ct.nome} com ponta interna a ${fmt(l)} m do eixo (mínimo 0,50 m).`; msgs.push(e); itens.push(vazio(e)); continue; }
    const u: P = [dx / l, dy / l], cosT = u[0] * n[0] + u[1] * n[1];
    if (cosT < 0.5) { const e = `Sapata corrida ${c.nome}: cinta ${ct.nome} oblíqua ou do lado oposto à aba (ponta ${ponta.nome}); a ponta interna deve ficar do lado da aba, a menos de 60° da normal à corrida.`; msgs.push(e); itens.push(vazio(e)); continue; }
    const fim = meiaFace(b, ponta.pilar, [-u[0], -u[1]]);
    itens.push({
      cinta: ct, n, cosT, lo, hi, pilar: ponta.pilar, ...(ponta.elemento ? { elementoId: ponta.elemento.id, elementoNome: ponta.elemento.nome } : {}),
      g: { viga, ini, fim: ponta, a: eix.p, z, u, L: l, faces: { ini: Math.min(c.bw / 2 / cosT, l / 3), fim } },
    });
  }
  for (let i = 1; i < itens.length; i++) if (itens[i].cinta.s - itens[i - 1].cinta.s < 0.1) msgs.push(`Sapata corrida ${c.nome}: cintas ${itens[i - 1].cinta.nome} e ${itens[i].cinta.nome} na mesma abscissa (distância menor que 10 cm).`);
  return { itens, msgs };
}

/** Fator de majoração da reação sob a corrida pela alavanca da cinta: R/N = 1/(1 − g/ℓ), g = e·cosθ, e = (B − bw)/2; null se impossível (g/ℓ ≥ 0,9). */
export function fatorCinta(B: number, bw: number, geo: Pick<GeoCinta, 'cosT' | 'g'>): number | null {
  if (!(geo.g.L > 0)) return null;
  const S = (((B - bw) / 2) * geo.cosT) / geo.g.L;
  return S >= 0.9 ? null : 1 / (1 - S);
}

/** Resultado de uma cinta: viga de equilíbrio dimensionada mais os dados da alavanca na corrida. */
export interface ResultadoCinta extends ResultadoVigaFundacao {
  corrida: string;
  /** Abscissa na corrida (m) e trecho tributário [lo, hi]. */
  s: number; tributario: [number, number];
  /** Pilar da ponta interna (id) e elemento de fundação (id e nome), se houver. */
  pilarId: string; elementoId?: string;
  /** Carga linear da corrida no trecho tributário (kN; rara máxima e mínima), reação R = N·fator (kN) e excentricidade e (m). */
  N: number; NMin: number; R: number; fator: number; e: number;
  /** Alívio na ponta interna (kN): rara máxima e rara mínima. */
  dN: number; dNMin: number;
}

/**
 * Dimensiona as cintas de uma corrida de largura B: N e NMin por cinta (kN, trecho tributário, combinações raras).
 * Uma cinta inválida ou alavanca impossível vira mensagem (erro) e a cinta fica de fora.
 */
export function calcularCintas(b: BuildingModel, c: SapataCorrida, geos: GeoCinta[], B: number, N: number[], NMin: number[], op: OpcoesCalculo, msgs: string[]): ResultadoCinta[] {
  const out: ResultadoCinta[] = [];
  geos.forEach((gc, k) => {
    if (gc.erro) return;
    const ct = gc.cinta, e = (B - c.bw) / 2, ev: P = [gc.n[0] * e, gc.n[1] * e];
    const al = alavanca(N[k], ev, [{ u: gc.g.u, l: gc.g.L, k: 1 }]), alMin = alavanca(Math.max(0, NMin[k]), ev, [{ u: gc.g.u, l: gc.g.L, k: 1 }]);
    if (!al || !alMin) { msgs.push(`Sapata corrida ${c.nome}: cinta ${ct.nome} — alavanca impossível — a excentricidade e = ${fmt(e)} m é grande demais para o comprimento da cinta (${fmt(gc.g.L)} m); use cinta mais longa ou reduza a aba.`); return; }
    const eRes = Math.hypot(al.eRes[0], al.eRes[1]);
    if (eRes > 0.02) msgs.push(`Sapata corrida ${c.nome}: cinta ${ct.nome} oblíqua à normal da corrida: ${fmt(eRes * 100, 0)} cm da excentricidade ficam fora do plano da cinta; a torção da sapata e as outras cintas devem equilibrá-los (a confirmar).`);
    const a = B / gc.cosT;
    const m: string[] = [], notas = [
      `Cinta de sapata corrida: N = ${fmt(N[k], 1)} kN no trecho tributário de ${fmt(gc.hi - gc.lo)} m (s de ${fmt(gc.lo)} a ${fmt(gc.hi)} m), e = ${fmt(e)} m, ℓ = ${fmt(gc.g.L)} m: R = N·ℓ/(ℓ − e) = ${fmt(al.R, 1)} kN (fator ${fmt(al.fator, 3)}) e alívio ΔN = ${fmt(al.dN[0], 1)} kN em ${gc.elementoNome ?? gc.pilar!.nome}.`,
    ];
    const r = dimensionarVigaFundacao(b, {
      g: gc.g, equilibrio: { ini: true, fim: false }, alavancas: [{ ponta: 'ini', dN: al.dN[0], ei: al.g[0], a, l: gc.g.L }], cargas: [],
      travamento: { ini: 0, fim: 0 }, alivio: { ini: 0, fim: al.dN[0] }, mensagens: m, notas,
    }, op);
    for (const t of r.mensagens) msgs.push(`${t} (cinta ${ct.nome} da ${c.nome})`);
    out.push({
      ...r, corrida: c.id, s: ct.s, tributario: [gc.lo, gc.hi], pilarId: gc.pilar!.id, ...(gc.elementoId ? { elementoId: gc.elementoId } : {}),
      N: N[k], NMin: NMin[k], R: al.R, fator: al.fator, e, dN: al.dN[0], dNMin: alMin.dN[0],
    });
  });
  return out;
}

/** Resumo para o MCP e a linha de comando. */
export function resumoCinta(r: ResultadoCinta) {
  return {
    id: r.id, nome: r.nome, s: +r.s.toFixed(3), L: +r.L.toFixed(3), secao: [r.bAdot, r.hAdot], N_kN: +r.N.toFixed(1), R_kN: +r.R.toFixed(1), alivio_kN: +r.dN.toFixed(1),
    ponta: r.fim, Md: { sup: +r.Md.sup.toFixed(1), inf: +r.Md.inf.toFixed(1) }, Vd: +r.Vd.toFixed(1), resumo: r.resumo, status: r.status,
  };
}

/** Texto curto da seção da cinta. */
export const secaoCinta = (r: Pick<ResultadoCinta, 'bAdot' | 'hAdot'>) => `${cm(r.bAdot)}×${cm(r.hAdot)}`;

/** Próximo nome livre (CT1, CT2…) entre as cintas de todas as corridas. */
export function nomeCinta(b: BuildingModel): string {
  const n = Math.max(0, ...(b.fundacao?.corridas ?? []).flatMap((c) => (c.cintas ?? []).map((x) => { const m = /^CT(\d+)$/.exec(x.nome); return m ? +m[1] : 0; }))) + 1;
  return `CT${n}`;
}
