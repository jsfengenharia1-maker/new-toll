// R7e: uniformização por zonas, linhas de dobra, edição bloqueada das posições, geração sem cálculo e armadura média.
// Com as opções novas desligadas e sem zonas, linhas nem edição, o detalhamento é o do baseline (`detalhamentoLajes.base.json`).
import { describe, expect, it } from 'vitest';
import base from './detalhamentoLajes.base.json';
import { afetaCalculo, comandosEdificioPadrao, Sessao } from '../commands';
import { barArea } from '../concrete';
import { analisarEdificio } from './analitico';
import type { DetalheLaje, PosicaoLaje } from './detalhamentoLajes';
import { dimensionarEdificio } from './dimensionamento';
import { assinaturaPos, convexosSeCruzam, cruzamentosDaBarra, igualarPosicoes, poligonoZona, siglaReforco } from './lajesEdicao';
import { OPCOES_INFO, opcoesEmUso, padraoDe } from './opcoes';
import { classificar, revisarEdificio } from './revisao';
import { montarPranchasLajes } from '../sheets/armacaoLajes';
import { edificioExemplo } from '../sheets/exemplo';

function lajes(vaos: number[], opts: Record<string, number> = {}, y = 5) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok = (n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
  ok('vento.definir', { ativo: false });
  const xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]);
  ok('lote', { comandos: xs.flatMap((x) => [0, y].map((yy) => ({ nome: 'pilar.inserir', params: { x, y: yy, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  const L = xs.at(-1)!;
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, y], [L, y]], ...xs.map((x) => [[x, 0], [x, y]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo: { tipo: 'macica', h: 0.12 } });
  if (Object.keys(opts).length) ok('opcoes.definir', { valores: opts });
  const dim = () => dimensionarEdificio(s.modelo, analisarEdificio(s.modelo));
  const gp = s.modelo.grupos.find((g) => g.id === 'g_3') ? 'g_3' : s.modelo.lajes[0].grupo;
  return { s, ok, dim, grupo: gp };
}
const r6 = (x: unknown): unknown => typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : Array.isArray(x) ? x.map(r6) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, r6(v)])) : x;
const digest = (d: ReturnType<typeof dimensionarEdificio>) => JSON.parse(JSON.stringify(r6({ det: d.detalhesLajes, res: d.resumoAcoLajes, msg: d.lajes.map((l) => l.mensagens) })));
const NOVAS = ['lajeEmendaConstrutiva', 'lajeUniformizarPilares', 'lajeUniformizarPilaresLargura', 'lajeArmaduraMedia', 'lajeSiglaReforco', 'lajeNumeracao'];
const det = (d: ReturnType<typeof dimensionarEdificio>, id: string) => d.detalhesLajes!.find((x) => x.laje === id)!;
const pos = (d: DetalheLaje, f: (x: PosicaoLaje) => boolean) => d.posicoes.filter(f);
const Asm = (x: PosicaoLaje) => (barArea(x.phi) / x.s) * 1e4;

describe('R7e: sem zonas, linhas, edição nem geração o detalhamento é o anterior', () => {
  it('opções novas: padrões do sistema e da NBR iguais; sem efeito no detalhamento', () => {
    const nbr = opcoesEmUso(undefined, 'nbr') as never as Record<string, number>, sis = opcoesEmUso(undefined, 'sistema') as never as Record<string, number>;
    for (const k of NOVAS) expect(nbr[k]).toBe(sis[k]);
    expect(OPCOES_INFO.filter((o) => NOVAS.includes(o.chave)).map((o) => padraoDe(o))).toEqual([30, 0, 100, 0, 1, 0]);
  });
  it('dois e três vãos, furo, perfil NBR e edifício de exemplo: digest idêntico ao baseline', () => {
    expect(digest(lajes([4, 4]).dim())).toEqual(base.v2);
    expect(digest(lajes([3, 6, 4]).dim())).toEqual(base.v3);
    const t = lajes([5]);
    t.ok('laje.abertura', { id: t.s.modelo.lajes[0].id, contorno: [[1, 1.5], [2, 1.5], [2, 2.5], [1, 2.5]] });
    expect(digest(t.dim())).toEqual(base.furo);
    const n = lajes([4, 4]);
    n.ok('opcoes.definir', { perfil: 'nbr' });
    expect(digest(n.dim())).toEqual(base.nbr);
    const ex = edificioExemplo();
    expect(digest(dimensionarEdificio(ex.modelo, analisarEdificio(ex.modelo)))).toEqual(base.ex);
  }, 120000);
});

describe('R7e: geometria das zonas', () => {
  it('retângulo, linha com largura e interseção de polígonos convexos', () => {
    expect(poligonoZona({ forma: 'retangulo', pontos: [[3, 2], [1, 0]] })).toEqual([[1, 0], [3, 0], [3, 2], [1, 2]]);
    const faixa = poligonoZona({ forma: 'linha', pontos: [[0, 0], [4, 0]], largura: 1 });
    expect(faixa).toEqual([[0, 0.5], [4, 0.5], [4, -0.5], [0, -0.5]].map((p) => [p[0], p[1] === 0.5 ? 0.5 : -0.5]));
    expect(convexosSeCruzam(faixa, [[1, 0.4], [2, 0.4]])).toBe(true);
    expect(convexosSeCruzam(faixa, [[1, 0.6], [2, 0.6]])).toBe(false);
    expect(convexosSeCruzam(faixa, [[1, -2], [1, 2]])).toBe(true); // segmento que atravessa
  });
  it('cruzamentos da barra com as linhas de dobra', () => {
    const x = { a: [0, 1] as [number, number], z: [8, 1] as [number, number] };
    expect(cruzamentosDaBarra(x, [{ id: 'l1', a: [3, 0], z: [3, 5] }, { id: 'l2', a: [9, 0], z: [9, 5] }, { id: 'l3', a: [0, 3], z: [8, 3] }])).toEqual([{ linha: 'l1', em: 3 }]);
  });
  it('siglas de reforço: RI nas inferiores calculadas, RS nas superiores; sem sigla na base, distribuição e predefinida', () => {
    expect(siglaReforco({ face: 'inf', tipo: 'positiva' })).toBe('RI');
    expect(siglaReforco({ face: 'inf', tipo: 'reforco' })).toBe('RI');
    expect(siglaReforco({ face: 'sup', tipo: 'negativa' })).toBe('RS');
    expect(siglaReforco({ face: 'sup', tipo: 'negativa-borda' })).toBe('RS');
    for (const t of ['base', 'distribuicao', 'predefinida', 'canto', 'furo', 'borda-livre'] as const) expect(siglaReforco({ face: 'sup', tipo: t })).toBe('');
  });
});

describe('R7e: uniformização por zonas', () => {
  it('a zona iguala taxa e comprimento ao máximo das barras que passam por ela', () => {
    const t = lajes([3, 6, 4]);
    const d0 = t.dim(), antes = d0.detalhesLajes!;
    const alvo = (x: PosicaoLaje) => x.face === 'inf' && (x.tipo === 'positiva' || x.tipo === 'reforco') && (x.angulo % 180 < 1 || x.angulo % 180 > 179);
    const todas0 = antes.flatMap((d) => pos(d, alvo));
    expect(new Set(todas0.map((x) => `${x.phi}|${x.s}`)).size).toBeGreaterThan(1); // taxas diferentes sem a zona
    t.ok('laje.uniformizacao', { acao: 'criar', grupo: t.grupo, forma: 'retangulo', pontos: [[-1, -1], [14, 6]], face: 'inf', angulo: 0 });
    const d1 = t.dim().detalhesLajes!, todas1 = d1.flatMap((d) => pos(d, alvo));
    const mx = Math.max(...todas0.map(Asm)), cmax = Math.max(...todas0.map((x) => x.comprimento));
    for (const x of todas1) {
      expect(Asm(x)).toBeCloseTo(mx, 6);
      expect(x.comprimento).toBeCloseTo(cmax, 6);
    }
    expect(todas1.some((x) => x.uniforme)).toBe(true);
    // número de barras acompanha o espaçamento: a faixa coberta não diminui
    for (const d of d1) for (const x of pos(d, alvo)) { const p0 = antes.find((a) => a.laje === d.laje)!.posicoes.find((y) => y.pos === x.pos)!; expect(x.n * x.s + 1e-9).toBeGreaterThanOrEqual(p0.n * p0.s - 1e-9); }
    // o peso do detalhamento é refeito e o aço total não diminui
    expect(d1.reduce((s, d) => s + d.peso, 0)).toBeGreaterThan(antes.reduce((s, d) => s + d.peso, 0) - 1e-9);
    // a direção diferente da zona não muda
    const outras0 = antes.flatMap((d) => pos(d, (x) => x.face === 'inf' && !alvo(x))), outras1 = d1.flatMap((d) => pos(d, (x) => x.face === 'inf' && !alvo(x)));
    expect(outras1.map((x) => [x.phi, x.s, x.comprimento])).toEqual(outras0.map((x) => [x.phi, x.s, x.comprimento]));
  }, 60000);

  it('pavimento inteiro: duas zonas (0° e 90°) sobre as lajes uniformizam cada direção', () => {
    const t = lajes([3, 6, 4]);
    const antes = t.dim().detalhesLajes!;
    t.ok('lote', { comandos: [0, 90].map((angulo) => ({ nome: 'laje.uniformizacao', params: { acao: 'criar', grupo: t.grupo, forma: 'retangulo', pontos: [[-0.1, -0.1], [13.1, 5.1]], face: 'inf', angulo } })) });
    expect(t.s.modelo.zonasLaje).toHaveLength(2);
    const d = t.dim().detalhesLajes!;
    for (const ang of [0, 90]) {
      const cls = (x: PosicaoLaje) => x.face === 'inf' && (x.tipo === 'positiva' || x.tipo === 'reforco') && Math.abs(((x.angulo - ang) % 180 + 180) % 180) < 1;
      const a = antes.flatMap((x) => pos(x, cls)), n = d.flatMap((x) => pos(x, cls));
      expect(n.length).toBeGreaterThan(0);
      for (const x of n) { expect(Asm(x)).toBeCloseTo(Math.max(...a.map(Asm)), 6); expect(x.comprimento).toBeCloseTo(Math.max(...a.map((y) => y.comprimento)), 6); }
    }
    t.s.desfazer();
    expect(t.s.modelo.zonasLaje).toBeUndefined();
  }, 60000);

  it('zona fora das barras não muda nada e gera aviso quando atinge menos de duas', () => {
    const t = lajes([3, 6, 4]);
    const antes = digest(t.dim());
    t.ok('laje.uniformizacao', { acao: 'criar', grupo: t.grupo, forma: 'linha', pontos: [[50, 50], [60, 50]], face: 'sup' });
    const d = t.dim();
    expect(digest(d).det.map((x: DetalheLaje) => x.posicoes)).toEqual(antes.det.map((x: DetalheLaje) => x.posicoes));
    const rev = revisarEdificio(t.s.modelo, null, d);
    expect(rev.itens.some((i) => i.codigo === 'LAJE_ZONA_VAZIA' && i.nivel === 'aviso')).toBe(true);
    // editar e remover
    const z = t.s.modelo.zonasLaje![0];
    t.ok('laje.uniformizacao', { acao: 'editar', zona: z.id, pontos: [[0, 0], [10, 0]], largura: 2 });
    expect(t.s.modelo.zonasLaje![0]).toMatchObject({ forma: 'linha', largura: 2, pontos: [[0, 0], [10, 0]] });
    t.ok('laje.uniformizacao', { acao: 'remover', zona: z.id });
    expect(t.s.modelo.zonasLaje).toBeUndefined();
  }, 60000);

  it('uniformização automática junto aos pilares (opção): as barras superiores da faixa ficam com o máximo', () => {
    const t = lajes([3, 6, 4], { lajeUniformizarPilares: 1, lajeUniformizarPilaresLargura: 300 });
    const d = t.dim().detalhesLajes!, sup = d.flatMap((x) => pos(x, (y) => y.face === 'sup' && (y.tipo === 'negativa' || y.tipo === 'negativa-borda')));
    const uni = sup.filter((x) => x.uniforme);
    expect(uni.length).toBeGreaterThan(1);
    expect(uni.every((x) => x.uniforme!.startsWith('auto_'))).toBe(true);
    expect(d.some((x) => x.edicao && x.edicao.uniformizadas >= 0)).toBe(true);
  }, 60000);
});

describe('R7e: linhas de dobra', () => {
  it('a emenda da inferior passa a ser centrada na linha de dobra que cruza a barra', () => {
    const t = lajes([8], { barraMaxima: 6 });
    const d0 = det(t.dim(), t.s.modelo.lajes[0].id);
    const dx = (d: DetalheLaje) => pos(d, (x) => x.tipo === 'positiva' && x.face === 'inf' && Math.abs(Math.cos((x.angulo * Math.PI) / 180)) > 0.99 && x.n > 0).sort((a, z) => a.a[0] - z.a[0]);
    const p0 = dx(d0);
    expect(p0.length).toBeGreaterThanOrEqual(2); // 8,2 m > 6 m: emenda por traspasse
    t.ok('laje.linhaDobra', { acao: 'criar', grupo: t.grupo, a: [3.6, 0], z: [3.6, 5] });
    const d1 = det(t.dim(), t.s.modelo.lajes[0].id), p1 = dx(d1);
    expect(d1.edicao?.emendasDobra).toBeGreaterThanOrEqual(1);
    // o centro do traspasse das duas peças fica na linha x = 3,6
    const em = (ps: PosicaoLaje[]) => { const a = ps.find((x) => x.a[0] < 0.5)!, b = ps.find((x) => x.z[0] > 7.5)!; return (a.z[0] + b.a[0]) / 2; };
    expect(em(p1)).toBeCloseTo(3.6, 2);
    expect(Math.abs(em(p0) - 3.6)).toBeGreaterThan(0.05);
    // as peças não passam da barra máxima
    for (const x of p1) expect(x.comprimento).toBeLessThanOrEqual(6 + 1e-9);
  }, 60000);

  it('o mínimo em % do vão dos negativos usa o vão até a linha de dobra seguinte', () => {
    const t = lajes([4, 4], { lajeNegativoVao: 50 });
    const neg = (d: ReturnType<typeof dimensionarEdificio>) => d.detalhesLajes!.flatMap((x) => pos(x, (y) => y.tipo === 'negativa'))[0];
    const n0 = neg(t.dim());
    expect(n0).toBeTruthy();
    t.ok('laje.linhaDobra', { acao: 'criar', grupo: t.grupo, a: [2, 0], z: [2, 5] }); // 2 m da borda em x = 4, na laje da esquerda
    const n1 = neg(t.dim());
    expect(n1.lados![0]).toBeLessThan(n0.lados![0] - 0.1);
    expect(n1.lados![1]).toBeCloseTo(n0.lados![1], 6); // a outra laje não tem linha
    t.ok('laje.linhaDobra', { acao: 'remover', linha: t.s.modelo.linhasDobra![0].id });
    expect(t.s.modelo.linhasDobra).toBeUndefined();
    expect(neg(t.dim()).lados).toEqual(n0.lados);
  }, 60000);
});

describe('R7e: edição bloqueada das posições', () => {
  it('editar φ e espaçamento: n acompanha; suficiente passa, insuficiente reprova (ARM_BLOQ); desbloquear volta', () => {
    const t = lajes([4, 4]), L1 = t.s.modelo.lajes[0];
    const d0 = det(t.dim(), L1.id), p = d0.posicoes.find((x) => x.tipo === 'positiva' && x.face === 'inf')!;
    const edit = { pos: p.pos, face: p.face, tipo: p.tipo, dir: p.dir };
    // mais armadura: φ12,5 c/10
    t.ok('laje.barras', { id: L1.id, acao: 'editar', barras: [{ ...edit, phi: 12.5, s: 0.1 }] });
    let d = det(t.dim(), L1.id), q = d.posicoes.find((x) => x.pos === p.pos)!;
    expect(q).toMatchObject({ phi: 12.5, s: 0.1, editada: true });
    expect(q.n).toBeGreaterThanOrEqual(Math.ceil((p.n * p.s) / 0.1 - 1e-9));
    expect(d.edicao?.editadas).toBe(1);
    expect(revisarEdificio(t.s.modelo, null, t.dim()).itens.some((i) => i.codigo === 'ARM_BLOQ' && i.id === L1.id)).toBe(false);
    // armadura insuficiente: φ5 c/33
    t.ok('laje.barras', { id: L1.id, acao: 'editar', barras: [{ ...edit, phi: 5, s: 0.33 }] });
    const dim = t.dim();
    d = det(dim, L1.id);
    expect(d.avisos.some((m) => classificar(m).codigo === 'ARM_BLOQ')).toBe(true);
    expect(revisarEdificio(t.s.modelo, null, dim).itens.some((i) => i.codigo === 'ARM_BLOQ' && i.nivel === 'erro' && i.id === L1.id)).toBe(true);
    // desbloquear volta ao calculado
    t.ok('armadura.desbloquear', { ids: [L1.id] });
    expect(t.s.modelo.lajes[0].edicao).toBeUndefined();
    expect(digest(t.dim())).toEqual(base.v2);
  }, 60000);

  it('comprimento: menor que o calculado reprova; maior estende simetricamente; ganchos acertam o comprimento', () => {
    const t = lajes([4, 4]), L1 = t.s.modelo.lajes[0];
    const d0 = det(t.dim(), L1.id), p = d0.posicoes.find((x) => x.tipo === 'positiva' && x.face === 'inf')!;
    const edit = { pos: p.pos, face: p.face, tipo: p.tipo, dir: p.dir };
    t.ok('laje.barras', { id: L1.id, acao: 'editar', barras: [{ ...edit, comprimento: p.comprimento + 0.4 }] });
    let q = det(t.dim(), L1.id).posicoes.find((x) => x.pos === p.pos)!;
    expect(q.comprimento).toBeCloseTo(p.comprimento + 0.4, 6);
    const reto0 = Math.hypot(p.z[0] - p.a[0], p.z[1] - p.a[1]), reto1 = Math.hypot(q.z[0] - q.a[0], q.z[1] - q.a[1]);
    expect(reto1 - reto0).toBeCloseTo(0.4, 3);
    expect(((p.a[0] + p.z[0]) / 2 - (q.a[0] + q.z[0]) / 2)).toBeCloseTo(0, 3); // centro preservado
    expect(det(t.dim(), L1.id).avisos.some((m) => classificar(m).codigo === 'ARM_BLOQ')).toBe(false);
    t.ok('laje.barras', { id: L1.id, acao: 'editar', barras: [{ ...edit, comprimento: p.comprimento - 0.5 }] });
    expect(det(t.dim(), L1.id).avisos.some((m) => classificar(m).codigo === 'ARM_BLOQ' && /comprimento/.test(m))).toBe(true);
    // gancho na ponta: o comprimento total acompanha
    t.ok('laje.barras', { id: L1.id, acao: 'reverter', barras: [edit] });
    t.ok('laje.barras', { id: L1.id, acao: 'editar', barras: [{ ...edit, ganchos: [0, 0.10] }] });
    q = det(t.dim(), L1.id).posicoes.find((x) => x.pos === p.pos)!;
    expect(q.ganchos).toEqual([0, 0.1]);
    expect(q.comprimento).toBeCloseTo(p.comprimento + 0.1 - (p.ganchos[0] + p.ganchos[1]), 6);
  }, 60000);

  it('posição que mudou (assinatura) é desconsiderada com aviso BLOQ_IGNORADO', () => {
    const t = lajes([4, 4]), L1 = t.s.modelo.lajes[0];
    const p = det(t.dim(), L1.id).posicoes.find((x) => x.tipo === 'positiva')!;
    t.ok('laje.barras', { id: L1.id, acao: 'editar', barras: [{ pos: p.pos, face: 'sup', tipo: 'negativa', dir: 1, phi: 8 }] }); // assinatura errada
    const dim = t.dim();
    expect(revisarEdificio(t.s.modelo, null, dim).itens.some((i) => i.codigo === 'BLOQ_IGNORADO' && i.id === L1.id)).toBe(true);
    expect(det(dim, L1.id).posicoes.find((x) => x.pos === p.pos)!.phi).toBe(p.phi);
    expect(det(dim, L1.id).edicao).toBeUndefined();
  }, 60000);

  it('conjunto da tabela: aceita φ e s da tabela da laje e recusa fora dela', () => {
    const t = lajes([4, 4]), L1 = t.s.modelo.lajes[0];
    const p = det(t.dim(), L1.id).posicoes.find((x) => x.tipo === 'positiva')!;
    const barras = [{ pos: p.pos, face: p.face, tipo: p.tipo, dir: p.dir }];
    expect(t.s.executar('laje.barras', { id: L1.id, acao: 'conjunto', barras, conjunto: { phi: 16, s: 0.1 } }).ok).toBe(true);
    t.ok('tabela.definir', { tipo: 'lajes', tabela: { id: 'padrao', nome: 'Padrão', linhas: [{ hAte: 99, bitolas: [8], sMin: 10, sMax: 20 }] } });
    const r = t.s.executar('laje.barras', { id: L1.id, acao: 'conjunto', barras, conjunto: { phi: 16, s: 0.1 } });
    expect(r.ok).toBe(false);
    expect(r.erros[0].codigo).toBe('FORA_TABELA_LAJE');
    expect(t.s.executar('laje.barras', { id: L1.id, acao: 'conjunto', barras, conjunto: { phi: 8, s: 0.15 } }).ok).toBe(true);
  }, 60000);

  it('agrupar iguala e liga as posições; editar uma altera todas; desagrupar solta', () => {
    const t = lajes([3, 6, 4]), L = t.s.modelo.lajes[1];
    const d0 = det(t.dim(), L.id), ps = d0.posicoes.filter((x) => x.face === 'inf' && x.tipo === 'positiva');
    expect(ps.length).toBeGreaterThanOrEqual(2);
    const igual = igualarPosicoes(d0, ps.map((x) => x.pos)), mx = Math.max(...ps.map(Asm));
    for (const e of igual) expect((barArea(e.phi!) / e.s!) * 1e4).toBeCloseTo(mx, 6);
    const b2 = ps.map((x) => ({ pos: x.pos, face: x.face, tipo: x.tipo, dir: x.dir }));
    t.ok('laje.barras', { id: L.id, acao: 'agrupar', barras: b2, valores: { phi: igual[0]?.phi ?? ps[0].phi, s: igual[0]?.s ?? ps[0].s, comprimento: Math.max(...ps.map((x) => x.comprimento)) } });
    let d = det(t.dim(), L.id);
    expect(pos(d, (x) => x.grupo === 1).length).toBe(ps.length);
    expect(new Set(pos(d, (x) => x.grupo === 1).map((x) => `${x.phi}|${x.s}|${x.comprimento}`)).size).toBe(1);
    // editar uma altera as demais (menos o n)
    t.ok('laje.barras', { id: L.id, acao: 'editar', barras: [{ ...b2[0], comprimento: Math.max(...ps.map((x) => x.comprimento)) + 0.3 }] });
    d = det(t.dim(), L.id);
    expect(new Set(pos(d, (x) => x.grupo === 1).map((x) => x.comprimento.toFixed(3))).size).toBe(1);
    t.ok('laje.barras', { id: L.id, acao: 'desagrupar', barras: [b2[0]] });
    expect(t.s.modelo.lajes[1].edicao?.grupos).toBeUndefined();
    d = det(t.dim(), L.id);
    expect(pos(d, (x) => x.grupo !== undefined).length).toBe(0);
  }, 60000);

  it('emenda construtiva depois do cálculo: corta a barra com o traspasse de 30 cm sem recalcular, na linha de dobra', () => {
    const t = lajes([8], { barraMaxima: 10 });
    const L = t.s.modelo.lajes[0], d0 = det(t.dim(), L.id);
    const p = pos(d0, (x) => x.tipo === 'positiva' && x.face === 'inf' && Math.abs(Math.cos((x.angulo * Math.PI) / 180)) > 0.99)[0];
    t.ok('laje.linhaDobra', { acao: 'criar', grupo: t.grupo, a: [4, 0], z: [4, 5] });
    const dobra = t.s.modelo.linhasDobra![0];
    const cr = cruzamentosDaBarra(p, [dobra])[0];
    expect(cr.em).toBeCloseTo(4 - p.a[0], 2);
    t.ok('laje.barras', { id: L.id, acao: 'emendar', barras: [{ pos: p.pos, face: p.face, tipo: p.tipo, dir: p.dir }], em: cr.em });
    const d = det(t.dim(), L.id), q = d.posicoes.find((x) => x.pos === p.pos)!, nova = d.posicoes.at(-1)!;
    expect(nova.pos).not.toBe(p.pos);
    expect(nova).toMatchObject({ phi: p.phi, s: p.s, n: p.n });
    expect(q.z[0] - nova.a[0]).toBeCloseTo(0.3, 3); // traspasse construtivo de 30 cm
    expect((q.z[0] + nova.a[0]) / 2).toBeCloseTo(4, 3);
    // a soma dos comprimentos supera o da barra inteira só pelo traspasse (e o arredondamento)
    expect(q.comprimento + nova.comprimento).toBeGreaterThanOrEqual(p.comprimento + 0.3 - 1e-9);
    expect(q.comprimento + nova.comprimento).toBeLessThanOrEqual(p.comprimento + 0.3 + 0.1 + 1e-9);
    // peso refeito
    expect(d.peso).toBeGreaterThan(d0.peso);
  }, 60000);

  it('emenda fora da barra é desconsiderada com aviso', () => {
    const t = lajes([4, 4]), L = t.s.modelo.lajes[0], p = det(t.dim(), L.id).posicoes.find((x) => x.tipo === 'positiva')!;
    t.ok('laje.barras', { id: L.id, acao: 'emendar', barras: [{ pos: p.pos, face: p.face, tipo: p.tipo, dir: p.dir }], em: 0.15 });
    expect(det(t.dim(), L.id).avisos.some((m) => classificar(m).codigo === 'BLOQ_IGNORADO' && /emenda/.test(m))).toBe(true);
  }, 60000);

  it('refazer descarta a edição mas mantém as zonas e as linhas de dobra', () => {
    const t = lajes([4, 4]), L = t.s.modelo.lajes[0], p = det(t.dim(), L.id).posicoes.find((x) => x.tipo === 'positiva')!;
    t.ok('laje.uniformizacao', { acao: 'criar', grupo: t.grupo, forma: 'retangulo', pontos: [[0, 0], [8, 5]], face: 'sup' });
    t.ok('laje.linhaDobra', { acao: 'criar', grupo: t.grupo, a: [2, 0], z: [2, 5] });
    t.ok('laje.barras', { id: L.id, acao: 'editar', barras: [{ pos: p.pos, face: p.face, tipo: p.tipo, dir: p.dir, phi: 10, s: 0.1 }] });
    expect(t.s.modelo.lajes[0].edicao).toBeDefined();
    t.ok('laje.barras', { acao: 'refazer', ids: [L.id] });
    expect(t.s.modelo.lajes[0].edicao).toBeUndefined();
    expect(t.s.modelo.zonasLaje).toHaveLength(1);
    expect(t.s.modelo.linhasDobra).toHaveLength(1);
    // desfazer e refazer pelo histórico
    t.s.desfazer();
    expect(t.s.modelo.lajes[0].edicao).toBeDefined();
  }, 60000);
});

describe('R7e: geração da armadura só com a geometria', () => {
  it('apaga edição e predefinidas, usa só mínimos e base, avisa e é refeita com os esforços', () => {
    const t = lajes([3, 6, 4]);
    const L = t.s.modelo.lajes[1], calc = t.dim(), dc = det(calc, L.id);
    t.ok('laje.armaduraPredefinida', { id: L.id, acao: 'criar', face: 'sup', a: [4, 1], angulo: 90, comprimento: 2, phi: 8, s: 0.15, n: 3 });
    const p = det(t.dim(), L.id).posicoes.find((x) => x.tipo === 'positiva')!;
    t.ok('laje.barras', { id: L.id, acao: 'editar', barras: [{ pos: p.pos, face: p.face, tipo: p.tipo, dir: p.dir, phi: 10, s: 0.1 }] });
    t.ok('lajes.gerarArmadura', {});
    const m = t.s.modelo;
    expect(m.lajes.every((l) => l.semCalculo === true && !l.edicao && !l.predefinidas)).toBe(true);
    const dim = t.dim(), d = det(dim, L.id);
    expect(d.edicao?.semCalculo).toBe(true);
    expect(d.posicoes.some((x) => x.tipo === 'predefinida')).toBe(false);
    // positivas: só a armadura mínima (ρmín · h = 1,8 cm²/m); nunca mais que a calculada
    for (const x of pos(d, (y) => y.tipo === 'positiva')) expect(Asm(x)).toBeLessThanOrEqual(Math.max(...dc.posicoes.filter((y) => y.tipo === 'positiva').map(Asm)) + 1e-9);
    expect(d.positivas.every((q) => Math.abs(q.AsNec - 1.8) < 1e-6)).toBe(true);
    expect(revisarEdificio(m, null, dim).itens.some((i) => i.codigo === 'LAJE_SEM_CALCULO' && i.nivel === 'aviso')).toBe(true);
    // editar contra os mínimos: φ6,3 c/20 (1,56 cm²/m) reprova; φ8 c/20 (2,5 cm²/m) passa
    const q = d.posicoes.find((x) => x.tipo === 'positiva')!, ed = { pos: q.pos, face: q.face, tipo: q.tipo, dir: q.dir };
    t.ok('laje.barras', { id: L.id, acao: 'editar', barras: [{ ...ed, phi: 6.3, s: 0.2 }] });
    expect(det(t.dim(), L.id).avisos.some((a) => classificar(a).codigo === 'ARM_BLOQ')).toBe(true);
    t.ok('laje.barras', { id: L.id, acao: 'editar', barras: [{ ...ed, phi: 8, s: 0.2 }] });
    expect(det(t.dim(), L.id).avisos.some((a) => classificar(a).codigo === 'ARM_BLOQ')).toBe(false);
    // refazer volta ao cálculo
    t.ok('laje.barras', { acao: 'refazer', ids: m.lajes.map((l) => l.id) });
    expect(t.s.modelo.lajes.every((l) => !l.semCalculo && !l.edicao)).toBe(true);
    expect(digest(t.dim()).det).toEqual(digest(calc).det.map((x: DetalheLaje, i: number) => (i === 1 ? { ...x, posicoes: x.posicoes.filter((y) => y.tipo !== 'predefinida') } : x)));
  }, 120000);

  it('gerar de laje inexistente ou treliçada é recusado', () => {
    const t = lajes([4]);
    expect(t.s.executar('lajes.gerarArmadura', { ids: ['nao-existe'] }).ok).toBe(false);
  });
});

describe('R7e: armadura média uniforme por direção', () => {
  it('lajes retangulares apoiadas em vigas: a média dos momentos das linhas no lugar do máximo, nunca abaixo da mínima', () => {
    const t = lajes([6]);
    const L = t.s.modelo.lajes[0], max = det(t.dim(), L.id).positivas.map((p) => p.AsNec);
    t.ok('opcoes.definir', { valores: { lajeArmaduraMedia: 1 } });
    const dm = det(t.dim(), L.id), med = dm.positivas.map((p) => p.AsNec);
    expect(med.every((v, k) => v <= max[k] + 1e-6 && v >= 1.8 - 1e-6)).toBe(true);
    expect(med.some((v, k) => v < max[k] - 1e-3)).toBe(true);
    expect(dm.edicao?.media).toBe(true);
    // a armadura adotada atende a necessária reduzida
    expect(dm.positivas.every((p) => p.As + 1e-6 >= p.AsNec)).toBe(true);
    // laje com furo não é "retangular apoiada": fica com o máximo
    const t2 = lajes([6], { lajeArmaduraMedia: 1 });
    t2.ok('laje.abertura', { id: t2.s.modelo.lajes[0].id, contorno: [[2, 1.5], [3, 1.5], [3, 2.5], [2, 2.5]] });
    expect(det(t2.dim(), t2.s.modelo.lajes[0].id).edicao).toBeUndefined();
  }, 120000);
});

describe('R7e: numeração das posições', () => {
  it('por face e tipo (opção): inferiores primeiro, numeração contínua; a edição vale na numeração em uso', () => {
    const t = lajes([4, 4], { lajeNumeracao: 1 }), L = t.s.modelo.lajes[0];
    const d = det(t.dim(), L.id), faces = d.posicoes.map((x) => x.face);
    expect(faces.indexOf('sup')).toBeGreaterThan(faces.lastIndexOf('inf'));
    expect(d.posicoes.map((x) => x.pos)).toEqual(d.posicoes.map((_, i) => `N${i + 1}`));
    expect(d.posicoes[0]).toMatchObject({ face: 'inf', tipo: 'positiva', dir: 0 });
    // o mesmo conjunto de barras do padrão, só renumerado
    const p0 = det(lajes([4, 4]).dim(), L.id);
    expect(d.posicoes.length).toBe(p0.posicoes.length);
    expect(d.peso).toBeCloseTo(p0.peso, 9);
    // a verificação da edição usa a exigência da posição renumerada
    const x = d.posicoes[0];
    t.ok('laje.barras', { id: L.id, acao: 'editar', barras: [{ pos: x.pos, face: x.face, tipo: x.tipo, dir: x.dir, phi: 5, s: 0.33 }] });
    expect(det(t.dim(), L.id).avisos.some((m) => classificar(m).codigo === 'ARM_BLOQ')).toBe(true);
  }, 60000);
});

describe('R7e: assinatura da posição', () => {
  it('face, tipo e direção', () => {
    expect(assinaturaPos({ face: 'inf', tipo: 'positiva', dir: 1 })).toBe('inf|positiva|1');
    expect(assinaturaPos({ face: 'sup', tipo: 'negativa' })).toBe('sup|negativa|');
  });
});

describe('R7e: pranchas das lajes', () => {
  type Txt = { t: 'txt'; s: string; p: [number, number] };
  const textos = (p: { modelo: { t: string }[] }) => (p.modelo.filter((q) => q.t === 'txt') as Txt[]);
  it('siglas de reforço, linhas de dobra e rótulos reposicionados', () => {
    const t = lajes([4, 4]);
    const dim = t.dim();
    const prs0 = montarPranchasLajes(t.s.modelo, null, dim);
    expect(textos(prs0[0]).some((x) => / C=\d+ RI$/.test(x.s))).toBe(true);
    expect(textos(prs0[1]).some((x) => / C=\d+ RS$/.test(x.s))).toBe(true);
    t.ok('opcoes.definir', { valores: { lajeSiglaReforco: 0 } });
    expect(montarPranchasLajes(t.s.modelo, null, t.dim()).flatMap(textos).some((x) => / R[IS]$/.test(x.s))).toBe(false);
    t.ok('opcoes.definir', { padrao: ['lajeSiglaReforco'] });
    // linha de dobra desenhada e rotulada
    t.ok('laje.linhaDobra', { acao: 'criar', grupo: t.grupo, a: [2, 0], z: [2, 5] });
    const dim1 = t.dim(), antes = montarPranchasLajes(t.s.modelo, null, dim1);
    expect(textos(antes[0]).some((x) => x.s === 'LD1')).toBe(true);
    // rótulo reposicionado: um só texto anda 12 mm no papel (k = escala/1000 em m do modelo) e um traço liga ao centro da barra
    const L = t.s.modelo.lajes[0], p = dim1.detalhesLajes!.find((d) => d.laje === L.id)!.posicoes.find((x) => x.face === 'inf')!;
    t.ok('prancha.rotulo', { chave: `${L.id}|${p.pos}`, dx: 12, dy: 0 });
    const depois = montarPranchasLajes(t.s.modelo, null, dim1), k = depois[0].escala / 1000;
    const ta = textos(antes[0]), td = textos(depois[0]);
    expect(td.length).toBe(ta.length);
    const mov = td.filter((x, i) => Math.abs(x.p[0] - ta[i].p[0]) > 1e-9 || Math.abs(x.p[1] - ta[i].p[1]) > 1e-9);
    expect(mov).toHaveLength(1);
    expect(mov[0].p[0] - ta[td.indexOf(mov[0])].p[0]).toBeCloseTo(12 * k, 6);
    const tracos = (pr: typeof depois) => pr[0].modelo.filter((q) => q.t === 'pl' && q.c === 'COTA').length;
    expect(tracos(depois)).toBe(tracos(antes) + 1);
    // volta ao lugar automático e não refaz o cálculo
    t.ok('prancha.rotulo', { chave: `${L.id}|${p.pos}`, remover: true });
    expect(t.s.modelo.prancha?.rotulos).toBeUndefined();
    expect(afetaCalculo('prancha.rotulo')).toBe(false);
    expect(afetaCalculo('laje.barras')).toBe(true);
  }, 120000);
  it('rótulo de laje inexistente é recusado', () => {
    const t = lajes([4, 4]);
    expect(t.s.executar('prancha.rotulo', { chave: 'x|N1', dx: 1 }).ok).toBe(false);
  });
});
