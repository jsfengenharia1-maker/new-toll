// R7c: opções do detalhamento de pilares (níveis sem viga, corte no topo, redução de traspasse e arranque, continuidade,
// adensamento, seção insuficiente) e comprimentos editados (pilar.detalhe). O baseline `detalhamentoPilares.base.json`
// foi gerado pelo código anterior à R7c; com as opções novas nos valores da NBR, o detalhamento tem de ser idêntico.
import { describe, expect, it } from 'vitest';
import base from './detalhamentoPilares.base.json';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { edificioExemplo } from '../sheets/exemplo';
import { lbBasico } from './detalhamento';
import { ganchoNoventa } from './detalhamento';
import { posicoesEstribos } from './detalhamentoPilares';
import { OPCOES_INFO, opcoesEmUso, padraoDe } from './opcoes';
import { revisarEdificio } from './revisao';
import { concrete } from '../concrete';
import { lancesDoPilar, pavimentosOrdenados } from './types';

const NOVAS = ['pilarContinuidadeInicio', 'pilarContinuidadeFaces', 'pilarProlongarSemViga', 'pilarCorteTopo', 'pilarReducaoIntermediarios', 'pilarReducaoMinimo', 'pilarAdensamento', 'pilarAdensamentoAltura', 'pilarAdensamentoEspacamento', 'pilarInsuficienteSemDesenho'];
const VALORES_NBR = Object.fromEntries(OPCOES_INFO.filter((o) => NOVAS.includes(o.chave)).map((o) => [o.chave, padraoDe(o, 'nbr')]));

function predio(vezes = 4, lado = { b: 0.2, h: 0.4 }) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('pavimento.repetir', { id: 'pav_6', vezes });
  ok('vento.definir', { ativo: false });
  ok('lote', { comandos: [[0, 0], [5, 0], [5, 5], [0, 5]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', ...lado } } })) });
  ok('lote', { comandos: [[[0, 0], [5, 0]], [[0, 5], [5, 5]], [[0, 0], [0, 5]], [[5, 0], [5, 5]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  const dim = () => dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
  return { s, ok, dim };
}
const r6 = (x: unknown): unknown => typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : Array.isArray(x) ? x.map(r6) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, r6(v)])) : x;
function digest(d: ReturnType<typeof dimensionarEdificio>) {
  return r6({ det: d.detalhesPilares, res: d.resumoAcoPilares, arr: d.pilares.map((p) => [p.pilar, p.pavimentoId, p.arranjo, p.status]) });
}

/** N2c: soma dos lances desligados (padrão do sistema) desligada para comparar com a base anterior (Térreo sem vigas). */
const ANTES_N2C = { pilarLancesDesligados: 0 };

describe('R7c: opções novas na NBR reproduzem o detalhamento anterior', () => {
  it('valores da NBR: só a seção insuficiente sem desenho difere do padrão do sistema', () => {
    const nbr = opcoesEmUso(undefined, 'nbr') as never as Record<string, number>, sis = opcoesEmUso(undefined, 'sistema') as never as Record<string, number>;
    for (const k of NOVAS) expect(nbr[k]).toBe(VALORES_NBR[k]);
    expect(NOVAS.filter((k) => nbr[k] !== sis[k])).toEqual(['pilarInsuficienteSemDesenho']);
    expect([sis.pilarInsuficienteSemDesenho, nbr.pilarInsuficienteSemDesenho]).toEqual([1, 0]);
  });
  it('prédio de 5 lances, mudança de seção em arranque, perfil NBR e edifício de exemplo (digest idêntico)', () => {
    const a = predio(4);
    a.ok('opcoes.definir', { valores: { ...VALORES_NBR, ...ANTES_N2C } });
    expect(digest(a.dim())).toEqual(base.v4);
    const b = predio(2);
    b.ok('opcoes.definir', { valores: { ...VALORES_NBR, ...ANTES_N2C, pilarUniaoLances: 8, continuidadePilares: 0 } });
    const p = b.s.modelo.pilares[0], ls = lancesDoPilar(b.s.modelo, p);
    b.ok('pilar.secaoLance', { id: p.id, pavimento: ls.at(-1)!.id, secao: { tipo: 'ret', b: 0.2, h: 0.2 } });
    expect(digest(b.dim())).toEqual(base.arranque);
    const c = predio(4);
    c.ok('opcoes.definir', { perfil: 'nbr' });
    expect(digest(c.dim())).toEqual(base.nbr);
    const ex = edificioExemplo();
    ex.executar('opcoes.definir', { valores: { ...VALORES_NBR, ...ANTES_N2C } });
    expect(digest(dimensionarEdificio(ex.modelo, analisarEdificio(ex.modelo)))).toEqual(base.ex);
  }, 120000);
});

describe('R7c: traspasse e arranque reduzidos pela utilização', () => {
  const lbDe = (phi: number) => lbBasico(phi, concrete(30), 500 / 1.15, true);
  it('traspasse = máx(util·lb; 60 % de lb; 15φ; 20 cm), nunca maior que lb; 100 % volta ao lb pleno', () => {
    const t = predio(4);
    t.ok('opcoes.definir', { valores: { pilarReducaoIntermediarios: 1 } });
    const d = t.dim(), p = t.s.modelo.pilares[0], det = d.detalhesPilares!.find((x) => x.pilar === p.id)!;
    const ls = lancesDoPilar(t.s.modelo, p), ps = pavimentosOrdenados(t.s.modelo);
    const util = (i: number) => Math.min(1, Math.max(0, d.pilares.find((r) => r.pilar === p.id && r.pavimentoId === ls[i].id)!.util));
    let verificadas = 0;
    for (let i = 0; i < ls.length - 1; i++) {
      if (det.lances[i].transicao !== 'emenda') continue;
      const topo = ps.find((x) => x.id === ls[i].id)!.cota, phi = d.pilares.find((r) => r.pilar === p.id && r.pavimentoId === ls[i].id)!.arranjo!.phi;
      const lb = det.lb[ls[i].id], esperado = Math.max(Math.max(util(i), util(i + 1)) * lb, 0.6 * lb, 15 * phi / 1000, 0.2);
      const barra = det.barras.find((x) => x.tipo === 'longitudinal' && x.lances.includes(ls[i].id) && !x.lances.includes(ls[i + 1].id))!;
      expect(barra.z1 - topo).toBeCloseTo(esperado, 9);
      expect(barra.z1 - topo).toBeLessThanOrEqual(lb + 1e-9);
      verificadas++;
    }
    expect(verificadas).toBeGreaterThan(0);
    t.ok('opcoes.definir', { valores: { pilarReducaoMinimo: 100 } });
    const d2 = t.dim(), det2 = d2.detalhesPilares!.find((x) => x.pilar === p.id)!;
    for (let i = 0; i < ls.length - 1; i++) if (det2.lances[i].transicao === 'emenda') {
      const topo = ps.find((x) => x.id === ls[i].id)!.cota;
      expect(det2.barras.find((x) => x.tipo === 'longitudinal' && x.lances.includes(ls[i].id) && !x.lances.includes(ls[i + 1].id))!.z1 - topo).toBeCloseTo(det2.lb[ls[i].id], 9);
    }
  });
  it('arranque: ancoragem das barras novas = máx(util·lb; 0,3·lb; 10φ; 10 cm) e traspasse reduzido', () => {
    const t = predio(2);
    t.ok('opcoes.definir', { valores: { pilarUniaoLances: 8, continuidadePilares: 0, pilarReducaoIntermediarios: 1 } });
    const p = t.s.modelo.pilares[0], ls = lancesDoPilar(t.s.modelo, p);
    t.ok('pilar.secaoLance', { id: p.id, pavimento: ls.at(-1)!.id, secao: { tipo: 'ret', b: 0.2, h: 0.2 } });
    const d = t.dim(), det = d.detalhesPilares!.find((x) => x.pilar === p.id)!, ps = pavimentosOrdenados(t.s.modelo);
    const pen = ls.at(-2)!, topo = ps.find((x) => x.id === pen.id)!.cota;
    const arr = det.barras.find((x) => x.tipo === 'arranque')!;
    const u = Math.max(...ls.slice(-2).map((l) => Math.min(1, Math.max(0, d.pilares.find((r) => r.pilar === p.id && r.pavimentoId === l.id)!.util))));
    const lbA = lbDe(arr.phi), f = arr.phi / 1000;
    expect(topo - arr.z0).toBeCloseTo(Math.max(u * lbA, 0.3 * lbA, 10 * f, 0.1), 9);
    expect(arr.z1 - topo).toBeCloseTo(Math.max(u * lbA, 0.6 * lbA, 15 * f, 0.2), 9);
  });
});

describe('R7c: topo, níveis sem viga, adensamento e seção insuficiente', () => {
  it('corte no topo: sem gancho, mais curta pelo gancho e com aviso', () => {
    const t = predio(2);
    const p = t.s.modelo.pilares[0];
    const a = t.dim().detalhesPilares!.find((x) => x.pilar === p.id)!, ua = a.barras.filter((x) => x.tipo === 'longitudinal').at(-1)!;
    t.ok('opcoes.definir', { valores: { pilarCorteTopo: 1 } });
    const b = t.dim().detalhesPilares!.find((x) => x.pilar === p.id)!, ub = b.barras.filter((x) => x.tipo === 'longitudinal').at(-1)!;
    expect(ua.ganchos[1]).toBe(true);
    expect(ub.ganchos[1]).toBe(false);
    expect(ub.comprimento).toBeLessThan(ua.comprimento);
    expect(ua.comprimento - ub.comprimento).toBeGreaterThanOrEqual(ganchoNoventa(ua.phi) - 0.05);
    expect(b.avisos.some((m) => /cortadas no topo/.test(m))).toBe(true);
    expect(b.peso).toBeLessThan(a.peso);
  });
  it('nível sem viga: com a opção, lances iguais passam sem emenda mesmo acima do limite de união', () => {
    const t = predio(4);
    t.ok('opcoes.definir', { valores: { pilarUniaoLances: 0, continuidadePilares: 0 } });
    t.ok('grupo.desvincular', { pavimento: 'pav_5' }); // Tipo 2 sem vigas
    const p = t.s.modelo.pilares[0], ls = lancesDoPilar(t.s.modelo, p), i = ls.findIndex((l) => l.id === 'pav_5');
    const sem = t.dim().detalhesPilares!.find((x) => x.pilar === p.id)!;
    expect(sem.lances[i].transicao).not.toBe('continua');
    t.ok('opcoes.definir', { valores: { pilarProlongarSemViga: 1 } });
    const com = t.dim().detalhesPilares!.find((x) => x.pilar === p.id)!;
    const iguais = JSON.stringify(t.dim().pilares.find((r) => r.pavimentoId === ls[i].id && r.pilar === p.id)!.arranjo) === JSON.stringify(t.dim().pilares.find((r) => r.pavimentoId === ls[i + 1].id && r.pilar === p.id)!.arranjo);
    if (iguais) {
      expect(com.lances[i].transicao).toBe('continua');
      // o Térreo também não tem vigas; os níveis com vigas seguem emendados
      expect(com.lances.filter((l) => l.transicao === 'continua').map((l) => l.pavimento).sort()).toEqual(['pav_2', 'pav_5']);
    }
    expect(com.barras.length).toBeLessThanOrEqual(sem.barras.length);
  });
  it('posições dos estribos com adensamento (cálculo manual) e n coerente', () => {
    // lance de 3 m, s = 20 cm; adensamento 10 cm em 50 cm: 5 + 10 + 5 estribos
    const pos = posicoesEstribos(0, 3, 0.2, { h: 0.5, s: 0.1 });
    expect(pos).toHaveLength(20);
    expect(pos.slice(0, 5).map((z) => +z.toFixed(3))).toEqual([0.05, 0.15, 0.25, 0.35, 0.45]);
    expect(pos.slice(-5).map((z) => +z.toFixed(3))).toEqual([2.55, 2.65, 2.75, 2.85, 2.95]);
    for (let i = 1; i < pos.length; i++) expect(pos[i] - pos[i - 1]).toBeLessThanOrEqual(0.2 + 1e-9);
    expect(posicoesEstribos(0, 3, 0.2)).toHaveLength(Math.floor(2.95 / 0.2) + 1);
    const t = predio(2);
    const p = t.s.modelo.pilares[0];
    const a = t.dim().detalhesPilares!.find((x) => x.pilar === p.id)!;
    t.ok('opcoes.definir', { valores: { pilarAdensamento: 1, pilarAdensamentoEspacamento: 5, pilarAdensamentoAltura: 0.5 } });
    const b = t.dim().detalhesPilares!.find((x) => x.pilar === p.id)!;
    b.lances.forEach((l, i) => {
      expect(l.estribos.ad).toEqual({ h: 0.5, s: 0.05 });
      expect(l.estribos.n).toBe(posicoesEstribos(l.z0, l.z1, l.estribos.s, l.estribos.ad).length);
      expect(l.estribos.n).toBeGreaterThan(a.lances[i].estribos.n);
    });
    expect(b.peso).toBeGreaterThan(a.peso);
  });
  it('seção insuficiente: fora do detalhamento e do quantitativo no perfil do sistema, desenhada na NBR', () => {
    const t = predio(6, { b: 0.14, h: 0.14 });
    const d = t.dim();
    const falhas = d.pilares.filter((r) => r.mensagens.some((m) => /^Não atende com até 4/.test(m)));
    expect(falhas.length).toBeGreaterThan(0);
    const ids = new Set(falhas.map((r) => r.pilar));
    expect(d.detalhesPilares!.some((x) => ids.has(x.pilar))).toBe(false);
    expect(d.resumoAcoPilares!.reduce((s, x) => s + x.peso, 0)).toBeGreaterThanOrEqual(0);
    t.ok('opcoes.definir', { valores: { pilarInsuficienteSemDesenho: 0 } });
    const d2 = t.dim();
    expect(d2.detalhesPilares!.some((x) => ids.has(x.pilar))).toBe(true);
    // o erro de dimensionamento continua na lista de revisão
    expect(revisarEdificio(t.s.modelo, null, d).itens.some((i) => i.tipo === 'pilar' && ids.has(i.id!) && i.nivel === 'erro')).toBe(true);
  }, 60000);
});

describe('R7c: continuidade', () => {
  it('a partir do último lance: o penúltimo já não diminui; faces mantêm o número de barras', () => {
    const t = predio(4);
    t.ok('opcoes.definir', { valores: { pilarContinuidadeInicio: 0, pilarContinuidadeFaces: 1 } });
    const d = t.dim();
    for (const p of t.s.modelo.pilares) {
      const ls = lancesDoPilar(t.s.modelo, p), rs = ls.map((l) => d.pilares.find((r) => r.pilar === p.id && r.pavimentoId === l.id)!);
      for (let i = 0; i <= rs.length - 2; i++) {
        expect(rs[i].As).toBeGreaterThanOrEqual(rs[i + 1].As - 1e-12);
        expect(rs[i].arranjo!.phi).toBeGreaterThanOrEqual(rs[i + 1].arranjo!.phi);
        const a = rs[i].arranjo as { nb?: number; nh?: number }, z = rs[i + 1].arranjo as { nb?: number; nh?: number };
        if (rs[i].secao === rs[i + 1].secao) { expect(a.nb ?? 0).toBeGreaterThanOrEqual(z.nb ?? 0); expect(a.nh ?? 0).toBeGreaterThanOrEqual(z.nh ?? 0); }
      }
    }
  });
});

describe('R7c: comprimentos editados (pilar.detalhe)', () => {
  it('espera, traspasse e arranque editados; verificação do mínimo; remover volta ao calculado', () => {
    const t = predio(2);
    t.ok('opcoes.definir', { valores: { pilarUniaoLances: 0, continuidadePilares: 0 } });
    const p = t.s.modelo.pilares[0], ls = lancesDoPilar(t.s.modelo, p), ps = pavimentosOrdenados(t.s.modelo);
    const calc = t.dim().detalhesPilares!.find((x) => x.pilar === p.id)!;
    const b0 = calc.barras.find((x) => x.ganchos[0])!;
    t.ok('pilar.detalhe', { id: p.id, espera: 0.9, passagens: [{ pavimento: ls[0].id, emenda: 0.8 }] });
    const ed = t.dim().detalhesPilares!.find((x) => x.pilar === p.id)!;
    const base = b0.z0 + calc.lb[ls[0].id];
    expect(ed.barras.find((x) => x.ganchos[0])!.z0).toBeCloseTo(base - 0.9, 9);
    const topo = ps.find((x) => x.id === ls[0].id)!.cota;
    expect(ed.barras.find((x) => x.lances.includes(ls[0].id) && !x.lances.includes(ls[1].id))!.z1).toBeCloseTo(topo + 0.8, 9);
    expect(ed.avisos.filter((m) => /editado/.test(m))).toHaveLength(0);
    // abaixo do mínimo: aviso classificado como erro na revisão
    t.ok('pilar.detalhe', { id: p.id, passagens: [{ pavimento: ls[0].id, emenda: 0.1 }] });
    const d2 = t.dim(), ed2 = d2.detalhesPilares!.find((x) => x.pilar === p.id)!;
    expect(ed2.avisos.some((m) => /detalhe editado insuficiente: traspasse/.test(m))).toBe(true);
    expect(revisarEdificio(t.s.modelo, null, d2).itens.some((i) => i.codigo === 'PILAR_DET_INSUF' && i.nivel === 'erro')).toBe(true);
    // número de lances diferente: edição desconsiderada (aviso)
    t.ok('pilar.detalhe', { id: p.id, remover: true });
    expect(t.s.modelo.pilares[0].detalhe).toBeUndefined();
    t.ok('pilar.detalhe', { id: p.id, espera: 0.9 });
    t.ok('pavimento.repetir', { id: 'pav_6', vezes: 1 });
    t.ok('pilar.editar', { id: p.id, morre: t.s.modelo.pavimentos.at(-3)!.id });
    const d3 = t.dim().detalhesPilares!.find((x) => x.pilar === p.id);
    if (d3) expect(d3.avisos.some((m) => /detalhe editado desconsiderado/.test(m))).toBe(true);
  });
  it('rejeita lance inexistente, último lance e edição vazia', () => {
    const t = predio(2);
    const p = t.s.modelo.pilares[0], ls = lancesDoPilar(t.s.modelo, p);
    expect(t.s.executar('pilar.detalhe', { id: p.id, passagens: [{ pavimento: 'xx', emenda: 0.5 }] }).ok).toBe(false);
    expect(t.s.executar('pilar.detalhe', { id: p.id, passagens: [{ pavimento: ls.at(-1)!.id, emenda: 0.5 }] }).ok).toBe(false);
    expect(t.s.executar('pilar.detalhe', { id: p.id }).ok).toBe(false);
  });
});
