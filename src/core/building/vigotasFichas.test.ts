// E3b: vigotas por ficha (armadas, protendidas, genéricas) e moldadas no local — cálculo manual, escolha do tipo, serviço
// das protendidas, duas parcelas de negativo, duplas e triplas, edição, mínimos por pano, ponto a ponto, redistribuição, Branson.
import { describe, expect, it } from 'vitest';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { concrete } from '../concrete';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { classificar } from './revisao';
import { bransonEI, momentoResistenteT } from './tiposLaje';
import { esforcosDoGrupo, minimosDaFaixa, posicionarVigotas, redistribuirNegativos, tipoDeVao } from './vigotasEsforcos';
import { combinacaoDoNivel, momentoDoNivel, nivelPorCAA } from './vigotasFichas';
import { armaduraEquivalente, dadosBranson, fatorBranson } from './vigotasFlecha';
import { cortantesDasPontas, quantitativoMoldadas, quantitativoVigotas, relatorioEsforcos } from './vigotasRelatorio';
import { escolherPorMomento, fichaPor } from './tiposLaje';
import { igualar, type FaixaVigota } from './vigotas';
import { dadosDeResultado, rotulosDeVigotas, vistaDisponivel } from '../resultados/vigotasVista';

type Ok = (n: string, p: Record<string, unknown>) => void;
/** Pavimento com um vão de 4 m (5 m em y) de lajes de vigotas na direção x, vigas 15×45 em pilares 25×25; mínimos das vigotas desligados. */
function pav(tipo: Record<string, unknown>, o: { vaos?: number[]; carga?: number; biapoiada?: boolean; minimos?: boolean; extra?: (ok: Ok, s: Sessao) => void } = {}) {
  const s = new Sessao();
  for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema');
  const ok: Ok = (n, p) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); };
  ok('vento.definir', { ativo: false });
  const vaos = o.vaos ?? [4], xs = vaos.reduce((a, v) => [...a, a.at(-1)! + v], [0]), L = xs.at(-1)!;
  ok('lote', { comandos: xs.flatMap((x) => [0, 5].map((y) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.25, h: 0.25 } } }))) });
  ok('lote', { comandos: [[[0, 0], [L, 0]], [[0, 5], [L, 5]], ...xs.map((x) => [[x, 0], [x, 5]])].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.15, h: 0.45 } } })) });
  ok('laje.detectarPanos', { grupo: 'g_3', tipo });
  if (o.biapoiada) ok('laje.editar', { id: s.modelo.lajes[0].id, vigotasBiapoiadas: true });
  if (o.carga) ok('carga.area', { grupo: 'g_3', contorno: [[0, 0], [L, 0], [L, 5], [0, 5]], valor: o.carga });
  if (!o.minimos) ok('opcoes.definir', { valores: { vigotaMomentoMinPositivo: 0, vigotaMomentoMinNegativo: 0 } });
  o.extra?.(ok, s);
  const an = analisarEdificio(s.modelo);
  const d = dimensionarEdificio(s.modelo, an);
  return { s, d, an, v: d.vigotas![0] };
}
const ARMADA = { tipo: 'vigotas', ficha: 'ex:armada', serie: 'A12' }, PROT = { tipo: 'vigotas', ficha: 'ex:protendida', serie: 'P16' };
const MOLDADA = { tipo: 'moldada', capa: 0.05, intereixo: 0.5, bw: 0.1, h: 0.25, enchimento: 'eps' };
const c30 = concrete(30, 1.4);

/** Carga (kN/m²) que leva o momento positivo do grupo a `alvo`, por interpolação linear de duas execuções (a grelha é linear nas cargas). */
function cargaPara(tipo: Record<string, unknown>, alvo: (v: ReturnType<typeof pav>['v']) => number, meta: number, o: Parameters<typeof pav>[1] = {}) {
  const a = pav(tipo, { ...o, carga: 1 }), b = pav(tipo, { ...o, carga: 6 });
  const ya = alvo(a.v), yb = alvo(b.v), k = (yb - ya) / 5;
  return Math.max(0.5, 1 + (meta - ya) / k);
}
const mPos = (v: ReturnType<typeof pav>['v']) => v.grupos[0].esforcos.mPos;

describe('E3b: armadas — tipo da série pelo momento (cálculo manual)', () => {
  it('biapoiada: Md = p·ℓ²/8 e o tipo é o de menor Mu que cobre', () => {
    const q = cargaPara(ARMADA, mPos, 7.5, { biapoiada: true });
    const { v } = pav(ARMADA, { biapoiada: true, carga: q });
    const g = v.grupos[0], p = (g.esforcos.v[0] + g.esforcos.v[1]) / g.L;
    // vigotas biapoiadas sobre vigas flexíveis: o momento sai da grelha, próximo de p·ℓ²/8
    expect(g.esforcos.mPos).toBeGreaterThan(0.8 * (p * g.L ** 2) / 8);
    expect(g.esforcos.mPos).toBeLessThan(1.2 * (p * g.L ** 2) / 8);
    expect(g.esforcos.mPos).toBeCloseTo(7.5, 1);
    expect(g.tipoVao).toBe('isolado');
    // A1 (Mu 6) não cobre 7,5; A2 (Mu 9,5) cobre
    expect(g.tipo).toBe('A2');
    expect(g.serie).toBe('A12b');
    expect(g.ficha!.positivo).toMatchObject({ Mu: 9.5, Mfis: 2.2, EI: 190, EIfis: 95, fonte: 'ficha' });
    expect(g.ficha!.positivo.aprov).toBeCloseTo(g.esforcos.mPos / 9.5, 9);
    expect(g.ficha!.parcelas).toEqual([]);
    expect(v.status === 'ok' || v.mensagens.every((m) => !/momento positivo/.test(m))).toBe(true);
    // cortantes das pontas por nervura e por metro de largura (K1.12.5-11)
    expect(g.porMetro.v[0]).toBeCloseTo(g.esforcos.v[0] / 0.5, 9);
    expect(cortantesDasPontas(v)[0].porMetro[1]).toBeCloseTo(g.esforcos.v[1] / 0.5, 9);
  });

  it('carga baixa: tipo A1 e aproveitamento Md/Mu', () => {
    const { v } = pav(ARMADA, { biapoiada: true });
    const g = v.grupos[0];
    expect(g.esforcos.mPos).toBeLessThan(6);
    expect(g.tipo).toBe('A1');
    expect(g.ficha!.positivo.aprov).toBeCloseTo(g.esforcos.mPos / 6, 9);
    expect(v.familia).toBe('armada');
    expect(v.lista).toHaveLength(10);
    expect(v.lista!.every((x) => x.tipo === 'A1' && x.tipoVao === 'isolado')).toBe(true);
  });

  it('acima do maior tipo: adicional pela ficha (Mu da ficha + As adicional) e erro VIGOTA_POS além dele', () => {
    const q = cargaPara(ARMADA, mPos, 10.8, { biapoiada: true });
    const { v } = pav(ARMADA, { biapoiada: true, carga: q });
    const g = v.grupos[0], dI = 0.16 - 0.025 - 0.005;
    expect(g.tipo).toBe('A2');
    expect(g.ficha!.parcelas.length).toBeGreaterThan(0);
    const AsBase = armaduraEquivalente(c30, 0.5, 0.04, 0.1, dI, 9.5, 500 / 1.15);
    expect(momentoResistenteT(c30, 0.5, 0.04, 0.1, dI, AsBase, 500 / 1.15)).toBeCloseTo(9.5, 6);
    const Ad = g.ficha!.parcelas.reduce((t, p) => t + p.As, 0) / 1e4;
    expect(g.ficha!.positivo.MuTotal).toBeCloseTo(momentoResistenteT(c30, 0.5, 0.04, 0.1, dI, AsBase + Ad, 500 / 1.15), 6);
    expect(g.ficha!.positivo.MuTotal).toBeGreaterThanOrEqual(g.esforcos.mPos - 1e-6);
    expect(v.mensagens.some((m) => classificar(m).codigo === 'VIGOTA_POS')).toBe(false);
    // muito acima: nenhuma vigota da série cobre (ficha de fabricante: erro)
    const q2 = cargaPara(ARMADA, mPos, 25, { biapoiada: true });
    const r = pav(ARMADA, { biapoiada: true, carga: q2 }).v;
    expect(r.status).toBe('fail');
    const msg = r.mensagens.find((m) => classificar(m).codigo === 'VIGOTA_POS');
    expect(msg, r.mensagens.join('\n')).toMatch(/nenhuma vigota da série cobre/);
  });

  it('ficha do usuário (cópia): momento além da tabela vira aviso VIGOTA_TABELA e a vigota segue com o maior tipo', () => {
    const q = cargaPara(ARMADA, mPos, 25, { biapoiada: true });
    const { v } = pav(ARMADA, {
      biapoiada: true, carga: q,
      extra: (ok, s) => {
        ok('tipoLaje.ficha', { acao: 'copiar', de: 'ex:armada', nome: 'Minha armada' });
        const id = s.modelo.tiposLaje!.fichas!.find((f) => f.nome === 'Minha armada')!.id;
        ok('laje.editar', { id: s.modelo.lajes[0].id, tipo: { tipo: 'vigotas', ficha: id, serie: 'A12' } });
      },
    });
    expect(v.mensagens.some((m) => classificar(m).codigo === 'VIGOTA_TABELA' && /amplie a tabela/.test(m))).toBe(true);
    expect(v.mensagens.some((m) => classificar(m).codigo === 'VIGOTA_POS')).toBe(false);
  });

  it('negativos em duas parcelas: a longa cobre o diagrama e a curta só o que a longa não resiste', () => {
    const { v } = pav(ARMADA, { vaos: [4, 4], carga: 4 });
    const n = v.grupos[0].negativos.find((x) => x && x.barras && x.barras.n >= 2);
    expect(n, JSON.stringify(v.grupos[0].negativos)).toBeTruthy();
    const [longa, curta] = n!.parcelas!;
    expect(longa.tipo).toBe('longa');
    expect(curta.tipo).toBe('curta');
    expect(longa.n + curta.n).toBe(n!.barras!.n);
    expect(curta.comprimento).toBeLessThanOrEqual(longa.comprimento + 1e-9);
    expect(longa.percentual).toBeCloseTo((longa.comprimento / v.grupos[0].L) * 100, 0);
    // Mu típica e maciça da ficha, e o limite vem da ficha
    expect(n!.fonteLimite).toBe('ficha');
    expect(n!.MRdNervura).toBe(3.2);
    expect(n!.MuMacico).toBe(11);
  });

  it('negativo acima do máximo da ficha: erro com o valor e a sugestão de laje mais alta ou vigota dupla', () => {
    const { v } = pav(ARMADA, { vaos: [4, 4], carga: 12 });
    const msg = v.mensagens.find((m) => classificar(m).codigo === 'VIGOTA_NEG');
    expect(msg, v.mensagens.join('\n')).toMatch(/acima do (máximo da ficha|máximo)/);
    expect(msg).toMatch(/vigota dupla/);
    expect(v.status).toBe('fail');
  });

  it('cortante acima da ficha: erro VIGOTA_CORTANTE com VRd1 da ficha', () => {
    const { v } = pav(ARMADA, { carga: 20, biapoiada: true });
    const msg = v.mensagens.find((m) => classificar(m).codigo === 'VIGOTA_CORTANTE');
    expect(msg, v.mensagens.join('\n')).toMatch(/acima do resistente da ficha \(6,50 kN\)/);
    expect(v.grupos[0].cortante[0].fonte).toBe('ficha');
    expect(v.grupos[0].cortante[0].VRd1).toBe(6.5);
  });
});

describe('E3b: protendidas — nível de protensão pela CAA e momento de serviço', () => {
  it('Tabela 13.4 (a confirmar): CAA I parcial, II limitada, III e IV completa; combinação frequente ou rara', () => {
    expect(['I', 'II', 'III', 'IV'].map((c) => nivelPorCAA(c as 'I'))).toEqual(['parcial', 'limitada', 'completa', 'completa']);
    expect((['parcial', 'limitada', 'completa'] as const).map(combinacaoDoNivel)).toEqual(['frequente', 'frequente', 'rara']);
    const s = fichaPor(undefined, 'ex:protendida')!.series[0];
    expect([momentoDoNivel(s, 'parcial'), momentoDoNivel(s, 'limitada'), momentoDoNivel(s, 'completa')]).toEqual([8, 6, 4.5]);
    expect(momentoDoNivel({ ...s, protensao: { Mdesc: 3, Mlimitada: 6 } }, 'parcial')).toBe(6); // sem a coluna, a do nível mais restritivo
    expect(momentoDoNivel({ ...s, protensao: { Mdesc: 3, Mlimitada: 6 } }, 'completa')).toBeNull();
  });

  it('o tipo da série muda com a classe de exposição do pano; sem solução, erro VIGOTA_SERIE', () => {
    const serv = (v: ReturnType<typeof pav>['v']) => v.grupos[0].ficha!.servico!.Mserv;
    const exp = (caa: 'I' | 'II' | 'III' | 'IV') => (ok: Ok, s: Sessao) => ok('laje.exposicao', { ids: [s.modelo.lajes[0].id], caa });
    const run = (caa: 'I' | 'II' | 'III' | 'IV', meta: number) => pav(PROT, { biapoiada: true, carga: cargaPara(PROT, serv, meta, { biapoiada: true, extra: exp(caa) }), extra: exp(caa) }).v;
    // Mserv ≈ 3,5 (frequente): CAA I (parcial 8) e II (limitada 6) servem com P1 (Mu 10); CAA III (completa, combinação rara) com Mserv ≈ 5,3 pede P2 (6), pois P1 admite 4,5
    const I = run('I', 3.5), II = run('II', 3.5), III = run('III', 5.3);
    expect(I.grupos[0].ficha!.servico!.Mserv).toBeCloseTo(3.5, 1);
    expect(I.protensao).toMatchObject({ caa: 'I', nivel: 'parcial', combinacao: 'frequente' });
    expect(I.grupos[0].tipo).toBe('P1');
    expect(II.grupos[0].tipo).toBe('P1');
    expect(II.protensao!.nivel).toBe('limitada');
    expect(III.grupos[0].tipo).toBe('P2');
    expect(III.protensao).toMatchObject({ nivel: 'completa', combinacao: 'rara' });
    expect(III.grupos[0].ficha!.servico).toMatchObject({ Madm: 6, ok: true });
    expect(III.grupos[0].ficha!.servico!.Mserv).toBeCloseTo(5.3, 1);
    // Mserv ≈ 6,5 na protensão completa: P2 admite 6, sem solução → VIGOTA_SERIE ao fim do cálculo
    const sem = run('III', 6.5);
    const msg = sem.mensagens.find((m) => classificar(m).codigo === 'VIGOTA_SERIE');
    expect(msg, sem.mensagens.join('\n')).toMatch(/nenhuma vigota da série atende o serviço/);
    expect(sem.status).toBe('fail');
    // a mesma carga com a protensão limitada (P2 = 8,5) passa
    expect(run('II', 6.5).grupos[0].ficha!.servico!.ok).toBe(true);
  });

  it('cortante da protendida: duas colunas (acima ou abaixo da descompressão)', () => {
    const { v } = pav(PROT, { biapoiada: true });
    const c = v.grupos[0].cortante[0];
    expect(c.fonte).toBe('ficha');
    // nas pontas da vigota biapoiada o momento positivo é ~0 (< Mdesc): vale a coluna da seção descomprimida
    expect(c.VRd1).toBe(9);
    expect(v.grupos[0].ficha!.servico!.Mdesc).toBe(3.2);
  });
});

describe('E3b: moldadas no local', () => {
  it('armadura inferior pelo cálculo, na largura da nervura, com resumo e quantitativo', () => {
    const { v, d } = pav(MOLDADA, { biapoiada: true, carga: 3 });
    expect(v.familia).toBe('moldada');
    const g = v.grupos[0];
    expect(g.positiva.barras!.n).toBeLessThanOrEqual(2);
    expect(g.positiva.barras!.As).toBeGreaterThanOrEqual(g.positiva.AsNec - 1e-6);
    expect(g.ficha!.moldada!.larguraMin).toBeLessThanOrEqual(0.1 + 1e-9);
    expect(v.mensagens.some((m) => /^Vigotas moldadas: /.test(m))).toBe(true);
    expect(classificar(v.mensagens.find((m) => /^Vigotas moldadas/.test(m))!).codigo).toBe('VIGOTA_FICHA');
    expect(d.quantitativoMoldadas!.some((x) => x.posicao === 'inferior')).toBe(true);
    expect(quantitativoMoldadas(d.vigotas!, 0)[0].peso).toBeGreaterThan(0);
    expect(quantitativoVigotas(d.vigotas!, 5)[0].comprimentoComPerdas).toBeCloseTo(quantitativoVigotas(d.vigotas!, 0)[0].comprimento * 1.05, 2);
  });

  it('nervura estreita: a armadura inferior não cabe (VIGOTA_NERVURA_ESTREITA) e a sugestão é aumentar altura ou largura', () => {
    const { v } = pav({ ...MOLDADA, bw: 0.07 }, { biapoiada: true, carga: 6, extra: (ok, s) => ok('laje.editar', { id: s.modelo.lajes[0].id, armaduraMoldada: { inf: { n: 2, phi: 16 }, estribo: { phi: 5, s: 0.15 } } }) });
    const msg = v.mensagens.find((m) => classificar(m).codigo === 'VIGOTA_NERVURA_ESTREITA');
    expect(msg, v.mensagens.join('\n')).toMatch(/pedem nervura de/);
    expect(msg).toMatch(/aumente a largura da nervura/);
    expect(v.status).toBe('fail');
    // 2φ16 + estribo φ5 + 2 × (2,5 cm + 0,5 cm): 2·(0,025 + 0,005) + 2·0,016 + 0,02 (espaçamento mínimo) = 0,112 m
    expect(v.grupos[0].ficha!.moldada!.larguraMin).toBeCloseTo(2 * 0.03 + 2 * 0.016 + Math.max(0.02, 0.016, 1.2 * 0.019), 6);
  });

  it('armadura atribuída menor que a necessária: ARM_BLOQ; estribo exigido pelo cortante com a zona em número de barras', () => {
    const { v } = pav(MOLDADA, { biapoiada: true, carga: 14, extra: (ok, s) => ok('laje.editar', { id: s.modelo.lajes[0].id, armaduraMoldada: { inf: { n: 1, phi: 6.3 }, estribo: { phi: 5, s: 0.3 } } }) });
    expect(v.mensagens.some((m) => /^Armadura bloqueada insuficiente/.test(m))).toBe(true);
    expect(v.status).toBe('fail');
    const auto = pav(MOLDADA, { biapoiada: true, carga: 12 }).v;
    const c = auto.grupos[0].cortante[0];
    if (c.Vsd > c.VRd1) {
      expect(c.estribo).toBeTruthy();
      expect(c.estribo!.barras).toBe(Math.ceil(c.estribo!.zona / c.estribo!.s) + 1);
    } else expect(c.estribo).toBeUndefined();
  });
});

describe('E3b: duplas e triplas, edição e esforços atribuídos', () => {
  it('vigota dupla: o conjunto divide os esforços (mais o peso do vigota extra) e apaga a vizinha', () => {
    const q = cargaPara(ARMADA, mPos, 5, { biapoiada: true });
    const base = pav(ARMADA, { biapoiada: true, carga: q }).v;
    const r = pav(ARMADA, { biapoiada: true, carga: q, extra: (ok, s) => ok('vigota.multipla', { id: s.modelo.lajes[0].id, indice: 3, n: 2 }) }).v;
    expect(r.lista).toHaveLength(base.lista!.length - 1);
    const dupla = r.grupos.find((g) => g.especial === 'dupla')!;
    expect(dupla.indices).toEqual([3]);
    expect(dupla.vigotas).toBe(1);
    const L = dupla.L, gg = base.grupos[0].esforcos.mPos;
    // (M + Δpeso·ℓ²/8) / 2, com Δpeso > 0
    expect(dupla.esforcos.mPos).toBeGreaterThan(gg / 2);
    expect(dupla.esforcos.mPos).toBeLessThan(gg / 2 + (0.5 * L * L) / 8);
    expect(r.lista!.find((x) => x.indice === 3)!.multipla).toBe(2);
    expect(r.lista!.some((x) => x.indice === 4)).toBe(false); // a vigota ao lado foi apagada
    expect(r.lista!.some((x) => x.indice === 5)).toBe(true);
    // tripla além do máximo da ficha armada (3) é aceita; marcação inválida vira aviso
    expect(r.grupos.filter((g) => !g.especial).reduce((t, g) => t + g.vigotas, 0)).toBe(base.lista!.length - 2);
  });

  it('apagamento posterior da marcação (n = 1) e marcação inválida em ficha sem vigota múltipla', () => {
    const { s } = pav(ARMADA, { extra: (ok, s) => { ok('vigota.multipla', { id: s.modelo.lajes[0].id, indice: 2, n: 3 }); ok('vigota.multipla', { id: s.modelo.lajes[0].id, indice: 2, n: 1 }); } });
    expect(s.modelo.lajes[0].vigotasMultiplas).toBeUndefined();
    const r = s.executar('vigota.multipla', { id: s.modelo.lajes[0].id, indice: 9, n: 2 });
    expect(r.ok).toBe(false); // passa da última vigota
    const t = pav(PROT, {});
    const e = t.s.executar('vigota.multipla', { id: t.s.modelo.lajes[0].id, indice: 1, n: 2 });
    expect(e.ok).toBe(false); // a protendida de exemplo não informa vigota múltipla
  });

  it('tipo atribuído a vigotas selecionadas, da primeira à última, e desbloqueio', () => {
    const { s, v } = pav(ARMADA, {
      biapoiada: true,
      extra: (ok, s) => ok('vigota.editar', { id: s.modelo.lajes[0].id, de: 1, ate: 3, tipo: 'A2', inf: { n: 1, phi: 8, percentual: 60 }, transversal: { phi: 5, s: 0.2 } }),
    });
    const ed = v.grupos.filter((g) => g.especial === 'editada');
    expect(ed.map((g) => g.indices![0])).toEqual([1, 2, 3]);
    expect(ed.every((g) => g.tipoAtribuido && g.tipo === 'A2')).toBe(true);
    // adicional editado em 60 % do comprimento (mostrado sempre em percentual)
    expect(ed[0].ficha!.parcelas[0]).toMatchObject({ n: 1, phi: 8, percentual: 60, tipo: 'total' });
    expect(ed[0].ficha!.parcelas[0].comprimento).toBeCloseTo(0.6 * ed[0].L, 3);
    expect(v.lista!.filter((x) => x.editada).map((x) => x.indice)).toEqual([1, 2, 3]);
    expect(s.executar('armadura.desbloquear', { tipo: 'laje' }).ok).toBe(true);
    expect(s.modelo.lajes[0].edicaoVigotas).toBeUndefined();
    // índice inexistente é recusado
    expect(s.executar('vigota.editar', { id: s.modelo.lajes[0].id, de: 20, tipo: 'A2' }).ok).toBe(false);
    expect(s.executar('vigota.editar', { id: s.modelo.lajes[0].id, de: 0, tipo: 'XX' }).ok).toBe(false);
  });

  it('vigota genérica de concreto: momento e cortantes atribuídos (igualação manual)', () => {
    const { v } = pav(ARMADA, { biapoiada: true, extra: (ok, s) => ok('vigota.momentos', { id: s.modelo.lajes[0].id, indices: [5], pos: 4.2, neg: [-0.5, -0.8], v: [3.1, 3.3] }) });
    const g = v.grupos.find((x) => x.especial === 'manual')!;
    expect(g.esforcos).toEqual({ mPos: 4.2, mNeg: [-0.5, -0.8], v: [3.1, 3.3] });
    expect(g.indices).toEqual([5]);
    expect(g.ficha!.positivo.Md).toBe(4.2);
  });
});

describe('E3b: momentos mínimos por pano, ponto a ponto e redistribuição', () => {
  const faixa = (s: number[], Mmax: number[], Mmin: number[], V: number[]): FaixaVigota => ({
    t: 0, largura: 0.5, nervuras: 1, a: [0, 0], z: [4, 0], L: s.at(-1)!, s, Mmax, Mmin, V,
    calc: { mPos: Math.max(0, ...Mmax), mNeg: [Math.min(0, Mmin[0]), Math.min(0, Mmin.at(-1)!)], v: [V[0], V.at(-1)!] }, grupo: 0,
  });
  const OP = { vigotaMomentoMinPositivo: 16, vigotaMomentoMinNegativo: 16 };

  it('mínimos por tipo de vão: o divisor do pano vale no lugar do da obra', () => {
    const f = faixa([0, 1, 2, 3, 4], [0, 3, 4, 3, 0], [0, 0, 0, 0, 0], [4, 2, 0, 2, 4]);
    expect(tipoDeVao(f)).toBe('isolado');
    const p = 8 / 4, m0 = p * 16; // p = (V1 + V2)/ℓ = 2 kN/m por nervura; p·ℓ² = 32
    expect(minimosDaFaixa(f, OP).esforcos.mPos).toBeCloseTo(Math.max(4, m0 / 16), 9);
    const alto = minimosDaFaixa(f, OP, { momentosMin: { isolado: { pos: 4, neg: 0 } } });
    expect(alto.esforcos.mPos).toBeCloseTo(m0 / 4, 9); // 8 kN·m
    expect(alto.esforcos.mNeg).toEqual([0, 0]); // negativo desligado nesse tipo
    expect(alto.divisorPos).toBe(4);
    // vão intermediário: negativos de análise nas duas pontas
    const f2 = faixa([0, 1, 2, 3, 4], [0, 2, 3, 2, 0], [-3, 0, 0, 0, -3], [5, 2, 0, 2, 5]);
    expect(tipoDeVao(f2)).toBe('intermediario');
    expect(tipoDeVao({ ...f2, calc: { ...f2.calc, mNeg: [-3, 0] } })).toBe('extremo');
    expect(tipoDeVao(f2, { vigotasBiapoiadas: true })).toBe('isolado');
  });

  it('igualação ponto a ponto × por pico (média): picos em abscissas diferentes', () => {
    const f1 = faixa([0, 1, 2, 3, 4], [0, 4, 2, 1, 0], [0, 0, 0, 0, 0], [3, 1, 0, 1, 3]);
    const f2 = faixa([0, 1, 2, 3, 4], [0, 1, 2, 4, 0], [0, 0, 0, 0, 0], [3, 1, 0, 1, 3]);
    const mins = [f1, f2].map((f) => ({ ...minimosDaFaixa(f, { vigotaMomentoMinPositivo: 0, vigotaMomentoMinNegativo: 0 }) }));
    const pico = esforcosDoGrupo([0, 1], [f1, f2], mins, 2, false, igualar), ponto = esforcosDoGrupo([0, 1], [f1, f2], mins, 2, true, igualar);
    expect(pico.esforcos.mPos).toBeCloseTo(4, 12); // média dos picos (4 e 4)
    expect(ponto.esforcos.mPos).toBeCloseTo(2.5, 12); // pico da média ponto a ponto: (4 + 1)/2 em x = 1 e (1 + 4)/2 em x = 3
    expect(ponto.diagrama.Mmax[ponto.diagrama.x.indexOf(1)]).toBeCloseTo(2.5, 12);
    // pelo máximo os dois coincidem
    expect(esforcosDoGrupo([0, 1], [f1, f2], mins, 1, true, igualar).esforcos.mPos).toBeCloseTo(esforcosDoGrupo([0, 1], [f1, f2], mins, 1, false, igualar).esforcos.mPos, 12);
  });

  it('redistribuição: δ = 1 − pct (≥ 0,75), positivo + metade da soma das reduções', () => {
    const esf = { mPos: 10, mNeg: [-8, -6] as [number, number], v: [5, 5] as [number, number] };
    const r = redistribuirNegativos(esf, [true, true], 15);
    expect(r.delta).toBeCloseTo(0.85, 12);
    expect(r.esforcos.mNeg[0]).toBeCloseTo(-6.8, 12);
    expect(r.esforcos.mNeg[1]).toBeCloseTo(-5.1, 12);
    expect(r.esforcos.mPos).toBeCloseTo(10 + (1.2 + 0.9) / 2, 12);
    // o limite de 30 % do programa de referência não vale: a NBR limita em δ ≥ 0,75
    expect(redistribuirNegativos(esf, [true, true], 30).delta).toBe(0.75);
    expect(redistribuirNegativos(esf, [true, true], 30, 0.9).delta).toBe(0.9);
    // ponta sem continuidade não é reduzida
    expect(redistribuirNegativos(esf, [true, false], 15).esforcos.mNeg[1]).toBe(-6);
    expect(redistribuirNegativos(esf, [true, true], 0).aplicada).toBe(false);
  });

  it('opção vigotaRedistribuir aumenta o positivo e registra o aviso; momentos mínimos por pano pelo comando', () => {
    const base = pav(ARMADA, { vaos: [4, 4], carga: 2 }).v, red = pav(ARMADA, { vaos: [4, 4], carga: 2, extra: (ok) => ok('opcoes.definir', { valores: { vigotaRedistribuir: 1 } }) }).v;
    const gb = base.grupos[0], gr = red.grupos[0];
    expect(gr.redistribuicao!.aplicada).toBe(true);
    expect(gr.esforcos.mPos).toBeGreaterThan(gb.esforcos.mPos);
    expect(red.mensagens.some((m) => classificar(m).codigo === 'VIGOTA_REDISTRIB')).toBe(true);
    const minimo = pav(ARMADA, { biapoiada: true, minimos: true, extra: (ok, s) => ok('laje.momentosMin', { ids: [s.modelo.lajes[0].id], tipo: 'isolado', pos: 4, neg: 0 }) }).v;
    const g = minimo.grupos[0], p = (g.esforcos.v[0] + g.esforcos.v[1]) / g.L;
    expect(g.esforcos.mPos).toBeCloseTo(Math.max((p * g.L * g.L) / 4, g.esforcos.mPos), 9);
    expect(g.esforcos.mPos).toBeGreaterThanOrEqual((p * g.L * g.L) / 4 - 1e-9);
    expect(g.esforcos.mNeg).toEqual([0, 0]);
  });
});

describe('E3b: Branson na flecha das vigotas', () => {
  it('Ie/Ic pela ficha: (Mr/Ma)³·EI + [1 − (Mr/Ma)³]·EIfis', () => {
    const ficha = fichaPor(undefined, 'ex:armada')!, serie = ficha.series[0];
    const g = { serie, ficha, h: 0.16, capa: 0.04, intereixo: 0.5, bw: 0.1, bwRigidez: 0.1, hEnch: 0.12 } as never;
    const d = dadosBranson(g, c30)!;
    expect(d).toMatchObject({ EI: 190, EIfis: 80, Mfis: 2.2, fonte: 'ficha' });
    const Ma = 4.4, r = (2.2 / 4.4) ** 3, esperado = (r * 190 + (1 - r) * 80) / 190;
    expect(fatorBranson(d, Ma)).toBeCloseTo(esperado, 12);
    expect(bransonEI(190, 80, 2.2, 4.4)).toBeCloseTo(r * 190 + (1 - r) * 80, 12);
    expect(fatorBranson(d, 1)).toBe(1); // abaixo de Mr: seção não fissurada
    expect(fatorBranson(d, -1)).toBe(1);
  });

  it('sem dado do fabricante: EI fissurado pelo estádio II com a armadura equivalente ao Mu', () => {
    const ficha = fichaPor(undefined, 'ex:armada')!, serie = { ...ficha.series[0], positivo: { Mu: 6, Mfis: 2.2 } };
    const g = { serie, ficha: { ...ficha, relacaoFis: undefined }, h: 0.16, capa: 0.04, intereixo: 0.5, bw: 0.1, bwRigidez: 0.1, hEnch: 0.12 } as never;
    const d = dadosBranson(g, c30, armaduraEquivalente(c30, 0.5, 0.04, 0.1, 0.13, 6, 500 / 1.15), 0.13)!;
    expect(d.fonte).toBe('estadio2');
    expect(d.EIfis).toBeLessThan(d.EI);
    expect(d.EIfis).toBeGreaterThan(0);
    expect(dadosBranson(g, c30)).toBeNull(); // sem armadura nem relação: rigidez total
  });

  it('flecha da laje por ficha: a opção liga a rigidez fissurada e a flecha de cada vigota; treliçada não muda', () => {
    const q = 3, com = pav(ARMADA, { vaos: [5], carga: q }), sem = pav(ARMADA, { vaos: [5], carga: q, extra: (ok) => ok('opcoes.definir', { valores: { vigotaBranson: 0 } }) });
    const fc = com.d.lajes[0].flechas!, fs = sem.d.lajes[0].flechas!;
    expect(fc.fissuracao ?? 1).toBeGreaterThanOrEqual(1);
    expect(com.d.lajes[0].flecha).toBeGreaterThan(sem.d.lajes[0].flecha * 0.999);
    const l = com.v.lista![5];
    expect(l.flecha).toBeTruthy();
    expect(l.flecha!.kappa).toBeGreaterThanOrEqual(1);
    expect(l.flecha!.total).toBeGreaterThan(0);
    expect(l.flecha!.limites.total).toBeCloseTo(5 / 250, 6);
    expect(fs.fissuracao).toBeUndefined();
  });
});

describe('E3b: vigota a vigota, relatório de esforços e escolha por momento', () => {
  it('posição das vigotas reais a partir da borda de inserção e alinhamento mais próximo', () => {
    const faixas = [{ t: 0.5 }, { t: 1.5 }, { t: 2.5 }, { t: 3.5 }];
    const l = { contorno: [[0, 0], [4, 0], [4, 4], [0, 4]] as [number, number][], insercao: 0 };
    const p = posicionarVigotas(l, faixas, 8, 4, [1, 0]);
    expect(p.map((x) => x.t)).toEqual([0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75]);
    expect(p.map((x) => x.faixa)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    // inserção na borda oposta inverte a numeração
    const inv = posicionarVigotas({ ...l, insercao: 2 }, faixas, 8, 4, [1, 0]);
    expect(inv[0].t).toBeCloseTo(3.75, 12);
    // dupla na vigota 2: ocupa a 2 e a 3 (apagada)
    const dup = posicionarVigotas({ ...l, vigotasMultiplas: [{ indice: 2, n: 2 }] }, faixas, 8, 4, [1, 0]);
    expect(dup).toHaveLength(7);
    expect(dup[2]).toMatchObject({ indice: 2, multipla: 2 });
    expect(dup[3].indice).toBe(4);
  });

  it('escolha por momento admissível: o tipo de menor Mu por metro que cobre; tabela excedida devolve null', () => {
    const f = fichaPor(undefined, 'ex:armada')!;
    expect(escolherPorMomento(f, 10 / 0.5, 0.16, 0.5)).toBeNull(); // 20 kN·m/m: A1 (12) e A2 (19) não cobrem
    expect(escolherPorMomento(f, 7 / 0.5, 0.16, 0.5)?.tipo).toBe('A2');
    expect(escolherPorMomento(f, 11 / 0.5, 0.16, 0.5)).toBeNull();
    expect(escolherPorMomento(f, 5 / 0.5, 0.16, 0.5)?.tipo).toBe('A1');
  });

  it('relatório de esforços do alinhamento: M, V e torção com o croqui do grupo de pavimentos', () => {
    const { b, an, v } = (() => { const r = pav(ARMADA, { vaos: [4, 4], carga: 2 }); return { b: r.s.modelo, an: r.an, v: r.v }; })();
    const rel = relatorioEsforcos(b, an, v, 4)!;
    expect(rel.x[0]).toBe(0);
    expect(rel.x.at(-1)).toBeCloseTo(v.lista![4].L, 2);
    expect(Math.max(...rel.Mmax)).toBeGreaterThan(0);
    expect(Math.min(...rel.Mmin)).toBeLessThan(0);
    expect(rel.V.length).toBe(rel.x.length);
    expect(rel.T.length).toBe(rel.x.length);
    expect(rel.pavimentos.length).toBeGreaterThan(0);
    expect(rel.croqui.vigotas).toHaveLength(v.lista!.length);
    // o pico do relatório é o da faixa (sem mínimos nem igualação)
    expect(Math.max(...rel.Mmax)).toBeCloseTo(v.faixas[v.lista![4].faixa].calc.mPos, 2);
    expect(relatorioEsforcos(b, an, v, 99)).toBeNull();
  });
});

describe('E5e: igualação pela área, flecha de montagem e ômega', () => {
  const H12 = { tipo: 'trelicada', modelo: 'H12', capa: 0.04 };
  const op = (valores: Record<string, number>) => (ok: Ok) => ok('opcoes.definir', { valores });
  it('flecha de montagem: biapoiada reprova, com escoras a cada 1,5 m passa e fica no resultado', () => {
    const sem = pav(H12, { extra: op({ vigotaMontagem: 1, vigotaEscoraDist: 0 }) });
    expect(sem.v.montagem!.escoras).toBe(0);
    expect(sem.v.montagem!.flecha).toBeCloseTo((5 * sem.v.montagem!.q * 4 ** 4) / (384 * sem.v.montagem!.EI), 6);
    expect(sem.v.mensagens.some((m) => /^Vigotas: flecha de montagem/.test(m))).toBe(true);
    expect(sem.v.status).toBe('fail');
    const com = pav(H12, { extra: op({ vigotaMontagem: 1, vigotaEscoraDist: 1.5 }) });
    expect(com.v.montagem!.escoras).toBe(2);
    expect(com.v.montagem!.ok).toBe(true);
    expect(com.v.mensagens.some((m) => /flecha de montagem/.test(m))).toBe(false);
    expect(pav(H12).v.montagem).toBeUndefined();
  });
  it('flecha de montagem em vigotas por ficha; moldadas ficam de fora', () => {
    expect(pav(ARMADA, { extra: op({ vigotaMontagem: 1, vigotaEscoraDist: 1 }) }).v.montagem).toBeDefined();
    expect(pav(MOLDADA, { biapoiada: true, extra: op({ vigotaMontagem: 1 }) }).v.montagem).toBeUndefined();
  });
  it('igualação pela área com 100 % de diferença dá o mesmo grupo único do critério pelo máximo', () => {
    const a = pav(H12, { vaos: [4, 4], extra: op({ vigotaIgualacaoBase: 0, vigotaIgualacaoPonto: 0 }) }).v, b = pav(H12, { vaos: [4, 4], extra: op({ vigotaIgualacaoBase: 1 }) }).v;
    expect(b.grupos.length).toBe(a.grupos.length);
    expect(b.grupos[0].esforcos.mPos).toBeCloseTo(a.grupos[0].esforcos.mPos, 9);
  });
  it('igualação pela área: soma das vigotas dos grupos é o total do pano', () => {
    const r = pav(H12, { vaos: [4], carga: 4, extra: op({ vigotaIgualacaoBase: 1, vigotaIgualacaoDif: 0.01 }) }).v;
    expect(r.grupos.reduce((t, g) => t + g.vigotas, 0)).toBe(r.vigotas);
  });
  const est = (ok: Ok, s: Sessao, valores: Record<string, number> = {}) => {
    ok('laje.editar', { id: s.modelo.lajes[0].id, armaduraMoldada: { inf: { n: 2, phi: 12.5 }, estribo: { phi: 5, s: 0.1 } } });
    if (Object.keys(valores).length) ok('opcoes.definir', { valores });
  };
  it('estribo em ômega e cortante em todo o comprimento mudam as posições transversais das moldadas', () => {
    const base = { biapoiada: true, carga: 14 };
    const fech = pav({ ...MOLDADA, bw: 0.12 }, { ...base, extra: (ok, s) => est(ok, s) });
    const tr = (r: typeof fech) => r.v.posicoes.filter((p) => p.tipo === 'transversal');
    expect(tr(fech).length).toBeGreaterThan(0);
    const om = pav({ ...MOLDADA, bw: 0.12 }, { ...base, extra: (ok, s) => est(ok, s, { vigotaEstriboOmega: 1 }) });
    // fechado: 2(bw−2c) + 2(h−2c) + 2 ganchos; ômega: (bw−2c) + 2(h−2c) + 2 abas → diferença = (bw−2c) + 2·gancho − 2·aba
    expect(tr(fech)[0].comprimento).toBeGreaterThan(tr(om)[0].comprimento);
    expect(tr(om)[0].n).toBe(tr(fech)[0].n);
    const tot = pav({ ...MOLDADA, bw: 0.12 }, { ...base, extra: (ok, s) => est(ok, s, { vigotaCortanteTotal: 1 }) });
    expect(tr(tot).length).toBe(1);
    expect(tr(tot)[0].n).toBeGreaterThanOrEqual(tr(fech)[0].n);
  });
});

describe('E5e: vista da armadura inferior das moldadas (C7.91)', () => {
  it('dados e rótulos da vista: texto da armadura inferior só com os esforços desligados', () => {
    const { v } = pav({ ...MOLDADA, bw: 0.12 }, { biapoiada: true, carga: 6, extra: (ok, s) => ok('laje.editar', { id: s.modelo.lajes[0].id, armaduraMoldada: { inf: { n: 2, phi: 12.5 }, estribo: { phi: 5, s: 0.1 } } }) });
    const dados = dadosDeResultado(v), g = v.grupos[0];
    expect(dados[0].familia).toBe('moldada');
    expect(dados[0].inferior).toEqual({ phi: 12.5, comprimento: g.positiva.comprimento });
    const sem = rotulosDeVigotas(v, 'armaduraInferior', false);
    expect(sem.length).toBe(v.faixas.length);
    expect(sem[0].texto).toBe(`φ12,5 c=${g.positiva.comprimento.toFixed(2).replace('.', ',')} m`);
    expect(rotulosDeVigotas(v, 'armaduraInferior', true)).toEqual([]);
    expect(vistaDisponivel('armaduraInferior', true)).toBe(false);
    expect(rotulosDeVigotas(v, 'momentos', true)[0].texto).toMatch(/^M = /);
  });
  it('armadas e protendidas por ficha: tipo na vista de momentos', () => {
    expect(rotulosDeVigotas(pav(ARMADA).v, 'momentos', false)[0].texto).toMatch(/^Armada/);
    expect(rotulosDeVigotas(pav(PROT).v, 'momentos', false)[0].texto).toBe('Protendida');
  });
});
