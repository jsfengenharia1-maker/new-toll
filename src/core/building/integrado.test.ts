// N2b: modelo integrado (grelhas condensadas no pórtico), regra do diafragma, aberturas, punção com vento e a validação
// externa contra o OpenSees (validation/opensees/integrado.py, fora do npm test; aqui só a comparação com o JSON gerado).
import { describe, expect, it } from 'vitest';
import ref from '../../../validation/opensees/integrado.json';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { resolver3, type Modelo3, type V3 } from '../fe3d';
import type { Casca3 } from '../casca';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { edificioExemplo } from '../sheets/exemplo';
import { aberturasDiafragma, escravosVerticais } from './diafragma';
import { verificar } from './verify';

/** Edifício de exemplo (3 × 2 vãos, 3 pavimentos-tipo com lajes maciças) com malha de 0,5 m (modelo menor). */
function exemplo(valores: Record<string, number> = {}) {
  const s = edificioExemplo();
  s.executar('opcoes.definir', { valores: { malha: 0.5, ...valores } });
  return s;
}

/** Maior erro relativo entre dois vetores de deslocamentos nos gdl dados (relativo ao maior valor absoluto). */
function erroRel(a: ArrayLike<number>, b: ArrayLike<number>, dofs: number[]) {
  let e = 0, m = 0;
  for (const d of dofs) { e = Math.max(e, Math.abs(a[d] - b[d])); m = Math.max(m, Math.abs(b[d])); }
  return e / (m || 1);
}

describe('modelo integrado (N2b)', () => {
  it('superelemento igual ao modelo cheio (erro relativo < 1e-9)', () => {
    const s = exemplo();
    const an = analisarEdificio(s.modelo, {}, { cheio: true });
    expect(an.erro).toBeUndefined();
    const ch = an.cheio!;
    const r = resolver3(ch.modelo, ch.casos);
    expect(r.erro).toBeUndefined();
    const pm = an.portico;
    // nós dos pilares (todos os gdl) e nós das grelhas (uz, rx, ry), nos casos G e Q
    const nosPil = new Set<number>();
    pm.barras.forEach((t, i) => { if (t.tipo === 'pilar') { nosPil.add(pm.modelo.barras[i].i); nosPil.add(pm.modelo.barras[i].j); } });
    for (let ic = 0; ic < 2; ic++) {
      const dofs = [...nosPil].flatMap((n) => [0, 1, 2, 3, 4, 5].map((g) => n * 6 + g));
      expect(erroRel(pm.res!.desloc[ic], r.desloc[ic], dofs)).toBeLessThan(1e-9);
      for (const g of an.grelhas.filter((x) => x.integrado)) {
        const mapa = ch.noGrelha[g.pavimento], u = g.res!.desloc[ic];
        const gd = mapa.flatMap((_, n) => [2, 3, 4].map((k) => n * 6 + k));
        const uf = new Float64Array(mapa.length * 6);
        mapa.forEach((j, n) => { for (const k of [2, 3, 4]) uf[n * 6 + k] = r.desloc[ic][j * 6 + k]; });
        // nós associados: o cheio dá o nó do pilar; a grelha, o ponto do nó (corpo rígido) – compara os internos
        const internos = gd.filter((d) => { const n = (d - (d % 6)) / 6; return mapa[n] !== undefined && !nosPil.has(mapa[n]); });
        expect(erroRel(u, uf, internos)).toBeLessThan(1e-9);
      }
    }
    // reações na fundação iguais
    for (const [no, f] of r.reacoes[0]) { const fi = pm.res!.reacoes[0].get(no); if (fi) for (let k = 0; k < 6; k++) expect(Math.abs(fi[k] - f[k])).toBeLessThan(1e-7 * (1 + Math.abs(f[k]))); }
  }, 120000);

  it('integrado × separado com vigas muito rígidas: diferença < 2 % (momentos das vigas, reações e γz)', () => {
    const vigas = (s: Sessao) => { for (const v of s.modelo.vigas) expect(s.executar('viga.editar', { id: v.id, secao: { b: 0.3, h: 1.5 } }).ok).toBe(true); };
    const calc = (mg: number) => { const s = exemplo({ modeloGlobal: mg, cortanteBarrasLaje: 0 }); vigas(s); const an = analisarEdificio(s.modelo); return { s, an, d: dimensionarEdificio(s.modelo, an) }; };
    const sep = calc(0), int = calc(1);
    for (const v of sep.d.vigas) {
      const w = int.d.vigas.find((x) => x.viga === v.viga)!;
      expect(Math.abs(w.Mpos - v.Mpos) / Math.max(1, Math.abs(v.Mpos))).toBeLessThan(0.02);
      expect(Math.abs(w.Mneg - v.Mneg) / Math.max(1, Math.abs(v.Mneg))).toBeLessThan(0.02);
    }
    for (const f of sep.an.fundacao.filter((x) => x.caso === 'G')) {
      const g = int.an.fundacao.find((x) => x.caso === 'G' && x.pilar === f.pilar)!;
      expect(Math.abs(g.N - f.N) / f.N).toBeLessThan(0.02);
    }
    expect(Math.abs(int.an.vento!.gamaZ[0].max / sep.an.vento!.gamaZ[0].max - 1)).toBeLessThan(0.02);
  }, 120000);

  it('vigas da divisão fina com esforços da grelha, equilíbrio e superelementos sem funções no resultado', () => {
    const s = exemplo();
    const an = analisarEdificio(s.modelo);
    expect(an.portico.barras.some((t) => t.tipo === 'viga' && t.fina)).toBe(true);
    expect(an.portico.modelo.superelementos!.every((se) => !('recuperar' in se))).toBe(true);
    expect(() => structuredClone(an.portico.modelo)).not.toThrow();
    const somaN = (c: string) => an.fundacao.filter((f) => f.caso === c).reduce((t, f) => t + f.N, 0);
    expect(Math.abs(somaN('G') / an.totais.G - 1)).toBeLessThan(1e-9);
    expect(Math.abs(somaN('Q') / an.totais.Q - 1)).toBeLessThan(1e-9);
    // vigas: cada barra fina tem esforços e a viga é dimensionada
    const d = dimensionarEdificio(s.modelo, an);
    expect(d.vigas.length).toBe(s.modelo.vigas.length);
    expect(d.vigas.every((v) => v.Mpos > 0 && v.V > 0)).toBe(true);
    // modelo separado continua disponível e marca as grelhas como não integradas
    const s2 = exemplo({ modeloGlobal: 0 });
    const an2 = analisarEdificio(s2.modelo);
    expect(an2.grelhas.some((g) => g.integrado)).toBe(false);
    expect(an2.portico.barras.some((t) => t.fina)).toBe(false);
  }, 120000);

  it('rigidez reduzida do γz inclui as lajes (0,3·Eci·Ic): γz do integrado entre o separado e o de lajes rígidas', () => {
    const sep = analisarEdificio(exemplo({ modeloGlobal: 0 }).modelo).vento!.gamaZ[0].max;
    const int = analisarEdificio(exemplo().modelo).vento!.gamaZ[0].max;
    // as lajes ligadas aos pilares enrijecem o pórtico: γz menor que no separado
    expect(int).toBeLessThan(sep);
    expect(int).toBeGreaterThan(1);
  }, 120000);
});

describe('validação externa: OpenSees (validation/opensees/integrado.py)', () => {
  it('deslocamentos do modelo cheio iguais aos do OpenSees (mesma discretização; erro relativo < 1e-8)', async () => {
    const s = exemplo({ engasteTopoUltimo: 1, malha: 1 });
    const an = analisarEdificio(s.modelo, {}, { cheio: true });
    const ch = an.cheio!;
    const PROC = 'node:process', FS = 'node:fs';
    const env = ((await import(/* @vite-ignore */ PROC)) as { env: Record<string, string | undefined> }).env;
    if (env.GERAR_OPENSEES) {
      // exporta o modelo cheio (caso G) para o script Python; o JSON de referência sai do OpenSees
      const fs = (await import(/* @vite-ignore */ FS)) as { writeFileSync: (p: string, d: string) => void };
      const m = ch.modelo, c = ch.casos[0];
      fs.writeFileSync('validation/opensees/integrado.modelo.json', JSON.stringify({
        nos: m.nos, apoios: [...m.apoios], escravos: m.escravos,
        barras: m.barras.map((b) => ({ i: b.i, j: b.j, E: b.E, G: b.G, A: b.A, Iy: b.Iy, Iz: b.Iz, J: b.J, Ay: b.Ay ?? null, ref: b.ref ?? null, offI: b.offI ?? null, offJ: b.offJ ?? null, eng: !!(b.engI?.length || b.engJ?.length || b.libI?.length || b.libJ?.length) })),
        nodais: c.nodais, distribuidas: c.distribuidas,
      }));
    }
    expect(ch.modelo.barras.every((b) => !b.engI?.length && !b.engJ?.length && !b.libI?.length && !b.libJ?.length)).toBe(true);
    const r = resolver3(ch.modelo, [ch.casos[0]]);
    const u = r.desloc[0], R = ref as { nos: number; desloc: number[][] };
    expect(R.nos).toBe(ch.modelo.nos.length);
    let e = 0, mx = 0;
    R.desloc.forEach((d, n) => { for (let k = 0; k < 6; k++) { e = Math.max(e, Math.abs(u[n * 6 + k] - d[k])); mx = Math.max(mx, Math.abs(d[k])); } });
    expect(e / mx).toBeLessThan(1e-8); // 2e-11 em 21/10/2026
    // e o integrado (superelemento) coincide com o cheio nos nós dos pilares
    const pm = an.portico, nosPil = new Set<number>();
    pm.barras.forEach((t, i) => { if (t.tipo === 'pilar') { nosPil.add(pm.modelo.barras[i].i); nosPil.add(pm.modelo.barras[i].j); } });
    const dofs = [...nosPil].flatMap((n) => [0, 1, 2, 3, 4, 5].map((g) => n * 6 + g));
    let e2 = 0, m2 = 0;
    for (const d of dofs) { e2 = Math.max(e2, Math.abs(pm.res!.desloc[0][d] - R.desloc[(d - (d % 6)) / 6][d % 6])); m2 = Math.max(m2, Math.abs(R.desloc[(d - (d % 6)) / 6][d % 6])); }
    expect(e2 / m2).toBeLessThan(1e-8);
  }, 120000);
});

describe('diafragma: elementos verticais e aberturas', () => {
  it('casca vertical: só os nós no nível da laje são escravos; os de meia altura ficam livres no plano', () => {
    // parede 4 × 6 m (dois níveis de 3 m) em cascas de 6 nós, com um mestre por nível; força horizontal no mestre de cima
    const nos: V3[] = [], tris: [number, number, number, number, number, number][] = [];
    const nx = 4, nz = 4, L = 4, H = 6, id = (i: number, k: number) => k * (2 * nx + 1) + i;
    for (let k = 0; k <= 2 * nz; k++) for (let i = 0; i <= 2 * nx; i++) nos.push([(i * L) / (2 * nx), 0, (k * H) / (2 * nz)]);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const a = id(2 * i, 2 * k), b = id(2 * i + 2, 2 * k), c = id(2 * i + 2, 2 * k + 2), d = id(2 * i, 2 * k + 2);
      tris.push([a, b, c, id(2 * i + 1, 2 * k), id(2 * i + 2, 2 * k + 1), id(2 * i + 1, 2 * k + 1)], [a, c, d, id(2 * i + 1, 2 * k + 1), id(2 * i + 1, 2 * k + 2), id(2 * i, 2 * k + 1)]);
    }
    const m3 = nos.length, m6 = m3 + 1;
    nos.push([L / 2, 0, 3], [L / 2, 0, 6]); // mestres no plano da parede (o giro do diafragma não muda ux)
    const parede = nos.slice(0, m3).map((_, i) => i);
    const esc = escravosVerticais(nos, parede, [{ z: 3, mestre: m3 }, { z: 6, mestre: m6 }]);
    expect(esc).toHaveLength(2 * (2 * nx + 1));
    expect(esc.every((e) => Math.abs(nos[e.no][2] - 3) < 1e-9 || Math.abs(nos[e.no][2] - 6) < 1e-9)).toBe(true);
    const mod: Modelo3 = { nos, barras: [], apoios: new Map([[m3, [2, 3, 4]], [m6, [2, 3, 4]]]), escravos: esc, cascas: tris.map((t) => ({ nos: t, E: 25e6, nu: 0.2, h: 0.2 }) as Casca3) };
    parede.forEach((n) => { if (nos[n][2] < 1e-9) mod.apoios.set(n, [0, 1, 2, 3, 4, 5]); });
    const r = resolver3(mod, [{ nodais: [{ no: m6, f: [100, 0, 0, 0, 0, 0] }], distribuidas: [] }]);
    expect(r.erro).toBeUndefined();
    const ux = (n: number) => r.desloc[0][n * 6];
    // no nível: todos com o deslocamento do mestre (corpo rígido); a meia altura do lance, cada nó desloca diferente
    for (let i = 0; i <= 2 * nx; i++) expect(ux(id(i, 4))).toBeCloseTo(ux(m3), 12);
    const meio = [0, 2 * nx].map((i) => ux(id(i, 2)));
    expect(Math.abs(meio[0] - meio[1])).toBeGreaterThan(1e-9);
    expect(ux(m6)).toBeGreaterThan(ux(m3));
  });

  it('DIAFRAGMA_ABERTURA: furo grande numa zona fechada por vigas', () => {
    const s = edificioExemplo();
    expect(aberturasDiafragma(s.modelo)).toHaveLength(0);
    const l = s.modelo.lajes[0], xs = l.contorno.map((p) => p[0]), ys = l.contorno.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a = 0.35 * (x1 - x0), b = 0.35 * (y1 - y0);
    expect(s.executar('laje.abertura', { id: l.id, contorno: [[cx - a, cy - b], [cx + a, cy - b], [cx + a, cy + b], [cx - a, cy + b]] }).ok).toBe(true);
    const d = verificar(s.modelo).filter((x) => x.codigo === 'DIAFRAGMA_ABERTURA');
    expect(d.length).toBeGreaterThan(0);
    expect(d[0].mensagem).toMatch(/49 %/);
    // limite das opções maior: some o aviso
    expect(s.executar('opcoes.definir', { valores: { aberturaDiafragma: 60 } }).ok).toBe(true);
    expect(verificar(s.modelo).some((x) => x.codigo === 'DIAFRAGMA_ABERTURA')).toBe(false);
  });
});

describe('punção com o vento no modelo integrado (N2d + N2b)', () => {
  function lisa(mg: number) {
    const s = new Sessao();
    for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
    const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
    const xs = [0.25, 6, 11.75];
    ok('lote', { comandos: xs.flatMap((x) => xs.map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.5, h: 0.5 } } }))) });
    ok('laje.criar', { grupo: 'g_3', contorno: [[0, 0], [12, 0], [12, 12], [0, 12]], tipo: { tipo: 'macica', h: 0.22 } });
    ok('opcoes.definir', { valores: { modeloGlobal: mg, malha: 0.5 } });
    const an = analisarEdificio(s.modelo);
    return { an, d: dimensionarEdificio(s.modelo, an) };
  }
  it('pilar interno: sem momento no separado (simetria), com o momento do vento no integrado', () => {
    const sep = lisa(0), int = lisa(1);
    const mi = (x: typeof sep) => x.d.puncao!.find((r) => r.tipo === 'interno' && r.pavimento === 'Tipo 1')!;
    expect(mi(sep).M[0] + mi(sep).M[1]).toBeLessThan(1e-6);
    expect(mi(int).M[0] + mi(int).M[1]).toBeGreaterThan(1);
    // os momentos do vento chegam às grelhas integradas por caso
    const g = int.an.grelhas.find((x) => x.integrado)!;
    const pid = Object.keys(g.momentos!)[0];
    expect(Object.keys(g.momentos![pid]).some((k) => k.startsWith('W'))).toBe(true);
  }, 120000);
});
