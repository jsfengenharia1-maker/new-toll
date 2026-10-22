// E1d: comandos de armadura das paredes (bloqueio, emendas, aberturas, espessura, muro de arrimo) com o dimensionamento.
import { describe, expect, it } from 'vitest';
import { analisarEdificio, type AnaliseEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { numeroDePanos } from './paredesDim';
import { revisarEdificio } from './revisao';
import { caixa, ok } from './paredesFixtures';
import { memorialParedes } from './memorialParedes';
import { comandoDe, valoresIniciais, aberturasDoMesmoTipo, armaduraDoForm, caixaDoCampo, faixaDoCampo, formDaArmadura, linhasAberturas, linhasEmendas, linhasLadosCurtos, linhasMuros, linhasPanos, linhasPontos, mensagensDe, resumoCartao, paramsBloquearPano, paramsEmendas } from './paredesLista';
import { campoDeslocamentoLado, campoTensaoLado, valorTensao } from './campoParede';
import { combinacoesDoEstado } from './combinacoes';

describe('paredes: comandos de armadura', () => {
  const { s } = caixa();
  const t1 = s.modelo.pavimentos.find((p) => p.nome === 'Tipo 1')!.id, terreo = s.modelo.pavimentos.find((p) => p.nome === 'Térreo')!.id;
  const w0 = s.modelo.paredes![0].id;
  // porta no lance do Tipo 1 (lançada no pavimento de baixo: Térreo), s de 5 a 6 m
  ok(s, 'parede.abertura', { parede: w0, s: 5, largura: 1, altura: 2.1, pavimento: terreo });
  ok(s, 'muro.arrimo', { nome: 'MA1', H: 3, tTopo: 0.2, tBase: 0.3, B: 2.6, ponta: 0.5, hBase: 0.4, solo: { gama: 18, phi: 30, metodo: 'rankine' }, sobrecarga: 10, atrito: 0.6 });
  let an: AnaliseEdificio;

  it('a abertura divide o lado em dois panos no lance e o cálculo traz a verga e os montantes', () => {
    expect(numeroDePanos(s.modelo, w0, 0, t1)).toBe(2);
    expect(numeroDePanos(s.modelo, w0, 0, terreo)).toBe(1);
    an = analisarEdificio(s.modelo);
    const d = dimensionarEdificio(s.modelo, an), w = d.armaduraParedes!.find((x) => x.id === w0)!;
    expect(w.panos.filter((p) => p.pavimento === t1).length).toBe(2);
    expect(w.aberturas.length).toBe(1);
    const ab = w.aberturas[0];
    expect(ab.origem).toBe('calculada');
    expect(ab.necessaria.montante).toBeCloseTo(Math.max(...w.panos.filter((p) => p.pavimento === t1).map((p) => p.asVert)) * 1, 6);
    expect(ab.armadura.verga.n).toBeGreaterThanOrEqual(2);
    const det = d.detalhesParedes!.find((x) => x.id === w0)!;
    for (const tipo of ['verga', 'estriboVerga', 'montante', 'canto'] as const) expect(det.barras.some((b) => b.tipo === tipo), tipo).toBe(true);
    // muro de arrimo isolado dimensionado junto
    expect(d.muros![0].nome).toBe('MA1');
    expect(d.muros![0].status).toBe('ok');
  }, 180000);

  it('malha bloqueada insuficiente reprova (erro PAREDE_CUMPRIMENTO) e desbloquear volta ao cálculo', () => {
    ok(s, 'parede.armadura', { id: w0, lado: 0, pavimento: terreo, vert: { phi: 6.3, s: 0.4 }, hor: { phi: 6.3, s: 0.4 } });
    let d = dimensionarEdificio(s.modelo, an), w = d.armaduraParedes!.find((x) => x.id === w0)!;
    const p = w.panos.find((x) => x.pavimento === terreo)!;
    expect(p.bloqueada).toBe(true);
    expect(p.status).toBe('fail');
    const rev = revisarEdificio(s.modelo, an, d);
    expect(rev.itens.some((i) => i.codigo === 'PAREDE_CUMPRIMENTO' && i.nivel === 'erro' && i.sugestao)).toBe(true);
    ok(s, 'armadura.desbloquear', { ids: [w0] });
    d = dimensionarEdificio(s.modelo, an); w = d.armaduraParedes!.find((x) => x.id === w0)!;
    expect(w.panos.find((x) => x.pavimento === terreo)!.bloqueada).toBe(false);
    expect(w.panos.find((x) => x.pavimento === terreo)!.mensagens.some((m) => /bloqueada/.test(m))).toBe(false);
  }, 120000);

  it('bloqueio com número de panos diferente é desconsiderado com aviso', () => {
    ok(s, 'parede.armadura', { id: w0, lado: 0, pavimento: t1, pano: 0, vert: { phi: 12.5, s: 0.1 }, hor: { phi: 8, s: 0.15 } });
    // move a porta: o lado passa a ter outro número de panos? (continua 2 panos) — força a divergência editando o campo gravado
    const b = structuredClone(s.modelo) as typeof s.modelo;
    b.paredes!.find((x) => x.id === w0)!.armaduras![0].panos = 3;
    const w = dimensionarEdificio(b, an).armaduraParedes!.find((x) => x.id === w0)!;
    const p = w.panos.find((x) => x.pavimento === t1 && x.pano === 0)!;
    expect(p.bloqueada).toBe(false);
    expect(p.mensagens.some((m) => /desconsiderada/.test(m))).toBe(true);
    ok(s, 'armadura.desbloquear', { tipo: 'parede' });
    expect(s.modelo.paredes!.every((x) => !x.armaduras)).toBe(true);
  }, 120000);

  it('comprimentos de emenda editados: mínimo e aviso quando abaixo', () => {
    const d0 = dimensionarEdificio(s.modelo, an);
    const e0 = d0.detalhesParedes!.find((x) => x.id === w0)!.emendas;
    expect(e0.length).toBeGreaterThan(0);
    const calc = e0.find((e) => e.pavimento === terreo)!;
    expect(calc.comprimento).toBeGreaterThanOrEqual(calc.minimo - 1e-9);
    // tracionada: α0t·lb (100 % emendadas → α0t = 2,0); comprimida: lb
    if (calc.tipo === 'tracao') expect(calc.comprimento).toBeGreaterThanOrEqual(2 * calc.lb - 1e-9);
    ok(s, 'parede.armadura', { id: w0, emendas: [{ pavimento: terreo, tracao: 0.2, compressao: 0.2 }] });
    const d = dimensionarEdificio(s.modelo, an), e = d.detalhesParedes!.find((x) => x.id === w0)!;
    expect(e.emendas.find((x) => x.pavimento === terreo)!.editada).toBe(true);
    expect(e.avisos.some((m) => /abaixo do mínimo/.test(m))).toBe(true);
    ok(s, 'parede.armadura', { id: w0, limparEmendas: true });
    expect(s.modelo.paredes![0].emendas).toBeUndefined();
  }, 120000);

  it('armadura da abertura: padrão por tipo insuficiente reprova; copiar e limpar', () => {
    const peq = { verga: { n: 2, phi: 6.3 }, estribo: { phi: 5, s: 0.3 }, montante: { n: 2, phi: 6.3 } };
    ok(s, 'abertura.armadura', { acao: 'padrao', tipo: 'porta', armadura: peq });
    let d = dimensionarEdificio(s.modelo, an), a = d.armaduraParedes!.find((x) => x.id === w0)!.aberturas[0];
    expect(a.origem).toBe('padrao');
    expect(a.status).toBe('fail');
    const ab = s.modelo.paredes![0].aberturas![0].id;
    ok(s, 'abertura.armadura', { acao: 'editar', abertura: ab, armadura: { verga: { n: 4, phi: 16 }, estribo: { phi: 8, s: 0.1 }, montante: { n: 6, phi: 16 }, canto: { n: 2, phi: 10 } } });
    d = dimensionarEdificio(s.modelo, an); a = d.armaduraParedes!.find((x) => x.id === w0)!.aberturas[0];
    expect(a.origem).toBe('bloqueada');
    expect(a.status).toBe('ok');
    ok(s, 'abertura.armadura', { acao: 'limpar', abertura: ab });
    ok(s, 'abertura.armadura', { acao: 'limpar', tipo: 'porta' });
    expect(s.modelo.aberturasPadrao).toBeUndefined();
    d = dimensionarEdificio(s.modelo, an);
    expect(d.armaduraParedes!.find((x) => x.id === w0)!.aberturas[0].origem).toBe('calculada');
  }, 120000);

  it('redimensionar muda a espessura mantendo a proporção; lado curto não aceita malha', () => {
    ok(s, 'parede.redimensionar', { id: w0, pavimento: t1, espessura: 0.3 });
    const w = s.modelo.paredes![0], e = w.porPavimento!.find((x) => x.pavimento === t1)!;
    expect(e.esq + e.dir).toBeCloseTo(0.3, 9);
    expect(e.esq).toBeCloseTo(0.15, 9);
    const r = s.executar('parede.armadura', { id: w0, lado: 7, pavimento: t1, vert: { phi: 8, s: 0.2 }, hor: { phi: 8, s: 0.2 } });
    expect(r.ok).toBe(false);
  });

  it('memorial: tabelas com o mesmo número de colunas em todas as linhas e os dados do cálculo', () => {
    const d = dimensionarEdificio(s.modelo, an), ts = memorialParedes(s.modelo, d);
    const id = (x: string) => ts.find((t) => t.id === x)!;
    for (const t of ts) for (const l of t.linhas) expect(l.length, t.id).toBe(t.colunas.length);
    expect(id('panos').linhas.length).toBe(d.armaduraParedes!.reduce((t, w) => t + w.panos.length, 0));
    expect(id('aberturas').linhas.length).toBe(1);
    expect(id('emendas').linhas.length).toBeGreaterThan(0);
    expect(id('muros').linhas[0][0]).toBe('MA1');
    expect(id('muros-armadura').linhas.length).toBe(3);
    expect(id('opcoes').linhas.some((l) => /fator de cumprimento/.test(l[0]) && l[1].startsWith('90'))).toBe(true);
    expect(id('quantitativo').linhas.length).toBe(d.detalhesParedes!.length);
  }, 120000);

  it('campos de tensões e de deslocamentos do lado (isovalores)', () => {
    const b = s.modelo, lado = `${w0}:0`, caso = b.casos!.find((c) => c.nome === 'Empuxo')!.id;
    const elu = combinacoesDoEstado(b, an, 'concreto').filter((c) => c.tipo === 'ELU');
    const info = an.paredes!.info.filter((e) => e.ladoId === lado);
    const campo = campoTensaoLado(b, an, lado, elu[0], 'sigmaY')!;
    expect(campo.tris.length).toBe(info.length);
    expect(campo.min).toBeLessThanOrEqual(campo.max);
    expect(campo.unidade).toBe('MPa');
    for (const t of campo.tris) for (const v of t.v) { expect(v[0]).toBeGreaterThanOrEqual(-1e-6); expect(v[0]).toBeLessThanOrEqual(12 + 1e-6); expect(v[1]).toBeGreaterThanOrEqual(-1 - 1e-6); expect(v[1]).toBeLessThanOrEqual(3 + 1e-6); }
    // tensão de flexão pura: σ = ±6M/t²
    expect(valorTensao({ nx: 0, ny: 0, nxy: 0, mx: 0, my: 10, mxy: 0, qx: 0, qy: 0 }, 0.2, 'sigmaY', -1)).toBeCloseTo((6 * 10) / 0.04 / 1000, 9);
    expect(valorTensao({ nx: 0, ny: -200, nxy: 0, mx: 0, my: 0, mxy: 0, qx: 0, qy: 0 }, 0.2, 'sigmaY')).toBeCloseTo(-1, 9);
    // deslocamento normal sob o empuxo: do lado do terreno para dentro, no máximo de poucos mm, e o campo bate com os nós
    const d = campoDeslocamentoLado(b, an, lado, caso, 'normal')!;
    expect(d.tris.length).toBe(info.length);
    expect(Math.max(Math.abs(d.min), Math.abs(d.max))).toBeGreaterThan(0.05);
    expect(Math.max(Math.abs(d.min), Math.abs(d.max))).toBeLessThan(17);
    const m = an.portico.modelo, g0 = info[0], c0 = m.cascas![g0.k], u = an.portico.res!.desloc[an.casos.indexOf(caso as never)];
    const n = (i: number) => { const nó = c0.nos[i]; return u[nó * 6 + 1]; };
    expect(d.tris[0].valor).toBeCloseTo((1000 * (n(0) + n(1) + n(2))) / 3 * Math.sign(1), 9);
    expect(campoDeslocamentoLado(b, an, `${w0}:9`, caso, 'normal')).toBeNull();
  }, 120000);

  it('listas e parâmetros da interface (paredesLista)', () => {
    const b = s.modelo, d = dimensionarEdificio(b, an), r = d.armaduraParedes!.find((x) => x.id === w0)!, det = d.detalhesParedes!.find((x) => x.id === w0);
    const ls = linhasPanos(r);
    expect(ls.length).toBe(r.panos.length);
    expect(new Set(ls.map((l) => l.chave)).size).toBe(ls.length);
    expect(ls[0]).toMatchObject({ trecho: 'M1.1', origem: 'calculada', status: 'ok' });
    expect(ls[0].cumprimento).toMatch(/exigido 90 %/);
    // bloquear pelo parâmetro da lista: cm → m, e o recálculo marca bloqueada com o fator recalculado
    const p = paramsBloquearPano(w0, ls[0], { phi: 12.5, sCm: 10 }, { phi: 8, sCm: 15 });
    expect(p).toMatchObject({ id: w0, lado: ls[0].lado, pavimento: ls[0].pavimento, pano: ls[0].pano, vert: { phi: 12.5, s: 0.1 }, hor: { phi: 8, s: 0.15 } });
    ok(s, 'parede.armadura', p);
    const r2 = dimensionarEdificio(s.modelo, an).armaduraParedes!.find((x) => x.id === w0)!;
    expect(linhasPanos(r2)[0]).toMatchObject({ origem: 'bloqueada', vertical: 'φ12,5 c/10,0', horizontal: 'φ8,0 c/15,0' });
    ok(s, 'armadura.desbloquear', { ids: [w0] });
    expect(comandoDe('parede')).toBe('parede.armadura');
    expect(comandoDe('pilarParede')).toBe('pilarParede.armadura');
    expect(valoresIniciais({ vert: { phi: 12.5, s: 0.15 }, hor: { phi: 6.3, s: 0.2 } })).toEqual({ vPhi: 12.5, vS: 15, hPhi: 6.3, hS: 20 });
    expect(valoresIniciais(undefined)).toEqual({ vPhi: 8, vS: 15, hPhi: 8, hS: 15 });
    expect(valoresIniciais({ vert: null, hor: { phi: 8, s: 0.2 } })).toEqual({ vPhi: 8, vS: 15, hPhi: 8, hS: 20 });
    expect(paramsEmendas(w0, terreo, 90, 55)).toEqual({ id: w0, emendas: [{ pavimento: terreo, tracao: 0.9, compressao: 0.55 }] });
    expect(paramsEmendas(w0, terreo)).toEqual({ id: w0, emendas: [{ pavimento: terreo }] });
    const em = linhasEmendas(det);
    expect(em.length).toBeGreaterThan(0);
    expect(em[0]).toMatchObject({ origem: 'calculada' });
    expect(linhasPontos(r).every((x) => x.trecho && x.descricao)).toBe(true);
    expect(mensagensDe(r, det).every((m) => m.texto.length > 0)).toBe(true);
    expect(linhasLadosCurtos(r)).toEqual([]);
    expect(resumoCartao(r)).toMatchObject({ situacao: 'atende', status: 'ok', panos: r.panos.length });
    expect(resumoCartao(r).armadura).toMatch(/^V φ\d.* · H φ\d/);
    expect(resumoCartao(r).cumprimentoMin).toMatch(/^\d+,\d %$/);
    // aberturas
    const la = linhasAberturas(d.armaduraParedes!);
    expect(la.length).toBe(1);
    expect(la[0]).toMatchObject({ tipo: 'porta', parede: 'M1', origem: 'calculada' });
    const f = formDaArmadura(la[0].armadura);
    expect(armaduraDoForm(f, 'porta')).toEqual({ ...la[0].armadura, ...(la[0].armadura.peitoril ? { peitoril: undefined } : {}) } as never);
    expect(armaduraDoForm({ ...f, peitorilN: 2, peitorilPhi: 8 }, 'janela').peitoril).toEqual({ n: 2, phi: 8 });
    expect(armaduraDoForm({ ...f, cantoN: 0 }, 'porta').canto).toBeUndefined();
    expect(aberturasDoMesmoTipo(b, b.paredes![0].aberturas![0].id)).toEqual([]);
    // muros
    const lm = linhasMuros(b, d.muros);
    expect(lm).toHaveLength(1);
    expect(lm[0]).toMatchObject({ nome: 'MA1', situacao: 'atende', status: 'ok' });
    expect(lm[0].geometria).toBe('H 3,00 m · base 2,60 × 0,40 m · fuste 20–30 cm');
    expect(linhasMuros(b, undefined)[0].situacao).toBe('calcule');
    // isofaixas
    expect(faixaDoCampo(0, 0, 10)).toBe(0);
    expect(faixaDoCampo(10, 0, 10)).toBe(10);
    expect(faixaDoCampo(5, 0, 10)).toBe(5);
    expect(faixaDoCampo(3, 3, 3)).toBe(5);
    const campo = campoDeslocamentoLado(b, an, `${w0}:0`, b.casos!.find((c) => c.nome === 'Empuxo')!.id, 'normal')!;
    const cx = caixaDoCampo(campo);
    expect(cx.s0).toBeCloseTo(0, 6);
    expect(cx.s1).toBeCloseTo(12, 6);
    expect(cx.z1 - cx.z0).toBeCloseTo(4, 6);
  }, 120000);
});
