// Ábacos da NBR 6123 como tabelas de pontos digitadas pelo usuário (frente N2a): coeficiente de arrasto Ca
// (curvas por h/l1, abscissa l1/l2) e fator de vizinhança. O programa não traz os pontos das figuras da norma
// (dado externo ainda não fornecido): com a tabela vazia, vale o Ca informado (padrão 1,3) e a opção automática
// fica desativada, com aviso. Interpolação linear entre pontos e, no Ca, entre curvas vizinhas; fora da faixa
// digitada o valor da ponta é usado e o resultado marca `fora`.
import type { AbacosVento, CurvaAbaco } from './types';

/** Interpolação linear em pontos [x, y] ordenados por x; fora da faixa, o valor da ponta (`fora`). Sem pontos: null. */
export function interpolar(pontos: [number, number][], x: number): { y: number; fora: boolean } | null {
  if (!pontos.length) return null;
  if (pontos.length === 1) return { y: pontos[0][1], fora: Math.abs(x - pontos[0][0]) > 1e-12 };
  if (x <= pontos[0][0]) return { y: pontos[0][1], fora: x < pontos[0][0] - 1e-12 };
  const u = pontos[pontos.length - 1];
  if (x >= u[0]) return { y: u[1], fora: x > u[0] + 1e-12 };
  for (let i = 0; i + 1 < pontos.length; i++) {
    const [x0, y0] = pontos[i], [x1, y1] = pontos[i + 1];
    if (x >= x0 && x <= x1) return { y: x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0), fora: false };
  }
  return { y: u[1], fora: true };
}

/** Valor em (param, x) numa família de curvas: interpola cada curva vizinha em x e depois entre elas em `param`. */
export function interpolarCurvas(curvas: CurvaAbaco[], param: number, x: number): { y: number; fora: boolean } | null {
  const cs = curvas.filter((c) => c.pontos.length).sort((a, z) => a.param - z.param);
  if (!cs.length) return null;
  const em = (c: CurvaAbaco) => interpolar(c.pontos, x)!;
  if (param <= cs[0].param) { const r = em(cs[0]); return { y: r.y, fora: r.fora || param < cs[0].param - 1e-12 }; }
  const u = cs[cs.length - 1];
  if (param >= u.param) { const r = em(u); return { y: r.y, fora: r.fora || param > u.param + 1e-12 }; }
  for (let i = 0; i + 1 < cs.length; i++) {
    if (param >= cs[i].param && param <= cs[i + 1].param) {
      const a = em(cs[i]), z = em(cs[i + 1]), t = (param - cs[i].param) / (cs[i + 1].param - cs[i].param);
      return { y: a.y + (z.y - a.y) * t, fora: a.fora || z.fora };
    }
  }
  return null;
}

export type Turbulencia = 1 | 2;
export const curvasCa = (a: AbacosVento | undefined, t: Turbulencia) => (t === 1 ? a?.caBaixa : a?.caAlta) ?? [];

/** A tabela do Ca tem ao menos uma curva com pontos? */
export const abacoCaPreenchido = (a: AbacosVento | undefined, t: Turbulencia) => curvasCa(a, t).some((c) => c.pontos.length >= 1);
export const abacoVizPreenchido = (a: AbacosVento | undefined) => (a?.vizinhanca?.length ?? 0) >= 1;

/** Ca do ábaco para h/l1 e l1/l2 (null sem tabela). */
export const caDoAbaco = (a: AbacosVento | undefined, t: Turbulencia, hSobreL1: number, l1SobreL2: number) =>
  abacoCaPreenchido(a, t) ? interpolarCurvas(curvasCa(a, t), hSobreL1, l1SobreL2) : null;

/** Fator de vizinhança do ábaco para a razão d/l1 (null sem tabela). */
export const vizinhancaDoAbaco = (a: AbacosVento | undefined, razao: number) => (abacoVizPreenchido(a) ? interpolar(a!.vizinhanca!, razao) : null);

/** Erros de uma tabela de pontos (abscissas crescentes, curvas com parâmetro distinto); lista vazia = válida. */
export function validarAbacos(a: AbacosVento): string[] {
  const e: string[] = [];
  const pts = (rot: string, p: [number, number][]) => {
    for (let i = 0; i < p.length; i++) {
      if (!Number.isFinite(p[i][0]) || !Number.isFinite(p[i][1])) e.push(`${rot}: ponto ${i + 1} não numérico.`);
      else if (i > 0 && !(p[i][0] > p[i - 1][0])) e.push(`${rot}: abscissas devem crescer (ponto ${i + 1}).`);
    }
  };
  for (const [nome, cs] of [['Ca, baixa turbulência', a.caBaixa], ['Ca, alta turbulência', a.caAlta]] as const) {
    const params = new Set<number>();
    (cs ?? []).forEach((c, i) => {
      if (params.has(c.param)) e.push(`${nome}: h/l1 = ${c.param} repetido.`);
      params.add(c.param);
      pts(`${nome}, curva ${i + 1}`, c.pontos);
    });
  }
  if (a.vizinhanca) pts('Vizinhança', a.vizinhanca);
  return e;
}
