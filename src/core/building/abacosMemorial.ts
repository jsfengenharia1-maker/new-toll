// Memorial dos ábacos das nervuradas bidirecionais (frente E3d): parâmetros de geração, dimensões por pilar e por face, armadura base,
// reforço negativo nas nervuras e verificação de punção. Só dados (a interface do memorial monta o texto). Núcleo puro.
import { abacosEfetivos, geometriaBidirecional } from './nervuradas';
import type { Dimensionamento } from './dimensionamento';
import { baseDoAbaco, parametrosAbaco, resumoAbaco, type ParametrosAbaco, type ResumoAbaco } from './abacos';
import type { OpcoesCalculo } from './opcoes';
import type { AbacoPuncaoInfo, ResultadoPuncao } from './puncao';
import type { BarrasNervura, BuildingModel, GeradoAbaco } from './types';

export interface LinhaMemorialAbacoNervura { nervura: string; trecho: [number, number]; Mneg: number; AsNec: number; AsBase: number; AsBorda: number; reforco: string; comprimento: number; cortante: { V: number; VRd1: number; estribo: string | null } }
export interface LinhaMemorialAbacoPuncao {
  pilar: string; pavimento: string; apoio: ResultadoPuncao['tipo']; status: ResultadoPuncao['status']; F: number;
  semAbaco: boolean; dAbaco: number; dLaje: number; c2NoAbaco: boolean; extensaoMin: number;
  contornos: { nome: string; u: number; tau: number; limite: number; limiteNome: string; ok: boolean }[];
  armadura: string | null; armaduraForaDoAbaco: string | null; mensagens: string[];
}
export interface LinhaMemorialAbaco extends ResumoAbaco {
  pilarNome?: string;
  /** Dimensões por face da geração automática (vazio nos manuais ou editados à mão). */
  faces: GeradoAbaco['faces'];
  parametros: Pick<ParametrosAbaco, 'fracao' | 'cone' | 'extensao' | 'limMin' | 'limMax'> | null;
  base: { inf: BarrasNervura | null; sup: BarrasNervura | null; padrao: boolean };
  nervuras: LinhaMemorialAbacoNervura[];
  puncao: LinhaMemorialAbacoPuncao[];
}

const ref = (x: { n: number; phi: number } | null | undefined) => (x ? `${x.n}φ${String(x.phi).replace('.', ',')}` : null);

/** Linhas do memorial dos ábacos de todas as lajes nervuradas: uma por ábaco, com a punção dos pilares que ele atende. */
export function abacosNoMemorial(b: BuildingModel, d: Pick<Dimensionamento, 'nervuradas' | 'puncao'>, op: Pick<OpcoesCalculo, 'abacoFracao' | 'abacoCone' | 'abacoExtensao' | 'abacoLimMin' | 'abacoLimMax' | 'lajeBitolaMinima'>): LinhaMemorialAbaco[] {
  const out: LinhaMemorialAbaco[] = [];
  for (const l of b.lajes) {
    if (l.tipo.tipo !== 'nervurada' || l.definir) continue;
    const g = geometriaBidirecional(b, l.tipo), nerv = d.nervuradas?.find((x) => x.laje === l.id);
    for (const ef of abacosEfetivos(b, l, g)) {
      const a = ef.abaco, base = baseDoAbaco(b, l, a, op);
      const nervuras = (nerv?.nervuras ?? []).flatMap((n) => n.abacos.filter((x) => x.abaco === a.id).map((x): LinhaMemorialAbacoNervura => ({
        nervura: `${n.dir === 0 ? 'X' : 'Y'}${n.indice + 1}`, trecho: [x.x0, x.x1], Mneg: x.Mneg, AsNec: x.AsNec, AsBase: x.AsBase, AsBorda: x.AsBorda, reforco: ref(x.barras) ?? '—', comprimento: x.comprimento,
        cortante: { V: x.Vmax, VRd1: x.VRd1, estribo: x.estribo ? `φ${String(x.estribo.phi).replace('.', ',')} c/${Math.round(x.estribo.s * 100)}` : null },
      })));
      const puncao = (d.puncao ?? []).filter((r) => r.abaco && r.abaco.id === a.id && r.laje === l.id).map((r): LinhaMemorialAbacoPuncao => linhaPuncao(r, r.abaco!));
      out.push({
        ...resumoAbaco(l, g, ef), ...(a.pilar ? { pilarNome: b.pilares.find((p) => p.id === a.pilar)?.nome } : {}),
        faces: a.gerado?.faces ?? [], parametros: a.gerado ? { fracao: a.gerado.fracao, cone: a.gerado.cone, extensao: a.gerado.extensao, limMin: a.gerado.limMin, limMax: a.gerado.limMax } : a.automatico ? parametrosAbaco(op) : null,
        base: { inf: base.inf, sup: base.sup, padrao: base.padrao }, nervuras, puncao,
      });
    }
  }
  return out;
}

function linhaPuncao(r: ResultadoPuncao, ab: AbacoPuncaoInfo): LinhaMemorialAbacoPuncao {
  return {
    pilar: r.nome, pavimento: r.pavimento, apoio: r.tipo, status: r.status, F: r.F, semAbaco: ab.id === undefined, dAbaco: ab.dAbaco, dLaje: ab.dLaje, c2NoAbaco: ab.c2NoAbaco, extensaoMin: ab.extensaoMin,
    contornos: r.contornos.map((c) => ({ nome: c.nome, u: c.u, tau: c.tau, limite: c.limite, limiteNome: c.limiteNome, ok: c.ok })),
    armadura: r.armadura ? `${r.armadura.linhas} linhas × ${r.armadura.barras} ${r.armadura.tipo === 'estribo' ? 'estribos' : 'conectores'} φ${String(r.armadura.phi).replace('.', ',')}` : null,
    armaduraForaDoAbaco: r.armaduraExterna ? `${r.armaduraExterna.linhas} linhas × ${r.armaduraExterna.barras} ${r.armaduraExterna.tipo === 'estribo' ? 'estribos' : 'conectores'} φ${String(r.armaduraExterna.phi).replace('.', ',')}` : null,
    mensagens: r.mensagens,
  };
}

/** Pilares das nervuradas que apoiam sem viga e sem ábaco (punção verificada só nas nervuras): nome do pilar e pavimento. */
export const puncaoSemAbaco = (d: Pick<Dimensionamento, 'puncao'>): { pilar: string; pavimento: string; laje: string }[] =>
  (d.puncao ?? []).filter((r) => r.abaco && r.abaco.id === undefined).map((r) => ({ pilar: r.nome, pavimento: r.pavimento, laje: r.lajeNome }));
