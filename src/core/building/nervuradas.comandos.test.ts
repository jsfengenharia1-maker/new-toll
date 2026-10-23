// Comandos e integrações das nervuradas bidirecionais (E3c): biblioteca de formas, atribuição ao pano, cópia entre panos,
// base nas nervuras, exportar/importar, memorial, viga chata entre panos de alturas diferentes e regressão das demais lajes.
import { describe, expect, it } from 'vitest';
import { analisarEdificio } from './analitico';
import { dimensionarEdificio } from './dimensionamento';
import { comandosEdificioPadrao, Sessao } from '../commands';
import { exportarTiposLaje, importarTiposLaje } from './tiposLaje';
import { alturaVigaChata, parteSalienteViga } from './secaoViga';
import { nervuradasNoMemorial } from './nervuradasDim';
import { opcoesEmUso, perfilDe } from './opcoes';
import { verificar } from './verify';
import { quantitativosDetalhados } from './relatorios';

function padrao(): Sessao { const s = new Sessao(); for (const c of comandosEdificioPadrao()) s.executar(c.nome, c.params, 'sistema'); return s; }
const ok = (s: Sessao, n: string, p: Record<string, unknown>) => { const r = s.executar(n, p); expect(r.ok, `${n}: ${r.erros.map((e) => e.mensagem).join(' ')}`).toBe(true); return r; };
const falha = (s: Sessao, n: string, p: Record<string, unknown>, codigo: string) => { const r = s.executar(n, p); expect(r.ok, n).toBe(false); expect(r.erros.map((e) => e.codigo)).toContain(codigo); };

/** Dois panos 6 × 6 lado a lado (viga central compartilhada) com a laje da esquerda nervurada e a da direita como se pedir. */
function doisPanos(direita: Record<string, unknown>) {
  const s = padrao();
  ok(s, 'lote', { comandos: [[0, 0], [6, 0], [12, 0], [0, 6], [6, 6], [12, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
  const v = (p: number[][], h = 0.6) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.2, h } } });
  ok(s, 'lote', { comandos: [v([[0, 0], [12, 0]]), v([[0, 6], [12, 6]]), v([[0, 0], [0, 6]]), v([[6, 0], [6, 6]]), v([[12, 0], [12, 6]])] });
  ok(s, 'laje.criar', { grupo: 'g_3', ponto: [3, 3], tipo: { tipo: 'nervurada', forma: 'cat:rec-60-30', hTotal: 0.4, capa: 0.05 } });
  ok(s, 'laje.criar', { grupo: 'g_3', ponto: [9, 3], tipo: direita });
  return s;
}

describe('forma.tipo: biblioteca de formas da obra', () => {
  const forma = { nome: 'Cubeta da obra', tipo: 'recuperavel', altura: 0.3, pecas: 2, intereixo: [0.7, 0.7], bw: [0.1, 0.1] };
  it('criar, editar, copiar e remover; forma em uso não se remove; catálogo só se copia', () => {
    const s = padrao();
    ok(s, 'forma.tipo', { acao: 'criar', id: 'fo', forma });
    expect(s.modelo.tiposLaje?.formas).toHaveLength(1);
    falha(s, 'forma.tipo', { acao: 'criar', id: 'fo', forma }, 'FORMA_EXISTENTE');
    falha(s, 'forma.tipo', { acao: 'criar', id: 'cat:rec-60-30', forma }, 'FORMA_EXISTENTE');
    falha(s, 'forma.tipo', { acao: 'criar', id: 'ruim', forma: { ...forma, bw: [0.8, 0.1] } }, 'FORMA_INCOERENTE');
    falha(s, 'forma.tipo', { acao: 'criar', id: 'ruim', forma: { ...forma, tipo: 'perdida' } }, 'FORMA_INCOERENTE');
    ok(s, 'forma.tipo', { acao: 'editar', id: 'fo', forma: { ...forma, nome: 'Renomeada', altura: 0.25 } });
    expect(s.modelo.tiposLaje!.formas![0]).toMatchObject({ nome: 'Renomeada', altura: 0.25, id: 'fo' });
    falha(s, 'forma.tipo', { acao: 'editar', id: 'cat:rec-60-30', forma }, 'FORMA_INEXISTENTE');
    ok(s, 'forma.tipo', { acao: 'copiar', de: 'cat:rec-80-40', nome: 'Minha 80' });
    expect(s.modelo.tiposLaje!.formas).toHaveLength(2);
    expect(s.modelo.tiposLaje!.formas![1]).toMatchObject({ nome: 'Minha 80', intereixo: [0.8, 0.8] });
    // uso por uma laje
    ok(s, 'lote', { comandos: [[0, 0], [6, 0], [0, 6], [6, 6]].map(([x, y]) => ({ nome: 'pilar.inserir', params: { x, y, secao: { tipo: 'ret', b: 0.3, h: 0.3 } } })) });
    ok(s, 'lote', { comandos: [[[0, 0], [6, 0]], [[0, 6], [6, 6]], [[0, 0], [0, 6]], [[6, 0], [6, 6]]].map((p) => ({ nome: 'viga.tracar', params: { grupo: 'g_3', pontos: p, secao: { b: 0.2, h: 0.5 } } })) });
    ok(s, 'laje.criar', { grupo: 'g_3', ponto: [3, 3], tipo: { tipo: 'nervurada', forma: 'fo', hTotal: 0.3, capa: 0.05 } });
    falha(s, 'forma.tipo', { acao: 'remover', id: 'fo' }, 'FORMA_EM_USO');
    ok(s, 'forma.tipo', { acao: 'remover', id: s.modelo.tiposLaje!.formas![1].id });
    // desfazer restaura
    s.desfazer();
    expect(s.modelo.tiposLaje!.formas).toHaveLength(2);
  });
  it('forma perdida pede o enchimento da biblioteca (concreto, EPS, cerâmica ou genérico)', () => {
    const s = padrao();
    ok(s, 'forma.tipo', { acao: 'criar', id: 'fp', forma: { ...forma, tipo: 'perdida', enchimento: 'eps' } });
    ok(s, 'tipoLaje.enchimento', { acao: 'criar', id: 'gen', enchimento: { nome: 'Bloco genérico', material: 'generico', pesoM2: 0.8 } });
    ok(s, 'forma.tipo', { acao: 'criar', id: 'fg', forma: { ...forma, tipo: 'perdida', enchimento: 'gen' } });
    falha(s, 'tipoLaje.enchimento', { acao: 'remover', id: 'gen' }, 'ENCHIMENTO_EM_USO');
  });
  it('exportar e importar a biblioteca (JSON versionado) levam as formas; é idempotente', () => {
    const s = padrao();
    ok(s, 'forma.tipo', { acao: 'criar', id: 'fo', forma });
    const txt = exportarTiposLaje(s.modelo);
    const lido = importarTiposLaje(txt);
    expect(lido.ok).toBe(true);
    if (!lido.ok) return;
    expect(lido.formas).toEqual(s.modelo.tiposLaje!.formas);
    const s2 = padrao();
    ok(s2, 'tipoLaje.importar', { texto: txt });
    expect(s2.modelo.tiposLaje!.formas).toEqual(s.modelo.tiposLaje!.formas);
    expect(exportarTiposLaje(s2.modelo)).toBe(txt);
    falha(s2, 'tipoLaje.importar', { texto: txt }, 'TIPOLAJE_EXISTENTE');
    ok(s2, 'tipoLaje.importar', { texto: txt, substituir: true });
    expect(importarTiposLaje('{"formato":"statikos-tipos-laje","versao":1,"fichas":[],"enchimentos":[],"formas":[{"id":"x"}]}').ok).toBe(false);
  });
});

describe('laje.nervurada, laje.copiarPanos e laje.armaduraBase', () => {
  it('atribui forma, direção, passagem, zonas maciças e engaste; valida', () => {
    const s = doisPanos({ tipo: 'macica', h: 0.12 });
    const [l1, l2] = s.modelo.lajes.map((l) => l.id);
    ok(s, 'laje.nervurada', { ids: [l2], forma: 'cat:rec-60-20', hTotal: 0.25, capa: 0.05, direcao: 90, passagem: [8, 2], zonasMacicas: [[[7, 1], [8, 1], [8, 2], [7, 2]]], engasteBordas: [0.5, 1, 1, 1] });
    const l = s.modelo.lajes.find((x) => x.id === l2)!;
    expect(l.tipo).toEqual({ tipo: 'nervurada', forma: 'cat:rec-60-20', hTotal: 0.25, capa: 0.05 });
    expect(l.direcao).toBe(90);
    expect(l.pontoNervuras).toEqual([8, 2]);
    expect(l.zonasMacicas).toHaveLength(1);
    expect(l.engasteBordas).toEqual([0.5, 1, 1, 1]);
    // ajuste parcial: só a capa; direção pela viga
    ok(s, 'laje.nervurada', { ids: [l2], capa: 0.06, limparPassagem: true, limparZonas: true, direcaoPor: { viga: s.modelo.vigas[0].id, relacao: 'perpendicular' } });
    const l2b = s.modelo.lajes.find((x) => x.id === l2)!;
    expect(l2b.tipo).toMatchObject({ capa: 0.06, hTotal: 0.25 });
    expect(l2b.pontoNervuras).toBeUndefined();
    expect(l2b.zonasMacicas).toBeUndefined();
    expect(l2b.direcao).toBeCloseTo(90, 6);
    falha(s, 'laje.nervurada', { ids: [l2], forma: 'nao-existe', hTotal: 0.25, capa: 0.05 }, 'FORMA_INEXISTENTE');
    falha(s, 'laje.nervurada', { ids: [l2], forma: 'cat:rec-60-20', hTotal: 0.05, capa: 0.05 }, 'PARAMETRO_INVALIDO');
    falha(s, 'laje.nervurada', { ids: [l2], passagem: [50, 50] }, 'PASSAGEM_FORA');
    falha(s, 'laje.nervurada', { ids: [l2], zonasMacicas: [[[0, 0], [1, 0], [1, 1]]] }, 'ZONA_MACICA_FORA');
    falha(s, 'laje.nervurada', { ids: [l2] }, 'SEM_EDICAO');
    const m = doisPanos({ tipo: 'macica', h: 0.12 });
    falha(m, 'laje.nervurada', { ids: [m.modelo.lajes[1].id], capa: 0.05 }, 'LAJE_NAO_NERVURADA');
    expect(l1).toBeDefined();
  });

  it('laje.copiarPanos copia tipo, direção, passagem, engaste e (opcional) a base para panos nervurados do grupo', () => {
    const s = doisPanos({ tipo: 'nervurada', forma: 'cat:rec-80-30', hTotal: 0.35, capa: 0.05 });
    const [l1, l2] = s.modelo.lajes.map((l) => l.id);
    ok(s, 'laje.nervurada', { ids: [l1], passagem: [3, 3], direcao: 90, engasteBordas: [1, 0.5, 1, 1] });
    ok(s, 'laje.armaduraBase', { ids: [l1], nervuras: [{ dir: 0, inf: { n: 2, phi: 8 }, considerar: true }], inf: { barras: [{ dir: 0, phi: 6.3, s: 20 }, { dir: 1, phi: 6.3, s: 20 }] } });
    ok(s, 'laje.copiarPanos', { de: l1, para: [l2] });
    let b = s.modelo.lajes.find((x) => x.id === l2)!;
    expect(b.tipo).toEqual(s.modelo.lajes[0].tipo);
    expect(b.direcao).toBe(90);
    expect(b.pontoNervuras).toEqual([3, 3]);
    expect(b.engasteBordas).toEqual([1, 0.5, 1, 1]);
    expect(b.baseNervurada).toBeUndefined();
    ok(s, 'laje.copiarPanos', { de: l1, para: [l2], incluirBase: true });
    b = s.modelo.lajes.find((x) => x.id === l2)!;
    expect(b.baseNervurada).toEqual(s.modelo.lajes[0].baseNervurada);
    falha(s, 'laje.copiarPanos', { de: l1, para: [l1] }, 'PARAMETRO_INVALIDO');
    falha(s, 'laje.copiarPanos', { de: 'x', para: [l2] }, 'LAJE_INEXISTENTE');
    const t = doisPanos({ tipo: 'macica', h: 0.12 });
    falha(t, 'laje.copiarPanos', { de: t.modelo.lajes[0].id, para: [t.modelo.lajes[1].id] }, 'LAJE_NAO_NERVURADA');
  });

  it('laje.armaduraBase nas nervuradas: malha da mesa, nervuras por direção, considerar e remover; maciça não aceita `nervuras`', () => {
    const s = doisPanos({ tipo: 'macica', h: 0.12 });
    const [n, m] = s.modelo.lajes.map((l) => l.id);
    ok(s, 'laje.armaduraBase', { ids: [n], sup: { tela: 'Q138' }, nervuras: [{ dir: 0, inf: { n: 2, phi: 8 }, sup: { n: 1, phi: 10 } }, { dir: 1, inf: { n: 1, phi: 12.5 }, considerar: true }], detalhada: true });
    expect(s.modelo.lajes[0].baseNervurada).toEqual({ mesa: { sup: { tela: 'Q138' } }, nervuras: [{ inf: { n: 2, phi: 8 }, sup: { n: 1, phi: 10 } }, { inf: { n: 1, phi: 12.5 }, considerar: true }], detalhada: true });
    ok(s, 'laje.armaduraBase', { ids: [n], nervuras: [{ dir: 1, remover: true }, { dir: 0, considerar: true }], remover: ['sup'] });
    expect(s.modelo.lajes[0].baseNervurada).toEqual({ nervuras: [{ inf: { n: 2, phi: 8 }, sup: { n: 1, phi: 10 }, considerar: true }, null], detalhada: true });
    falha(s, 'laje.armaduraBase', { ids: [m], nervuras: [{ dir: 0, inf: { n: 2, phi: 8 } }] }, 'LAJE_NAO_NERVURADA');
    falha(s, 'laje.armaduraBase', { ids: [n], nervuras: [{ dir: 0 }] }, 'SEM_EDICAO');
    ok(s, 'laje.armaduraBase', { ids: [n], nervuras: [{ dir: 0, remover: true }], detalhadaPadrao: true });
    expect(s.modelo.lajes[0].baseNervurada).toBeUndefined();
  });
});

describe('viga chata entre panos de alturas diferentes (K1.9.95)', () => {
  it('a viga chata assume a altura da laje mais espessa; a viga alta mede a parte saliente a partir dela', () => {
    const s = doisPanos({ tipo: 'macica', h: 0.12 });
    const b = s.modelo, central = b.vigas.find((v) => Math.abs(v.pontos[0][0] - 6) < 1e-9 && Math.abs(v.pontos[1][0] - 6) < 1e-9)!;
    // pano da esquerda: nervurada h = 40 cm; da direita: maciça de 12 cm
    expect(alturaVigaChata(b, central)).toBeCloseTo(0.4, 9);
    expect(parteSalienteViga(b, central)).toBeCloseTo(0.2, 9); // viga de 60 cm
    const borda = b.vigas.find((v) => Math.abs(v.pontos[0][0] - 12) < 1e-9)!;
    expect(alturaVigaChata(b, borda)).toBeCloseTo(0.12, 9);
    expect(parteSalienteViga(b, borda)).toBeCloseTo(0.48, 9);
    ok(s, 'laje.nervurada', { ids: [b.lajes[1].id], forma: 'cat:rec-80-40', hTotal: 0.5, capa: 0.06 });
    expect(alturaVigaChata(s.modelo, central)).toBeCloseTo(0.5, 9);
    expect(parteSalienteViga(s.modelo, central)).toBe(0.1);
    const baixa = { ...central, secao: { ...central.secao, h: 0.3 } };
    expect(parteSalienteViga(s.modelo, baixa)).toBe(0);
  });
});

describe('memorial e quantitativos', () => {
  const s = doisPanos({ tipo: 'nervurada', forma: 'cat:perd-eps-60-25', hTotal: 0.3, capa: 0.05 });
  const b = s.modelo, an = analisarEdificio(b), d = dimensionarEdificio(b, an);
  it('linhas do memorial: forma, peso, modelo, verificações, grupos de nervuras e vigas do pano', () => {
    expect(an.erro).toBeUndefined();
    const op = opcoesEmUso(b.opcoes, perfilDe(b));
    const linhas = nervuradasNoMemorial(b, d.nervuradas!, op);
    expect(linhas).toHaveLength(2);
    const [a, z] = linhas;
    expect(a.forma).toMatchObject({ id: 'cat:rec-60-30', tipo: 'recuperável', origem: 'biblioteca de normas (a confirmar)' });
    expect(z.forma.tipo).toBe('perdida');
    expect(z.peso.enchimento).toBeGreaterThan(0);
    expect(a.peso.enchimento).toBe(0);
    expect(a.modelo.passoMalha).toBeCloseTo(0.2, 9);
    expect(a.modelo.inercia).toMatch(/0,50/);
    expect(a.modelo.torcao).toMatch(/2,00/);
    expect(a.verificacoes.regime[0]).toMatch(/laje/);
    expect(a.grupos.length).toBeGreaterThan(0);
    expect(a.grupos[0]).toMatchObject({ nome: 'X1' });
    expect(a.grupos[0].inf).toMatch(/φ/);
    expect(a.vigas.map((v) => v.nome).length).toBeGreaterThanOrEqual(4);
    const central = a.vigas.find((v) => v.saliente === 0.2);
    expect(central).toBeDefined();
    expect(a.base.nervuras[0]).toMatch(/sem base/);
  });
  it('quantitativos detalhados: concreto e peso pelas cubetas inteiras; forma perdida soma o enchimento que fica', () => {
    const q = quantitativosDetalhados(b, d);
    const [pa, pz] = q.panos;
    const na = d.nervuradas![0].quantitativo, nz = d.nervuradas![1].quantitativo;
    expect(pa.volume).toBeCloseTo(na.volumeConcreto, 2);
    expect(pa.pesoProprio).toBeCloseTo(na.ppMedio * 36, 0);
    expect(pa.enchimento).toBeUndefined();
    expect(pz.enchimento?.pecas).toBe(nz.cubetas);
    expect(pz.enchimento?.volume).toBeCloseTo(nz.volumeEnchimento, 2);
    // o aço das nervuradas entra no índice de aço da obra quando o resto está detalhado
    const soma = (rs: { pesoComPerdas: number }[] = []) => rs.reduce((t, x) => t + x.pesoComPerdas, 0);
    const semNerv = quantitativosDetalhados(b, { ...d, resumoAcoNervuradas: undefined });
    expect(q.indices.aco - semNerv.indices.aco).toBeCloseTo(soma(d.resumoAcoNervuradas), 0);
  });
  it('diagnósticos antes do cálculo: a obra com nervuradas coerentes não tem erro', () => {
    expect(verificar(b).filter((x) => x.severidade === 'erro')).toEqual([]);
  });
});
