// Pilar com vigas em desnível (E5m, K1.12.4-19): nós intermediários, vigas ligadas neles e verificação por trecho.
// Validação: pórtico plano com viga a meia altura contra o método dos deslocamentos à mão e contra o solver 2D do projeto
// (solver.ts), pórtico espacial contra o OpenSees (validation/opensees/desnivel.py; fora do npm test só a geração),
// equilíbrio e modelos sem desnível idênticos com a opção ligada e desligada.
import { describe, expect, it } from 'vitest';
import ref from '../../../validation/opensees/desnivel.json';
import { Sessao } from '../commands';
import { analyze } from '../solver';
import type { Load, Model } from '../types';
import { analisarEdificio, type AnaliseEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { desniveisDaObra, flambagemTrecho, trechosDoLance } from './desnivel';
import { concretoDe } from './materiais';
import { deslocamentosPilares } from '../resultados/consultas';

function obra(valores: Record<string, number> = {}) {
  const s = new Sessao();
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('obra.definir', { nome: 'Desnível' });
  ok('pavimento.criar', { nome: 'Térreo', cota: 0, uso: 'comum' });
  ok('grupo.criar', { nome: 'P1', uso: 'residencial' });
  const g = s.modelo.grupos.at(-1)!.id;
  ok('pavimento.criar', { nome: 'P1', cota: 4, grupo: g });
  ok('vento.definir', { ativo: false });
  ok('opcoes.definir', { valores: { engasteTopoUltimo: 1, ...valores } });
  const terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!.id, p1 = s.modelo.pavimentos.find((p) => p.nome === 'P1')!.id;
  return { s, ok, g, terreo, p1 };
}

/** Pórtico plano: dois pilares 30 × 30 engastados na cota 0, lance de 4 m, viga 20 × 50 de 6 m com o topo na cota 2 (desnível −2 m) e carga linear q. */
function porticoPlano(valores: Record<string, number> = {}, nivel = -2) {
  const o = obra(valores);
  o.ok('lote', { comandos: [[0, 0], [6, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: o.terreo, inicio: 'fundacao' } })) });
  o.ok('viga.tracar', { grupo: o.g, pontos: [[0, 0], [6, 0]], secao: { b: 0.2, h: 0.5 } });
  o.ok('viga.editar', { id: o.s.modelo.vigas[0].id, nivel });
  return o;
}

const barrasDe = (an: AnaliseEdificio, tipo: string, ref?: string) => an.portico.barras.map((t, i) => [t, i] as const).filter(([t]) => t.tipo === tipo && (!ref || t.ref === ref)).map(([, i]) => i);

describe('E5m: pilar com vigas em desnível', () => {
  it('nós intermediários: critério de sobreposição, trechos e flambagem por trecho', () => {
    const { s } = porticoPlano();
    const des = desniveisDaObra(s.modelo);
    expect(des.nos.length).toBe(2);
    expect(des.nos[0]).toMatchObject({ desnivel: -2, cota: 2, altura: 2, hViga: 0.5, trava: [true, false] });
    const p = s.modelo.pilares[0], lance = des.nos[0].lance;
    expect(trechosDoLance(s.modelo, p, lance, des).map((t) => [t.de, t.ate])).toEqual([[0, 2], [2, 4]]);
    // direção u (ao longo de b = x, a da viga): travada no nó; ℓ = 2, ℓ0 = 2 − 0,5 = 1,5, ℓe = mín(1,5 + 0,3; 2) = 1,8
    const f0 = flambagemTrecho(s.modelo, p, lance, 0, des);
    expect(f0.leU).toBeCloseTo(1.8, 12);
    // direção v: nenhuma viga trava no nó → o do lance inteiro (ℓ = 4, sem viga no topo: ℓe = mín(4 + 0,3; 4) = 4)
    expect(f0.leV).toBeCloseTo(4, 12);
    // trecho de cima, u: ℓ = 2, sem viga no topo (ℓ0 = 2), ℓe = mín(2,3; 2) = 2
    expect(flambagemTrecho(s.modelo, p, lance, 1, des).leU).toBeCloseTo(2, 12);
    // opção desligada: nenhum nó
    expect(desniveisDaObra(s.modelo, false).nos.length).toBe(0);
    // sobreposição: viga do nível de 50 cm e a em desnível a −30 cm → fica no nó do pavimento
    const o2 = porticoPlano({}, -0.3);
    o2.ok('viga.tracar', { grupo: o2.g, pontos: [[0, 0], [0, 3]], secao: { b: 0.2, h: 0.5 } });
    expect(desniveisDaObra(o2.s.modelo).nos.filter((n) => n.pilar === o2.s.modelo.pilares[0].id).length).toBe(0);
  });

  it('pórtico plano com viga a meia altura: método dos deslocamentos à mão e solver 2D do projeto', () => {
    // só o peso próprio da viga (carga distribuída na barra do pórtico): uma carga linear lançada numa viga sem nós
    // intermediários na grelha chega ao pórtico como cargas nos nós das pontas (critério da grelha, igual sem desnível)
    for (const modeloGlobal of [0, 1]) {
      const { s } = porticoPlano({ modeloGlobal });
      const an = analisarEdificio(s.modelo);
      expect(an.erro).toBeUndefined();
      expect(an.desniveis?.nos.length).toBe(2);
      // pilar dividido em dois trechos por lance; a viga liga os nós intermediários (cota 2)
      const pil = barrasDe(an, 'pilar', s.modelo.pilares[0].id);
      expect(pil.map((i) => an.portico.barras[i].trecho)).toEqual([0, 1]);
      const m = an.portico.modelo, noMeio = m.barras[pil[0]].j;
      expect(m.nos[noMeio][2]).toBeCloseTo(2, 12);
      const vig = barrasDe(an, 'viga');
      expect(vig.length).toBeGreaterThan(0);
      for (const bi of vig) { const br = m.barras[bi]; expect(m.nos[br.i][2] + (br.offI?.[2] ?? 0)).toBeCloseTo(2, 9); expect(m.nos[br.j][2] + (br.offJ?.[2] ?? 0)).toBeCloseTo(2, 9); }
      // equilíbrio vertical: reações = carga total
      let Rz = 0;
      for (const [, r] of an.portico.res!.reacoes[0]) Rz += r[2];
      expect(Rz).toBeCloseTo(an.totais.G, 6);

      // ---- método dos deslocamentos (à mão): nó esquerdo com giro θ e deslocamento horizontal u; o direito, −θ e −u (simetria) ----
      const Ec = concretoDe(s.modelo, 'pilar').Ecs * 1000, Eb = concretoDe(s.modelo, 'viga').Ecs * 1000;
      const Ic = 0.3 ** 4 / 12, Ib = (0.2 * 0.5 ** 3) / 12, Ab = 0.2 * 0.5, h = 2, L = 6, w = 25 * 0.2 * 0.5;
      // pilar de baixo (engastado na base): [H; M] = [[12EI/h³, 6EI/h²], [6EI/h², 4EI/h]]·[u; θ]; o trecho de cima é balanço livre (sem rigidez)
      // viga: M = 2EI/L·θ (giros opostos) + wL²/12; força axial 2EA/L·u (encurtamento 2u)
      const k11 = (12 * Ec * Ic) / h ** 3 + (2 * Eb * Ab) / L, k12 = (6 * Ec * Ic) / h ** 2, k22 = (4 * Ec * Ic) / h + (2 * Eb * Ib) / L;
      const f2 = -(w * L * L) / 12, det = k11 * k22 - k12 * k12, u = (-k12 * f2) / det, th = (k11 * f2) / det;
      const Mb = (2 * Eb * Ib) / L * th + (w * L * L) / 12; // momento negativo na ponta da viga (no eixo do pilar)
      const Mbase = (2 * Ec * Ic) / h * th + (6 * Ec * Ic) / h ** 2 * u;
      // 3D: momento no plano na ponta da viga (barra que sai do pilar esquerdo) e na base do pilar
      const ex = (bi: number) => an.portico.res!.esforcos[0][bi];
      const bv = vig.find((bi) => m.barras[bi].i === noMeio || m.barras[bi].j === noMeio)!;
      const eV = ex(bv), Mv = m.barras[bv].i === noMeio ? Math.max(Math.abs(eV[4]), Math.abs(eV[5])) : Math.max(Math.abs(eV[10]), Math.abs(eV[11]));
      const eP = ex(pil[0]), Mp = Math.max(Math.abs(eP[4]), Math.abs(eP[5]));
      // EA dos pilares × axialPilares só muda o encurtamento (simétrico: sem efeito nos momentos)
      expect(Mv).toBeCloseTo(Mb, 6);
      expect(Mp).toBeCloseTo(Math.abs(Mbase), 6);

      // ---- solver 2D do projeto com o modelo equivalente ----
      const nodes = [
        { id: 1, x: 0, y: 0, support: { ux: 'fixed', uy: 'fixed', rz: 'fixed' } }, { id: 2, x: 0, y: 2 }, { id: 3, x: 0, y: 4 },
        { id: 4, x: 6, y: 0, support: { ux: 'fixed', uy: 'fixed', rz: 'fixed' } }, { id: 5, x: 6, y: 2 }, { id: 6, x: 6, y: 4 },
      ] as Model['nodes'];
      const mem = (id: number, ni: number, nj: number, mat: number, sec: number) => ({ id, ni, nj, material: mat, section: sec });
      const pp = 25 * 0.09 * 2;
      const loads: Load[] = [
        { kind: 'dist', id: 1, caseId: 1, member: 5, system: 'global', qxi: 0, qyi: -w, qxj: 0, qyj: -w },
        ...[2, 3, 5, 6].map((n, k) => ({ kind: 'nodal' as const, id: 10 + k, caseId: 1, node: n, fx: 0, fy: -pp, mz: 0 })),
      ];
      const m2: Model = {
        version: 1, name: 'e5m', nodes,
        members: [mem(1, 1, 2, 1, 1), mem(2, 2, 3, 1, 1), mem(3, 4, 5, 1, 1), mem(4, 5, 6, 1, 1), mem(5, 2, 5, 2, 2)] as Model['members'],
        materials: [{ id: 1, name: 'pilar', E: Ec, nu: 0.2, alpha: 1e-5, gamma: 0 }, { id: 2, name: 'viga', E: Eb, nu: 0.2, alpha: 1e-5, gamma: 0 }],
        sections: [{ id: 1, name: 'p', shape: { kind: 'rect', b: 0.3, h: 0.3 } }, { id: 2, name: 'v', shape: { kind: 'rect', b: 0.2, h: 0.5 } }],
        cases: [{ id: 1, name: 'G' }], combinations: [], loads, trains: [],
        options: { shearDeformation: false, axialDeformation: true },
      };
      const a2 = analyze(m2);
      expect(a2.prep.error).toBeUndefined();
      const r2 = a2.cases.get(1)!;
      const Mb2 = Math.abs(r2.reactions.get(0)![2]);
      expect(Mb2).toBeCloseTo(Math.abs(Mbase), 3); // EA do pilar × 2 no 3D (axialPilares) muda pouco a base: tolerância de 1e-3 kN·m
      expect(Mp).toBeCloseTo(Mb2, 3);
    }
  });

  it('carga linear sobre a viga em desnível chega ao pilar na cota da viga: normais e momentos por trecho (à mão), separado = integrado', () => {
    const q = 20, L = 6, h = 2;
    const res: Record<number, { N: [number, number]; Mp: number; Mv: number }> = {};
    for (const modeloGlobal of [0, 1]) {
      const { s, ok, g } = porticoPlano({ modeloGlobal });
      ok('carga.linha', { grupo: g, pontos: [[0, 0], [L, 0]], valor: q, caso: 'G' });
      const an = analisarEdificio(s.modelo);
      expect(an.erro).toBeUndefined();
      const m = an.portico.modelo, pil = barrasDe(an, 'pilar', s.modelo.pilares[0].id), noMeio = m.barras[pil[0]].j;
      const ex = (bi: number) => an.portico.res!.esforcos[0][bi];
      // a carga linear vira forças concentradas na barra da viga (discretização da grelha: n trechos de malha/2, força no meio de cada um)
      const n = Math.max(1, Math.ceil(L / (an.opcoes.malha / 2))), P = (q * L) / n, xs = Array.from({ length: n }, (_, k) => ((k + 0.5) * L) / n);
      const c = an.portico.casos![0];
      expect((c.pontuais ?? []).length + c.nodais.filter((x) => x.no === noMeio && Math.abs(x.f[2] + P) < 1e-9).length).toBeGreaterThanOrEqual(n - 2);
      // normais (compressão +): trecho de cima só o próprio peso (2 m de pilar); de baixo, + a metade da viga e o peso do trecho
      const ppT = 25 * 0.09 * h, pv = 25 * 0.2 * 0.5;
      const Nsup = ex(pil[1])[0], Ninf = ex(pil[0])[0]; // força da ponta i na barra, eixo local: + = compressão
      expect(Nsup).toBeCloseTo(ppT, 6);
      expect(Ninf).toBeCloseTo(ppT * 2 + (q * L + pv * L) / 2, 6);
      // momentos: método dos deslocamentos à mão com o engaste perfeito das forças concentradas Σ P·a·b²/L² e o do peso próprio wL²/12
      const Ec = concretoDe(s.modelo, 'pilar').Ecs * 1000, Eb = concretoDe(s.modelo, 'viga').Ecs * 1000;
      const Ic = 0.3 ** 4 / 12, Ib = (0.2 * 0.5 ** 3) / 12, Ab = 0.2 * 0.5;
      const MEP = (pv * L * L) / 12 + xs.reduce((t, a) => t + (P * a * (L - a) ** 2) / L ** 2, 0);
      const k11 = (12 * Ec * Ic) / h ** 3 + (2 * Eb * Ab) / L, k12 = (6 * Ec * Ic) / h ** 2, k22 = (4 * Ec * Ic) / h + (2 * Eb * Ib) / L;
      const det = k11 * k22 - k12 * k12, u = (k12 * MEP) / det, th = (-k11 * MEP) / det;
      const Mb = (2 * Eb * Ib) / L * th + MEP, Mbase = (2 * Ec * Ic) / h * th + (6 * Ec * Ic) / h ** 2 * u, Mtopo = (4 * Ec * Ic) / h * th + (6 * Ec * Ic) / h ** 2 * u;
      const eP = ex(pil[0]), Mp0 = Math.max(Math.abs(eP[4]), Math.abs(eP[5])), MpL = Math.max(Math.abs(eP[10]), Math.abs(eP[11]));
      expect(Mp0).toBeCloseTo(Math.abs(Mbase), 6);
      expect(MpL).toBeCloseTo(Math.abs(Mtopo), 6);
      expect(MpL).toBeCloseTo(Math.abs(Mb), 6); // nó: momento do pilar de baixo = o da viga (o trecho de cima não tem momento)
      const eS = ex(pil[1]);
      expect(Math.max(Math.abs(eS[4]), Math.abs(eS[5]), Math.abs(eS[10]), Math.abs(eS[11]))).toBeLessThan(1e-9);
      const bv = barrasDe(an, 'viga').find((bi) => m.barras[bi].i === noMeio || m.barras[bi].j === noMeio)!, eV = ex(bv);
      res[modeloGlobal] = { N: [Ninf, Nsup], Mp: Mp0, Mv: m.barras[bv].i === noMeio ? Math.max(Math.abs(eV[4]), Math.abs(eV[5])) : Math.max(Math.abs(eV[10]), Math.abs(eV[11])) };
    }
    // modelo integrado = separado no mesmo caso
    expect(res[1].N[0]).toBeCloseTo(res[0].N[0], 6);
    expect(res[1].N[1]).toBeCloseTo(res[0].N[1], 6);
    expect(res[1].Mp).toBeCloseTo(res[0].Mp, 6);
    expect(res[1].Mv).toBeCloseTo(res[0].Mv, 6);
  });

  it('modelos sem desnível idênticos com a opção ligada e desligada; desligada, a viga fica no nível do pavimento', () => {
    const a = porticoPlano({}, 0), b = porticoPlano({ desnivelVigaPilar: 0 }, 0);
    const ra = analisarEdificio(a.s.modelo), rb = analisarEdificio(b.s.modelo);
    expect(ra.portico.modelo).toEqual(rb.portico.modelo);
    expect(ra.portico.res!.desloc).toEqual(rb.portico.res!.desloc);
    expect(ra.desniveis).toBeUndefined();
    const c = porticoPlano({ desnivelVigaPilar: 0 }), rc = analisarEdificio(c.s.modelo);
    expect(rc.desniveis).toBeUndefined();
    expect(rc.portico.barras.some((t) => t.trecho !== undefined)).toBe(false);
  });

  it('dimensionamento: o lance é verificado em cada trecho, com ℓe e esforços próprios', () => {
    const { s, ok, g } = porticoPlano();
    ok('carga.linha', { grupo: g, pontos: [[0, 0], [6, 0]], valor: 20, caso: 'G' });
    const an = analisarEdificio(s.modelo), dim = dimensionarEdificio(s.modelo, an);
    const r = dim.pilares.find((x) => x.pilar === s.modelo.pilares[0].id)!;
    expect(r.trechos?.length).toBe(2);
    expect(r.trechos![0]).toMatchObject({ de: 0, ate: 2 });
    expect(r.trechos![0].le[0]).toBeCloseTo(1.8, 9);
    expect(r.trechos![1].le[0]).toBeCloseTo(2, 9);
    // a utilização do lance é a maior dos trechos
    expect(r.util).toBeCloseTo(Math.max(...r.trechos!.map((t) => t.util)), 12);
    expect(r.status).not.toBe('fail');
    expect(r.trechoDeterminante).toBe(0); // λ máx. igual nos dois (v sem travamento no nó: ℓe = 4 m): vale o primeiro
    // deslocamentos por lance (consultas): o lance dividido continua uma linha só, do pé ao topo
    const dp = deslocamentosPilares(s.modelo, an).filter((x) => x.pilar === s.modelo.pilares[0].id);
    expect(dp.length).toBe(1);
    expect(dp[0].altura).toBeCloseTo(4, 12);
    expect(dp[0].z).toBeCloseTo(4, 12);
  });

  it('pórtico espacial com desnível: equilíbrio e OpenSees (modelo separado)', async () => {
    const o = obra({ modeloGlobal: 0 });
    o.ok('lote', { comandos: [[0, 0], [6, 0], [6, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 }, nasce: o.terreo, inicio: 'fundacao' } })) });
    o.ok('lote', { comandos: [[[0, 0], [6, 0]], [[6, 0], [6, 4]], [[6, 4], [0, 4]], [[0, 4], [0, 0]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: o.g, pontos: p, secao: { b: 0.2, h: 0.5 } } })) });
    const vd = o.s.modelo.vigas.find((v) => v.pontos[0][0] === 0 && v.pontos[1][0] === 0)!;
    o.ok('viga.editar', { id: vd.id, nivel: -1.5 });
    o.ok('carga.pilar', { pilar: o.s.modelo.pilares[2].id, caso: 'G', N: 50, Hx: 10, Hy: 5 });
    const an = analisarEdificio(o.s.modelo);
    expect(an.erro).toBeUndefined();
    expect(an.desniveis?.nos.length).toBe(2);
    const m = an.portico.modelo, c = an.portico.casos![0];
    // equilíbrio: reações = cargas (forças e momento em torno da origem)
    const R = [0, 0, 0];
    for (const [, r] of an.portico.res!.reacoes[0]) for (let k = 0; k < 3; k++) R[k] += r[k];
    expect(R[2]).toBeCloseTo(an.totais.G, 6);
    expect(R[0]).toBeCloseTo(-10, 6);
    expect(R[1]).toBeCloseTo(-5, 6);
    expect(c.pontuais?.length ?? 0).toBe(0);
    expect(m.barras.every((b) => !b.engI?.length && !b.engJ?.length && !b.libI?.length && !b.libJ?.length)).toBe(true);
    const PROC = 'node:process', FS = 'node:fs';
    const env = ((await import(/* @vite-ignore */ PROC)) as { env: Record<string, string | undefined> }).env;
    if (env.GERAR_OPENSEES) {
      const fs = (await import(/* @vite-ignore */ FS)) as { writeFileSync: (p: string, d: string) => void };
      fs.writeFileSync('validation/opensees/desnivel.modelo.json', JSON.stringify({
        nos: m.nos, apoios: [...m.apoios], escravos: m.escravos ?? [], molas: m.molas ?? [],
        barras: m.barras.map((b) => ({ i: b.i, j: b.j, E: b.E, G: b.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, Ay: b.Ay ?? null, ref: b.ref ?? null, offI: b.offI ?? null, offJ: b.offJ ?? null })),
        nodais: c.nodais, distribuidas: c.distribuidas,
      }));
    }
    const R0 = ref as { nos: number; desloc: number[][] };
    expect(R0.nos).toBe(m.nos.length);
    const u = an.portico.res!.desloc[0];
    let e = 0, mx = 0;
    R0.desloc.forEach((d, n) => { for (let k = 0; k < 6; k++) { e = Math.max(e, Math.abs(u[n * 6 + k] - d[k])); mx = Math.max(mx, Math.abs(d[k])); } });
    expect(e / mx).toBeLessThan(1e-8);
    // modelo integrado: mesmo número de nós intermediários e equilíbrio
    const an2 = analisarEdificio(o.s.modelo, { modeloGlobal: 1 });
    expect(an2.erro).toBeUndefined();
    let Rz2 = 0;
    for (const [, r] of an2.portico.res!.reacoes[0]) Rz2 += r[2];
    expect(Rz2).toBeCloseTo(an2.totais.G, 6);
    expect(an2.portico.barras.filter((t) => t.trecho !== undefined).length).toBe(4);
  }, 60000);
});
