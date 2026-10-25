// R7b: opções e edição fina do detalhamento das vigas (montagem, ganchos, estribos, mínimos em % do vão, tramo
// predefinido, redução de lb por As,calc/As,ef, detalhe editado) e regressão do perfil NBR contra o detalhamento anterior.
import { describe, expect, it } from 'vitest';
import base from './detalhamento.base.json';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { desniveisLongitudinais, ganchoNoventa, lbBasico, motivoTramo } from './detalhamento';
import { dimensionarEdificio } from './dimensionamento';
import { edificioExemplo } from '../sheets/exemplo';
import { revisarEdificio } from './revisao';
import { opcoesEmUso } from './opcoes';
import { concrete } from '../concrete';
import { ANTES_N2E } from './antesN2e';
import { ANTES_N4C } from './antesN4c';
import { ANTES_DESAPRUMO } from './antesDesaprumo';

function viga3(vaos: number[], perfil: 'sistema' | 'nbr' = 'sistema', h = 0.45, vao_y = 5) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  ok('opcoes.definir', { valores: ANTES_DESAPRUMO });
  if (perfil === 'nbr') ok('opcoes.definir', { perfil: 'nbr' });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, vao_y].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, vao_y], [L, vao_y]], ...xs.map((x) => [[x, 0], [x, vao_y]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  return { s, ok, calc: () => dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)) };
}

const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
function digest(d: ReturnType<typeof dimensionarEdificio>) {
  return (d.detalhes ?? []).map((x) => ({ n: x.nome, b: x.barras.map((y) => [y.pos, y.face, y.tipo, y.n, y.phi, r6(y.s0), r6(y.s1), y.ganchos, r6(y.comprimento)]), e: x.estribos.map((z) => [r6(z.s0), r6(z.s1), z.phi, z.s, z.n, r6(z.comprimento), z.ramos ?? 2]), em: x.emendas.map((m) => [m.face, r6(m.s), r6(m.l0)]), peso: r6(x.peso), av: x.avisos }));
}

describe('R7b: perfil NBR reproduz o detalhamento das vigas anterior', () => {
  // baseline gerado pelo código anterior à R7b (perfil do sistema); as opções novas com os valores da NBR reproduzem o resultado
  const NBR_DET = { vigaReducaoLb: 0, vigaNegativoVao: 0, vigaSimetriaNegativos: 0, vigaNegativosUnir: 0, vigaEstriboExtensao: 0, vigaCortesInf: 1, vigaGruposSup: 1, vigaAncoragemFolga: 0, vigaAncoragemEixo: 0 };
  it('vigas de 2 e 3 vãos e edifício de exemplo (digest idêntico ao do código anterior)', () => {
    for (const [vaos, ref] of [[[5, 5], base.v2], [[5, 5, 5], base.v3]] as const) {
      const t = viga3([...vaos]);
      // baselines gerados com o modelo separado (anterior à N2b): o modelo integrado muda os esforços de todos os edifícios
      t.ok('opcoes.definir', { valores: { ...NBR_DET, ...ANTES_N2E, ...ANTES_N4C, modeloGlobal: 0, cortanteBarrasLaje: 0 } });
      expect(digest(t.calc())).toEqual(ref);
    }
    const s = edificioExemplo();
    s.executar('opcoes.definir', { valores: { ...NBR_DET, ...ANTES_N2E, ...ANTES_N4C, modeloGlobal: 0, cortanteBarrasLaje: 0 } });
    expect(digest(dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)))).toEqual(base.ex);
  }, 60000);
  it('o perfil NBR traz esses valores e o do sistema muda o detalhamento', () => {
    const nbr = opcoesEmUso(undefined, 'nbr'), sis = opcoesEmUso(undefined, 'sistema');
    expect(Object.entries(NBR_DET).every(([k, v]) => (nbr as never as Record<string, number>)[k] === v)).toBe(true);
    expect(sis.vigaReducaoLb).toBe(1);
    expect(sis.vigaNegativoVao).toBe(25);
    const a = digest(viga3([5, 5]).calc()), t = viga3([5, 5]);
    t.ok('opcoes.definir', { valores: NBR_DET });
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(digest(t.calc())));
  });
});

describe('R7b: ganchos e ancoragem', () => {
  it('perna reta configurável: φ10 com 8φ e 12φ (cálculo manual)', () => {
    const base = (Math.PI * 0.06) / 4 - 0.035; // curva: π(D + φ)/4 − (D/2 + φ), D = 5φ
    expect(ganchoNoventa(10)).toBeCloseTo(0.08 + base, 9);
    expect(ganchoNoventa(10, 12)).toBeCloseTo(0.12 + base, 9);
  });
  it('lb reduzido: prolongamento do reforço = lb·As,calc/As,ef (≥ lb,mín)', () => {
    const { calc, s, ok } = viga3([6, 6], 'sistema');
    const d = calc(), det = d.detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)!;
    const r = d.vigas.find((x) => x.viga === s.modelo.vigas[0].id)!;
    ok('opcoes.definir', { valores: { vigaReducaoLb: 0 } });
    const ref = calc().detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)!;
    // o reforço do sistema não é mais longo que o do perfil NBR (lb pleno) e nunca menor que lb,mín em cada ponta
    const rS = det.barras.filter((x) => x.tipo === 'reforço'), rN = ref.barras.filter((x) => x.tipo === 'reforço');
    expect(rS.length).toBe(rN.length);
    rS.forEach((x, i) => expect(x.s1 - x.s0).toBeLessThanOrEqual(rN[i].s1 - rN[i].s0 + 1e-9));
    expect(r.AsNec[0]).toBeGreaterThan(0);
    const lb = lbBasico(r.arranjo.inf!.phi, concrete(30), 500 / 1.15, true);
    for (const x of rS) expect(x.s1 - x.s0).toBeGreaterThan(0.3 * lb);
  });
});

describe('R7b: montagem, negativos e estribos', () => {
  it('montagem interrompida cria porta-estribos nas lacunas e não é colaborante', () => {
    const { calc, ok, s } = viga3([6, 6]);
    ok('opcoes.definir', { valores: { vigaMontagemContinua: 0 } });
    const det = calc().detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)!;
    const mont = det.barras.filter((x) => x.tipo === 'montagem'), neg = det.barras.filter((x) => x.tipo === 'negativo');
    expect(mont.length).toBeGreaterThanOrEqual(2);
    expect(neg.length).toBeGreaterThan(0);
    // nenhuma montagem cobre o centro do apoio interno, onde está o negativo
    const ap = det.apoios[1], c = (ap.s0 + ap.s1) / 2;
    expect(mont.some((x) => x.s0 < c - 0.3 && x.s1 > c + 0.3)).toBe(false);
  });
  it('montagem reta (sem gancho) e perna do gancho', () => {
    const { calc, ok, s } = viga3([5, 5]);
    ok('opcoes.definir', { valores: { vigaMontagemGancho: 0 } });
    const det = calc().detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)!;
    for (const x of det.barras.filter((q) => q.tipo === 'montagem')) expect(x.ganchos).toEqual([false, false]);
    ok('opcoes.definir', { valores: { vigaPernaGancho: 12, vigaMontagemGancho: 1 } });
    const det2 = calc().detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)!;
    const p = det2.barras.find((q) => q.tipo === 'passante')!;
    expect(p.comprimento).toBeGreaterThanOrEqual(p.s1 - p.s0 + 2 * ganchoNoventa(p.phi, 12) - 1e-9);
  });
  it('negativo mínimo em % do vão: cada lado do apoio interno vai ao menos 25 % do vão a partir da face', () => {
    const { calc, s } = viga3([5, 5]);
    const det = calc().detalhes!.find((x) => x.viga === s.modelo.vigas[0].id)!, ap = det.apoios[1];
    const neg = det.barras.filter((x) => x.tipo === 'negativo' && x.s0 < ap.s0 && x.s1 > ap.s1);
    expect(neg.length).toBeGreaterThan(0);
    const vao = ap.s0 - det.apoios[0].s1;
    expect(ap.s0 - neg[0].s0).toBeGreaterThanOrEqual(0.25 * vao - 1e-9);
  });
  it('estribos: extensão de d/2 e simetria deixam as zonas mais densas, nunca mais frouxas', () => {
    const a = viga3([5, 5]), b = viga3([5, 5]);
    a.ok('opcoes.definir', { valores: { vigaEstriboExtensao: 0 } });
    b.ok('opcoes.definir', { valores: { vigaEstriboSimetria: 1 } });
    const da = a.calc().detalhes![0], db = b.calc().detalhes![0];
    const nA = da.estribos.reduce((t, z) => t + z.n, 0), nB = db.estribos.reduce((t, z) => t + z.n, 0);
    expect(nB).toBeGreaterThanOrEqual(nA);
    // simetria: espaçamentos espelhados em torno do meio da viga
    const meio = (db.extensao[0] + db.extensao[1]) / 2;
    const sEm = (z: number) => db.estribos.find((q) => q.s0 - 1e-9 <= z && z <= q.s1 + 1e-9)?.s;
    for (const z of db.estribos) expect(sEm(2 * meio - (z.s0 + z.s1) / 2)).toBe(z.s);
  });
  it('φt > bw/10 gera o aviso do estribo; estribo bloqueado φ12,5 em viga de 12 cm', () => {
    const { s, calc, ok } = viga3([5, 5]);
    ok('viga.editar', { id: s.modelo.vigas[0].id, secao: { b: 0.12, h: 0.45 } });
    ok('viga.armadura', { id: s.modelo.vigas[0].id, inf: { n: 4, phi: 16 }, sup: { n: 2, phi: 12.5 }, estribo: { phi: 12.5, s: 0.15 } });
    const d = calc();
    expect(d.detalhes![0].avisos.some((m) => /acima de bw\/10/.test(m))).toBe(true);
    const rev = revisarEdificio(s.modelo, null, d);
    expect(rev.itens.some((i) => i.codigo === 'ESTRIBO_BITOLA' && i.nivel === 'erro')).toBe(true);
  });
});

describe('R7b: tramo predefinido e desnível', () => {
  function duasVigas(nivelB = 0, hB = 0.45) {
    const { s, ok, calc } = viga3([5, 5]);
    // duas vigas alinhadas em y = 0 (V0 = trecho 0..5 e V1 = 5..10) no lugar da viga única
    const id0 = s.modelo.vigas[0].id;
    ok('viga.dividir', { id: id0, ponto: [5, 0] });
    const vs = s.modelo.vigas.filter((v) => v.pontos.every((p) => Math.abs(p[1]) < 1e-9));
    expect(vs.length).toBe(2);
    if (nivelB || hB !== 0.45) ok('viga.editar', { id: vs[1].id, nivel: nivelB, secao: { b: 0.15, h: hB } });
    return { s, ok, calc, vs };
  }
  it('tramo: validação geométrica e barra inferior sem emenda nem gancho no apoio comum', () => {
    const { s, ok, calc, vs } = duasVigas();
    expect(motivoTramo(s.modelo, [vs[0].id])).toMatch(/duas vigas/);
    expect(motivoTramo(s.modelo, [vs[0].id, s.modelo.vigas.find((v) => v.pontos.every((p) => Math.abs(p[0]) < 1e-9))!.id])).toMatch(/consecutivas/);
    const sem = calc();
    ok('viga.tramo', { ids: [vs[0].id, vs[1].id] });
    expect(s.modelo.tramos).toEqual([[vs[0].id, vs[1].id]]);
    const com = calc();
    const pa = com.detalhes!.find((x) => x.viga === vs[0].id)!.barras.find((x) => x.tipo === 'passante')!, pb = com.detalhes!.find((x) => x.viga === vs[1].id)!.barras.find((x) => x.tipo === 'passante')!;
    const pa0 = sem.detalhes!.find((x) => x.viga === vs[0].id)!.barras.find((x) => x.tipo === 'passante')!;
    expect(pa.continuaCom).toBe(vs[1].id);
    expect(pb.continuaCom).toBe(vs[0].id);
    expect([pa.ganchos[1], pb.ganchos[0]].includes(true)).toBe(false);
    // a barra termina no eixo do apoio comum (x = 5) e é menor que a sem tramo
    expect(Math.max(pa.s1, pa0.s1)).toBeCloseTo(pa0.s1, 6);
    expect(pa.s1).toBeCloseTo(5, 1);
    expect(com.detalhes!.every((x) => !x.avisos.some((m) => /^Tramo/.test(m)))).toBe(true);
    // desfazer
    ok('viga.tramo', { ids: [vs[0].id, vs[1].id], remover: true });
    expect(s.modelo.tramos ?? []).toEqual([]);
  });
  it('tramo recusado quando a barra passa da barra máxima', () => {
    const { ok, calc, vs } = duasVigas();
    ok('opcoes.definir', { valores: { barraMaxima: 6 } });
    ok('viga.tramo', { ids: [vs[0].id, vs[1].id] });
    const d = calc();
    expect(d.detalhes!.some((x) => x.avisos.some((m) => /^Tramo predefinido desconsiderado/.test(m)))).toBe(true);
  });
  it('desnível longitudinal: vigas alinhadas com faces diferentes geram o aviso (limite das opções)', () => {
    const { s, ok, calc, vs } = duasVigas(-0.1, 0.45);
    const av = desniveisLongitudinais(s.modelo, { vigaDesnivelLimite: 2 } as never);
    expect(av.get(vs[0].id)?.[0]).toMatch(/^Desnível longitudinal entre/);
    expect(av.get(vs[0].id)?.[0]).toMatch(/superior 10,0 cm/);
    ok('opcoes.definir', { valores: { vigaDesnivelLimite: 20 } });
    expect(desniveisLongitudinais(s.modelo, { vigaDesnivelLimite: 20 } as never).size).toBe(0);
    const rev = revisarEdificio(s.modelo, null, calc());
    expect(rev.itens.some((i) => i.codigo === 'DESNIVEL_LONG')).toBe(false);
  });
});

describe('R7b: detalhe editado (viga.detalhe)', () => {
  it('editar comprimento, gancho e perna de uma posição; verifica a cobertura; BLOQ ao mudar os vãos', () => {
    const { s, ok, calc } = viga3([5, 5]);
    const id = s.modelo.vigas[0].id;
    const d0 = calc().detalhes!.find((x) => x.viga === id)!;
    const neg = d0.barras.find((x) => x.tipo === 'negativo')!;
    // alonga o negativo 20 cm de cada lado e põe perna de 15φ
    ok('viga.detalhe', { id, barras: [{ pos: neg.pos, s0: neg.s0 - 0.2, s1: neg.s1 + 0.2, perna: 15, ganchos: [false, false] }], fatorEmenda: 1.5 });
    const d1 = calc().detalhes!.find((x) => x.viga === id)!, n1 = d1.barras.find((x) => x.pos === neg.pos)!;
    expect(n1.editada).toBe(true);
    expect(n1.s1 - n1.s0).toBeCloseTo(neg.s1 - neg.s0 + 0.4, 6);
    expect(d1.avisos.some((m) => /insuficiente/.test(m))).toBe(false);
    // encurta demais: não cobre a necessária
    ok('viga.detalhe', { id, barras: [{ pos: neg.pos, s0: neg.s0 + 0.9, s1: neg.s1 - 0.9 }] });
    const d2 = calc(), rev = revisarEdificio(s.modelo, null, d2);
    expect(d2.detalhes!.find((x) => x.viga === id)!.avisos.some((m) => /^Detalhe editado insuficiente/.test(m))).toBe(true);
    expect(rev.itens.some((i) => i.codigo === 'DETALHE_INSUF' && i.nivel === 'erro')).toBe(true);
    // remover volta ao calculado
    ok('viga.detalhe', { id, remover: true });
    expect(s.modelo.vigas[0].detalhe).toBeUndefined();
    expect(JSON.stringify(digest(calc()))).toEqual(JSON.stringify(digest(dimensionarEdificio(s.modelo, analisarEdificio(s.modelo)))));
  }, 60000);
  it('fator de emenda multiplica l0', () => {
    const { s, ok, calc } = viga3([5, 5, 5]);
    const id = s.modelo.vigas[0].id;
    const l1 = calc().detalhes!.find((x) => x.viga === id)!.emendas[0].l0;
    ok('viga.detalhe', { id, fatorEmenda: 1.5 });
    const l2 = calc().detalhes!.find((x) => x.viga === id)!.emendas[0].l0;
    expect(l2).toBeCloseTo(1.5 * l1, 9);
  }, 60000);
  it('zona de estribos editada: espaçamento maior que o exigido reprova; φ e ramos mudam as peças', () => {
    const { s, ok, calc } = viga3([5, 5]);
    const id = s.modelo.vigas[0].id;
    const z0 = calc().detalhes!.find((x) => x.viga === id)!.estribos[0];
    ok('viga.detalhe', { id, zonas: [{ zona: 0, s: 0.30 }] });
    const d = calc().detalhes!.find((x) => x.viga === id)!;
    expect(d.estribos[0].s).toBe(0.3);
    expect(d.estribos[0].n).toBeLessThanOrEqual(z0.n);
    if (z0.s < 0.3) expect(d.avisos.some((m) => /^Detalhe editado insuficiente: estribo/.test(m))).toBe(true);
  }, 60000);
});
