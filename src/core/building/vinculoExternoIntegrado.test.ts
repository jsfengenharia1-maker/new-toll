// E5l: vínculo externo (apoio contínuo do topo de muro) no modelo integrado (C6.18, K1.3.9, K1.3.10, K1.4.29). Os nós da viga
// viram nós de fronteira do superelemento da grelha e recebem os apoios no pórtico, como no modelo separado. Validação: viga
// contínua sobre apoios a cada nó (equação dos três momentos), equilíbrio, igualdade com o modelo separado, superelemento
// igual ao modelo cheio e o modelo cheio contra o OpenSees (validation/opensees/vinculo_externo.py, fora do npm test).
import { describe, expect, it } from 'vitest';
import ref from '../../../validation/opensees/vinculo_externo.json';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3 } from '../fe3d';
import { analisarEdificio, type AnaliseEdificio } from './analitico';

type Tipo = 'engaste' | 'articulacao' | 'deslizante';

function sessao(valores: Record<string, number> = {}) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('vento.definir', { ativo: false });
  ok('opcoes.definir', { valores });
  return { s, ok };
}

/** Viga de muro de 6 m em y = 2 (cota 3 m), longe dos pilares, com carga linear de 30 kN/m (G). */
function muro(tipo: Tipo, valores: Record<string, number> = {}) {
  const { s, ok } = sessao(valores);
  ok('lote', { comandos: [[0, 0], [8, 0]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('viga.tracar', { grupo: 'g_3', pontos: [[1, 2], [7, 2]], secao: { b: 0.2, h: 0.4 } });
  ok('carga.linha', { grupo: 'g_3', pontos: [[1, 2], [7, 2]], valor: 30, caso: 'G' });
  ok('viga.editar', { id: s.modelo.vigas[0].id, vinculoExterno: tipo });
  return s;
}

/** Nós do pórtico ao longo da viga de muro (y = 2, z = 3), ordenados por x, com as restrições. */
const nosDaViga = (an: AnaliseEdificio) => [...an.portico.modelo.apoios]
  .filter(([n]) => Math.abs(an.portico.modelo.nos[n][1] - 2) < 1e-6 && Math.abs(an.portico.modelo.nos[n][2] - 3) < 1e-6 && an.portico.modelo.nos[n][0] > 0.9 && an.portico.modelo.nos[n][0] < 7.1)
  .sort((a, c) => an.portico.modelo.nos[a[0]][0] - an.portico.modelo.nos[c[0]][0]);

/**
 * Viga contínua de N vãos iguais s, carga uniforme w, apoios rígidos (equação dos três momentos, EI constante):
 * M(i−1) + 4·M(i) + M(i+1) = −w·s²/2. Pontas articuladas: M0 = MN = 0; engastadas: 2·M0 + M1 = −w·s²/4 (vão imagem).
 * Devolve os momentos nos apoios (positivo traciona embaixo) e as reações (vão isostático + (M vizinho − M do apoio)/s por vão).
 */
function tresMomentos(N: number, s: number, w: number, engaste: boolean) {
  const n = N + 1, A = Array.from({ length: n }, () => new Float64Array(n)), r = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === N) {
      if (!engaste) { A[i][i] = 1; continue; }
      A[i][i] = 2; A[i][i === 0 ? 1 : N - 1] = 1; r[i] = (-w * s * s) / 4; continue;
    }
    A[i][i - 1] = 1; A[i][i] = 4; A[i][i + 1] = 1; r[i] = (-w * s * s) / 2;
  }
  // eliminação de Gauss (sistema pequeno, diagonal dominante)
  for (let k = 0; k < n; k++) for (let i = k + 1; i < n; i++) { const f = A[i][k] / A[k][k]; if (!f) continue; for (let j = k; j < n; j++) A[i][j] -= f * A[k][j]; r[i] -= f * r[k]; }
  const M = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let t = r[i]; for (let j = i + 1; j < n; j++) t -= A[i][j] * M[j]; M[i] = t / A[i][i]; }
  const R = Array.from({ length: n }, (_, i) => {
    let v = 0;
    if (i > 0) v += (w * s) / 2 + (M[i - 1] - M[i]) / s; // vão à esquerda: reação da ponta direita
    if (i < N) v += (w * s) / 2 + (M[i + 1] - M[i]) / s; // vão à direita: reação da ponta esquerda
    return v;
  });
  return { M, R };
}

describe('E5l: vínculo externo no modelo integrado', () => {
  it('viga de muro (malha 1 m): reações iguais às da viga contínua pelos três momentos e equilíbrio', () => {
    for (const tipo of ['articulacao', 'engaste'] as const) {
      const s = muro(tipo, { malha: 1 });
      const an = analisarEdificio(s.modelo);
      expect(an.erro).toBeUndefined();
      expect(an.opcoes.modeloGlobal).toBe(1);
      expect(an.avisos.some((a) => /^Vínculo externo: os apoios contínuos/.test(a))).toBe(false);
      const nos = nosDaViga(an);
      expect(nos.length).toBe(7); // apoios a cada 1 m nos 6 m
      expect(nos.every(([, g]) => (tipo === 'engaste' ? g.length === 6 : [0, 1, 2].every((x) => g.includes(x))))).toBe(true);
      const R = nos.map(([n]) => an.portico.res!.reacoes[0].get(n)![2]);
      // carga: a linear vai aos nós mais próximos (½ m de influência por nó; reação direta), o peso próprio é distribuído na barra
      const pp = 25 * 0.2 * 0.4, linear = nos.map((_, k) => 30 * (k === 0 || k === 6 ? 0.5 : 1));
      const tm = tresMomentos(6, 1, pp, tipo === 'engaste');
      R.forEach((r, k) => expect(Math.abs(r - (linear[k] + tm.R[k]))).toBeLessThan(2e-3 * (linear[k] + tm.R[k])));
      expect(R.reduce((a, c) => a + c, 0)).toBeCloseTo(30 * 6 + pp * 6, 6);
      // momentos da viga na grelha (esforços por retrossubstituição) iguais aos dos três momentos nos apoios
      const g = an.grelhas.find((x) => x.integrado && x.barras.some((t) => t.tipo === 'viga'))!;
      const Mapoio: number[] = [];
      g.modelo.barras.forEach((br, bi) => {
        if (g.barras[bi].tipo !== 'viga') return;
        const xi = g.modelo.nos[br.i][0], xj = g.modelo.nos[br.j][0], e = g.res!.esforcos[0][bi];
        // Mz local na ponta i (convenção de extremidade): momento de apoio = −(±Mz) conforme o sentido da barra
        const k = Math.round(Math.min(xi, xj) - 1);
        Mapoio[k] = xi < xj ? e[5] : -e[11];
      });
      for (let k = 1; k < 6; k++) expect(Math.abs(Math.abs(Mapoio[k]) - Math.abs(tm.M[k]))).toBeLessThan(0.01 * Math.abs(tm.M[k]) + 1e-3);
    }
  });

  it('igual ao modelo separado (reações por nó) nos três tipos; deslizante sem reação horizontal', () => {
    for (const tipo of ['articulacao', 'engaste', 'deslizante'] as const) {
      const ai = analisarEdificio(muro(tipo).modelo), as = analisarEdificio(muro(tipo, { modeloGlobal: 0 }).modelo);
      expect(ai.erro).toBeUndefined();
      const ni = nosDaViga(ai), ns = nosDaViga(as);
      expect(ni.length).toBe(ns.length);
      expect(ni.length).toBeGreaterThanOrEqual(24);
      ni.forEach(([n], k) => {
        const ri = ai.portico.res!.reacoes[0].get(n)!, rs = as.portico.res!.reacoes[0].get(ns[k][0])!;
        expect(Math.abs(ri[2] - rs[2])).toBeLessThan(1e-3 * Math.abs(rs[2]) + 1e-6);
      });
      if (tipo === 'deslizante') { let H = 0; for (const [n] of ni) { const r = ai.portico.res!.reacoes[0].get(n)!; H += Math.abs(r[0]) + Math.abs(r[1]); } expect(H).toBeLessThan(0.01); }
    }
  });

  it('opção desligada (vinculoExternoIntegrado = 0): comportamento anterior, sem apoios na viga e com aviso', () => {
    const an = analisarEdificio(painelComMuro({ vinculoExternoIntegrado: 0 }).modelo);
    expect(an.erro).toBeUndefined();
    expect(an.avisos.some((a) => /^Vínculo externo: os apoios contínuos das vigas de muro não entram no modelo integrado/.test(a))).toBe(true);
    expect(apoiosMuro(an)).toEqual([]);
  });

  it('painel com muro no meio: equilíbrio, superelemento igual ao modelo cheio e modelo cheio igual ao OpenSees', async () => {
    const m = painelComMuro();
    const an = analisarEdificio(m.modelo, {}, { cheio: true });
    expect(an.erro).toBeUndefined();
    // soma das reações verticais (pilares na base + muro) = carga total do caso G
    let Rz = 0;
    for (const [, r] of an.portico.res!.reacoes[0]) Rz += r[2];
    expect(Rz).toBeCloseTo(an.totais.G, 4);
    const nos = apoiosMuro(an);
    expect(nos.length).toBe(3 * 13); // três pavimentos-tipo, nós a cada 0,5 m nos 6 m
    const Rmuro = nos.reduce((t, [n]) => t + an.portico.res!.reacoes[0].get(n)![2], 0);
    expect(Rmuro).toBeGreaterThan(0.3 * an.totais.G); // o muro leva parte relevante das lajes (e o seu peso)
    // superelemento × modelo cheio
    const ch = an.cheio!, r = resolver3(ch.modelo, [ch.casos[0]]), u = r.desloc[0];
    // nós dos pilares e do muro (os nós internos da grelha têm uz, rx e ry condensados no pórtico)
    const nosComp = new Set(nos.map(([n]) => n));
    an.portico.barras.forEach((t, i) => { if (t.tipo === 'pilar') { nosComp.add(an.portico.modelo.barras[i].i); nosComp.add(an.portico.modelo.barras[i].j); } });
    const dofs = [...nosComp].flatMap((n) => [0, 1, 2, 3, 4, 5].map((g) => n * 6 + g));
    let e = 0, mx = 0;
    for (const d of dofs) { e = Math.max(e, Math.abs(u[d] - an.portico.res!.desloc[0][d])); mx = Math.max(mx, Math.abs(u[d])); }
    expect(e / mx).toBeLessThan(1e-8);
    // cheio × OpenSees (mesma discretização, molas de folga incluídas)
    const PROC = 'node:process', FS = 'node:fs';
    const env = ((await import(/* @vite-ignore */ PROC)) as { env: Record<string, string | undefined> }).env;
    if (env.GERAR_OPENSEES) {
      const fs = (await import(/* @vite-ignore */ FS)) as { writeFileSync: (p: string, d: string) => void };
      const mm = ch.modelo, c = ch.casos[0];
      fs.writeFileSync('validation/opensees/vinculo_externo.modelo.json', JSON.stringify({
        nos: mm.nos, apoios: [...mm.apoios], escravos: mm.escravos, molas: mm.molas ?? [],
        barras: mm.barras.map((b) => ({ i: b.i, j: b.j, E: b.E, G: b.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, Ay: b.Ay ?? null, ref: b.ref ?? null, offI: b.offI ?? null, offJ: b.offJ ?? null, eng: !!(b.engI?.length || b.engJ?.length || b.libI?.length || b.libJ?.length) })),
        nodais: c.nodais, distribuidas: c.distribuidas, muro: nos.map(([n]) => n),
      }));
    }
    expect(ch.modelo.barras.every((b) => !b.engI?.length && !b.engJ?.length && !b.libI?.length && !b.libJ?.length)).toBe(true);
    const R0 = ref as { nos: number; desloc: number[][]; reacoesMuro: number };
    expect(R0.nos).toBe(ch.modelo.nos.length);
    let e2 = 0, m2 = 0;
    R0.desloc.forEach((d, n) => { for (let k = 0; k < 6; k++) { e2 = Math.max(e2, Math.abs(u[n * 6 + k] - d[k])); m2 = Math.max(m2, Math.abs(d[k])); } });
    expect(e2 / m2).toBeLessThan(1e-8); // 6e-12 em 24/10/2026
    expect(Math.abs(Rmuro - R0.reacoesMuro)).toBeLessThan(1e-12 * Rmuro + 1e-6);
  }, 120000);
});

/** Nós com apoio sobre a linha do muro do painel (y = 2, acima da base; fora os mestres do diafragma, com uz, rx e ry presos). */
const apoiosMuro = (an: AnaliseEdificio) => [...an.portico.modelo.apoios].filter(([n, g]) => { const p = an.portico.modelo.nos[n]; return g.includes(0) && Math.abs(p[1] - 2) < 1e-6 && p[2] > 0.1 && p[0] > -0.01 && p[0] < 6.01; });

/** Painel 6 × 4 m: 4 pilares 30 × 30, vigas de borda 20 × 50, muro (vínculo articulado) em y = 2 de borda a borda e lajes maciças de 12 cm. */
function painelComMuro(valores: Record<string, number> = {}) {
  const { s, ok } = sessao({ malha: 0.5, engasteTopoUltimo: 1, ...valores });
  ok('lote', { comandos: [[0, 0], [6, 0], [6, 4], [0, 4]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  ok('lote', { comandos: [[[0, 0], [6, 0]], [[6, 0], [6, 4]], [[6, 4], [0, 4]], [[0, 4], [0, 0]], [[0, 2], [6, 2]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.2, h: 0.5 } } })) });
  ok('viga.editar', { id: s.modelo.vigas[4].id, vinculoExterno: 'articulacao' });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return s;
}
