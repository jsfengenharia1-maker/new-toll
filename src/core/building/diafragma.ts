// Regras do diafragma rígido (N2b, K1.2.5, K1.3.36, K1.9.106): escravos de elementos verticais de casca só nos níveis em
// que tocam laje, e o aviso de abertura grande numa zona fechada por vigas (DIAFRAGMA_ABERTURA).
import { areaPoligono, dentroPoligono, faces, pontoInterno, type P } from '../geom/faces';
import type { V3 } from '../fe3d';
import { eixosDasVigas } from './lajes';
import { opcoesEmUso, perfilDe } from './opcoes';
import type { BuildingModel } from './types';
import type { Diagnostico } from './verify';

/**
 * Escravos do diafragma para os nós de elementos verticais (cascas de paredes e pilares-parede): um nó só segue o mestre
 * do nível em que toca laje (cota igual à do nível, dentro da tolerância); os nós entre níveis ficam livres no plano.
 */
export function escravosVerticais(nos: V3[], nosVerticais: number[], niveis: { z: number; mestre: number }[], tol = 1e-6): { no: number; mestre: number }[] {
  const out: { no: number; mestre: number }[] = [];
  for (const n of nosVerticais) {
    const nv = niveis.find((x) => Math.abs(nos[n][2] - x.z) <= tol);
    if (nv && nv.mestre !== n) out.push({ no: n, mestre: nv.mestre });
  }
  return out;
}

/** Área de laje (sem os furos) dentro de um polígono, pelas lajes cujo ponto interno está nele. */
function areaLajes(b: BuildingModel, grupo: string, cel: P[]) {
  let A = 0;
  for (const l of b.lajes.filter((x) => x.grupo === grupo)) {
    if (!dentroPoligono(pontoInterno(l.contorno as P[]), cel)) continue;
    A += Math.abs(areaPoligono(l.contorno as P[])) - (l.furos ?? []).reduce((t, f) => t + Math.abs(areaPoligono(f as P[])), 0);
  }
  return A;
}

/**
 * DIAFRAGMA_ABERTURA: zona fechada por vigas (célula das vigas do grupo) com laje e com abertura interna (furos ou parte
 * sem laje) acima do limite das opções (% da área), e o pavimento todo quando as células sem laje e os furos passam do
 * limite da área fechada pelas vigas. Sugere marcar as vigas fora do diafragma (o diafragma rígido pode não valer).
 */
export function aberturasDiafragma(b: BuildingModel): Diagnostico[] {
  const lim = opcoesEmUso(b.opcoes, perfilDe(b)).aberturaDiafragma / 100, out: Diagnostico[] = [];
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  for (const g of b.grupos) {
    if (!b.lajes.some((l) => l.grupo === g.id)) continue;
    const cels = faces(eixosDasVigas(b, g.id));
    let Atot = 0, Aaberta = 0;
    for (const c of cels) {
      const A = Math.abs(areaPoligono(c)), Al = Math.min(A, areaLajes(b, g.id, c));
      Atot += A; Aaberta += A - Al;
      if (Al <= 0 || A <= 0) continue; // célula sem laje (poço): conta só no pavimento todo
      const f = 1 - Al / A;
      if (f > lim + 1e-9) {
        const vigas = b.vigas.filter((v) => v.grupo === g.id && v.pontos.some((p) => c.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05) || dentroPoligono(p as P, c))).map((v) => v.id);
        out.push({ codigo: 'DIAFRAGMA_ABERTURA', severidade: 'aviso', elementos: vigas.length ? vigas : [g.id], mensagem: `Grupo “${g.nome}”: zona fechada por vigas com abertura de ${pct(f)} da área (acima de ${pct(lim)}); o diafragma rígido pode não valer nela: considere marcar as vigas da zona fora do diafragma.` });
      }
    }
    if (Atot > 0 && Aaberta / Atot > lim + 1e-9 && cels.length > 1)
      out.push({ codigo: 'DIAFRAGMA_ABERTURA', severidade: 'aviso', elementos: [g.id], mensagem: `Grupo “${g.nome}”: aberturas somam ${pct(Aaberta / Atot)} da área fechada pelas vigas (acima de ${pct(lim)}); confira a hipótese de diafragma rígido.` });
  }
  return out;
}
